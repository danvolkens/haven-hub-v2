import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  truncate,
  slugify,
  capitalize,
  sleep,
  generateId,
  debounce,
  throttle,
  groupBy,
  sortBy,
  pick,
  omit,
  isValidEmail,
  isValidUrl,
} from '@/lib/utils';

describe('cn (class name utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'disabled')).toBe('base active');
  });

  it('should merge Tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatCurrency', () => {
  it('should format USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-50)).toBe('-$50.00');
  });

  it('should format other currencies', () => {
    expect(formatCurrency(100, 'EUR')).toContain('100');
  });

  it('should round to two decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
  });
});

describe('formatNumber', () => {
  it('should format millions with M suffix', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('should not format small numbers', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('should format decimal as percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
  });

  it('should format with custom decimals', () => {
    expect(formatPercent(0.5555, 2)).toBe('55.55%');
  });

  it('should handle zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('should handle values over 100%', () => {
    expect(formatPercent(1.5)).toBe('150.0%');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    // Use a date that's timezone-safe by specifying time
    const date = new Date('2024-01-15T12:00:00');
    const result = formatDate(date);
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
    // Date might vary by timezone, so just check format
    expect(result).toMatch(/Jan \d{1,2}, 2024/);
  });

  it('should format date string', () => {
    const result = formatDate('2024-01-15T12:00:00');
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });

  it('should accept custom options', () => {
    const result = formatDate('2024-01-15', { month: 'long' });
    expect(result).toContain('January');
  });
});

describe('formatTime', () => {
  it('should format time correctly', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatTime(date);
    expect(result).toMatch(/2:30\s*(PM|pm)/i);
  });

  it('should format midnight', () => {
    const date = new Date('2024-01-15T00:00:00');
    const result = formatTime(date);
    expect(result).toMatch(/12:00\s*(AM|am)/i);
  });
});

describe('formatDateTime', () => {
  it('should combine date and time formatting', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('at');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format "just now" for recent times', () => {
    const result = formatRelativeTime(new Date('2024-01-15T11:59:30'));
    expect(result).toBe('just now');
  });

  it('should format minutes ago', () => {
    const result = formatRelativeTime(new Date('2024-01-15T11:55:00'));
    expect(result).toBe('5m ago');
  });

  it('should format hours ago', () => {
    const result = formatRelativeTime(new Date('2024-01-15T10:00:00'));
    expect(result).toBe('2h ago');
  });

  it('should format days ago', () => {
    const result = formatRelativeTime(new Date('2024-01-13T12:00:00'));
    expect(result).toBe('2d ago');
  });

  it('should format as date for older dates', () => {
    const result = formatRelativeTime(new Date('2024-01-01T12:00:00'));
    expect(result).toContain('Jan');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello, World!', 8)).toBe('Hello...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('should handle exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

describe('slugify', () => {
  it('should convert to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('should trim leading/trailing hyphens', () => {
    expect(slugify(' hello world ')).toBe('hello-world');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle single character', () => {
    expect(capitalize('h')).toBe('H');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified time', async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('generateId', () => {
  it('should generate unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should include prefix if provided', () => {
    const id = generateId('user');
    expect(id).toMatch(/^user_/);
  });

  it('should generate without prefix', () => {
    const id = generateId();
    expect(id).not.toContain('_');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle function calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [
      { category: 'a', value: 1 },
      { category: 'b', value: 2 },
      { category: 'a', value: 3 },
    ];

    const result = groupBy(items, (item) => item.category);

    expect(result).toEqual({
      a: [
        { category: 'a', value: 1 },
        { category: 'a', value: 3 },
      ],
      b: [{ category: 'b', value: 2 }],
    });
  });

  it('should handle empty array', () => {
    expect(groupBy([], () => 'key')).toEqual({});
  });
});

describe('sortBy', () => {
  it('should sort ascending by default', () => {
    const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sortBy(items, (item) => item.value);
    expect(result.map((i) => i.value)).toEqual([1, 2, 3]);
  });

  it('should sort descending when specified', () => {
    const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
    const result = sortBy(items, (item) => item.value, 'desc');
    expect(result.map((i) => i.value)).toEqual([3, 2, 1]);
  });

  it('should not mutate original array', () => {
    const items = [{ value: 3 }, { value: 1 }];
    sortBy(items, (item) => item.value);
    expect(items.map((i) => i.value)).toEqual([3, 1]);
  });
});

describe('pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('should ignore missing keys', () => {
    const obj = { a: 1 };
    expect(pick(obj, ['a', 'b' as keyof typeof obj])).toEqual({ a: 1 });
  });
});

describe('omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('should not mutate original object', () => {
    const obj = { a: 1, b: 2 };
    omit(obj, ['b']);
    expect(obj).toEqual({ a: 1, b: 2 });
  });
});

describe('isValidEmail', () => {
  it('should return true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('should return true for valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});
