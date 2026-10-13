import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../core/models';
import { WishlistService } from '../core/wishlist.service';
import { ProductCardComponent } from '../shared/product-card.component';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, ProductCardComponent],
  template: `
    <section class="page-intro">
      <p class="eyebrow">Saved</p>
      <h1>Wishlist</h1>
    </section>
    @if (wishlist.items().length) {
      <div class="product-grid section">
        @for (item of cards(); track item.id) {
          <app-product-card [product]="item" />
        }
      </div>
    } @else {
      <section class="empty-bag">
        <p>Nothing saved yet.</p>
        <p class="fine">Tap the heart on a piece to keep it here.</p>
        <a class="btn" routerLink="/shop">Start shopping</a>
      </section>
    }
  `,
})
export class WishlistComponent {
  readonly wishlist = inject(WishlistService);

  cards(): ProductCard[] {
    return this.wishlist.items().map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      compareAtPrice: null,
      imageUrl: item.imageUrl,
      alt: item.alt,
      categoryName: '',
      categorySlug: '',
    }));
  }
}
