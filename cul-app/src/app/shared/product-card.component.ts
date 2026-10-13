import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../core/models';
import { WishItem } from '../core/wishlist.service';
import { InrPipe } from './inr.pipe';
import { PieceActionsComponent } from './piece-actions.component';
import { StarsComponent } from './stars.component';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, InrPipe, PieceActionsComponent, StarsComponent],
  template: `
    <article class="product-card">
      <div class="media-wrap">
        <a class="media" [routerLink]="['/p', product().slug]">
          @if (product().imageUrl) {
            <img [src]="product().imageUrl" [alt]="product().alt" />
          } @else {
            <span class="placeholder-image"></span>
          }
        </a>
        <app-piece-actions [product]="wish()" />
      </div>
      <a class="card-copy" [routerLink]="['/p', product().slug]">
        @if (product().categoryName) { <span class="card-kicker">{{ product().categoryName }}</span> }
        <h3>{{ product().name }}</h3>
        <span class="price">
          {{ product().price | inr }}
          @if (product().compareAtPrice) { <s>{{ product().compareAtPrice | inr }}</s> }
        </span>
        @if (product().reviewCount != null) {
          <app-stars [average]="product().ratingAverage ?? 0" [count]="product().reviewCount ?? 0" />
        }
      </a>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductCard>();

  wish(): WishItem {
    const item = this.product();
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      imageUrl: item.imageUrl,
      alt: item.alt || item.name,
    };
  }
}
