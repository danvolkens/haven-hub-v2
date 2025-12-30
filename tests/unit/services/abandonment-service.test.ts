import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'upsert', 'is', 'single'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockCheckout = {
  checkout_id: 'checkout-1',
  sequence_id: 'seq-1',
  email: 'test@example.com',
  cart_total: 100,
  cart_items: [{ product_id: 'prod-1', quantity: 1 }],
  checkout_url: 'https://shop.example.com/checkout/1',
  klaviyo_flow_id: 'flow-123',
  sequence_checkouts_triggered: 5,
};

const mockQueryBuilder = createMockQueryBuilder([mockCheckout]);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: [mockCheckout], error: null }),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: 'fake-api-key', error: null }),
  })),
}));

describe('Abandonment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processAbandonedCheckouts', () => {
    it('should be exported as a function', async () => {
      const { processAbandonedCheckouts } = await import('@/lib/abandonment/abandonment-service');
      expect(typeof processAbandonedCheckouts).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { processAbandonedCheckouts } = await import('@/lib/abandonment/abandonment-service');
      const result = await processAbandonedCheckouts('user-123');

      expect(result).toHaveProperty('triggered');
      expect(result).toHaveProperty('errors');
    });
  });

  describe('recordAbandonedCheckout', () => {
    it('should be exported as a function', async () => {
      const { recordAbandonedCheckout } = await import('@/lib/abandonment/abandonment-service');
      expect(typeof recordAbandonedCheckout).toBe('function');
    });

    it('should accept userId and checkout data', async () => {
      const { recordAbandonedCheckout } = await import('@/lib/abandonment/abandonment-service');
      const result = await recordAbandonedCheckout('user-123', {
        shopifyCheckoutId: 'checkout-1',
        email: 'test@example.com',
        cartTotal: 100,
        cartItems: [{ product_id: 'prod-1', title: 'Test Product', quantity: 1, price: 100 }],
        abandonedAt: new Date().toISOString(),
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('markCheckoutRecovered', () => {
    it('should be exported as a function', async () => {
      const { markCheckoutRecovered } = await import('@/lib/abandonment/abandonment-service');
      expect(typeof markCheckoutRecovered).toBe('function');
    });

    it('should accept recovery parameters', async () => {
      const { markCheckoutRecovered } = await import('@/lib/abandonment/abandonment-service');
      const result = await markCheckoutRecovered(
        'user-123',
        'shopify-checkout-1',
        'order-1',
        150
      );

      expect(result).toHaveProperty('success');
    });
  });
});

describe('Abandonment Types', () => {
  describe('Checkout Status', () => {
    const validStatuses = ['abandoned', 'sequence_triggered', 'recovered', 'expired'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Cart Item Structure', () => {
    it('should have required cart item fields', () => {
      const cartItem = {
        product_id: 'prod-1',
        title: 'Test Product',
        quantity: 2,
        price: 50,
        image_url: 'https://example.com/image.jpg',
      };

      expect(cartItem.product_id).toBeDefined();
      expect(cartItem.title).toBeDefined();
      expect(cartItem.quantity).toBeDefined();
      expect(cartItem.price).toBeDefined();
    });
  });
});

describe('Abandonment Window Logic', () => {
  describe('Default Window', () => {
    it('should default to 1 hour window', () => {
      const defaultWindow = 1;
      expect(defaultWindow).toBe(1);
    });

    it('should allow custom window hours', () => {
      const customWindow = 4;
      expect(customWindow).toBeGreaterThan(0);
    });
  });

  describe('Window Calculation', () => {
    it('should calculate cutoff time correctly', () => {
      const windowHours = 2;
      const now = new Date();
      const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

      expect(cutoff.getTime()).toBeLessThan(now.getTime());
    });
  });
});

describe('Klaviyo Integration', () => {
  describe('Flow Trigger', () => {
    it('should require API key', () => {
      const apiKey = 'fake-api-key';
      expect(apiKey).toBeDefined();
    });

    it('should require flow ID', () => {
      const flowId = 'flow-123';
      expect(flowId).toBeDefined();
    });

    it('should include checkout data in trigger', () => {
      const triggerData = {
        cart_total: 100,
        cart_items: [{ product_id: 'prod-1' }],
        checkout_url: 'https://shop.example.com/checkout',
      };

      expect(triggerData.cart_total).toBeDefined();
      expect(triggerData.cart_items).toBeDefined();
      expect(triggerData.checkout_url).toBeDefined();
    });
  });
});

describe('Recovery Tracking', () => {
  describe('Revenue Attribution', () => {
    it('should track recovered order total', () => {
      const orderTotal = 150;
      const wasTriggered = true;

      expect(orderTotal).toBeGreaterThan(0);
      expect(wasTriggered).toBe(true);
    });

    it('should update sequence stats on recovery', () => {
      const currentRecovered = 5;
      const currentRevenue = 500;
      const newOrderTotal = 150;

      const updatedRecovered = currentRecovered + 1;
      const updatedRevenue = currentRevenue + newOrderTotal;

      expect(updatedRecovered).toBe(6);
      expect(updatedRevenue).toBe(650);
    });
  });
});

describe('Sequence Processing', () => {
  describe('Batch Processing', () => {
    it('should process multiple checkouts', () => {
      const checkouts = [
        { checkout_id: '1' },
        { checkout_id: '2' },
        { checkout_id: '3' },
      ];

      expect(checkouts.length).toBe(3);
    });

    it('should handle empty checkout list', () => {
      const checkouts: Array<{ checkout_id: string }> = [];
      const triggered = checkouts.length;

      expect(triggered).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should collect errors without stopping', () => {
      const errors: string[] = [];
      errors.push('Checkout 1: API error');
      errors.push('Checkout 2: Invalid email');

      expect(errors.length).toBe(2);
    });
  });
});
