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

/**
 * Add a new category directly to Supabase `categories` table.
 */
export async function addCategory(
  newCategory: Omit<Category, 'id' | 'created_at' | 'updated_at'>
): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          category_code: newCategory.category_code,
          name: newCategory.name,
          status: newCategory.status ?? true,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error inserting category:', error.message);
      throw new Error(error.message);
    }

    return data as Category;
  } catch (err) {
    console.error('Failed to insert category into Supabase:', err);
    throw err;
  }
}

/**
 * Update an existing category directly in Supabase `categories` table.
 */
export async function updateCategory(
  id: string,
  updatedFields: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
): Promise<Category | null> {
  try {
    const payload: Record<string, unknown> = {
      ...updatedFields,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error updating category:', error.message);
      throw new Error(error.message);
    }

    return data as Category;
  } catch (err) {
    console.error('Failed to update category in Supabase:', err);
    throw err;
  }
}

/**
 * Delete a category by ID directly from Supabase `categories` table.
 */
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting category:', error.message);
      throw new Error(error.message);
    }

    return true;
  } catch (err) {
    console.error('Failed to delete category in Supabase:', err);
    throw err;
  }
}
