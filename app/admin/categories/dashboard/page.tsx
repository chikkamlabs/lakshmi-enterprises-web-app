'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminHeader from '../../header/page';
import AdminSidebar from '../../sidebar/page';
import {
  Category,
  getStoredCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/categoriesStore';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Layers,
  RefreshCw,
} from 'lucide-react';

export default function AdminCategoriesDashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form State for Add
  const [addCatCode, setAddCatCode] = useState('cat_101');
  const [addCatName, setAddCatName] = useState('');
  const [addCatStatus, setAddCatStatus] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State for Edit
  const [editCatName, setEditCatName] = useState('');
  const [editCatStatus, setEditCatStatus] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Categories from Supabase
  const loadCategories = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getStoredCategories();
      setCategories(data);
    } catch (err: unknown) {
      console.error('Failed to load categories:', err);
      setError('Could not load categories from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getStoredCategories()
      .then((data) => {
        if (!isMounted) return;
        setCategories(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        if (isMounted) {
          setError('Could not load categories from database.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Next Suggested Category ID (cat_101, cat_102, ...)
  const getSuggestedCatCode = (cats: Category[]) => {
    if (!cats || cats.length === 0) return 'cat_101';
    let maxNum = 100;
    cats.forEach((c) => {
      const match = c.category_code?.match(/(?:cat_?|cat-?|c_?)(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `cat_${maxNum + 1}`;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddCatCode(getSuggestedCatCode(categories));
    setAddCatName('');
    setAddCatStatus(true);
    setError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat: Category) => {
    setSelectedCategory(cat);
    setEditCatName(cat.name);
    setEditCatStatus(cat.status ?? true);
    setError('');
    setIsEditModalOpen(true);
  };

  // Submit Add Category
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCatName.trim()) {
      setError('Category Name is required.');
      return;
    }
    if (!addCatCode.trim()) {
      setError('Category ID is required.');
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      const created = await addCategory({
        category_code: addCatCode.trim(),
        name: addCatName.trim(),
        status: addCatStatus,
      });

      if (created) {
        setCategories((prev) => [created, ...prev]);
        setSuccess(`Category "${created.name}" created successfully!`);
        setIsAddModalOpen(false);
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err: unknown) {
      console.error('Failed to add category:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create category.';
      setError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Submit Edit Category (cat_id is read-only)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!editCatName.trim()) {
      setError('Category Name is required.');
      return;
    }

    setIsEditing(true);
    setError('');
    try {
      const updated = await updateCategory(selectedCategory.id, {
        name: editCatName.trim(),
        status: editCatStatus,
      });

      if (updated) {
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setSuccess(`Category "${updated.name}" updated successfully!`);
        setIsEditModalOpen(false);
        setTimeout(() => setSuccess(''), 3500);
      }
    } catch (err: unknown) {
      console.error('Failed to update category:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update category.';
      setError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}" (${cat.category_code})?`)) {
      return;
    }

    setDeletingId(cat.id);
    setError('');
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setSuccess(`Category "${cat.name}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: unknown) {
      console.error('Failed to delete category:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete category.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Categories by searchQuery on (cat_id / category_code, name)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.category_code?.toLowerCase().includes(query) ||
        c.name?.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Statistics
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.status).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <AdminHeader />

      <div className="flex-1 flex flex-col md:flex-row">
        <AdminSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-6 h-6 text-indigo-600" />
                <span>Categories Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage all product categories, create new classifications, and maintain catalog hierarchies.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadCategories}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                title="Refresh Categories"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Stats Badges / Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Categories</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Categories</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactive Categories</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">{inactiveCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                <X className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Table Container Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Search Bar & Controls Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Category ID (cat_id) or Name..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredCategories.length} of {totalCount} Categories
              </div>
            </div>

            {/* Categories Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-36">Category ID (cat_id)</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Category Name</th>
                    <th className="py-3.5 px-4 w-28 text-center">Status</th>
                    <th className="py-3.5 px-4 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <span>Loading categories from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Tag className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-700">No categories found</p>
                          <p className="text-xs text-slate-400">
                            {searchQuery
                              ? `No matches found for "${searchQuery}"`
                              : 'Click "Add Category" above to create your first category.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700 text-xs">
                          {cat.category_code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {cat.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {cat.status ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cat)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={deletingId === cat.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                              title="Delete Category"
                            >
                              {deletingId === cat.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* OVERLAY MODAL: Add Category */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Add New Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category ID (cat_id) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category ID (cat_id) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addCatCode}
                  onChange={(e) => setAddCatCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-indigo-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. cat_101"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Auto-suggested identifier (default starts at cat_101 and increments +1).
                </p>
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addCatName}
                  onChange={(e) => setAddCatName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Bottles, Grinders"
                  autoFocus
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={addCatStatus ? 'true' : 'false'}
                  onChange={(e) => setAddCatStatus(e.target.value === 'true')}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL: Edit Category */}
      {isEditModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category ID (cat_id) - Read-only / Disabled */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Category ID (cat_id)
                  </label>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Read-only (Immutable)
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={selectedCategory.category_code}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-500 bg-slate-100 cursor-not-allowed select-none"
                />
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Category Name"
                  autoFocus
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editCatStatus ? 'true' : 'false'}
                  onChange={(e) => setEditCatStatus(e.target.value === 'true')}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Changes</span>
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
