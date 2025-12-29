/**
 * Template Engine Unit Tests
 * Prompt 2.1: Caption Template Engine
 */

import { describe, it, expect } from 'vitest';
import {
  applyTemplate,
  applyVariables,
  getTemplateVariables,
  extractVariableNames,
  getMissingVariables,
  validateTemplate,
  generateAltText,
  previewTemplate,
  type TemplateContext,
} from '../template-engine';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockQuote = (overrides = {}) => ({
  id: 'quote-1',
  user_id: 'user-1',
  text: 'You are held here',
  attribution: 'Mary Oliver',
  collection: 'grounding' as const,
  mood: 'calm' as const,
  temporal_tags: [],
  status: 'active' as const,
  assets_generated: 0,
  last_generated_at: null,
  generation_settings: null,
  total_pins: 0,
  total_impressions: 0,
  total_saves: 0,
  total_clicks: 0,
  best_performing_asset_id: null,
  imported_from: null,
  import_batch_id: null,
  master_image_url: null,
  master_image_key: null,
  product_id: null,
  product_link: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockProduct = (overrides = {}) => ({
  id: 'product-1',
  user_id: 'user-1',
  quote_id: null,
  asset_id: null,
  shopify_product_id: 'gid://shopify/Product/123',
  shopify_product_gid: 'gid://shopify/Product/123',
  shopify_handle: 'you-are-held-here-print',
  title: 'You Are Held Here Print',
  description: null,
  product_type: 'print',
  vendor: 'Haven & Hold',
  tags: [],
  collection: 'grounding' as const,
  status: 'active' as const,
  published_at: null,
  retired_at: null,
  retire_reason: null,
  total_views: 0,
  total_orders: 0,
  total_revenue: 0,
  last_synced_at: null,
  sync_error: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockContext = (overrides: Partial<TemplateContext> = {}): TemplateContext => ({
  quote: createMockQuote(),
  product: createMockProduct(),
  customer: { handle: 'happycustomer' },
  settings: {
    shop_handle: 'havenandhold',
    cta_link: 'Link in bio',
    cta_quiz: 'Take the quiz ↓',
    website_url: 'https://havenandhold.com',
  },
  ...overrides,
});

// ============================================================================
// Tests: Variable Extraction
// ============================================================================

describe('getTemplateVariables', () => {
  it('should extract quote variables correctly', () => {
    const context = createMockContext();
    const variables = getTemplateVariables(context);

    expect(variables.quote_text).toBe('You are held here');
    expect(variables.quote_author).toBe('— Mary Oliver');
    expect(variables.collection_name).toBe('Grounding');
    expect(variables.collection_lower).toBe('grounding');
    expect(variables.collection_meaning).toBe('stability and safety');
  });

  it('should handle quote without attribution', () => {
    const context = createMockContext({
      quote: createMockQuote({ attribution: null }),
    });
    const variables = getTemplateVariables(context);

    expect(variables.quote_author).toBe('');
  });

  it('should extract product variables', () => {
    const context = createMockContext();
    const variables = getTemplateVariables(context);

    expect(variables.product_name).toBe('You Are Held Here Print');
    expect(variables.product_url).toBe('https://havenandhold.com/products/you-are-held-here-print');
  });

  it('should handle missing product', () => {
    const context = createMockContext({ product: null });
    const variables = getTemplateVariables(context);

    expect(variables.product_name).toBeUndefined();
    expect(variables.product_url).toBeUndefined();
  });

  it('should extract customer handle', () => {
    const context = createMockContext();
    const variables = getTemplateVariables(context);

    expect(variables.customer_handle).toBe('@happycustomer');
  });

  it('should handle @ prefix in customer handle', () => {
    const context = createMockContext({ customer: { handle: '@alreadyprefixed' } });
    const variables = getTemplateVariables(context);

    expect(variables.customer_handle).toBe('@alreadyprefixed');
  });

  it('should handle missing customer', () => {
    const context = createMockContext({ customer: null });
    const variables = getTemplateVariables(context);

    expect(variables.customer_handle).toBeUndefined();
  });

  it('should extract settings variables', () => {
    const context = createMockContext();
    const variables = getTemplateVariables(context);

    expect(variables.shop_handle).toBe('havenandhold');
    expect(variables.cta_link).toBe('Link in bio');
    expect(variables.cta_quiz).toBe('Take the quiz ↓');
  });

  it('should use defaults for missing settings', () => {
    const context = createMockContext({
      settings: {},
    });
    const variables = getTemplateVariables(context);

    expect(variables.shop_handle).toBe('havenandhold');
    expect(variables.cta_link).toBe('Link in bio');
    expect(variables.cta_quiz).toBe('Take the quiz ↓');
  });

  it('should handle all collection meanings', () => {
    const collections = ['grounding', 'wholeness', 'growth'] as const;
    const meanings = {
      grounding: 'stability and safety',
      wholeness: 'self-compassion and acceptance',
      growth: 'transformation and becoming',
    };

    collections.forEach((collection) => {
      const context = createMockContext({
        quote: createMockQuote({ collection }),
      });
      const variables = getTemplateVariables(context);

      expect(variables.collection_meaning).toBe(meanings[collection]);
    });
  });
});

// ============================================================================
// Tests: Template Application
// ============================================================================

describe('applyTemplate', () => {
  it('should substitute all variables in a template', () => {
    const template = {
      caption_template: '"{{quote_text}}" {{quote_author}}\n\nFrom our {{collection_name}} collection.',
    };
    const context = createMockContext();

    const result = applyTemplate(template, context);

    expect(result).toBe('"You are held here" — Mary Oliver\n\nFrom our Grounding collection.');
  });

  it('should handle missing optional variables gracefully', () => {
    const template = {
      caption_template: 'Check out {{product_name}}! {{cta_link}}',
    };
    const context = createMockContext({ product: null });

    const result = applyTemplate(template, context);

    // Missing product_name should be removed, cta_link should remain
    expect(result).toBe('Check out ! Link in bio');
  });

  it('should handle empty template', () => {
    const template = { caption_template: '' };
    const context = createMockContext();

    const result = applyTemplate(template, context);

    expect(result).toBe('');
  });

  it('should handle template with no variables', () => {
    const template = { caption_template: 'Just a plain caption.' };
    const context = createMockContext();

    const result = applyTemplate(template, context);

    expect(result).toBe('Just a plain caption.');
  });

  it('should handle multiple occurrences of same variable', () => {
    const template = {
      caption_template: '{{collection_name}} vibes. Only {{collection_name}} energy here.',
    };
    const context = createMockContext();

    const result = applyTemplate(template, context);

    expect(result).toBe('Grounding vibes. Only Grounding energy here.');
  });
});

describe('applyVariables', () => {
  it('should apply variables to any string', () => {
    const templateString = 'Shop {{product_name}} now!';
    const context = createMockContext();

    const result = applyVariables(templateString, context);

    expect(result).toBe('Shop You Are Held Here Print now!');
  });

  it('should handle empty string', () => {
    const result = applyVariables('', createMockContext());
    expect(result).toBe('');
  });
});

// ============================================================================
// Tests: Variable Extraction & Validation
// ============================================================================

describe('extractVariableNames', () => {
  it('should extract all variable names from template', () => {
    const template = '{{quote_text}} by {{quote_author}} - {{cta_link}}';

    const variables = extractVariableNames(template);

    expect(variables).toEqual(['quote_text', 'quote_author', 'cta_link']);
  });

  it('should return empty array for template with no variables', () => {
    const template = 'Just plain text';

    const variables = extractVariableNames(template);

    expect(variables).toEqual([]);
  });

  it('should handle duplicate variables', () => {
    const template = '{{quote_text}} - {{quote_text}} again';

    const variables = extractVariableNames(template);

    expect(variables).toEqual(['quote_text', 'quote_text']);
  });
});

describe('getMissingVariables', () => {
  it('should return missing variables', () => {
    const template = '{{quote_text}} by {{customer_handle}} - {{unknown_var}}';
    const context = createMockContext({ customer: null });

    const missing = getMissingVariables(template, context);

    expect(missing).toContain('customer_handle');
    expect(missing).toContain('unknown_var');
    expect(missing).not.toContain('quote_text');
  });

  it('should return empty array when all variables present', () => {
    const template = '{{quote_text}} - {{cta_link}}';
    const context = createMockContext();

    const missing = getMissingVariables(template, context);

    expect(missing).toEqual([]);
  });
});

describe('validateTemplate', () => {
  it('should return valid when all variables present', () => {
    const template = '{{quote_text}} {{quote_author}}';
    const context = createMockContext();

    const result = validateTemplate(template, context);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should return invalid with missing variables', () => {
    const template = '{{quote_text}} {{nonexistent}}';
    const context = createMockContext();

    const result = validateTemplate(template, context);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('nonexistent');
  });
});

// ============================================================================
// Tests: Alt Text Generation
// ============================================================================

describe('generateAltText', () => {
  it('should generate descriptive alt text', () => {
    const context = createMockContext();

    const altText = generateAltText(context);

    expect(altText).toContain('Quote artwork');
    expect(altText).toContain('You are held here');
    expect(altText).toContain('Mary Oliver');
    expect(altText).toContain('Grounding collection');
  });

  it('should handle quote without attribution', () => {
    const context = createMockContext({
      quote: createMockQuote({ attribution: null }),
    });

    const altText = generateAltText(context);

    expect(altText).not.toContain('by');
  });

  it('should include product name when available', () => {
    const context = createMockContext();

    const altText = generateAltText(context);

    expect(altText).toContain('You Are Held Here Print');
  });
});

// ============================================================================
// Tests: Preview Generation
// ============================================================================

describe('previewTemplate', () => {
  it('should generate preview with sample data', () => {
    const template = {
      id: 'test',
      user_id: null,
      name: 'Test Template',
      template_type: 'feed' as const,
      content_pillar: 'product_showcase' as const,
      collection: 'grounding' as const,
      caption_template: '"{{quote_text}}" {{quote_author}}\n\n{{cta_link}}',
      caption_formula: null,
      hashtag_group_ids: null,
      hashtags_in_caption: false,
      include_shopping_tag: true,
      preferred_days: [],
      is_default: false,
      is_system: false,
      is_active: true,
      usage_count: 0,
      avg_engagement_rate: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      // Reel-specific fields
      hook_text: null,
      text_overlays: [],
      suggested_duration_seconds: null,
      audio_mood: null,
      shot_list: [],
      reel_type: null,
      // Carousel-specific fields
      slide_count: null,
      slides: [],
      carousel_type: null,
      estimated_engagement_multiplier: 1.0,
    };

    const preview = previewTemplate(template);

    expect(preview).toContain('You are held here');
    expect(preview).toContain('Mary Oliver');
    expect(preview).toContain('Link in bio');
  });
});
