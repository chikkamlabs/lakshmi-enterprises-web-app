import { supabase } from './supabase';
import { Dealer } from './dealersStore';
import { Product } from './productsStore';

export interface CreateOrderItemInput {
  product_id: string;
  requested_quantity: number;
  selling_price: number;
  mrp?: number;
  associate_mrp?: number;
  discount?: number;
  ad_discount?: number;
  notes?: string;
}

export interface CreateOrderInput {
  firm?: 'LE' | 'SLSA';
  dealer_id: string;
  associate_status: 'Draft' | 'Submitted';
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface ProductSearchResult extends Product {
  company_name?: string;
  category_name?: string;
}

/**
 * Fetch dealers list for dropdown / search
 */
export async function getDealersForOrder(): Promise<Dealer[]> {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('status', true)
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Dealer[];
    }

    // Fallback if status filter or query returned empty
    const simple = await supabase.from('dealers').select('*').order('name', { ascending: true });
    if (!simple.error && simple.data) {
      return simple.data as Dealer[];
    }
  } catch (err) {
    console.warn('Error fetching dealers for order creation:', err);
  }
  return [];
}

/**
 * Search products by ID/product_code, name, or company name/code
 */
export async function searchProductsForOrder(query: string = ''): Promise<ProductSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        company:companies(id, name, company_code),
        category:categories(id, name, category_code)
      `)
      .eq('status', true)
      .order('name', { ascending: true });

    let productsList: ProductSearchResult[] = [];

    if (!error && data) {
      productsList = data.map((p: any) => ({
        ...p,
        company_name: p.company?.name || '',
        category_name: p.category?.name || '',
      }));
    } else {
      // Fallback query without relations
      const fallback = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (fallback.data) {
        productsList = fallback.data as ProductSearchResult[];
      }
    }

    if (!query || !query.trim()) return productsList;

    const q = query.toLowerCase().trim();
    return productsList.filter(
      (p) =>
        (p.product_code && p.product_code.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.company_name && p.company_name.toLowerCase().includes(q)) ||
        (p.company?.company_code && p.company.company_code.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  } catch (err) {
    console.warn('Error searching products for order:', err);
    return [];
  }
}

/**
 * Save new order to Supabase database (orders & order_items)
 */
export async function saveOrderToDatabase(input: CreateOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    // 1. Get current associate user session if available
    const { data: { session } } = await supabase.auth.getSession();
    const associateId = session?.user?.id || null;

    // 2. Generate unique order_number: e.g. ORD-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomNum}`;

    // 3. Calculate total amount
    const totalAmount = input.items.reduce(
      (sum, item) => sum + (Number(item.requested_quantity) || 0) * (Number(item.selling_price) || 0),
      0
    );

    // 4. Insert order row into Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          firm: input.firm || 'LE',
          dealer_id: input.dealer_id,
          associate_id: associateId,
          associate_status: input.associate_status, // 'Draft' | 'Submitted'
          approving_status: 'Pending',
          packing_status: 'Pending',
          notes: input.notes || null,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Supabase error inserting order:', orderError);
      return { success: false, error: orderError.message };
    }

    const newOrderId = orderData.id;

    // 5. Insert order_items rows into Supabase
    const itemRows = input.items.map((item) => {
      const lineTotal = (Number(item.requested_quantity) || 0) * (Number(item.selling_price) || 0);
      return {
        order_id: newOrderId,
        product_id: item.product_id,
        requested_quantity: Number(item.requested_quantity) || 0,
        approved_quantity: 0,
        released_quantity: 0,
        pending_quantity: Number(item.requested_quantity) || 0,
        selling_price: Number(item.selling_price) || 0,
        mrp: Number(item.mrp || item.associate_mrp || 0),
        associate_mrp: Number(item.associate_mrp || item.mrp || 0),
        discount: Number(item.discount || 0),
        ad_discount: Number(item.ad_discount || 0),
        notes: item.notes || null,
        line_total: lineTotal,
      };
    });

    const { error: itemsError } = await supabase.from('order_items').insert(itemRows);

    if (itemsError) {
      console.error('Supabase error inserting order items:', itemsError);
      return { success: false, error: itemsError.message };
    }

    // 6. Also sync to local storage cache if present to support offline/fast render
    if (typeof window !== 'undefined') {
      try {
        const LOCAL_STORAGE_ORDERS_KEY = 'lakshmi_orders_data_v1';
        const LOCAL_STORAGE_ORDER_ITEMS_KEY = 'lakshmi_order_items_data_v1';

        const existingOrdersStr = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
        const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
        existingOrders.unshift({
          ...orderData,
          item_count: input.items.length,
        });
        localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(existingOrders));

        const existingItemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
        const existingItems = existingItemsStr ? JSON.parse(existingItemsStr) : [];
        const mappedItems = itemRows.map((it, idx) => ({
          ...it,
          id: `item-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
        }));
        localStorage.setItem(LOCAL_STORAGE_ORDER_ITEMS_KEY, JSON.stringify([...mappedItems, ...existingItems]));
      } catch (e) {
        console.warn('Local storage sync error:', e);
      }
    }

    return {
      success: true,
      orderId: newOrderId,
      orderNumber: orderData.order_number,
    };
  } catch (err: any) {
    console.error('Error saving order to database:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while saving the order.',
    };
  }
}

/**
 * Fetch existing order by ID for viewing or editing
 */
export async function getOrderByIdForEdit(orderId: string): Promise<{
  order: any | null;
  items: any[];
  dealer: Dealer | null;
  editable: boolean;
  error?: string;
}> {
  try {
    // 1. Fetch from Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        dealer:dealers(*),
        order_items(
          *,
          product:products(
            *,
            company:companies(id, name, company_code)
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (!orderError && orderData) {
      const isPending = orderData.approving_status === 'Pending';
      const items = (orderData.order_items || []).map((it: any) => ({
        ...it,
        product: {
          ...it.product,
          company_name: it.product?.company?.name || '',
        },
      }));

      return {
        order: orderData,
        items,
        dealer: orderData.dealer || null,
        editable: isPending,
      };
    }

    // Fallback: Check local storage
    if (typeof window !== 'undefined') {
      const LOCAL_STORAGE_ORDERS_KEY = 'lakshmi_orders_data_v1';
      const LOCAL_STORAGE_ORDER_ITEMS_KEY = 'lakshmi_order_items_data_v1';
      const storedOrders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY) || '[]');
      const localOrder = storedOrders.find((o: any) => o.id === orderId);

      if (localOrder) {
        const storedItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY) || '[]');
        const localItems = storedItems.filter((i: any) => i.order_id === orderId);
        const dealers = await getDealersForOrder();
        const dealer = dealers.find((d) => d.id === localOrder.dealer_id) || localOrder.dealer || null;
        const products = await searchProductsForOrder('');
        const productsMap = new Map(products.map((p) => [p.id, p]));

        const mappedItems = localItems.map((i: any) => ({
          ...i,
          product: productsMap.get(i.product_id) || i.product || null,
        }));

        return {
          order: localOrder,
          items: mappedItems,
          dealer,
          editable: localOrder.approving_status === 'Pending',
        };
      }
    }

    return {
      order: null,
      items: [],
      dealer: null,
      editable: false,
      error: orderError?.message || 'Order not found',
    };
  } catch (err: any) {
    console.error('Error fetching order for edit:', err);
    return {
      order: null,
      items: [],
      dealer: null,
      editable: false,
      error: err?.message || 'Error loading order',
    };
  }
}

/**
 * Update existing order in database (only permitted if approving_status == Pending)
 */
export async function updateOrderInDatabase(
  orderId: string,
  input: CreateOrderInput
): Promise<{
  success: boolean;
  orderNumber?: string;
  error?: string;
}> {
  try {
    // 1. Verify current status first
    const existing = await getOrderByIdForEdit(orderId);
    if (!existing.order) {
      return { success: false, error: 'Order not found.' };
    }

    if (existing.order.approving_status !== 'Pending') {
      return {
        success: false,
        error: `Order cannot be edited because approving status is "${existing.order.approving_status}". Only Pending orders can be modified.`,
      };
    }

    const totalAmount = input.items.reduce(
      (sum, item) => sum + (Number(item.requested_quantity) || 0) * (Number(item.selling_price) || 0),
      0
    );

    // 2. Update order header in Supabase
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        firm: input.firm || existing.order.firm || 'LE',
        dealer_id: input.dealer_id,
        associate_status: input.associate_status,
        notes: input.notes || null,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return { success: false, error: updateError.message };
    }

    // 3. Replace order items: delete old items then insert new ones
    await supabase.from('order_items').delete().eq('order_id', orderId);

    const itemRows = input.items.map((item) => {
      const lineTotal = (Number(item.requested_quantity) || 0) * (Number(item.selling_price) || 0);
      return {
        order_id: orderId,
        product_id: item.product_id,
        requested_quantity: Number(item.requested_quantity) || 0,
        approved_quantity: 0,
        released_quantity: 0,
        pending_quantity: Number(item.requested_quantity) || 0,
        selling_price: Number(item.selling_price) || 0,
        mrp: Number(item.mrp || item.associate_mrp || 0),
        associate_mrp: Number(item.associate_mrp || item.mrp || 0),
        discount: Number(item.discount || 0),
        ad_discount: Number(item.ad_discount || 0),
        notes: item.notes || null,
        line_total: lineTotal,
      };
    });

    const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
    if (itemsError) {
      console.error('Error updating order items:', itemsError);
      return { success: false, error: itemsError.message };
    }

    // 4. Update local storage
    if (typeof window !== 'undefined') {
      try {
        const LOCAL_STORAGE_ORDERS_KEY = 'lakshmi_orders_data_v1';
        const LOCAL_STORAGE_ORDER_ITEMS_KEY = 'lakshmi_order_items_data_v1';

        const storedOrders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY) || '[]');
        const updatedList = storedOrders.map((o: any) =>
          o.id === orderId
            ? {
                ...o,
                dealer_id: input.dealer_id,
                associate_status: input.associate_status,
                notes: input.notes || null,
                total_amount: totalAmount,
                item_count: input.items.length,
                updated_at: new Date().toISOString(),
              }
            : o
        );
        localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedList));

        const storedItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY) || '[]');
        const filteredItems = storedItems.filter((i: any) => i.order_id !== orderId);
        const newItems = itemRows.map((it, idx) => ({
          ...it,
          id: `item-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
        }));
        localStorage.setItem(
          LOCAL_STORAGE_ORDER_ITEMS_KEY,
          JSON.stringify([...newItems, ...filteredItems])
        );
      } catch (e) {
        console.warn('Local storage update error:', e);
      }
    }

    return {
      success: true,
      orderNumber: updatedOrder?.order_number || existing.order.order_number,
    };
  } catch (err: any) {
    console.error('Error updating order:', err);
    return {
      success: false,
      error: err?.message || 'Failed to update order.',
    };
  }
}

/**
 * Fetch list of orders for Associate Orders Page with filters
 */
export async function getAssociateOrdersList(filters?: {
  firm?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  dealerId?: string;
  groupId?: string;
  associateStatus?: string;
  approvingStatus?: string;
  packingStatus?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        dealer:dealers(id, name, dealer_code, mobile, group_id, group:groups(id, group_id, group_name))
      `)
      .order('created_at', { ascending: false });

    if (filters?.firm && filters.firm !== 'ALL') {
      query = query.eq('firm', filters.firm);
    }

    if (filters?.dealerId && filters.dealerId !== 'ALL') {
      query = query.eq('dealer_id', filters.dealerId);
    }

    if (filters?.associateStatus && filters.associateStatus !== 'ALL') {
      query = query.eq('associate_status', filters.associateStatus);
    }

    if (filters?.approvingStatus && filters.approvingStatus !== 'ALL') {
      query = query.eq('approving_status', filters.approvingStatus);
    }

    if (filters?.packingStatus && filters.packingStatus !== 'ALL') {
      query = query.eq('packing_status', filters.packingStatus);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    let list: any[] = [];

    if (!error && data) {
      list = data;
    }

    // Merge with local storage fallback for offline/instant updates
    if (typeof window !== 'undefined') {
      try {
        const storedOrders = JSON.parse(
          localStorage.getItem('lakshmi_orders_data_v1') || '[]'
        );

        if (storedOrders && storedOrders.length > 0) {
          const map = new Map(list.map((o) => [o.id, o]));
          for (const so of storedOrders) {
            if (!map.has(so.id)) {
              if (!filters?.firm || filters.firm === 'ALL' || so.firm === filters.firm) {
                map.set(so.id, so);
              }
            }
          }
          list = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      } catch (e) {
        console.warn('Local storage orders merge error:', e);
      }
    }

    // Filter in JS for group if provided
    if (filters?.groupId && filters.groupId !== 'ALL') {
      list = list.filter(
        (o) => o.dealer?.group_id === filters.groupId || o.dealer?.group?.id === filters.groupId
      );
    }

    // Filter in JS for text search if provided
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.order_number && o.order_number.toLowerCase().includes(q)) ||
          (o.id && o.id.toLowerCase().includes(q)) ||
          (o.dealer?.name && o.dealer.name.toLowerCase().includes(q)) ||
          (o.dealer?.dealer_code && o.dealer.dealer_code.toLowerCase().includes(q)) ||
          (o.firm && o.firm.toLowerCase().includes(q))
      );
    }

    return list;
  } catch (err) {
    console.error('Error fetching associate orders:', err);
    return [];
  }
}

