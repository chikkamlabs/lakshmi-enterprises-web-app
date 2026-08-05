import { supabase } from './supabase';

export interface BackorderDealerItem {
  id: string;
  dealer_id: string;
  order_id?: string | null;
  order_item_id?: string | null;
  pending_quantity: number;
  fulfilled_quantity: number;
  status: 'Pending' | 'Fulfilled';
  back_type: 'admin' | 'staff';
  created_at?: string;
  updated_at?: string;
  dealer?: {
    id: string;
    name: string;
    dealer_code?: string;
    shop_name?: string | null;
    mobile?: string | null;
  } | null;
  order?: {
    id: string;
    order_number: string;
    total_amount?: number;
  } | null;
  order_item?: {
    id: string;
    product_id: string;
    product?: {
      id: string;
      name: string;
      product_code: string;
      company_id?: string | null;
      company?: {
        id: string;
        name: string;
        company_code?: string;
      } | null;
    } | null;
  } | null;
}

export interface BackorderDealerRequest {
  dealer_id: string;
  order_id?: string | null;
  order_item_id?: string | null;
  pending_quantity: number;
  fulfilled_quantity?: number;
  status?: 'Pending' | 'Fulfilled';
  back_type?: 'admin' | 'staff';
}

const LOCAL_STORAGE_BACKORDER_DEALERS_KEY = 'lakshmi_erp_backorder_dealers';

const SUPABASE_SELECT_QUERY = `
  *,
  dealer:dealers(id, name, dealer_code, shop_name, mobile),
  order:orders(id, order_number, total_amount),
  order_item:order_items(
    id, product_id,
    product:products(
      id, name, product_code, company_id,
      company:companies(id, name, company_code)
    )
  )
`;

/**
 * Add backorder dealer records into Supabase `backorder_dealers` table and LocalStorage.
 * Batch helper used during order processing.
 */
export async function processBackorderDealers(
  requests: BackorderDealerRequest[]
): Promise<boolean> {
  if (!requests || requests.length === 0) return true;

  let overallSuccess = true;

  for (const req of requests) {
    if (req.pending_quantity <= 0 || !req.dealer_id) {
      continue;
    }

    const payload = {
      dealer_id: req.dealer_id,
      order_id: req.order_id || null,
      order_item_id: req.order_item_id || null,
      pending_quantity: req.pending_quantity,
      fulfilled_quantity: req.fulfilled_quantity || 0,
      status: req.status || 'Pending',
      back_type: req.back_type || 'staff',
    };

    // 1. Insert into Supabase
    try {
      const { error: insertErr } = await supabase
        .from('backorder_dealers')
        .insert([payload]);

      if (insertErr) {
        console.warn('Supabase error inserting into backorder_dealers:', insertErr.message);
      }
    } catch (err) {
      console.warn('Error inserting backorder_dealer in Supabase:', err);
    }

    // 2. Sync with LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
        let backorderDealers: any[] = raw ? JSON.parse(raw) : [];

        backorderDealers.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bd-${Date.now()}-${Math.random()}`,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        localStorage.setItem(
          LOCAL_STORAGE_BACKORDER_DEALERS_KEY,
          JSON.stringify(backorderDealers)
        );
      } catch (lsErr) {
        console.error('LocalStorage error updating backorder_dealers:', lsErr);
      }
    }
  }

  return overallSuccess;
}

/**
 * Get all backorder dealer records
 */
export async function getBackorderDealers(): Promise<BackorderDealerItem[]> {
  try {
    const { data, error } = await supabase
      .from('backorder_dealers')
      .select(SUPABASE_SELECT_QUERY)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as BackorderDealerItem[];
    }
  } catch (err) {
    console.warn('Error fetching backorder_dealers from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading backorder_dealers from LocalStorage:', e);
    }
  }

  return [];
}

/**
 * Get a single backorder dealer record by ID
 */
export async function getBackorderDealerById(id: string): Promise<BackorderDealerItem | null> {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('backorder_dealers')
      .select(SUPABASE_SELECT_QUERY)
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as BackorderDealerItem;
    }
  } catch (err) {
    console.warn('Error fetching backorder_dealer by ID from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
      if (raw) {
        const list: BackorderDealerItem[] = JSON.parse(raw);
        const found = list.find((item) => item.id === id);
        if (found) return found;
      }
    } catch (e) {
      console.error('Error reading backorder_dealer by ID from LocalStorage:', e);
    }
  }

  return null;
}

/**
 * Create a new backorder dealer record
 */
export async function createBackorderDealer(data: {
  dealer_id: string;
  order_id?: string | null;
  order_item_id?: string | null;
  pending_quantity: number;
  fulfilled_quantity?: number;
  status?: 'Pending' | 'Fulfilled';
  back_type?: 'admin' | 'staff';
}): Promise<BackorderDealerItem | null> {
  const pendingQty = Number(data.pending_quantity) || 0;
  const fulfilledQty = Number(data.fulfilled_quantity) || 0;

  const payload = {
    dealer_id: data.dealer_id,
    order_id: data.order_id || null,
    order_item_id: data.order_item_id || null,
    pending_quantity: pendingQty,
    fulfilled_quantity: fulfilledQty,
    status: data.status || 'Pending',
    back_type: data.back_type || 'admin',
  };

  try {
    const { data: inserted, error } = await supabase
      .from('backorder_dealers')
      .insert([payload])
      .select(SUPABASE_SELECT_QUERY)
      .single();

    if (!error && inserted) {
      return inserted as unknown as BackorderDealerItem;
    } else if (error) {
      console.warn('Supabase error creating backorder_dealer:', error.message);
    }
  } catch (err) {
    console.warn('Error creating backorder_dealer in Supabase:', err);
  }

  // LocalStorage Fallback
  if (typeof window !== 'undefined') {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bd-${Date.now()}`;
    const newItem: BackorderDealerItem = {
      id: newId,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
      const list: BackorderDealerItem[] = raw ? JSON.parse(raw) : [];
      list.unshift(newItem);
      localStorage.setItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY, JSON.stringify(list));
      return newItem;
    } catch (e) {
      console.error('LocalStorage error creating backorder_dealer:', e);
    }
  }

  return null;
}

/**
 * Update an existing backorder dealer record
 */
export async function updateBackorderDealer(
  id: string,
  updates: {
    dealer_id?: string;
    order_id?: string | null;
    order_item_id?: string | null;
    pending_quantity?: number;
    fulfilled_quantity?: number;
    status?: 'Pending' | 'Fulfilled';
    back_type?: 'admin' | 'staff';
  }
): Promise<boolean> {
  if (!id) return false;
  let success = false;

  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.dealer_id !== undefined) payload.dealer_id = updates.dealer_id;
  if (updates.order_id !== undefined) payload.order_id = updates.order_id;
  if (updates.order_item_id !== undefined) payload.order_item_id = updates.order_item_id;
  if (updates.pending_quantity !== undefined) payload.pending_quantity = Number(updates.pending_quantity);
  if (updates.fulfilled_quantity !== undefined) payload.fulfilled_quantity = Number(updates.fulfilled_quantity);
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.back_type !== undefined) payload.back_type = updates.back_type;

  try {
    const { error } = await supabase
      .from('backorder_dealers')
      .update(payload)
      .eq('id', id);

    if (!error) {
      success = true;
    } else {
      console.warn('Supabase error updating backorder_dealer:', error.message);
    }
  } catch (err) {
    console.warn('Error updating backorder_dealer in Supabase:', err);
  }

  // LocalStorage Sync
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
      if (raw) {
        const list: BackorderDealerItem[] = JSON.parse(raw);
        const idx = list.findIndex((item) => item.id === id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            ...payload,
          };
          localStorage.setItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY, JSON.stringify(list));
          success = true;
        }
      }
    } catch (e) {
      console.error('LocalStorage error updating backorder_dealer:', e);
    }
  }

  return success;
}

/**
 * Delete a backorder dealer record
 */
export async function deleteBackorderDealer(id: string): Promise<boolean> {
  if (!id) return false;
  let success = false;

  try {
    const { error } = await supabase.from('backorder_dealers').delete().eq('id', id);
    if (!error) success = true;
  } catch (err) {
    console.warn('Error deleting backorder_dealer from Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY);
      if (raw) {
        let list: BackorderDealerItem[] = JSON.parse(raw);
        list = list.filter((item) => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_BACKORDER_DEALERS_KEY, JSON.stringify(list));
        success = true;
      }
    } catch (e) {
      console.error('LocalStorage error deleting backorder_dealer:', e);
    }
  }

  return success;
}

