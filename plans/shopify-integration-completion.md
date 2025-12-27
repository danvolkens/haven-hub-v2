# Shopify Integration Completion Plan

**Goal:** Complete the Shopify integration from ~50% to 100%

**Current State:**
- OAuth connection flow (working)
- Shopify REST API client (working)
- Product publishing TO Shopify (working)
- 8 webhooks registered on connection (registered but NOT processed)
- Database schema ready

**Missing:**
- Webhook handlers (critical - data never flows FROM Shopify)
- Dedicated Shopify settings page
- Order/customer sync
- Product import from Shopify
- Real-time inventory management
- Attribution to Shopify sales

---

## Phase 1: Webhook Infrastructure (Critical Path)

The webhooks are registered but there's NO handler to receive them. This is why "deep integration" feels missing - data only flows one way.

### 1.1 Create Webhook Handler Route

**File:** `src/app/api/webhooks/shopify/route.ts`

```typescript
// Handles all 8 registered webhook topics:
// - orders/create
// - orders/updated
// - checkouts/create
// - checkouts/update
// - customers/create
// - customers/update
// - products/update
// - app/uninstalled
```

**Requirements:**
- Verify HMAC signature (security - prevent spoofed webhooks)
- Parse `X-Shopify-Topic` header to route to handler
- Lookup user by shop domain in integrations table
- Process webhook asynchronously (return 200 immediately)
- Log all webhook events for debugging

### 1.2 Webhook Service

**File:** `src/lib/integrations/shopify/webhook-service.ts`

Handlers for each topic:

| Topic | Action |
|-------|--------|
| `orders/create` | Create/update customer, record touchpoint, update attribution, increment product stats |
| `orders/updated` | Update order status, handle refunds |
| `checkouts/create` | Record abandoned checkout (for recovery emails) |
| `checkouts/update` | Update checkout status, mark recovered if completed |
| `customers/create` | Create/update customer in customers table |
| `customers/update` | Sync customer changes |
| `products/update` | Sync product changes back (price, inventory, status) |
| `app/uninstalled` | Mark integration disconnected, clean up webhooks |

### 1.3 Database Migration for Orders

**File:** `supabase/migrations/040_shopify_orders.sql`

```sql
CREATE TABLE shopify_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  shopify_order_id TEXT NOT NULL,
  shopify_order_number TEXT,

  -- Customer reference
  customer_id UUID REFERENCES customers(id),
  email TEXT,

  -- Order details
  total_price NUMERIC(10,2),
  subtotal_price NUMERIC(10,2),
  total_tax NUMERIC(10,2),
  total_discounts NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',

  -- Status
  financial_status TEXT, -- pending, paid, refunded, etc.
  fulfillment_status TEXT, -- null, partial, fulfilled

  -- Line items (JSONB for flexibility)
  line_items JSONB,

  -- Attribution
  attributed_pin_id UUID,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Timestamps
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, shopify_order_id)
);
```

---

## Phase 2: Shopify Settings Page

### 2.1 Settings Page

**File:** `src/app/(dashboard)/dashboard/settings/shopify/page.tsx`

**Sections:**

1. **Connection Status**
   - Shop name, domain
   - Connection date
   - Disconnect button

2. **Sync Status**
   - Last product sync
   - Last order sync
   - Webhook health (list registered webhooks, show last received)

3. **Product Sync Controls**
   - "Import Products from Shopify" button
   - Auto-sync toggle
   - Sync frequency selector

4. **Order Sync Status**
   - Total orders synced
   - Last order synced
   - Manual "Sync Orders" button

5. **Webhook Management**
   - List all registered webhooks
   - Re-register button (if webhooks missing)
   - Test webhook button

### 2.2 API Routes

**Files:**
- `src/app/api/integrations/shopify/status/route.ts` - Get connection status, webhook health
- `src/app/api/integrations/shopify/sync-products/route.ts` - Import products from Shopify
- `src/app/api/integrations/shopify/sync-orders/route.ts` - Import historical orders
- `src/app/api/integrations/shopify/webhooks/route.ts` - List/re-register webhooks

---

## Phase 3: Order Sync & Attribution

### 3.1 Order Processing Service

**File:** `src/lib/integrations/shopify/order-service.ts`

```typescript
export async function processShopifyOrder(userId: string, order: ShopifyOrder) {
  // 1. Upsert customer
  const customer = await upsertCustomerFromOrder(userId, order);

  // 2. Create/update order record
  await upsertShopifyOrder(userId, order, customer.id);

  // 3. Update product stats (views, orders, revenue)
  await updateProductStats(userId, order.line_items);

  // 4. Record attribution event
  await recordAttributionEvent(userId, order, customer.id);

  // 5. Record touchpoint
  await recordTouchpoint(userId, customer.id, 'purchase', order);

  // 6. Update customer stage
  await updateCustomerStage(customer.id, 'purchase');

  // 7. Check for recovered abandoned checkout
  await checkRecoveredCheckout(userId, order);
}
```

### 3.2 Historical Order Import

**File:** `src/lib/integrations/shopify/order-import.ts`

- Paginate through all orders via Shopify API
- Process each order through order-service
- Track import progress
- Handle rate limiting

---

## Phase 4: Customer Sync

### 4.1 Customer Sync Service

**File:** `src/lib/integrations/shopify/customer-service.ts`

```typescript
export async function syncCustomerFromShopify(userId: string, shopifyCustomer: ShopifyCustomer) {
  // 1. Find or create customer by email
  // 2. Update Shopify customer ID
  // 3. Update metrics (total_orders, lifetime_value)
  // 4. Update stage based on order history
  // 5. Sync to Klaviyo if connected
}
```

### 4.2 Customer Import (Historical)

Import existing Shopify customers into customers table.

---

## Phase 5: Product Sync (Bidirectional)

### 5.1 Import Products from Shopify

**File:** `src/lib/integrations/shopify/product-import.ts`

Currently we only PUSH products to Shopify. Need to also PULL:

```typescript
export async function importProductsFromShopify(userId: string) {
  const client = await getShopifyClient(userId);
  const products = await client.getProducts({ limit: 250 });

  for (const product of products) {
    await upsertProductFromShopify(userId, product);
  }
}
```

### 5.2 Product Sync Service

**File:** `src/lib/integrations/shopify/product-sync.ts`

Handle `products/update` webhook:
- Update price changes
- Update inventory
- Update status (active/archived)
- Track variants

---

## Phase 6: Abandoned Checkout Recovery

### 6.1 Checkout Webhook Handler

Currently `recordAbandonedCheckout` exists but is never called. Wire up:

1. `checkouts/create` webhook -> `recordAbandonedCheckout()`
2. `checkouts/update` webhook -> Check if completed, mark recovered
3. `orders/create` webhook -> Check if matches abandoned checkout, mark recovered

---

## Phase 7: Analytics Integration

### 7.1 Shopify Sales Dashboard Widget

**File:** `src/components/dashboard/shopify-sales-widget.tsx`

Display on main dashboard:
- Orders today/this week/this month
- Revenue today/this week/this month
- Top products by revenue
- Conversion rate (if pin click data available)

### 7.2 Attribution Dashboard Updates

Connect `attribution_events` and `revenue_attribution` to actual Shopify orders:

- When order created, create `attribution_event` with `event_type: 'purchase'`
- Link to source pin/ad if UTM params present
- Calculate revenue attribution per pin

---

## Implementation Order

| # | Task | Effort | Dependencies |
|---|------|--------|--------------|
| 1 | Webhook handler route | Medium | None |
| 2 | Webhook HMAC verification | Small | #1 |
| 3 | Order processing service | Large | #1, #2 |
| 4 | Shopify orders migration | Small | None |
| 5 | Customer sync service | Medium | #3 |
| 6 | Shopify settings page | Medium | None |
| 7 | Settings API routes | Medium | #6 |
| 8 | Abandoned checkout wiring | Small | #1 |
| 9 | Historical order import | Medium | #3 |
| 10 | Product import from Shopify | Medium | None |
| 11 | Sales dashboard widget | Medium | #3 |
| 12 | Attribution integration | Medium | #3 |

---

## Files to Create

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── shopify/
│   │   │       └── route.ts              # Webhook handler
│   │   └── integrations/
│   │       └── shopify/
│   │           ├── status/route.ts       # Connection status
│   │           ├── sync-products/route.ts
│   │           ├── sync-orders/route.ts
│   │           └── webhooks/route.ts     # Webhook management
│   └── (dashboard)/
│       └── dashboard/
│           └── settings/
│               └── shopify/
│                   └── page.tsx          # Settings page
├── components/
│   └── dashboard/
│       └── shopify-sales-widget.tsx      # Sales dashboard
└── lib/
    └── integrations/
        └── shopify/
            ├── webhook-service.ts        # Webhook handlers
            ├── order-service.ts          # Order processing
            ├── order-import.ts           # Historical import
            ├── customer-service.ts       # Customer sync
            └── product-sync.ts           # Bidirectional sync

supabase/
└── migrations/
    └── 040_shopify_orders.sql            # Orders table
```

---

## Files to Modify

```
src/app/(dashboard)/dashboard/settings/page.tsx
  - Add Shopify settings card linking to /dashboard/settings/shopify

src/lib/abandonment/abandonment-service.ts
  - Already exists, just needs webhook to call it

src/components/layout/navigation.ts
  - May need Shopify in settings subnav
```

---

## Testing Checklist

- [ ] Webhook receives and validates signature
- [ ] Order webhook creates customer record
- [ ] Order webhook updates product stats
- [ ] Order webhook creates attribution event
- [ ] Abandoned checkout webhook records checkout
- [ ] Completed checkout marks as recovered
- [ ] Historical order import works with pagination
- [ ] Product import creates local records
- [ ] Settings page shows connection status
- [ ] Settings page shows webhook health
- [ ] Sales widget displays correct data

---

## Environment Variables

Already configured in `.env`:
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`

No new variables needed.

---

## Security Considerations

1. **HMAC Verification** - All webhooks MUST verify `X-Shopify-Hmac-SHA256` header
2. **Rate Limiting** - Shopify has API limits (40 calls/sec), handle gracefully
3. **Idempotency** - Webhooks can be sent multiple times, use upsert patterns
4. **Error Handling** - Return 200 immediately, process async to avoid timeouts
