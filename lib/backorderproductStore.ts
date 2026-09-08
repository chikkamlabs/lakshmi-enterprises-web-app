import { supabase } from './supabase';

export interface BackorderItem {
  id: string;
  product_id: string;
  required_quantity: number;
  ordered_quantity: number;
  pending_quantity: number;
  status: 'Pending' | 'Ordered' | 'Partial' | 'Completed';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  product?: {
    id: string;
    name: string;
    product_code: string;
    company_id?: string | null;
    company?: {
      id: string;
      name: string;
      company_code: string;
    } | null;
  } | null;
}

export interface BackorderRequestItem {
  product_id: string;
  difference: number;
  notes?: string;
}

const LOCAL_STORAGE_BACKORDER_KEY = 'lakshmi_erp_backorder_items';

/**
 * Add or update backorder items in Supabase table `backorder_items` and LocalStorage.
 * If product already exists in backorder_items, adds the difference to required_quantity.
 */
export async function processBackorderItems(
  items: BackorderRequestItem[]
): Promise<boolean> {
  if (!items || items.length === 0) return true;

  let overallSuccess = true;

  for (const item of items) {
    if (item.difference <= 0 || !item.product_id) continue;

    try {
      // 1. Check if product already exists in `backorder_items` table in Supabase
      const { data: existingList, error: fetchErr } = await supabase
        .from('backorder_items')
        .select('*')
        .eq('product_id', item.product_id);

      if (!fetchErr && existingList && existingList.length > 0) {
        const existing = existingList[0];
        const newReqQty = Number(existing.required_quantity || 0) + item.difference;
        const newPendingQty = Math.max(0, newReqQty - Number(existing.ordered_quantity || 0));

        const { error: updateErr } = await supabase
          .from('backorder_items')
          .update({
            required_quantity: newReqQty,
            pending_quantity: newPendingQty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateErr) {
          console.warn('Supabase error updating backorder_item:', updateErr.message);
        }
      } else {
        // Insert new backorder_item record
        const { error: insertErr } = await supabase
          .from('backorder_items')
          .insert([
            {
              product_id: item.product_id,
              required_quantity: item.difference,
              ordered_quantity: 0,
              pending_quantity: item.difference,
              status: 'Pending',
              notes: item.notes || null,
            },
          ]);

        if (insertErr) {
          console.warn('Supabase error inserting backorder_item:', insertErr.message);
        }
      }
    } catch (err) {
      console.warn('Error syncing backorder_item with Supabase:', err);
    }

    // 2. Sync with LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
        let backorders: any[] = raw ? JSON.parse(raw) : [];

        const existingIdx = backorders.findIndex((b) => b.product_id === item.product_id);
        if (existingIdx !== -1) {
          const oldReq = Number(backorders[existingIdx].required_quantity || 0);
          const oldOrd = Number(backorders[existingIdx].ordered_quantity || 0);
          const newReq = oldReq + item.difference;
          backorders[existingIdx].required_quantity = newReq;
          backorders[existingIdx].pending_quantity = Math.max(0, newReq - oldOrd);
          backorders[existingIdx].updated_at = new Date().toISOString();
        } else {
          backorders.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bo-${Date.now()}-${Math.random()}`,
            product_id: item.product_id,
            required_quantity: item.difference,
            ordered_quantity: 0,
            pending_quantity: item.difference,
            status: 'Pending',
            notes: item.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(backorders));
      } catch (lsErr) {
        console.error('LocalStorage error updating backorders:', lsErr);
      }
    }
  }

  return overallSuccess;
}

/**
 * Get all backorder items with product and company details
 */
export async function getBackorderItems(): Promise<BackorderItem[]> {
  try {
    const { data, error } = await supabase
      .from('backorder_items')
      .select(`
        *,
        product:products(
          id,
          name,
          product_code,
          company_id,
          company:companies(id, name, company_code)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as BackorderItem[];
    }
  } catch (err) {
    console.warn('Error fetching backorder_items from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading backorder_items from LocalStorage:', e);
    }
  }

  return [];
}

/**
 * Get a single backorder item by ID
 */
export async function getBackorderItemById(id: string): Promise<BackorderItem | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('backorder_items')
      .select(`
        *,
        product:products(
          id,
          name,
          product_code,
          company_id,
          company:companies(id, name, company_code)
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as BackorderItem;
    }
  } catch (err) {
    console.warn('Error fetching backorder_item by ID from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
      if (raw) {
        const list: BackorderItem[] = JSON.parse(raw);
        const found = list.find((item) => item.id === id);
        if (found) return found;
      }
    } catch (e) {
      console.error('Error reading backorder_item by ID from LocalStorage:', e);
    }
  }

  return null;
}

/**
 * Create a new backorder product record
 */
/**
 * Create a new backorder product record or increment quantity if product is already present
 */
export async function createBackorderItem(data: {
  product_id: string;
  required_quantity: number;
  ordered_quantity?: number;
  status?: 'Pending' | 'Ordered' | 'Partial' | 'Completed';
  notes?: string | null;
}): Promise<BackorderItem | null> {
  const reqQty = Number(data.required_quantity) || 0;
  const ordQty = Number(data.ordered_quantity) || 0;

  try {
    // Check if backorder already exists for this product_id
    const { data: existingList, error: checkErr } = await supabase
      .from('backorder_items')
      .select(`
        *,
        product:products(
          id,
          name,
          product_code,
          company_id,
          company:companies(id, name, company_code)
        )
      `)
      .eq('product_id', data.product_id);

    if (!checkErr && existingList && existingList.length > 0) {
      const existing = existingList[0];
      const newReqQty = Number(existing.required_quantity || 0) + reqQty;
      const newOrdQty = Number(existing.ordered_quantity || 0) + ordQty;
      const newPendingQty = Math.max(0, newReqQty - newOrdQty);
      const updatedNotes = data.notes
        ? existing.notes
          ? `${existing.notes}; ${data.notes}`
          : data.notes
        : existing.notes;

      const { data: updated, error: updateErr } = await supabase
        .from('backorder_items')
        .update({
          required_quantity: newReqQty,
          ordered_quantity: newOrdQty,
          pending_quantity: newPendingQty,
          status: data.status || existing.status || 'Pending',
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(`
          *,
          product:products(
            id,
            name,
            product_code,
            company_id,
            company:companies(id, name, company_code)
          )
        `)
        .single();

      if (!updateErr && updated) {
        // Also sync local storage
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
            if (raw) {
              const list: BackorderItem[] = JSON.parse(raw);
              const idx = list.findIndex((it) => it.id === existing.id || it.product_id === data.product_id);
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...updated };
                localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
              }
            }
          } catch (e) {
            console.error('LocalStorage sync error:', e);
          }
        }
        return updated as unknown as BackorderItem;
      }
    }

    // If not existing, insert new record
    const pendingQty = Math.max(0, reqQty - ordQty);
    const payload = {
      product_id: data.product_id,
      required_quantity: reqQty,
      ordered_quantity: ordQty,
      pending_quantity: pendingQty,
      status: data.status || 'Pending',
      notes: data.notes || null,
    };

    const { data: inserted, error } = await supabase
      .from('backorder_items')
      .insert([payload])
      .select(`
        *,
        product:products(
          id,
          name,
          product_code,
          company_id,
          company:companies(id, name, company_code)
        )
      `)
      .single();

    if (!error && inserted) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
          const list: BackorderItem[] = raw ? JSON.parse(raw) : [];
          list.unshift(inserted as unknown as BackorderItem);
          localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
        } catch (e) {
          console.error('LocalStorage error:', e);
        }
      }
      return inserted as unknown as BackorderItem;
    } else if (error) {
      console.warn('Supabase error creating backorder_item:', error.message);
    }
  } catch (err) {
    console.warn('Error creating/updating backorder_item in Supabase:', err);
  }

  // LocalStorage Fallback if Supabase is unavailable
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
      const list: BackorderItem[] = raw ? JSON.parse(raw) : [];
      const existingIdx = list.findIndex((it) => it.product_id === data.product_id);

      if (existingIdx !== -1) {
        const existing = list[existingIdx];
        const newReqQty = Number(existing.required_quantity || 0) + reqQty;
        const newOrdQty = Number(existing.ordered_quantity || 0) + ordQty;
        const updatedItem: BackorderItem = {
          ...existing,
          required_quantity: newReqQty,
          ordered_quantity: newOrdQty,
          pending_quantity: Math.max(0, newReqQty - newOrdQty),
          status: data.status || existing.status || 'Pending',
          notes: data.notes ? (existing.notes ? `${existing.notes}; ${data.notes}` : data.notes) : existing.notes,
          updated_at: new Date().toISOString(),
        };
        list[existingIdx] = updatedItem;
        localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
        return updatedItem;
      }

      const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bo-${Date.now()}`;
      const newItem: BackorderItem = {
        id: newId,
        product_id: data.product_id,
        required_quantity: reqQty,
        ordered_quantity: ordQty,
        pending_quantity: Math.max(0, reqQty - ordQty),
        status: data.status || 'Pending',
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      list.unshift(newItem);
      localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
      return newItem;
    } catch (e) {
      console.error('LocalStorage error creating backorder_item:', e);
    }
  }

  return null;
}

/**
 * Update an existing backorder item
 */
export async function updateBackorderItem(
  id: string,
  updates: {
    required_quantity?: number;
    ordered_quantity?: number;
    status?: 'Pending' | 'Ordered' | 'Partial' | 'Completed';
    notes?: string | null;
  }
): Promise<boolean> {
  if (!id) return false;

  let success = false;

  try {
    const { data: current } = await supabase
      .from('backorder_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const reqQty = updates.required_quantity !== undefined ? Number(updates.required_quantity) : Number(current?.required_quantity || 0);
    const ordQty = updates.ordered_quantity !== undefined ? Number(updates.ordered_quantity) : Number(current?.ordered_quantity || 0);
    const pendingQty = Math.max(0, reqQty - ordQty);

    const payload: any = {
      required_quantity: reqQty,
      ordered_quantity: ordQty,
      pending_quantity: pendingQty,
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { error } = await supabase
      .from('backorder_items')
      .update(payload)
      .eq('id', id);

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase error updating backorder_item:', error.message);
    }
  } catch (err) {
    console.warn('Error updating backorder_item in Supabase:', err);
  }

  // LocalStorage Fallback/Sync
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
      if (raw) {
        const list: BackorderItem[] = JSON.parse(raw);
        const idx = list.findIndex((item) => item.id === id);
        if (idx !== -1) {
          const reqQty = updates.required_quantity !== undefined ? Number(updates.required_quantity) : list[idx].required_quantity;
          const ordQty = updates.ordered_quantity !== undefined ? Number(updates.ordered_quantity) : list[idx].ordered_quantity;
          list[idx].required_quantity = reqQty;
          list[idx].ordered_quantity = ordQty;
          list[idx].pending_quantity = Math.max(0, reqQty - ordQty);
          if (updates.status !== undefined) list[idx].status = updates.status;
          if (updates.notes !== undefined) list[idx].notes = updates.notes;
          list[idx].updated_at = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
          success = true;
        }
      }
    } catch (e) {
      console.error('LocalStorage error updating backorder_item:', e);
    }
  }

  return success;
}

/**
 * Delete a backorder item
 */
export async function deleteBackorderItem(id: string): Promise<boolean> {
  if (!id) return false;
  let success = false;

  try {
    const { error } = await supabase.from('backorder_items').delete().eq('id', id);
    if (!error) success = true;
  } catch (err) {
    console.warn('Error deleting backorder_item from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_KEY);
      if (raw) {
        let list: BackorderItem[] = JSON.parse(raw);
        list = list.filter((item) => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_BACKORDER_KEY, JSON.stringify(list));
        success = true;
      }
    } catch (e) {
      console.error('LocalStorage error deleting backorder_item:', e);
    }
  }

  return success;
}

