import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AccountService } from '../core/account.service';
import { AuthService } from '../core/auth.service';
import { CheckoutService } from '../core/checkout.service';
import { Address, INDIAN_STATES, StoreOrder, errorMessage } from '../core/models';
import { InrPipe } from '../shared/inr.pipe';

@Component({
  selector: 'app-account-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="account">
      <aside>
        <nav>
          <a routerLink="/account" [queryParams]="{ edit: null }" [class.active]="overview()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7"></rect><rect x="13" y="4" width="7" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="13" width="7" height="7"></rect></svg>
            Overview
          </a>
          <a routerLink="/account/orders" routerLinkActive="active">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z"></path><path d="M9 7V5.5A3 3 0 0 1 12 2.5 3 3 0 0 1 15 5.5V7"></path></svg>
            My Orders
          </a>
          <a routerLink="/account/orders">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"></rect><path d="M3.5 10h17"></path></svg>
            My Payments
          </a>
          <a routerLink="/account/addresses" routerLinkActive="active">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"></path><circle cx="12" cy="11" r="2"></circle></svg>
            My Addresses
          </a>
          <a routerLink="/account" [queryParams]="{ edit: '1' }" [class.active]="profileEdit()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 19.5c1.2-3 3.6-4.5 7-4.5s5.8 1.5 7 4.5"></path></svg>
            My Profile
          </a>
        </nav>
        <button class="account-logout" type="button" (click)="signOut()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7V5H5v14h5v-2"></path><path d="M10 12h9M16 9l3 3-3 3"></path></svg>
          Logout
        </button>
      </aside>
      <div><router-outlet /></div>
    </section>
  `,
})
export class AccountShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly path = signal('');

  constructor() {
    void this.auth.init();
    const track = () => this.path.set(this.router.url);
    track();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => track());
  }

  overview(): boolean {
    const url = this.path();
    return url.split('?')[0] === '/account' && !url.includes('edit=1');
  }

  profileEdit(): boolean {
    return this.path().includes('edit=1');
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="phone-hub">
      <div class="profile-card">
        <span class="avatar" aria-hidden="true">{{ initial() }}</span>
        <div>
          <strong>{{ auth.profile()?.display_name || 'Your account' }}</strong>
          <p>{{ auth.user()?.email }}</p>
        </div>
        <button class="edit-link" type="button" (click)="toggleEdit()">{{ editing() ? 'Close' : 'Edit' }}</button>
      </div>

      <div class="hub-tiles">
        <a routerLink="/account/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h13v8H3zM16 10h3l2 3v2h-5z"></path><circle cx="7" cy="17.5" r="1.4"></circle><circle cx="17" cy="17.5" r="1.4"></circle></svg>
          Orders
        </a>
        <a routerLink="/account/addresses">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"></path><circle cx="12" cy="11" r="2"></circle></svg>
          Addresses
        </a>
        <a routerLink="/account/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"></rect><path d="M3.5 10h17"></path></svg>
          Payments
        </a>
      </div>

      <div class="hub-group">
        <a class="hub-row" routerLink="/account/addresses">
          <span><strong>My addresses</strong><small>Manage your addresses here</small></span>
          <span aria-hidden="true">›</span>
        </a>
      </div>

      <p class="hub-label">Help</p>
      <div class="hub-group">
        <a class="hub-row" routerLink="/shipping"><span>Shipping</span><span aria-hidden="true">›</span></a>
        <a class="hub-row" routerLink="/returns"><span>Returns</span><span aria-hidden="true">›</span></a>
      </div>

      <p class="hub-label">About</p>
      <div class="hub-group">
        <a class="hub-row" routerLink="/about"><span>Our story</span><span aria-hidden="true">›</span></a>
        <a class="hub-row" routerLink="/privacy"><span>Privacy</span><span aria-hidden="true">›</span></a>
      </div>

      <button class="logout-btn" type="button" (click)="signOut()">Logout</button>
      <p class="hub-note">Free shipping on orders over ₹1,999. Prices include GST.</p>
    </section>

    <section class="desk-board">
      <div class="profile-banner">
        <div class="who">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <div>
            <strong>{{ auth.profile()?.display_name || 'Your account' }}</strong>
            <p>{{ auth.user()?.email }}</p>
            @if (auth.profile()?.phone) { <p>{{ auth.profile()?.phone }}</p> }
          </div>
        </div>
        <button class="edit-banner" type="button" (click)="toggleEdit()">{{ editing() ? 'Close' : 'Edit profile' }}</button>
      </div>
    </section>

    @if (editing()) {
      <form class="stack profile-form" [formGroup]="form" (ngSubmit)="save()">
        <label>Name<input formControlName="displayName" /></label>
        <label>Phone<input formControlName="phone" /></label>
        @if (message()) { <p class="fine">{{ message() }}</p> }
        @if (error()) { <p class="form-error">{{ error() }}</p> }
        <button class="btn" type="submit">Save profile</button>
      </form>
    }

    <section class="desk-board cards-only">
      <div class="desk-cards">
        <a routerLink="/account/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z"></path><path d="M9 7V5.5A3 3 0 0 1 12 2.5 3 3 0 0 1 15 5.5V7"></path></svg>
          <strong>My Orders</strong>
          <small>View and track orders</small>
        </a>
        <a routerLink="/account/orders">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"></rect><path d="M3.5 10h17"></path></svg>
          <strong>My Payments</strong>
          <small>Payment status on your orders</small>
        </a>
        <a routerLink="/account/addresses">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"></path><circle cx="12" cy="11" r="2"></circle></svg>
          <strong>My Addresses</strong>
          <small>Edit, add or remove addresses</small>
        </a>
        <a routerLink="/account" [queryParams]="{ edit: '1' }">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 19.5c1.2-3 3.6-4.5 7-4.5s5.8 1.5 7 4.5"></path></svg>
          <strong>My Profile</strong>
          <small>Name, phone and email</small>
        </a>
        <a routerLink="/shipping">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5M12 16h.01"></path></svg>
          <strong>Help &amp; Support</strong>
          <small>Shipping and delivery</small>
        </a>
        <a routerLink="/about">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h9a3 3 0 0 1 3 3V19l-4-2-4 2-4-2V5.5z"></path></svg>
          <strong>Our Story</strong>
          <small>About ChooseUrLook</small>
        </a>
      </div>
    </section>
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly editing = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', Validators.required],
    phone: [''],
  });

  constructor() {
    const route = inject(ActivatedRoute);
    void this.auth.init().then(() => {
      this.form.patchValue({
        displayName: this.auth.profile()?.display_name ?? '',
        phone: this.auth.profile()?.phone ?? '',
      });
    });
    route.queryParamMap.subscribe((params) => this.editing.set(params.get('edit') === '1'));
  }

  toggleEdit(): void {
    void this.router.navigate(['/account'], { queryParams: this.editing() ? {} : { edit: '1' } });
  }

  initial(): string {
    const source = this.auth.profile()?.display_name || this.auth.user()?.email || 'A';
    return source.trim().charAt(0).toUpperCase() || 'A';
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  async save(): Promise<void> {
    this.error.set('');
    this.message.set('');
    try {
      const value = this.form.getRawValue();
      await this.auth.updateProfile(value.displayName, value.phone);
      this.message.set('Profile saved.');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, DatePipe, InrPipe],
  template: `
    <p class="hub-back"><a routerLink="/account">My account</a></p>
    <h2>Orders</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <ul class="plain-list">
      @for (order of orders(); track order.id) {
        <li>
          <a [routerLink]="['/account/orders', order.id]">
            <strong>{{ order.public_order_number }}</strong>
            <span class="status" [attr.data-status]="order.status">{{ label(order.status) }}</span>
          </a>
          <span>{{ order.created_at | date:'mediumDate' }} · {{ order.total | inr }}</span>
        </li>
      } @empty { <li class="empty">No orders yet.</li> }
    </ul>
  `,
})
export class OrderListComponent {
  private readonly accounts = inject(AccountService);
  readonly orders = signal<StoreOrder[]>([]);
  readonly error = signal('');

  constructor() {
    void this.accounts.orders().then((orders) => this.orders.set(orders)).catch((error) => this.error.set(errorMessage(error)));
  }

  label(status: string): string {
    return status.replaceAll('_', ' ');
  }
}

@Component({
  selector: 'app-order-detail',
  imports: [DatePipe, InrPipe, RouterLink],
  template: `
    @if (order(); as current) {
      <p><a routerLink="/account/orders">All orders</a></p>
      <h2>{{ current.public_order_number }}</h2>
      <p class="status" [attr.data-status]="current.status">{{ current.status.replaceAll('_', ' ') }}</p>
      <p class="fine">{{ current.created_at | date:'medium' }} · {{ current.payment_method }}</p>
      <ul class="plain-list">
        @for (item of current.order_items ?? []; track item.id) {
          <li>
            <span>{{ item.name }} @if (item.color || item.size) { · {{ item.color }} {{ item.size }} } × {{ item.quantity }}</span>
            <span>{{ item.unit_price * item.quantity | inr }}</span>
          </li>
        }
      </ul>
      <aside class="summary">
        <p><span>Subtotal</span><span>{{ current.subtotal | inr }}</span></p>
        <p><span>Discount</span><span>{{ current.discount | inr }}</span></p>
        <p><span>Shipping</span><span>{{ current.shipping_fee | inr }}</span></p>
        <p><span>GST included</span><span>{{ current.tax | inr }}</span></p>
        <p><span>Total</span><span>{{ current.total | inr }}</span></p>
      </aside>
      <p>{{ current.shipping_address.recipient }}, {{ current.shipping_address.line1 }}, {{ current.shipping_address.city }} {{ current.shipping_address.postal_code }}</p>
      @for (payment of current.payments ?? []; track payment.provider) {
        <p class="fine">Payment {{ payment.status }} @if (payment.provider_payment_id) { · {{ payment.provider_payment_id }} }</p>
      }
      @for (shipment of current.shipments ?? []; track shipment.status) {
        <p>Shipment {{ shipment.status }} @if (shipment.awb) { · AWB {{ shipment.awb }} }
          @if (shipment.tracking_url) { <a [href]="shipment.tracking_url" target="_blank" rel="noopener">Track</a> }
        </p>
      }
      @if (error()) { <p class="form-error">{{ error() }}</p> }
      <div class="hero-actions">
        @if (current.status === 'pending_payment') {
          <button class="btn" type="button" [disabled]="busy()" (click)="pay(current.id)">Pay now</button>
        }
        @if (current.status === 'pending_payment' || current.status === 'confirmed') {
          <button class="btn btn-ghost" type="button" [disabled]="busy()" (click)="cancel(current.id)">Cancel order</button>
        }
      </div>
    }
  `,
})
export class OrderDetailComponent {
  private readonly accounts = inject(AccountService);
  private readonly checkout = inject(CheckoutService);
  readonly order = signal<StoreOrder | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    void this.load(id);
  }

  async pay(id: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.checkout.pay({ order_id: id });
      await this.load(id);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async cancel(id: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.accounts.cancel(id);
      await this.load(id);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    try {
      this.order.set(await this.accounts.order(id));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

@Component({
  selector: 'app-addresses',
  imports: [ReactiveFormsModule],
  template: `
    <p class="hub-back"><a routerLink="/account">My account</a></p>
    <h2>Addresses</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <ul class="plain-list">
      @for (address of addresses(); track address.id) {
        <li>
          <span>{{ address.recipient }}, {{ address.line1 }}, {{ address.city }}, {{ address.state }} {{ address.postal_code }}</span>
          <button class="text-btn" type="button" (click)="remove(address.id)">Remove</button>
        </li>
      }
    </ul>
    <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
      <label>Recipient<input formControlName="recipient" /></label>
      <label>Phone<input formControlName="phone" /></label>
      <label class="wide">Address<input formControlName="line1" /></label>
      <label class="wide">Landmark<input formControlName="line2" /></label>
      <label>City<input formControlName="city" /></label>
      <label>State
        <select formControlName="state">
          <option value="">Select</option>
          @for (state of states; track state) { <option [value]="state">{{ state }}</option> }
        </select>
      </label>
      <label>PIN code<input formControlName="postal_code" /></label>
      <label class="choice"><input type="checkbox" formControlName="is_default" /> Default address</label>
      <button class="btn" type="submit">Save address</button>
    </form>
  `,
})
export class AddressesComponent {
  private readonly accounts = inject(AccountService);
  private readonly auth = inject(AuthService);
  readonly states = INDIAN_STATES;
  readonly addresses = signal<Address[]>([]);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    recipient: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postal_code: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],
    is_default: [false],
  });

  constructor() {
    void this.reload();
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const user = this.auth.user();
    if (!user) return;
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      await this.accounts.saveAddress({ ...value, country: 'IN' }, user.id);
      this.form.reset({ is_default: false, recipient: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '' });
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.accounts.deleteAddress(id);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async reload(): Promise<void> {
    try {
      this.addresses.set(await this.accounts.addresses());
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
