-- Sample catalogue: cycling sunglasses, running sunglasses, accessories, ladies looks.
-- Safe to re-run: skips slugs that already exist. Apply migrations first.

do $$
declare
  cycling uuid;
  running uuid;
  acc uuid;
  ladies uuid;
  pid uuid;
  vid uuid;
begin
  select id into cycling from public.categories where slug = 'cycling';
  select id into running from public.categories where slug = 'running';
  select id into acc from public.categories where slug = 'accessories';
  select id into ladies from public.categories where slug = 'ladies';

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
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'RDA-OS-SMOKE', 'One size', 'Smoke') returning id into vid;
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

  if not exists (select 1 from public.products where slug = 'sculpted-leather-bag') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      acc, 'Sculpted Leather Bag', 'sculpted-leather-bag',
      'Vegetable-tanned leather with room for a case, keys and a phone. A strap that sits at the hip.',
      7490, 8900, 'published',
      'Sculpted Leather Bag | ChooseUrLook',
      'Tan and black leather shoulder bag.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1400&q=80', 'Tan leather shoulder bag', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'SLB-OS-TAN', 'One size', 'Tan') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 6);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'SLB-OS-BLACK', 'One size', 'Black') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 4);
  end if;

  if not exists (select 1 from public.products where slug = 'gold-hoop-edit') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      ladies, 'Gold Hoop Edit', 'gold-hoop-edit',
      'Lightweight hoops with a brushed finish. Sold as a pair. Plated brass, nickel-safe posts.',
      1890, 'published',
      'Gold Hoop Edit | ChooseUrLook',
      'Brushed gold hoop earrings, small and medium.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1400&q=80', 'Brushed gold hoops', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'GHE-S-GOLD', 'Small', 'Gold') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 20);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'GHE-M-GOLD', 'Medium', 'Gold') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 15);
  end if;

  if not exists (select 1 from public.products where slug = 'linen-resort-set') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      ladies, 'Linen Resort Set', 'linen-resort-set',
      'A washed-linen shirt and wide trouser, sold as a set. The piece you change into when the ride is done.',
      6490, 'published',
      'Linen Resort Set | ChooseUrLook',
      'Washed linen co-ord in ivory and olive.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1400&q=80', 'Ivory linen set', 0);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'LRS-S-IVORY', 'S', 'Ivory') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 9);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'LRS-M-OLIVE', 'M', 'Olive') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 7);
  end if;

  if not exists (select 1 from public.products where slug = 'silk-column-dress') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      ladies, 'Silk Column Dress', 'silk-column-dress',
      'A bias-cut silk column with a quiet sheen. From a late lunch to an evening without a change of clothes.',
      8990, 10990, 'published',
      'Silk Column Dress | ChooseUrLook',
      'Bias-cut silk column dress in sand, ink and wine.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1400&q=80', 'Sand silk column dress', 0),
      (pid, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80', 'Dress styled with a structured bag', 1);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'SCD-S-SAND', 'S', 'Sand') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'SCD-M-INK', 'M', 'Ink') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 6);
    insert into public.product_variants (product_id, sku, size, color) values (pid, 'SCD-L-WINE', 'L', 'Wine') returning id into vid;
    insert into public.inventory (variant_id, available_quantity) values (vid, 4);
  end if;
end $$;
