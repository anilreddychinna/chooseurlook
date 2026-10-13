import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { errorMessage, slugify } from '../core/models';
import { SupabaseService } from '../core/supabase.service';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly images = inject(SupabaseService);
  readonly categories = signal<{ id: string; name: string }[]>([]);
  readonly photos = signal<{ path: string; alt: string }[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  private slugEdited = false;
  productId = '';

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
    price: [0, Validators.required],
    compareAtPrice: this.fb.control<number | null>(null),
    categoryId: [''],
    status: ['draft'],
    seoTitle: [''],
    seoDescription: [''],
    variants: this.fb.array([this.variantGroup()]),
  });

  get variants(): FormArray {
    return this.form.controls.variants;
  }

  constructor() {
    void this.load();
  }

  syncSlug(): void {
    if (!this.slugEdited) this.form.controls.slug.setValue(slugify(this.form.controls.name.value));
  }

  markSlug(): void {
    this.slugEdited = true;
  }

  addVariant(): void {
    this.variants.push(this.variantGroup());
  }

  removeVariant(index: number): void {
    if (this.variants.length === 1) return;
    this.variants.removeAt(index);
  }

  async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const path = await this.admin.uploadImage(file);
      this.photos.update((photos) => [...photos, { path, alt: this.form.controls.name.value }]);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  addImageUrl(value: string): void {
    const path = value.trim();
    if (!path) return;
    this.photos.update((photos) => [...photos, { path, alt: this.form.controls.name.value }]);
  }

  removePhoto(index: number): void {
    this.photos.update((photos) => photos.filter((_, photoIndex) => photoIndex !== index));
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    try {
      const id = await this.admin.saveProduct({
        id: this.productId || undefined,
        categoryId: value.categoryId || null,
        name: value.name,
        slug: value.slug,
        description: value.description,
        price: Number(value.price),
        compareAtPrice: value.compareAtPrice == null || value.compareAtPrice === ('' as unknown) ? null : Number(value.compareAtPrice),
        status: value.status,
        seoTitle: value.seoTitle,
        seoDescription: value.seoDescription,
        images: this.photos(),
        variants: value.variants.map((variant) => ({
          id: variant.id || undefined,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          priceOverride: variant.priceOverride == null || variant.priceOverride === ('' as unknown) ? null : Number(variant.priceOverride),
          stock: Number(variant.stock),
          active: variant.active,
        })),
      });
      await this.router.navigate(['/admin/products', id]);
      this.productId = id;
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    if (!this.productId) return;
    await this.admin.deleteProduct(this.productId);
    await this.router.navigateByUrl('/admin/products');
  }

  private variantGroup(value?: {
    id?: string;
    sku?: string;
    size?: string | null;
    color?: string | null;
    priceOverride?: number | null;
    stock?: number;
    active?: boolean;
  }) {
    return this.fb.nonNullable.group({
      id: [value?.id ?? ''],
      sku: [value?.sku ?? '', Validators.required],
      size: [value?.size ?? ''],
      color: [value?.color ?? ''],
      priceOverride: this.fb.control<number | null>(value?.priceOverride ?? null),
      stock: [value?.stock ?? 0, Validators.min(0)],
      active: [value?.active ?? true],
    });
  }

  private async load(): Promise<void> {
    const categories = await this.admin.categories();
    this.categories.set(categories.map((row) => ({ id: String(row['id']), name: String(row['name']) })));
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.productId = id;
    const product = await this.admin.product(id);
    if (!product) return;
    this.slugEdited = true;
    this.form.patchValue({
      name: String(product['name'] ?? ''),
      slug: String(product['slug'] ?? ''),
      description: String(product['description'] ?? ''),
      price: Number(product['price'] ?? 0),
      compareAtPrice: product['compare_at_price'] == null ? null : Number(product['compare_at_price']),
      categoryId: String(product['category_id'] ?? ''),
      status: String(product['status'] ?? 'draft'),
      seoTitle: String(product['seo_title'] ?? ''),
      seoDescription: String(product['seo_description'] ?? ''),
    });
    const images = (product['product_images'] as { storage_path: string; alt_text: string; sort_order: number }[] | null) ?? [];
    this.photos.set([...images].sort((a, b) => a.sort_order - b.sort_order).map((image) => ({
      path: image.storage_path,
      alt: image.alt_text,
    })));
    const variants = (product['product_variants'] as {
      id: string;
      sku: string;
      size: string | null;
      color: string | null;
      price_override: number | null;
      is_active: boolean;
      inventory: { available_quantity: number } | { available_quantity: number }[] | null;
    }[]) ?? [];
    this.variants.clear();
    for (const variant of variants) {
      const stock = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
      this.variants.push(this.variantGroup({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        priceOverride: variant.price_override,
        stock: Number(stock?.available_quantity ?? 0),
        active: variant.is_active,
      }));
    }
    if (!this.variants.length) this.addVariant();
  }
}
