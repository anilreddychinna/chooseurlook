-- Ten in-stock sunglasses from
-- https://www.thebikeaffair.com/collections/sunglasses?filter.v.availability=1
-- listed on 13 Oct 2026.
--
-- Prices are the rupee prices shown on that page. Where the page says "From",
-- that lowest price is stored on the product. Colour variants share it.
-- The myopic glass support on the same page is not a pair of sunglasses, so it
-- is not included. Kapvoe X75 is the tenth pair.
-- Photos are placeholders. Stock counts are placeholders: the page only says
-- these are in stock.

do $$
declare
  cycling uuid;
  pid uuid;
  vid uuid;
  shade text;
  shades text[];
begin
  select id into cycling from public.categories where slug = 'cycling';
  if cycling is null then
    raise exception 'Cycling category is missing. Run the sunglasses edit migration first.';
  end if;

  if not exists (select 1 from public.products where slug = 'magicshine-windbreaker-classic') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Magicshine Windbreaker Classic Sunglasses', 'magicshine-windbreaker-classic',
      'A full cycling shield from Magicshine, with a vented brow and interchangeable frame colours.',
      3750, 'published',
      'Magicshine Windbreaker Classic Sunglasses | ChooseUrLook',
      'Magicshine Windbreaker Classic cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1400&q=80', 'Black cycling sunglasses', 0);
    shades := array['Black', 'Blue', 'Blue/Grey', 'Coffee Brown', 'Forest Green', 'Gold', 'Lake Placid Blue'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'MS-WBC-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'tifosi-swick') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Tifosi Swick Sunglasses', 'tifosi-swick',
      'A light Tifosi sport wrap. Listed from ₹2,790, with smoke, fade and polarised frame options.',
      2790, 'published',
      'Tifosi Swick Sunglasses | ChooseUrLook',
      'Tifosi Swick cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=80', 'Sport sunglasses close-up', 0);
    shades := array['Blackout Smoke', 'Brown Fade', 'Orange Quartz/Smoke Bright Blue', 'Satin Black/Neon', 'Satin Black/Crimson', 'Satin Vapor Emerald Polarized', 'Satin Vapor/Smoke'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'TF-SWK-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'oakley-hydra') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      cycling, 'Oakley Hydra Sunglasses', 'oakley-hydra',
      'Oakley Hydra with a Prizm lens. The page lists it from ₹9,441, down from ₹10,490.',
      9441, 10490, 'published',
      'Oakley Hydra Sunglasses | ChooseUrLook',
      'Oakley Hydra cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1400&q=80', 'Mirrored sport sunglasses', 0);
    shades := array['Black Ink/Prizm 24k', 'Black Ink/Prizm Black', 'Crystal Black/Prizm Violet', 'Neon Orange/Prizm Sapphire', 'Rootbeer/Prizm Tungsten', 'Translucent Blue/Prizm Jade'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'OK-HYD-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'kapvoe-x76') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Kapvoe X76 Sports Sunglasses', 'kapvoe-x76',
      'A Kapvoe sport shield in several two-tone frames, listed at ₹3,495.',
      3495, 'published',
      'Kapvoe X76 Sports Sunglasses | ChooseUrLook',
      'Kapvoe X76 cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=1400&q=80', 'Rider wearing sport sunglasses', 0);
    shades := array['Blue/White', 'Gold', 'Purple/Black', 'Red/Black', 'Black', 'Black/Blue', 'Purple/Clear'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'KV-X76-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'oakley-radar-ev-path') then
    insert into public.products (category_id, name, slug, description, price, compare_at_price, status, seo_title, seo_description)
    values (
      cycling, 'Oakley Radar EV Path Sunglasses', 'oakley-radar-ev-path',
      'Oakley Radar EV Path, a long cycling shield. Listed from ₹8,901, down from ₹9,890.',
      8901, 9890, 'published',
      'Oakley Radar EV Path Sunglasses | ChooseUrLook',
      'Oakley Radar EV Path cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1400&q=80', 'Dark shield sunglasses', 0);
    shades := array['Carbon/Prizm Rose Gold', 'Grey Ink/Prizm Road Black', 'Matte Black/Prizm Deep Water Polarized', 'Holographic/Prizm Grey', 'Matte Black/Prizm Road', 'Matte Black/Prizm Trail Torch', 'Matte Celeste/Prizm Road'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'OK-RAD-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'kapvoe-knight-nano') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Kapvoe Knight Nano Lens Sports Glasses', 'kapvoe-knight-nano',
      'Kapvoe Knight glasses with a nano lens, listed at ₹5,995 in three frame finishes.',
      5995, 'published',
      'Kapvoe Knight Nano Lens Sports Glasses | ChooseUrLook',
      'Kapvoe Knight Nano cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1400&q=80', 'Sport glasses on a light background', 0);
    shades := array['Kaleidoscope', 'Knight Phantom', 'Glory Starlight'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'KV-KNT-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'kapvoe-x2') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Kapvoe X2 Sports Sunglasses', 'kapvoe-x2',
      'A Kapvoe X2 wrap for the bike, listed at ₹3,850.',
      3850, 'published',
      'Kapvoe X2 Sports Sunglasses | ChooseUrLook',
      'Kapvoe X2 cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80', 'Sunglasses worn on a ride', 0);
    shades := array['Blue', 'Red/White', 'Silver/Black', 'Blue/Green'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'KV-X2-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'bliz-motion') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Bliz Motion Sport Sunglasses', 'bliz-motion',
      'Bliz Motion sport sunglasses with a smoke lens and silver mirror, listed at ₹2,400.',
      2400, 'published',
      'Bliz Motion Sport Sunglasses | ChooseUrLook',
      'Bliz Motion cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1400&q=80', 'Mirrored sport sunglasses', 0);
    shades := array['Metallic Black/Smoke w Silver Mirror', 'Metallic Blue/Smoke w Silver Mirror'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'BZ-MOT-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'kapvoe-x87') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Kapvoe X87 Color Polarized Glasses', 'kapvoe-x87',
      'Polarised Kapvoe X87 glasses, listed at ₹2,350 in two frame colours.',
      2350, 'published',
      'Kapvoe X87 Color Polarized Glasses | ChooseUrLook',
      'Kapvoe X87 polarised cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=1400&q=80', 'Polarised sport sunglasses', 0);
    shades := array['Blue/Black', 'Red/Black'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'KV-X87-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;

  if not exists (select 1 from public.products where slug = 'kapvoe-x75') then
    insert into public.products (category_id, name, slug, description, price, status, seo_title, seo_description)
    values (
      cycling, 'Kapvoe X75 Half Frame Sport Sunglasses', 'kapvoe-x75',
      'A Kapvoe half-frame sport pair, listed at ₹3,495.',
      3495, 'published',
      'Kapvoe X75 Half Frame Sport Sunglasses | ChooseUrLook',
      'Kapvoe X75 half-frame cycling sunglasses. GST included.'
    ) returning id into pid;
    insert into public.product_images (product_id, storage_path, alt_text, sort_order) values
      (pid, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1400&q=80', 'Half-frame sport sunglasses', 0);
    shades := array['Blue/White', 'Purple/White', 'Red/Black', 'Red/Gold', 'Black'];
    foreach shade in array shades loop
      insert into public.product_variants (product_id, sku, size, color)
      values (pid, 'KV-X75-' || upper(substr(md5(shade), 1, 6)), 'One size', shade) returning id into vid;
      insert into public.inventory (variant_id, available_quantity) values (vid, 8);
    end loop;
  end if;
end $$;
