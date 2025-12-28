/**
 * Scheduler Unit Tests
 * Prompt 3.1: Day-Specific Scheduling Logic
 */

import { describe, it, expect } from 'vitest';
import {
  DAY_CONTENT_MAP,
  DAY_NAMES,
  getAvailableSlotsForDay,
  getDayTheme,
  isOptimalDayFor,
  formatSlotForDisplay,
  type ScheduleSlot,
} from '../scheduler';

// ============================================================================
// Tests: Day Content Mapping
// ============================================================================

describe('DAY_CONTENT_MAP', () => {
  it('should have all 7 days configured', () => {
    expect(Object.keys(DAY_CONTENT_MAP)).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(DAY_CONTENT_MAP[i]).toBeDefined();
    }
  });

  it('should have Sunday as carousel + brand_story', () => {
    const sunday = DAY_CONTENT_MAP[0];
    expect(sunday.primary.type).toBe('carousel');
    expect(sunday.primary.pillar).toBe('brand_story');
    expect(sunday.primary.time).toBe('10:00');
    expect(sunday.theme).toBe('reflection');
  });

  it('should have Monday as carousel + educational', () => {
    const monday = DAY_CONTENT_MAP[1];
    expect(monday.primary.type).toBe('carousel');
    expect(monday.primary.pillar).toBe('educational');
    expect(monday.primary.time).toBe('11:00');
    expect(monday.theme).toBe('fresh_start');
  });

  it('should have Tuesday as reel + product_showcase', () => {
    const tuesday = DAY_CONTENT_MAP[2];
    expect(tuesday.primary.type).toBe('reel');
    expect(tuesday.primary.pillar).toBe('product_showcase');
    expect(tuesday.primary.time).toBe('09:00');
    expect(tuesday.theme).toBe('transformation');
  });

  it('should have Wednesday as feed + product_showcase', () => {
    const wednesday = DAY_CONTENT_MAP[3];
    expect(wednesday.primary.type).toBe('feed');
    expect(wednesday.primary.pillar).toBe('product_showcase');
    expect(wednesday.primary.time).toBe('13:00');
    expect(wednesday.theme).toBe('bestseller');
  });

  it('should have Thursday with two slots', () => {
    const thursday = DAY_CONTENT_MAP[4];
    expect(thursday.primary.type).toBe('reel');
    expect(thursday.primary.pillar).toBe('brand_story');
    expect(thursday.primary.time).toBe('12:00');
    expect(thursday.secondary).toBeDefined();
    expect(thursday.secondary?.type).toBe('carousel');
    expect(thursday.secondary?.pillar).toBe('educational');
    expect(thursday.secondary?.time).toBe('19:00');
    expect(thursday.theme).toBe('therapy_thursday');
  });

  it('should have Friday as feed + community', () => {
    const friday = DAY_CONTENT_MAP[5];
    expect(friday.primary.type).toBe('feed');
    expect(friday.primary.pillar).toBe('community');
    expect(friday.primary.time).toBe('11:00');
    expect(friday.theme).toBe('feature_friday');
  });

  it('should have Saturday with two product_showcase slots', () => {
    const saturday = DAY_CONTENT_MAP[6];
    expect(saturday.primary.type).toBe('reel');
    expect(saturday.primary.pillar).toBe('product_showcase');
    expect(saturday.primary.time).toBe('09:00');
    expect(saturday.secondary).toBeDefined();
    expect(saturday.secondary?.type).toBe('feed');
    expect(saturday.secondary?.pillar).toBe('product_showcase');
    expect(saturday.secondary?.time).toBe('13:00');
    expect(saturday.theme).toBe('showcase');
  });
});

// ============================================================================
// Tests: Helper Functions
// ============================================================================

describe('getAvailableSlotsForDay', () => {
  it('should return single slot for Sunday', () => {
    const slots = getAvailableSlotsForDay(0);
    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBe('10:00');
    expect(slots[0].isPrimary).toBe(true);
  });

  it('should return two slots for Thursday', () => {
    const slots = getAvailableSlotsForDay(4);
    expect(slots).toHaveLength(2);
    expect(slots[0].time).toBe('12:00');
    expect(slots[0].isPrimary).toBe(true);
    expect(slots[1].time).toBe('19:00');
    expect(slots[1].isPrimary).toBe(false);
  });

  it('should return two slots for Saturday', () => {
    const slots = getAvailableSlotsForDay(6);
    expect(slots).toHaveLength(2);
    expect(slots[0].time).toBe('09:00');
    expect(slots[1].time).toBe('13:00');
  });
});

describe('getDayTheme', () => {
  it('should return correct theme for each day', () => {
    expect(getDayTheme(0)).toBe('reflection');
    expect(getDayTheme(1)).toBe('fresh_start');
    expect(getDayTheme(2)).toBe('transformation');
    expect(getDayTheme(3)).toBe('bestseller');
    expect(getDayTheme(4)).toBe('therapy_thursday');
    expect(getDayTheme(5)).toBe('feature_friday');
    expect(getDayTheme(6)).toBe('showcase');
  });

  it('should return general for invalid day', () => {
    expect(getDayTheme(99)).toBe('general');
  });
});

describe('isOptimalDayFor', () => {
  it('should return true for matching primary slot', () => {
    expect(isOptimalDayFor(0, 'carousel', 'brand_story')).toBe(true);
    expect(isOptimalDayFor(1, 'carousel', 'educational')).toBe(true);
    expect(isOptimalDayFor(2, 'reel', 'product_showcase')).toBe(true);
    expect(isOptimalDayFor(5, 'feed', 'community')).toBe(true);
  });

  it('should return true for matching secondary slot', () => {
    expect(isOptimalDayFor(4, 'carousel', 'educational')).toBe(true);
    expect(isOptimalDayFor(6, 'feed', 'product_showcase')).toBe(true);
  });

  it('should return false for non-matching combo', () => {
    expect(isOptimalDayFor(0, 'reel', 'brand_story')).toBe(false);
    expect(isOptimalDayFor(1, 'feed', 'educational')).toBe(false);
    expect(isOptimalDayFor(5, 'reel', 'community')).toBe(false);
  });
});

describe('formatSlotForDisplay', () => {
  it('should format slot correctly', () => {
    const slot: ScheduleSlot = {
      scheduled_at: new Date('2024-12-30T09:00:00'),
      day_theme: 'transformation',
      is_optimal: true,
      day_of_week: 1, // Monday
      time_slot: '09:00',
    };

    const formatted = formatSlotForDisplay(slot);
    expect(formatted).toContain('Monday');
    expect(formatted).toContain('Dec');
    expect(formatted).toContain('30');
    expect(formatted).toContain('9:00');
    expect(formatted).toContain('AM');
  });
});

describe('DAY_NAMES', () => {
  it('should have all 7 day names', () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe('Sunday');
    expect(DAY_NAMES[1]).toBe('Monday');
    expect(DAY_NAMES[6]).toBe('Saturday');
  });
});

// ============================================================================
// Tests: Content Distribution
// ============================================================================

describe('content pillar distribution', () => {
  it('should have product_showcase on 3 days (40%)', () => {
    const productShowcaseDays = Object.entries(DAY_CONTENT_MAP).filter(
      ([, config]) =>
        config.primary.pillar === 'product_showcase' ||
        config.secondary?.pillar === 'product_showcase'
    );
    // Tuesday, Wednesday, Saturday all have product_showcase
    expect(productShowcaseDays.length).toBeGreaterThanOrEqual(3);
  });

  it('should have brand_story on 2 days (20%)', () => {
    const brandStoryDays = Object.entries(DAY_CONTENT_MAP).filter(
      ([, config]) =>
        config.primary.pillar === 'brand_story' || config.secondary?.pillar === 'brand_story'
    );
    // Sunday, Thursday
    expect(brandStoryDays.length).toBeGreaterThanOrEqual(2);
  });

  it('should have educational on 2 days (20%)', () => {
    const educationalDays = Object.entries(DAY_CONTENT_MAP).filter(
      ([, config]) =>
        config.primary.pillar === 'educational' || config.secondary?.pillar === 'educational'
    );
    // Monday, Thursday
    expect(educationalDays.length).toBeGreaterThanOrEqual(2);
  });

  it('should have community on 1 day (20%)', () => {
    const communityDays = Object.entries(DAY_CONTENT_MAP).filter(
      ([, config]) =>
        config.primary.pillar === 'community' || config.secondary?.pillar === 'community'
    );
    // Friday
    expect(communityDays.length).toBeGreaterThanOrEqual(1);
  });
});
