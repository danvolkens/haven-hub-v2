import { describe, it, expect, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { validateInput, createLeadSchema } from '@/lib/validation/schemas';

describe('Lead Validation', () => {
  it('validates correct lead data', () => {
    const result = validateInput(createLeadSchema, {
      email: 'test@example.com',
      firstName: 'Test',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = validateInput(createLeadSchema, {
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toContain('email: Invalid email address');
    }
  });

  it('accepts optional fields', () => {
    const result = validateInput(createLeadSchema, {
      email: 'test@example.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'spring-sale',
    });

    expect(result.success).toBe(true);
  });
});
