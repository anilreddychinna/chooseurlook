import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { CartService } from '../core/cart.service';
import { ProductPayload, Variant, errorMessage } from '../core/models';
import { WishItem } from '../core/wishlist.service';
import { SeoService } from '../core/seo.service';
import { ToastService } from '../core/toast.service';
import { InrPipe } from '../shared/inr.pipe';
import { PieceActionsComponent } from '../shared/piece-actions.component';
import { ProductCardComponent } from '../shared/product-card.component';
import { ReviewsComponent } from '../shared/reviews.component';
import { StarsComponent } from '../shared/stars.component';

@Component({
  selector: 'app-product',
  imports: [RouterLink, InrPipe, PieceActionsComponent, ProductCardComponent, ReviewsComponent, StarsComponent],
  templateUrl: './product.component.html',
})
export class ProductComponent implements OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private seenSlug = '';

  readonly payload = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['product'] as ProductPayload | undefined)),
  );
  readonly picked = signal('');
  readonly imageIndex = signal(0);
  readonly quantity = signal(1);
  readonly error = signal('');
  readonly reviewSummary = signal<{ average: number; count: number } | null>(null);

  readonly product = computed(() => this.payload()?.product ?? null);
  readonly wish = computed((): WishItem | null => {
    const item = this.product();
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      imageUrl: item.images[0]?.url ?? null,
      alt: item.images[0]?.alt || item.name,
    };
  });
  readonly colors = computed(() => unique(this.product()?.variants.map((variant) => variant.color) ?? []));
  readonly selected = computed(() => this.product()?.variants.find((variant) => variant.id === this.picked()) ?? null);
  readonly sizes = computed(() => {
    const color = this.selected()?.color ?? null;
    const variants = this.product()?.variants ?? [];
    const matching = variants.filter((variant) => variant.color === color);
    return unique(matching.map((variant) => variant.size));
  });
  readonly showSizes = computed(() => this.sizes().some((size) => Boolean(size)));

  constructor() {
    effect(() => {
      const product = this.product();
      if (!product || product.slug === this.seenSlug) return;
      this.seenSlug = product.slug;
      const variant = product.variants.find((item) => item.available > 0) ?? product.variants[0];
      this.picked.set(variant?.id ?? '');
      this.imageIndex.set(0);
      this.quantity.set(1);
      const image = product.images[0]?.url;
      this.seo.set({
        title: product.seoTitle || `${product.name} · ChooseUrLook`,
        description: product.seoDescription || product.description.slice(0, 160),
        path: `/p/${product.slug}`,
        image,
      });
      const price = variant?.price ?? product.price;
      this.seo.jsonLd('product-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map((item) => item.url),
        sku: variant?.sku,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price,
          availability: (variant?.available ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `/p/${product.slug}`,
        },
      });
      this.seo.jsonLd('crumb-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Shop', item: '/shop' },
          ...(product.categoryName ? [{ '@type': 'ListItem', position: 2, name: product.categoryName, item: `/c/${product.categorySlug}` }] : []),
          { '@type': 'ListItem', position: product.categoryName ? 3 : 2, name: product.name },
        ],
      });
    });
  }

  ngOnDestroy(): void {
    this.seo.clearJsonLd('product-jsonld');
    this.seo.clearJsonLd('crumb-jsonld');
  }

  showImage(index: number): void {
    if (index === this.imageIndex()) return;
    this.imageIndex.set(index);
    if (!isPlatformBrowser(this.platformId) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    void import('gsap').then(({ default: gsap }) => {
      const frame = document.querySelector('.model-stage img');
      if (!frame) return;
      gsap.fromTo(frame, { autoAlpha: 0.35, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power2.out' });
    });
  }

  chooseColor(color: string | null): void {
    const variant = this.product()?.variants.find((item) => item.color === color && item.available > 0)
      ?? this.product()?.variants.find((item) => item.color === color);
    if (variant) this.picked.set(variant.id);
  }

  chooseSize(size: string | null): void {
    const color = this.selected()?.color ?? null;
    const variant = this.product()?.variants.find((item) => item.color === color && item.size === size);
    if (variant) this.picked.set(variant.id);
  }

  async add(): Promise<void> {
    const product = this.product();
    const variant = this.selected();
    if (!product || !variant) return;
    this.error.set('');
    try {
      await this.cart.add({
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        unitPrice: variant.price,
        compareAtPrice: product.compareAtPrice,
        quantity: this.quantity(),
        imageUrl: product.images[0]?.url ?? null,
        available: variant.available,
      });
      this.toast.show('Added to your bag');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

function unique(values: (string | null)[]): (string | null)[] {
  return [...new Set(values)];
}

export type { Variant };
