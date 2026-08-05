import { supabase } from './supabase';

export interface Product {
  id: string;
  product_code: string;
  barcode: string | null;
  name: string;
  company_id: string | null;
  category_id: string | null;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  current_stock: number;
  low_stock: number;
  unit: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  company?: { id: string; name: string; company_code: string } | null;
  category?: { id: string; name: string; category_code: string } | null;
}

/**
 * Fetch all products directly from Supabase `products` table,
 * including joined company and category information.
 */
export async function getStoredProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        company:companies(id, name, company_code),
        category:categories(id, name, category_code)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching products with relations:', error.message);
      // Fallback query without relations if relation alias fails
      const fallback = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallback.error) {
        console.error('Supabase fallback error fetching products:', fallback.error.message);
        return [];
      }
      return (fallback.data as Product[]) || [];
    }

    return (data as unknown as Product[]) || [];
  } catch (err) {
    console.error('Error fetching products from Supabase:', err);
    return [];
  }
}

/**
 * Add a new product directly to Supabase `products` table.
 */
export async function addProduct(
  newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'company' | 'category'>
): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          product_code: newProduct.product_code,
          barcode: newProduct.barcode || null,
          name: newProduct.name,
          company_id: newProduct.company_id || null,
          category_id: newProduct.category_id || null,
          purchase_price: Number(newProduct.purchase_price || 0),
          selling_price: Number(newProduct.selling_price || 0),
          mrp: Number(newProduct.mrp || 0),
          current_stock: Number(newProduct.current_stock || 0),
          low_stock: Number(newProduct.low_stock ?? 10),
          unit: newProduct.unit || 'pcs',
          status: newProduct.status ?? true,
        },
      ])
      .select(`
        *,
        company:companies(id, name, company_code),
        category:categories(id, name, category_code)
      `)
      .single();

    if (error) {
      console.error('Supabase error inserting product:', error.message);
      throw new Error(error.message);
    }

    return data as unknown as Product;
  } catch (err) {
    console.error('Failed to insert product into Supabase:', err);
    throw err;
  }
}

/**
 * Update an existing product directly in Supabase `products` table.
 */
export async function updateProduct(
  id: string,
  updatedFields: Partial<Omit<Product, 'id' | 'company' | 'category'>>
): Promise<Product | null> {
  try {
    const payload: Record<string, unknown> = {
      ...updatedFields,
      updated_at: new Date().toISOString(),
    };

    if (updatedFields.purchase_price !== undefined) {
      payload.purchase_price = Number(updatedFields.purchase_price);
    }
    if (updatedFields.selling_price !== undefined) {
      payload.selling_price = Number(updatedFields.selling_price);
    }
    if (updatedFields.mrp !== undefined) {
      payload.mrp = Number(updatedFields.mrp);
    }
    if (updatedFields.current_stock !== undefined) {
      payload.current_stock = Number(updatedFields.current_stock);
    }
    if (updatedFields.low_stock !== undefined) {
      payload.low_stock = Number(updatedFields.low_stock);
    }

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        company:companies(id, name, company_code),
        category:categories(id, name, category_code)
      `)
      .single();

    if (error) {
      console.error('Supabase error updating product:', error.message);
      throw new Error(error.message);
    }

    return data as unknown as Product;
  } catch (err) {
    console.error('Failed to update product in Supabase:', err);
    throw err;
  }
}

/**
 * Fetch a single product by ID or product_code directly from Supabase.
 */
export async function getProductById(idOrCode: string): Promise<Product | null> {
  if (!idOrCode) return null;
  try {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrCode);
    const query = supabase
      .from('products')
      .select(`
        *,
        company:companies(id, name, company_code),
        category:categories(id, name, category_code)
      `);

    const { data, error } = isUuid
      ? await query.eq('id', idOrCode).maybeSingle()
      : await query.eq('product_code', idOrCode).maybeSingle();

    if (error) {
      console.error('Supabase error fetching product by ID/Code:', error.message);
      return null;
    }

    return data as unknown as Product | null;
  } catch (err) {
    console.error('Failed to fetch product by ID/Code from Supabase:', err);
    return null;
  }
}
