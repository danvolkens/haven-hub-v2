/**
 * Pin Test Fixtures
 * Sample pin data for testing
 */

import { TEST_USER_ID } from '../setup';

export const mockPins = {
  scheduled: {
    id: 'pin-scheduled-1',
    user_id: TEST_USER_ID,
    board_id: 'board-1',
    title: 'Scheduled Pin Title',
    description: 'This is a scheduled pin for testing',
    image_url: 'https://example.com/images/pin-1.jpg',
    link: 'https://example.com/product/1',
    alt_text: 'Alt text for scheduled pin',
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  published: {
    id: 'pin-published-1',
    user_id: TEST_USER_ID,
    board_id: 'board-1',
    title: 'Published Pin Title',
    description: 'This is a published pin for testing',
    image_url: 'https://example.com/images/pin-2.jpg',
    link: 'https://example.com/product/2',
    alt_text: 'Alt text for published pin',
    status: 'published',
    pinterest_pin_id: 'pinterest-123456',
    published_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
  },
  draft: {
    id: 'pin-draft-1',
    user_id: TEST_USER_ID,
    board_id: 'board-1',
    title: 'Draft Pin Title',
    description: 'This is a draft pin for testing',
    image_url: 'https://example.com/images/pin-3.jpg',
    link: 'https://example.com/product/3',
    alt_text: null,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  failed: {
    id: 'pin-failed-1',
    user_id: TEST_USER_ID,
    board_id: 'board-1',
    title: 'Failed Pin Title',
    description: 'This pin failed to publish',
    image_url: 'https://example.com/images/pin-4.jpg',
    link: 'https://example.com/product/4',
    alt_text: 'Alt text for failed pin',
    status: 'failed',
    error_message: 'Pinterest API rate limit exceeded',
    scheduled_for: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updated_at: new Date().toISOString(),
  },
};

export const mockBoards = {
  default: {
    id: 'board-1',
    user_id: TEST_USER_ID,
    name: 'Test Board',
    description: 'A test board for pins',
    pinterest_board_id: 'pinterest-board-123',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  secondary: {
    id: 'board-2',
    user_id: TEST_USER_ID,
    name: 'Secondary Board',
    description: 'Another test board',
    pinterest_board_id: 'pinterest-board-456',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const mockPinScheduleHistory = [
  {
    id: 'history-1',
    pin_id: 'pin-published-1',
    action: 'published',
    result: 'success',
    created_at: new Date().toISOString(),
  },
  {
    id: 'history-2',
    pin_id: 'pin-failed-1',
    action: 'publish_attempt',
    result: 'failed',
    error_message: 'Pinterest API rate limit exceeded',
    created_at: new Date().toISOString(),
  },
];

/**
 * Create a list of pins with various statuses
 */
export function createPinList(count: number, status?: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: `pin-${status || 'test'}-${i + 1}`,
    user_id: TEST_USER_ID,
    board_id: 'board-1',
    title: `Test Pin ${i + 1}`,
    description: `Description for test pin ${i + 1}`,
    image_url: `https://example.com/images/pin-${i + 1}.jpg`,
    link: `https://example.com/product/${i + 1}`,
    alt_text: `Alt text for pin ${i + 1}`,
    status: status || ['draft', 'scheduled', 'published', 'failed'][i % 4],
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Create pins that are due for publishing (scheduled in the past)
 */
export function createDuePins(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockPins.scheduled,
    id: `pin-due-${i + 1}`,
    title: `Due Pin ${i + 1}`,
    scheduled_for: new Date(Date.now() - (i + 1) * 60000).toISOString(), // 1-n minutes ago
  }));
}

/**
 * Create pin analytics data
 */
export function createPinAnalytics(pinId: string) {
  return {
    pin_id: pinId,
    impressions: Math.floor(Math.random() * 10000),
    saves: Math.floor(Math.random() * 500),
    clicks: Math.floor(Math.random() * 1000),
    outbound_clicks: Math.floor(Math.random() * 200),
    engagement_rate: Math.random() * 0.1, // 0-10%
    date: new Date().toISOString().split('T')[0],
  };
}
