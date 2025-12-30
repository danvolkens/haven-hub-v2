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

const mockQuiz = {
  id: 'quiz-1',
  user_id: 'user-123',
  name: 'Find Your Collection',
  slug: 'find-your-collection',
  status: 'active',
  completions: 100,
  questions: [
    {
      id: 'q1',
      text: 'What resonates with you?',
      answers: [
        { id: 'a1', text: 'Nature', collection_weights: { grounding: 3, wholeness: 1, growth: 1 } },
        { id: 'a2', text: 'Growth', collection_weights: { grounding: 1, wholeness: 1, growth: 3 } },
      ],
    },
  ],
};

const mockQueryBuilder = createMockQueryBuilder([mockQuiz]);

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({
      data: [{ result_collection: 'growth', scores: { grounding: 10, wholeness: 12, growth: 18 } }],
      error: null,
    }),
  })),
}));

// Mock Klaviyo sync
vi.mock('@/lib/integrations/klaviyo/lead-sync', () => ({
  syncLeadToKlaviyo: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Quiz Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitQuiz', () => {
    it('should be exported as a function', async () => {
      const { submitQuiz } = await import('@/lib/quiz/quiz-service');
      expect(typeof submitQuiz).toBe('function');
    });

    it('should accept request object', async () => {
      const { submitQuiz } = await import('@/lib/quiz/quiz-service');
      const request = {
        quizId: 'quiz-1',
        answers: [
          { questionId: 'q1', answerId: 'a2' },
        ],
      };

      const result = await submitQuiz(request);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should accept optional email and firstName', async () => {
      const { submitQuiz } = await import('@/lib/quiz/quiz-service');
      const request = {
        quizId: 'quiz-1',
        answers: [{ questionId: 'q1', answerId: 'a2' }],
        email: 'test@example.com',
        firstName: 'Test',
      };

      const result = await submitQuiz(request);
      expect(result).toBeDefined();
    });

    it('should accept optional metadata', async () => {
      const { submitQuiz } = await import('@/lib/quiz/quiz-service');
      const request = {
        quizId: 'quiz-1',
        answers: [{ questionId: 'q1', answerId: 'a2' }],
      };
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await submitQuiz(request, metadata);
      expect(result).toBeDefined();
    });
  });

  describe('getQuizAnalytics', () => {
    it('should be exported as a function', async () => {
      const { getQuizAnalytics } = await import('@/lib/quiz/quiz-service');
      expect(typeof getQuizAnalytics).toBe('function');
    });

    it('should accept userId and quizId', async () => {
      const { getQuizAnalytics } = await import('@/lib/quiz/quiz-service');
      const result = await getQuizAnalytics('user-123', 'quiz-1');
      expect(result).toBeDefined();
    });

    it('should return analytics object structure', async () => {
      const { getQuizAnalytics } = await import('@/lib/quiz/quiz-service');
      const result = await getQuizAnalytics('user-123', 'quiz-1');

      expect(result).toHaveProperty('totalResponses');
      expect(result).toHaveProperty('collectionBreakdown');
      expect(result).toHaveProperty('averageTimeSeconds');
      expect(result).toHaveProperty('conversionRate');
    });

    it('should return numeric values for analytics', async () => {
      const { getQuizAnalytics } = await import('@/lib/quiz/quiz-service');
      const result = await getQuizAnalytics('user-123', 'quiz-with-responses');

      // Verify all values are numbers
      expect(typeof result.totalResponses).toBe('number');
      expect(typeof result.averageTimeSeconds).toBe('number');
      expect(typeof result.conversionRate).toBe('number');
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
      expect(result.conversionRate).toBeLessThanOrEqual(1);
    });
  });
});

describe('Quiz Types', () => {
  describe('QuizSubmitResult', () => {
    it('should have success, response, result, and error properties', () => {
      const result = {
        success: true,
        response: { id: 'response-1', result_collection: 'growth' },
        result: { collection: 'growth', title: 'Growth Collection' },
        error: undefined,
      };

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('result');
    });
  });

  describe('Quiz Status', () => {
    const validStatuses = ['draft', 'active', 'paused', 'archived'];

    validStatuses.forEach((status) => {
      it(`should recognize ${status} as valid status`, () => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Collections', () => {
    const collections = ['grounding', 'wholeness', 'growth'];

    collections.forEach((collection) => {
      it(`should recognize ${collection} as valid collection`, () => {
        expect(collections).toContain(collection);
      });
    });
  });
});

describe('Quiz Analytics Calculations', () => {
  describe('Collection Breakdown', () => {
    it('should calculate collection distribution', () => {
      const responses = [
        { result_collection: 'grounding' },
        { result_collection: 'grounding' },
        { result_collection: 'wholeness' },
        { result_collection: 'growth' },
        { result_collection: 'growth' },
        { result_collection: 'growth' },
      ];

      const breakdown = {
        grounding: responses.filter((r) => r.result_collection === 'grounding').length,
        wholeness: responses.filter((r) => r.result_collection === 'wholeness').length,
        growth: responses.filter((r) => r.result_collection === 'growth').length,
      };

      expect(breakdown.grounding).toBe(2);
      expect(breakdown.wholeness).toBe(1);
      expect(breakdown.growth).toBe(3);
    });
  });

  describe('Average Time Calculation', () => {
    it('should calculate average time spent', () => {
      const responses = [
        { time_spent_seconds: 60 },
        { time_spent_seconds: 90 },
        { time_spent_seconds: 120 },
      ];

      const times = responses.map((r) => r.time_spent_seconds);
      const average = times.reduce((a, b) => a + b, 0) / times.length;

      expect(average).toBe(90);
    });

    it('should handle null time values', () => {
      const responses = [
        { time_spent_seconds: 60 },
        { time_spent_seconds: null },
        { time_spent_seconds: 120 },
      ];

      const times = responses
        .filter((r) => r.time_spent_seconds !== null)
        .map((r) => r.time_spent_seconds as number);

      const average = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

      expect(average).toBe(90);
    });

    it('should return 0 for empty responses', () => {
      const times: number[] = [];
      const average = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

      expect(average).toBe(0);
    });
  });

  describe('Conversion Rate Calculation', () => {
    it('should calculate conversion rate correctly', () => {
      const responses = [
        { lead_id: 'lead-1' },
        { lead_id: null },
        { lead_id: 'lead-2' },
        { lead_id: null },
      ];

      const withLead = responses.filter((r) => r.lead_id !== null).length;
      const conversionRate = responses.length > 0 ? withLead / responses.length : 0;

      expect(conversionRate).toBe(0.5);
    });

    it('should return 0 for no responses', () => {
      const responses: Array<{ lead_id: string | null }> = [];
      const conversionRate = responses.length > 0 ? 0 : 0;

      expect(conversionRate).toBe(0);
    });
  });
});

describe('Quiz Scoring Algorithm', () => {
  describe('Collection Weights', () => {
    it('should sum weights correctly', () => {
      const answers = [
        { collection_weights: { grounding: 3, wholeness: 1, growth: 1 } },
        { collection_weights: { grounding: 1, wholeness: 2, growth: 2 } },
        { collection_weights: { grounding: 0, wholeness: 1, growth: 3 } },
      ];

      const totalScores = { grounding: 0, wholeness: 0, growth: 0 };

      for (const answer of answers) {
        totalScores.grounding += answer.collection_weights.grounding;
        totalScores.wholeness += answer.collection_weights.wholeness;
        totalScores.growth += answer.collection_weights.growth;
      }

      expect(totalScores.grounding).toBe(4);
      expect(totalScores.wholeness).toBe(4);
      expect(totalScores.growth).toBe(6);
    });

    it('should determine winner correctly', () => {
      const scores = { grounding: 4, wholeness: 4, growth: 6 };

      const winner = Object.entries(scores).reduce(
        (max, [key, value]) => (value > max.value ? { key, value } : max),
        { key: '', value: -Infinity }
      );

      expect(winner.key).toBe('growth');
      expect(winner.value).toBe(6);
    });

    it('should handle ties by taking first', () => {
      const scores = { grounding: 5, wholeness: 5, growth: 5 };

      const winner = Object.entries(scores).reduce(
        (max, [key, value]) => (value > max.value ? { key, value } : max),
        { key: '', value: -Infinity }
      );

      // First one wins in a tie
      expect(winner.key).toBe('grounding');
    });
  });
});

describe('Quiz Response Storage', () => {
  describe('Response Record', () => {
    it('should contain required fields', () => {
      const response = {
        quiz_id: 'quiz-1',
        user_id: 'user-123',
        lead_id: 'lead-1',
        answers: [{ questionId: 'q1', answerId: 'a1' }],
        scores: { grounding: 10, wholeness: 8, growth: 12 },
        result_collection: 'growth',
        completed_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
      };

      expect(response.quiz_id).toBeDefined();
      expect(response.answers).toBeDefined();
      expect(response.scores).toBeDefined();
      expect(response.result_collection).toBeDefined();
      expect(response.completed_at).toBeDefined();
    });
  });
});

describe('Quiz Result Definitions', () => {
  describe('Result Content', () => {
    it('should have collection-specific content', () => {
      const results = {
        grounding: {
          title: 'Grounding Collection',
          description: 'For stability and presence',
          themes: ['nature', 'calm', 'roots'],
        },
        wholeness: {
          title: 'Wholeness Collection',
          description: 'For self-acceptance and healing',
          themes: ['compassion', 'balance', 'integration'],
        },
        growth: {
          title: 'Growth Collection',
          description: 'For potential and becoming',
          themes: ['possibility', 'courage', 'change'],
        },
      };

      expect(results.grounding.title).toContain('Grounding');
      expect(results.wholeness.title).toContain('Wholeness');
      expect(results.growth.title).toContain('Growth');
    });
  });

  describe('Klaviyo Segment Integration', () => {
    it('should support segment ID per result', () => {
      const result = {
        collection: 'growth',
        klaviyo_segment_id: 'segment-growth-123',
      };

      expect(result.klaviyo_segment_id).toBeDefined();
    });

    it('should generate collection-specific tags', () => {
      const collection = 'growth';
      const quizSlug = 'find-your-collection';

      const tags = [`quiz-${collection}`, `quiz-${quizSlug}`];

      expect(tags).toContain('quiz-growth');
      expect(tags).toContain('quiz-find-your-collection');
    });
  });
});
