import { Injectable, inject } from '@angular/core';
import { Address, StoreOrder } from './models';
import { SupabaseService } from './supabase.service';

const ORDER_SELECT = `
  id, public_order_number, status, payment_method, subtotal, discount, shipping_fee, tax, total,
  currency, coupon_code, shipping_address, created_at,
  order_items (id, name, sku, size, color, unit_price, quantity, image_url),
  payments (status, provider, provider_payment_id),
  shipments (id, provider, awb, tracking_url, label_url, status)
`;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly supabase = inject(SupabaseService);

  async addresses(): Promise<Address[]> {
    const { data, error } = await this.client()
      .from('addresses')
      .select('id, recipient, phone, line1, line2, city, state, postal_code, country, is_default')
      .order('is_default', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Address[];
  }

  async saveAddress(input: Omit<Address, 'id' | 'is_default'> & { id?: string; is_default?: boolean }, userId: string): Promise<string> {
    const client = this.client();
    if (input.is_default) {
      await client.from('addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const payload = {
      recipient: input.recipient,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country || 'IN',
      is_default: Boolean(input.is_default),
      user_id: userId,
    };
    if (input.id) {
      const { error } = await client.from('addresses').update(payload).eq('id', input.id);
      if (error) throw error;
      return input.id;
    }
    const { data, error } = await client.from('addresses').insert(payload).select('id').single();
    if (error) throw error;
    return data.id as string;
  }

  async deleteAddress(id: string): Promise<void> {
    const { error } = await this.client().from('addresses').delete().eq('id', id);
    if (error) throw error;
  }

  async orders(): Promise<StoreOrder[]> {
    const { data, error } = await this.client()
      .from('orders')
      .select('id, public_order_number, status, payment_method, total, currency, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as StoreOrder[];
  }

  async order(id: string): Promise<StoreOrder | null> {
    const { data, error } = await this.client().from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as StoreOrder | null) ?? null;
  }

  async cancel(id: string): Promise<void> {
    const { error } = await this.client().rpc('cancel_my_order', { p_order_id: id });
    if (error) throw error;
  }

  private client() {
    if (!this.supabase.client) throw new Error('Supabase is not configured');
    return this.supabase.client;
  }
}
