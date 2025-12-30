import { describe, it, expect } from 'vitest';
import {
  generatePinCopy,
  applyTemplate,
  type QuoteMetadata,
} from '@/lib/pinterest/copy-generator';

describe('Copy Generator', () => {
  describe('generatePinCopy', () => {
    it('should generate pin copy from quote metadata', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Be the change you wish to see in the world.',
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.alt_text).toBeDefined();
      expect(result.hashtags).toBeDefined();
    });

    it('should generate description with quote text', () => {
      const quote: QuoteMetadata = {
        quote_text: 'The journey of a thousand miles begins with a single step.',
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result.description.toLowerCase()).toContain('journey');
    });

    it('should generate alt text', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Peace comes from within.',
        collection: 'grounding',
      };

      const result = generatePinCopy(quote);

      expect(result.alt_text).toContain('quote print');
    });

    it('should generate hashtags', () => {
      const quote: QuoteMetadata = {
        quote_text: 'You are already complete.',
        collection: 'wholeness',
      };

      const result = generatePinCopy(quote);

      expect(result.hashtags).toBeDefined();
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(result.hashtags.length).toBeGreaterThan(0);
    });

    it('should handle grounding collection', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Find your anchor.',
        collection: 'grounding',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should handle growth collection', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Growth is a journey.',
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should handle wholeness collection', () => {
      const quote: QuoteMetadata = {
        quote_text: 'You are whole.',
        collection: 'wholeness',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should handle mood parameter', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Peace is always within.',
        collection: 'grounding',
        mood: 'calm',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
    });

    it('should truncate long titles', () => {
      const quote: QuoteMetadata = {
        quote_text: 'A'.repeat(200),
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should truncate long descriptions', () => {
      const quote: QuoteMetadata = {
        quote_text: 'A'.repeat(200),
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result.description.length).toBeLessThanOrEqual(500);
    });

    it('should include collection-specific hashtags', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Test quote',
        collection: 'wholeness',
      };

      const result = generatePinCopy(quote);

      // Should have some hashtags related to the collection
      expect(result.hashtags.length).toBeGreaterThan(0);
    });

    it('should include universal hashtags', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Test quote',
        collection: 'grounding',
      };

      const result = generatePinCopy(quote);

      // Should include universal tags like wallart, homedecor
      const hasUniversal = result.hashtags.some(tag =>
        ['wallart', 'homedecor', 'quoteart', 'minimalistdecor'].includes(tag)
      );
      expect(hasUniversal).toBe(true);
    });
  });

  describe('applyTemplate', () => {
    it('should replace template variables', () => {
      const template = {
        title_template: 'Quote: {quote}',
        description_template: 'From {collection} collection by {shop_name}',
      };
      const variables = {
        quote: 'Be the change',
        collection: 'growth',
        shop_name: 'Test Shop',
      };

      const result = applyTemplate(template, variables);

      expect(result.title).toContain('Be the change');
      expect(result.description).toContain('growth');
      expect(result.description).toContain('Test Shop');
    });

    it('should handle missing variables with defaults', () => {
      const template = {
        title_template: 'Quote art from {shop_name}',
        description_template: 'A beautiful piece',
      };
      const variables = {};

      const result = applyTemplate(template, variables);

      expect(result.title).toContain('Haven & Hold');
    });

    it('should truncate title to 100 chars', () => {
      const template = {
        title_template: 'A'.repeat(150),
        description_template: 'Test',
      };
      const variables = {};

      const result = applyTemplate(template, variables);

      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it('should truncate description to 500 chars', () => {
      const template = {
        title_template: 'Test',
        description_template: 'A'.repeat(600),
      };
      const variables = {};

      const result = applyTemplate(template, variables);

      expect(result.description.length).toBeLessThanOrEqual(500);
    });

    it('should replace multiple occurrences', () => {
      const template = {
        title_template: '{quote} - {quote}',
        description_template: '{collection} collection from {shop_name}',
      };
      const variables = {
        quote: 'Peace',
        collection: 'grounding',
      };

      const result = applyTemplate(template, variables);

      expect(result.title).toBe('Peace - Peace');
    });

    it('should handle mood variable', () => {
      const template = {
        title_template: 'A {mood} piece',
        description_template: 'Feeling {mood} today',
      };
      const variables = {
        mood: 'calm',
      };

      const result = applyTemplate(template, variables);

      expect(result.title).toContain('calm');
    });

    it('should handle product_link variable', () => {
      const template = {
        title_template: 'Check it out',
        description_template: 'Get it here: {product_link}',
      };
      const variables = {
        product_link: 'https://example.com',
      };

      const result = applyTemplate(template, variables);

      expect(result.description).toContain('https://example.com');
    });
  });
});

describe('Copy Generation Rules', () => {
  describe('Title Length', () => {
    it('should have max title length of 100', () => {
      const maxLength = 100;
      const quote: QuoteMetadata = {
        quote_text: 'A'.repeat(200),
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result.title.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Description Length', () => {
    it('should have max description length of 500', () => {
      const maxLength = 500;
      const quote: QuoteMetadata = {
        quote_text: 'Test quote',
        collection: 'grounding',
      };

      const result = generatePinCopy(quote);

      expect(result.description.length).toBeLessThanOrEqual(maxLength);
    });
  });
});

describe('Collection Messaging', () => {
  describe('Grounding Collection', () => {
    it('should generate grounding content', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Stay present',
        collection: 'grounding',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
    });
  });

  describe('Wholeness Collection', () => {
    it('should generate wholeness content', () => {
      const quote: QuoteMetadata = {
        quote_text: 'You are complete',
        collection: 'wholeness',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
    });
  });

  describe('Growth Collection', () => {
    it('should generate growth content', () => {
      const quote: QuoteMetadata = {
        quote_text: 'Keep growing',
        collection: 'growth',
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
    });
  });
});

describe('Mood Handling', () => {
  const moods = ['calm', 'warm', 'hopeful', 'reflective', 'empowering', 'neutral'];

  moods.forEach(mood => {
    it(`should handle ${mood} mood`, () => {
      const quote: QuoteMetadata = {
        quote_text: 'Test quote',
        collection: 'grounding',
        mood,
      };

      const result = generatePinCopy(quote);

      expect(result).toBeDefined();
    });
  });
});
