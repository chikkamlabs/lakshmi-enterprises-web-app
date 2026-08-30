import { supabase } from './supabase';
import { Dealer } from './dealersStore';
import { Product } from './productsStore';

export type AssociateStatus = 'Draft' | 'Submitted';
export type ApprovingStatus = 'Pending' | 'Partially Approved' | 'Approved';
export type PackingStatus = 'Pending' | 'partially_packed' | 'Packed';

export interface OrderProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  role?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  requested_quantity: number;
  approved_quantity: number;
  released_quantity: number;
  pending_quantity: number;
  selling_price: number;
  mrp?: number;
  associate_mrp?: number;
  discount?: number;
  ad_discount?: number;
  gst?: number;
  notes?: string | null;
  line_total: number;
  created_at?: string;
  updated_at?: string;
  product?: Product | null;
}

export interface Order {
  id: string;
  order_number: string;
  firm?: 'LE' | 'SLSA';
  dealer_id: string;
  associate_id: string | null;
  packed_by: string | null;
  associate_status: AssociateStatus;
  approving_status: ApprovingStatus;
  packing_status: PackingStatus;
  notes: string | null;
  total_amount: number;
  amount?: number;
  balance_amount?: number;
  delivered_date?: string | null;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
  dealer?: Dealer | null;
  associate?: OrderProfile | null;
  packed_by_profile?: OrderProfile | null;
  items?: OrderItem[];
  order_items?: { id: string }[];
}

const LOCAL_STORAGE_ORDERS_KEY = 'lakshmi_orders_data_v1';
const LOCAL_STORAGE_ORDER_ITEMS_KEY = 'lakshmi_order_items_data_v1';

// Seed data if DB is empty or offline
const sampleDealers: Dealer[] = [
  {
    id: 'dlr-101',
    dealer_code: 'DLR-101',
    name: 'Sri Krishna Hardware',
    shop_name: 'Sri Krishna Hardware & Electricals',
    mobile: '9848022338',
    address: 'Main Road, Guntur',
    le_credit: 45000.00,
    slsa_credit: 12000.00,
    le_credit_limit: 100000.00,
    slsa_credit_limit: 50000.00,
    current_credit: 45000.00,
    credit_limit: 100000.00,
    status: true,
  },
  {
    id: 'dlr-102',
    dealer_code: 'DLR-102',
    name: 'Balaji Electricals',
    shop_name: 'Balaji Electrical Mart',
    mobile: '9848033449',
    address: 'Gandhi Chowk, Vijayawada',
    le_credit: 12500.00,
    slsa_credit: 8500.00,
    le_credit_limit: 50000.00,
    slsa_credit_limit: 40000.00,
    current_credit: 12500.00,
    credit_limit: 50000.00,
    status: true,
  },
];

const sampleAssociates: OrderProfile[] = [
  { id: 'assoc-1', name: 'Rajesh Sharma', email: 'rajesh.associate@lakshmi.com', mobile: '9876543210' },
  { id: 'assoc-2', name: 'Suresh Kumar', email: 'suresh.associate@lakshmi.com', mobile: '9876543211' },
];

const sampleStaff: OrderProfile[] = [
  { id: 'staff-1', name: 'Venkatesh Rao', email: 'venkatesh.staff@lakshmi.com', mobile: '9123456780', role: 'staff' },
  { id: 'staff-2', name: 'Priya Verma', email: 'priya.staff@lakshmi.com', mobile: '9123456781', role: 'staff' },
];

const initialOrders: Order[] = [
  {
    id: 'ord-1001',
    order_number: 'ORD-2026-1001',
    dealer_id: 'dlr-101',
    associate_id: 'assoc-1',
    packed_by: 'staff-1',
    associate_status: 'Submitted',
    approving_status: 'Pending',
    packing_status: 'Pending',
    notes: 'Urgent delivery requested for hardware stock',
    total_amount: 14500.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dealer: sampleDealers[0],
    associate: sampleAssociates[0],
    packed_by_profile: sampleStaff[0],
  },
  {
    id: 'ord-1002',
    order_number: 'ORD-2026-1002',
    dealer_id: 'dlr-102',
    associate_id: 'assoc-2',
    packed_by: null,
    associate_status: 'Submitted',
    approving_status: 'Approved',
    packing_status: 'partially_packed',
    notes: 'Regular monthly order',
    total_amount: 28000.00,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    dealer: sampleDealers[1],
    associate: sampleAssociates[1],
    packed_by_profile: null,
  },
  {
    id: 'ord-1003',
    order_number: 'ORD-2026-1003',
    dealer_id: 'dlr-101',
    associate_id: 'assoc-1',
    packed_by: null,
    associate_status: 'Submitted',
    approving_status: 'Partially Approved',
    packing_status: 'Pending',
    notes: 'Approved 2 out of 3 requested items',
    total_amount: 19800.00,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    dealer: sampleDealers[0],
    associate: sampleAssociates[0],
    packed_by_profile: null,
  },
];

const initialOrderItems: OrderItem[] = [
  {
    id: 'item-1',
    order_id: 'ord-1001',
    product_id: 'prod-1',
    requested_quantity: 50,
    approved_quantity: 50,
    released_quantity: 0,
    pending_quantity: 50,
    selling_price: 150.00,
    line_total: 7500.00,
    product: {
      id: 'prod-1',
      product_code: 'PRD-101',
      barcode: '890123456781',
      name: 'Modular Switch 6A 1-Way',
      company_id: null,
      category_id: null,
      purchase_price: 100,
      selling_price: 150,
      mrp: 180,
      current_stock: 250,
      low_stock: 20,
      unit: 'pcs',
      status: true,
    },
  },
  {
    id: 'item-2',
    order_id: 'ord-1001',
    product_id: 'prod-2',
    requested_quantity: 20,
    approved_quantity: 20,
    released_quantity: 0,
    pending_quantity: 20,
    selling_price: 350.00,
    line_total: 7000.00,
    product: {
      id: 'prod-2',
      product_code: 'PRD-102',
      barcode: '890123456782',
      name: 'LED Batten Light 20W',
      company_id: null,
      category_id: null,
      purchase_price: 250,
      selling_price: 350,
      mrp: 450,
      current_stock: 100,
      low_stock: 15,
      unit: 'pcs',
      status: true,
    },
  },
  {
    id: 'item-3',
    order_id: 'ord-1002',
    product_id: 'prod-3',
    requested_quantity: 10,
    approved_quantity: 10,
    released_quantity: 5,
    pending_quantity: 5,
    selling_price: 2800.00,
    line_total: 28000.00,
    product: {
      id: 'prod-3',
      product_code: 'PRD-103',
      barcode: '890123456783',
      name: 'Copper Wire Roll 1.5 sqmm',
      company_id: null,
      category_id: null,
      purchase_price: 2200,
      selling_price: 2800,
      mrp: 3200,
      current_stock: 40,
      low_stock: 5,
      unit: 'box',
      status: true,
    },
  },
];

export interface OrderFilters {
  firm?: string;
  fromDate?: string;
  toDate?: string;
  associateStatus?: string;
  approvingStatus?: string;
  packingStatus?: string;
  dealerId?: string;
  associateId?: string;
  groupId?: string;
}

/**
 * Get staff members for dropdown
 */
export async function getStaffMembers(): Promise<OrderProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, mobile, role')
      .eq('role', 'staff');

    if (!error && data && data.length > 0) {
      return data as OrderProfile[];
    }
  } catch (err) {
    console.warn('Could not fetch staff from Supabase:', err);
  }
  return sampleStaff;
}

/**
 * Fetch orders with optional filters and full details
 */
export async function getOrders(filters?: OrderFilters): Promise<Order[]> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        dealer:dealers(*, group:groups(*)),
        associate:profiles!orders_associate_id_fkey(id, name, email, mobile),
        packed_by_profile:profiles!orders_packed_by_fkey(id, name, email, mobile),
        order_items(id)
      `)
      .order('created_at', { ascending: false });

    if (filters?.firm && filters.firm !== 'ALL') {
      query = query.eq('firm', filters.firm);
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
    if (filters?.dealerId && filters.dealerId !== 'ALL') {
      query = query.eq('dealer_id', filters.dealerId);
    }
    if (filters?.associateId && filters.associateId !== 'ALL') {
      query = query.eq('associate_id', filters.associateId);
    }
    if (filters?.fromDate) {
      const fromIso = `${filters.fromDate}T00:00:00.000Z`;
      query = query.gte('created_at', fromIso);
    }
    if (filters?.toDate) {
      const toIso = `${filters.toDate}T23:59:59.999Z`;
      query = query.lte('created_at', toIso);
    }

    const { data, error } = await query;

    if (!error && data) {
      const mapped = data.map((o: any) => ({
        ...o,
        item_count: Array.isArray(o.order_items) ? o.order_items.length : 0,
      }));
      let filteredResult = mapped as Order[];
      if (filters?.groupId && filters.groupId !== 'ALL') {
        filteredResult = filteredResult.filter(
          (o) => o.dealer?.group_id === filters.groupId || o.dealer?.group?.id === filters.groupId
        );
      }
      return filteredResult;
    }

    // Fallback if joined query had foreign key issues
    const simpleRes = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!simpleRes.error && simpleRes.data) {
      const [dealersRes, profilesRes, itemsRes] = await Promise.all([
        supabase.from('dealers').select('*, group:groups(*)'),
        supabase.from('profiles').select('*'),
        supabase.from('order_items').select('id, order_id'),
      ]);

      const dealersMap = new Map((dealersRes.data || []).map((d) => [d.id, d]));
      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      
      const itemCountMap = new Map<string, number>();
      (itemsRes.data || []).forEach((item: any) => {
        const count = itemCountMap.get(item.order_id) || 0;
        itemCountMap.set(item.order_id, count + 1);
      });

      const combined: Order[] = simpleRes.data.map((o) => ({
        ...o,
        dealer: dealersMap.get(o.dealer_id) || null,
        associate: profilesMap.get(o.associate_id) || null,
        packed_by_profile: profilesMap.get(o.packed_by) || null,
        item_count: itemCountMap.get(o.id) || 0,
      }));

      // Filter locally if needed
      return applyLocalFilters(combined, filters);
    }
  } catch (err) {
    console.warn('Supabase orders fetch error, checking local fallback:', err);
  }

  // Local storage fallback
  return getLocalOrders(filters);
}

function applyLocalFilters(ordersList: Order[], filters?: OrderFilters): Order[] {
  let result = [...ordersList];

  if (filters?.firm && filters.firm !== 'ALL') {
    result = result.filter((o) => (o.firm || 'LE') === filters.firm);
  }
  if (filters?.associateStatus && filters.associateStatus !== 'ALL') {
    result = result.filter((o) => o.associate_status === filters.associateStatus);
  }
  if (filters?.approvingStatus && filters.approvingStatus !== 'ALL') {
    result = result.filter((o) => o.approving_status === filters.approvingStatus);
  }
  if (filters?.packingStatus && filters.packingStatus !== 'ALL') {
    result = result.filter((o) => o.packing_status === filters.packingStatus);
  }
  if (filters?.dealerId && filters.dealerId !== 'ALL') {
    result = result.filter((o) => o.dealer_id === filters.dealerId);
  }
  if (filters?.groupId && filters.groupId !== 'ALL') {
    result = result.filter(
      (o) => o.dealer?.group_id === filters.groupId || o.dealer?.group?.id === filters.groupId
    );
  }
  if (filters?.associateId && filters.associateId !== 'ALL') {
    result = result.filter((o) => o.associate_id === filters.associateId);
  }
  if (filters?.fromDate) {
    const fromTime = new Date(`${filters.fromDate}T00:00:00`).getTime();
    result = result.filter((o) => {
      const createdTime = new Date(o.created_at || '').getTime();
      return createdTime >= fromTime;
    });
  }
  if (filters?.toDate) {
    const toTime = new Date(`${filters.toDate}T23:59:59`).getTime();
    result = result.filter((o) => {
      const createdTime = new Date(o.created_at || '').getTime();
      return createdTime <= toTime;
    });
  }

  return result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function getLocalOrders(filters?: OrderFilters): Order[] {
  if (typeof window === 'undefined') return [];

  const storedStr = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  let list: Order[] = [];

  if (storedStr) {
    try {
      list = JSON.parse(storedStr);
    } catch (e) {
      console.error('Failed parsing local orders:', e);
    }
  }

  // Attach item count from local items
  const storedItemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
  let localItems: OrderItem[] = [];
  if (storedItemsStr) {
    try {
      localItems = JSON.parse(storedItemsStr);
    } catch (e) {
      console.error('Failed parsing local order items:', e);
    }
  }

  list = list.map((ord) => {
    const count = localItems.filter((i) => i.order_id === ord.id).length;
    return {
      ...ord,
      item_count: count || ord.item_count || 0,
    };
  });

  return applyLocalFilters(list, filters);
}

/**
 * Fetch a single order by ID with details and order items
 */
export async function getOrderById(orderId: string): Promise<{
  order: Order | null;
  items: OrderItem[];
  dealer: Dealer | null;
}> {
  try {
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!orderErr && orderData) {
      const [dealerRes, associateRes, packedByRes, itemsRes] = await Promise.all([
        supabase.from('dealers').select('*, group:groups(*)').eq('id', orderData.dealer_id).maybeSingle(),
        orderData.associate_id
          ? supabase.from('profiles').select('id, name, email, mobile').eq('id', orderData.associate_id).maybeSingle()
          : Promise.resolve({ data: null }),
        orderData.packed_by
          ? supabase.from('profiles').select('id, name, email, mobile').eq('id', orderData.packed_by).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('order_items').select('*, product:products(*)').eq('order_id', orderId),
      ]);

      const fullOrder: Order = {
        ...orderData,
        dealer: dealerRes.data || null,
        associate: associateRes.data || null,
        packed_by_profile: packedByRes.data || null,
      };

      let itemsList: OrderItem[] = (itemsRes.data as unknown as OrderItem[]) || [];

      if (itemsList.length === 0) {
        // Fallback fetch items without relation
        const rawItems = await supabase.from('order_items').select('*').eq('order_id', orderId);
        if (rawItems.data && rawItems.data.length > 0) {
          itemsList = rawItems.data as OrderItem[];
        }
      }

      return {
        order: fullOrder,
        items: itemsList,
        dealer: dealerRes.data || null,
      };
    }
  } catch (err) {
    console.warn('Error fetching order from Supabase:', err);
  }

  // Local fallback
  const localOrders = getLocalOrders();
  const foundOrder = localOrders.find((o) => o.id === orderId) || null;

  let localItems: OrderItem[] = [];
  if (typeof window !== 'undefined') {
    const itemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
    if (itemsStr) {
      try {
        const parsedItems: OrderItem[] = JSON.parse(itemsStr);
        localItems = parsedItems.filter((it) => it.order_id === orderId);
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (localItems.length === 0 && foundOrder) {
    localItems = initialOrderItems.filter((it) => it.order_id === orderId);
  }

  return {
    order: foundOrder,
    items: localItems,
    dealer: foundOrder?.dealer || null,
  };
}

/**
 * Save / Release order modifications (change approving_status, attach packed_by staff, update approved_quantity, selling_price, line_total, and total_amount)
 */
export async function saveOrderApproval(params: {
  orderId: string;
  approvingStatus: ApprovingStatus;
  packedByStaffId: string | null;
  deliveredDate?: string | null;
  notes?: string;
  updatedItems: {
    id: string;
    approved_quantity: number;
    selling_price: number;
    line_total: number;
  }[];
}): Promise<boolean> {
  const { orderId, approvingStatus, packedByStaffId, deliveredDate, notes, updatedItems } = params;

  // Calculate new total order amount
  const newTotalAmount = updatedItems.reduce((acc, curr) => acc + (Number(curr.line_total) || 0), 0);

  let success = false;

  // 1. Try updating Supabase
  try {
    // Update order level
    const updatePayload: Record<string, unknown> = {
      approving_status: approvingStatus,
      packed_by: packedByStaffId || null,
      total_amount: newTotalAmount,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    if (deliveredDate !== undefined) {
      updatePayload.delivered_date = deliveredDate || null;
    }

    const { error: orderErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (!orderErr) {
      // Update each item
      for (const item of updatedItems) {
        await supabase
          .from('order_items')
          .update({
            approved_quantity: item.approved_quantity,
            selling_price: item.selling_price,
            line_total: item.line_total,
            pending_quantity: item.approved_quantity, // default pending = approved
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }
      success = true;
    }
  } catch (err) {
    console.warn('Error updating order in Supabase:', err);
  }

  // 2. Also update local storage for seamless sync
  if (typeof window !== 'undefined') {
    try {
      const ordersStr = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (ordersStr) {
        const orders: Order[] = JSON.parse(ordersStr);
        const idx = orders.findIndex((o) => o.id === orderId);
        if (idx !== -1) {
          orders[idx].approving_status = approvingStatus;
          orders[idx].packed_by = packedByStaffId;
          orders[idx].total_amount = newTotalAmount;
          if (notes !== undefined) orders[idx].notes = notes;
          if (deliveredDate !== undefined) orders[idx].delivered_date = deliveredDate || null;
          orders[idx].updated_at = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
        }
      }

      const itemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
      if (itemsStr) {
        const items: OrderItem[] = JSON.parse(itemsStr);
        updatedItems.forEach((uItem) => {
          const itemIdx = items.findIndex((it) => it.id === uItem.id);
          if (itemIdx !== -1) {
            items[itemIdx].approved_quantity = uItem.approved_quantity;
            items[itemIdx].selling_price = uItem.selling_price;
            items[itemIdx].line_total = uItem.line_total;
            items[itemIdx].pending_quantity = uItem.approved_quantity;
            items[itemIdx].updated_at = new Date().toISOString();
          }
        });
        localStorage.setItem(LOCAL_STORAGE_ORDER_ITEMS_KEY, JSON.stringify(items));
      }
      success = true;
    } catch (e) {
      console.error('Local storage update error:', e);
    }
  }

  return success;
}

/**
 * Save staff packing status and released quantities for an order
 */
export async function saveOrderPacking(params: {
  orderId: string;
  packingStatus: PackingStatus;
  packedByStaffId?: string | null;
  items: {
    id: string;
    released_quantity: number;
    approved_quantity: number;
    mrp?: number;
    selling_price?: number;
    line_total?: number;
  }[];
}): Promise<boolean> {
  const { orderId, packingStatus, packedByStaffId, items } = params;

  let success = false;

  try {
    const updateData: any = {
      packing_status: packingStatus,
      updated_at: new Date().toISOString(),
    };
    if (packedByStaffId !== undefined) {
      updateData.packed_by = packedByStaffId;
    }

    const { error: orderErr } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (!orderErr) {
      for (const item of items) {
        const relQty = Number(item.released_quantity) || 0;
        const appQty = Number(item.approved_quantity) || 0;
        const mrp = Number(item.mrp) || 0;
        const sellingPrice = item.selling_price !== undefined ? Number(item.selling_price) : mrp;
        const lineTotal = item.line_total !== undefined ? Number(item.line_total) : Math.round(sellingPrice * relQty * 100) / 100;
        const pending = Math.max(0, appQty - relQty);

        const itemPayload: any = {
          released_quantity: relQty,
          pending_quantity: pending,
          mrp: mrp,
          selling_price: sellingPrice,
          line_total: lineTotal,
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('order_items')
          .update(itemPayload)
          .eq('id', item.id);
      }

      // Recalculate order total amount from all items and update orders
      const { data: allItems } = await supabase
        .from('order_items')
        .select('line_total')
        .eq('order_id', orderId);

      if (allItems && allItems.length > 0) {
        const newTotal = allItems.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0);
        await supabase
          .from('orders')
          .update({
            total_amount: newTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }

      success = true;
    }
  } catch (err) {
    console.warn('Error updating order packing in Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const itemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
      if (itemsStr) {
        const storeItems: OrderItem[] = JSON.parse(itemsStr);
        items.forEach((uItem) => {
          const itemIdx = storeItems.findIndex((it) => it.id === uItem.id);
          if (itemIdx !== -1) {
            const relQty = Number(uItem.released_quantity) || 0;
            const mrp = uItem.mrp !== undefined ? Number(uItem.mrp) : (storeItems[itemIdx].mrp || 0);
            const sp = uItem.selling_price !== undefined ? Number(uItem.selling_price) : mrp;
            const lineTot = uItem.line_total !== undefined ? Number(uItem.line_total) : Math.round(sp * relQty * 100) / 100;

            storeItems[itemIdx].released_quantity = relQty;
            storeItems[itemIdx].pending_quantity = Math.max(0, (uItem.approved_quantity ?? storeItems[itemIdx].approved_quantity) - relQty);
            storeItems[itemIdx].mrp = mrp;
            storeItems[itemIdx].selling_price = sp;
            storeItems[itemIdx].line_total = lineTot;
            storeItems[itemIdx].updated_at = new Date().toISOString();
          }
        });
        localStorage.setItem(LOCAL_STORAGE_ORDER_ITEMS_KEY, JSON.stringify(storeItems));

        // Update total_amount in orders
        const orderItems = storeItems.filter((it) => it.order_id === orderId);
        const newOrderTotal = orderItems.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);

        const ordersStr = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
        if (ordersStr) {
          const orders: Order[] = JSON.parse(ordersStr);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx !== -1) {
            orders[idx].packing_status = packingStatus;
            if (packedByStaffId !== undefined) orders[idx].packed_by = packedByStaffId;
            orders[idx].total_amount = newOrderTotal;
            orders[idx].updated_at = new Date().toISOString();
            localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
          }
        }
      }
      success = true;
    } catch (e) {
      console.error('Local storage packing update error:', e);
    }
  }

  return success;
}

/**
 * Update a single order item in the database (order_items table) and sync order totals
 */
export async function updateSingleOrderItem(params: {
  itemId: string;
  orderId: string;
  requested_quantity?: number;
  approved_quantity?: number;
  released_quantity?: number;
  mrp?: number;
  associate_mrp?: number;
  discount?: number;
  selling_price?: number;
  ad_discount?: number;
  notes?: string | null;
  line_total?: number;
}): Promise<boolean> {
  const { itemId, orderId, ...fields } = params;
  let success = false;

  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (fields.requested_quantity !== undefined) payload.requested_quantity = Number(fields.requested_quantity) || 0;
    if (fields.approved_quantity !== undefined) payload.approved_quantity = Number(fields.approved_quantity) || 0;
    if (fields.released_quantity !== undefined) payload.released_quantity = Number(fields.released_quantity) || 0;
    if (fields.mrp !== undefined) payload.mrp = Number(fields.mrp) || 0;
    if (fields.associate_mrp !== undefined) payload.associate_mrp = Number(fields.associate_mrp) || 0;
    if (fields.discount !== undefined) payload.discount = Number(fields.discount) || 0;
    if (fields.selling_price !== undefined) payload.selling_price = Number(fields.selling_price) || 0;
    if (fields.ad_discount !== undefined) payload.ad_discount = Number(fields.ad_discount) || 0;
    if (fields.notes !== undefined) payload.notes = fields.notes;
    if (fields.line_total !== undefined) payload.line_total = Number(fields.line_total) || 0;

    if (fields.approved_quantity !== undefined && fields.released_quantity !== undefined) {
      payload.pending_quantity = Math.max(0, fields.approved_quantity - fields.released_quantity);
    } else if (fields.approved_quantity !== undefined) {
      payload.pending_quantity = fields.approved_quantity;
    }

    // 1. Update in Supabase
    const { error: itemErr } = await supabase
      .from('order_items')
      .update(payload)
      .eq('id', itemId);

    if (!itemErr) {
      // Recalculate order total amount from all items
      const { data: allItems } = await supabase
        .from('order_items')
        .select('line_total')
        .eq('order_id', orderId);

      if (allItems && allItems.length > 0) {
        const newTotal = allItems.reduce((acc, it) => acc + (Number(it.line_total) || 0), 0);
        await supabase
          .from('orders')
          .update({
            total_amount: newTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }
      success = true;
    }
  } catch (err) {
    console.warn('Error updating order item in Supabase:', err);
  }

  // 2. Sync to localStorage
  if (typeof window !== 'undefined') {
    try {
      const itemsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_ITEMS_KEY);
      if (itemsStr) {
        const storeItems: OrderItem[] = JSON.parse(itemsStr);
        const itemIdx = storeItems.findIndex((it) => it.id === itemId);
        if (itemIdx !== -1) {
          storeItems[itemIdx] = { ...storeItems[itemIdx], ...fields, updated_at: new Date().toISOString() };
          localStorage.setItem(LOCAL_STORAGE_ORDER_ITEMS_KEY, JSON.stringify(storeItems));

          // Update total_amount in orders
          const orderItems = storeItems.filter((it) => it.order_id === orderId);
          const newOrderTotal = orderItems.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);

          const ordersStr = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
          if (ordersStr) {
            const orders: Order[] = JSON.parse(ordersStr);
            const ordIdx = orders.findIndex((o) => o.id === orderId);
            if (ordIdx !== -1) {
              orders[ordIdx].total_amount = newOrderTotal;
              orders[ordIdx].updated_at = new Date().toISOString();
              localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
            }
          }
        }
      }
      success = true;
    } catch (e) {
      console.warn('Error updating localStorage item:', e);
    }
  }

  return success;
}
