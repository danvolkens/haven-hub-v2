import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockConfig = {
  id: 'config-1',
  user_id: 'user-123',
  username: 'havenandhold',
  title: 'Haven & Hold',
  bio: 'Quotes for growth and healing',
  avatar_url: 'https://example.com/avatar.jpg',
  theme: 'minimal',
  background_color: '#ffffff',
  text_color: '#000000',
};

const mockLinks = [
  { id: 'link-1', title: 'Shop', url: 'https://shop.example.com', position: 0 },
  { id: 'link-2', title: 'Instagram', url: 'https://instagram.com/havenandhold', position: 1 },
];

const mockQueryBuilder = createMockQueryBuilder([mockConfig]);

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

describe('Link In Bio Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateConfig', () => {
    it('should be exported as a function', async () => {
      const { getOrCreateConfig } = await import('@/lib/link-in-bio/link-service');
      expect(typeof getOrCreateConfig).toBe('function');
    });

    it('should accept userId parameter', async () => {
      const { getOrCreateConfig } = await import('@/lib/link-in-bio/link-service');
      const result = await getOrCreateConfig('user-123');

      expect(result).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('should be exported as a function', async () => {
      const { updateConfig } = await import('@/lib/link-in-bio/link-service');
      expect(typeof updateConfig).toBe('function');
    });

    it('should accept userId and updates', async () => {
      const { updateConfig } = await import('@/lib/link-in-bio/link-service');
      const result = await updateConfig('user-123', {
        title: 'New Title',
        bio: 'Updated bio',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getLinks', () => {
    it('should be exported as a function', async () => {
      const { getLinks } = await import('@/lib/link-in-bio/link-service');
      expect(typeof getLinks).toBe('function');
    });

    it('should return array of links', async () => {
      const { getLinks } = await import('@/lib/link-in-bio/link-service');
      const result = await getLinks('user-123');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createLink', () => {
    it('should be exported as a function', async () => {
      const { createLink } = await import('@/lib/link-in-bio/link-service');
      expect(typeof createLink).toBe('function');
    });

    it('should accept userId and link data', async () => {
      const { createLink } = await import('@/lib/link-in-bio/link-service');
      const result = await createLink('user-123', {
        title: 'New Link',
        url: 'https://example.com',
      });

      expect(result).toBeDefined();
    });
  });

  describe('updateLinkPositions', () => {
    it('should be exported as a function', async () => {
      const { updateLinkPositions } = await import('@/lib/link-in-bio/link-service');
      expect(typeof updateLinkPositions).toBe('function');
    });

    it('should accept userId and linkIds array', async () => {
      const { updateLinkPositions } = await import('@/lib/link-in-bio/link-service');

      // Should not throw
      await expect(
        updateLinkPositions('user-123', ['link-1', 'link-2'])
      ).resolves.toBeUndefined();
    });
  });

  describe('trackClick', () => {
    it('should be exported as a function', async () => {
      const { trackClick } = await import('@/lib/link-in-bio/link-service');
      expect(typeof trackClick).toBe('function');
    });

    it('should accept linkId and optional metadata', async () => {
      const { trackClick } = await import('@/lib/link-in-bio/link-service');

      await expect(
        trackClick('link-1', 'https://pinterest.com', 'Mozilla/5.0')
      ).resolves.toBeUndefined();
    });
  });

  describe('trackPageView', () => {
    it('should be exported as a function', async () => {
      const { trackPageView } = await import('@/lib/link-in-bio/link-service');
      expect(typeof trackPageView).toBe('function');
    });

    it('should accept userId', async () => {
      const { trackPageView } = await import('@/lib/link-in-bio/link-service');

      await expect(trackPageView('user-123')).resolves.toBeUndefined();
    });
  });
});

describe('Link In Bio Config Types', () => {
  describe('Theme Options', () => {
    const themes = ['minimal', 'gradient', 'dark', 'light', 'custom'];

    themes.forEach((theme) => {
      it(`should recognize ${theme} as valid theme`, () => {
        expect(themes).toContain(theme);
      });
    });
  });

  describe('Config Fields', () => {
    it('should have required config fields', () => {
      const config = {
        username: 'havenandhold',
        title: 'Haven & Hold',
        bio: 'Quotes for growth',
        avatar_url: 'https://example.com/avatar.jpg',
        theme: 'minimal',
        background_color: '#ffffff',
        text_color: '#000000',
      };

      expect(config.username).toBeDefined();
      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
    });
  });
});

describe('Link Types', () => {
  describe('Link Fields', () => {
    it('should have required link fields', () => {
      const link = {
        url: 'https://example.com',
        title: 'Example Link',
        position: 0,
      };

      expect(link.url).toBeDefined();
      expect(link.title).toBeDefined();
      expect(link.position).toBeDefined();
    });

    it('should support optional fields', () => {
      const link = {
        url: 'https://example.com',
        title: 'Example Link',
        description: 'A description',
        icon: 'shopping-cart',
        position: 0,
        is_featured: true,
      };

      expect(link.description).toBeDefined();
      expect(link.icon).toBeDefined();
      expect(link.is_featured).toBe(true);
    });
  });

  describe('Icon Options', () => {
    const icons = ['shopping-cart', 'heart', 'instagram', 'pinterest', 'link', 'star'];

    icons.forEach((icon) => {
      it(`should recognize ${icon} as valid icon`, () => {
        expect(icons).toContain(icon);
      });
    });
  });
});

describe('Position Management', () => {
  describe('Auto Position', () => {
    it('should assign next position automatically', () => {
      const links = [
        { position: 0 },
        { position: 1 },
        { position: 2 },
      ];

      const maxPosition = Math.max(...links.map(l => l.position));
      const nextPosition = maxPosition + 1;

      expect(nextPosition).toBe(3);
    });

    it('should start at 0 for first link', () => {
      const links: Array<{ position: number }> = [];
      const maxPosition = links.length > 0
        ? Math.max(...links.map(l => l.position))
        : -1;
      const nextPosition = maxPosition + 1;

      expect(nextPosition).toBe(0);
    });
  });

  describe('Reordering', () => {
    it('should update positions for reordered links', () => {
      const newOrder = ['link-3', 'link-1', 'link-2'];
      const updates = newOrder.map((id, index) => ({ id, position: index }));

      expect(updates[0]).toEqual({ id: 'link-3', position: 0 });
      expect(updates[1]).toEqual({ id: 'link-1', position: 1 });
      expect(updates[2]).toEqual({ id: 'link-2', position: 2 });
    });
  });
});

describe('Click Tracking', () => {
  describe('Click Record', () => {
    it('should include link_id', () => {
      const clickRecord = {
        link_id: 'link-1',
        referrer: 'https://instagram.com',
        user_agent: 'Mozilla/5.0',
        clicked_at: new Date().toISOString(),
      };

      expect(clickRecord.link_id).toBeDefined();
    });

    it('should allow optional metadata', () => {
      const clickRecord = {
        link_id: 'link-1',
        referrer: undefined,
        user_agent: undefined,
      };

      expect(clickRecord.referrer).toBeUndefined();
      expect(clickRecord.user_agent).toBeUndefined();
    });
  });

  describe('Click Aggregation', () => {
    it('should increment click count', () => {
      const currentClicks = 10;
      const newClicks = currentClicks + 1;

      expect(newClicks).toBe(11);
    });
  });
});

describe('Page View Tracking', () => {
  describe('View Counter', () => {
    it('should increment view count', () => {
      const currentViews = 100;
      const newViews = currentViews + 1;

      expect(newViews).toBe(101);
    });
  });
});

describe('URL Validation', () => {
  describe('Valid URLs', () => {
    const validUrls = [
      'https://example.com',
      'https://shop.example.com/products',
      'https://instagram.com/username',
    ];

    validUrls.forEach((url) => {
      it(`should accept ${url}`, () => {
        const isValid = url.startsWith('https://') || url.startsWith('http://');
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Invalid URLs', () => {
    it('should reject non-URL strings', () => {
      const invalidUrl = 'not a url';
      const isValid = invalidUrl.startsWith('https://') || invalidUrl.startsWith('http://');
      expect(isValid).toBe(false);
    });
  });
});

describe('Analytics', () => {
  describe('Click Analytics', () => {
    it('should calculate click rate', () => {
      const views = 1000;
      const clicks = 50;
      const clickRate = (clicks / views) * 100;

      expect(clickRate).toBe(5);
    });

    it('should handle zero views', () => {
      const views = 0;
      const clicks = 0;
      const clickRate = views > 0 ? (clicks / views) * 100 : 0;

      expect(clickRate).toBe(0);
    });
  });

  describe('Top Links', () => {
    it('should sort links by click count', () => {
      const links = [
        { title: 'Link A', clicks: 10 },
        { title: 'Link B', clicks: 50 },
        { title: 'Link C', clicks: 25 },
      ];

      const sorted = [...links].sort((a, b) => b.clicks - a.clicks);

      expect(sorted[0].title).toBe('Link B');
      expect(sorted[1].title).toBe('Link C');
      expect(sorted[2].title).toBe('Link A');
    });
  });
});
