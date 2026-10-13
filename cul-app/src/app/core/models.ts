export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  alt: string;
  categoryName: string;
  categorySlug: string;
  ratingAverage?: number | null;
  reviewCount?: number | null;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
}

export interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  available: number;
  active: boolean;
}

export interface ProductImage {
  url: string;
  alt: string;
  path: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  images: ProductImage[];
  variants: Variant[];
  ratingAverage: number;
  reviewCount: number;
}

export interface Listing {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  category: Category | null;
  categories: Category[];
  error: string | null;
}

export interface HomeData {
  categories: Category[];
  featured: ProductCard[];
  error: string | null;
}

export interface ProductPayload {
  product: ProductDetail | null;
  related: ProductCard[];
  reviews: Review[] | null;
  error: string | null;
}

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  compareAtPrice?: number | null;
  quantity: number;
  imageUrl: string | null;
  available: number;
}

export interface Address {
  id: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface AddressSnapshot {
  recipient?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  image_url: string | null;
}

export interface PaymentRow {
  status: string;
  provider: string;
  provider_payment_id: string | null;
}

export interface ShipmentRow {
  id?: string;
  provider: string;
  awb: string | null;
  tracking_url: string | null;
  label_url: string | null;
  status: string;
}

export interface StoreOrder {
  id: string;
  public_order_number: string;
  status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  tax: number;
  total: number;
  currency: string;
  coupon_code: string | null;
  shipping_address: AddressSnapshot;
  created_at: string;
  order_items?: OrderItem[];
  payments?: PaymentRow[];
  shipments?: ShipmentRow[];
}

export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
}

export interface PublicCoupon {
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_subtotal: number;
}

export interface VariantInput {
  id?: string;
  sku: string;
  size: string;
  color: string;
  priceOverride: number | null;
  stock: number;
  active: boolean;
}

export interface ProductInput {
  id?: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  seoTitle: string;
  seoDescription: string;
  images: { path: string; alt: string }[];
  variants: VariantInput[];
}

export const PAGE_SIZE = 12;
export const FREE_SHIPPING_AT = 1999;
export const SHIPPING_FEE = 99;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh',
];

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Something went wrong. Please try again.';
}

export function shippingFee(goods: number, freeShippingCoupon = false): number {
  if (freeShippingCoupon || goods >= FREE_SHIPPING_AT) return 0;
  return SHIPPING_FEE;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
