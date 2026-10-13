-- Point the shop at cycling sunglasses, running sunglasses, accessories and ladies looks.

update public.categories
set is_active = false, sort_order = sort_order + 100, updated_at = now()
where slug in ('women', 'men', 'beauty');

update public.categories
set
  description = 'Cases, straps and the small pieces that travel with a pair.',
  image_url = 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
  sort_order = 3,
  is_active = true,
  updated_at = now()
where slug = 'accessories';

insert into public.categories (name, slug, description, image_url, sort_order) values
  ('Cycling', 'cycling', 'Aero shields and photochromic lenses for long rides in hard light.', 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1200&q=80', 1),
  ('Running', 'running', 'Light wraps that stay put from the first kilometre.', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80', 2),
  ('Ladies', 'ladies', 'Sun frames and day looks edited for women.', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80', 4)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update public.products
set status = 'archived', updated_at = now()
where slug in ('tailored-oxford-shirt', 'unstructured-wool-jacket', 'neroli-skin-oil', 'soft-matte-lip');

update public.products
set category_id = (select id from public.categories where slug = 'ladies'), updated_at = now()
where slug in ('silk-column-dress', 'linen-resort-set', 'gold-hoop-edit');

do $$
declare
  cycling uuid;
  running uuid;
  acc uuid;
  pid uuid;
  vid uuid;
begin
  select id into cycling from public.categories where slug = 'cycling';
  select id into running from public.categories where slug = 'running';
  select id into acc from public.categories where slug = 'accessories';

  if not exists (select 1 from public.products where slug = 'ridge-aero') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      cycling, 'Ridge Aero', 'ridge-aero',
      'A vented cycling shield with a grippy nose bridge. The smoke lens cuts glare on open highways without flattening the road.',
      4490, 5290, 'published',
      'Ridge Aero cycling sunglasses | ChooseUrLook',
      'Vented cycling sunglasses in smoke and mirror. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1400&q=80', 'Black cycling sunglasses', 0),
      (pid, 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=1400&q=80', 'Rider in a tucked position', 1);
    insert into public.product_variants (product_id, sku, size, color, price_override) values
      (pid, 'RDA-OS-SMOKE', 'One size', 'Smoke', null) returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 18);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'RDA-OS-MIRROR', 'One size', 'Mirror') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 11);
  end if;

  if not exists (select 1 from public.products where slug = 'peloton-photochromic') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Peloton Photochromic', 'peloton-photochromic',
      'Starts clear in shade and deepens as the sun climbs. A full-wrap cycling frame that stays light on a six-hour ride.',
      5990, 'published',
      'Peloton Photochromic cycling sunglasses | ChooseUrLook',
      'Photochromic cycling sunglasses, one size.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=80', 'Photochromic lens close-up', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'PLP-OS-PHOTO', 'One size', 'Photochromic') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 9);
  end if;

  if not exists (select 1 from public.products where slug = 'stride-light') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      running, 'Stride Light', 'stride-light',
      'A featherweight running wrap. Hydrophilic pads keep it from sliding once the pace picks up.',
      3290, 3890, 'published',
      'Stride Light running sunglasses | ChooseUrLook',
      'Lightweight running sunglasses in smoke and amber.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=1400&q=80', 'Runner wearing light sunglasses', 0),
      (pid, 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80', 'Early morning run', 1);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'STL-OS-SMOKE', 'One size', 'Smoke') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 16);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'STL-OS-AMBER', 'One size', 'Amber') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 10);
  end if;

  if not exists (select 1 from public.products where slug = 'horizon-wrap') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      running, 'Horizon Wrap', 'horizon-wrap',
      'A deeper wrap for trail and road. The mirror lens throws glare off tarmac and still lets you read the path.',
      3890, 'published',
      'Horizon Wrap running sunglasses | ChooseUrLook',
      'Mirrored running sunglasses, one size.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1400&q=80', 'Mirrored wrap sunglasses', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'HZW-OS-MIRROR', 'One size', 'Mirror') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 14);
  end if;

  if not exists (select 1 from public.products where slug = 'hard-lens-case') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      acc, 'Hard Lens Case', 'hard-lens-case',
      'A rigid case with a soft lining, sized for the Ridge and Stride frames. Clips to a jersey pocket or a bag.',
      890, 'published',
      'Hard Lens Case | ChooseUrLook',
      'Hard case for cycling and running sunglasses.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1400&q=80', 'Sunglasses packed for travel', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'HLC-OS-BLACK', 'One size', 'Black') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 30);
  end if;

  if not exists (select 1 from public.products where slug = 'grip-sport-strap') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      acc, 'Grip Sport Strap', 'grip-sport-strap',
      'A slim retainer that keeps a pair on through descents and tempo runs. Fits the cycling and running frames.',
      690, 'published',
      'Grip Sport Strap | ChooseUrLook',
      'Sunglasses strap for cycling and running.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=80', 'Sport strap with sunglasses', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'GSS-OS-BLACK', 'One size', 'Black') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 40);
  end if;
end $$;
