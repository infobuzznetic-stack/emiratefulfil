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

-- 2. Shared product catalog (admin manages this; every seller sees the same list)
create table if not exists products (
  id text primary key,
  name text not null,
  category text,
  cost numeric not null,
  sell numeric not null,
  emoji text default '📦',
  created_at timestamptz default now()
);

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
  status text not null default 'pending',
  created_at timestamptz default now()
);

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
insert into products (id, name, category, cost, sell, emoji) values
  ('p1', 'Smart LED Ring Light 10"', 'Electronics', 38, 129, '💡'),
  ('p2', 'Wireless Earbuds Pro X', 'Electronics', 52, 169, '🎧'),
  ('p3', 'Portable Blender Bottle', 'Home', 29, 99, '🧃'),
  ('p4', 'Magnetic Car Phone Mount', 'Accessories', 14, 59, '📱'),
  ('p5', 'Arabic Oud Perfume 50ml', 'Beauty', 41, 149, '🧴'),
  ('p6', 'Smart Fitness Band S3', 'Electronics', 47, 159, '⌚'),
  ('p7', 'Non-Stick Cookware Set', 'Home', 88, 249, '🍳'),
  ('p8', 'LED Galaxy Star Projector', 'Home', 33, 119, '🌌')
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
  insert into public.profiles (id, email, name, phone, company, country)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
