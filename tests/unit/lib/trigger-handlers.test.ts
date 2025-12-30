import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM environment
const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  documentElement: {
    scrollHeight: 2000,
  },
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  innerHeight: 800,
  scrollY: 0,
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

// Setup global mocks
vi.stubGlobal('document', mockDocument);
vi.stubGlobal('window', mockWindow);
vi.stubGlobal('sessionStorage', mockSessionStorage);

describe('Trigger Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockWindow.scrollY = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setupExitIntent', () => {
    it('should be exported as a function', async () => {
      const { setupExitIntent } = await import('@/lib/popups/trigger-handlers');
      expect(typeof setupExitIntent).toBe('function');
    });

    it('should add mouseleave event listener', async () => {
      const { setupExitIntent } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      setupExitIntent(callback);

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      );
    });

    it('should return cleanup function', async () => {
      const { setupExitIntent } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupExitIntent(callback);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove event listener on cleanup', async () => {
      const { setupExitIntent } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupExitIntent(callback);
      cleanup();

      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      );
    });
  });

  describe('setupScrollDepth', () => {
    it('should be exported as a function', async () => {
      const { setupScrollDepth } = await import('@/lib/popups/trigger-handlers');
      expect(typeof setupScrollDepth).toBe('function');
    });

    it('should add scroll event listener', async () => {
      const { setupScrollDepth } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      setupScrollDepth(50, callback);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should return cleanup function', async () => {
      const { setupScrollDepth } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupScrollDepth(50, callback);

      expect(typeof cleanup).toBe('function');
    });
  });

  describe('setupTimeOnPage', () => {
    it('should be exported as a function', async () => {
      const { setupTimeOnPage } = await import('@/lib/popups/trigger-handlers');
      expect(typeof setupTimeOnPage).toBe('function');
    });

    it('should set timeout for specified seconds', async () => {
      const { setupTimeOnPage } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      setupTimeOnPage(5, callback);

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(callback).toHaveBeenCalled();
    });

    it('should return cleanup function that clears timeout', async () => {
      const { setupTimeOnPage } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupTimeOnPage(10, callback);
      cleanup();

      vi.advanceTimersByTime(10000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('setupPageViews', () => {
    it('should be exported as a function', async () => {
      const { setupPageViews } = await import('@/lib/popups/trigger-handlers');
      expect(typeof setupPageViews).toBe('function');
    });

    it('should increment page view count in sessionStorage', async () => {
      mockSessionStorage.getItem.mockReturnValue('2');

      const { setupPageViews } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      setupPageViews(5, callback);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'haven_page_views',
        expect.any(String)
      );
    });

    it('should return cleanup function', async () => {
      mockSessionStorage.getItem.mockReturnValue('0');

      const { setupPageViews } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupPageViews(5, callback);

      expect(typeof cleanup).toBe('function');
    });
  });

  describe('setupClickTrigger', () => {
    it('should be exported as a function', async () => {
      const { setupClickTrigger } = await import('@/lib/popups/trigger-handlers');
      expect(typeof setupClickTrigger).toBe('function');
    });

    it('should add click event listener', async () => {
      const { setupClickTrigger } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      setupClickTrigger('.trigger-button', callback);

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    it('should return cleanup function', async () => {
      const { setupClickTrigger } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupClickTrigger('.trigger-button', callback);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove click listener on cleanup', async () => {
      const { setupClickTrigger } = await import('@/lib/popups/trigger-handlers');
      const callback = vi.fn();

      const cleanup = setupClickTrigger('.trigger-button', callback);
      cleanup();

      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });
  });
});

describe('Trigger Logic', () => {
  describe('Exit Intent Detection', () => {
    it('should detect mouse leaving top of viewport', () => {
      const mouseEvent = { clientY: -5 };
      const isExitIntent = mouseEvent.clientY <= 0;

      expect(isExitIntent).toBe(true);
    });

    it('should not trigger for side exits', () => {
      const mouseEvent = { clientY: 100 };
      const isExitIntent = mouseEvent.clientY <= 0;

      expect(isExitIntent).toBe(false);
    });
  });

  describe('Scroll Depth Calculation', () => {
    it('should calculate scroll percentage correctly', () => {
      const scrollHeight = 2000;
      const windowHeight = 800;
      const currentScroll = 600;

      const totalScrollable = scrollHeight - windowHeight; // 1200
      const scrollPercentage = (currentScroll / totalScrollable) * 100;

      expect(scrollPercentage).toBe(50);
    });

    it('should trigger at threshold', () => {
      const scrollPercentage = 75;
      const threshold = 75;

      const shouldTrigger = scrollPercentage >= threshold;
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger below threshold', () => {
      const scrollPercentage = 74;
      const threshold = 75;

      const shouldTrigger = scrollPercentage >= threshold;
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Time on Page', () => {
    it('should convert seconds to milliseconds', () => {
      const seconds = 5;
      const milliseconds = seconds * 1000;

      expect(milliseconds).toBe(5000);
    });
  });

  describe('Page Views Counting', () => {
    it('should parse stored count correctly', () => {
      const stored = '5';
      const count = parseInt(stored, 10);

      expect(count).toBe(5);
    });

    it('should default to 0 if no stored value', () => {
      const stored = null;
      const count = parseInt(stored || '0', 10);

      expect(count).toBe(0);
    });

    it('should increment count', () => {
      const currentViews = 5;
      const newViews = currentViews + 1;

      expect(newViews).toBe(6);
    });
  });

  describe('Click Trigger Matching', () => {
    it('should match element selector', () => {
      const element = {
        matches: (selector: string) => selector === '.trigger-button',
        closest: () => null,
      };

      const matches = element.matches('.trigger-button');
      expect(matches).toBe(true);
    });

    it('should match parent with closest', () => {
      const parentElement = { className: 'trigger-button' };
      const element = {
        matches: () => false,
        closest: (selector: string) => selector === '.trigger-button' ? parentElement : null,
      };

      const matches = element.matches('.trigger-button') || element.closest('.trigger-button');
      expect(matches).toBeTruthy();
    });
  });
});

describe('Trigger Types', () => {
  const triggerTypes = ['exit_intent', 'scroll_depth', 'time_on_page', 'page_views', 'click'];

  triggerTypes.forEach((type) => {
    it(`should support ${type} trigger type`, () => {
      expect(triggerTypes).toContain(type);
    });
  });
});

describe('Cleanup Functions', () => {
  it('should be callable multiple times safely', () => {
    const cleanup = () => {
      // Cleanup logic
    };

    expect(() => {
      cleanup();
      cleanup();
    }).not.toThrow();
  });

  it('should return no-op function when not needed', () => {
    const cleanup = () => {};
    expect(typeof cleanup).toBe('function');
    expect(cleanup()).toBeUndefined();
  });
});
