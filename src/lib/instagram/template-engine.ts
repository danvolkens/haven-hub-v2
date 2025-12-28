/**
 * Instagram Caption Template Engine
 * Prompt 2.1: Variable substitution for caption templates
 */

import type { Quote } from '@/types/quotes';
import type { Product } from '@/types/products';
import type { InstagramTemplate } from '@/types/instagram';
import type { Collection } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface TemplateContext {
  quote: Quote;
  product?: Product | null;
  customer?: { handle: string } | null;
  settings: UserSettings;
}

export interface UserSettings {
  shop_handle?: string;
  cta_link?: string;
  cta_quiz?: string;
  website_url?: string;
}

// ============================================================================
// Collection Meanings
// ============================================================================

const COLLECTION_MEANINGS: Record<string, string> = {
  grounding: 'stability and safety',
  wholeness: 'self-compassion and acceptance',
  growth: 'transformation and becoming',
};

// ============================================================================
// Variable Extractors
// ============================================================================

/**
 * Get all available variables for a given context
 */
export function getTemplateVariables(context: TemplateContext): Record<string, string> {
  const { quote, product, customer, settings } = context;

  const variables: Record<string, string> = {};

  // Quote variables (always available when quote exists)
  if (quote) {
    variables['quote_text'] = quote.text || '';
    variables['quote_author'] = quote.attribution ? `— ${quote.attribution}` : '';
    variables['collection_name'] = capitalizeFirst(quote.collection);
    variables['collection_lower'] = quote.collection;
    variables['collection_meaning'] = COLLECTION_MEANINGS[quote.collection] || '';
  }

  // Product variables (optional)
  if (product) {
    variables['product_name'] = product.title || '';
    variables['product_url'] = getProductUrl(product, settings);
  }

  // Customer variables (for UGC)
  if (customer?.handle) {
    variables['customer_handle'] = `@${customer.handle.replace(/^@/, '')}`;
  }

  // Settings variables
  variables['shop_handle'] = settings.shop_handle || 'havenandhold';
  variables['cta_link'] = settings.cta_link || 'Link in bio';
  variables['cta_quiz'] = settings.cta_quiz || 'Take the quiz ↓';

  return variables;
}

// ============================================================================
// Template Application
// ============================================================================

/**
 * Apply template variables to a caption template
 *
 * @param template - The Instagram template with caption_template
 * @param context - The context containing quote, product, customer, settings
 * @returns The processed caption with all variables substituted
 */
export function applyTemplate(
  template: InstagramTemplate | { caption_template: string },
  context: TemplateContext
): string {
  const captionTemplate = 'caption_template' in template ? template.caption_template : '';

  if (!captionTemplate) {
    return '';
  }

  const variables = getTemplateVariables(context);

  return substituteVariables(captionTemplate, variables);
}

/**
 * Apply variables to any template string
 * Useful for applying variables to non-caption templates (e.g., alt text)
 */
export function applyVariables(templateString: string, context: TemplateContext): string {
  if (!templateString) {
    return '';
  }

  const variables = getTemplateVariables(context);
  return substituteVariables(templateString, variables);
}

/**
 * Substitute {{variable}} placeholders with values
 * Handles missing variables gracefully by removing them
 */
function substituteVariables(template: string, variables: Record<string, string>): string {
  // Match {{variable_name}} patterns
  return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];

    // If variable exists and has a value, use it
    if (value !== undefined && value !== '') {
      return value;
    }

    // For missing or empty variables, remove the placeholder
    // This handles optional variables gracefully
    return '';
  });
}

// ============================================================================
// Alt Text Generation
// ============================================================================

/**
 * Generate accessible alt text for Instagram posts
 */
export function generateAltText(context: TemplateContext): string {
  const { quote, product } = context;

  const parts: string[] = [];

  // Describe the quote
  if (quote) {
    parts.push(`Quote artwork reading "${truncate(quote.text, 100)}"`);

    if (quote.attribution) {
      parts.push(`by ${quote.attribution}`);
    }

    parts.push(`from the ${capitalizeFirst(quote.collection)} collection`);
  }

  // Add product context if available
  if (product) {
    parts.push(`- ${product.title}`);
  }

  return parts.join(' ');
}

// ============================================================================
// Helper Functions
// ============================================================================

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

function getProductUrl(product: Product, settings: UserSettings): string {
  if (product.shopify_handle) {
    const baseUrl = settings.website_url || 'https://havenandhold.com';
    return `${baseUrl}/products/${product.shopify_handle}`;
  }
  return '';
}

// ============================================================================
// Template Validation
// ============================================================================

/**
 * Extract all variable names used in a template
 */
export function extractVariableNames(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return matches.map((match) => match.replace(/\{\{|\}\}/g, ''));
}

/**
 * Check which variables in a template would be missing given a context
 */
export function getMissingVariables(template: string, context: TemplateContext): string[] {
  const usedVariables = extractVariableNames(template);
  const availableVariables = getTemplateVariables(context);

  return usedVariables.filter(
    (varName) => !availableVariables[varName] || availableVariables[varName] === ''
  );
}

/**
 * Validate a template has all required variables
 */
export function validateTemplate(
  template: string,
  context: TemplateContext
): { valid: boolean; missing: string[] } {
  const missing = getMissingVariables(template, context);
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Preview Generation
// ============================================================================

/**
 * Generate a preview of the template with sample data
 */
export function previewTemplate(template: InstagramTemplate): string {
  const sampleContext: TemplateContext = {
    quote: {
      id: 'sample',
      user_id: 'sample',
      text: 'You are held here',
      attribution: 'Mary Oliver',
      collection: (template.collection as Collection) || 'grounding',
      mood: 'calm',
      temporal_tags: [],
      status: 'active',
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    product: {
      id: 'sample',
      user_id: 'sample',
      quote_id: null,
      asset_id: null,
      shopify_product_id: null,
      shopify_product_gid: null,
      shopify_handle: 'you-are-held-here-print',
      title: 'You Are Held Here Print',
      description: null,
      product_type: 'print',
      vendor: 'Haven & Hold',
      tags: [],
      collection: 'grounding',
      status: 'active',
      published_at: null,
      retired_at: null,
      retire_reason: null,
      total_views: 0,
      total_orders: 0,
      total_revenue: 0,
      last_synced_at: null,
      sync_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    customer: { handle: 'customer_example' },
    settings: {
      shop_handle: 'havenandhold',
      cta_link: 'Link in bio',
      cta_quiz: 'Take the quiz ↓',
      website_url: 'https://havenandhold.com',
    },
  };

  return applyTemplate(template, sampleContext);
}
