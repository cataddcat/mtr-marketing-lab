# Stripe Setup (Track D2)

The app's `TierSwitcher` toggles between **Free / BYOK / Paid (Pro)** at any
time. With Stripe configured, "Upgrade" → real Stripe Checkout. Without it,
the toggle is local-only (great for testing the UX without billing).

## Why Payment Links (not API Checkout)?

Payment Links don't require a backend — you create them once in the Stripe
Dashboard, copy URLs, and the app redirects to them. The user enters card
details on Stripe's hosted page, then a **webhook** flips
`profiles.tier = 'paid'` server-side. This is the architecture we're shipping
for Phase D2.

Real production should add a server-side **Checkout Session** endpoint when
you need dynamic pricing, promo codes per user, or trial logic.

## 1. Create the Pro products

In **Stripe Dashboard → Products → New product**:

- **Marnthara Pro — Monthly**: ฿890 THB · recurring monthly
- **Marnthara Pro — Yearly**: ฿8,900 THB · recurring yearly (save 17%)

Save and note each price ID (`price_xxxxx`).

## 2. Create Payment Links

In **Stripe Dashboard → Payment Links → New**:

For each product above:
- Pick the price
- **After payment**: redirect to `https://your-app.example.com/?upgraded=1`
  (the app reads this hint and re-fetches the profile)
- **Collect customer ID** (`client_reference_id` will be filled with the
  Supabase user UUID — your webhook uses it to find the right profile)

Copy the link URLs and paste into `.env`:

```
VITE_STRIPE_LINK_MONTHLY=https://buy.stripe.com/test_xxx
VITE_STRIPE_LINK_YEARLY=https://buy.stripe.com/test_yyy
```

## 3. Set up the Customer Portal

**Stripe Dashboard → Settings → Customer Portal**:
- Enable subscription management (cancel, switch plan, update card)
- Configure your business info + terms link
- Copy the live portal URL

```
VITE_STRIPE_CUSTOMER_PORTAL=https://billing.stripe.com/p/login/xxx
```

## 4. Webhook — the source of truth

Stripe Payment Links **do not update Supabase by themselves**. You need a
webhook handler that listens for `checkout.session.completed` and
`customer.subscription.updated`, then writes back to `public.profiles`.

The plan describes this as `proxy/src/stripe-webhook.ts` (Cloudflare Worker
endpoint). Until that's deployed:

- The user pays → tier reflects manually
- Use the TierSwitcher's "Pro" button only after you've confirmed payment
- Plan to add the webhook before opening this to real customers

A minimum-viable webhook does:

```ts
// pseudo-code
on('checkout.session.completed', async (event) => {
  const userId = event.data.object.client_reference_id;
  const customerId = event.data.object.customer;
  const subscriptionId = event.data.object.subscription;
  await supabase
    .from('profiles')
    .update({
      tier: 'paid',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      tier_changed_at: new Date().toISOString(),
    })
    .eq('id', userId);
});

on('customer.subscription.deleted', async (event) => {
  const customerId = event.data.object.customer;
  await supabase
    .from('profiles')
    .update({ tier: 'free', tier_changed_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId);
});
```

## 5. Tax (THB / Thailand)

If you're a VAT-registered business in Thailand:
- Stripe Tax handles this automatically (enable in **Settings → Tax**)
- Add 7% VAT to your prices in Stripe Tax registration

## 6. Test mode → Live mode

Test mode keys + Payment Links start with `pk_test_...` / `buy.stripe.com/test_...`.
Switch to live by toggling the Dashboard mode and re-creating links with live
keys. Update `.env` accordingly.

## Local-only fallback

If you skip Stripe entirely:
- TierSwitcher still works — the "Upgrade" button shows a toast
- Free/BYOK/Pro toggle via the non-Stripe buttons; tier persists per-user in
  `profiles.tier` (Supabase) or `localStorage.mtr_local_tier` (no auth)
- Use this for development + showing the gated UX to stakeholders before
  payment infra lands
