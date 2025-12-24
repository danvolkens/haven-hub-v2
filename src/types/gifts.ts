export type GiftStatus = 'pending' | 'delivered' | 'claimed' | 'expired';

export interface Gift {
  id: string;
  user_id: string;
  order_id: string;
  shopify_order_id?: string;
  sender_customer_id?: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name?: string;
  gift_code: string;
  message?: string;
  scheduled_delivery_at?: string;
  delivered_at?: string;
  claimed: boolean;
  claimed_at?: string;
  claimed_by_customer_id?: string;
  status: GiftStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGiftInput {
  order_id: string;
  shopify_order_id?: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name?: string;
  message?: string;
  scheduled_delivery_at?: string;
}
