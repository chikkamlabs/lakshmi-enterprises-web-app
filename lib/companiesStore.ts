import { supabase } from './supabase';

export interface Company {
  id: string;
  company_code: string;
  name: string;
  mobile: string | null;
  address: string | null;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all companies strictly from Supabase `companies` table.
 * Returns empty array if no records exist or on error.
 */
export async function getStoredCompanies(): Promise<Company[]> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching companies:', error.message);
      return [];
    }

    return (data as Company[]) || [];
  } catch (err) {
    console.error('Error fetching companies from Supabase:', err);
    return [];
  }
}

/**
 * Add a new company record directly to Supabase `companies` table.
 * Throws error if insert fails.
 */
export async function addCompany(newComp: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company | null> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([
        {
          company_code: newComp.company_code,
          name: newComp.name,
          mobile: newComp.mobile || null,
          address: newComp.address || null,
          status: newComp.status ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting company:', error.message);
      throw new Error(error.message);
    }

    return data as Company;
  } catch (err) {
    console.error('Failed to insert company into Supabase:', err);
    throw err;
  }
}

/**
 * Update an existing company record in Supabase `companies` table.
 * Throws error if update fails.
 */
export async function updateCompany(
  idOrCode: string,
  updatedFields: Partial<Omit<Company, 'id'>>
): Promise<Company | null> {
  try {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrCode);
    const query = supabase.from('companies').update({
      ...updatedFields,
      updated_at: new Date().toISOString(),
    });

    const { data, error } = isUuid
      ? await query.eq('id', idOrCode).select().single()
      : await query.eq('company_code', idOrCode).select().single();

    if (error) {
      console.error('Supabase error updating company:', error.message);
      throw new Error(error.message);
    }

    return data as Company;
  } catch (err) {
    console.error('Failed to update company in Supabase:', err);
    throw err;
  }
}

/**
 * Fetch a single company record by ID or Company Code directly from Supabase.
 */
export async function getCompanyByIdOrCode(idOrCode: string): Promise<Company | null> {
  if (!idOrCode) return null;
  try {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrCode);
    if (isUuid) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', idOrCode)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching company by ID:', error.message);
        return null;
      }
      return data as Company | null;
    } else {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('company_code', idOrCode)
        .maybeSingle();

      if (error) {
        console.error('Supabase error fetching company by code:', error.message);
        return null;
      }
      return data as Company | null;
    }
  } catch (err) {
    console.error('Failed to fetch company by ID/Code from Supabase:', err);
    return null;
  }
}


