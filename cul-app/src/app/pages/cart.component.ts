import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { CheckoutService } from '../core/checkout.service';
import { CartLine, FREE_SHIPPING_AT, PublicCoupon, errorMessage, shippingFee } from '../core/models';
import { InrPipe } from '../shared/inr.pipe';

interface BagOffer {
  code: string;
  detail: string;
  shortfall: number;
  ready: boolean;
}

@Component({
  selector: 'app-cart',
  imports: [RouterLink, InrPipe],
  templateUrl: './cart.component.html',
})
export class CartComponent implements OnDestroy {
  readonly cart = inject(CartService);
  private readonly checkout = inject(CheckoutService);
  private readonly platformId = inject(PLATFORM_ID);
  private proceedTween: { kill: () => void } | null = null;
  private nudged = false;
  readonly error = signal('');
  readonly pin = signal('');
  readonly quote = signal('');
  readonly quoting = signal(false);
  readonly summaryOpen = signal(true);
  readonly coupons = signal<PublicCoupon[]>([]);
  readonly qtys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  readonly mrp = computed(() => this.cart.items().reduce((sum, line) => sum + this.lineMrp(line), 0));
  readonly saved = computed(() => Math.max(0, this.mrp() - this.cart.subtotal()));
  readonly shipping = computed(() => shippingFee(this.cart.subtotal()));
  readonly payable = computed(() => this.cart.subtotal() + this.shipping());
  readonly shipGap = computed(() => Math.max(0, FREE_SHIPPING_AT - this.cart.subtotal()));
  readonly offer = computed(() => this.pickOffer(this.coupons(), this.cart.subtotal()));

  constructor() {
    void this.checkout.coupons().then((rows) => this.coupons.set(rows));
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || this.nudged || this.cart.count() === 0) return;
      this.nudged = true;
      queueMicrotask(() => void this.nudgeProceed());
    });
  }

  ngOnDestroy(): void {
    this.proceedTween?.kill();
  }

  lineMrp(line: CartLine): number {
    const compare = line.compareAtPrice;
    const each = compare != null && compare > line.unitPrice ? compare : line.unitPrice;
    return each * line.quantity;
  }

  lineSaved(line: CartLine): number {
    return Math.max(0, this.lineMrp(line) - line.unitPrice * line.quantity);
  }

  async update(variantId: string, value: string): Promise<void> {
    this.error.set('');
    try {
      await this.cart.setQuantity(variantId, Number(value));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async remove(variantId: string): Promise<void> {
    this.error.set('');
    try {
      await this.cart.remove(variantId);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async checkPin(event: Event): Promise<void> {
    event.preventDefault();
    const pin = this.pin().trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      this.quote.set('Enter a 6-digit PIN code');
      return;
    }
    this.quoting.set(true);
    try {
      const result = await this.checkout.quote(pin, this.cart.subtotal());
      this.quote.set(result.message || (result.serviceable ? 'This PIN code can be used at checkout.' : 'Enter a 6-digit PIN code'));
    } finally {
      this.quoting.set(false);
    }
  }

  private async nudgeProceed(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { default: gsap } = await import('gsap');
    const buttons = gsap.utils.toArray<HTMLElement>('.proceed').filter((node) => node.getClientRects().length > 0);
    if (!buttons.length) return;
    this.proceedTween = gsap.timeline({ repeat: -1, repeatDelay: 1.8 })
      .fromTo(
        buttons,
        { autoAlpha: 0.45, boxShadow: '0 0 0 0 rgba(243, 200, 75, 0.7)' },
        { autoAlpha: 1, boxShadow: '0 0 0 14px rgba(243, 200, 75, 0)', duration: 0.65, ease: 'power2.out' },
      )
      .to(buttons, { x: -5, duration: 0.07, ease: 'power1.inOut' })
      .to(buttons, { x: 5, duration: 0.07, yoyo: true, repeat: 3, ease: 'power1.inOut' })
      .to(buttons, { x: 0, duration: 0.08 });
  }

  showDetails(): void {
    this.summaryOpen.set(true);
    document.getElementById('price-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private pickOffer(coupons: PublicCoupon[], subtotal: number): BagOffer | null {
    const deals = coupons.filter((coupon) => coupon.discount_type === 'percent' || coupon.discount_type === 'fixed');
    if (!deals.length) return null;
    const ranked = [...deals].sort((a, b) => Number(b.discount_value) - Number(a.discount_value));
    const coupon = ranked.find((item) => subtotal >= Number(item.min_subtotal))
      ?? ranked.find((item) => subtotal < Number(item.min_subtotal))
      ?? ranked[0];
    const min = Number(coupon.min_subtotal);
    const value = Number(coupon.discount_value);
    return {
      code: coupon.code,
      detail: coupon.discount_type === 'percent' ? `${value}% off` : `₹${value} off`,
      shortfall: Math.max(0, min - subtotal),
      ready: subtotal >= min,
    };
  }
}
