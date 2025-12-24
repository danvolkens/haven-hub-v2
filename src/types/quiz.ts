export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  landing_page_id: string | null;
  show_results_immediately: boolean;
  require_email: boolean;
  scoring_method: 'weighted' | 'categorical' | 'custom';
  status: 'draft' | 'active' | 'archived';
  starts: number;
  completions: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
  results?: QuizResult[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  user_id: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'scale';
  position: number;
  image_url: string | null;
  help_text: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  position: number;
  image_url: string | null;
  scores: CollectionScores;
  category: 'grounding' | 'wholeness' | 'growth' | null;
  created_at: string;
}

export interface CollectionScores {
  grounding: number;
  wholeness: number;
  growth: number;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: string;
  collection: 'grounding' | 'wholeness' | 'growth';
  title: string;
  description: string;
  recommended_products: string[] | null;
  recommended_quotes: string[] | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  klaviyo_segment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  lead_id: string | null;
  answers: Record<string, string[]>;
  scores: CollectionScores;
  result_collection: 'grounding' | 'wholeness' | 'growth';
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SubmitQuizRequest {
  quizId: string;
  answers: Record<string, string[]>;
  email?: string;
  firstName?: string;
}
