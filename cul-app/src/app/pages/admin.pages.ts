import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService, Dashboard, InventoryRow } from '../core/admin.service';
import { Coupon, StoreOrder, errorMessage, slugify } from '../core/models';
import { InrPipe } from '../shared/inr.pipe';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="account">
      <aside>
        <p class="eyebrow">Admin</p>
        <h1>Studio</h1>
        <nav>
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Overview</a>
          <a routerLink="/admin/products" routerLinkActive="active">Products</a>
          <a routerLink="/admin/categories" routerLinkActive="active">Categories</a>
          <a routerLink="/admin/orders" routerLinkActive="active">Orders</a>
          <a routerLink="/admin/inventory" routerLinkActive="active">Inventory</a>
          <a routerLink="/admin/coupons" routerLinkActive="active">Coupons</a>
        </nav>
        <a routerLink="/">View shop</a>
      </aside>
      <div><router-outlet /></div>
    </section>
  `,
})
export class AdminShellComponent {}

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, InrPipe],
  template: `
    <h2>Overview</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    @if (data(); as dash) {
      <div class="stats">
        <article><span>Products</span><strong>{{ dash.products }}</strong></article>
        <article><span>Orders</span><strong>{{ dash.orders }}</strong></article>
        <article><span>Revenue</span><strong>{{ dash.revenue | inr }}</strong></article>
      </div>
      <h3>Recent orders</h3>
      <ul class="plain-list">
        @for (order of dash.recent; track order.id) {
          <li>
            <a [routerLink]="['/admin/orders', order.id]">{{ order.public_order_number }}</a>
            <span class="status" [attr.data-status]="order.status">{{ order.status }}</span>
            <span>{{ order.total | inr }}</span>
          </li>
        }
      </ul>
      <h3>Low stock</h3>
      <ul class="plain-list">
        @for (row of dash.lowStock; track row.sku) {
          <li><span>{{ row.name }} · {{ row.sku }}</span><span>{{ row.available }} left</span></li>
        } @empty { <li>No variants at 3 or below.</li> }
      </ul>
    }
  `,
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);
  readonly data = signal<Dashboard | null>(null);
  readonly error = signal('');

  constructor() {
    void this.admin.dashboard().then((data) => this.data.set(data)).catch((error) => this.error.set(errorMessage(error)));
  }
}

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, InrPipe],
  template: `
    <div class="section-head"><h2>Products</h2><a class="btn" routerLink="/admin/products/new">New product</a></div>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <table class="data">
      <thead><tr><th>Name</th><th>Status</th><th>Price</th><th></th></tr></thead>
      <tbody>
        @for (product of products(); track product.id) {
          <tr>
            <td>{{ product.name }}</td>
            <td>{{ product.status }}</td>
            <td>{{ product.price | inr }}</td>
            <td><a [routerLink]="['/admin/products', product.id]">Edit</a></td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminProductsComponent {
  private readonly admin = inject(AdminService);
  readonly products = signal<{ id: string; name: string; status: string; price: number }[]>([]);
  readonly error = signal('');

  constructor() {
    void this.admin.products().then((rows) => {
      this.products.set(rows.map((row) => ({
        id: String(row['id']),
        name: String(row['name']),
        status: String(row['status']),
        price: Number(row['price']),
      })));
    }).catch((error) => this.error.set(errorMessage(error)));
  }
}

@Component({
  selector: 'app-admin-categories',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Categories</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <ul class="plain-list">
      @for (category of categories(); track category.id) {
        <li>
          <span>{{ category.name }} · {{ category.slug }}</span>
          <button class="text-btn" type="button" (click)="edit(category)">Edit</button>
          <button class="text-btn" type="button" (click)="remove(category.id)">Delete</button>
        </li>
      }
    </ul>
    <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
      <label>Name<input formControlName="name" (input)="syncSlug()" /></label>
      <label>Slug<input formControlName="slug" /></label>
      <label class="wide">Description<input formControlName="description" /></label>
      <label class="wide">Image URL<input formControlName="imageUrl" /></label>
      <label>Sort<input formControlName="sortOrder" type="number" /></label>
      <label class="choice"><input type="checkbox" formControlName="isActive" /> Active</label>
      <button class="btn" type="submit">Save category</button>
    </form>
  `,
})
export class AdminCategoriesComponent {
  private readonly admin = inject(AdminService);
  readonly categories = signal<{ id: string; name: string; slug: string; description: string; imageUrl: string; isActive: boolean; sortOrder: number }[]>([]);
  readonly error = signal('');
  private slugEdited = false;
  readonly form = inject(FormBuilder).nonNullable.group({
    id: [''],
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
    imageUrl: [''],
    sortOrder: [0],
    isActive: [true],
  });

  constructor() {
    void this.reload();
  }

  syncSlug(): void {
    if (!this.slugEdited && !this.form.controls.id.value) {
      this.form.controls.slug.setValue(slugify(this.form.controls.name.value));
    }
  }

  edit(category: { id: string; name: string; slug: string; description: string; imageUrl: string; isActive: boolean; sortOrder: number }): void {
    this.slugEdited = true;
    this.form.patchValue(category);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    try {
      await this.admin.saveCategory({ ...value, id: value.id || undefined, sortOrder: Number(value.sortOrder) });
      this.form.reset({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, isActive: true });
      this.slugEdited = false;
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.admin.deleteCategory(id);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async reload(): Promise<void> {
    const rows = await this.admin.categories();
    this.categories.set(rows.map((row) => ({
      id: String(row['id']),
      name: String(row['name']),
      slug: String(row['slug']),
      description: String(row['description'] ?? ''),
      imageUrl: String(row['image_url'] ?? ''),
      isActive: Boolean(row['is_active']),
      sortOrder: Number(row['sort_order'] ?? 0),
    })));
  }
}

@Component({
  selector: 'app-admin-orders',
  imports: [RouterLink, DatePipe, InrPipe],
  template: `
    <h2>Orders</h2>
    <label>Status
      <select [value]="status()" (change)="filter($any($event.target).value)">
        <option value="">All</option>
        @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
      </select>
    </label>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <table class="data">
      <thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
      <tbody>
        @for (order of orders(); track order.id) {
          <tr>
            <td><a [routerLink]="['/admin/orders', order.id]">{{ order.public_order_number }}</a></td>
            <td>{{ order.status }}</td>
            <td>{{ order.total | inr }}</td>
            <td>{{ order.created_at | date:'mediumDate' }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminOrdersComponent {
  private readonly admin = inject(AdminService);
  readonly statuses = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  readonly orders = signal<StoreOrder[]>([]);
  readonly status = signal('');
  readonly error = signal('');

  constructor() {
    void this.reload();
  }

  filter(status: string): void {
    this.status.set(status);
    void this.reload();
  }

  private async reload(): Promise<void> {
    try {
      this.orders.set(await this.admin.orders(this.status()));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

@Component({
  selector: 'app-admin-order',
  imports: [ReactiveFormsModule, InrPipe, RouterLink],
  template: `
    @if (order(); as current) {
      <p><a routerLink="/admin/orders">All orders</a></p>
      <h2>{{ current.public_order_number }}</h2>
      <p>{{ current.status }} · {{ current.payment_method }} · {{ current.total | inr }}</p>
      <ul class="plain-list">
        @for (item of current.order_items ?? []; track item.id) {
          <li><span>{{ item.name }} × {{ item.quantity }}</span><span>{{ item.unit_price * item.quantity | inr }}</span></li>
        }
      </ul>
      <form class="stack" [formGroup]="statusForm" (ngSubmit)="updateStatus()">
        <label>Order status
          <select formControlName="status">
            @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
          </select>
        </label>
        <button class="btn" type="submit">Update status</button>
      </form>
      <form class="form-grid" [formGroup]="shipmentForm" (ngSubmit)="saveShipment()">
        <label>Provider<input formControlName="provider" /></label>
        <label>Status<input formControlName="status" /></label>
        <label>AWB<input formControlName="awb" /></label>
        <label>Tracking URL<input formControlName="trackingUrl" /></label>
        <label class="wide">Label URL<input formControlName="labelUrl" /></label>
        <button class="btn" type="submit">Save shipment</button>
      </form>
      @if (message()) { <p class="fine">{{ message() }}</p> }
      @if (error()) { <p class="form-error">{{ error() }}</p> }
    }
  `,
})
export class AdminOrderComponent {
  private readonly admin = inject(AdminService);
  readonly order = signal<StoreOrder | null>(null);
  readonly message = signal('');
  readonly error = signal('');
  readonly statuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  readonly statusForm = inject(FormBuilder).nonNullable.group({ status: ['processing'] });
  readonly shipmentForm = inject(FormBuilder).nonNullable.group({
    provider: ['manual'],
    status: ['pending'],
    awb: [''],
    trackingUrl: [''],
    labelUrl: [''],
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    void this.load(id);
  }

  async updateStatus(): Promise<void> {
    const current = this.order();
    if (!current) return;
    try {
      await this.admin.setStatus(current.id, this.statusForm.controls.status.value);
      this.message.set('Status updated. Stock is restored when an open order is cancelled or refunded.');
      await this.load(current.id);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async saveShipment(): Promise<void> {
    const current = this.order();
    if (!current) return;
    try {
      await this.admin.saveShipment(current.id, this.shipmentForm.getRawValue());
      this.message.set('Shipment saved.');
      await this.load(current.id);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async load(id: string): Promise<void> {
    const order = await this.admin.order(id);
    this.order.set(order);
    if (!order) return;
    if (order.status !== 'pending_payment') this.statusForm.patchValue({ status: order.status });
    const shipment = order.shipments?.[0];
    if (shipment) {
      this.shipmentForm.patchValue({
        provider: shipment.provider,
        status: shipment.status,
        awb: shipment.awb ?? '',
        trackingUrl: shipment.tracking_url ?? '',
        labelUrl: shipment.label_url ?? '',
      });
    }
  }
}

@Component({
  selector: 'app-admin-inventory',
  template: `
    <h2>Inventory</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <table class="data">
      <thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Reserved</th><th></th></tr></thead>
      <tbody>
        @for (row of rows(); track row.variantId) {
          <tr>
            <td>{{ row.name }} {{ row.color }} {{ row.size }}</td>
            <td>{{ row.sku }}</td>
            <td><input type="number" min="0" [value]="row.available" (change)="draft.set(row.variantId + ':' + $any($event.target).value)" /></td>
            <td>{{ row.reserved }}</td>
            <td><button class="text-btn" type="button" (click)="save(row)">Save</button></td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminInventoryComponent {
  private readonly admin = inject(AdminService);
  readonly rows = signal<InventoryRow[]>([]);
  readonly error = signal('');
  readonly draft = signal('');

  constructor() {
    void this.reload();
  }

  async save(row: InventoryRow): Promise<void> {
    const [id, value] = this.draft().split(':');
    const available = id === row.variantId ? Number(value) : row.available;
    try {
      await this.admin.setStock(row.variantId, available);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async reload(): Promise<void> {
    this.rows.set(await this.admin.inventory());
  }
}

@Component({
  selector: 'app-admin-coupons',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Coupons</h2>
    @if (error()) { <p class="form-error">{{ error() }}</p> }
    <ul class="plain-list">
      @for (coupon of coupons(); track coupon.id) {
        <li>
          <span>{{ coupon.code }} · {{ coupon.discount_type }} {{ coupon.discount_value }} · used {{ coupon.used_count }}</span>
          <button class="text-btn" type="button" (click)="remove(coupon.id)">Delete</button>
        </li>
      }
    </ul>
    <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
      <label>Code<input formControlName="code" /></label>
      <label>Type
        <select formControlName="discount_type">
          <option value="percent">Percent</option>
          <option value="fixed">Fixed amount</option>
          <option value="free_shipping">Free shipping</option>
        </select>
      </label>
      <label>Value<input formControlName="discount_value" type="number" /></label>
      <label>Minimum<input formControlName="min_subtotal" type="number" /></label>
      <label>Max uses<input formControlName="max_uses" type="number" /></label>
      <label class="choice"><input type="checkbox" formControlName="is_active" /> Active</label>
      <button class="btn" type="submit">Save coupon</button>
    </form>
  `,
})
export class AdminCouponsComponent {
  private readonly admin = inject(AdminService);
  readonly coupons = signal<Coupon[]>([]);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', Validators.required],
    discount_type: ['percent' as Coupon['discount_type']],
    discount_value: [10],
    min_subtotal: [0],
    max_uses: [null as number | null],
    is_active: [true],
  });

  constructor() {
    void this.reload();
  }

  async save(): Promise<void> {
    const value = this.form.getRawValue();
    try {
      await this.admin.saveCoupon({
        code: value.code,
        discount_type: value.discount_type,
        discount_value: Number(value.discount_value),
        min_subtotal: Number(value.min_subtotal),
        max_uses: value.max_uses ? Number(value.max_uses) : null,
        is_active: value.is_active,
      });
      this.form.reset({ code: '', discount_type: 'percent', discount_value: 10, min_subtotal: 0, max_uses: null, is_active: true });
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.admin.deleteCoupon(id);
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async reload(): Promise<void> {
    this.coupons.set(await this.admin.coupons());
  }
}
