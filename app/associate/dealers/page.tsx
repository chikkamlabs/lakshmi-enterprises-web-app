'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Store,
  Layers,
  Phone,
  MapPin,
  Loader2,
  RefreshCw,
  Building,
} from 'lucide-react';
import { getStoredDealers, Dealer } from '../../../lib/dealersStore';
import { getStoredGroups, Group } from '../../../lib/groupsStore';
import AssociateHeader from '../header/page';
import AssociateBottomNavigation from '../buttomnavigation/page';

export default function AssociateDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');

  // Load Dealers and Groups
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [dealersData, groupsData] = await Promise.all([
          getStoredDealers(),
          getStoredGroups(),
        ]);
        if (isMounted) {
          setDealers(dealersData);
          setGroups(groupsData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching dealers or groups:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [dealersData, groupsData] = await Promise.all([
        getStoredDealers(),
        getStoredGroups(),
      ]);
      setDealers(dealersData);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error refreshing dealers or groups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter dealers by group and search query (name or ID/code)
  const filteredDealers = useMemo(() => {
    return dealers.filter((d) => {
      // Group Filter
      if (selectedGroupId !== 'ALL') {
        const matchesGroup =
          d.group_id === selectedGroupId ||
          d.group?.id === selectedGroupId ||
          d.group?.group_id === selectedGroupId;
        if (!matchesGroup) return false;
      }

      // Search Filter (by name, dealer_code, id, or shop_name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          d.name?.toLowerCase().includes(q) ||
          d.dealer_code?.toLowerCase().includes(q) ||
          d.id?.toLowerCase().includes(q) ||
          d.shop_name?.toLowerCase().includes(q) ||
          d.mobile?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [dealers, selectedGroupId, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <AssociateHeader />

      {/* Sticky Top Bar with Title */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Dealers Directory</h1>
              <p className="text-[11px] text-slate-500">View registered dealers and assigned groups</p>
            </div>
            <span className="badge badge-info text-[10px] font-bold px-2 py-0.5 ml-1">
              {filteredDealers.length} {filteredDealers.length === 1 ? 'Dealer' : 'Dealers'}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Dealers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 space-y-3">
        {/* Search Bar & Group Filter Controls */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Search Input (Name or ID/Code) */}
            <div className="sm:col-span-2 input-group">
              <Search className="input-icon-left w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field has-left-icon text-xs py-1.5"
              />
            </div>

            {/* Group Filter */}
            <div>
              <div className="relative">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="ALL">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} ({g.group_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Summary / Reset */}
          {(searchQuery || selectedGroupId !== 'ALL') && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
              <span>
                Showing filtered results ({filteredDealers.length} of {dealers.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroupId('ALL');
                }}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Dealers List */}
        {loading ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-500">Loading dealers list...</p>
          </div>
        ) : filteredDealers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
            <Store className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700">No dealers found</p>
              <p className="text-xs text-slate-500 mt-0.5">Try searching with a different name, ID or group filter</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredDealers.map((d) => {
              const groupName = d.group?.group_name || (groups.find(g => g.id === d.group_id)?.group_name);
              const groupIdCode = d.group?.group_id || (groups.find(g => g.id === d.group_id)?.group_id);

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    {/* Top Row: Name and Code */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{d.name}</h3>
                        {d.shop_name && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            {d.shop_name}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {d.dealer_code || d.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Group Badge */}
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-600">Group:</span>
                      {groupName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {groupName} {groupIdCode ? `(${groupIdCode})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          No Group
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Optional contact info footer */}
                  {(d.mobile || d.address) && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {d.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {d.mobile}
                        </span>
                      )}
                      {d.address && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={d.address}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{d.address}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <AssociateBottomNavigation />
    </div>
  );
}
