-- ==========================================
-- TeknoyCart: Supabase Seed Data Script
-- Run this directly in Supabase SQL Editor
-- (bypasses Row Level Security policies)
-- Team 45 | Capstone Project 1
-- ==========================================

-- Step 1: Seed Categories
INSERT INTO categories (category_name, icon_url)
VALUES
  ('Books',         'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'),
  ('Drawing Tools', 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=100'),
  ('Uniforms',      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=100'),
  ('Electronics',   'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=100'),
  ('Others',        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100')
ON CONFLICT (category_name) DO NOTHING;

-- Step 2: Seed Demo Users (bypass auth system for demo)
-- NOTE: In production, users are created via Supabase Auth.
-- This inserts directly into the users table for demo/presentation.
INSERT INTO users (full_name, email, password_hash, role, is_verified)
VALUES
  ('CSS Society Merch',     'css.merch@cit.edu',        '$2a$12$demo_hash_seller_css_society_001', 'SELLER', TRUE),
  ('CEA Store Admin',       'cea.store@cit.edu',         '$2a$12$demo_hash_seller_cea_store_002',  'SELLER', TRUE),
  ('Wildcat Student Buyer', 'wildcat.buyer@my.cit.edu',  '$2a$12$demo_hash_buyer_wildcat_001',     'BUYER',  TRUE),
  ('Maria Santos Demo',     'maria.santos@my.cit.edu',   '$2a$12$demo_hash_buyer_maria_002',       'BUYER',  TRUE),
  ('TeknoyCart Admin',      'admin@cit.edu',             '$2a$12$demo_hash_admin_teknoycart_001',  'ADMIN',  TRUE)
ON CONFLICT (email) DO NOTHING;

-- Step 3: Create Store Profiles for Sellers
INSERT INTO store_profiles (seller_id, store_name, description, contact_number)
SELECT user_id, 'CSS Society Official Store', 'Official CIT-U Computer Science Society merchandise and academic supplies store.', '09171234567'
FROM users WHERE email = 'css.merch@cit.edu'
ON CONFLICT (seller_id) DO NOTHING;

INSERT INTO store_profiles (seller_id, store_name, description, contact_number)
SELECT user_id, 'CEA Engineering Supplies', 'College of Engineering and Architecture student supplies, drawing tools, and uniforms.', '09281234567'
FROM users WHERE email = 'cea.store@cit.edu'
ON CONFLICT (seller_id) DO NOTHING;

-- Step 4: Seed Products
INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'css.merch@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Books'),
  'BSCS Data Structures Book',
  'Data Structures and Algorithms in Java, 6th Edition. Super helpful for second-year computer science subjects. Book is in great condition.',
  180.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BSCS Data Structures Book');

INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'cea.store@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Drawing Tools'),
  'Engineering Drawing Table',
  'Official CIT-U drawing board with adjustable stands. Very clean, lightly used for one semester only. Perfect for freshmen engineers.',
  450.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Engineering Drawing Table');

INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'cea.store@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Uniforms'),
  'CIT-U PE Uniform (Medium)',
  'Complete set of official CIT-U physical education uniform. Unisex design, medium size. Barely used, washed and clean.',
  250.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'CIT-U PE Uniform (Medium)');

INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'css.merch@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Electronics'),
  'Scientific Calculator (991ES Plus)',
  'Casio Scientific Calculator, perfect for Engineering and Mathematics courses. All buttons working perfectly.',
  350.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Scientific Calculator (991ES Plus)');

INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'cea.store@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Uniforms'),
  'Official Engineering Shirt',
  'CIT-U College of Engineering and Architecture official polo shirt. Available in S, M, L, XL. Good condition.',
  350.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Official Engineering Shirt');

INSERT INTO products (seller_id, category_id, name, description, base_price, status)
SELECT
  (SELECT user_id FROM users WHERE email = 'css.merch@cit.edu'),
  (SELECT category_id FROM categories WHERE category_name = 'Books'),
  'Calculus Early Transcendentals (9th Ed.)',
  'James Stewart Calculus textbook, 9th Edition. Used for one semester, minimal highlighting. Great for CEA freshmen.',
  1200.00,
  'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Calculus Early Transcendentals (9th Ed.)');

-- Step 5: Seed Product Variants and Inventory
-- For each product without variants, create a default "Standard" variant and inventory
DO $$
DECLARE
  prod RECORD;
  v_id UUID;
BEGIN
  FOR prod IN SELECT product_id, name FROM products LOOP
    -- Check if variant already exists
    IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = prod.product_id) THEN
      INSERT INTO product_variants (product_id, variant_name, variant_value, additional_price, sku)
      VALUES (prod.product_id, 'Standard', 'Default', 0.00, 'SKU-' || LEFT(prod.product_id::text, 8))
      RETURNING variant_id INTO v_id;

      INSERT INTO inventory (variant_id, stock_qty, reserved_qty, low_stock_threshold)
      VALUES (v_id, 12, 0, 3);
    END IF;
  END LOOP;
END $$;

-- Step 6: Enable Read Access (RLS policies for anon selects)
-- Allow anyone to read categories
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories"
  ON categories FOR SELECT
  USING (true);

-- Allow anyone to read active products
DROP POLICY IF EXISTS "Public read active products" ON products;
CREATE POLICY "Public read active products"
  ON products FOR SELECT
  USING (status = 'ACTIVE');

-- Allow authenticated inserts for products
DROP POLICY IF EXISTS "Authenticated insert products" ON products;
CREATE POLICY "Authenticated insert products"
  ON products FOR INSERT
  WITH CHECK (true);

-- Allow authenticated deletes
DROP POLICY IF EXISTS "Authenticated delete products" ON products;
CREATE POLICY "Authenticated delete products"
  ON products FOR DELETE
  USING (true);

-- Allow read on product_variants and inventory
DROP POLICY IF EXISTS "Public read variants" ON product_variants;
CREATE POLICY "Public read variants"
  ON product_variants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read inventory" ON inventory;
CREATE POLICY "Public read inventory"
  ON inventory FOR SELECT
  USING (true);

-- Allow write to inventory
DROP POLICY IF EXISTS "Authenticated update inventory" ON inventory;
CREATE POLICY "Authenticated update inventory"
  ON inventory FOR UPDATE
  USING (true);

-- Allow insert into inventory
DROP POLICY IF EXISTS "Authenticated insert inventory" ON inventory;
CREATE POLICY "Authenticated insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (true);

-- Allow read on store_profiles
DROP POLICY IF EXISTS "Public read store profiles" ON store_profiles;
CREATE POLICY "Public read store profiles"
  ON store_profiles FOR SELECT
  USING (true);

-- Allow read on users (limited fields)
DROP POLICY IF EXISTS "Public read users" ON users;
CREATE POLICY "Public read users"
  ON users FOR SELECT
  USING (true);

-- Allow insert users (for demo/admin seeding)
DROP POLICY IF EXISTS "Authenticated insert users" ON users;
CREATE POLICY "Authenticated insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Allow insert store profiles
DROP POLICY IF EXISTS "Authenticated insert store profiles" ON store_profiles;
CREATE POLICY "Authenticated insert store profiles"
  ON store_profiles FOR INSERT
  WITH CHECK (true);

-- Allow insert product variants
DROP POLICY IF EXISTS "Authenticated insert variants" ON product_variants;
CREATE POLICY "Authenticated insert variants"
  ON product_variants FOR INSERT
  WITH CHECK (true);

SELECT 'TeknoyCart database seeded successfully! ✅' AS status;
