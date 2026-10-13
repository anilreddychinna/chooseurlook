import { Injectable, inject } from '@angular/core';
import { Coupon, ProductInput, StoreOrder } from './models';
import { SupabaseService } from './supabase.service';

export interface Dashboard {
  products: number;
  orders: number;
  revenue: number;
  recent: StoreOrder[];
  lowStock: { sku: string; name: string; available: number }[];
}

export interface InventoryRow {
  variantId: string;
  sku: string;
  name: string;
  size: string | null;
  color: string | null;
  available: number;
  reserved: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  async dashboard(): Promise<Dashboard> {
    const client = this.client();
    const [products, orders, recent, inventory] = await Promise.all([
      client.from('products').select('id', { count: 'exact', head: true }),
      client.from('orders').select('total, status'),
      client.from('orders').select('id, public_order_number, status, total, currency, created_at, payment_method').order('created_at', { ascending: false }).limit(6),
      client.from('inventory').select('available_quantity, product_variants (sku, products (name))').lte('available_quantity', 3).limit(8),
    ]);
    if (products.error) throw products.error;
    if (orders.error) throw orders.error;
    if (recent.error) throw recent.error;
    const paid = (orders.data ?? []).filter((row) => !['cancelled', 'refunded', 'pending_payment'].includes(row.status as string));
    const lowStock = ((inventory.data ?? []) as unknown as LowStockJoin[]).map((row) => {
      const variant = first(row.product_variants);
      const product = variant ? first(variant.products) : null;
      return {
        sku: variant?.sku ?? '',
        name: product?.name ?? 'Product',
        available: Number(row.available_quantity),
      };
    });
    return {
      products: products.count ?? 0,
      orders: orders.data?.length ?? 0,
      revenue: paid.reduce((sum, row) => sum + Number(row.total), 0),
      recent: (recent.data ?? []) as StoreOrder[],
      lowStock,
    };
  }

  async products(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client()
      .from('products')
      .select('id, name, slug, price, status, categories (name)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async product(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.client().from('products').select(`
      id, category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description,
      product_images (storage_path, alt_text, sort_order),
      product_variants (id, sku, size, color, price_override, is_active, inventory (available_quantity))
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async saveProduct(input: ProductInput): Promise<string> {
    const client = this.client();
    const payload = {
      category_id: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      compare_at_price: input.compareAtPrice,
      status: input.status,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
    };
    let id = input.id;
    if (!id) {
      const { data, error } = await client.from('products').insert(payload).select('id').single();
      if (error) throw error;
      id = data.id as string;
    } else {
      const { error } = await client.from('products').update(payload).eq('id', id);
      if (error) throw error;
    }

    const { error: imageDeleteError } = await client.from('product_images').delete().eq('product_id', id);
    if (imageDeleteError) throw imageDeleteError;
    if (input.images.length) {
      const { error } = await client.from('product_images').insert(input.images.map((image, index) => ({
        product_id: id,
        storage_path: image.path,
        alt_text: image.alt || input.name,
        sort_order: index,
      })));
      if (error) throw error;
    }

    const { data: existing, error: existingError } = await client.from('product_variants').select('id').eq('product_id', id);
    if (existingError) throw existingError;
    const keep = new Set(input.variants.map((variant) => variant.id).filter(Boolean));
    const remove = (existing ?? []).map((row) => row.id as string).filter((variantId) => !keep.has(variantId));
    if (remove.length) {
      const { error } = await client.from('product_variants').delete().in('id', remove);
      if (error) throw error;
    }

    for (const variant of input.variants) {
      const variantPayload = {
        product_id: id,
        sku: variant.sku,
        size: variant.size || null,
        color: variant.color || null,
        price_override: variant.priceOverride,
        is_active: variant.active,
      };
      let variantId = variant.id;
      if (variantId) {
        const { error } = await client.from('product_variants').update(variantPayload).eq('id', variantId);
        if (error) throw error;
        const { error: stockError } = await client.from('inventory').upsert({
          variant_id: variantId,
          available_quantity: variant.stock,
        });
        if (stockError) throw stockError;
      } else {
        const { data, error } = await client.from('product_variants').insert(variantPayload).select('id').single();
        if (error) throw error;
        variantId = data.id as string;
        const { error: stockError } = await client.from('inventory').insert({
          variant_id: variantId,
          available_quantity: variant.stock,
        });
        if (stockError) throw stockError;
      }
    }
    return id;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.client().from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadImage(file: File): Promise<string> {
    const client = this.client();
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, '-')}`;
    const { error } = await client.storage.from('product-images').upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async categories(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.client().from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async saveCategory(input: {
    id?: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    isActive: boolean;
    sortOrder: number;
  }): Promise<void> {
    const payload = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      image_url: input.imageUrl || null,
      is_active: input.isActive,
      sort_order: input.sortOrder,
    };
    const query = input.id
      ? this.client().from('categories').update(payload).eq('id', input.id)
      : this.client().from('categories').insert(payload);
    const { error } = await query;
    if (error) throw error;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client().from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async orders(status = ''): Promise<StoreOrder[]> {
    let query = this.client()
      .from('orders')
      .select('id, public_order_number, status, payment_method, total, currency, created_at')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as StoreOrder[];
  }

  async order(id: string): Promise<StoreOrder | null> {
    const { data, error } = await this.client().from('orders').select(`
      id, public_order_number, status, payment_method, subtotal, discount, shipping_fee, tax, total,
      currency, coupon_code, shipping_address, created_at,
      order_items (id, name, sku, size, color, unit_price, quantity, image_url),
      payments (status, provider, provider_payment_id),
      shipments (id, provider, awb, tracking_url, label_url, status)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as StoreOrder | null;
  }

  async setStatus(id: string, status: string): Promise<void> {
    const { error } = await this.client().rpc('admin_set_order_status', { p_order_id: id, p_status: status });
    if (error) throw error;
  }

  async saveShipment(orderId: string, input: { provider: string; awb: string; trackingUrl: string; labelUrl: string; status: string }): Promise<void> {
    const { error } = await this.client().from('shipments').upsert({
      order_id: orderId,
      provider: input.provider || 'manual',
      awb: input.awb || null,
      tracking_url: input.trackingUrl || null,
      label_url: input.labelUrl || null,
      status: input.status || 'pending',
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'order_id,provider' });
    if (error) throw error;
  }

  async inventory(): Promise<InventoryRow[]> {
    const { data, error } = await this.client().from('inventory').select(`
      variant_id, available_quantity, reserved_quantity,
      product_variants (sku, size, color, products (name))
    `).order('available_quantity');
    if (error) throw error;
    return ((data ?? []) as unknown as InventoryJoin[]).map((row) => {
      const variant = first(row.product_variants);
      const product = variant ? first(variant.products) : null;
      return {
        variantId: row.variant_id,
        sku: variant?.sku ?? '',
        name: product?.name ?? '',
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        available: Number(row.available_quantity),
        reserved: Number(row.reserved_quantity),
      };
    });
  }

  async setStock(variantId: string, available: number): Promise<void> {
    const { error } = await this.client().from('inventory').update({
      available_quantity: available,
      updated_at: new Date().toISOString(),
    }).eq('variant_id', variantId);
    if (error) throw error;
  }

  async coupons(): Promise<Coupon[]> {
    const { data, error } = await this.client().from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Coupon[];
  }

  async saveCoupon(input: Omit<Coupon, 'id' | 'used_count'> & { id?: string }): Promise<void> {
    const payload = {
      code: input.code.toUpperCase(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      min_subtotal: input.min_subtotal,
      max_uses: input.max_uses,
      is_active: input.is_active,
    };
    const query = input.id
      ? this.client().from('coupons').update(payload).eq('id', input.id)
      : this.client().from('coupons').insert(payload);
    const { error } = await query;
    if (error) throw error;
  }

  async deleteCoupon(id: string): Promise<void> {
    const { error } = await this.client().from('coupons').delete().eq('id', id);
    if (error) throw error;
  }

  private client() {
    if (!this.supabase.client) throw new Error('Supabase is not configured');
    return this.supabase.client;
  }
}

interface LowStockJoin {
  available_quantity: number;
  product_variants: { sku: string; products: { name: string } | { name: string }[] | null } | null;
}

interface InventoryJoin {
  variant_id: string;
  available_quantity: number;
  reserved_quantity: number;
  product_variants: {
    sku: string;
    size: string | null;
    color: string | null;
    products: { name: string } | { name: string }[] | null;
  } | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
