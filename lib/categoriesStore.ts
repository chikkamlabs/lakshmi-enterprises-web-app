import { supabase } from './supabase';

export interface Category {
  id: string;
  category_code: string;
  name: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all categories directly from Supabase `categories` table.
 */
export async function getStoredCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching categories:', error.message);
      return [];
    }

    return (data as Category[]) || [];
  } catch (err) {
    console.error('Error fetching categories from Supabase:', err);
    return [];
  }
}
