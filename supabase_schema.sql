-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.

-- 1. Seller profile info (extra fields beyond built-in auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  phone text,
  company text,
  country text,
  created_at timestamptz default now()
);
-- Safe to re-run: adds these columns if this table already existed without them.
-- Collected once at signup so Admin has everything needed to onboard and pay a seller.
alter table profiles add column if not exists store_name text;
alter table profiles add column if not exists monthly_orders text;
alter table profiles add column if not exists whatsapp text;
alter table profiles add column if not exists bank_name text;
alter table profiles add column if not exists account_title text;
alter table profiles add column if not exists account_number text;
alter table profiles add column if not exists iban text;
-- Admin approval gate: every new seller starts 'pending' and cannot use the
-- dashboard until Admin sets this to 'approved'. Admin can also set
-- 'deactivated' later to lock an existing seller out again.
alter table profiles add column if not exists approval_status text not null default 'pending';

-- 2. Shared product catalog (admin manages this; every seller sees the same list)
create table if not exists products (
  id text primary key,
  name text not null,
  category text,
  cost numeric not null,
  sell numeric not null,
  emoji text default '📦',
  description text,
  created_at timestamptz default now()
);
-- Safe to re-run: adds the column if this table already existed without it.
alter table products add column if not exists description text;
-- Product picture: single main image (kept for backward compatibility — always
-- mirrors images[0] below, so any old code that only knows about image_url still works).
alter table products add column if not exists image_url text;
-- Product gallery: up to 4 pictures per product, stored as a JSON array of URLs.
alter table products add column if not exists images jsonb default '[]'::jsonb;
-- Stock quantity: only Admin sets/sees the exact number. Sellers only ever
-- see a derived "In Stock" / "Out of Stock" badge, never this raw number.
alter table products add column if not exists stock integer not null default 0;

-- 3. Which products each seller has added to "My Listings"
create table if not exists listings (
  id bigint generated always as identity primary key,
  seller_email text not null,
  product_id text references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(seller_email, product_id)
);

-- 4. Orders each seller logs
create table if not exists orders (
  id text primary key,
  seller_email text not null,
  product_id text,
  product_name text,
  qty int not null default 1,
  sell_price numeric not null,
  cost_price numeric not null,
  buyer text,
  city text,
  customer_email text,
  customer_phone text,
  customer_address text,
  status text not null default 'pending',
  created_at timestamptz default now()
);
-- Safe to re-run: adds these columns if this table already existed without them
-- (needed for the storefront checkout: name/city already existed as buyer/city,
-- these three are new so Admin can see exactly who placed each order).
alter table orders add column if not exists customer_email text;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists customer_address text;
-- Tracking number: set by Admin, visible to the seller on their Orders tab.
alter table orders add column if not exists tracking_number text;
-- Payment status: 'unpaid' until Admin reviews & approves the invoice, then 'paid'.
-- Sellers cannot set this themselves — only Admin can approve it.
alter table orders add column if not exists payment_status text not null default 'unpaid';
-- Flat delivery/handling charge collected from the customer on top of the product price.
-- Counted in invoice totals, but never in seller profit.
alter table orders add column if not exists delivery_charge numeric not null default 18;
-- The catalog's listed sell price at the time of order (used to calculate seller's
-- profit as: what the customer actually paid minus this listed price — not minus
-- the wholesale cost, which stays admin-only).
alter table orders add column if not exists list_price numeric;

-- Enable Row Level Security
alter table profiles enable row level security;
alter table products enable row level security;
alter table listings enable row level security;
alter table orders enable row level security;

-- Policies: signed-in users can read everything they need, and manage their own rows.
-- (Kept simple for this app; tighten further later if needed.)

drop policy if exists "profiles readable by anyone signed in" on profiles;
create policy "profiles readable by anyone signed in" on profiles
  for select using (auth.role() = 'authenticated');
drop policy if exists "users can insert their own profile" on profiles;
create policy "users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);
drop policy if exists "users can update their own profile" on profiles;
create policy "users can update their own profile" on profiles
  for update using (auth.uid() = id);
-- Needed so Admin (who is just another signed-in user in this simple model)
-- can approve/deactivate OTHER sellers' accounts, not just their own row.
drop policy if exists "profiles updatable by anyone signed in" on profiles;
create policy "profiles updatable by anyone signed in" on profiles
  for update using (auth.role() = 'authenticated');

drop policy if exists "products readable by anyone signed in" on products;
create policy "products readable by anyone signed in" on products
  for select using (auth.role() = 'authenticated');
drop policy if exists "products writable by anyone signed in" on products;
create policy "products writable by anyone signed in" on products
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "products updatable by anyone signed in" on products;
create policy "products updatable by anyone signed in" on products
  for update using (auth.role() = 'authenticated');
drop policy if exists "products deletable by anyone signed in" on products;
create policy "products deletable by anyone signed in" on products
  for delete using (auth.role() = 'authenticated');

drop policy if exists "listings readable by anyone signed in" on listings;
create policy "listings readable by anyone signed in" on listings
  for select using (auth.role() = 'authenticated');
drop policy if exists "listings writable by anyone signed in" on listings;
create policy "listings writable by anyone signed in" on listings
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "listings deletable by anyone signed in" on listings;
create policy "listings deletable by anyone signed in" on listings
  for delete using (auth.role() = 'authenticated');

drop policy if exists "orders readable by anyone signed in" on orders;
create policy "orders readable by anyone signed in" on orders
  for select using (auth.role() = 'authenticated');
drop policy if exists "orders writable by anyone signed in" on orders;
create policy "orders writable by anyone signed in" on orders
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "orders updatable by anyone signed in" on orders;
create policy "orders updatable by anyone signed in" on orders
  for update using (auth.role() = 'authenticated');

-- Seed the original demo catalog so the site isn't empty on day one
insert into products (id, name, category, cost, sell, emoji, description) values
  ('p1', 'Smart LED Ring Light 10"', 'Electronics', 38, 129, '💡', 'A 10-inch dimmable LED ring light with adjustable brightness and color tone — perfect for content creators, live selling, and video calls.'),
  ('p2', 'Wireless Earbuds Pro X', 'Electronics', 52, 169, '🎧', 'True wireless earbuds with active noise cancellation, deep bass, and up to 30 hours of battery life with the charging case.'),
  ('p3', 'Portable Blender Bottle', 'Home', 29, 99, '🧃', 'A rechargeable personal blender bottle for shakes and smoothies on the go — USB-C charging, powerful motor, easy to clean.'),
  ('p4', 'Magnetic Car Phone Mount', 'Accessories', 14, 59, '📱', 'A strong magnetic dashboard/vent mount that holds any phone securely while driving, with 360° rotation.'),
  ('p5', 'Arabic Oud Perfume 50ml', 'Beauty', 41, 149, '🧴', 'A rich, long-lasting Arabic oud fragrance in a 50ml bottle — a regional favorite for everyday wear and gifting.'),
  ('p6', 'Smart Fitness Band S3', 'Electronics', 47, 159, '⌚', 'A slim fitness tracker with heart-rate monitoring, sleep tracking, and smartphone notifications, water-resistant.'),
  ('p7', 'Non-Stick Cookware Set', 'Home', 88, 249, '🍳', 'A complete non-stick cookware set built for everyday cooking — even heat distribution and easy cleanup.'),
  ('p8', 'LED Galaxy Star Projector', 'Home', 33, 119, '🌌', 'A galaxy and nebula star projector with multiple lighting modes — a popular bedroom and home-decor item.')
on conflict (id) do nothing;

-- Auto-create a profile row the moment someone signs up, using a server-side
-- trigger (bypasses RLS, works even before the email is confirmed).
-- Fixes the "Welcome back, someone@email.com" issue where the name never saved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, company, country, store_name, monthly_orders, whatsapp, bank_name, account_title, account_number, iban)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'store_name',
    new.raw_user_meta_data->>'monthly_orders',
    new.raw_user_meta_data->>'whatsapp',
    new.raw_user_meta_data->>'bank_name',
    new.raw_user_meta_data->>'account_title',
    new.raw_user_meta_data->>'account_number',
    new.raw_user_meta_data->>'iban'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Site settings (currently just the logo picture the admin can upload).
--    Readable by everyone — including logged-out visitors on the homepage —
--    but only signed-in users can write to it, matching the other tables.
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
alter table app_settings enable row level security;

drop policy if exists "app_settings readable by anyone" on app_settings;
create policy "app_settings readable by anyone" on app_settings
  for select using (true);
drop policy if exists "app_settings writable by anyone signed in" on app_settings;
create policy "app_settings writable by anyone signed in" on app_settings
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "app_settings updatable by anyone signed in" on app_settings;
create policy "app_settings updatable by anyone signed in" on app_settings
  for update using (auth.role() = 'authenticated');

-- Storage bucket for the uploaded logo (and any other public site pictures).
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

drop policy if exists "public-assets are publicly readable" on storage.objects;
create policy "public-assets are publicly readable" on storage.objects
  for select using (bucket_id = 'public-assets');
drop policy if exists "public-assets uploadable by signed in users" on storage.objects;
create policy "public-assets uploadable by signed in users" on storage.objects
  for insert with check (bucket_id = 'public-assets' and auth.role() = 'authenticated');
drop policy if exists "public-assets updatable by signed in users" on storage.objects;
create policy "public-assets updatable by signed in users" on storage.objects
  for update using (bucket_id = 'public-assets' and auth.role() = 'authenticated');

-- 6. Product reviews — Admin can add/edit/delete reviews shown on each
--    product's storefront page (Reviews tab). Until a product has at least
--    one real review here, the storefront falls back to sample reviews so
--    pages don't look empty.
create table if not exists reviews (
  id bigint generated always as identity primary key,
  product_id text not null references products(id) on delete cascade,
  name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  body text not null,
  created_at timestamptz default now()
);
alter table reviews enable row level security;

drop policy if exists "reviews readable by anyone signed in" on reviews;
create policy "reviews readable by anyone signed in" on reviews
  for select using (auth.role() = 'authenticated');
drop policy if exists "reviews writable by anyone signed in" on reviews;
create policy "reviews writable by anyone signed in" on reviews
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "reviews updatable by anyone signed in" on reviews;
create policy "reviews updatable by anyone signed in" on reviews
  for update using (auth.role() = 'authenticated');
drop policy if exists "reviews deletable by anyone signed in" on reviews;
create policy "reviews deletable by anyone signed in" on reviews
  for delete using (auth.role() = 'authenticated');
