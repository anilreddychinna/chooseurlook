import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { WishItem, WishlistService } from '../core/wishlist.service';

@Component({
  selector: 'app-piece-actions',
  template: `
    <div class="piece-actions" [class.inline]="inline()">
      <button type="button" (click)="share($event)" [attr.aria-label]="'Share ' + product().name">
        <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13.5V4.8"></path><path d="m8.2 8.2 3.8-3.8 3.8 3.8"></path><path d="M7 10.5H5.8A1.8 1.8 0 0 0 4 12.3v6.4A1.8 1.8 0 0 0 5.8 20.5h12.4a1.8 1.8 0 0 0 1.8-1.8v-6.4a1.8 1.8 0 0 0-1.8-1.8H17"></path></svg>
      </button>
      <button type="button" (click)="toggle($event)" [attr.aria-pressed]="saved()" [attr.aria-label]="saved() ? 'Remove from wishlist' : 'Add to wishlist'">
        <svg class="glyph" viewBox="0 0 24 24" aria-hidden="true" [class.filled]="saved()"><path d="M12 19.4s-6.4-4-6.4-8.2A3.5 3.5 0 0 1 12 8.3a3.5 3.5 0 0 1 6.4 2.9c0 4.2-6.4 8.2-6.4 8.2z"></path></svg>
      </button>
    </div>
  `,
})
export class PieceActionsComponent {
  private readonly wishlist = inject(WishlistService);
  private readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly product = input.required<WishItem>();
  readonly inline = input(false);
  readonly saved = computed(() => this.wishlist.has(this.product().id));

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const saved = this.wishlist.toggle(this.product());
    this.toast.show(saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
  }

  async share(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    const url = new URL(`/p/${this.product().slug}`, location.origin).toString();
    const title = `${this.product().name} · ChooseUrLook`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast.show('Link copied');
    } catch {
      this.toast.show(url);
    }
  }
}
