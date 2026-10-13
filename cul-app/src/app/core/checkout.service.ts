import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PublicCoupon, errorMessage } from './models';
import { SupabaseService } from './supabase.service';

export interface PaymentSession {
  key_id: string;
  provider_order_id: string;
  amount: number;
  currency: string;
  order_id: string;
  order_number: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async coupons(): Promise<PublicCoupon[]> {
    const client = this.supabase.client;
    if (!client) return [];
    const { data, error } = await client
      .from('coupon_public')
      .select('code, discount_type, discount_value, min_subtotal');
    if (error) return [];
    return (data ?? []) as PublicCoupon[];
  }

  async quote(postalCode: string, subtotal: number): Promise<{ fee: number | null; message: string; serviceable: boolean }> {
    const client = this.supabase.client;
    if (!client) return { fee: null, message: 'Supabase is not configured', serviceable: false };
    const { data, error } = await client.functions.invoke('shipping-quote', {
      body: { postal_code: postalCode, subtotal },
    });
    if (error) {
      const pin = /^[1-9][0-9]{5}$/.test(postalCode);
      return { fee: null, message: pin ? 'Shipping quote is unavailable. Checkout still uses the store rate.' : 'Enter a 6-digit PIN code', serviceable: pin };
    }
    return {
      fee: data.fee == null ? null : Number(data.fee),
      message: data.message ?? '',
      serviceable: Boolean(data.serviceable),
    };
  }

  async placeCod(addressId: string, couponCode: string | null): Promise<string> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('create_checkout_order', {
      p_address_id: addressId,
      p_payment_method: 'cod',
      p_coupon_code: couponCode,
    });
    if (error) throw error;
    const orderId = (data as { order_id: string }).order_id;
    await this.notify(orderId, 'order_confirmation');
    return orderId;
  }

  async pay(body: { address_id?: string; coupon_code?: string | null; order_id?: string }): Promise<string> {
    const client = this.requireClient();
    const { data, error } = await client.functions.invoke('create-payment', { body });
    if (error) throw new Error(await functionError(error));
    const session = data as PaymentSession;
    await this.openRazorpay(session);
    return session.order_id;
  }

  private async openRazorpay(session: PaymentSession): Promise<void> {
    await loadRazorpay();
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error('Razorpay checkout did not load');
    await new Promise<void>((resolve, reject) => {
      const checkout = new Razorpay({
        key: session.key_id,
        amount: session.amount,
        currency: session.currency,
        name: 'ChooseUrLook',
        description: session.order_number,
        order_id: session.provider_order_id,
        prefill: {
          email: this.auth.user()?.email ?? '',
          name: this.auth.profile()?.display_name ?? '',
        },
        theme: { color: '#1b1612' },
        handler: (response: RazorpayResponse) => {
          void this.verify(session.order_id, response).then(resolve).catch(reject);
        },
        modal: { ondismiss: () => resolve() },
      });
      checkout.open();
    });
  }

  private async verify(orderId: string, response: RazorpayResponse): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.functions.invoke('verify-payment', {
      body: { ...response, order_id: orderId },
    });
    if (error) throw new Error(await functionError(error));
  }

  private async notify(orderId: string, template: string): Promise<void> {
    const email = this.auth.user()?.email;
    const client = this.supabase.client;
    if (!email || !client) return;
    await client.functions.invoke('send-order-email', {
      body: { order_id: orderId, template, recipient: email },
    });
  }

  private requireClient() {
    if (!this.supabase.client) throw new Error('Add your Supabase URL and anon key before checkout.');
    return this.supabase.client;
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(script);
  });
}

async function functionError(error: unknown): Promise<string> {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: { json?: () => Promise<{ error?: string }> } }).context
    : undefined;
  try {
    const body = await context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // The function body was not JSON.
  }
  return errorMessage(error);
}
