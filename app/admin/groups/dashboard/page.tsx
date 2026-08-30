'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import {
  getStoredGroups,
  createGroup,
  updateGroupName,
  getNextGroupId,
  Group,
} from '@/lib/groupsStore';
import {
  Layers,
  Plus,
  Search,
  Loader2,
  FolderOpen,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Hash,
} from 'lucide-react';

function GroupsDashboardContent() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Group Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newGroupId, setNewGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>('');

  // Open / Edit Group Modal State (Edit name only)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch groups
  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await getStoredGroups();
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getStoredGroups()
      .then((data) => {
        if (isMounted) {
          setGroups(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching groups:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered groups by group_id and group_name
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase().trim();
    return groups.filter(
      (g) =>
        (g.group_id && g.group_id.toLowerCase().includes(q)) ||
        (g.group_name && g.group_name.toLowerCase().includes(q))
    );
  }, [groups, searchQuery]);

  // Open Add Group Modal and autofill group_id
  const handleOpenAddModal = () => {
    const nextId = getNextGroupId(groups);
    setNewGroupId(nextId);
    setNewGroupName('');
    setAddError('');
    setIsAddModalOpen(true);
  };

  // Submit Add Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupId.trim()) {
      setAddError('Group ID is required.');
      return;
    }
    if (!newGroupName.trim()) {
      setAddError('Group Name is required.');
      return;
    }

    setIsAdding(true);
    setAddError('');
    try {
      const created = await createGroup({
        group_id: newGroupId.trim(),
        group_name: newGroupName.trim(),
      });

      if (created) {
        setGroups((prev) => [...prev, created]);
        setIsAddModalOpen(false);
        setNotification({
          type: 'success',
          message: `Group "${created.group_name}" (${created.group_id}) added successfully!`,
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: unknown) {
      console.error('Failed to create group:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create group.';
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Open Edit Modal for a group
  const handleOpenGroup = (group: Group) => {
    setSelectedGroup(group);
    setEditGroupName(group.group_name || '');
    setEditError('');
  };

  // Save Edit (Name only)
  const handleSaveGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!editGroupName.trim()) {
      setEditError('Group Name cannot be empty.');
      return;
    }

    setIsUpdating(true);
    setEditError('');
    try {
      const updated = await updateGroupName(selectedGroup.id, editGroupName.trim());
      if (updated) {
        setGroups((prev) =>
          prev.map((g) => (g.id === updated.id ? updated : g))
        );
        setSelectedGroup(null);
        setNotification({
          type: 'success',
          message: `Group "${updated.group_name}" updated successfully!`,
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: unknown) {
      console.error('Failed to update group name:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update group name.';
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Total Groups and Add Group Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Groups Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage dealer classification groups and categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-2xs flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Total Groups:</span>
            <span className="badge badge-info text-xs font-bold px-2 py-0.5">
              {groups.length}
            </span>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="btn-base btn-primary text-xs sm:text-sm py-2 px-4 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Group</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm shadow-2xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Group ID or Group Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Groups List Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              All Groups ({filteredGroups.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Layers className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">No groups found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery
                  ? 'No groups match your search query.'
                  : 'Get started by creating your first group.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="btn-base btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Group</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Group ID</th>
                  <th className="py-3 px-4 sm:px-6">Group Name</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-700">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{group.group_id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                      {group.group_name}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleOpenGroup(group)}
                        className="btn-base btn-secondary text-xs py-1.5 px-3 font-semibold inline-flex items-center gap-1.5 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Open group and edit name"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD GROUP MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Add New Group
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-4 text-xs sm:text-sm">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="form-label font-semibold text-slate-700 block mb-1">
                  Group ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  placeholder="e.g. group-101"
                  className="form-input w-full rounded-lg border-slate-300 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Auto-filled based on group count (group-101+1).
                </p>
              </div>

              <div>
                <label className="form-label font-semibold text-slate-700 block mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Retailers A, Wholesale South"
                  className="form-input w-full rounded-lg border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-base btn-secondary text-xs sm:text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="btn-base btn-primary text-xs sm:text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPEN / EDIT GROUP MODAL (Edit name only) */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Group Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupName} className="p-5 space-y-4 text-xs sm:text-sm">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Group ID (Read only) */}
              <div>
                <label className="form-label font-semibold text-slate-700 block mb-1">
                  Group ID
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold text-xs flex items-center justify-between">
                  <span>{selectedGroup.group_id}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">
                    Read-Only
                  </span>
                </div>
              </div>

              {/* Group Name (Editable) */}
              <div>
                <label className="form-label font-semibold text-slate-700 block mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="form-input w-full rounded-lg border-slate-300 font-semibold text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Only the group name can be modified.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="btn-base btn-secondary text-xs sm:text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-base btn-primary text-xs sm:text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Name</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminGroupsDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-700">Loading groups dashboard...</p>
              </div>
            }
          >
            <GroupsDashboardContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
