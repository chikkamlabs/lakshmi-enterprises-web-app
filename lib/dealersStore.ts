import { supabase } from './supabase';

export interface Dealer {
  id: string;
  dealer_code: string;
  name: string;
  mobile: string | null;
  shop_name: string | null;
  address: string | null;
  current_credit?: number;
  credit_limit?: number;
  le_credit?: number;
  slsa_credit?: number;
  le_credit_limit?: number;
  slsa_credit_limit?: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all dealers directly from Supabase `dealers` table.
 * Strictly Supabase data, no mock or local fallback.
 */
export async function getStoredDealers(): Promise<Dealer[]> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching dealers:', error.message);
      return [];
    }

    return (data as Dealer[]) || [];
  } catch (err) {
    console.error('Error fetching dealers from Supabase:', err);
    return [];
  }
}

/**
 * Add a new dealer directly to Supabase `dealers` table.
 */
export async function addDealer(
  newDealer: Omit<Dealer, 'id' | 'created_at' | 'updated_at'>
): Promise<Dealer | null> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .insert([
        {
          dealer_code: newDealer.dealer_code,
          name: newDealer.name,
          mobile: newDealer.mobile || null,
          shop_name: newDealer.shop_name || null,
          address: newDealer.address || null,
          le_credit: Number(newDealer.le_credit || 0),
          slsa_credit: Number(newDealer.slsa_credit || 0),
          le_credit_limit: Number(newDealer.le_credit_limit || 0),
          slsa_credit_limit: Number(newDealer.slsa_credit_limit || 0),
          status: newDealer.status ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting dealer:', error.message);
      throw new Error(error.message);
    }

    return data as Dealer;
  } catch (err) {
    console.error('Failed to insert dealer into Supabase:', err);
    throw err;
  }
}

/**
 * Update an existing dealer directly in Supabase `dealers` table.
 */
export async function updateDealer(
  id: string,
  updatedFields: Partial<Omit<Dealer, 'id'>>
): Promise<Dealer | null> {
  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updatedFields.dealer_code !== undefined) {
      payload.dealer_code = updatedFields.dealer_code;
    }
    if (updatedFields.name !== undefined) {
      payload.name = updatedFields.name;
    }
    if (updatedFields.mobile !== undefined) {
      payload.mobile = updatedFields.mobile;
    }
    if (updatedFields.shop_name !== undefined) {
      payload.shop_name = updatedFields.shop_name;
    }
    if (updatedFields.address !== undefined) {
      payload.address = updatedFields.address;
    }
    if (updatedFields.status !== undefined) {
      payload.status = updatedFields.status;
    }
    if (updatedFields.le_credit !== undefined) {
      payload.le_credit = Number(updatedFields.le_credit);
    }
    if (updatedFields.slsa_credit !== undefined) {
      payload.slsa_credit = Number(updatedFields.slsa_credit);
    }
    if (updatedFields.le_credit_limit !== undefined) {
      payload.le_credit_limit = Number(updatedFields.le_credit_limit);
    }
    if (updatedFields.slsa_credit_limit !== undefined) {
      payload.slsa_credit_limit = Number(updatedFields.slsa_credit_limit);
    }

    const { data, error } = await supabase
      .from('dealers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating dealer:', error.message);
      throw new Error(error.message);
    }

    return data as Dealer;
  } catch (err) {
    console.error('Failed to update dealer in Supabase:', err);
    throw err;
  }
}

/**
 * Fetch a single dealer by ID directly from Supabase.
 */
export async function getDealerById(id: string): Promise<Dealer | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching dealer by ID:', error.message);
      return null;
    }
    return data as Dealer | null;
  } catch (err) {
    console.error('Failed to fetch dealer by ID from Supabase:', err);
    return null;
  }
}
