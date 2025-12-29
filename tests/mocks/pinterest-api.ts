import { vi } from 'vitest';

/**
 * Pinterest API Mock
 * Mocks Pinterest v5 API responses for testing
 */

export const mockPinterestPin = {
  id: 'pinterest-pin-123',
  created_at: '2024-12-29T00:00:00Z',
  link: 'https://example.com/product',
  title: 'Test Pin Title',
  description: 'Test pin description',
  dominant_color: '#FFFFFF',
  alt_text: 'Alt text for accessibility',
  board_id: 'pinterest-board-123',
  board_section_id: null,
  board_owner: {
    username: 'testuser',
  },
  media: {
    media_type: 'image',
    images: {
      '150x150': {
        width: 150,
        height: 150,
        url: 'https://i.pinimg.com/150x150/test.jpg',
      },
      '400x300': {
        width: 400,
        height: 300,
        url: 'https://i.pinimg.com/400x300/test.jpg',
      },
      '600x': {
        width: 600,
        height: 800,
        url: 'https://i.pinimg.com/600x/test.jpg',
      },
      originals: {
        width: 1000,
        height: 1500,
        url: 'https://i.pinimg.com/originals/test.jpg',
      },
    },
  },
};

export const mockPinterestBoard = {
  id: 'pinterest-board-123',
  name: 'Test Board',
  description: 'A test board for pins',
  owner: {
    username: 'testuser',
  },
  privacy: 'PUBLIC',
  pin_count: 42,
  follower_count: 100,
  created_at: '2024-01-01T00:00:00Z',
};

export const mockPinterestAnalytics = {
  all_time: {
    IMPRESSION: 10000,
    OUTBOUND_CLICK: 500,
    PIN_CLICK: 200,
    SAVE: 150,
    VIDEO_START: 0,
    VIDEO_MRC_VIEW: 0,
    ENGAGEMENT: 350,
    ENGAGEMENT_RATE: 0.035,
  },
  daily_metrics: [
    {
      date: '2024-12-28',
      IMPRESSION: 1000,
      OUTBOUND_CLICK: 50,
      PIN_CLICK: 20,
      SAVE: 15,
    },
    {
      date: '2024-12-29',
      IMPRESSION: 1200,
      OUTBOUND_CLICK: 60,
      PIN_CLICK: 25,
      SAVE: 18,
    },
  ],
};

export const mockPinterestUser = {
  id: 'pinterest-user-123',
  username: 'testuser',
  account_type: 'BUSINESS',
  profile_image: 'https://i.pinimg.com/user/test.jpg',
  website_url: 'https://example.com',
  follower_count: 5000,
  following_count: 100,
  pin_count: 500,
};

/**
 * Create a mock Pinterest API fetch response
 */
export function createPinterestApiResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response);
}

/**
 * Create a mock Pinterest API error response
 */
export function createPinterestApiError(
  code: string,
  message: string,
  status = 400
) {
  return Promise.resolve({
    ok: false,
    status,
    json: () =>
      Promise.resolve({
        code,
        message,
      }),
    text: () => Promise.resolve(JSON.stringify({ code, message })),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response);
}

/**
 * Setup Pinterest API mock for fetch
 * Usage: setupPinterestApiMock() in beforeEach
 */
export function setupPinterestApiMock() {
  const mockFetch = vi.fn();

  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const method = options?.method || 'GET';

    // POST /v5/pins - Create pin
    if (path === '/v5/pins' && method === 'POST') {
      return createPinterestApiResponse({
        ...mockPinterestPin,
        id: `pinterest-pin-${Date.now()}`,
      }, 201);
    }

    // GET /v5/pins/:id - Get pin
    if (path.match(/^\/v5\/pins\/[\w-]+$/) && method === 'GET') {
      return createPinterestApiResponse(mockPinterestPin);
    }

    // GET /v5/boards - List boards
    if (path === '/v5/boards' && method === 'GET') {
      return createPinterestApiResponse({
        items: [mockPinterestBoard],
        bookmark: null,
      });
    }

    // GET /v5/boards/:id - Get board
    if (path.match(/^\/v5\/boards\/[\w-]+$/) && method === 'GET') {
      return createPinterestApiResponse(mockPinterestBoard);
    }

    // GET /v5/user_account/analytics - User analytics
    if (path === '/v5/user_account/analytics' && method === 'GET') {
      return createPinterestApiResponse(mockPinterestAnalytics);
    }

    // GET /v5/pins/:id/analytics - Pin analytics
    if (path.match(/^\/v5\/pins\/[\w-]+\/analytics$/) && method === 'GET') {
      return createPinterestApiResponse(mockPinterestAnalytics);
    }

    // GET /v5/user_account - Get user
    if (path === '/v5/user_account' && method === 'GET') {
      return createPinterestApiResponse(mockPinterestUser);
    }

    // Default: return 404
    return createPinterestApiError('NOT_FOUND', 'Resource not found', 404);
  });

  global.fetch = mockFetch;

  return mockFetch;
}

/**
 * Mock Pinterest OAuth token exchange
 */
export const mockPinterestOAuthToken = {
  access_token: 'mock-pinterest-access-token',
  token_type: 'bearer',
  expires_in: 2592000, // 30 days
  refresh_token: 'mock-pinterest-refresh-token',
  scope: 'boards:read boards:write pins:read pins:write user_accounts:read',
};

/**
 * Rate limit headers for Pinterest API
 */
export const mockPinterestRateLimitHeaders = {
  'x-ratelimit-limit': '1000',
  'x-ratelimit-remaining': '999',
  'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
};
