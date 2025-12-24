export interface Insight {
  id: string;
  user_id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  related_quotes: string[];
  related_assets: string[];
  related_pins: string[];
  related_products: string[];
  suggested_actions: SuggestedAction[];
  status: InsightStatus;
  actioned_at: string | null;
  valid_from: string;
  valid_until: string | null;
  confidence_score: number | null;
  model_version: string | null;
  generation_context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type InsightType =
  | 'performance'
  | 'trend'
  | 'opportunity'
  | 'warning'
  | 'recommendation'
  | 'anomaly';

export type InsightCategory =
  | 'content'
  | 'pinterest'
  | 'products'
  | 'customers'
  | 'revenue'
  | 'operations';

export type InsightStatus = 'new' | 'viewed' | 'actioned' | 'dismissed';

export interface SuggestedAction {
  action: string;
  description: string;
  impact: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  type: RecommendationType;
  title: string;
  description: string;
  rationale: string | null;
  data: Record<string, unknown>;
  expected_impact: string | null;
  impact_score: number | null;
  status: RecommendationStatus;
  user_feedback: string | null;
  feedback_rating: number | null;
  confidence_score: number | null;
  model_version: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RecommendationType =
  | 'quote_suggestion'
  | 'design_variation'
  | 'posting_time'
  | 'collection_focus'
  | 'product_idea'
  | 'campaign_timing'
  | 'customer_segment'
  | 'copy_improvement';

export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'implemented';

export interface AIAnalysisJob {
  id: string;
  user_id: string;
  type: AnalysisJobType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  insights_generated: number;
  recommendations_generated: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export type AnalysisJobType =
  | 'daily_analysis'
  | 'weekly_analysis'
  | 'content_analysis'
  | 'performance_analysis'
  | 'trend_detection'
  | 'anomaly_detection';
