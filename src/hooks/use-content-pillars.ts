'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/fetcher';

// Types
export interface ContentPillar {
  id: string;
  name: string;
  description: string | null;
  recommended_percentage: number;
  display_order: number;
}

export interface PillarPerformance {
  id: string;
  user_id: string;
  pillar_id: string;
  platform: string;
  period_type: 'week' | 'month' | 'quarter';
  period_start: string;
  content_count: number;
  impressions: number;
  clicks: number;
  saves: number;
  avg_ctr: number | null;
  avg_save_rate: number | null;
  winner_count: number;
  winner_percentage: number | null;
  current_percentage: number | null;
  pillar: ContentPillar | null;
}

interface RecommendationReasoning {
  primary: string;
  factors: string[];
  action?: string;
}

export interface MixRecommendation {
  id: string;
  user_id: string;
  pillar_id: string;
  platform: string;
  recommended_percentage: number;
  current_percentage: number | null;
  reasoning: RecommendationReasoning | null;
  confidence_score: number | null;
  generated_at: string;
  valid_until: string | null;
  pillar: ContentPillar | null;
}

export interface ActionRecommendation {
  pillar: ContentPillar;
  action: 'increase' | 'decrease' | 'maintain';
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

// API Response Types
interface PillarsResponse {
  pillars: ContentPillar[];
}

interface PerformanceResponse {
  performance: PillarPerformance[];
  period: { type: string; start: string } | null;
  total_content: number;
  total_impressions: number;
}

interface RecommendationsResponse {
  recommendations: MixRecommendation[];
  actions: ActionRecommendation[];
  is_expired?: boolean;
  generated_now: boolean;
}

/**
 * Fetch all content pillar definitions
 */
export function useContentPillars() {
  return useQuery({
    queryKey: ['content-pillars'],
    queryFn: () => api.get<PillarsResponse>('/content-pillars'),
    staleTime: 1000 * 60 * 60, // 1 hour - pillars rarely change
  });
}

/**
 * Fetch pillar performance data for the current user
 */
export function usePillarPerformance() {
  return useQuery({
    queryKey: ['pillar-performance'],
    queryFn: () =>
      api.get<PerformanceResponse>('/content-pillars/performance', {
        latest: true,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refresh every 10 minutes
  });
}

/**
 * Fetch content mix recommendations
 */
export function useMixRecommendations() {
  return useQuery({
    queryKey: ['mix-recommendations'],
    queryFn: () =>
      api.get<RecommendationsResponse>('/content-pillars/recommendations'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Regenerate content mix recommendations
 */
export function useRegenerateMixRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<RecommendationsResponse>('/content-pillars/recommendations'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mix-recommendations'] });
    },
  });
}

/**
 * Combined hook for the content mix page
 */
export function useContentMixData() {
  const pillarsQuery = useContentPillars();
  const performanceQuery = usePillarPerformance();
  const recommendationsQuery = useMixRecommendations();

  const isLoading =
    pillarsQuery.isLoading ||
    performanceQuery.isLoading ||
    recommendationsQuery.isLoading;

  const isError =
    pillarsQuery.isError ||
    performanceQuery.isError ||
    recommendationsQuery.isError;

  return {
    pillars: pillarsQuery.data?.pillars || [],
    performance: performanceQuery.data?.performance || [],
    period: performanceQuery.data?.period,
    totalContent: performanceQuery.data?.total_content || 0,
    totalImpressions: performanceQuery.data?.total_impressions || 0,
    recommendations: recommendationsQuery.data?.recommendations || [],
    actions: recommendationsQuery.data?.actions || [],
    isExpired: recommendationsQuery.data?.is_expired || false,
    isLoading,
    isError,
    refetch: () => {
      pillarsQuery.refetch();
      performanceQuery.refetch();
      recommendationsQuery.refetch();
    },
  };
}
