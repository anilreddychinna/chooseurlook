import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import {
  Category,
  HomeData,
  Listing,
  PAGE_SIZE,
  ProductCard,
  ProductDetail,
  ProductPayload,
  Review,
  Variant,
} from './models';
import { SupabaseService } from './supabase.service';

const CARD_SELECT = `
  id, name, slug, price, compare_at_price, category_id, created_at,
  categories (name, slug),
  product_images (storage_path, alt_text, sort_order)
`;

const DETAIL_SELECT = `
  id, name, slug, description, price, compare_at_price, status, seo_title, seo_description, category_id,
  categories (id, name, slug),
  product_images (storage_path, alt_text, sort_order),
  product_variants (id, sku, size, color, price_override, is_active, inventory (available_quantity))
`;

interface ImageRow {
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
}

interface CategoryJoin {
  id?: string;
  name: string;
  slug: string;
}

interface VariantRow {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price_override: number | null;
  is_active: boolean;
  inventory: { available_quantity: number } | { available_quantity: number }[] | null;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compare_at_price: number | null;
  status?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  category_id: string | null;
  categories: CategoryJoin | CategoryJoin[] | null;
  product_images: ImageRow[] | null;
  product_variants?: VariantRow[] | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly supabase = inject(SupabaseService);
  private readonly transfer = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  home(): Promise<HomeData> {
    return this.cached('home', async () => {
      if (!this.supabase.client) {
        return { categories: [], featured: [], error: null };
      }
      try {
        const [categories, featured] = await Promise.all([
          this.fetchCategories(true),
          this.fetchCards((query) => query.order('created_at', { ascending: false }).limit(8)),
        ]);
        return { categories, featured, error: null };
      } catch (error) {
        return { categories: [], featured: [], error: message(error) };
      }
    });
  }

  list(filters: {
    q: string;
    category: string;
    sort: string;
    min: string | null;
    max: string | null;
    page: number;
  }): Promise<Listing> {
    const page = Number.isFinite(filters.page) && filters.page > 0 ? filters.page : 1;
    const key = `list:${filters.category}:${filters.q}:${filters.sort}:${filters.min}:${filters.max}:${page}`;
    return this.cached(key, async () => {
      const empty: Listing = {
        items: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
        category: null,
        categories: [],
        error: null,
      };
      if (!this.supabase.client) return empty;
      try {
        const categories = await this.fetchCategories(true);
        const category = categories.find((item) => item.slug === filters.category) ?? null;
        let query = this.supabase.client
          .from('products')
          .select(CARD_SELECT, { count: 'exact' })
          .eq('status', 'published');

        if (category) query = query.eq('category_id', category.id);
        if (filters.q.trim()) {
          query = query.textSearch('search_vector', filters.q.trim(), { type: 'websearch', config: 'english' });
        }
        const min = Number(filters.min);
        const max = Number(filters.max);
        if (filters.min && Number.isFinite(min)) query = query.gte('price', min);
        if (filters.max && Number.isFinite(max)) query = query.lte('price', max);

        switch (filters.sort) {
          case 'price_asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('price', { ascending: false });
            break;
          case 'name':
            query = query.order('name', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        const from = (page - 1) * PAGE_SIZE;
        const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const items = await this.withRatings(((data ?? []) as ProductRow[]).map((row) => this.toCard(row)));
        return {
          items,
          total: count ?? 0,
          page,
          pageSize: PAGE_SIZE,
          category,
          categories,
          error: null,
        };
      } catch (error) {
        return { ...empty, error: message(error) };
      }
    });
  }

  productPage(slug: string): Promise<ProductPayload> {
    return this.cached(`product:${slug}`, async () => {
      if (!this.supabase.client) return { product: null, related: [], reviews: null, error: null };
      try {
        const { data, error } = await this.supabase.client
          .from('products')
          .select(DETAIL_SELECT)
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle();
        if (error) throw error;
        if (!data) return { product: null, related: [], reviews: null, error: null };
        const product = this.toDetail(data as ProductRow);
        const [related, reviews] = await Promise.all([
          product.categoryId
            ? this.fetchCards((query) =>
                query.eq('category_id', product.categoryId!).neq('id', product.id).limit(4),
              )
            : Promise.resolve([]),
          this.fetchReviews(product.id),
        ]);
        if (reviews) {
          product.reviewCount = reviews.length;
          product.ratingAverage = reviews.length
            ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
            : 0;
        }
        return { product, related, reviews, error: null };
      } catch (error) {
        return { product: null, related: [], reviews: null, error: message(error) };
      }
    });
  }

  private async fetchCategories(activeOnly: boolean): Promise<Category[]> {
    const client = this.supabase.client;
    if (!client) return [];
    let query = client
      .from('categories')
      .select('id, name, slug, description, image_url, is_active, sort_order')
      .order('sort_order');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string) ?? '',
      imageUrl: this.supabase.imageUrl(row.image_url as string | null),
      isActive: row.is_active as boolean,
      sortOrder: row.sort_order as number,
    }));
  }

  private async fetchCards(refine: (query: ListQuery) => ListQuery): Promise<ProductCard[]> {
    const client = this.supabase.client;
    if (!client) return [];
    const base = client.from('products').select(CARD_SELECT).eq('status', 'published');
    const { data, error } = await refine(base as unknown as ListQuery);
    if (error) throw error;
    return this.withRatings(((data ?? []) as ProductRow[]).map((row) => this.toCard(row)));
  }

  private async withRatings(cards: ProductCard[]): Promise<ProductCard[]> {
    const ratings = await this.loadRatings(cards.map((card) => card.id));
    if (!ratings) return cards.map((card) => ({ ...card, ratingAverage: 0, reviewCount: 0 }));
    return cards.map((card) => {
      const rating = ratings.get(card.id);
      return { ...card, ratingAverage: rating?.average ?? 0, reviewCount: rating?.count ?? 0 };
    });
  }

  private async loadRatings(ids: string[]): Promise<Map<string, { average: number; count: number }> | null> {
    const client = this.supabase.client;
    if (!client || !ids.length) return new Map();
    const { data, error } = await client
      .from('product_ratings')
      .select('product_id, average_rating, review_count')
      .in('product_id', ids);
    if (error) return null;
    const ratings = new Map<string, { average: number; count: number }>();
    for (const row of data ?? []) {
      ratings.set(String(row.product_id), {
        average: Number(row.average_rating),
        count: Number(row.review_count),
      });
    }
    return ratings;
  }

  async fetchReviews(productId: string): Promise<Review[] | null> {
    const client = this.supabase.client;
    if (!client) return [];
    const { data, error } = await client
      .from('reviews')
      .select('id, product_id, user_id, author_name, rating, body, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      userId: String(row.user_id),
      authorName: String(row.author_name || 'Customer'),
      rating: Number(row.rating),
      body: String(row.body),
      createdAt: String(row.created_at),
    }));
  }

  private toCard(row: ProductRow): ProductCard {
    const category = one(row.categories);
    const image = sortedImages(row.product_images)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
      imageUrl: this.supabase.imageUrl(image?.storage_path),
      alt: image?.alt_text || row.name,
      categoryName: category?.name ?? '',
      categorySlug: category?.slug ?? '',
    };
  }

  private toDetail(row: ProductRow): ProductDetail {
    const category = one(row.categories);
    const images = sortedImages(row.product_images).map((image) => ({
      path: image.storage_path,
      alt: image.alt_text || row.name,
      url: this.supabase.imageUrl(image.storage_path) ?? '',
    }));
    const variants: Variant[] = (row.product_variants ?? [])
      .filter((variant) => variant.is_active)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: Number(variant.price_override ?? row.price),
        available: Number(one(variant.inventory)?.available_quantity ?? 0),
        active: variant.is_active,
      }));
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      price: Number(row.price),
      compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
      status: row.status ?? 'published',
      seoTitle: row.seo_title ?? null,
      seoDescription: row.seo_description ?? null,
      categoryId: category?.id ?? row.category_id,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      images,
      variants,
      ratingAverage: 0,
      reviewCount: 0,
    };
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const stateKey = makeStateKey<T>(key);
    if (this.transfer.hasKey(stateKey)) {
      const value = this.transfer.get(stateKey, null as T);
      this.transfer.remove(stateKey);
      return value;
    }
    const value = await loader();
    if (isPlatformServer(this.platformId)) this.transfer.set(stateKey, value);
    return value;
  }
}

interface ListQuery extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  eq(column: string, value: string): ListQuery;
  neq(column: string, value: string): ListQuery;
  order(column: string, options?: { ascending: boolean }): ListQuery;
  limit(count: number): ListQuery;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sortedImages(images: ImageRow[] | null): ImageRow[] {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'The catalogue could not be loaded.';
}
