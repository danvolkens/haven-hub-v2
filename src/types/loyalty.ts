export interface LoyaltyTier {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  min_points: number;
  min_lifetime_value: number | null;
  min_orders: number | null;
  points_multiplier: number;
  discount_percentage: number | null;
  free_shipping: boolean;
  early_access_days: number;
  exclusive_products: boolean;
  badge_color: string | null;
  badge_icon: string | null;
  tier_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyalty {
  id: string;
  user_id: string;
  customer_id: string;
  points_balance: number;
  points_earned_lifetime: number;
  points_redeemed_lifetime: number;
  tier_id: string | null;
  tier_achieved_at: string | null;
  points_to_next_tier: number | null;
  next_tier_id: string | null;
  referral_code: string | null;
  referrals_count: number;
  referral_points_earned: number;
  created_at: string;
  updated_at: string;
  tier?: LoyaltyTier;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  customer_loyalty_id: string;
  type: TransactionType;
  points: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
}

export type TransactionType =
  | 'earn_purchase'
  | 'earn_referral'
  | 'earn_review'
  | 'earn_birthday'
  | 'earn_signup'
  | 'earn_bonus'
  | 'redeem_discount'
  | 'redeem_product'
  | 'expire'
  | 'adjustment';

export interface LoyaltyReward {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: RewardType;
  reward_value: number | null;
  reward_product_id: string | null;
  min_tier_id: string | null;
  min_orders: number | null;
  redemption_limit: number | null;
  total_available: number | null;
  total_redeemed: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RewardType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'free_shipping'
  | 'free_product'
  | 'exclusive_access';

export interface RewardRedemption {
  id: string;
  user_id: string;
  customer_loyalty_id: string;
  reward_id: string;
  points_transaction_id: string | null;
  points_spent: number;
  discount_code: string | null;
  status: 'pending' | 'used' | 'expired' | 'refunded';
  used_at: string | null;
  used_order_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
