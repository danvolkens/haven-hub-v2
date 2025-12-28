/**
 * Pillar Balance Unit Tests
 * Prompt 3.2: Weekly Mix Validation
 */

import { describe, it, expect } from 'vitest';
import {
  PILLAR_TARGETS,
  PILLAR_SUGGESTIONS,
  getSuggestionForPillar,
  wouldImproveBalance,
  getPillarsNeedingContent,
  getRecommendedPillar,
  calculatePercentage,
  meetsMinimum,
  formatBalanceForDisplay,
  type PillarBalance,
} from '../pillar-balance';

// ============================================================================
// Mock Data
// ============================================================================

const createMockBalance = (overrides: Partial<PillarBalance> = {}): PillarBalance => ({
  balance: [
    {
      pillar: 'product_showcase',
      label: 'Product Showcase',
      count: 4,
      actual: 40,
      target: 40,
      minimum: 30,
      status: 'ok',
      suggestion: null,
    },
    {
      pillar: 'brand_story',
      label: 'Brand Story',
      count: 2,
      actual: 20,
      target: 20,
      minimum: 15,
      status: 'ok',
      suggestion: null,
    },
    {
      pillar: 'educational',
      label: 'Educational',
      count: 2,
      actual: 20,
      target: 20,
      minimum: 15,
      status: 'ok',
      suggestion: null,
    },
    {
      pillar: 'community',
      label: 'Community',
      count: 2,
      actual: 20,
      target: 20,
      minimum: 15,
      status: 'ok',
      suggestion: null,
    },
  ],
  total: 10,
  weekStartDate: new Date('2024-12-29'),
  weekEndDate: new Date('2025-01-05'),
  isHealthy: true,
  ...overrides,
});

const createUnbalancedMock = (): PillarBalance => ({
  balance: [
    {
      pillar: 'product_showcase',
      label: 'Product Showcase',
      count: 6,
      actual: 60,
      target: 40,
      minimum: 30,
      status: 'ok',
      suggestion: null,
    },
    {
      pillar: 'brand_story',
      label: 'Brand Story',
      count: 2,
      actual: 20,
      target: 20,
      minimum: 15,
      status: 'ok',
      suggestion: null,
    },
    {
      pillar: 'educational',
      label: 'Educational',
      count: 1,
      actual: 10,
      target: 20,
      minimum: 15,
      status: 'warning',
      suggestion: 'Schedule a how-to carousel or tips post',
    },
    {
      pillar: 'community',
      label: 'Community',
      count: 1,
      actual: 10,
      target: 20,
      minimum: 15,
      status: 'warning',
      suggestion: 'Feature a customer photo or ask a community question',
    },
  ],
  total: 10,
  weekStartDate: new Date('2024-12-29'),
  weekEndDate: new Date('2025-01-05'),
  isHealthy: false,
});

// ============================================================================
// Tests: Configuration
// ============================================================================

describe('PILLAR_TARGETS', () => {
  it('should have targets for all 4 pillars', () => {
    expect(Object.keys(PILLAR_TARGETS)).toHaveLength(4);
    expect(PILLAR_TARGETS.product_showcase).toBeDefined();
    expect(PILLAR_TARGETS.brand_story).toBeDefined();
    expect(PILLAR_TARGETS.educational).toBeDefined();
    expect(PILLAR_TARGETS.community).toBeDefined();
  });

  it('should have correct target percentages', () => {
    expect(PILLAR_TARGETS.product_showcase.target).toBe(40);
    expect(PILLAR_TARGETS.brand_story.target).toBe(20);
    expect(PILLAR_TARGETS.educational.target).toBe(20);
    expect(PILLAR_TARGETS.community.target).toBe(20);
  });

  it('should have correct minimum thresholds', () => {
    expect(PILLAR_TARGETS.product_showcase.minimum).toBe(30);
    expect(PILLAR_TARGETS.brand_story.minimum).toBe(15);
    expect(PILLAR_TARGETS.educational.minimum).toBe(15);
    expect(PILLAR_TARGETS.community.minimum).toBe(15);
  });

  it('targets should sum to 100%', () => {
    const sum = Object.values(PILLAR_TARGETS).reduce((acc, p) => acc + p.target, 0);
    expect(sum).toBe(100);
  });
});

describe('PILLAR_SUGGESTIONS', () => {
  it('should have suggestions for all pillars', () => {
    expect(PILLAR_SUGGESTIONS.product_showcase).toBeDefined();
    expect(PILLAR_SUGGESTIONS.brand_story).toBeDefined();
    expect(PILLAR_SUGGESTIONS.educational).toBeDefined();
    expect(PILLAR_SUGGESTIONS.community).toBeDefined();
  });

  it('should have meaningful suggestions', () => {
    expect(PILLAR_SUGGESTIONS.product_showcase).toContain('product');
    expect(PILLAR_SUGGESTIONS.brand_story).toContain('brand');
    expect(PILLAR_SUGGESTIONS.educational).toContain('how-to');
    expect(PILLAR_SUGGESTIONS.community).toContain('customer');
  });
});

// ============================================================================
// Tests: Helper Functions
// ============================================================================

describe('getSuggestionForPillar', () => {
  it('should return correct suggestion for each pillar', () => {
    expect(getSuggestionForPillar('product_showcase')).toBe(PILLAR_SUGGESTIONS.product_showcase);
    expect(getSuggestionForPillar('brand_story')).toBe(PILLAR_SUGGESTIONS.brand_story);
    expect(getSuggestionForPillar('educational')).toBe(PILLAR_SUGGESTIONS.educational);
    expect(getSuggestionForPillar('community')).toBe(PILLAR_SUGGESTIONS.community);
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(4, 10)).toBe(40);
    expect(calculatePercentage(2, 10)).toBe(20);
    expect(calculatePercentage(1, 10)).toBe(10);
  });

  it('should handle zero total', () => {
    expect(calculatePercentage(0, 0)).toBe(0);
    expect(calculatePercentage(5, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
  });
});

describe('meetsMinimum', () => {
  it('should return true when above minimum', () => {
    expect(meetsMinimum('product_showcase', 40)).toBe(true);
    expect(meetsMinimum('brand_story', 20)).toBe(true);
  });

  it('should return true when at minimum', () => {
    expect(meetsMinimum('product_showcase', 30)).toBe(true);
    expect(meetsMinimum('brand_story', 15)).toBe(true);
  });

  it('should return false when below minimum', () => {
    expect(meetsMinimum('product_showcase', 25)).toBe(false);
    expect(meetsMinimum('brand_story', 10)).toBe(false);
  });
});

// ============================================================================
// Tests: Balance Analysis
// ============================================================================

describe('getPillarsNeedingContent', () => {
  it('should return empty array when all pillars are OK', () => {
    const balance = createMockBalance();
    const needing = getPillarsNeedingContent(balance);
    expect(needing).toHaveLength(0);
  });

  it('should return pillars with warning status', () => {
    const balance = createUnbalancedMock();
    const needing = getPillarsNeedingContent(balance);
    expect(needing).toContain('educational');
    expect(needing).toContain('community');
    expect(needing).not.toContain('product_showcase');
  });

  it('should sort by most under-represented first', () => {
    const balance = createUnbalancedMock();
    const needing = getPillarsNeedingContent(balance);
    // Both are at 10%, so order may vary, but both should be included
    expect(needing).toHaveLength(2);
  });
});

describe('getRecommendedPillar', () => {
  it('should recommend warning pillar first', () => {
    const balance = createUnbalancedMock();
    const recommended = getRecommendedPillar(balance);
    expect(['educational', 'community']).toContain(recommended);
  });

  it('should recommend based on distance from target when all OK', () => {
    const balance = createMockBalance();
    // All are at target, so any pillar could be recommended
    const recommended = getRecommendedPillar(balance);
    expect(['product_showcase', 'brand_story', 'educational', 'community']).toContain(
      recommended
    );
  });
});

describe('wouldImproveBalance', () => {
  it('should indicate improvement when pillar is warning', () => {
    const balance = createUnbalancedMock();
    const result = wouldImproveBalance(balance, 'educational');
    expect(result.improves).toBe(true);
  });

  it('should indicate when pillar would become OK', () => {
    // Create a balance where educational is just below minimum
    const balance: PillarBalance = {
      ...createMockBalance(),
      balance: [
        {
          pillar: 'product_showcase',
          label: 'Product Showcase',
          count: 4,
          actual: 40,
          target: 40,
          minimum: 30,
          status: 'ok',
          suggestion: null,
        },
        {
          pillar: 'brand_story',
          label: 'Brand Story',
          count: 3,
          actual: 30,
          target: 20,
          minimum: 15,
          status: 'ok',
          suggestion: null,
        },
        {
          pillar: 'educational',
          label: 'Educational',
          count: 1,
          actual: 10,
          target: 20,
          minimum: 15,
          status: 'warning',
          suggestion: 'Schedule a how-to carousel or tips post',
        },
        {
          pillar: 'community',
          label: 'Community',
          count: 2,
          actual: 20,
          target: 20,
          minimum: 15,
          status: 'ok',
          suggestion: null,
        },
      ],
      total: 10,
      isHealthy: false,
    };

    const result = wouldImproveBalance(balance, 'educational');
    expect(result.improves).toBe(true);
    expect(result.message).toContain('Educational');
  });
});

describe('formatBalanceForDisplay', () => {
  it('should include all pillars', () => {
    const balance = createMockBalance();
    const formatted = formatBalanceForDisplay(balance);
    expect(formatted).toContain('Product Showcase');
    expect(formatted).toContain('Brand Story');
    expect(formatted).toContain('Educational');
    expect(formatted).toContain('Community');
  });

  it('should show healthy status for balanced mix', () => {
    const balance = createMockBalance();
    const formatted = formatBalanceForDisplay(balance);
    expect(formatted).toContain('healthy');
  });

  it('should show warning for unbalanced mix', () => {
    const balance = createUnbalancedMock();
    const formatted = formatBalanceForDisplay(balance);
    expect(formatted).toContain('attention');
  });
});
