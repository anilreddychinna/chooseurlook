import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { CartLine } from './models';
import { SupabaseService } from './supabase.service';

const STORAGE_KEY = 'cul-cart-v1';

interface RemoteItem {
  quantity: number;
  product_variants: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    price_override: number | null;
    inventory: { available_quantity: number } | { available_quantity: number }[] | null;
    products: {
      id: string;
      name: string;
      slug: string;
      price: number;
      compare_at_price: number | null;
      product_images: { storage_path: string; sort_order: number }[] | null;
    } | {
      id: string;
      name: string;
      slug: string;
      price: number;
      compare_at_price: number | null;
      product_images: { storage_path: string; sort_order: number }[] | null;
    }[] | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private loadingUser: string | null | undefined;

  readonly items = signal<CartLine[]>([]);
  readonly count = computed(() => this.items().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    effect(() => {
      const ready = this.auth.ready();
      const userId = this.auth.user()?.id ?? null;
      if (!ready) return;
      untracked(() => void this.load(userId));
    });
  }

  async add(line: CartLine): Promise<void> {
    await this.change(line.variantId, line.quantity, true, line);
  }

  async setQuantity(variantId: string, quantity: number): Promise<void> {
    await this.change(variantId, quantity, false);
  }

  async remove(variantId: string): Promise<void> {
    await this.setQuantity(variantId, 0);
  }

  async refresh(): Promise<void> {
    await this.load(this.auth.user()?.id ?? null);
  }

  private async change(variantId: string, quantity: number, add: boolean, snapshot?: CartLine): Promise<void> {
    const userId = this.auth.user()?.id;
    if (userId && this.supabase.client) {
      const cartId = await this.ensureCart();
      const client = this.supabase.client;
      const { data: existing, error } = await client
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('variant_id', variantId)
        .maybeSingle();
      if (error) throw error;
      const next = Math.min(10, add ? Number(existing?.quantity ?? 0) + quantity : quantity);
      if (existing && next <= 0) {
        const { error: deleteError } = await client.from('cart_items').delete().eq('id', existing.id);
        if (deleteError) throw deleteError;
      } else if (existing) {
        const { error: updateError } = await client.from('cart_items').update({ quantity: next }).eq('id', existing.id);
        if (updateError) throw updateError;
      } else if (next > 0) {
        const { error: insertError } = await client.from('cart_items').insert({
          cart_id: cartId,
          variant_id: variantId,
          quantity: next,
        });
        if (insertError) throw insertError;
      }
      this.items.set(await this.fetchRemote());
      return;
    }

    const items = this.readLocal();
    const index = items.findIndex((item) => item.variantId === variantId);
    const next = Math.min(10, add ? (items[index]?.quantity ?? 0) + quantity : quantity);
    if (next <= 0) {
      if (index >= 0) items.splice(index, 1);
    } else if (index >= 0) {
      items[index] = { ...items[index], quantity: next };
    } else if (snapshot) {
      items.push({ ...snapshot, quantity: next });
    }
    this.writeLocal(items);
    this.items.set(items);
  }

  private async load(userId: string | null): Promise<void> {
    if (this.loadingUser === userId) return;
    this.loadingUser = userId;
    try {
      if (!userId || !this.supabase.client) {
        this.items.set(this.readLocal());
        return;
      }
      const local = this.readLocal();
      if (local.length) {
        for (const line of local) {
          await this.change(line.variantId, line.quantity, true, line);
        }
        this.writeLocal([]);
      }
      this.items.set(await this.fetchRemote());
    } finally {
      this.loadingUser = undefined;
    }
  }

  private async ensureCart(): Promise<string> {
    const client = this.supabase.client;
    if (!client) throw new Error('Supabase is not configured');
    const { data, error } = await client.rpc('ensure_cart');
    if (error) throw error;
    return data as string;
  }

  private async fetchRemote(): Promise<CartLine[]> {
    const client = this.supabase.client;
    if (!client) return [];
    const { data, error } = await client.from('cart_items').select(`
      quantity,
      product_variants (
        id, sku, size, color, price_override,
        inventory (available_quantity),
        products (id, name, slug, price, compare_at_price, product_images (storage_path, sort_order))
      )
    `);
    if (error) throw error;
    return ((data ?? []) as unknown as RemoteItem[]).flatMap((row) => {
      const variant = row.product_variants;
      const product = variant ? first(variant.products) : null;
      if (!variant || !product) return [];
      const image = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
      const stock = first(variant.inventory);
      return [{
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        unitPrice: Number(variant.price_override ?? product.price),
        compareAtPrice: product.compare_at_price == null ? null : Number(product.compare_at_price),
        quantity: row.quantity,
        imageUrl: this.supabase.imageUrl(image?.storage_path),
        available: Number(stock?.available_quantity ?? 0),
      }];
    });
  }

  private readLocal(): CartLine[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }

  private writeLocal(items: CartLine[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
