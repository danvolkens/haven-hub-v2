import { vi } from 'vitest';

/**
 * Trigger.dev Mock
 * Mocks Trigger.dev SDK for testing background tasks
 */

// Mock logger
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
};

// Mock task run result
export interface MockTaskRunResult<T = unknown> {
  id: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELED';
  output: T;
  error?: string;
  createdAt: Date;
  completedAt: Date;
}

// Create a mock task result
export function createMockTaskResult<T>(
  output: T,
  status: 'COMPLETED' | 'FAILED' | 'CANCELED' = 'COMPLETED',
  error?: string
): MockTaskRunResult<T> {
  return {
    id: `run-${Date.now()}`,
    status,
    output,
    error,
    createdAt: new Date(),
    completedAt: new Date(),
  };
}

// Mock schedules.task factory
export function createMockScheduleTask<TInput, TOutput>(
  handler: (input?: TInput) => Promise<TOutput>
) {
  return {
    id: `task-${Date.now()}`,
    run: handler,
    trigger: vi.fn().mockImplementation(async (input?: TInput) => {
      const output = await handler(input);
      return createMockTaskResult(output);
    }),
  };
}

// Mock tasks.trigger
export const mockTasksTrigger = vi.fn().mockImplementation(async () => {
  return {
    id: `handle-${Date.now()}`,
    publicAccessToken: 'mock-token',
  };
});

// Mock tasks.triggerAndWait
export const mockTasksTriggerAndWait = vi.fn().mockImplementation(async () => {
  return createMockTaskResult({ success: true });
});

// Mock tasks.batchTrigger
export const mockTasksBatchTrigger = vi.fn().mockImplementation(async (items: unknown[]) => {
  return {
    id: `batch-${Date.now()}`,
    runs: items.map((_, i) => ({
      id: `run-${Date.now()}-${i}`,
      publicAccessToken: `mock-token-${i}`,
    })),
  };
});

/**
 * Setup Trigger.dev mock
 * Usage: setupTriggerMock() in test setup
 */
export function setupTriggerMock() {
  vi.mock('@trigger.dev/sdk/v3', () => ({
    schedules: {
      task: vi.fn((config) => ({
        id: config.id,
        run: config.run,
        trigger: mockTasksTrigger,
      })),
    },
    tasks: {
      trigger: mockTasksTrigger,
      triggerAndWait: mockTasksTriggerAndWait,
      batchTrigger: mockTasksBatchTrigger,
    },
    logger: mockLogger,
  }));

  return {
    logger: mockLogger,
    tasksTrigger: mockTasksTrigger,
    tasksTriggerAndWait: mockTasksTriggerAndWait,
    tasksBatchTrigger: mockTasksBatchTrigger,
  };
}

/**
 * Reset all Trigger.dev mocks
 */
export function resetTriggerMocks() {
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.debug.mockClear();
  mockLogger.log.mockClear();
  mockTasksTrigger.mockClear();
  mockTasksTriggerAndWait.mockClear();
  mockTasksBatchTrigger.mockClear();
}

/**
 * Verify task logged expected messages
 */
export function expectTaskLogged(level: keyof typeof mockLogger, message: string | RegExp) {
  const calls = mockLogger[level].mock.calls;
  const found = calls.some((call) => {
    const logMessage = call[0];
    if (typeof message === 'string') {
      return logMessage.includes(message);
    }
    return message.test(logMessage);
  });
  return found;
}

/**
 * Get all log calls for a specific level
 */
export function getLogCalls(level: keyof typeof mockLogger) {
  return mockLogger[level].mock.calls;
}
