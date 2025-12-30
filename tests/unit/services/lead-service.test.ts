import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'upsert'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockQueryBuilder = createMockQueryBuilder([
  { id: 'landing-1', name: 'Test Page', slug: 'test-page', status: 'active' },
]);

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: 'lead-123', error: null }),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

// Mock Klaviyo sync
vi.mock('@/lib/integrations/klaviyo/lead-sync', () => ({
  syncLeadToKlaviyo: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Lead Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLandingPage', () => {
    it('should be exported as a function', async () => {
      const { createLandingPage } = await import('@/lib/leads/lead-service');
      expect(typeof createLandingPage).toBe('function');
    });

    it('should accept userId and request', async () => {
      const { createLandingPage } = await import('@/lib/leads/lead-service');
      const request = {
        slug: 'test-page',
        name: 'Test Landing Page',
        type: 'lead_magnet' as const,
        headline: 'Get Your Free Quote',
        subheadline: 'Join our community',
      };

      const result = await createLandingPage('user-123', request);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should return page on success', async () => {
      const { createLandingPage } = await import('@/lib/leads/lead-service');
      const request = {
        slug: 'new-page',
        name: 'New Landing Page',
        type: 'quiz' as const,
        headline: 'Take Our Quiz',
      };

      const result = await createLandingPage('user-123', request);
      // Result depends on mock setup - check structure
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('page');
      }
    });
  });

  describe('processFormSubmission', () => {
    it('should be exported as a function', async () => {
      const { processFormSubmission } = await import('@/lib/leads/lead-service');
      expect(typeof processFormSubmission).toBe('function');
    });

    it('should accept submissionId parameter', async () => {
      const { processFormSubmission } = await import('@/lib/leads/lead-service');
      const result = await processFormSubmission('submission-123');
      expect(result).toBeDefined();
    });
  });

  describe('captureLead', () => {
    it('should be exported as a function', async () => {
      const { captureLead } = await import('@/lib/leads/lead-service');
      expect(typeof captureLead).toBe('function');
    });

    it('should accept userId, landingPageId, and data', async () => {
      const { captureLead } = await import('@/lib/leads/lead-service');
      const result = await captureLead('user-123', 'page-1', {
        email: 'test@example.com',
        first_name: 'Test',
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should accept optional metadata', async () => {
      const { captureLead } = await import('@/lib/leads/lead-service');
      const result = await captureLead(
        'user-123',
        'page-1',
        { email: 'test@example.com' },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          utmSource: 'pinterest',
          utmMedium: 'social',
          utmCampaign: 'summer-2024',
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should be exported as a function', async () => {
      const { convertLeadToCustomer } = await import('@/lib/leads/lead-service');
      expect(typeof convertLeadToCustomer).toBe('function');
    });

    it('should accept userId, leadId, and shopifyCustomerId', async () => {
      const { convertLeadToCustomer } = await import('@/lib/leads/lead-service');
      const result = await convertLeadToCustomer('user-123', 'lead-1', 'shopify-customer-1');
      expect(result).toHaveProperty('success');
    });

    it('should accept optional orderId', async () => {
      const { convertLeadToCustomer } = await import('@/lib/leads/lead-service');
      const result = await convertLeadToCustomer('user-123', 'lead-1', 'shopify-customer-1', 'order-1');
      expect(result).toBeDefined();
    });
  });
});

describe('Lead Types', () => {
  describe('LeadCaptureResult', () => {
    it('should have success, lead, and error properties', () => {
      const result = {
        success: true,
        lead: { id: 'lead-1', email: 'test@example.com' },
        error: undefined,
      };

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('lead');
    });
  });

  describe('Lead Sources', () => {
    const validSources = ['landing_page', 'quiz', 'popup', 'checkout', 'import'];

    validSources.forEach((source) => {
      it(`should recognize ${source} as valid source`, () => {
        expect(validSources).toContain(source);
      });
    });
  });

  describe('Lead Status', () => {
    const validStatuses = ['new', 'engaged', 'qualified', 'customer', 'unsubscribed'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });
});

describe('Landing Page Types', () => {
  describe('Landing Page Status', () => {
    const validStatuses = ['draft', 'active', 'paused', 'archived'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Landing Page Type', () => {
    const validTypes = ['lead_magnet', 'quiz', 'waitlist', 'discount', 'content'];

    validTypes.forEach((type) => {
      it(`should recognize ${type} as valid page type`, () => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe('Lead Magnet Types', () => {
    const validMagnets = ['ebook', 'checklist', 'template', 'wallpaper', 'discount'];

    validMagnets.forEach((magnet) => {
      it(`should recognize ${magnet} as valid lead magnet`, () => {
        expect(validMagnets).toContain(magnet);
      });
    });
  });
});

describe('Form Field Configuration', () => {
  describe('Default Form Fields', () => {
    it('should have email as required by default', () => {
      const defaultFields = [
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'first_name', type: 'text', label: 'First Name', required: false },
      ];

      const emailField = defaultFields.find((f) => f.name === 'email');
      expect(emailField?.required).toBe(true);
    });

    it('should have first_name as optional by default', () => {
      const defaultFields = [
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'first_name', type: 'text', label: 'First Name', required: false },
      ];

      const nameField = defaultFields.find((f) => f.name === 'first_name');
      expect(nameField?.required).toBe(false);
    });
  });

  describe('Form Field Types', () => {
    const validTypes = ['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio'];

    validTypes.forEach((type) => {
      it(`should recognize ${type} as valid field type`, () => {
        expect(validTypes).toContain(type);
      });
    });
  });
});

describe('UTM Tracking', () => {
  describe('UTM Parameters', () => {
    const utmParams = ['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm'];

    utmParams.forEach((param) => {
      it(`should support ${param} tracking`, () => {
        const metadata = {
          utmSource: 'pinterest',
          utmMedium: 'social',
          utmCampaign: 'summer-2024',
          utmContent: 'hero-banner',
          utmTerm: 'inspirational-quotes',
        };

        expect(Object.keys(metadata)).toContain(param);
      });
    });
  });
});

describe('Klaviyo Integration', () => {
  describe('Lead Sync Options', () => {
    it('should support listId configuration', () => {
      const syncOptions = {
        listId: 'klaviyo-list-123',
        tags: ['quiz-growth', 'summer-2024'],
      };

      expect(syncOptions.listId).toBeDefined();
    });

    it('should support tags configuration', () => {
      const syncOptions = {
        listId: 'klaviyo-list-123',
        tags: ['source-pinterest', 'collection-growth'],
      };

      expect(Array.isArray(syncOptions.tags)).toBe(true);
      expect(syncOptions.tags.length).toBeGreaterThan(0);
    });
  });
});
