import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';

const STORAGE_KEY = 'cul-wishlist-v1';

export interface WishItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  alt: string;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly items = signal<WishItem[]>([]);
  readonly count = computed(() => this.items().length);

  constructor() {
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) this.items.set(this.read());
    });
  }

  has(id: string): boolean {
    return this.items().some((item) => item.id === id);
  }

  toggle(item: WishItem): boolean {
    const next = this.has(item.id)
      ? this.items().filter((row) => row.id !== item.id)
      : [item, ...this.items()];
    this.items.set(next);
    this.write(next);
    return this.has(item.id);
  }

  private read(): WishItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as WishItem[]) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item.slug) : [];
    } catch {
      return [];
    }
  }

  private write(items: WishItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
