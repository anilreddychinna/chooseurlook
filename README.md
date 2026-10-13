# ChooseUrLook

Angular storefront for the ChooseUrLook shop. Supabase holds the catalogue, accounts, carts and orders. Razorpay, shipping quotes and email run in Supabase Edge Functions so secret keys stay off the browser.

## 1. Connect the app

Open `cul-app/src/environments/environment.ts` and set:

- `supabaseUrl` — Project Settings → API → Project URL
- `supabaseAnonKey` — the anon public key
- `razorpayKeyId` — Razorpay Key Id, when you are ready to take prepaid orders

The anon key is safe in the frontend. Do not put the service role key, Razorpay secret, or email password in this file.

## 2. Create the database

In the Supabase SQL editor, run these files in order:

1. `supabase/migrations/20261010000000_init_commerce.sql`
2. `supabase/seed.sql`

Then create your login in the app and promote it:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@chooseurlook.com';
```

## 3. Run the shop

```bash
cd cul-app
npm install
npm start
```

Open http://localhost:4200. Sample categories and products come from the seed. Admin lives at `/admin`.

## 4. Payments, shipping and email

Deploy the functions in `supabase/functions` and set secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY` and `EMAIL_FROM` when you want order email

Point the Razorpay webhook at `razorpay-webhook`. Checkout recalculates price and stock in Postgres. Closing the Razorpay window does not mark an order paid. Unpaid reservations older than 30 minutes are released on the next checkout.

Shipping is ₹99, or free from ₹1,999. Coupons `WELCOME10` and `FREESHIP` are in the seed. Save AWB and tracking from the admin order page. Cash on delivery is available at checkout.

## 5. Deploy

`npm run build` inside `cul-app` produces the browser and server bundles. `vercel.json` is set for the Angular app. Public product and category pages render on the server. Account, cart, checkout and admin stay in the browser. `/sitemap.xml` and `/robots.txt` are served by the Node server.
