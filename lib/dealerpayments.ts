import { supabase } from './supabase';
import { getDealerById, Dealer } from './dealersStore';

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
