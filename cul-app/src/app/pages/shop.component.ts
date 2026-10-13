import { Component, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Listing } from '../core/models';
import { SeoService } from '../core/seo.service';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-shop',
  imports: [FormsModule, RouterLink, ProductCardComponent],
  templateUrl: './shop.component.html',
})
export class ShopComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly listing = toSignal(this.route.data.pipe(map((data) => data['listing'] as Listing | undefined)));

  q = '';
  sort = 'newest';
  min = '';
  max = '';

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.q = params.get('q') ?? '';
      this.sort = params.get('sort') ?? 'newest';
      this.min = this.digits(params.get('min') ?? '');
      this.max = this.digits(params.get('max') ?? '');
      const name = this.listing()?.category?.name;
      this.seo.set({
        title: name ? `${name} · ChooseUrLook` : 'Shop · ChooseUrLook',
        description: name
          ? `Shop ${name} at ChooseUrLook.`
          : 'Shop cycling sunglasses, running sunglasses, accessories and ladies looks at ChooseUrLook.',
        path: this.router.url.split('?')[0] || '/shop',
      });
    });
  }

  digits(value: string): string {
    return String(value ?? '').replace(/\D/g, '');
  }

  digitsOnly(event: Event): string {
    const input = event.target as HTMLInputElement;
    const next = this.digits(input.value);
    if (input.value !== next) input.value = next;
    return next;
  }

  apply(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q || null,
        sort: this.sort === 'newest' ? null : this.sort,
        min: this.min || null,
        max: this.max || null,
        page: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  pageLink(page: number): number {
    return page;
  }

  pages(listing: Listing): number[] {
    const count = Math.max(1, Math.ceil(listing.total / listing.pageSize));
    return Array.from({ length: count }, (_, index) => index + 1);
  }
}
