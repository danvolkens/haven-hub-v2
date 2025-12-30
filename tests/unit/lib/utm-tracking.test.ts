import { describe, it, expect } from 'vitest';
import {
  buildTrackedUrl,
  buildOrganicPinUtm,
  buildPaidPinUtm,
  addPinTracking,
  type UtmParams,
  type PinTrackingContext,
} from '@/lib/pinterest/utm-tracking';

describe('UTM Tracking', () => {
  describe('buildTrackedUrl', () => {
    it('should add UTM parameters to URL', () => {
      const baseUrl = 'https://example.com/products/quote-art';
      const params: UtmParams = {
        source: 'pinterest',
        medium: 'organic',
        campaign: 'summer_sale',
      };

      const result = buildTrackedUrl(baseUrl, params);

      expect(result).toContain('utm_source=pinterest');
      expect(result).toContain('utm_medium=organic');
      expect(result).toContain('utm_campaign=summer_sale');
    });

    it('should handle URL with existing query params', () => {
      const baseUrl = 'https://example.com/products?category=art';
      const params: UtmParams = {
        source: 'pinterest',
        medium: 'organic',
        campaign: 'test',
      };

      const result = buildTrackedUrl(baseUrl, params);

      expect(result).toContain('category=art');
      expect(result).toContain('utm_source=pinterest');
    });

    it('should handle optional UTM fields', () => {
      const baseUrl = 'https://example.com';
      const params: UtmParams = {
        source: 'pinterest',
        medium: 'organic',
        campaign: 'test',
        term: 'keyword',
        content: 'variation_a',
      };

      const result = buildTrackedUrl(baseUrl, params);

      expect(result).toContain('utm_term=keyword');
      expect(result).toContain('utm_content=variation_a');
    });

    it('should return empty string for empty base URL', () => {
      const params: UtmParams = {
        source: 'pinterest',
        medium: 'organic',
        campaign: 'test',
      };

      const result = buildTrackedUrl('', params);

      expect(result).toBe('');
    });

    it('should handle invalid URLs gracefully', () => {
      const baseUrl = 'not-a-valid-url';
      const params: UtmParams = {
        source: 'pinterest',
        medium: 'organic',
        campaign: 'test',
      };

      const result = buildTrackedUrl(baseUrl, params);

      expect(result).toContain('utm_source=pinterest');
    });
  });

  describe('buildOrganicPinUtm', () => {
    it('should create organic UTM params', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        collection: 'growth',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.source).toBe('pinterest');
      expect(result.medium).toBe('organic');
      expect(result.campaign).toBe('growth');
    });

    it('should use general when no collection provided', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.campaign).toBe('general');
    });

    it('should include pin ID in content', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        collection: 'healing',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.content).toContain('pin-');
    });

    it('should include mood in term when provided', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        mood: 'calm',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.term).toContain('calm');
    });

    it('should include copy variant in term when provided', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        copyVariant: 'A',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.term).toContain('vA');
    });

    it('should combine mood and copy variant in term', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        mood: 'inspirational',
        copyVariant: 'B',
      };

      const result = buildOrganicPinUtm(context);

      expect(result.term).toBe('inspirational-vB');
    });

    it('should handle null collection', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        collection: null,
      };

      const result = buildOrganicPinUtm(context);

      expect(result.campaign).toBe('general');
    });
  });

  describe('buildPaidPinUtm', () => {
    it('should create paid UTM params', () => {
      const campaignName = 'Summer Sale 2024';
      const context = {
        pinId: 'pin-1234567890',
      };

      const result = buildPaidPinUtm(campaignName, context);

      expect(result.source).toBe('pinterest');
      expect(result.medium).toBe('paid_social');
    });

    it('should format campaign name', () => {
      const campaignName = 'Summer Sale 2024';
      const context = {
        pinId: 'pin-1234567890',
      };

      const result = buildPaidPinUtm(campaignName, context);

      expect(result.campaign).toBe('summer-sale-2024');
    });

    it('should include pin ID in content when provided', () => {
      const campaignName = 'Test Campaign';
      const context = {
        pinId: 'pin-1234567890',
      };

      const result = buildPaidPinUtm(campaignName, context);

      expect(result.content).toContain('pin-');
    });

    it('should use ad group ID when no pin ID', () => {
      const campaignName = 'Test Campaign';
      const context = {
        adGroupId: 'adgroup-789',
      };

      const result = buildPaidPinUtm(campaignName, context);

      expect(result.content).toBe('adgroup-789');
    });

    it('should include collection in term', () => {
      const campaignName = 'Test';
      const context = {
        pinId: 'pin-123',
        collection: 'Healing Collection',
      };

      const result = buildPaidPinUtm(campaignName, context);

      expect(result.term).toBe('healing-collection');
    });
  });

  describe('addPinTracking', () => {
    it('should add tracking to pin link', () => {
      const originalUrl = 'https://example.com/products/quote-art';
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
        collection: 'growth',
      };

      const result = addPinTracking(originalUrl, context);

      expect(result).toContain('utm_source=pinterest');
      expect(result).toContain('utm_medium=organic');
    });

    it('should return null for null link', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
      };

      const result = addPinTracking(null, context);

      expect(result).toBeNull();
    });

    it('should return null for undefined link', () => {
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
      };

      const result = addPinTracking(undefined, context);

      expect(result).toBeNull();
    });

    it('should use paid params when isPaid is true', () => {
      const originalUrl = 'https://example.com/products';
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
      };

      const result = addPinTracking(originalUrl, context, true, 'Test Campaign');

      expect(result).toContain('utm_medium=paid_social');
    });

    it('should use organic params when isPaid is false', () => {
      const originalUrl = 'https://example.com/products';
      const context: PinTrackingContext = {
        pinId: 'pin-1234567890',
      };

      const result = addPinTracking(originalUrl, context, false);

      expect(result).toContain('utm_medium=organic');
    });
  });
});

describe('UTM Parameter Validation', () => {
  describe('Standard Values', () => {
    it('should use pinterest as source', () => {
      const context: PinTrackingContext = { pinId: '123' };
      const result = buildOrganicPinUtm(context);
      expect(result.source).toBe('pinterest');
    });

    it('should use organic or paid_social as medium', () => {
      const context: PinTrackingContext = { pinId: '123' };
      const organic = buildOrganicPinUtm(context);
      const paid = buildPaidPinUtm('test', context);

      expect(organic.medium).toBe('organic');
      expect(paid.medium).toBe('paid_social');
    });
  });
});
