# EmirateFulfil — now backed by Supabase (shared, real data)

Signups, orders, listings and the product catalog are now stored in a real
shared Supabase database — every visitor sees the same data, from any device.
The old `storageShim.js` / localStorage version has been removed.

## 1. Get your Supabase keys (this is the part you were stuck on)
1. Go to https://supabase.com/dashboard and open your project.
2. Bottom-left corner → click the **gear icon (Settings)**.
3. Click **Data API** (older Supabase UIs call this tab **API**).
4. Copy two values:
   - **Project URL** — looks like `https://abcdxyz.supabase.co`
   - **anon public** key — a long string under "Project API keys"
5. Open `src/supabaseClient.js` in this project and paste them in:
   ```js
   const SUPABASE_URL = "https://abcdxyz.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-public-key";
   ```
6. In the same file, add your own email to `ADMIN_EMAILS` — that's the
   account that will see the new **Admin** tab in the dashboard.

Never use the "service_role" key here — only "anon public".

## 2. Create the database tables
1. In Supabase, go to **SQL Editor** → **New query**.
2. Paste the contents of `supabase_schema.sql` (included in this folder) and click **Run**.
   This creates the `profiles`, `products`, `listings`, and `orders` tables,
   sets up security rules, and seeds the original 8 demo products.

## 3. Turn off "Confirm email" for a smoother signup (recommended for now)
Supabase requires email confirmation by default, which would block sellers
from using the dashboard right after signing up.
Go to **Authentication → Sign In / Providers → Email**, and turn off
**"Confirm email"**. You can turn it back on later once you set up an email
provider.

## 4. Run locally
```
npm install
npm run dev
```

## 5. Deploy live (same as before)
1. Push this whole folder to your GitHub repo (all files — `src/`, `package.json`, `vite.config.js`, `index.html`).
2. Go to https://vercel.com → your project → it auto-redeploys on every push.
   (Your live URL: https://emiratefulfil.vercel.app/)

## New: full product storefront + checkout
The **Products** tab is now a mini storefront instead of just a browse grid:
- Each card shows the product image (emoji), title, and price, with **Add to Cart** and **Buy Now** buttons.
- Clicking a product opens its own **landing page** (bigger image, description, price, quantity, Add to Cart / Buy Now).
- **Add to Cart** builds a cart (with a cart icon + badge); **Buy Now** skips straight to checkout for just that item.
- Checkout collects the customer's **name, email, phone, emirate, and address**, then places the order(s).
- The **Admin** tab's order table now shows the customer's name, email, phone, and address/emirate for every order, from any seller.

### If you already ran `supabase_schema.sql` before
You don't need to redo the whole file — it's safe to re-run entirely (it uses
`create table if not exists` / `on conflict do nothing`), but if you only want
the new bits, just run this in the SQL Editor:
```sql
alter table products add column if not exists description text;
alter table orders add column if not exists customer_email text;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists customer_address text;
```

## What's new
- **Real accounts**: signup/login now use Supabase Auth (`auth.users` + a `profiles` table for name/company/etc).
- **Shared data**: orders and listings are stored per-seller in shared tables — visible from any device/browser.
- **Admin tab**: any account whose email is listed in `ADMIN_EMAILS` (in `src/supabaseClient.js`) sees an **Admin** tab in the sidebar showing:
  - Total sellers signed up
  - A form to add new products to the shared catalog
  - A way to remove products from the catalog
  All sellers immediately see whatever products the admin adds/removes.

## Still worth doing later
- Payouts and wallet are still a demo (no real bank transfer).
- Consider tightening the SQL security policies (`supabase_schema.sql`) once
  you have real users — right now any signed-in user can edit any product,
  which is fine for a small trusted admin-only catalog but not for a large
  public marketplace.
