# Haven Hub API Documentation

## Authentication

All API endpoints require authentication via Supabase Auth. Include the session cookie or Authorization header with your requests.

## Rate Limits

- General API: 100 requests per 10 seconds
- Authentication: 5 attempts per minute
- Webhooks: 1000 per minute
- Public forms: 10 per minute per IP

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### Leads

#### GET /api/leads
List all leads with optional filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `segment` (string): Filter by segment
- `source` (string): Filter by source
- `startDate` (ISO date): Filter by created date
- `endDate` (ISO date): Filter by created date

**Response:**
```json
{
  "leads": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### POST /api/leads
Create a new lead.

**Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "source": "quiz",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "spring"
}
```

### Coupons

#### GET /api/coupons
List all coupons.

**Query Parameters:**
- `status` (string): Filter by status (active, draft, paused, expired, depleted)
- `stats` (boolean): Include aggregate statistics

#### POST /api/coupons
Create a new coupon.

**Body:**
```json
{
  "code": "SUMMER20",
  "discountType": "percentage",
  "discountValue": 20,
  "usageLimit": 100,
  "perCustomerLimit": 1,
  "minimumPurchase": 50,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Popups

#### GET /api/popups
List all popups.

#### POST /api/popups
Create a new popup.

**Body:**
```json
{
  "name": "Exit Intent Popup",
  "triggerType": "exit_intent",
  "content": {
    "type": "email_capture",
    "headline": "Wait! Don't go!",
    "body": "Get 10% off your first order",
    "ctaText": "Get My Discount"
  },
  "position": "center"
}
```

### Webhooks

#### POST /api/webhooks/shopify
Handle Shopify webhooks. Requires HMAC verification.

#### POST /api/webhooks/klaviyo
Handle Klaviyo webhooks.

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error
