import { supabase } from './supabase';
import { getDealerById, updateDealer, Dealer } from './dealersStore';
import { Order } from './ordersStore';

export type CalculationType = 'credit' | 'deduct';
export type PaymentType = 'cash' | 'upi' | 'cheque' | 'others';

export interface OrderPayment {
  id: string;
  bill_id: string | null;
  dealer_id: string;
  amount: number;
  calculation_type: CalculationType;
  remaining_amount: number;
  payment_type: PaymentType;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export const LOCAL_STORAGE_ORDER_PAYMENTS_KEY = 'lakshmi_order_payments';

/**
 * Fetch all payments for a specific bill / order ID
 */
export async function getOrderPaymentsByBillId(billId: string): Promise<OrderPayment[]> {
  try {
    const { data, error } = await supabase
      .from('order_payments')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as OrderPayment[];
    }
  } catch (err) {
    console.warn('Error fetching order payments from Supabase:', err);
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY);
      if (stored) {
        const parsed: OrderPayment[] = JSON.parse(stored);
        return parsed
          .filter((p) => p.bill_id === billId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    } catch (e) {
      console.warn('Error reading order payments from local storage:', e);
    }
  }

  return [];
}

/**
 * Add an order payment and update both order balance_amount and dealer credit
 * calculation_type: 'credit' (add) or 'deduct' (subtract)
 */
export async function addOrderPayment(params: {
  bill_id: string;
  dealer_id: string;
  amount: number;
  calculation_type: CalculationType;
  payment_type: PaymentType;
  notes?: string | null;
  firm?: string;
}): Promise<{
  success: boolean;
  payment?: OrderPayment;
  newBalance?: number;
  error?: string;
}> {
  const { bill_id, dealer_id, amount, calculation_type, payment_type, notes, firm } = params;
  const numAmount = Number(amount) || 0;

  try {
    // 1. Fetch current order to get latest balance_amount
    let currentBalance = 0;
    let orderFirm = firm || 'LE';

    const { data: orderData, error: orderFetchErr } = await supabase
      .from('orders')
      .select('id, balance_amount, total_amount, amount, firm')
      .eq('id', bill_id)
      .maybeSingle();

    if (!orderFetchErr && orderData) {
      if (orderData.balance_amount !== null && orderData.balance_amount !== undefined) {
        currentBalance = Number(orderData.balance_amount);
      } else {
        currentBalance = Number(orderData.total_amount ?? orderData.amount ?? 0);
      }
      if (orderData.firm) {
        orderFirm = orderData.firm;
      }
    } else if (typeof window !== 'undefined') {
      const localOrdersStr = localStorage.getItem('lakshmi_orders');
      if (localOrdersStr) {
        const localOrders: Order[] = JSON.parse(localOrdersStr);
        const matched = localOrders.find((o) => o.id === bill_id);
        if (matched) {
          currentBalance = Number(matched.balance_amount ?? matched.total_amount ?? matched.amount ?? 0);
          if (matched.firm) orderFirm = matched.firm;
        }
      }
    }

    // 2. Compute new remaining balance
    // calculation_type 'credit' = add to balance, 'deduct' = subtract from balance
    const isAdd = calculation_type === 'credit';
    const newBalance = isAdd ? currentBalance + numAmount : currentBalance - numAmount;

    // 3. Insert record into order_payments
    const newPaymentRecord = {
      bill_id,
      dealer_id,
      amount: numAmount,
      calculation_type,
      remaining_amount: newBalance,
      payment_type,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    let insertedPayment: OrderPayment | null = null;

    const { data: insertedData, error: insertErr } = await supabase
      .from('order_payments')
      .insert([newPaymentRecord])
      .select('*')
      .single();

    if (!insertErr && insertedData) {
      insertedPayment = insertedData as OrderPayment;
    } else {
      console.warn('Direct insert returned notice:', insertErr?.message);
      insertedPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...newPaymentRecord,
        updated_at: new Date().toISOString(),
      };
    }

    // 4. Update order.balance_amount in orders table
    await supabase
      .from('orders')
      .update({
        balance_amount: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bill_id);

    // 5. Update dealer credit:
    // If firm type = LE update dealers.le_credit = dealers.le_credit + amount
    // If firm type = slsa update dealers.slsa_credit = dealers.slsa_credit + amount
    const isSlsa = orderFirm.toUpperCase() === 'SLSA';
    const currentDealer = await getDealerById(dealer_id);

    const dealerUpdate: Partial<Dealer> = {};
    if (isSlsa) {
      const currentSlsa = Number(currentDealer?.slsa_credit ?? 0);
      dealerUpdate.slsa_credit = currentSlsa + numAmount;
    } else {
      const currentLe = Number(currentDealer?.le_credit ?? currentDealer?.current_credit ?? 0);
      dealerUpdate.le_credit = currentLe + numAmount;
      dealerUpdate.current_credit = currentLe + numAmount;
    }

    await updateDealer(dealer_id, dealerUpdate);

    // 6. Sync local storage
    if (typeof window !== 'undefined') {
      try {
        // Update payments
        const storedPaymentsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY);
        const storedPayments: OrderPayment[] = storedPaymentsStr ? JSON.parse(storedPaymentsStr) : [];
        if (insertedPayment) {
          storedPayments.unshift(insertedPayment);
          localStorage.setItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY, JSON.stringify(storedPayments));
        }

        // Update orders
        const storedOrdersStr = localStorage.getItem('lakshmi_orders');
        if (storedOrdersStr) {
          const storedOrders: Order[] = JSON.parse(storedOrdersStr);
          const oIdx = storedOrders.findIndex((o) => o.id === bill_id);
          if (oIdx !== -1) {
            storedOrders[oIdx].balance_amount = newBalance;
            localStorage.setItem('lakshmi_orders', JSON.stringify(storedOrders));
          }
        }
      } catch (storageErr) {
        console.warn('Local storage sync notice:', storageErr);
      }
    }

    return {
      success: true,
      payment: insertedPayment || undefined,
      newBalance,
    };
  } catch (err: unknown) {
    const e = err as Error;
    console.error('Failed to add order payment:', e);
    return {
      success: false,
      error: e.message || 'Failed to add order payment.',
    };
  }
}

/**
 * Update Bill Credit when clicking "Update Credit Bill" in Open Order page
 * Inserts order_payments record with calculation_type='credit' (add),
 * Inserts bill_amount into order.balance_amount in Supabase orders table,
 * and increments dealer's LE/SLSA credit.
 */
export async function updateBillCredit(params: {
  orderId: string;
  dealerId: string;
  billAmount: number;
  firm?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  payment?: OrderPayment;
  balanceAmount?: number;
  dealerUpdate?: Partial<Dealer>;
  error?: string;
}> {
  const { orderId, dealerId, billAmount, firm, notes } = params;
  const numAmount = Number(billAmount) || 0;

  try {
    // 1. Insert record into order_payments
    const paymentRecord = {
      bill_id: orderId,
      dealer_id: dealerId,
      amount: numAmount,
      calculation_type: 'credit' as CalculationType,
      payment_type: 'others' as PaymentType,
      notes: notes || `from this ${orderId}`,
      remaining_amount: numAmount,
      created_at: new Date().toISOString(),
    };

    let insertedPayment: OrderPayment | null = null;
    const { data: payData, error: payErr } = await supabase
      .from('order_payments')
      .insert([paymentRecord])
      .select('*')
      .single();

    if (!payErr && payData) {
      insertedPayment = payData as OrderPayment;
    } else {
      console.warn('Notice inserting into order_payments:', payErr?.message);
      insertedPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...paymentRecord,
        updated_at: new Date().toISOString(),
      };
    }

    // 2. Insert/Update order.balance_amount = billAmount in orders table
    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update({
        balance_amount: numAmount,
        amount: numAmount,
        total_amount: numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateErr) {
      console.warn('Notice updating orders table balance_amount:', orderUpdateErr.message);
    }

    // 3. Update dealer credit based on firm
    const isSlsa = (firm || '').toUpperCase() === 'SLSA';
    const currentDealer = await getDealerById(dealerId);
    const currentLe = Number(currentDealer?.le_credit ?? currentDealer?.current_credit ?? 0);
    const currentSlsa = Number(currentDealer?.slsa_credit ?? 0);

    const dealerUpdateFields: Partial<Dealer> = {};
    if (isSlsa) {
      const newSlsa = currentSlsa + numAmount;
      dealerUpdateFields.slsa_credit = newSlsa;
    } else {
      const newLe = currentLe + numAmount;
      dealerUpdateFields.le_credit = newLe;
      dealerUpdateFields.current_credit = newLe;
    }

    await updateDealer(dealerId, dealerUpdateFields);

    // 4. Update local storage caches
    if (typeof window !== 'undefined') {
      try {
        // Update payments
        const storedPaymentsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY);
        const storedPayments: OrderPayment[] = storedPaymentsStr ? JSON.parse(storedPaymentsStr) : [];
        if (insertedPayment) {
          storedPayments.unshift(insertedPayment);
          localStorage.setItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY, JSON.stringify(storedPayments));
        }

        // Update orders
        const storedOrdersStr = localStorage.getItem('lakshmi_orders');
        if (storedOrdersStr) {
          const storedOrders: Order[] = JSON.parse(storedOrdersStr);
          const oIdx = storedOrders.findIndex((o) => o.id === orderId);
          if (oIdx !== -1) {
            storedOrders[oIdx].balance_amount = numAmount;
            storedOrders[oIdx].amount = numAmount;
            storedOrders[oIdx].total_amount = numAmount;
            localStorage.setItem('lakshmi_orders', JSON.stringify(storedOrders));
          }
        }
      } catch (storageErr) {
        console.warn('Local storage sync notice:', storageErr);
      }
    }

    return {
      success: true,
      payment: insertedPayment || undefined,
      balanceAmount: numAmount,
      dealerUpdate: dealerUpdateFields,
    };
  } catch (err: unknown) {
    const e = err as Error;
    console.error('Failed to update bill credit in order_payments:', e);
    return {
      success: false,
      error: e.message || 'Failed to update bill credit.',
    };
  }
}
