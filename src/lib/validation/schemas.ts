import { z } from 'zod';

// Common schemas
export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL');

export const uuidSchema = z.string().uuid('Invalid ID format');

// API input schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: 'Start date must be before end date' }
  );

// Lead schemas
export const createLeadSchema = z.object({
  email: emailSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
});

// Pin schemas
export const createPinSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  link: urlSchema,
  boardId: uuidSchema,
  imageUrl: urlSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
});

// Coupon schemas
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Code must be alphanumeric'),
  discountType: z.enum([
    'percentage',
    'fixed_amount',
    'free_shipping',
    'buy_x_get_y',
  ]),
  discountValue: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perCustomerLimit: z.number().int().positive().default(1),
  minimumPurchase: z.number().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Popup schemas
export const createPopupSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum([
    'exit_intent',
    'scroll_depth',
    'time_on_page',
    'page_views',
    'click',
    'manual',
  ]),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  content: z.object({
    type: z.enum(['email_capture', 'announcement', 'discount', 'quiz_cta']),
    headline: z.string().max(100).optional(),
    body: z.string().max(500).optional(),
    ctaText: z.string().max(50).optional(),
    ctaLink: urlSchema.optional(),
  }),
  position: z
    .enum([
      'center',
      'top',
      'bottom',
      'top_left',
      'top_right',
      'bottom_left',
      'bottom_right',
    ])
    .default('center'),
});

// Validate helper
export function validateInput<T>(
  schema: z.Schema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Zod v4 uses 'issues' instead of 'errors'
  const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
  return {
    success: false,
    errors: issues.map(
      (e: { path: (string | number)[]; message: string }) =>
        `${e.path.join('.')}: ${e.message}`
    ),
  };
}
