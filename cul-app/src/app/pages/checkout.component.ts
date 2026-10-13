import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../core/account.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { CheckoutService } from '../core/checkout.service';
import { Address, INDIAN_STATES, PublicCoupon, errorMessage, shippingFee } from '../core/models';
import { InrPipe } from '../shared/inr.pipe';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, InrPipe],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent {
  private readonly accounts = inject(AccountService);
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly states = INDIAN_STATES;

  readonly addresses = signal<Address[]>([]);
  readonly coupons = signal<PublicCoupon[]>([]);
  readonly addressId = signal('');
  readonly method = signal<'razorpay' | 'cod'>('razorpay');
  readonly coupon = signal('');
  readonly quote = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly adding = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    recipient: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postal_code: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],
    country: ['IN'],
  });

  constructor() {
    void this.load();
  }

  previewShipping(): number {
    const code = this.coupon().trim().toUpperCase();
    const match = this.coupons().find((coupon) => coupon.code.toUpperCase() === code);
    const subtotal = this.cart.subtotal();
    let discount = 0;
    if (match && subtotal >= Number(match.min_subtotal)) {
      if (match.discount_type === 'percent') discount = subtotal * Number(match.discount_value) / 100;
      if (match.discount_type === 'fixed') discount = Math.min(Number(match.discount_value), subtotal);
    }
    return shippingFee(subtotal - discount, match?.discount_type === 'free_shipping');
  }

  async checkPin(): Promise<void> {
    const pin = this.selectedPin();
    if (!pin) return;
    const result = await this.checkout.quote(pin, this.cart.subtotal());
    this.quote.set(result.message);
  }

  async place(): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      const addressId = await this.resolveAddress();
      const coupon = this.coupon().trim() || null;
      const orderId = this.method() === 'cod'
        ? await this.checkout.placeCod(addressId, coupon)
        : await this.checkout.pay({ address_id: addressId, coupon_code: coupon });
      await this.cart.refresh();
      await this.router.navigate(['/account/orders', orderId]);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    await this.auth.init();
    if (!this.auth.user()) return;
    try {
      const [addresses, coupons] = await Promise.all([this.accounts.addresses(), this.checkout.coupons()]);
      this.addresses.set(addresses);
      this.coupons.set(coupons);
      this.addressId.set(addresses.find((item) => item.is_default)?.id ?? addresses[0]?.id ?? '');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async resolveAddress(): Promise<string> {
    if (!this.adding() && this.addressId()) return this.addressId();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      throw new Error('Add a complete delivery address.');
    }
    const user = this.auth.user();
    if (!user) throw new Error('Sign in to check out.');
    const value = this.form.getRawValue();
    const id = await this.accounts.saveAddress({ ...value, is_default: this.addresses().length === 0 }, user.id);
    this.addresses.set(await this.accounts.addresses());
    this.addressId.set(id);
    this.adding.set(false);
    return id;
  }

  private selectedPin(): string {
    if (this.adding()) return this.form.controls.postal_code.value;
    return this.addresses().find((item) => item.id === this.addressId())?.postal_code ?? '';
  }
}
