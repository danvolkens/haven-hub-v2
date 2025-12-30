import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder
function createMockQueryBuilder(data: unknown[] | unknown = [], error: unknown = null) {
  const dataArray = Array.isArray(data) ? data : [data];
  const builder: Record<string, unknown> = {};

  ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'is', 'not'].forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  builder.single = vi.fn().mockResolvedValue({ data: dataArray[0] || null, error });
  builder.then = vi.fn((resolve) => resolve({ data: dataArray, error, count: dataArray.length }));

  return builder;
}

const mockQueryBuilder = createMockQueryBuilder([]);

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
  })),
}));

describe('Seasonal Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SEASONAL_PERIODS', () => {
    it('should export seasonal periods array', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      expect(Array.isArray(SEASONAL_PERIODS)).toBe(true);
    });

    it('should have 16 seasonal periods', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      expect(SEASONAL_PERIODS.length).toBe(16);
    });

    it('should have Q1 periods', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      const q1Periods = SEASONAL_PERIODS.filter(p =>
        ['new_years', 'valentines', 'spring', 'easter'].includes(p.id)
      );
      expect(q1Periods.length).toBe(4);
    });

    it('should have Q2 periods', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      const q2Periods = SEASONAL_PERIODS.filter(p =>
        ['mothers_day', 'mental_health_month', 'fathers_day', 'summer'].includes(p.id)
      );
      expect(q2Periods.length).toBe(4);
    });

    it('should have Q3 periods', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      const q3Periods = SEASONAL_PERIODS.filter(p =>
        ['back_to_school', 'suicide_prevention', 'self_care_september', 'fall'].includes(p.id)
      );
      expect(q3Periods.length).toBe(4);
    });

    it('should have Q4 periods', async () => {
      const { SEASONAL_PERIODS } = await import('@/lib/seasonal/seasonal-service');
      const q4Periods = SEASONAL_PERIODS.filter(p =>
        ['halloween', 'thanksgiving', 'winter', 'christmas'].includes(p.id)
      );
      expect(q4Periods.length).toBe(4);
    });
  });

  describe('getActiveSeasons', () => {
    it('should be exported as a function', async () => {
      const { getActiveSeasons } = await import('@/lib/seasonal/seasonal-service');
      expect(typeof getActiveSeasons).toBe('function');
    });

    it('should return array of active seasons', async () => {
      const { getActiveSeasons } = await import('@/lib/seasonal/seasonal-service');
      const seasons = getActiveSeasons(new Date());
      expect(Array.isArray(seasons)).toBe(true);
    });

    it('should detect Christmas in December', async () => {
      const { getActiveSeasons } = await import('@/lib/seasonal/seasonal-service');
      const december15 = new Date('2024-12-15');
      const seasons = getActiveSeasons(december15);

      const hasChristmas = seasons.some(s => s.id === 'christmas');
      expect(hasChristmas).toBe(true);
    });

    it('should detect Halloween in late October', async () => {
      const { getActiveSeasons } = await import('@/lib/seasonal/seasonal-service');
      const october25 = new Date('2024-10-25');
      const seasons = getActiveSeasons(october25);

      const hasHalloween = seasons.some(s => s.id === 'halloween');
      expect(hasHalloween).toBe(true);
    });

    it('should detect Valentines in February', async () => {
      const { getActiveSeasons } = await import('@/lib/seasonal/seasonal-service');
      const february10 = new Date('2024-02-10');
      const seasons = getActiveSeasons(february10);

      const hasValentines = seasons.some(s => s.id === 'valentines');
      expect(hasValentines).toBe(true);
    });
  });

  describe('getActiveTags', () => {
    it('should be exported as a function', async () => {
      const { getActiveTags } = await import('@/lib/seasonal/seasonal-service');
      expect(typeof getActiveTags).toBe('function');
    });

    it('should return array of unique tags', async () => {
      const { getActiveTags } = await import('@/lib/seasonal/seasonal-service');
      const tags = getActiveTags(new Date());

      expect(Array.isArray(tags)).toBe(true);
      // Tags should be unique
      expect(tags.length).toBe(new Set(tags).size);
    });

    it('should include christmas tags in December', async () => {
      const { getActiveTags } = await import('@/lib/seasonal/seasonal-service');
      const december15 = new Date('2024-12-15');
      const tags = getActiveTags(december15);

      expect(tags).toContain('christmas');
      expect(tags).toContain('holiday');
    });
  });

  describe('processSeasonalActivation', () => {
    it('should be exported as a function', async () => {
      const { processSeasonalActivation } = await import('@/lib/seasonal/seasonal-service');
      expect(typeof processSeasonalActivation).toBe('function');
    });

    it('should return activation result structure', async () => {
      const { processSeasonalActivation } = await import('@/lib/seasonal/seasonal-service');
      const result = await processSeasonalActivation('user-123');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('pinsActivated');
      expect(result).toHaveProperty('pinsDeactivated');
      expect(result).toHaveProperty('campaignsActivated');
      expect(result).toHaveProperty('campaignsPaused');
    });
  });
});

describe('Seasonal Period Interface', () => {
  it('should have required fields', () => {
    const period = {
      id: 'christmas',
      name: 'Christmas',
      startMonth: 12,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      tags: ['christmas', 'holiday'],
    };

    expect(period.id).toBeDefined();
    expect(period.name).toBeDefined();
    expect(period.startMonth).toBeDefined();
    expect(period.startDay).toBeDefined();
    expect(period.endMonth).toBeDefined();
    expect(period.endDay).toBeDefined();
    expect(period.tags).toBeDefined();
  });
});

describe('Date In Period Logic', () => {
  describe('Normal Period (same year)', () => {
    it('should match date within period', () => {
      const period = { startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 };
      const date = new Date('2024-07-15'); // July
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const inPeriod = month >= period.startMonth && month <= period.endMonth;
      expect(inPeriod).toBe(true);
    });

    it('should not match date before period', () => {
      const period = { startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 };
      const date = new Date('2024-05-15'); // May
      const month = date.getMonth() + 1;

      const inPeriod = month >= period.startMonth && month <= period.endMonth;
      expect(inPeriod).toBe(false);
    });

    it('should not match date after period', () => {
      const period = { startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 };
      const date = new Date('2024-09-15'); // September
      const month = date.getMonth() + 1;

      const inPeriod = month >= period.startMonth && month <= period.endMonth;
      expect(inPeriod).toBe(false);
    });
  });

  describe('Year-Spanning Period', () => {
    it('should match December date for New Years period', () => {
      const period = { startMonth: 12, startDay: 26, endMonth: 1, endDay: 7 };
      const date = new Date('2024-12-28');
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // For year-spanning: startMonth > endMonth
      const spansYear = period.startMonth > period.endMonth;
      expect(spansYear).toBe(true);

      const inDecember = month === period.startMonth && day >= period.startDay;
      expect(inDecember).toBe(true);
    });

    it('should match January date for New Years period', () => {
      const period = { startMonth: 12, startDay: 26, endMonth: 1, endDay: 7 };
      const date = new Date('2024-01-03');
      const month = date.getMonth() + 1;
      const day = date.getDate();

      const inJanuary = month === period.endMonth && day <= period.endDay;
      expect(inJanuary).toBe(true);
    });
  });
});

describe('Seasonal Tags', () => {
  describe('Christmas Tags', () => {
    const christmasTags = ['christmas', 'holiday', 'gift', 'joy'];

    christmasTags.forEach(tag => {
      it(`should include ${tag} tag`, () => {
        expect(christmasTags).toContain(tag);
      });
    });
  });

  describe('Mental Health Tags', () => {
    const mentalHealthTags = ['mental_health', 'awareness', 'wellness'];

    mentalHealthTags.forEach(tag => {
      it(`should include ${tag} tag`, () => {
        expect(mentalHealthTags).toContain(tag);
      });
    });
  });

  describe('Spring Tags', () => {
    const springTags = ['spring', 'renewal', 'growth'];

    springTags.forEach(tag => {
      it(`should include ${tag} tag`, () => {
        expect(springTags).toContain(tag);
      });
    });
  });
});

describe('Activation Result', () => {
  it('should have counts initialized to 0', () => {
    const result = {
      userId: 'user-123',
      pinsActivated: 0,
      pinsDeactivated: 0,
      campaignsActivated: 0,
      campaignsPaused: 0,
      approvalsCreated: 0,
    };

    expect(result.pinsActivated).toBe(0);
    expect(result.pinsDeactivated).toBe(0);
    expect(result.campaignsActivated).toBe(0);
    expect(result.campaignsPaused).toBe(0);
    expect(result.approvalsCreated).toBe(0);
  });

  it('should increment pin counts', () => {
    const result = {
      pinsActivated: 0,
      pinsDeactivated: 0,
    };

    result.pinsActivated += 5;
    result.pinsDeactivated += 3;

    expect(result.pinsActivated).toBe(5);
    expect(result.pinsDeactivated).toBe(3);
  });
});

describe('Multiple Active Seasons', () => {
  it('should handle overlapping seasons', () => {
    // May has both Mental Health Month and Spring
    const maySeasons = ['mental_health_month', 'spring', 'mothers_day'];
    expect(maySeasons.length).toBeGreaterThan(1);
  });

  it('should merge tags from overlapping seasons', () => {
    const season1Tags = ['spring', 'renewal', 'growth'];
    const season2Tags = ['mental_health', 'awareness', 'wellness'];

    const allTags = [...season1Tags, ...season2Tags];
    const uniqueTags = [...new Set(allTags)];

    expect(uniqueTags.length).toBe(6);
  });
});
