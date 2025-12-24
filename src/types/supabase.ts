export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abandoned_checkouts: {
        Row: {
          abandoned_at: string
          cart_items: Json
          cart_total: number
          checkout_url: string | null
          created_at: string
          customer_id: string | null
          email: string
          id: string
          klaviyo_flow_id: string | null
          lead_id: string | null
          recovered_at: string | null
          recovered_order_id: string | null
          recovered_order_total: number | null
          sequence_triggered_at: string | null
          shopify_checkout_id: string
          shopify_checkout_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at: string
          cart_items?: Json
          cart_total: number
          checkout_url?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          klaviyo_flow_id?: string | null
          lead_id?: string | null
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovered_order_total?: number | null
          sequence_triggered_at?: string | null
          shopify_checkout_id: string
          shopify_checkout_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number
          checkout_url?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          klaviyo_flow_id?: string | null
          lead_id?: string | null
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovered_order_total?: number | null
          sequence_triggered_at?: string | null
          shopify_checkout_id?: string
          shopify_checkout_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_checkouts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      abandonment_sequences: {
        Row: {
          checkouts_recovered: number
          checkouts_triggered: number
          created_at: string
          id: string
          is_active: boolean
          klaviyo_flow_id: string
          max_cart_value: number | null
          min_cart_value: number | null
          name: string
          recovery_rate: number | null
          revenue_recovered: number
          target_collections: string[] | null
          trigger_delay_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checkouts_recovered?: number
          checkouts_triggered?: number
          created_at?: string
          id?: string
          is_active?: boolean
          klaviyo_flow_id: string
          max_cart_value?: number | null
          min_cart_value?: number | null
          name: string
          recovery_rate?: number | null
          revenue_recovered?: number
          target_collections?: string[] | null
          trigger_delay_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          checkouts_recovered?: number
          checkouts_triggered?: number
          created_at?: string
          id?: string
          is_active?: boolean
          klaviyo_flow_id?: string
          max_cart_value?: number | null
          min_cart_value?: number | null
          name?: string
          recovery_rate?: number | null
          revenue_recovered?: number
          target_collections?: string[] | null
          trigger_delay_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json
          executed: boolean
          id: string
          module: string | null
          new_value: Json | null
          operator_mode: string
          previous_value: Json | null
          reference_id: string | null
          reference_table: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json
          executed?: boolean
          id?: string
          module?: string | null
          new_value?: Json | null
          operator_mode: string
          previous_value?: Json | null
          reference_id?: string | null
          reference_table?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json
          executed?: boolean
          id?: string
          module?: string | null
          new_value?: Json | null
          operator_mode?: string
          previous_value?: Json | null
          reference_id?: string | null
          reference_table?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          ad_account_id: string
          clicks: number
          collection: string | null
          conversions: number
          created_at: string
          daily_spend_cap: number | null
          end_date: string | null
          id: string
          impressions: number
          is_seasonal: boolean
          lifetime_spend_cap: number | null
          name: string
          objective: string
          pinterest_campaign_id: string | null
          seasonal_event: string | null
          start_date: string | null
          status: string
          synced_at: string | null
          total_spend: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          clicks?: number
          collection?: string | null
          conversions?: number
          created_at?: string
          daily_spend_cap?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          is_seasonal?: boolean
          lifetime_spend_cap?: number | null
          name: string
          objective: string
          pinterest_campaign_id?: string | null
          seasonal_event?: string | null
          start_date?: string | null
          status?: string
          synced_at?: string | null
          total_spend?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string
          clicks?: number
          collection?: string | null
          conversions?: number
          created_at?: string
          daily_spend_cap?: number | null
          end_date?: string | null
          id?: string
          impressions?: number
          is_seasonal?: boolean
          lifetime_spend_cap?: number | null
          name?: string
          objective?: string
          pinterest_campaign_id?: string | null
          seasonal_event?: string | null
          start_date?: string | null
          status?: string
          synced_at?: string | null
          total_spend?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "pinterest_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_groups: {
        Row: {
          bid_amount: number | null
          bid_strategy: string | null
          budget_amount: number | null
          budget_type: string | null
          campaign_id: string
          clicks: number
          created_at: string
          id: string
          impressions: number
          name: string
          pinterest_ad_group_id: string | null
          status: string
          synced_at: string | null
          targeting: Json
          total_spend: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_amount?: number | null
          bid_strategy?: string | null
          budget_amount?: number | null
          budget_type?: string | null
          campaign_id: string
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          name: string
          pinterest_ad_group_id?: string | null
          status?: string
          synced_at?: string | null
          targeting?: Json
          total_spend?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_amount?: number | null
          bid_strategy?: string | null
          budget_amount?: number | null
          budget_type?: string | null
          campaign_id?: string
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          name?: string
          pinterest_ad_group_id?: string | null
          status?: string
          synced_at?: string | null
          targeting?: Json
          total_spend?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_spend_tracking: {
        Row: {
          amount: number
          budget_cap: number | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          budget_cap?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          budget_cap?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          insights_generated: number
          recommendations_generated: number
          started_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_generated?: number
          recommendations_generated?: number
          started_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_generated?: number
          recommendations_generated?: number
          started_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      approval_items: {
        Row: {
          collection: string | null
          confidence_score: number | null
          created_at: string
          flag_reasons: Json
          flags: string[]
          id: string
          payload: Json
          priority: number
          processed_at: string | null
          processed_by: string | null
          reference_id: string
          reference_table: string
          rejection_reason: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection?: string | null
          confidence_score?: number | null
          created_at?: string
          flag_reasons?: Json
          flags?: string[]
          id?: string
          payload?: Json
          priority?: number
          processed_at?: string | null
          processed_by?: string | null
          reference_id: string
          reference_table: string
          rejection_reason?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection?: string | null
          confidence_score?: number | null
          created_at?: string
          flag_reasons?: Json
          flags?: string[]
          id?: string
          payload?: Json
          priority?: number
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string
          reference_table?: string
          rejection_reason?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          approved_at: string | null
          created_at: string
          design_config: Json
          dimensions: Json
          file_key: string
          file_url: string
          flag_reasons: Json
          flags: string[]
          format: string
          id: string
          overall_score: number | null
          published_at: string | null
          quality_scores: Json
          quote_id: string
          status: string
          template_id: string | null
          thumbnail_url: string | null
          total_clicks: number
          total_impressions: number
          total_pins: number
          total_saves: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          design_config?: Json
          dimensions: Json
          file_key: string
          file_url: string
          flag_reasons?: Json
          flags?: string[]
          format: string
          id?: string
          overall_score?: number | null
          published_at?: string | null
          quality_scores?: Json
          quote_id: string
          status?: string
          template_id?: string | null
          thumbnail_url?: string | null
          total_clicks?: number
          total_impressions?: number
          total_pins?: number
          total_saves?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          design_config?: Json
          dimensions?: Json
          file_key?: string
          file_url?: string
          flag_reasons?: Json
          flags?: string[]
          format?: string
          id?: string
          overall_score?: number | null
          published_at?: string | null
          quality_scores?: Json
          quote_id?: string
          status?: string
          template_id?: string | null
          thumbnail_url?: string | null
          total_clicks?: number
          total_impressions?: number
          total_pins?: number
          total_saves?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_events: {
        Row: {
          asset_id: string | null
          attribution_window: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          occurred_at: string
          order_id: string | null
          order_total: number | null
          product_id: string | null
          quote_id: string | null
          session_id: string | null
          source_id: string | null
          source_type: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          asset_id?: string | null
          attribution_window?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          order_id?: string | null
          order_total?: number | null
          product_id?: string | null
          quote_id?: string | null
          session_id?: string | null
          source_id?: string | null
          source_type: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          asset_id?: string | null
          attribution_window?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          order_id?: string | null
          order_total?: number | null
          product_id?: string | null
          quote_id?: string | null
          session_id?: string | null
          source_id?: string | null
          source_type?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_models: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          model_type: string
          name: string
          updated_at: string
          user_id: string
          window_days: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model_type: string
          name: string
          updated_at?: string
          user_id: string
          window_days?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          model_type?: string
          name?: string
          updated_at?: string
          user_id?: string
          window_days?: number
        }
        Relationships: []
      }
      campaign_tasks: {
        Row: {
          campaign_id: string
          config: Json
          created_at: string
          description: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          scheduled_at: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          config?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_at: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          config?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channels: Json
          created_at: string
          description: string | null
          emails_sent: number
          end_date: string
          featured_asset_ids: string[] | null
          featured_product_ids: string[] | null
          featured_quote_ids: string[] | null
          has_offer: boolean
          hashtags: string[] | null
          id: string
          lead_goal: number | null
          leads: number
          name: string
          offer_code: string | null
          offer_type: string | null
          offer_value: number | null
          order_goal: number | null
          orders: number
          pins_published: number
          revenue: number
          revenue_goal: number | null
          start_date: string
          status: string
          target_collections: string[] | null
          target_customer_stages: string[] | null
          theme: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          description?: string | null
          emails_sent?: number
          end_date: string
          featured_asset_ids?: string[] | null
          featured_product_ids?: string[] | null
          featured_quote_ids?: string[] | null
          has_offer?: boolean
          hashtags?: string[] | null
          id?: string
          lead_goal?: number | null
          leads?: number
          name: string
          offer_code?: string | null
          offer_type?: string | null
          offer_value?: number | null
          order_goal?: number | null
          orders?: number
          pins_published?: number
          revenue?: number
          revenue_goal?: number | null
          start_date: string
          status?: string
          target_collections?: string[] | null
          target_customer_stages?: string[] | null
          theme?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          description?: string | null
          emails_sent?: number
          end_date?: string
          featured_asset_ids?: string[] | null
          featured_product_ids?: string[] | null
          featured_quote_ids?: string[] | null
          has_offer?: boolean
          hashtags?: string[] | null
          id?: string
          lead_goal?: number | null
          leads?: number
          name?: string
          offer_code?: string | null
          offer_type?: string | null
          offer_value?: number | null
          order_goal?: number | null
          orders?: number
          pins_published?: number
          revenue?: number
          revenue_goal?: number | null
          start_date?: string
          status?: string
          target_collections?: string[] | null
          target_customer_stages?: string[] | null
          theme?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_performance: {
        Row: {
          add_to_carts: number
          checkouts: number
          clicks: number
          content_id: string
          content_type: string
          conversion_rate: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number
          period_start: string
          period_type: string
          purchases: number
          revenue: number
          revenue_per_impression: number | null
          saves: number
          updated_at: string
          user_id: string
        }
        Insert: {
          add_to_carts?: number
          checkouts?: number
          clicks?: number
          content_id: string
          content_type: string
          conversion_rate?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          period_start: string
          period_type: string
          purchases?: number
          revenue?: number
          revenue_per_impression?: number | null
          saves?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          add_to_carts?: number
          checkouts?: number
          clicks?: number
          content_id?: string
          content_type?: string
          conversion_rate?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number
          period_start?: string
          period_type?: string
          purchases?: number
          revenue?: number
          revenue_per_impression?: number | null
          saves?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          customer_email: string
          customer_id: string | null
          discount_amount: number
          id: string
          order_id: string | null
          order_total: number | null
          shopify_order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_email: string
          customer_id?: string | null
          discount_amount: number
          id?: string
          order_id?: string | null
          order_total?: number | null
          shopify_order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_email?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          order_total?: number | null
          shopify_order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          buy_quantity: number | null
          code: string
          collection_ids: string[] | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number | null
          exclude_sale_items: boolean
          expires_at: string | null
          first_time_only: boolean
          get_quantity: number | null
          id: string
          internal_notes: string | null
          minimum_purchase: number | null
          minimum_quantity: number | null
          per_customer_limit: number | null
          product_ids: string[] | null
          shopify_discount_id: string | null
          shopify_synced_at: string | null
          starts_at: string
          status: string
          total_discount_amount: number
          total_orders: number
          updated_at: string
          usage_count: number
          usage_limit: number | null
          user_id: string
        }
        Insert: {
          buy_quantity?: number | null
          code: string
          collection_ids?: string[] | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number | null
          exclude_sale_items?: boolean
          expires_at?: string | null
          first_time_only?: boolean
          get_quantity?: number | null
          id?: string
          internal_notes?: string | null
          minimum_purchase?: number | null
          minimum_quantity?: number | null
          per_customer_limit?: number | null
          product_ids?: string[] | null
          shopify_discount_id?: string | null
          shopify_synced_at?: string | null
          starts_at?: string
          status?: string
          total_discount_amount?: number
          total_orders?: number
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          user_id: string
        }
        Update: {
          buy_quantity?: number | null
          code?: string
          collection_ids?: string[] | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          exclude_sale_items?: boolean
          expires_at?: string | null
          first_time_only?: boolean
          get_quantity?: number | null
          id?: string
          internal_notes?: string | null
          minimum_purchase?: number | null
          minimum_quantity?: number | null
          per_customer_limit?: number | null
          product_ids?: string[] | null
          shopify_discount_id?: string | null
          shopify_synced_at?: string | null
          starts_at?: string
          status?: string
          total_discount_amount?: number
          total_orders?: number
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cross_platform_content: {
        Row: {
          adapted_at: string | null
          adapted_to_pinterest: boolean
          comments: number
          content_type: string
          created_at: string
          description: string | null
          engagement_rate: number | null
          id: string
          image_url: string | null
          is_winner: boolean
          likes: number
          metrics_updated_at: string | null
          original_url: string
          performance_score: number | null
          pinterest_pin_id: string | null
          platform: string
          posted_at: string | null
          saves: number
          shares: number
          title: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          views: number
          winner_detected_at: string | null
        }
        Insert: {
          adapted_at?: string | null
          adapted_to_pinterest?: boolean
          comments?: number
          content_type: string
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url?: string | null
          is_winner?: boolean
          likes?: number
          metrics_updated_at?: string | null
          original_url: string
          performance_score?: number | null
          pinterest_pin_id?: string | null
          platform: string
          posted_at?: string | null
          saves?: number
          shares?: number
          title?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views?: number
          winner_detected_at?: string | null
        }
        Update: {
          adapted_at?: string | null
          adapted_to_pinterest?: boolean
          comments?: number
          content_type?: string
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url?: string | null
          is_winner?: boolean
          likes?: number
          metrics_updated_at?: string | null
          original_url?: string
          performance_score?: number | null
          pinterest_pin_id?: string | null
          platform?: string
          posted_at?: string | null
          saves?: number
          shares?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views?: number
          winner_detected_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_platform_content_pinterest_pin_id_fkey"
            columns: ["pinterest_pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          next_tier_id: string | null
          points_balance: number
          points_earned_lifetime: number
          points_redeemed_lifetime: number
          points_to_next_tier: number | null
          referral_code: string | null
          referral_points_earned: number
          referrals_count: number
          tier_achieved_at: string | null
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          next_tier_id?: string | null
          points_balance?: number
          points_earned_lifetime?: number
          points_redeemed_lifetime?: number
          points_to_next_tier?: number | null
          referral_code?: string | null
          referral_points_earned?: number
          referrals_count?: number
          tier_achieved_at?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          next_tier_id?: string | null
          points_balance?: number
          points_earned_lifetime?: number
          points_redeemed_lifetime?: number
          points_to_next_tier?: number | null
          referral_code?: string | null
          referral_points_earned?: number
          referrals_count?: number
          tier_achieved_at?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_next_tier_id_fkey"
            columns: ["next_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          created_at: string
          criteria: Json
          customer_count: number
          description: string | null
          id: string
          is_active: boolean
          is_dynamic: boolean
          klaviyo_segment_id: string | null
          last_synced_at: string | null
          name: string
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          customer_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_dynamic?: boolean
          klaviyo_segment_id?: string | null
          last_synced_at?: string | null
          name: string
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          customer_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_dynamic?: boolean
          klaviyo_segment_id?: string | null
          last_synced_at?: string | null
          name?: string
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          average_order_value: number | null
          became_at_risk_at: string | null
          became_churned_at: string | null
          became_customer_at: string | null
          became_lead_at: string | null
          became_repeat_at: string | null
          became_vip_at: string | null
          collection_scores: Json | null
          created_at: string
          email: string
          email_subscribed: boolean
          first_name: string | null
          id: string
          klaviyo_profile_id: string | null
          last_email_click_at: string | null
          last_email_open_at: string | null
          last_name: string | null
          last_purchase_at: string | null
          last_site_visit_at: string | null
          lead_id: string | null
          lifetime_value: number
          phone: string | null
          primary_collection: string | null
          shopify_customer_id: string | null
          sms_subscribed: boolean
          stage: string
          total_orders: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_order_value?: number | null
          became_at_risk_at?: string | null
          became_churned_at?: string | null
          became_customer_at?: string | null
          became_lead_at?: string | null
          became_repeat_at?: string | null
          became_vip_at?: string | null
          collection_scores?: Json | null
          created_at?: string
          email: string
          email_subscribed?: boolean
          first_name?: string | null
          id?: string
          klaviyo_profile_id?: string | null
          last_email_click_at?: string | null
          last_email_open_at?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          last_site_visit_at?: string | null
          lead_id?: string | null
          lifetime_value?: number
          phone?: string | null
          primary_collection?: string | null
          shopify_customer_id?: string | null
          sms_subscribed?: boolean
          stage?: string
          total_orders?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_order_value?: number | null
          became_at_risk_at?: string | null
          became_churned_at?: string | null
          became_customer_at?: string | null
          became_lead_at?: string | null
          became_repeat_at?: string | null
          became_vip_at?: string | null
          collection_scores?: Json | null
          created_at?: string
          email?: string
          email_subscribed?: boolean
          first_name?: string | null
          id?: string
          klaviyo_profile_id?: string | null
          last_email_click_at?: string | null
          last_email_open_at?: string | null
          last_name?: string | null
          last_purchase_at?: string | null
          last_site_visit_at?: string | null
          lead_id?: string | null
          lifetime_value?: number
          phone?: string | null
          primary_collection?: string | null
          shopify_customer_id?: string | null
          sms_subscribed?: boolean
          stage?: string
          total_orders?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      design_rules: {
        Row: {
          applies_to_collections: string[]
          applies_to_moods: string[]
          colors: Json
          created_at: string
          decorations: Json
          description: string | null
          enabled: boolean
          id: string
          is_default: boolean
          layout: Json
          name: string
          output_formats: string[]
          print_sizes: string[]
          priority: number
          quality_thresholds: Json
          typography: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          applies_to_collections?: string[]
          applies_to_moods?: string[]
          colors?: Json
          created_at?: string
          decorations?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          is_default?: boolean
          layout?: Json
          name: string
          output_formats?: string[]
          print_sizes?: string[]
          priority?: number
          quality_thresholds?: Json
          typography?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          applies_to_collections?: string[]
          applies_to_moods?: string[]
          colors?: Json
          created_at?: string
          decorations?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          output_formats?: string[]
          print_sizes?: string[]
          priority?: number
          quality_thresholds?: Json
          typography?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          category: string | null
          colors: Json
          compatible_formats: string[] | null
          compatible_moods: string[] | null
          created_at: string
          decorations: Json
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          layout: Json
          name: string
          preview_url: string | null
          type: string
          typography: Json
          updated_at: string
          usage_count: number
          user_id: string | null
        }
        Insert: {
          category?: string | null
          colors?: Json
          compatible_formats?: string[] | null
          compatible_moods?: string[] | null
          created_at?: string
          decorations?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          layout?: Json
          name: string
          preview_url?: string | null
          type?: string
          typography?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          category?: string | null
          colors?: Json
          compatible_formats?: string[] | null
          compatible_moods?: string[] | null
          created_at?: string
          decorations?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          layout?: Json
          name?: string
          preview_url?: string | null
          type?: string
          typography?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      digest_history: {
        Row: {
          clicked_at: string | null
          content: Json
          created_at: string
          delivered_at: string
          delivery_method: string
          id: string
          opened_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          content?: Json
          created_at?: string
          delivered_at?: string
          delivery_method: string
          id?: string
          opened_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          content?: Json
          created_at?: string
          delivered_at?: string
          delivery_method?: string
          id?: string
          opened_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      digest_preferences: {
        Row: {
          created_at: string
          delivery_method: string
          delivery_time: string
          frequency: string
          id: string
          include_approvals: boolean
          include_insights: boolean
          include_performance: boolean
          include_recommendations: boolean
          include_tasks: boolean
          is_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
          weekly_day: number | null
        }
        Insert: {
          created_at?: string
          delivery_method?: string
          delivery_time?: string
          frequency?: string
          id?: string
          include_approvals?: boolean
          include_insights?: boolean
          include_performance?: boolean
          include_recommendations?: boolean
          include_tasks?: boolean
          is_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_day?: number | null
        }
        Update: {
          created_at?: string
          delivery_method?: string
          delivery_time?: string
          frequency?: string
          id?: string
          include_approvals?: boolean
          include_insights?: boolean
          include_performance?: boolean
          include_recommendations?: boolean
          include_tasks?: boolean
          is_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_day?: number | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          id: string
          ip_address: string | null
          landing_page_id: string
          lead_id: string | null
          processed: boolean
          processed_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          ip_address?: string | null
          landing_page_id: string
          lead_id?: string | null
          processed?: boolean
          processed_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          ip_address?: string | null
          landing_page_id?: string
          lead_id?: string | null
          processed?: boolean
          processed_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          claimed_by_customer_id: string | null
          created_at: string
          delivered_at: string | null
          expires_at: string
          gift_code: string
          id: string
          message: string | null
          order_id: string
          recipient_email: string
          recipient_name: string | null
          scheduled_delivery_at: string | null
          sender_customer_id: string | null
          sender_email: string
          sender_name: string | null
          shopify_order_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by_customer_id?: string | null
          created_at?: string
          delivered_at?: string | null
          expires_at?: string
          gift_code: string
          id?: string
          message?: string | null
          order_id: string
          recipient_email: string
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          sender_customer_id?: string | null
          sender_email: string
          sender_name?: string | null
          shopify_order_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by_customer_id?: string | null
          created_at?: string
          delivered_at?: string | null
          expires_at?: string
          gift_code?: string
          id?: string
          message?: string | null
          order_id?: string
          recipient_email?: string
          recipient_name?: string | null
          scheduled_delivery_at?: string | null
          sender_customer_id?: string | null
          sender_email?: string
          sender_name?: string | null
          shopify_order_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_claimed_by_customer_id_fkey"
            columns: ["claimed_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_sender_customer_id_fkey"
            columns: ["sender_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          actioned_at: string | null
          category: string
          confidence_score: number | null
          created_at: string
          details: Json
          generation_context: Json | null
          id: string
          model_version: string | null
          priority: string
          related_assets: string[] | null
          related_pins: string[] | null
          related_products: string[] | null
          related_quotes: string[] | null
          status: string
          suggested_actions: Json | null
          summary: string
          title: string
          type: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          actioned_at?: string | null
          category: string
          confidence_score?: number | null
          created_at?: string
          details?: Json
          generation_context?: Json | null
          id?: string
          model_version?: string | null
          priority?: string
          related_assets?: string[] | null
          related_pins?: string[] | null
          related_products?: string[] | null
          related_quotes?: string[] | null
          status?: string
          suggested_actions?: Json | null
          summary: string
          title: string
          type: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          actioned_at?: string | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          details?: Json
          generation_context?: Json | null
          id?: string
          model_version?: string | null
          priority?: string
          related_assets?: string[] | null
          related_pins?: string[] | null
          related_products?: string[] | null
          related_quotes?: string[] | null
          status?: string
          suggested_actions?: Json | null
          summary?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          last_error: string | null
          last_error_at: string | null
          last_refreshed_at: string | null
          metadata: Json
          provider: string
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_refreshed_at?: string | null
          metadata?: Json
          provider: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_refreshed_at?: string | null
          metadata?: Json
          provider?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          body_content: string | null
          collection: string | null
          conversion_rate: number | null
          created_at: string
          custom_css: string | null
          featured_image_url: string | null
          form_fields: Json
          headline: string
          id: string
          klaviyo_list_id: string | null
          klaviyo_tags: string[] | null
          lead_magnet_file_key: string | null
          lead_magnet_file_url: string | null
          lead_magnet_title: string | null
          lead_magnet_type: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          published_at: string | null
          slug: string
          status: string
          subheadline: string | null
          submissions: number
          type: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          body_content?: string | null
          collection?: string | null
          conversion_rate?: number | null
          created_at?: string
          custom_css?: string | null
          featured_image_url?: string | null
          form_fields?: Json
          headline: string
          id?: string
          klaviyo_list_id?: string | null
          klaviyo_tags?: string[] | null
          lead_magnet_file_key?: string | null
          lead_magnet_file_url?: string | null
          lead_magnet_title?: string | null
          lead_magnet_type?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          published_at?: string | null
          slug: string
          status?: string
          subheadline?: string | null
          submissions?: number
          type: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          body_content?: string | null
          collection?: string | null
          conversion_rate?: number | null
          created_at?: string
          custom_css?: string | null
          featured_image_url?: string | null
          form_fields?: Json
          headline?: string
          id?: string
          klaviyo_list_id?: string | null
          klaviyo_tags?: string[] | null
          lead_magnet_file_key?: string | null
          lead_magnet_file_url?: string | null
          lead_magnet_title?: string | null
          lead_magnet_type?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          published_at?: string | null
          slug?: string
          status?: string
          subheadline?: string | null
          submissions?: number
          type?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          converted_at: string | null
          created_at: string
          email: string
          emails_clicked: number
          emails_opened: number
          emails_sent: number
          first_name: string | null
          first_order_id: string | null
          id: string
          klaviyo_profile_id: string | null
          landing_page_id: string | null
          last_name: string | null
          lifetime_value: number
          phone: string | null
          quiz_id: string | null
          quiz_results: Json | null
          recommended_collection: string | null
          referrer: string | null
          shopify_customer_id: string | null
          source: string
          status: string
          synced_to_klaviyo_at: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          email: string
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          first_name?: string | null
          first_order_id?: string | null
          id?: string
          klaviyo_profile_id?: string | null
          landing_page_id?: string | null
          last_name?: string | null
          lifetime_value?: number
          phone?: string | null
          quiz_id?: string | null
          quiz_results?: Json | null
          recommended_collection?: string | null
          referrer?: string | null
          shopify_customer_id?: string | null
          source?: string
          status?: string
          synced_to_klaviyo_at?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          email?: string
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          first_name?: string | null
          first_order_id?: string | null
          id?: string
          klaviyo_profile_id?: string | null
          landing_page_id?: string | null
          last_name?: string | null
          lifetime_value?: number
          phone?: string | null
          quiz_id?: string | null
          quiz_results?: Json | null
          recommended_collection?: string | null
          referrer?: string | null
          shopify_customer_id?: string | null
          source?: string
          status?: string
          synced_to_klaviyo_at?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          id: string
          link_id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          id?: string
          link_id: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          id?: string
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "link_in_bio_links"
            referencedColumns: ["id"]
          },
        ]
      }
      link_in_bio_config: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          background_color: string | null
          bio: string | null
          button_style: string
          created_at: string
          id: string
          slug: string | null
          text_color: string | null
          theme: string
          title: string
          total_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          button_style?: string
          created_at?: string
          id?: string
          slug?: string | null
          text_color?: string | null
          theme?: string
          title?: string
          total_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          background_color?: string | null
          bio?: string | null
          button_style?: string
          created_at?: string
          id?: string
          slug?: string | null
          text_color?: string | null
          theme?: string
          title?: string
          total_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      link_in_bio_links: {
        Row: {
          click_count: number
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          position: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          click_count?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          position?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          click_count?: number
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          position?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          min_orders: number | null
          min_tier_id: string | null
          name: string
          points_cost: number
          redemption_limit: number | null
          reward_product_id: string | null
          reward_type: string
          reward_value: number | null
          starts_at: string | null
          total_available: number | null
          total_redeemed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_orders?: number | null
          min_tier_id?: string | null
          name: string
          points_cost: number
          redemption_limit?: number | null
          reward_product_id?: string | null
          reward_type: string
          reward_value?: number | null
          starts_at?: string | null
          total_available?: number | null
          total_redeemed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          min_orders?: number | null
          min_tier_id?: string | null
          name?: string
          points_cost?: number
          redemption_limit?: number | null
          reward_product_id?: string | null
          reward_type?: string
          reward_value?: number | null
          starts_at?: string | null
          total_available?: number | null
          total_redeemed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_min_tier_id_fkey"
            columns: ["min_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          early_access_days: number | null
          exclusive_products: boolean
          free_shipping: boolean
          id: string
          min_lifetime_value: number | null
          min_orders: number | null
          min_points: number
          name: string
          points_multiplier: number
          slug: string
          tier_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          early_access_days?: number | null
          exclusive_products?: boolean
          free_shipping?: boolean
          id?: string
          min_lifetime_value?: number | null
          min_orders?: number | null
          min_points?: number
          name: string
          points_multiplier?: number
          slug: string
          tier_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          early_access_days?: number | null
          exclusive_products?: boolean
          free_shipping?: boolean
          id?: string
          min_lifetime_value?: number | null
          min_orders?: number | null
          min_points?: number
          name?: string
          points_multiplier?: number
          slug?: string
          tier_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mockup_credit_usage: {
        Row: {
          balance_after: number
          balance_before: number
          created_at: string
          credits: number
          id: string
          mockup_id: string | null
          month: number
          operation: string
          user_id: string
          year: number
        }
        Insert: {
          balance_after: number
          balance_before: number
          created_at?: string
          credits: number
          id?: string
          mockup_id?: string | null
          month?: number
          operation: string
          user_id: string
          year?: number
        }
        Update: {
          balance_after?: number
          balance_before?: number
          created_at?: string
          credits?: number
          id?: string
          mockup_id?: string | null
          month?: number
          operation?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mockup_credit_usage_mockup_id_fkey"
            columns: ["mockup_id"]
            isOneToOne: false
            referencedRelation: "mockups"
            referencedColumns: ["id"]
          },
        ]
      }
      mockup_scene_templates: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          dm_template_id: string
          dm_template_url: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          preview_url: string | null
          recommended_collections: string[] | null
          scene_key: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          dm_template_id: string
          dm_template_url?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          preview_url?: string | null
          recommended_collections?: string[] | null
          scene_key: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          dm_template_id?: string
          dm_template_url?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          preview_url?: string | null
          recommended_collections?: string[] | null
          scene_key?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mockups: {
        Row: {
          asset_id: string
          created_at: string
          credits_used: number
          dm_metadata: Json | null
          dm_render_id: string | null
          error_message: string | null
          file_key: string
          file_url: string
          id: string
          quality_score: number | null
          quote_id: string | null
          scene: string
          scene_config: Json
          status: string
          thumbnail_url: string | null
          total_impressions: number
          total_pins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          credits_used?: number
          dm_metadata?: Json | null
          dm_render_id?: string | null
          error_message?: string | null
          file_key: string
          file_url: string
          id?: string
          quality_score?: number | null
          quote_id?: string | null
          scene: string
          scene_config?: Json
          status?: string
          thumbnail_url?: string | null
          total_impressions?: number
          total_pins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          credits_used?: number
          dm_metadata?: Json | null
          dm_render_id?: string | null
          error_message?: string | null
          file_key?: string
          file_url?: string
          id?: string
          quality_score?: number | null
          quote_id?: string | null
          scene?: string
          scene_config?: Json
          status?: string
          thumbnail_url?: string | null
          total_impressions?: number
          total_pins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mockups_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mockups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_copy_templates: {
        Row: {
          avg_engagement_rate: number | null
          collection: string | null
          created_at: string
          description_template: string
          id: string
          is_active: boolean
          mood: string | null
          name: string
          times_used: number
          title_template: string
          total_clicks: number
          total_impressions: number
          total_saves: number
          updated_at: string
          user_id: string
          variant: string
        }
        Insert: {
          avg_engagement_rate?: number | null
          collection?: string | null
          created_at?: string
          description_template: string
          id?: string
          is_active?: boolean
          mood?: string | null
          name: string
          times_used?: number
          title_template: string
          total_clicks?: number
          total_impressions?: number
          total_saves?: number
          updated_at?: string
          user_id: string
          variant?: string
        }
        Update: {
          avg_engagement_rate?: number | null
          collection?: string | null
          created_at?: string
          description_template?: string
          id?: string
          is_active?: boolean
          mood?: string | null
          name?: string
          times_used?: number
          title_template?: string
          total_clicks?: number
          total_impressions?: number
          total_saves?: number
          updated_at?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      pin_schedules: {
        Row: {
          collection_weights: Json | null
          created_at: string
          id: string
          is_active: boolean
          max_pins_per_day: number
          name: string
          rotate_collections: boolean
          time_slots: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_weights?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_pins_per_day?: number
          name: string
          rotate_collections?: boolean
          time_slots?: Json
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_weights?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_pins_per_day?: number
          name?: string
          rotate_collections?: boolean
          time_slots?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pins: {
        Row: {
          alt_text: string | null
          asset_id: string | null
          board_id: string | null
          clicks: number
          collection: string | null
          copy_template_id: string | null
          copy_variant: string | null
          created_at: string
          description: string | null
          engagement_rate: number | null
          id: string
          image_url: string
          impressions: number
          last_error: string | null
          last_metrics_sync: string | null
          link: string | null
          mockup_id: string | null
          outbound_clicks: number
          performance_tier: string | null
          pinterest_board_id: string
          pinterest_pin_id: string | null
          published_at: string | null
          quote_id: string | null
          retry_count: number
          saves: number
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          asset_id?: string | null
          board_id?: string | null
          clicks?: number
          collection?: string | null
          copy_template_id?: string | null
          copy_variant?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url: string
          impressions?: number
          last_error?: string | null
          last_metrics_sync?: string | null
          link?: string | null
          mockup_id?: string | null
          outbound_clicks?: number
          performance_tier?: string | null
          pinterest_board_id: string
          pinterest_pin_id?: string | null
          published_at?: string | null
          quote_id?: string | null
          retry_count?: number
          saves?: number
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          asset_id?: string | null
          board_id?: string | null
          clicks?: number
          collection?: string | null
          copy_template_id?: string | null
          copy_variant?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url?: string
          impressions?: number
          last_error?: string | null
          last_metrics_sync?: string | null
          link?: string | null
          mockup_id?: string | null
          outbound_clicks?: number
          performance_tier?: string | null
          pinterest_board_id?: string
          pinterest_pin_id?: string | null
          published_at?: string | null
          quote_id?: string | null
          retry_count?: number
          saves?: number
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pins_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "pinterest_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_mockup_id_fkey"
            columns: ["mockup_id"]
            isOneToOne: false
            referencedRelation: "mockups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pins_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pinterest_ad_accounts: {
        Row: {
          created_at: string
          currency: string
          current_month_spend: number
          current_week_spend: number
          id: string
          name: string
          pinterest_ad_account_id: string
          status: string
          synced_at: string | null
          total_spend: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_month_spend?: number
          current_week_spend?: number
          id?: string
          name: string
          pinterest_ad_account_id: string
          status?: string
          synced_at?: string | null
          total_spend?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_month_spend?: number
          current_week_spend?: number
          id?: string
          name?: string
          pinterest_ad_account_id?: string
          status?: string
          synced_at?: string | null
          total_spend?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinterest_boards: {
        Row: {
          collection: string | null
          created_at: string
          description: string | null
          follower_count: number
          id: string
          is_primary: boolean
          name: string
          pin_count: number
          pinterest_board_id: string
          privacy: string | null
          synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          collection?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          is_primary?: boolean
          name: string
          pin_count?: number
          pinterest_board_id: string
          privacy?: string | null
          synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          collection?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          is_primary?: boolean
          name?: string
          pin_count?: number
          pinterest_board_id?: string
          privacy?: string | null
          synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          balance_after: number
          balance_before: number
          created_at: string
          customer_loyalty_id: string
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          points: number
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          balance_after: number
          balance_before: number
          created_at?: string
          customer_loyalty_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          points: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          balance_after?: number
          balance_before?: number
          created_at?: string
          customer_loyalty_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_customer_loyalty_id_fkey"
            columns: ["customer_loyalty_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_analytics: {
        Row: {
          closes: number
          conversions: number
          date: string
          id: string
          impressions: number
          popup_id: string
          unique_conversions: number
          unique_impressions: number
        }
        Insert: {
          closes?: number
          conversions?: number
          date?: string
          id?: string
          impressions?: number
          popup_id: string
          unique_conversions?: number
          unique_impressions?: number
        }
        Update: {
          closes?: number
          conversions?: number
          date?: string
          id?: string
          impressions?: number
          popup_id?: string
          unique_conversions?: number
          unique_impressions?: number
        }
        Relationships: [
          {
            foreignKeyName: "popup_analytics_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popups"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_impressions: {
        Row: {
          converted: boolean
          converted_at: string | null
          created_at: string
          id: string
          popup_id: string
          session_id: string | null
          visitor_id: string
        }
        Insert: {
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          popup_id: string
          session_id?: string | null
          visitor_id: string
        }
        Update: {
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          id?: string
          popup_id?: string
          session_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_impressions_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "popups"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          animation: string
          close_on_overlay_click: boolean
          content: Json
          created_at: string
          end_at: string | null
          frequency_cap: Json
          id: string
          name: string
          overlay_opacity: number
          position: string
          show_close_button: boolean
          start_at: string | null
          status: string
          style: Json
          targeting: Json
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animation?: string
          close_on_overlay_click?: boolean
          content?: Json
          created_at?: string
          end_at?: string | null
          frequency_cap?: Json
          id?: string
          name: string
          overlay_opacity?: number
          position?: string
          show_close_button?: boolean
          start_at?: string | null
          status?: string
          style?: Json
          targeting?: Json
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          animation?: string
          close_on_overlay_click?: boolean
          content?: Json
          created_at?: string
          end_at?: string | null
          frequency_cap?: Json
          id?: string
          name?: string
          overlay_opacity?: number
          position?: string
          show_close_button?: boolean
          start_at?: string | null
          status?: string
          style?: Json
          targeting?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          shopify_image_id: string | null
          source_id: string | null
          source_type: string
          src: string
          user_id: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          shopify_image_id?: string | null
          source_id?: string | null
          source_type: string
          src: string
          user_id: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          shopify_image_id?: string | null
          source_id?: string | null
          source_type?: string
          src?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing: {
        Row: {
          base_price: number
          cost: number | null
          created_at: string
          digital_price: number | null
          framed_price: number | null
          id: string
          is_active: boolean
          is_system: boolean
          size: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_price: number
          cost?: number | null
          created_at?: string
          digital_price?: number | null
          framed_price?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          size: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_price?: number
          cost?: number | null
          created_at?: string
          digital_price?: number | null
          framed_price?: number | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          size?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          digital_file_key: string | null
          digital_file_url: string | null
          frame_style: string | null
          id: string
          inventory_policy: string | null
          inventory_quantity: number
          is_active: boolean
          is_digital: boolean
          price: number
          product_id: string
          shopify_variant_gid: string | null
          shopify_variant_id: string | null
          size: string
          sku: string | null
          sky_pilot_asset_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          digital_file_key?: string | null
          digital_file_url?: string | null
          frame_style?: string | null
          id?: string
          inventory_policy?: string | null
          inventory_quantity?: number
          is_active?: boolean
          is_digital?: boolean
          price: number
          product_id: string
          shopify_variant_gid?: string | null
          shopify_variant_id?: string | null
          size: string
          sku?: string | null
          sky_pilot_asset_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          digital_file_key?: string | null
          digital_file_url?: string | null
          frame_style?: string | null
          id?: string
          inventory_policy?: string | null
          inventory_quantity?: number
          is_active?: boolean
          is_digital?: boolean
          price?: number
          product_id?: string
          shopify_variant_gid?: string | null
          shopify_variant_id?: string | null
          size?: string
          sku?: string | null
          sky_pilot_asset_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          asset_id: string | null
          collection: string | null
          created_at: string
          description: string | null
          id: string
          last_synced_at: string | null
          product_type: string | null
          published_at: string | null
          quote_id: string | null
          retire_reason: string | null
          retired_at: string | null
          shopify_handle: string | null
          shopify_product_gid: string | null
          shopify_product_id: string | null
          status: string
          sync_error: string | null
          tags: string[]
          title: string
          total_orders: number
          total_revenue: number
          total_views: number
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          asset_id?: string | null
          collection?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          product_type?: string | null
          published_at?: string | null
          quote_id?: string | null
          retire_reason?: string | null
          retired_at?: string | null
          shopify_handle?: string | null
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
          status?: string
          sync_error?: string | null
          tags?: string[]
          title: string
          total_orders?: number
          total_revenue?: number
          total_views?: number
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          asset_id?: string | null
          collection?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          product_type?: string | null
          published_at?: string | null
          quote_id?: string | null
          retire_reason?: string | null
          retired_at?: string | null
          shopify_handle?: string | null
          shopify_product_gid?: string | null
          shopify_product_id?: string | null
          status?: string
          sync_error?: string | null
          tags?: string[]
          title?: string
          total_orders?: number
          total_revenue?: number
          total_views?: number
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      promoted_pins: {
        Row: {
          ad_group_id: string
          clicks: number
          cpc: number | null
          created_at: string
          ctr: number | null
          destination_url: string | null
          id: string
          impressions: number
          pin_id: string | null
          pinterest_ad_id: string | null
          pinterest_pin_id: string
          rejection_reason: string | null
          status: string
          synced_at: string | null
          total_spend: number
          tracking_params: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_group_id: string
          clicks?: number
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          destination_url?: string | null
          id?: string
          impressions?: number
          pin_id?: string | null
          pinterest_ad_id?: string | null
          pinterest_pin_id: string
          rejection_reason?: string | null
          status?: string
          synced_at?: string | null
          total_spend?: number
          tracking_params?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_group_id?: string
          clicks?: number
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          destination_url?: string | null
          id?: string
          impressions?: number
          pin_id?: string | null
          pinterest_ad_id?: string | null
          pinterest_pin_id?: string
          rejection_reason?: string | null
          status?: string
          synced_at?: string | null
          total_spend?: number
          tracking_params?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoted_pins_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "ad_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoted_pins_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_text: string
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          position: number
          question_id: string
          scores: Json
          user_id: string
        }
        Insert: {
          answer_text: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          position: number
          question_id: string
          scores?: Json
          user_id: string
        }
        Update: {
          answer_text?: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          question_id?: string
          scores?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          help_text: string | null
          id: string
          image_url: string | null
          is_required: boolean
          position: number
          question_text: string
          question_type: string
          quiz_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          help_text?: string | null
          id?: string
          image_url?: string | null
          is_required?: boolean
          position: number
          question_text: string
          question_type?: string
          quiz_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          help_text?: string | null
          id?: string
          image_url?: string | null
          is_required?: boolean
          position?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: string
          ip_address: string | null
          lead_id: string | null
          quiz_id: string
          result_collection: string
          scores: Json
          started_at: string
          time_spent_seconds: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          quiz_id: string
          result_collection: string
          scores?: Json
          started_at?: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          quiz_id?: string
          result_collection?: string
          scores?: Json
          started_at?: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          collection: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          description: string
          id: string
          image_url: string | null
          klaviyo_segment_id: string | null
          quiz_id: string
          recommended_products: string[] | null
          recommended_quotes: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          description: string
          id?: string
          image_url?: string | null
          klaviyo_segment_id?: string | null
          quiz_id: string
          recommended_products?: string[] | null
          recommended_quotes?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          description?: string
          id?: string
          image_url?: string | null
          klaviyo_segment_id?: string | null
          quiz_id?: string
          recommended_products?: string[] | null
          recommended_quotes?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          completion_rate: number | null
          completions: number
          created_at: string
          description: string | null
          id: string
          landing_page_id: string | null
          require_email: boolean
          scoring_method: string
          show_results_immediately: boolean
          slug: string
          starts: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          completions?: number
          created_at?: string
          description?: string | null
          id?: string
          landing_page_id?: string | null
          require_email?: boolean
          scoring_method?: string
          show_results_immediately?: boolean
          slug: string
          starts?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          completions?: number
          created_at?: string
          description?: string | null
          id?: string
          landing_page_id?: string | null
          require_email?: boolean
          scoring_method?: string
          show_results_immediately?: boolean
          slug?: string
          starts?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          assets_generated: number
          attribution: string | null
          best_performing_asset_id: string | null
          collection: string
          created_at: string
          generation_settings: Json | null
          id: string
          import_batch_id: string | null
          imported_from: string | null
          last_generated_at: string | null
          mood: string
          status: string
          temporal_tags: string[]
          text: string
          total_clicks: number
          total_impressions: number
          total_pins: number
          total_saves: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assets_generated?: number
          attribution?: string | null
          best_performing_asset_id?: string | null
          collection: string
          created_at?: string
          generation_settings?: Json | null
          id?: string
          import_batch_id?: string | null
          imported_from?: string | null
          last_generated_at?: string | null
          mood: string
          status?: string
          temporal_tags?: string[]
          text: string
          total_clicks?: number
          total_impressions?: number
          total_pins?: number
          total_saves?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assets_generated?: number
          attribution?: string | null
          best_performing_asset_id?: string | null
          collection?: string
          created_at?: string
          generation_settings?: Json | null
          id?: string
          import_batch_id?: string | null
          imported_from?: string | null
          last_generated_at?: string | null
          mood?: string
          status?: string
          temporal_tags?: string[]
          text?: string
          total_clicks?: number
          total_impressions?: number
          total_pins?: number
          total_saves?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          data: Json
          description: string
          expected_impact: string | null
          expires_at: string | null
          feedback_rating: number | null
          id: string
          impact_score: number | null
          model_version: string | null
          rationale: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          data?: Json
          description: string
          expected_impact?: string | null
          expires_at?: string | null
          feedback_rating?: number | null
          id?: string
          impact_score?: number | null
          model_version?: string | null
          rationale?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          data?: Json
          description?: string
          expected_impact?: string | null
          expires_at?: string | null
          feedback_rating?: number | null
          id?: string
          impact_score?: number | null
          model_version?: string | null
          rationale?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      retry_queue: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          operation_type: string
          payload: Json
          reference_id: string | null
          reference_table: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          operation_type: string
          payload: Json
          reference_id?: string | null
          reference_table?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          operation_type?: string
          payload?: Json
          reference_id?: string | null
          reference_table?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      revenue_attribution: {
        Row: {
          attributed_revenue: number
          attribution_weight: number
          content_id: string
          content_type: string
          created_at: string
          customer_id: string | null
          id: string
          model_id: string | null
          order_date: string
          order_id: string
          order_total: number
          touchpoint_at: string
          touchpoint_id: string | null
          touchpoint_type: string
          user_id: string
        }
        Insert: {
          attributed_revenue: number
          attribution_weight: number
          content_id: string
          content_type: string
          created_at?: string
          customer_id?: string | null
          id?: string
          model_id?: string | null
          order_date: string
          order_id: string
          order_total: number
          touchpoint_at: string
          touchpoint_id?: string | null
          touchpoint_type: string
          user_id: string
        }
        Update: {
          attributed_revenue?: number
          attribution_weight?: number
          content_id?: string
          content_type?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          model_id?: string | null
          order_date?: string
          order_id?: string
          order_total?: number
          touchpoint_at?: string
          touchpoint_id?: string | null
          touchpoint_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_attribution_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_attribution_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "attribution_models"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string
          customer_loyalty_id: string
          discount_code: string | null
          expires_at: string | null
          id: string
          points_spent: number
          points_transaction_id: string | null
          reward_id: string
          status: string
          updated_at: string
          used_at: string | null
          used_order_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_loyalty_id: string
          discount_code?: string | null
          expires_at?: string | null
          id?: string
          points_spent: number
          points_transaction_id?: string | null
          reward_id: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_order_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_loyalty_id?: string
          discount_code?: string | null
          expires_at?: string | null
          id?: string
          points_spent?: number
          points_transaction_id?: string | null
          reward_id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_customer_loyalty_id_fkey"
            columns: ["customer_loyalty_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_points_transaction_id_fkey"
            columns: ["points_transaction_id"]
            isOneToOne: false
            referencedRelation: "points_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_exports: {
        Row: {
          created_at: string
          date_range_type: string | null
          delivery_email: string | null
          delivery_method: string
          enabled: boolean
          export_type: string
          field_selection: string[] | null
          format: string
          frequency: string
          id: string
          last_run_at: string | null
          next_run_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_type?: string | null
          delivery_email?: string | null
          delivery_method?: string
          enabled?: boolean
          export_type: string
          field_selection?: string[] | null
          format?: string
          frequency: string
          id?: string
          last_run_at?: string | null
          next_run_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_type?: string | null
          delivery_email?: string | null
          delivery_method?: string
          enabled?: boolean
          export_type?: string
          field_selection?: string[] | null
          format?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasonal_templates: {
        Row: {
          created_at: string
          default_hashtags: string[] | null
          default_theme: string | null
          description: string | null
          description_templates: string[] | null
          headline_templates: string[] | null
          id: string
          is_system: boolean
          name: string
          suggested_collections: string[] | null
          typical_duration_days: number
          typical_start_day: number
          typical_start_month: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          default_hashtags?: string[] | null
          default_theme?: string | null
          description?: string | null
          description_templates?: string[] | null
          headline_templates?: string[] | null
          id?: string
          is_system?: boolean
          name: string
          suggested_collections?: string[] | null
          typical_duration_days?: number
          typical_start_day: number
          typical_start_month: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          default_hashtags?: string[] | null
          default_theme?: string | null
          description?: string | null
          description_templates?: string[] | null
          headline_templates?: string[] | null
          id?: string
          is_system?: boolean
          name?: string
          suggested_collections?: string[] | null
          typical_duration_days?: number
          typical_start_day?: number
          typical_start_month?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      segment_memberships: {
        Row: {
          added_at: string
          customer_id: string
          id: string
          removed_at: string | null
          segment_id: string
        }
        Insert: {
          added_at?: string
          customer_id: string
          id?: string
          removed_at?: string | null
          segment_id: string
        }
        Update: {
          added_at?: string
          customer_id?: string
          id?: string
          removed_at?: string | null
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_memberships_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_webhooks: {
        Row: {
          address: string
          created_at: string
          id: string
          shopify_webhook_id: string
          topic: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          shopify_webhook_id: string
          topic: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          shopify_webhook_id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      stage_transitions: {
        Row: {
          customer_id: string
          from_stage: string
          id: string
          to_stage: string
          transitioned_at: string
          trigger_reference_id: string | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          customer_id: string
          from_stage: string
          id?: string
          to_stage: string
          transitioned_at?: string
          trigger_reference_id?: string | null
          trigger_type: string
          user_id: string
        }
        Update: {
          customer_id?: string
          from_stage?: string
          id?: string
          to_stage?: string
          transitioned_at?: string
          trigger_reference_id?: string | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_transitions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      touchpoints: {
        Row: {
          channel: string
          collection: string | null
          created_at: string
          customer_id: string
          id: string
          metadata: Json | null
          occurred_at: string
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
        }
        Insert: {
          channel: string
          collection?: string | null
          created_at?: string
          customer_id: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Update: {
          channel?: string
          collection?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          digest_preferences: Json
          global_mode: string
          guardrails: Json
          id: string
          module_overrides: Json
          notification_preferences: Json
          setup_completed_at: string | null
          setup_progress: Json
          timezone: string
          transition_started_at: string | null
          transitioning_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_preferences?: Json
          global_mode?: string
          guardrails?: Json
          id?: string
          module_overrides?: Json
          notification_preferences?: Json
          setup_completed_at?: string | null
          setup_progress?: Json
          timezone?: string
          transition_started_at?: string | null
          transitioning_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_preferences?: Json
          global_mode?: string
          guardrails?: Json
          id?: string
          module_overrides?: Json
          notification_preferences?: Json
          setup_completed_at?: string | null
          setup_progress?: Json
          timezone?: string
          transition_started_at?: string | null
          transitioning_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      winback_campaigns: {
        Row: {
          created_at: string
          customers_recovered: number
          customers_targeted: number
          description: string | null
          discount_code: string | null
          emails_clicked: number
          emails_opened: number
          emails_sent: number
          ends_at: string | null
          id: string
          incentive_type: string | null
          incentive_value: number | null
          klaviyo_flow_id: string
          max_days_inactive: number | null
          min_days_inactive: number
          min_lifetime_value: number | null
          name: string
          revenue_recovered: number
          send_delay_days: number
          starts_at: string | null
          status: string
          target_collections: string[] | null
          target_stages: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customers_recovered?: number
          customers_targeted?: number
          description?: string | null
          discount_code?: string | null
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          ends_at?: string | null
          id?: string
          incentive_type?: string | null
          incentive_value?: number | null
          klaviyo_flow_id: string
          max_days_inactive?: number | null
          min_days_inactive?: number
          min_lifetime_value?: number | null
          name: string
          revenue_recovered?: number
          send_delay_days?: number
          starts_at?: string | null
          status?: string
          target_collections?: string[] | null
          target_stages?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customers_recovered?: number
          customers_targeted?: number
          description?: string | null
          discount_code?: string | null
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          ends_at?: string | null
          id?: string
          incentive_type?: string | null
          incentive_value?: number | null
          klaviyo_flow_id?: string
          max_days_inactive?: number | null
          min_days_inactive?: number
          min_lifetime_value?: number | null
          name?: string
          revenue_recovered?: number
          send_delay_days?: number
          starts_at?: string | null
          status?: string
          target_collections?: string[] | null
          target_stages?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      winback_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string
          customer_id: string
          discount_code_used: string | null
          id: string
          opened_at: string | null
          recovered_at: string | null
          recovery_order_id: string | null
          recovery_order_value: number | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          customer_id: string
          discount_code_used?: string | null
          id?: string
          opened_at?: string | null
          recovered_at?: string | null
          recovery_order_id?: string | null
          recovery_order_value?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          customer_id?: string
          discount_code_used?: string | null
          id?: string
          opened_at?: string | null
          recovered_at?: string | null
          recovery_order_id?: string | null
          recovery_order_value?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winback_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "winback_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winback_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_approve_high_confidence: {
        Args: { p_threshold?: number; p_user_id: string }
        Returns: number
      }
      award_points: {
        Args: {
          p_customer_id: string
          p_description?: string
          p_points: number
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
        }
        Returns: string
      }
      bulk_approve_items: {
        Args: { p_item_ids: string[]; p_user_id: string }
        Returns: number
      }
      bulk_reject_items: {
        Args: { p_item_ids: string[]; p_reason?: string; p_user_id: string }
        Returns: number
      }
      calculate_collection_affinity: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      calculate_performance_score: {
        Args: {
          p_comments: number
          p_likes: number
          p_saves: number
          p_shares: number
          p_views: number
        }
        Returns: number
      }
      calculate_quiz_result: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          result_collection: string
          scores: Json
        }[]
      }
      check_ad_spend_budget: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          allowed: boolean
          message: string
          monthly_remaining: number
          weekly_remaining: number
        }[]
      }
      check_guardrail: {
        Args: {
          p_current_value: number
          p_guardrail_key: string
          p_user_id: string
        }
        Returns: {
          allowed: boolean
          limit_value: number
          remaining: number
        }[]
      }
      check_tier_upgrade: { Args: { p_customer_id: string }; Returns: string }
      claim_gift: {
        Args: { p_customer_id: string; p_gift_code: string }
        Returns: {
          claimed: boolean
          claimed_at: string | null
          claimed_by_customer_id: string | null
          created_at: string
          delivered_at: string | null
          expires_at: string
          gift_code: string
          id: string
          message: string | null
          order_id: string
          recipient_email: string
          recipient_name: string | null
          scheduled_delivery_at: string | null
          sender_customer_id: string | null
          sender_email: string
          sender_name: string | null
          shopify_order_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "gifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_retry_items: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          attempts: number
          claimed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          operation_type: string
          payload: Json
          reference_id: string | null
          reference_table: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "retry_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_credentials: {
        Args: { p_provider: string; p_user_id: string }
        Returns: undefined
      }
      generate_gift_code: { Args: never; Returns: string }
      get_applicable_design_rules: {
        Args: { p_collection: string; p_mood: string; p_user_id: string }
        Returns: {
          applies_to_collections: string[]
          applies_to_moods: string[]
          colors: Json
          created_at: string
          decorations: Json
          description: string | null
          enabled: boolean
          id: string
          is_default: boolean
          layout: Json
          name: string
          output_formats: string[]
          print_sizes: string[]
          priority: number
          quality_thresholds: Json
          typography: Json
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "design_rules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_approval_counts: {
        Args: { p_user_id: string }
        Returns: {
          count: number
          type: string
        }[]
      }
      get_checkouts_for_sequence: {
        Args: { p_user_id: string; p_window_hours?: number }
        Returns: {
          cart_items: Json
          cart_total: number
          checkout_id: string
          checkout_url: string
          email: string
          klaviyo_flow_id: string
          sequence_id: string
        }[]
      }
      get_credential: {
        Args: {
          p_credential_type: string
          p_provider: string
          p_user_id: string
        }
        Returns: string
      }
      get_credit_usage: {
        Args: { p_month?: number; p_user_id: string; p_year?: number }
        Returns: {
          annual_budget: number
          monthly_soft_limit: number
          monthly_used: number
          remaining_annual: number
          remaining_monthly: number
          total_used: number
        }[]
      }
      get_effective_mode: {
        Args: { p_module?: string; p_user_id: string }
        Returns: string
      }
      get_next_pin_slot: {
        Args: { p_after?: string; p_user_id: string }
        Returns: string
      }
      get_top_performing_content: {
        Args: {
          p_content_type: string
          p_limit?: number
          p_period_type?: string
          p_user_id: string
        }
        Returns: {
          clicks: number
          content_id: string
          conversion_rate: number
          ctr: number
          impressions: number
          purchases: number
          revenue: number
        }[]
      }
      get_upcoming_campaigns: {
        Args: { p_days_ahead?: number; p_user_id: string }
        Returns: {
          days_until_start: number
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          type: string
        }[]
      }
      get_winback_eligible_customers: {
        Args: { p_campaign_id: string }
        Returns: {
          customer_id: string
          days_inactive: number
          email: string
          first_name: string
          lifetime_value: number
          primary_collection: string
          stage: string
        }[]
      }
      log_activity: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_executed?: boolean
          p_module?: string
          p_new_value?: Json
          p_previous_value?: Json
          p_reference_id?: string
          p_reference_table?: string
          p_user_id: string
        }
        Returns: string
      }
      process_form_submission: {
        Args: { p_submission_id: string }
        Returns: string
      }
      queue_for_retry: {
        Args: {
          p_error?: string
          p_max_attempts?: number
          p_operation_type: string
          p_payload: Json
          p_reference_id?: string
          p_reference_table?: string
          p_user_id: string
        }
        Returns: string
      }
      record_coupon_use: {
        Args: {
          p_coupon_code: string
          p_customer_email: string
          p_customer_id: string
          p_discount_amount: number
          p_order_id: string
          p_order_total: number
          p_shopify_order_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      reserve_mockup_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: {
          message: string
          remaining: number
          success: boolean
        }[]
      }
      store_credential: {
        Args: {
          p_credential_type: string
          p_credential_value: string
          p_provider: string
          p_user_id: string
        }
        Returns: undefined
      }
      track_page_view: { Args: { p_page_id: string }; Returns: undefined }
      track_popup_conversion: {
        Args: { p_popup_id: string; p_visitor_id: string }
        Returns: boolean
      }
      track_popup_impression: {
        Args: {
          p_popup_id: string
          p_session_id?: string
          p_visitor_id: string
        }
        Returns: boolean
      }
      update_customer_stage: {
        Args: { p_customer_id: string; p_trigger_type?: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

