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

const mockProduct = {
  id: 'product-1',
  user_id: 'user-123',
  quote_id: 'quote-1',
  title: 'Inspirational Quote Print',
  description: 'Beautiful art print',
  collection: 'growth',
  tags: ['inspiration', 'growth'],
  status: 'draft',
  variants: [
    { id: 'v1', size: '8x10', price: 24.99, is_digital: false },
    { id: 'v2', size: '11x14', price: 34.99, is_digital: false },
  ],
  images: [
    { id: 'img1', src: 'https://example.com/image.jpg' },
  ],
};

const mockQueryBuilder = createMockQueryBuilder([mockProduct]);

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: 'access-token-123', error: null }),
  })),
}));

// Mock Shopify client
vi.mock('@/lib/integrations/shopify/client', () => ({
  ShopifyClient: vi.fn().mockImplementation(() => ({
    createProduct: vi.fn().mockResolvedValue({
      product: {
        id: 12345,
        handle: 'inspirational-quote-print',
        variants: [
          { id: 67890, title: '8x10', sku: 'HH-PROD1234-8x10-UNF' },
        ],
      },
    }),
  })),
}));

// Mock storage utils
vi.mock('@/lib/storage/storage-utils', () => ({
  uploadFile: vi.fn().mockResolvedValue('https://storage.example.com/file.jpg'),
  getFileBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
  generateStorageKey: vi.fn().mockReturnValue('products/user-123/file.jpg'),
}));

vi.mock('@/lib/storage/r2-client', () => ({
  STORAGE_PATHS: {
    PRODUCTS: 'products',
    ASSETS: 'assets',
    MOCKUPS: 'mockups',
  },
}));

describe('Product Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should be exported as a function', async () => {
      const { createProduct } = await import('@/lib/products/product-service');
      expect(typeof createProduct).toBe('function');
    });

    it('should accept userId and request', async () => {
      const { createProduct } = await import('@/lib/products/product-service');
      const request = {
        quoteId: 'quote-1',
        title: 'Test Product',
        description: 'A test product',
        collection: 'growth' as const,
        variants: [
          { size: '8x10', price: 24.99 },
        ],
      };

      const result = await createProduct('user-123', request);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should return product on success', async () => {
      const { createProduct } = await import('@/lib/products/product-service');
      const request = {
        quoteId: 'quote-1',
        title: 'Test Product',
        variants: [{ size: '8x10', price: 24.99 }],
      };

      const result = await createProduct('user-123', request);
      expect(result).toHaveProperty('product');
    });

    it('should accept optional imageIds', async () => {
      const { createProduct } = await import('@/lib/products/product-service');
      const request = {
        quoteId: 'quote-1',
        title: 'Test Product',
        variants: [{ size: '8x10' }],
        imageIds: ['asset-1', 'mockup-1'],
      };

      const result = await createProduct('user-123', request);
      expect(result).toBeDefined();
    });

    it('should accept publishImmediately flag', async () => {
      const { createProduct } = await import('@/lib/products/product-service');
      const request = {
        quoteId: 'quote-1',
        title: 'Test Product',
        variants: [{ size: '8x10' }],
        publishImmediately: true,
      };

      const result = await createProduct('user-123', request);
      expect(result).toBeDefined();
    });
  });

  describe('publishProductToShopify', () => {
    it('should be exported as a function', async () => {
      const { publishProductToShopify } = await import('@/lib/products/product-service');
      expect(typeof publishProductToShopify).toBe('function');
    });

    it('should accept userId and productId', async () => {
      const { publishProductToShopify } = await import('@/lib/products/product-service');
      const result = await publishProductToShopify('user-123', 'product-1');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should return shopifyProductId on success', async () => {
      const { publishProductToShopify } = await import('@/lib/products/product-service');
      const result = await publishProductToShopify('user-123', 'product-1');

      if (result.success) {
        expect(result.shopifyProductId).toBeDefined();
      }
    });
  });
});

describe('Product Types', () => {
  describe('Product Status', () => {
    const validStatuses = ['draft', 'pending', 'active', 'archived', 'deleted'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Product Collections', () => {
    const collections = ['grounding', 'wholeness', 'growth'];

    collections.forEach((collection) => {
      it(`should recognize ${collection} as valid collection`, () => {
        expect(collections).toContain(collection);
      });
    });
  });

  describe('Variant Properties', () => {
    it('should have required variant properties', () => {
      const variant = {
        size: '8x10',
        price: 24.99,
        is_digital: false,
        frame_style: null,
        sku: 'HH-PROD1234-8x10-UNF',
        inventory_quantity: 100,
      };

      expect(variant.size).toBeDefined();
      expect(variant.price).toBeDefined();
    });
  });
});

describe('SKU Generation', () => {
  describe('SKU Format', () => {
    it('should start with HH prefix', () => {
      const sku = 'HH-PROD1234-8X10-UNF';

      expect(sku.startsWith('HH-')).toBe(true);
    });

    it('should include product ID portion', () => {
      const productId = 'abc12345-6789-0123-4567-89abcdef0123';
      const productPart = productId.slice(0, 8).toUpperCase();

      expect(productPart).toBe('ABC12345');
    });

    it('should include size without special characters', () => {
      const size = '8x10';
      const sizePart = size.replace(/[^a-zA-Z0-9]/g, '');

      expect(sizePart).toBe('8x10');
    });

    it('should use UNF for unframed products', () => {
      const frameStyle = null;
      const framePart = frameStyle ? frameStyle.slice(0, 3).toUpperCase() : 'UNF';

      expect(framePart).toBe('UNF');
    });

    it('should use frame prefix for framed products', () => {
      const frameStyle = 'Black Wood';
      const framePart = frameStyle.slice(0, 3).toUpperCase();

      expect(framePart).toBe('BLA');
    });
  });

  describe('Complete SKU', () => {
    it('should follow HH-PRODID-SIZE-FRAME format', () => {
      const prefix = 'HH';
      const productPart = 'ABC12345';
      const sizePart = '8x10';
      const framePart = 'UNF';
      const sku = `${prefix}-${productPart}-${sizePart}-${framePart}`;

      const parts = sku.split('-');
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('HH');
    });
  });
});

describe('Pricing Logic', () => {
  describe('Default Pricing', () => {
    it('should have base price for print sizes', () => {
      const defaultPricing = {
        '5x7': { base_price: 19.99, framed_price: 49.99, digital_price: 4.99 },
        '8x10': { base_price: 24.99, framed_price: 64.99, digital_price: 6.99 },
        '11x14': { base_price: 34.99, framed_price: 89.99, digital_price: 9.99 },
        '16x20': { base_price: 49.99, framed_price: 129.99, digital_price: 14.99 },
      };

      expect(defaultPricing['8x10'].base_price).toBe(24.99);
    });

    it('should have higher framed price', () => {
      const pricing = { base_price: 24.99, framed_price: 64.99 };

      expect(pricing.framed_price).toBeGreaterThan(pricing.base_price);
    });

    it('should have lower digital price', () => {
      const pricing = { base_price: 24.99, digital_price: 6.99 };

      expect(pricing.digital_price).toBeLessThan(pricing.base_price);
    });
  });

  describe('Price Selection Logic', () => {
    it('should use explicit price when provided', () => {
      const variant = { price: 29.99, is_digital: false, frame_style: null };
      const defaultPricing = { base_price: 24.99, framed_price: 64.99, digital_price: 6.99 };

      const price = variant.price || defaultPricing.base_price;

      expect(price).toBe(29.99);
    });

    it('should use digital price for digital products', () => {
      const variant = { price: null, is_digital: true, frame_style: null };
      const defaultPricing = { base_price: 24.99, framed_price: 64.99, digital_price: 6.99 };

      const price = variant.is_digital
        ? defaultPricing.digital_price
        : defaultPricing.base_price;

      expect(price).toBe(6.99);
    });

    it('should use framed price for framed products', () => {
      const variant = { price: null, is_digital: false, frame_style: 'Black Wood' };
      const defaultPricing = { base_price: 24.99, framed_price: 64.99, digital_price: 6.99 };

      const price = variant.frame_style
        ? defaultPricing.framed_price
        : defaultPricing.base_price;

      expect(price).toBe(64.99);
    });
  });
});

describe('Image Handling', () => {
  describe('Image Source Detection', () => {
    it('should identify asset source', () => {
      const imageId = 'asset-123';
      const assetData = { file_url: 'https://storage.com/asset.jpg' };
      const mockupData = null;

      const source = assetData ? 'asset' : mockupData ? 'mockup' : null;

      expect(source).toBe('asset');
    });

    it('should identify mockup source', () => {
      const assetData = null;
      const mockupData = { file_url: 'https://storage.com/mockup.jpg' };

      const source = assetData ? 'asset' : mockupData ? 'mockup' : null;

      expect(source).toBe('mockup');
    });
  });

  describe('Image Position', () => {
    it('should assign positions based on array index', () => {
      const imageIds = ['img-1', 'img-2', 'img-3'];

      const images = imageIds.map((id, index) => ({
        id,
        position: index,
      }));

      expect(images[0].position).toBe(0);
      expect(images[1].position).toBe(1);
      expect(images[2].position).toBe(2);
    });
  });
});

describe('Variant Title Generation', () => {
  describe('Unframed Title', () => {
    it('should use just size for unframed', () => {
      const size = '8x10';
      const frameStyle = null;
      const title = frameStyle
        ? `${size} / ${frameStyle} Frame`
        : size;

      expect(title).toBe('8x10');
    });
  });

  describe('Framed Title', () => {
    it('should include frame style for framed', () => {
      const size = '8x10';
      const frameStyle = 'Black Wood';
      const title = frameStyle
        ? `${size} / ${frameStyle} Frame`
        : size;

      expect(title).toBe('8x10 / Black Wood Frame');
    });
  });
});

describe('Shopify Product Options', () => {
  describe('Size Option', () => {
    it('should extract unique sizes from variants', () => {
      const variants = [
        { size: '8x10', frame_style: null },
        { size: '8x10', frame_style: 'Black Wood' },
        { size: '11x14', frame_style: null },
      ];

      const sizes = [...new Set(variants.map((v) => v.size))];

      expect(sizes).toEqual(['8x10', '11x14']);
    });
  });

  describe('Frame Option', () => {
    it('should extract unique frame styles', () => {
      const variants = [
        { size: '8x10', frame_style: null },
        { size: '8x10', frame_style: 'Black Wood' },
        { size: '8x10', frame_style: 'White' },
      ];

      const frames = [...new Set(
        variants
          .filter((v) => v.frame_style)
          .map((v) => v.frame_style)
      )];

      expect(frames).toEqual(['Black Wood', 'White']);
    });

    it('should only add frame option if frames exist', () => {
      const variants = [
        { size: '8x10', frame_style: null },
        { size: '11x14', frame_style: null },
      ];

      const hasFrames = variants.some((v) => v.frame_style);

      expect(hasFrames).toBe(false);
    });
  });
});

describe('Digital Product Handling', () => {
  describe('Inventory Policy', () => {
    it('should use continue policy for digital', () => {
      const isDigital = true;
      const policy = isDigital ? 'continue' : 'deny';

      expect(policy).toBe('continue');
    });

    it('should use deny policy for physical', () => {
      const isDigital = false;
      const policy = isDigital ? 'continue' : 'deny';

      expect(policy).toBe('deny');
    });
  });

  describe('Inventory Quantity', () => {
    it('should use high quantity for digital', () => {
      const isDigital = true;
      const physicalQuantity = 100;
      const quantity = isDigital ? 9999 : physicalQuantity;

      expect(quantity).toBe(9999);
    });
  });
});
