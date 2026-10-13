-- ChooseUrLook commerce schema
-- Apply in the Supabase SQL editor or with: supabase db push
-- Currency policy: INR. Product prices are GST-inclusive.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored
);

create index products_search_idx on public.products using gin (search_vector);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  options jsonb not null default '{}'::jsonb,
  price_override numeric(12, 2) check (price_override is null or price_override >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  available_quantity int not null default 0 check (available_quantity >= 0),
  reserved_quantity int not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now()
);

create trigger categories_touch
  before update on public.categories
  for each row execute function public.touch_updated_at();

create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Cart, addresses, promotions
-- ---------------------------------------------------------------------------

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 10),
  unique (cart_id, variant_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free_shipping')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  min_subtotal numeric(12, 2) not null default 0,
  max_uses int,
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create view public.coupon_public
with (security_invoker = false) as
select code, discount_type, discount_value, min_subtotal
from public.coupons
where is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and (max_uses is null or used_count < max_uses);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_number text not null unique,
  user_id uuid not null references auth.users (id),
  address_id uuid references public.addresses (id),
  status text not null check (status in (
    'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),
  payment_method text not null check (payment_method in ('razorpay', 'cod')),
  subtotal numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  currency text not null default 'INR',
  coupon_code text,
  shipping_address jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  name text not null,
  sku text not null,
  size text,
  color text,
  unit_price numeric(12, 2) not null,
  quantity int not null check (quantity > 0),
  image_url text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  provider_order_id text,
  provider_payment_id text,
  status text not null check (status in ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'shiprocket',
  provider_shipment_id text,
  awb text,
  tracking_url text,
  label_url text,
  status text not null default 'pending',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, provider)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processing_status text not null default 'processed',
  payload jsonb,
  unique (provider, event_id)
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  recipient text not null,
  template text not null,
  provider_message_id text,
  status text not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Checkout (prices and stock are calculated here, never trusted from the client)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_cart()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cart uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  insert into public.carts (user_id)
  values (auth.uid())
  on conflict (user_id) do update set updated_at = now()
  returning id into cart;

  return cart;
end;
$$;

create or replace function public.create_checkout_order(
  p_address_id uuid,
  p_payment_method text,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cart uuid;
  v_address public.addresses%rowtype;
  v_item record;
  v_coupon public.coupons%rowtype;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_shipping numeric(12, 2) := 0;
  v_tax numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_unit numeric(12, 2);
  v_available int;
  v_order_id uuid;
  v_number text;
  v_status text;
  v_image text;
  v_count int := 0;
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  perform public.release_stale_checkouts();

  if p_payment_method not in ('razorpay', 'cod') then
    raise exception 'Unsupported payment method';
  end if;

  select * into v_address
  from public.addresses
  where id = p_address_id and user_id = v_user;

  if not found then
    raise exception 'Address not found';
  end if;

  select id into v_cart from public.carts where user_id = v_user;
  if v_cart is null then
    raise exception 'Cart is empty';
  end if;

  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon
    from public.coupons
    where upper(code) = upper(trim(p_coupon_code))
      and is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (max_uses is null or used_count < max_uses)
    for update;

    if not found then
      raise exception 'Coupon is not valid';
    end if;
  end if;

  for v_item in
    select
      ci.quantity,
      v.id as variant_id,
      v.sku,
      v.size,
      v.color,
      v.price_override,
      p.id as product_id,
      p.name,
      p.price,
      p.status,
      v.is_active
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart
    for update of ci
  loop
    if v_item.status <> 'published' or not v_item.is_active then
      raise exception 'One or more items are no longer available';
    end if;

    select available_quantity into v_available
    from public.inventory
    where variant_id = v_item.variant_id
    for update;

    if v_available is null or v_available < v_item.quantity then
      raise exception 'Insufficient stock for %', v_item.name;
    end if;

    v_unit := coalesce(v_item.price_override, v_item.price);
    v_subtotal := v_subtotal + (v_unit * v_item.quantity);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Cart is empty';
  end if;

  if v_coupon.id is not null then
    if v_subtotal < v_coupon.min_subtotal then
      raise exception 'Order does not meet the coupon minimum';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_subtotal * least(v_coupon.discount_value, 100) / 100, 2);
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(v_coupon.discount_value, v_subtotal);
    end if;

    update public.coupons
    set used_count = used_count + 1
    where id = v_coupon.id;
  end if;

  if v_coupon.discount_type = 'free_shipping' or v_subtotal - v_discount >= 1999 then
    v_shipping := 0;
  else
    v_shipping := 99;
  end if;

  v_total := v_subtotal - v_discount + v_shipping;
  v_tax := round(v_total * 18 / 118, 2);
  v_status := case when p_payment_method = 'cod' then 'confirmed' else 'pending_payment' end;
  v_number := 'CUL-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  insert into public.orders (
    public_order_number, user_id, address_id, status, payment_method,
    subtotal, discount, shipping_fee, tax, total, currency, coupon_code, shipping_address
  ) values (
    v_number, v_user, v_address.id, v_status, p_payment_method,
    v_subtotal, v_discount, v_shipping, v_tax, v_total, 'INR',
    case when v_coupon.id is null then null else v_coupon.code end,
    jsonb_build_object(
      'recipient', v_address.recipient,
      'phone', v_address.phone,
      'line1', v_address.line1,
      'line2', v_address.line2,
      'city', v_address.city,
      'state', v_address.state,
      'postal_code', v_address.postal_code,
      'country', v_address.country
    )
  ) returning id into v_order_id;

  for v_item in
    select
      ci.quantity,
      v.id as variant_id,
      v.sku,
      v.size,
      v.color,
      v.price_override,
      p.id as product_id,
      p.name,
      p.price
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart
  loop
    v_unit := coalesce(v_item.price_override, v_item.price);

    select i.storage_path into v_image
    from public.product_images i
    where i.product_id = v_item.product_id
    order by i.sort_order
    limit 1;

    insert into public.order_items (
      order_id, product_id, variant_id, name, sku, size, color, unit_price, quantity, image_url
    ) values (
      v_order_id, v_item.product_id, v_item.variant_id, v_item.name, v_item.sku,
      v_item.size, v_item.color, v_unit, v_item.quantity, v_image
    );

    if p_payment_method = 'razorpay' then
      update public.inventory
      set available_quantity = available_quantity - v_item.quantity,
          reserved_quantity = reserved_quantity + v_item.quantity,
          updated_at = now()
      where variant_id = v_item.variant_id;
    else
      update public.inventory
      set available_quantity = available_quantity - v_item.quantity,
          updated_at = now()
      where variant_id = v_item.variant_id;
    end if;
  end loop;

  insert into public.payments (order_id, provider, status, amount, currency)
  values (
    v_order_id,
    p_payment_method,
    'pending',
    v_total,
    'INR'
  );

  delete from public.cart_items where cart_id = v_cart;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_number,
    'amount', v_total,
    'currency', 'INR',
    'status', v_status,
    'payment_method', p_payment_method
  );
end;
$$;

create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status not in ('pending_payment', 'confirmed') then
    raise exception 'This order can no longer be cancelled';
  end if;

  for v_item in
    select variant_id, quantity from public.order_items where order_id = v_order.id
  loop
    if v_order.payment_method = 'razorpay' and v_order.status = 'pending_payment' then
      update public.inventory
      set available_quantity = available_quantity + v_item.quantity,
          reserved_quantity = greatest(reserved_quantity - v_item.quantity, 0),
          updated_at = now()
      where variant_id = v_item.variant_id;
    else
      update public.inventory
      set available_quantity = available_quantity + v_item.quantity,
          updated_at = now()
      where variant_id = v_item.variant_id;
    end if;
  end loop;

  update public.orders set status = 'cancelled' where id = v_order.id;
  update public.payments set status = 'failed' where order_id = v_order.id and status = 'pending';
end;
$$;

create or replace function public.release_stale_checkouts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
begin
  for v_order in
    select * from public.orders
    where status = 'pending_payment'
      and created_at < now() - interval '30 minutes'
    for update skip locked
  loop
    for v_item in
      select variant_id, quantity from public.order_items where order_id = v_order.id
    loop
      update public.inventory
      set available_quantity = available_quantity + v_item.quantity,
          reserved_quantity = greatest(reserved_quantity - v_item.quantity, 0),
          updated_at = now()
      where variant_id = v_item.variant_id;
    end loop;

    update public.orders set status = 'cancelled' where id = v_order.id;
    update public.payments set status = 'failed'
    where order_id = v_order.id and status = 'pending';
  end loop;
end;
$$;

create or replace function public.admin_set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  if p_status not in ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') then
    raise exception 'Unsupported status';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status in ('cancelled', 'refunded') then
    raise exception 'This order is already closed';
  end if;

  if p_status in ('cancelled', 'refunded') then
    for v_item in
      select variant_id, quantity from public.order_items where order_id = v_order.id
    loop
      if v_order.status = 'pending_payment' then
        update public.inventory
        set available_quantity = available_quantity + v_item.quantity,
            reserved_quantity = greatest(reserved_quantity - v_item.quantity, 0),
            updated_at = now()
        where variant_id = v_item.variant_id;
      else
        update public.inventory
        set available_quantity = available_quantity + v_item.quantity,
            updated_at = now()
        where variant_id = v_item.variant_id;
      end if;
    end loop;

    update public.payments
    set status = case when p_status = 'refunded' then 'refunded' else 'failed' end
    where order_id = v_order.id and status in ('pending', 'captured', 'authorized');
  end if;

  update public.orders set status = p_status where id = v_order.id;
end;
$$;

-- Service role / edge functions call this after a verified Razorpay capture.
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'confirmed' or v_order.status = 'processing' then
    return;
  end if;

  if v_order.status <> 'pending_payment' then
    raise exception 'Order is not awaiting payment';
  end if;

  update public.orders set status = 'confirmed' where id = p_order_id;

  update public.payments
  set status = 'captured',
      provider = 'razorpay',
      provider_order_id = p_provider_order_id,
      provider_payment_id = p_provider_payment_id,
      verified_at = now()
  where order_id = p_order_id;

  for v_item in
    select variant_id, quantity from public.order_items where order_id = p_order_id
  loop
    update public.inventory
    set reserved_quantity = greatest(reserved_quantity - v_item.quantity, 0),
        updated_at = now()
    where variant_id = v_item.variant_id;
  end loop;
end;
$$;

revoke all on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;

revoke all on function public.create_checkout_order(uuid, text, text) from public, anon;
grant execute on function public.create_checkout_order(uuid, text, text) to authenticated;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

revoke all on function public.ensure_cart() from public, anon;
grant execute on function public.ensure_cart() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.email_logs enable row level security;

create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy roles_select on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());

create policy categories_public_read on public.categories
  for select using (is_active or public.is_admin());
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy products_public_read on public.products
  for select using (status = 'published' or public.is_admin());
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy images_read on public.product_images
  for select using (
    public.is_admin() or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );
create policy images_admin_write on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants
  for select using (
    public.is_admin() or (
      is_active and exists (
        select 1 from public.products p
        where p.id = product_id and p.status = 'published'
      )
    )
  );
create policy variants_admin_write on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

create policy inventory_read on public.inventory
  for select using (
    public.is_admin() or exists (
      select 1
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = variant_id and p.status = 'published'
    )
  );
create policy inventory_admin_write on public.inventory
  for all using (public.is_admin()) with check (public.is_admin());

create policy carts_own on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cart_items_own on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

create policy addresses_own on public.addresses
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

create policy coupons_read on public.coupons
  for select using (public.is_admin());
create policy coupons_admin_write on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy orders_read on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

create policy order_items_read on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy payments_read on public.payments
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy shipments_read on public.shipments
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );
create policy shipments_admin_write on public.shipments
  for all using (public.is_admin()) with check (public.is_admin());

-- webhook_events and email_logs stay locked to the service role (no policies).

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Sample catalogue (published). Replace images from Admin when ready.
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug, description, image_url, sort_order) values
  ('Women', 'women', 'Dresses, co-ords and evening pieces edited for the way you show up.', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80', 1),
  ('Men', 'men', 'Tailored shirts, jackets and everyday layers.', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1200&q=80', 2),
  ('Accessories', 'accessories', 'Bags, scarves and the small things that finish a look.', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80', 3),
  ('Beauty', 'beauty', 'Skin, scent and colour chosen to sit close to the skin.', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80', 4);

insert into public.coupons (code, discount_type, discount_value, min_subtotal, max_uses) values
  ('WELCOME10', 'percent', 10, 999, 1000),
  ('FREESHIP', 'free_shipping', 0, 0, null);

grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.inventory to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products, public.product_images,
  public.product_variants, public.inventory, public.coupons, public.shipments to authenticated;
grant select on public.coupons to authenticated;
grant select on public.coupon_public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles, public.orders, public.order_items, public.payments, public.shipments to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items, public.addresses to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.ensure_cart() to authenticated;
grant execute on function public.create_checkout_order(uuid, text, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated;

revoke all on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_stale_checkouts() from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;
grant execute on function public.release_stale_checkouts() to service_role;

-- Promote the first admin after signup:
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'you@chooseurlook.com';
