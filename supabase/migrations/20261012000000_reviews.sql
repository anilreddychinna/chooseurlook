-- Customer ratings. One review per person per product.
-- Run this in the Supabase SQL editor after the earlier migrations.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default 'Customer',
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 8 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);

create or replace function public.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to review';
  end if;
  new.user_id := auth.uid();
  select coalesce(nullif(trim(display_name), ''), 'Customer')
    into v_name
  from public.profiles
  where id = new.user_id;
  new.author_name := coalesce(v_name, 'Customer');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists reviews_prepare on public.reviews;
create trigger reviews_prepare
  before insert or update on public.reviews
  for each row execute function public.prepare_review();

create or replace view public.product_ratings
with (security_invoker = true) as
select
  product_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*)::int as review_count
from public.reviews
group by product_id;

alter table public.reviews enable row level security;

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select on public.product_ratings to anon, authenticated;
