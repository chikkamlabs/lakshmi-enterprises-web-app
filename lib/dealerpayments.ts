import { supabase } from './supabase';
import { getDealerById, updateDealer, Dealer } from './dealersStore';

export type CalculationType = 'sum' | 'subtract' | 'credit' | 'deduct';
export type PaymentType = 'cash' | 'upi' | 'cheque' | 'others';

export interface DealerPaymentItem {
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
  firm: string;
  order?: {
    id: string;
    order_number: string;
    firm: string;
  } | null;
}

export interface DealerPaymentSummary {
  totalTransactions: number;
  leCredit: number;
  slsaCredit: number;
}

export interface DealerPaymentsResult {
  dealer: Dealer | null;
  payments: DealerPaymentItem[];
  summary: DealerPaymentSummary;
}

export interface DealerBillItem {
  id: string;
  order_number: string;
  firm: string;
  total_amount: number;
  balance_amount: number;
  created_at: string;
}

export interface SelectedBillReduction {
  billId: string;
  orderNumber?: string;
  firm: string;
  currentBalance: number;
  reduceAmount: number;
}

export interface AddDealerTransactionParams {
  dealerId: string;
  paymentAmount: number;
  paymentType: PaymentType;
  selectedBills?: SelectedBillReduction[];
  selectedBillId?: string | null;
  orderReduceAmount?: number;
  firm?: string;
  notes?: string | null;
}

export interface AddDealerTransactionResult {
  success: boolean;
  payments?: DealerPaymentItem[];
  payment?: DealerPaymentItem;
  updatedDealer?: Dealer | null;
  newOrderBalance?: number;
  error?: string;
}

export const LOCAL_STORAGE_ORDER_PAYMENTS_KEY = 'lakshmi_order_payments';

/**
 * Fetch all order_payments for a specific dealer from Supabase,
 * including joined order/bill details to determine firm (LE or SLSA).
 */
export async function getDealerPayments(dealerId: string): Promise<DealerPaymentsResult> {
  if (!dealerId) {
    return {
      dealer: null,
      payments: [],
      summary: { totalTransactions: 0, leCredit: 0, slsaCredit: 0 },
    };
  }

  try {
    // 1. Fetch dealer details
    const dealer = await getDealerById(dealerId);

    // 2. Fetch order_payments for this dealer
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('order_payments')
      .select(`
        *,
        order:orders(id, order_number, firm)
      `)
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false });

    let payments: DealerPaymentItem[] = [];

    if (!paymentsError && paymentsData) {
      payments = paymentsData.map((p) => {
        // Derive firm: check joined order firm, or note, or default to LE
        let firm = 'LE';
        if (p.order && p.order.firm) {
          firm = p.order.firm;
        } else if (p.notes && p.notes.toUpperCase().includes('SLSA')) {
          firm = 'SLSA';
        }

        return {
          id: p.id,
          bill_id: p.bill_id,
          dealer_id: p.dealer_id,
          amount: Number(p.amount) || 0,
          calculation_type: p.calculation_type,
          remaining_amount: Number(p.remaining_amount) || 0,
          payment_type: p.payment_type,
          notes: p.notes,
          created_at: p.created_at,
          updated_at: p.updated_at,
          firm,
          order: p.order || null,
        };
      });
    } else {
      console.warn('Notice fetching dealer payments from Supabase:', paymentsError?.message);
      // Local storage fallback for offline/demo
      if (typeof window !== 'undefined') {
        const storedStr = localStorage.getItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY);
        if (storedStr) {
          const allStored = JSON.parse(storedStr);
          payments = allStored
            .filter((p: { dealer_id: string }) => p.dealer_id === dealerId)
            .map((p: Record<string, unknown>) => ({
              ...p,
              firm: (p.firm as string) || (typeof p.notes === 'string' && p.notes.includes('SLSA') ? 'SLSA' : 'LE'),
            }))
            .sort((a: DealerPaymentItem, b: DealerPaymentItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }
    }

    const leCredit = Number(dealer?.le_credit ?? dealer?.current_credit ?? 0);
    const slsaCredit = Number(dealer?.slsa_credit ?? 0);
    const totalTransactions = payments.length;

    return {
      dealer,
      payments,
      summary: {
        totalTransactions,
        leCredit,
        slsaCredit,
      },
    };
  } catch (err) {
    console.error('Failed to get dealer payments:', err);
    return {
      dealer: null,
      payments: [],
      summary: { totalTransactions: 0, leCredit: 0, slsaCredit: 0 },
    };
  }
}

/**
 * Fetch bills (orders) for a specific dealer ordered by last created_at first.
 * If filterNonZeroOnly is true (default), only returns bills where balance_amount != 0.
 */
export async function getDealerBills(
  dealerId: string,
  filterNonZeroOnly: boolean = true
): Promise<DealerBillItem[]> {
  if (!dealerId) return [];

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, firm, total_amount, balance_amount, created_at')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false });

    let bills: DealerBillItem[] = [];

    if (!error && data) {
      bills = data.map((o: any) => ({
        id: o.id,
        order_number: o.order_number || o.id,
        firm: o.firm || 'LE',
        total_amount: Number(o.total_amount ?? 0),
        balance_amount: Number(o.balance_amount ?? 0),
        created_at: o.created_at || new Date().toISOString(),
      }));
    } else {
      console.warn('Notice fetching dealer bills from Supabase:', error?.message);
      // Local storage fallback
      if (typeof window !== 'undefined') {
        const orderStorageKeys = ['lakshmi_orders_data_v1', 'lakshmi_orders'];
        for (const storageKey of orderStorageKeys) {
          const storedStr = localStorage.getItem(storageKey);
          if (storedStr) {
            const storedOrders = JSON.parse(storedStr);
            const matched = storedOrders.filter((o: any) => o.dealer_id === dealerId);
            if (matched.length > 0) {
              bills = matched.map((o: any) => ({
                id: o.id,
                order_number: o.order_number || o.id,
                firm: o.firm || 'LE',
                total_amount: Number(o.total_amount ?? o.amount ?? 0),
                balance_amount: Number(o.balance_amount ?? 0),
                created_at: o.created_at || new Date().toISOString(),
              }));
              break;
            }
          }
        }
      }
    }

    // Sort by last created_at first
    bills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (filterNonZeroOnly) {
      bills = bills.filter((b) => Number(b.balance_amount ?? 0) !== 0);
    }

    return bills;
  } catch (err) {
    console.error('Failed to get dealer bills:', err);
    return [];
  }
}

/**
 * Record a payment transaction for a dealer:
 * 1. Supports selecting multiple bills and reducing each bill's balance_amount by its specified amount.
 * 2. Debits the reduced amounts from dealers.le_credit (if firm == LE) OR dealers.slsa_credit (if firm == SLSA).
 * 3. Any unallocated remaining transaction amount is debited from the chosen/default firm's credit.
 * 4. Inserts transaction records into the order_payments table.
 */
export async function addDealerTransaction(
  params: AddDealerTransactionParams
): Promise<AddDealerTransactionResult> {
  const {
    dealerId,
    paymentAmount,
    paymentType,
    selectedBills = [],
    selectedBillId,
    orderReduceAmount,
    firm = 'LE',
    notes,
  } = params;

  const numPaymentAmount = Number(paymentAmount) || 0;
  if (numPaymentAmount <= 0) {
    return {
      success: false,
      error: 'Please enter a valid payment amount greater than zero.',
    };
  }

  try {
    // 1. Fetch dealer details to verify existence
    const currentDealer = await getDealerById(dealerId);
    if (!currentDealer) {
      return {
        success: false,
        error: `Dealer with ID "${dealerId}" was not found.`,
      };
    }

    // Normalise bills list (support legacy single bill param if passed)
    const billsToProcess: SelectedBillReduction[] = [...selectedBills];
    if (billsToProcess.length === 0 && selectedBillId) {
      billsToProcess.push({
        billId: selectedBillId,
        firm: firm || 'LE',
        currentBalance: 0,
        reduceAmount: orderReduceAmount !== undefined ? Number(orderReduceAmount) : numPaymentAmount,
      });
    }

    // Calculate reductions by firm
    let totalLeReduction = 0;
    let totalSlsaReduction = 0;
    let totalAllocatedReduction = 0;

    for (const b of billsToProcess) {
      const red = Number(b.reduceAmount) || 0;
      if (red > 0) {
        totalAllocatedReduction += red;
        if (b.firm.toUpperCase() === 'SLSA') {
          totalSlsaReduction += red;
        } else {
          totalLeReduction += red;
        }
      }
    }

    // If total allocated reduction exceeds total payment amount, throw error
    if (totalAllocatedReduction > numPaymentAmount) {
      return {
        success: false,
        error: `Total reduction across bills (₹${totalAllocatedReduction.toFixed(2)}) cannot exceed the payment amount (₹${numPaymentAmount.toFixed(2)}).`,
      };
    }

    // Allocate any remaining payment to the default firm
    const remainingUnallocated = numPaymentAmount - totalAllocatedReduction;
    if (remainingUnallocated > 0) {
      if (firm.toUpperCase() === 'SLSA') {
        totalSlsaReduction += remainingUnallocated;
      } else {
        totalLeReduction += remainingUnallocated;
      }
    }

    // 2. Debit credits on Dealer:
    const currentLe = Number(currentDealer.le_credit ?? currentDealer.current_credit ?? 0);
    const currentSlsa = Number(currentDealer.slsa_credit ?? 0);
    const dealerUpdate: Partial<Dealer> = {};

    if (totalLeReduction > 0) {
      const newLe = currentLe - totalLeReduction;
      dealerUpdate.le_credit = newLe;
      dealerUpdate.current_credit = newLe;
    }
    if (totalSlsaReduction > 0) {
      const newSlsa = currentSlsa - totalSlsaReduction;
      dealerUpdate.slsa_credit = newSlsa;
    }

    const updatedDealer = await updateDealer(dealerId, dealerUpdate);

    // 3. Process each selected bill reduction
    const insertedPayments: DealerPaymentItem[] = [];

    for (const billItem of billsToProcess) {
      const reduceAmt = Number(billItem.reduceAmount) || 0;
      if (reduceAmt <= 0) continue;

      // Fetch fresh order details if balance is needed
      let orderBal = Number(billItem.currentBalance ?? 0);
      let orderNum = billItem.orderNumber || '';
      let orderFirm = billItem.firm || 'LE';

      const { data: oData } = await supabase
        .from('orders')
        .select('id, order_number, firm, balance_amount, total_amount')
        .eq('id', billItem.billId)
        .maybeSingle();

      if (oData) {
        if (oData.order_number) orderNum = oData.order_number;
        if (oData.firm) orderFirm = oData.firm;
        if (oData.balance_amount !== null && oData.balance_amount !== undefined) {
          orderBal = Number(oData.balance_amount);
        } else {
          orderBal = Number(oData.total_amount ?? 0);
        }
      }

      const newBal = orderBal - reduceAmt;

      // Update orders table in Supabase
      const { error: updateOrderErr } = await supabase
        .from('orders')
        .update({
          balance_amount: newBal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billItem.billId);

      if (updateOrderErr) {
        console.warn(`Notice updating order ${billItem.billId} balance_amount:`, updateOrderErr.message);
      }

      // Sync local storage for orders
      if (typeof window !== 'undefined') {
        try {
          const orderStorageKeys = ['lakshmi_orders_data_v1', 'lakshmi_orders'];
          for (const storageKey of orderStorageKeys) {
            const storedOrdersStr = localStorage.getItem(storageKey);
            if (storedOrdersStr) {
              const storedOrders: any[] = JSON.parse(storedOrdersStr);
              const oIdx = storedOrders.findIndex((o) => o.id === billItem.billId);
              if (oIdx !== -1) {
                storedOrders[oIdx].balance_amount = newBal;
                storedOrders[oIdx].updated_at = new Date().toISOString();
                localStorage.setItem(storageKey, JSON.stringify(storedOrders));
              }
            }
          }
        } catch (syncErr) {
          console.warn('Local storage orders sync notice:', syncErr);
        }
      }

      // Insert record into order_payments table for this bill
      const paymentRecord = {
        bill_id: billItem.billId,
        dealer_id: dealerId,
        amount: reduceAmt,
        calculation_type: 'deduct' as CalculationType,
        remaining_amount: newBal,
        payment_type: paymentType,
        notes: notes && notes.trim()
          ? `${notes.trim()} (Bill #${orderNum || billItem.billId})`
          : `Payment deducted for Bill #${orderNum || billItem.billId}`,
        created_at: new Date().toISOString(),
      };

      const { data: insertedData, error: insertErr } = await supabase
        .from('order_payments')
        .insert([paymentRecord])
        .select(`
          *,
          order:orders(id, order_number, firm)
        `)
        .single();

      if (!insertErr && insertedData) {
        insertedPayments.push({
          id: insertedData.id,
          bill_id: insertedData.bill_id,
          dealer_id: insertedData.dealer_id,
          amount: Number(insertedData.amount) || 0,
          calculation_type: insertedData.calculation_type,
          remaining_amount: Number(insertedData.remaining_amount) || 0,
          payment_type: insertedData.payment_type,
          notes: insertedData.notes,
          created_at: insertedData.created_at,
          updated_at: insertedData.updated_at,
          firm: orderFirm,
          order: insertedData.order || { id: billItem.billId, order_number: orderNum, firm: orderFirm },
        });
      } else {
        insertedPayments.push({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...paymentRecord,
          firm: orderFirm,
          order: { id: billItem.billId, order_number: orderNum, firm: orderFirm },
        });
      }
    }

    // 4. If there is unallocated remaining amount, create an unallocated payment entry
    if (remainingUnallocated > 0 || billsToProcess.length === 0) {
      const unallocatedAmount = billsToProcess.length === 0 ? numPaymentAmount : remainingUnallocated;
      const unallocatedRecord = {
        bill_id: null,
        dealer_id: dealerId,
        amount: unallocatedAmount,
        calculation_type: 'deduct' as CalculationType,
        remaining_amount: 0,
        payment_type: paymentType,
        notes: notes && notes.trim()
          ? notes.trim()
          : billsToProcess.length > 0
          ? `Unallocated payment balance from transaction`
          : `Dealer payment transaction`,
        created_at: new Date().toISOString(),
      };

      const { data: unallocatedData, error: unallocatedErr } = await supabase
        .from('order_payments')
        .insert([unallocatedRecord])
        .select('*')
        .single();

      if (!unallocatedErr && unallocatedData) {
        insertedPayments.push({
          id: unallocatedData.id,
          bill_id: null,
          dealer_id: unallocatedData.dealer_id,
          amount: Number(unallocatedData.amount) || 0,
          calculation_type: unallocatedData.calculation_type,
          remaining_amount: 0,
          payment_type: unallocatedData.payment_type,
          notes: unallocatedData.notes,
          created_at: unallocatedData.created_at,
          updated_at: unallocatedData.updated_at,
          firm: firm || 'LE',
          order: null,
        });
      } else {
        insertedPayments.push({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...unallocatedRecord,
          firm: firm || 'LE',
          order: null,
        });
      }
    }

    // 5. Sync local storage for order_payments
    if (typeof window !== 'undefined' && insertedPayments.length > 0) {
      try {
        const storedPaymentsStr = localStorage.getItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY);
        const storedPayments: any[] = storedPaymentsStr ? JSON.parse(storedPaymentsStr) : [];
        storedPayments.unshift(...insertedPayments);
        localStorage.setItem(LOCAL_STORAGE_ORDER_PAYMENTS_KEY, JSON.stringify(storedPayments));
      } catch (storageErr) {
        console.warn('Local storage payments sync notice:', storageErr);
      }
    }

    return {
      success: true,
      payments: insertedPayments,
      payment: insertedPayments[0] || undefined,
      updatedDealer: updatedDealer || currentDealer,
    };
  } catch (err: unknown) {
    const e = err as Error;
    console.error('Failed to add dealer transaction:', e);
    return {
      success: false,
      error: e.message || 'Failed to process dealer transaction.',
    };
  }
}
