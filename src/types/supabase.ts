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
      ab_test_results: {
        Row: {
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          created_at: string | null
          ctr: number | null
          cumulative_conversions: number | null
          cumulative_impressions: number | null
          id: string
          impressions: number | null
          result_date: string
          save_rate: number | null
          saves: number | null
          spend: number | null
          test_id: string
          user_id: string
          variant_id: string
        }
        Insert: {
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          ctr?: number | null
          cumulative_conversions?: number | null
          cumulative_impressions?: number | null
          id?: string
          impressions?: number | null
          result_date: string
          save_rate?: number | null
          saves?: number | null
          spend?: number | null
          test_id: string
          user_id: string
          variant_id: string
        }
        Update: {
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string | null
          ctr?: number | null
          cumulative_conversions?: number | null
          cumulative_impressions?: number | null
          id?: string
          impressions?: number | null
          result_date?: string
          save_rate?: number | null
          saves?: number | null
          spend?: number | null
          test_id?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_results_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_variants: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          is_control: boolean | null
          name: string
          test_id: string
          traffic_percentage: number
          user_id: string
          variant_config: Json | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          is_control?: boolean | null
          name: string
          test_id: string
          traffic_percentage: number
          user_id: string
          variant_config?: Json | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_control?: boolean | null
          name?: string
          test_id?: string
          traffic_percentage?: number
          user_id?: string
          variant_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          confidence_threshold: number | null
          control_variant_id: string
          created_at: string | null
          description: string | null
          ended_at: string | null
          hypothesis: string | null
          id: string
          minimum_sample_size: number | null
          name: string
          primary_metric: string
          results_summary: Json | null
          scheduled_end_at: string | null
          started_at: string | null
          status: string | null
          test_type: string
          test_variant_ids: string[]
          traffic_split: Json
          updated_at: string | null
          user_id: string
          winner_confidence: number | null
          winner_declared_at: string | null
          winner_variant_id: string | null
        }
        Insert: {
          confidence_threshold?: number | null
          control_variant_id: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          minimum_sample_size?: number | null
          name: string
          primary_metric?: string
          results_summary?: Json | null
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string | null
          test_type: string
          test_variant_ids: string[]
          traffic_split?: Json
          updated_at?: string | null
          user_id: string
          winner_confidence?: number | null
          winner_declared_at?: string | null
          winner_variant_id?: string | null
        }
        Update: {
          confidence_threshold?: number | null
          control_variant_id?: string
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          minimum_sample_size?: number | null
          name?: string
          primary_metric?: string
          results_summary?: Json | null
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string | null
          test_type?: string
          test_variant_ids?: string[]
          traffic_split?: Json
          updated_at?: string | null
          user_id?: string
          winner_confidence?: number | null
          winner_declared_at?: string | null
          winner_variant_id?: string | null
        }
        Relationships: []
      }
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
          content_pillar: string | null
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
          content_pillar?: string | null
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
          content_pillar?: string | null
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
            foreignKeyName: "assets_content_pillar_fkey"
            columns: ["content_pillar"]
            isOneToOne: false
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
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
      audience_exports: {
        Row: {
          auto_sync: boolean
          created_at: string
          description: string | null
          error: string | null
          id: string
          last_profile_count: number | null
          last_synced_at: string | null
          matched_profiles: number | null
          name: string
          next_sync_at: string | null
          pinterest_audience_id: string | null
          pinterest_audience_name: string | null
          segment_criteria: Json
          status: string
          sync_frequency: string | null
          total_profiles: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          last_profile_count?: number | null
          last_synced_at?: string | null
          matched_profiles?: number | null
          name: string
          next_sync_at?: string | null
          pinterest_audience_id?: string | null
          pinterest_audience_name?: string | null
          segment_criteria?: Json
          status?: string
          sync_frequency?: string | null
          total_profiles?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          last_profile_count?: number | null
          last_synced_at?: string | null
          matched_profiles?: number | null
          name?: string
          next_sync_at?: string | null
          pinterest_audience_id?: string | null
          pinterest_audience_name?: string | null
          segment_criteria?: Json
          status?: string
          sync_frequency?: string | null
          total_profiles?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_action_items: {
        Row: {
          action: string
          audit_id: string | null
          category: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          audit_id?: string | null
          category: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          audit_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_action_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "content_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_hashtags: {
        Row: {
          created_at: string | null
          hashtag: string
          id: string
          is_system: boolean | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          hashtag: string
          id?: string
          is_system?: boolean | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          hashtag?: string
          id?: string
          is_system?: boolean | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_recommendations: {
        Row: {
          applied_at: string | null
          campaign_id: string
          campaign_name: string | null
          confidence_score: number
          created_at: string | null
          current_cpa: number | null
          current_daily_budget: number
          current_roas: number | null
          current_spend_7d: number | null
          id: string
          projected_additional_conversions: number | null
          projected_additional_spend: number | null
          projected_new_cpa: number | null
          reasoning: Json
          recommendation_type: string
          recommended_change_percentage: number | null
          recommended_daily_budget: number | null
          status: string | null
          user_action: string | null
          user_action_at: string | null
          user_id: string
          valid_until: string
        }
        Insert: {
          applied_at?: string | null
          campaign_id: string
          campaign_name?: string | null
          confidence_score: number
          created_at?: string | null
          current_cpa?: number | null
          current_daily_budget: number
          current_roas?: number | null
          current_spend_7d?: number | null
          id?: string
          projected_additional_conversions?: number | null
          projected_additional_spend?: number | null
          projected_new_cpa?: number | null
          reasoning: Json
          recommendation_type: string
          recommended_change_percentage?: number | null
          recommended_daily_budget?: number | null
          status?: string | null
          user_action?: string | null
          user_action_at?: string | null
          user_id: string
          valid_until: string
        }
        Update: {
          applied_at?: string | null
          campaign_id?: string
          campaign_name?: string | null
          confidence_score?: number
          created_at?: string | null
          current_cpa?: number | null
          current_daily_budget?: number
          current_roas?: number | null
          current_spend_7d?: number | null
          id?: string
          projected_additional_conversions?: number | null
          projected_additional_spend?: number | null
          projected_new_cpa?: number | null
          reasoning?: Json
          recommendation_type?: string
          recommended_change_percentage?: number | null
          recommended_daily_budget?: number | null
          status?: string | null
          user_action?: string | null
          user_action_at?: string | null
          user_id?: string
          valid_until?: string
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
      campaign_templates: {
        Row: {
          created_at: string | null
          default_daily_budget: number
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_recommended: boolean | null
          min_purchases_for_lookalike: number | null
          min_sales_required: number | null
          name: string
          objective: string
          phase: number
          requires_audience: string | null
          requires_pixel_data: boolean | null
          targeting_presets: Json | null
          targeting_type: string
        }
        Insert: {
          created_at?: string | null
          default_daily_budget: number
          description?: string | null
          display_order?: number | null
          id: string
          is_active?: boolean | null
          is_recommended?: boolean | null
          min_purchases_for_lookalike?: number | null
          min_sales_required?: number | null
          name: string
          objective: string
          phase?: number
          requires_audience?: string | null
          requires_pixel_data?: boolean | null
          targeting_presets?: Json | null
          targeting_type: string
        }
        Update: {
          created_at?: string | null
          default_daily_budget?: number
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_recommended?: boolean | null
          min_purchases_for_lookalike?: number | null
          min_sales_required?: number | null
          name?: string
          objective?: string
          phase?: number
          requires_audience?: string | null
          requires_pixel_data?: boolean | null
          targeting_presets?: Json | null
          targeting_type?: string
        }
        Relationships: []
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
      content_audits: {
        Row: {
          actions: Json | null
          created_at: string | null
          id: string
          insights: string[] | null
          metrics: Json
          period_end: string
          period_start: string
          period_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          top_posts: string[] | null
          top_reels: string[] | null
          top_saved: string[] | null
          top_shared: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actions?: Json | null
          created_at?: string | null
          id?: string
          insights?: string[] | null
          metrics?: Json
          period_end: string
          period_start: string
          period_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          top_posts?: string[] | null
          top_reels?: string[] | null
          top_saved?: string[] | null
          top_shared?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actions?: Json | null
          created_at?: string | null
          id?: string
          insights?: string[] | null
          metrics?: Json
          period_end?: string
          period_start?: string
          period_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          top_posts?: string[] | null
          top_reels?: string[] | null
          top_saved?: string[] | null
          top_shared?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_mix_recommendations: {
        Row: {
          confidence_score: number | null
          current_percentage: number | null
          generated_at: string | null
          id: string
          pillar_id: string
          platform: string
          reasoning: Json | null
          recommended_percentage: number
          user_id: string
          valid_until: string | null
        }
        Insert: {
          confidence_score?: number | null
          current_percentage?: number | null
          generated_at?: string | null
          id?: string
          pillar_id: string
          platform?: string
          reasoning?: Json | null
          recommended_percentage: number
          user_id: string
          valid_until?: string | null
        }
        Update: {
          confidence_score?: number | null
          current_percentage?: number | null
          generated_at?: string | null
          id?: string
          pillar_id?: string
          platform?: string
          reasoning?: Json | null
          recommended_percentage?: number
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_mix_recommendations_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
        ]
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
      content_pillar_performance: {
        Row: {
          avg_ctr: number | null
          avg_save_rate: number | null
          clicks: number | null
          content_count: number | null
          created_at: string | null
          current_percentage: number | null
          id: string
          impressions: number | null
          period_start: string
          period_type: string
          pillar_id: string
          platform: string
          saves: number | null
          updated_at: string | null
          user_id: string
          winner_count: number | null
          winner_percentage: number | null
        }
        Insert: {
          avg_ctr?: number | null
          avg_save_rate?: number | null
          clicks?: number | null
          content_count?: number | null
          created_at?: string | null
          current_percentage?: number | null
          id?: string
          impressions?: number | null
          period_start: string
          period_type: string
          pillar_id: string
          platform?: string
          saves?: number | null
          updated_at?: string | null
          user_id: string
          winner_count?: number | null
          winner_percentage?: number | null
        }
        Update: {
          avg_ctr?: number | null
          avg_save_rate?: number | null
          clicks?: number | null
          content_count?: number | null
          created_at?: string | null
          current_percentage?: number | null
          id?: string
          impressions?: number | null
          period_start?: string
          period_type?: string
          pillar_id?: string
          platform?: string
          saves?: number | null
          updated_at?: string | null
          user_id?: string
          winner_count?: number | null
          winner_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_pillar_performance_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pillars: {
        Row: {
          description: string | null
          display_order: number | null
          id: string
          name: string
          recommended_percentage: number | null
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          id: string
          name: string
          recommended_percentage?: number | null
        }
        Update: {
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          recommended_percentage?: number | null
        }
        Relationships: []
      }
      copy_collection_hooks: {
        Row: {
          avg_engagement_rate: number | null
          collection: string
          created_at: string
          hook_text: string
          hook_type: string
          id: string
          is_active: boolean
          times_used: number
          total_saves: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_engagement_rate?: number | null
          collection: string
          created_at?: string
          hook_text: string
          hook_type: string
          id?: string
          is_active?: boolean
          times_used?: number
          total_saves?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_engagement_rate?: number | null
          collection?: string
          created_at?: string
          hook_text?: string
          hook_type?: string
          id?: string
          is_active?: boolean
          times_used?: number
          total_saves?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      copy_mood_descriptors: {
        Row: {
          created_at: string
          descriptors: string[]
          id: string
          is_active: boolean
          mood: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descriptors: string[]
          id?: string
          is_active?: boolean
          mood: string
          user_id: string
        }
        Update: {
          created_at?: string
          descriptors?: string[]
          id?: string
          is_active?: boolean
          mood?: string
          user_id?: string
        }
        Relationships: []
      }
      copy_room_contexts: {
        Row: {
          context_phrases: string[]
          created_at: string
          id: string
          is_active: boolean
          room_type: string
          user_id: string
        }
        Insert: {
          context_phrases: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          room_type: string
          user_id: string
        }
        Update: {
          context_phrases?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          room_type?: string
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
      creative_health: {
        Row: {
          baseline_captured_at: string | null
          baseline_ctr: number | null
          baseline_engagement_rate: number | null
          baseline_impressions: number | null
          baseline_save_rate: number | null
          content_id: string
          content_type: string
          created_at: string | null
          current_ctr: number | null
          current_engagement_rate: number | null
          current_impressions: number | null
          current_save_rate: number | null
          days_active: number | null
          days_since_baseline: number | null
          fatigue_score: number | null
          id: string
          last_metrics_update: string | null
          last_refresh_at: string | null
          metrics_history: Json | null
          refresh_count: number | null
          refresh_reason: string | null
          refresh_recommended: boolean | null
          refresh_recommended_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          baseline_captured_at?: string | null
          baseline_ctr?: number | null
          baseline_engagement_rate?: number | null
          baseline_impressions?: number | null
          baseline_save_rate?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          current_ctr?: number | null
          current_engagement_rate?: number | null
          current_impressions?: number | null
          current_save_rate?: number | null
          days_active?: number | null
          days_since_baseline?: number | null
          fatigue_score?: number | null
          id?: string
          last_metrics_update?: string | null
          last_refresh_at?: string | null
          metrics_history?: Json | null
          refresh_count?: number | null
          refresh_reason?: string | null
          refresh_recommended?: boolean | null
          refresh_recommended_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          baseline_captured_at?: string | null
          baseline_ctr?: number | null
          baseline_engagement_rate?: number | null
          baseline_impressions?: number | null
          baseline_save_rate?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          current_ctr?: number | null
          current_engagement_rate?: number | null
          current_impressions?: number | null
          current_save_rate?: number | null
          days_active?: number | null
          days_since_baseline?: number | null
          fatigue_score?: number | null
          id?: string
          last_metrics_update?: string | null
          last_refresh_at?: string | null
          metrics_history?: Json | null
          refresh_count?: number | null
          refresh_reason?: string | null
          refresh_recommended?: boolean | null
          refresh_recommended_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credential_vault: {
        Row: {
          created_at: string | null
          credential_type: string
          credential_value: string
          id: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credential_type: string
          credential_value: string
          id?: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credential_type?: string
          credential_value?: string
          id?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cross_platform_content: {
        Row: {
          adapted_at: string | null
          adapted_to_pinterest: boolean
          caption: string | null
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
          platform_content_id: string | null
          posted_at: string | null
          published_at: string | null
          quote_id: string | null
          saves: number
          shares: number
          thumbnail_url: string | null
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
          caption?: string | null
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
          platform_content_id?: string | null
          posted_at?: string | null
          published_at?: string | null
          quote_id?: string | null
          saves?: number
          shares?: number
          thumbnail_url?: string | null
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
          caption?: string | null
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
          platform_content_id?: string | null
          posted_at?: string | null
          published_at?: string | null
          quote_id?: string | null
          saves?: number
          shares?: number
          thumbnail_url?: string | null
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
          {
            foreignKeyName: "cross_platform_content_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_platform_metrics: {
        Row: {
          comments: number | null
          content_id: string
          created_at: string | null
          engagement_rate: number | null
          id: string
          likes: number | null
          metric_date: string
          saves: number | null
          shares: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          content_id: string
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          metric_date: string
          saves?: number | null
          shares?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          content_id?: string
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          metric_date?: string
          saves?: number | null
          shares?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_platform_metrics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cross_platform_content"
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
      dm_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          last_used_at: string | null
          message_template: string
          name: string
          template_type: string
          updated_at: string | null
          use_count: number | null
          user_id: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          message_template: string
          name: string
          template_type: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          message_template?: string
          name?: string
          template_type?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      email_base_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          placeholders: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          placeholders?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_content_library: {
        Row: {
          body_content: string
          created_at: string
          created_by: string | null
          email_template_id: string | null
          id: string
          is_active: boolean
          preview_text: string | null
          subject: string
          user_id: string | null
          variables: Json | null
          version: number
        }
        Insert: {
          body_content: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          preview_text?: string | null
          subject: string
          user_id?: string | null
          variables?: Json | null
          version?: number
        }
        Update: {
          body_content?: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          preview_text?: string | null
          subject?: string
          user_id?: string | null
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_content_library_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          base_template_id: string | null
          button_text: string | null
          button_url: string | null
          content_html: string | null
          created_at: string
          delay_hours: number
          flow_type: string
          html_content: string | null
          id: string
          is_active: boolean
          klaviyo_template_id: string | null
          name: string
          position: number
          preview_text: string | null
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_template_id?: string | null
          button_text?: string | null
          button_url?: string | null
          content_html?: string | null
          created_at?: string
          delay_hours?: number
          flow_type: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          klaviyo_template_id?: string | null
          name: string
          position?: number
          preview_text?: string | null
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_template_id?: string | null
          button_text?: string | null
          button_url?: string | null
          content_html?: string | null
          created_at?: string
          delay_hours?: number
          flow_type?: string
          html_content?: string | null
          id?: string
          is_active?: boolean
          klaviyo_template_id?: string | null
          name?: string
          position?: number
          preview_text?: string | null
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_base_template_id_fkey"
            columns: ["base_template_id"]
            isOneToOne: false
            referencedRelation: "email_base_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_stats: {
        Row: {
          accounts_engaged: number | null
          afternoon_minutes: number | null
          comments_responded: number | null
          created_at: string | null
          dms_sent: number | null
          evening_minutes: number | null
          id: string
          morning_minutes: number | null
          stat_date: string
          stories_posted: number | null
          tasks_completed: number | null
          tasks_expired: number | null
          tasks_skipped: number | null
          total_minutes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accounts_engaged?: number | null
          afternoon_minutes?: number | null
          comments_responded?: number | null
          created_at?: string | null
          dms_sent?: number | null
          evening_minutes?: number | null
          id?: string
          morning_minutes?: number | null
          stat_date: string
          stories_posted?: number | null
          tasks_completed?: number | null
          tasks_expired?: number | null
          tasks_skipped?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accounts_engaged?: number | null
          afternoon_minutes?: number | null
          comments_responded?: number | null
          created_at?: string | null
          dms_sent?: number | null
          evening_minutes?: number | null
          id?: string
          morning_minutes?: number | null
          stat_date?: string
          stories_posted?: number | null
          tasks_completed?: number | null
          tasks_expired?: number | null
          tasks_skipped?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      engagement_target_accounts: {
        Row: {
          account_type: string | null
          created_at: string | null
          engagement_count: number | null
          id: string
          instagram_handle: string
          is_active: boolean | null
          last_engaged_at: string | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          instagram_handle: string
          is_active?: boolean | null
          last_engaged_at?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          engagement_count?: number | null
          id?: string
          instagram_handle?: string
          is_active?: boolean | null
          last_engaged_at?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      engagement_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          priority: number
          response_used: string | null
          scheduled_date: string
          scheduled_slot: string
          skipped_reason: string | null
          started_at: string | null
          status: string
          target_account: string | null
          target_content_id: string | null
          target_content_preview: string | null
          task_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: number
          response_used?: string | null
          scheduled_date?: string
          scheduled_slot: string
          skipped_reason?: string | null
          started_at?: string | null
          status?: string
          target_account?: string | null
          target_content_id?: string | null
          target_content_preview?: string | null
          task_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: number
          response_used?: string | null
          scheduled_date?: string
          scheduled_slot?: string
          skipped_reason?: string | null
          started_at?: string | null
          status?: string
          target_account?: string | null
          target_content_id?: string | null
          target_content_preview?: string | null
          task_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exports: {
        Row: {
          completed_at: string | null
          created_at: string
          date_range: Json | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          fields_included: string[] | null
          file_path: string | null
          file_url: string | null
          format: string
          id: string
          row_count: number | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date_range?: Json | null
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          fields_included?: string[] | null
          file_path?: string | null
          file_url?: string | null
          format: string
          id?: string
          row_count?: number | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date_range?: Json | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          fields_included?: string[] | null
          file_path?: string | null
          file_url?: string | null
          format?: string
          id?: string
          row_count?: number | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_blueprints: {
        Row: {
          conditions: Json | null
          created_at: string
          default_delays: Json
          description: string | null
          flow_type: string
          id: string
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          default_delays?: Json
          description?: string | null
          flow_type: string
          id?: string
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          default_delays?: Json
          description?: string | null
          flow_type?: string
          id?: string
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_deployments: {
        Row: {
          activated_at: string | null
          created_at: string
          deployed_at: string | null
          flow_blueprint_id: string | null
          flow_type: string
          id: string
          klaviyo_flow_id: string | null
          last_error: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          deployed_at?: string | null
          flow_blueprint_id?: string | null
          flow_type: string
          id?: string
          klaviyo_flow_id?: string | null
          last_error?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          deployed_at?: string | null
          flow_blueprint_id?: string | null
          flow_type?: string
          id?: string
          klaviyo_flow_id?: string | null
          last_error?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_deployments_flow_blueprint_id_fkey"
            columns: ["flow_blueprint_id"]
            isOneToOne: false
            referencedRelation: "flow_blueprints"
            referencedColumns: ["id"]
          },
        ]
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
      hashtag_groups: {
        Row: {
          avg_engagement_rate: number | null
          collection_affinity: string | null
          content_type: string | null
          created_at: string | null
          estimated_reach: string | null
          hashtags: string[]
          id: string
          is_active: boolean | null
          is_system: boolean | null
          last_used_at: string | null
          name: string
          tier: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          collection_affinity?: string | null
          content_type?: string | null
          created_at?: string | null
          estimated_reach?: string | null
          hashtags: string[]
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          name: string
          tier: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          avg_engagement_rate?: number | null
          collection_affinity?: string | null
          content_type?: string | null
          created_at?: string | null
          estimated_reach?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          name?: string
          tier?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      hashtag_rotation_sets: {
        Row: {
          avg_engagement_rate: number | null
          created_at: string | null
          description: string | null
          group_ids: string[]
          id: string
          is_active: boolean | null
          is_system: boolean | null
          last_used_at: string | null
          name: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          created_at?: string | null
          description?: string | null
          group_ids?: string[]
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          name: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          avg_engagement_rate?: number | null
          created_at?: string | null
          description?: string | null
          group_ids?: string[]
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          name?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      highlight_stories: {
        Row: {
          added_at: string | null
          added_reason: string | null
          added_rule_match: Json | null
          display_order: number | null
          expires_at: string | null
          highlight_id: string | null
          id: string
          story_post_id: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_reason?: string | null
          added_rule_match?: Json | null
          display_order?: number | null
          expires_at?: string | null
          highlight_id?: string | null
          id?: string
          story_post_id?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_reason?: string | null
          added_rule_match?: Json | null
          display_order?: number | null
          expires_at?: string | null
          highlight_id?: string | null
          id?: string
          story_post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "highlight_stories_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_stories_story_post_id_fkey"
            columns: ["story_post_id"]
            isOneToOne: false
            referencedRelation: "instagram_scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      highlight_templates: {
        Row: {
          default_rules: Json | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          suggested_cover: string | null
        }
        Insert: {
          default_rules?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          suggested_cover?: string | null
        }
        Update: {
          default_rules?: Json | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          suggested_cover?: string | null
        }
        Relationships: []
      }
      hook_usage: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          hook_id: string
          id: string
          post_id: string | null
          used_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          hook_id: string
          id?: string
          post_id?: string | null
          used_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          hook_id?: string
          id?: string
          post_id?: string | null
          used_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hook_usage_hook_id_fkey"
            columns: ["hook_id"]
            isOneToOne: false
            referencedRelation: "video_hooks"
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
      instagram_account_metrics: {
        Row: {
          followers_count: number | null
          followers_gained: number | null
          followers_lost: number | null
          following_count: number | null
          id: string
          media_count: number | null
          metrics_date: string
          profile_views: number | null
          synced_at: string
          user_id: string
          website_clicks: number | null
        }
        Insert: {
          followers_count?: number | null
          followers_gained?: number | null
          followers_lost?: number | null
          following_count?: number | null
          id?: string
          media_count?: number | null
          metrics_date: string
          profile_views?: number | null
          synced_at?: string
          user_id: string
          website_clicks?: number | null
        }
        Update: {
          followers_count?: number | null
          followers_gained?: number | null
          followers_lost?: number | null
          following_count?: number | null
          id?: string
          media_count?: number | null
          metrics_date?: string
          profile_views?: number | null
          synced_at?: string
          user_id?: string
          website_clicks?: number | null
        }
        Relationships: []
      }
      instagram_activity_log: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_connections: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          facebook_page_id: string
          id: string
          instagram_account_id: string
          instagram_username: string | null
          is_active: boolean | null
          last_validated_at: string | null
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          facebook_page_id: string
          id?: string
          instagram_account_id: string
          instagram_username?: string | null
          is_active?: boolean | null
          last_validated_at?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          facebook_page_id?: string
          id?: string
          instagram_account_id?: string
          instagram_username?: string | null
          is_active?: boolean | null
          last_validated_at?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_hashtag_performance: {
        Row: {
          avg_engagement_rate: number | null
          avg_reach: number | null
          id: string
          rotation_set_id: string | null
          times_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          id?: string
          rotation_set_id?: string | null
          times_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          id?: string
          rotation_set_id?: string | null
          times_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_hashtag_performance_rotation_set_id_fkey"
            columns: ["rotation_set_id"]
            isOneToOne: false
            referencedRelation: "hashtag_rotation_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_notification_preferences: {
        Row: {
          digest_time: string | null
          email_digest_enabled: boolean | null
          email_enabled: boolean | null
          email_on_failure: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          digest_time?: string | null
          email_digest_enabled?: boolean | null
          email_enabled?: boolean | null
          email_on_failure?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          digest_time?: string | null
          email_digest_enabled?: boolean | null
          email_enabled?: boolean | null
          email_on_failure?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_optimal_times: {
        Row: {
          avg_engagement_rate: number | null
          day_of_week: number
          hour: number
          id: string
          post_count: number | null
          rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_engagement_rate?: number | null
          day_of_week: number
          hour: number
          id?: string
          post_count?: number | null
          rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_engagement_rate?: number | null
          day_of_week?: number
          hour?: number
          id?: string
          post_count?: number | null
          rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_post_metrics: {
        Row: {
          comments: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          instagram_media_id: string | null
          likes: number | null
          metrics_date: string
          plays: number | null
          post_id: string
          reach: number | null
          saves: number | null
          shares: number | null
          synced_at: string
          user_id: string
        }
        Insert: {
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          instagram_media_id?: string | null
          likes?: number | null
          metrics_date: string
          plays?: number | null
          post_id: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          synced_at?: string
          user_id: string
        }
        Update: {
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          instagram_media_id?: string | null
          likes?: number | null
          metrics_date?: string
          plays?: number | null
          post_id?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instagram_scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_rate_limits: {
        Row: {
          count: number | null
          id: string
          limit_type: string
          max_limit: number
          user_id: string
          window_duration_hours: number | null
          window_start: string
        }
        Insert: {
          count?: number | null
          id?: string
          limit_type: string
          max_limit: number
          user_id: string
          window_duration_hours?: number | null
          window_start?: string
        }
        Update: {
          count?: number | null
          id?: string
          limit_type?: string
          max_limit?: number
          user_id?: string
          window_duration_hours?: number | null
          window_start?: string
        }
        Relationships: []
      }
      instagram_scheduled_posts: {
        Row: {
          additional_assets: string[] | null
          alt_text: string | null
          campaign_tag: string | null
          caption: string
          content_pillar: string
          created_at: string | null
          crosspost_to_facebook: boolean | null
          error_message: string | null
          facebook_media_id: string | null
          hashtags: string[] | null
          id: string
          include_shopping_tag: boolean | null
          instagram_media_id: string | null
          last_retry_at: string | null
          location_id: string | null
          location_name: string | null
          post_type: string
          primary_asset_id: string | null
          product_id: string | null
          published_at: string | null
          quote_id: string | null
          requires_review: boolean | null
          retry_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_at: string
          selected_thumbnail_id: string | null
          status: string | null
          template_id: string | null
          thumbnail_asset_id: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          video_asset_id: string | null
        }
        Insert: {
          additional_assets?: string[] | null
          alt_text?: string | null
          campaign_tag?: string | null
          caption: string
          content_pillar: string
          created_at?: string | null
          crosspost_to_facebook?: boolean | null
          error_message?: string | null
          facebook_media_id?: string | null
          hashtags?: string[] | null
          id?: string
          include_shopping_tag?: boolean | null
          instagram_media_id?: string | null
          last_retry_at?: string | null
          location_id?: string | null
          location_name?: string | null
          post_type: string
          primary_asset_id?: string | null
          product_id?: string | null
          published_at?: string | null
          quote_id?: string | null
          requires_review?: boolean | null
          retry_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at: string
          selected_thumbnail_id?: string | null
          status?: string | null
          template_id?: string | null
          thumbnail_asset_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          video_asset_id?: string | null
        }
        Update: {
          additional_assets?: string[] | null
          alt_text?: string | null
          campaign_tag?: string | null
          caption?: string
          content_pillar?: string
          created_at?: string | null
          crosspost_to_facebook?: boolean | null
          error_message?: string | null
          facebook_media_id?: string | null
          hashtags?: string[] | null
          id?: string
          include_shopping_tag?: boolean | null
          instagram_media_id?: string | null
          last_retry_at?: string | null
          location_id?: string | null
          location_name?: string | null
          post_type?: string
          primary_asset_id?: string | null
          product_id?: string | null
          published_at?: string | null
          quote_id?: string | null
          requires_review?: boolean | null
          retry_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string
          selected_thumbnail_id?: string | null
          status?: string | null
          template_id?: string | null
          thumbnail_asset_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          video_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_scheduled_posts_primary_asset_id_fkey"
            columns: ["primary_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_selected_thumbnail_id_fkey"
            columns: ["selected_thumbnail_id"]
            isOneToOne: false
            referencedRelation: "video_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instagram_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_performance"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_scheduled_posts_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_stories: {
        Row: {
          asset_id: string | null
          caption_overlay: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          instagram_media_id: string | null
          poll_options: string[] | null
          poll_question: string | null
          posted_at: string | null
          quote_id: string | null
          schedule_type: string | null
          scheduled_at: string | null
          status: string | null
          story_type: string | null
          target_time_slot: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          caption_overlay?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          instagram_media_id?: string | null
          poll_options?: string[] | null
          poll_question?: string | null
          posted_at?: string | null
          quote_id?: string | null
          schedule_type?: string | null
          scheduled_at?: string | null
          status?: string | null
          story_type?: string | null
          target_time_slot?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string | null
          caption_overlay?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          instagram_media_id?: string | null
          poll_options?: string[] | null
          poll_question?: string | null
          posted_at?: string | null
          quote_id?: string | null
          schedule_type?: string | null
          scheduled_at?: string | null
          status?: string | null
          story_type?: string | null
          target_time_slot?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_stories_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_stories_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_stories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "story_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_template_performance: {
        Row: {
          avg_engagement_rate: number | null
          avg_reach: number | null
          avg_saves: number | null
          best_engagement_rate: number | null
          id: string
          template_id: string
          times_used: number | null
          total_impressions: number | null
          updated_at: string
          user_id: string
          worst_engagement_rate: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          avg_saves?: number | null
          best_engagement_rate?: number | null
          id?: string
          template_id: string
          times_used?: number | null
          total_impressions?: number | null
          updated_at?: string
          user_id: string
          worst_engagement_rate?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          avg_reach?: number | null
          avg_saves?: number | null
          best_engagement_rate?: number | null
          id?: string
          template_id?: string
          times_used?: number | null
          total_impressions?: number | null
          updated_at?: string
          user_id?: string
          worst_engagement_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_template_performance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instagram_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_template_performance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_performance"
            referencedColumns: ["template_id"]
          },
        ]
      }
      instagram_templates: {
        Row: {
          audio_mood: string | null
          avg_engagement_rate: number | null
          caption_formula: string | null
          caption_template: string
          carousel_type: string | null
          collection: string | null
          content_pillar: string
          created_at: string | null
          estimated_engagement_multiplier: number | null
          hashtag_group_ids: string[] | null
          hashtags_in_caption: boolean | null
          hook_text: string | null
          id: string
          include_shopping_tag: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          is_system: boolean | null
          name: string
          preferred_days: number[] | null
          reel_type: string | null
          shot_list: string[] | null
          slide_count: number | null
          slides: Json | null
          suggested_duration_seconds: number | null
          template_type: string
          text_overlays: Json | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          audio_mood?: string | null
          avg_engagement_rate?: number | null
          caption_formula?: string | null
          caption_template: string
          carousel_type?: string | null
          collection?: string | null
          content_pillar: string
          created_at?: string | null
          estimated_engagement_multiplier?: number | null
          hashtag_group_ids?: string[] | null
          hashtags_in_caption?: boolean | null
          hook_text?: string | null
          id?: string
          include_shopping_tag?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          name: string
          preferred_days?: number[] | null
          reel_type?: string | null
          shot_list?: string[] | null
          slide_count?: number | null
          slides?: Json | null
          suggested_duration_seconds?: number | null
          template_type: string
          text_overlays?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          audio_mood?: string | null
          avg_engagement_rate?: number | null
          caption_formula?: string | null
          caption_template?: string
          carousel_type?: string | null
          collection?: string | null
          content_pillar?: string
          created_at?: string | null
          estimated_engagement_multiplier?: number | null
          hashtag_group_ids?: string[] | null
          hashtags_in_caption?: boolean | null
          hook_text?: string | null
          id?: string
          include_shopping_tag?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          name?: string
          preferred_days?: number[] | null
          reel_type?: string | null
          shot_list?: string[] | null
          slide_count?: number | null
          slides?: Json | null
          suggested_duration_seconds?: number | null
          template_type?: string
          text_overlays?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
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
          is_default: boolean | null
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
          is_default?: boolean | null
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
          is_default?: boolean | null
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
      monthly_theme_templates: {
        Row: {
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          kpis: Json | null
          month_number: number
          theme_name: string
          week_themes: Json | null
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpis?: Json | null
          month_number: number
          theme_name: string
          week_themes?: Json | null
        }
        Update: {
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpis?: Json | null
          month_number?: number
          theme_name?: string
          week_themes?: Json | null
        }
        Relationships: []
      }
      monthly_themes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          kpis: Json | null
          month_number: number
          theme_name: string
          updated_at: string | null
          user_id: string | null
          week_themes: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kpis?: Json | null
          month_number: number
          theme_name: string
          updated_at?: string | null
          user_id?: string | null
          week_themes?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kpis?: Json | null
          month_number?: number
          theme_name?: string
          updated_at?: string | null
          user_id?: string | null
          week_themes?: Json | null
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          artist: string | null
          bpm: number | null
          collection: string
          created_at: string | null
          duration_seconds: number | null
          file_url: string
          genre: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          license_expires_at: string | null
          license_type: string | null
          mood_tags: string[] | null
          notes: string | null
          source: string
          source_id: string | null
          source_url: string
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          artist?: string | null
          bpm?: number | null
          collection: string
          created_at?: string | null
          duration_seconds?: number | null
          file_url: string
          genre?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          license_expires_at?: string | null
          license_type?: string | null
          mood_tags?: string[] | null
          notes?: string | null
          source?: string
          source_id?: string | null
          source_url: string
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          artist?: string | null
          bpm?: number | null
          collection?: string
          created_at?: string | null
          duration_seconds?: number | null
          file_url?: string
          genre?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          license_expires_at?: string | null
          license_type?: string | null
          mood_tags?: string[] | null
          notes?: string | null
          source?: string
          source_id?: string | null
          source_url?: string
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      performance_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          metrics_snapshot: Json
          new_value: Json | null
          previous_value: Json | null
          rejection_reason: string | null
          requires_approval: boolean | null
          rule_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metrics_snapshot: Json
          new_value?: Json | null
          previous_value?: Json | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          rule_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          metrics_snapshot?: Json
          new_value?: Json | null
          previous_value?: Json | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          rule_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "performance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_alert_rules: {
        Row: {
          alert_type: string
          create_task: boolean
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          metric: string
          name: string
          operator: string
          send_email: boolean
          send_push: boolean
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          create_task?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric: string
          name: string
          operator: string
          send_email?: boolean
          send_push?: boolean
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          create_task?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric?: string
          name?: string
          operator?: string
          send_email?: boolean
          send_push?: boolean
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          reference_table: string | null
          rule_id: string | null
          sent_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_table?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_table?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "performance_alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          applies_to: string | null
          campaign_ids: string[] | null
          comparison: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metric: string
          min_conversions: number | null
          min_days_active: number | null
          min_spend: number | null
          name: string
          priority: number | null
          threshold_max: number | null
          threshold_min: number | null
          threshold_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          applies_to?: string | null
          campaign_ids?: string[] | null
          comparison: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric: string
          min_conversions?: number | null
          min_days_active?: number | null
          min_spend?: number | null
          name: string
          priority?: number | null
          threshold_max?: number | null
          threshold_min?: number | null
          threshold_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          applies_to?: string | null
          campaign_ids?: string[] | null
          comparison?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric?: string
          min_conversions?: number | null
          min_days_active?: number | null
          min_spend?: number | null
          name?: string
          priority?: number | null
          threshold_max?: number | null
          threshold_min?: number | null
          threshold_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_targets: {
        Row: {
          created_at: string | null
          engagement_rate_good: number | null
          engagement_rate_target: number | null
          id: string
          ig_sales_percent_target: number | null
          link_clicks_rate_target: number | null
          monthly_follower_growth_good: number | null
          monthly_follower_growth_min: number | null
          monthly_quiz_clicks_target: number | null
          saves_rate_target: number | null
          shares_rate_target: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          engagement_rate_good?: number | null
          engagement_rate_target?: number | null
          id?: string
          ig_sales_percent_target?: number | null
          link_clicks_rate_target?: number | null
          monthly_follower_growth_good?: number | null
          monthly_follower_growth_min?: number | null
          monthly_quiz_clicks_target?: number | null
          saves_rate_target?: number | null
          shares_rate_target?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          engagement_rate_good?: number | null
          engagement_rate_target?: number | null
          id?: string
          ig_sales_percent_target?: number | null
          link_clicks_rate_target?: number | null
          monthly_follower_growth_good?: number | null
          monthly_follower_growth_min?: number | null
          monthly_quiz_clicks_target?: number | null
          saves_rate_target?: number | null
          shares_rate_target?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pin_analytics_daily: {
        Row: {
          clicks: number
          created_at: string
          date: string
          engagement_rate: number | null
          id: string
          impressions: number
          outbound_clicks: number
          pin_id: string
          saves: number
          user_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          date: string
          engagement_rate?: number | null
          id?: string
          impressions?: number
          outbound_clicks?: number
          pin_id: string
          saves?: number
          user_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          date?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number
          outbound_clicks?: number
          pin_id?: string
          saves?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_analytics_daily_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
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
      pin_schedule_history: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          pin_id: string
          result: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pin_id: string
          result: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pin_id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_schedule_history_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
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
      pin_winners: {
        Row: {
          calculated_at: string
          collection: string | null
          created_at: string
          id: string
          metrics: Json
          pin_id: string
          rank: number
          score: number
          user_id: string
        }
        Insert: {
          calculated_at?: string
          collection?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          pin_id: string
          rank: number
          score: number
          user_id: string
        }
        Update: {
          calculated_at?: string
          collection?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          pin_id?: string
          rank?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_winners_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pins"
            referencedColumns: ["id"]
          },
        ]
      }
      pins: {
        Row: {
          alt_text: string | null
          asset_id: string | null
          board_id: string | null
          clicks: number
          collection: string | null
          content_pillar: string | null
          copy_template_id: string | null
          copy_variant: string | null
          created_at: string
          description: string | null
          engagement_rate: number | null
          id: string
          image_url: string
          impressions: number
          is_winner: boolean
          last_error: string | null
          last_metrics_sync: string | null
          link: string | null
          mockup_id: string | null
          mood: string | null
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
          tracked_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          asset_id?: string | null
          board_id?: string | null
          clicks?: number
          collection?: string | null
          content_pillar?: string | null
          copy_template_id?: string | null
          copy_variant?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url: string
          impressions?: number
          is_winner?: boolean
          last_error?: string | null
          last_metrics_sync?: string | null
          link?: string | null
          mockup_id?: string | null
          mood?: string | null
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
          tracked_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          asset_id?: string | null
          board_id?: string | null
          clicks?: number
          collection?: string | null
          content_pillar?: string | null
          copy_template_id?: string | null
          copy_variant?: string | null
          created_at?: string
          description?: string | null
          engagement_rate?: number | null
          id?: string
          image_url?: string
          impressions?: number
          is_winner?: boolean
          last_error?: string | null
          last_metrics_sync?: string | null
          link?: string | null
          mockup_id?: string | null
          mood?: string | null
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
          tracked_link?: string | null
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
            foreignKeyName: "pins_content_pillar_fkey"
            columns: ["content_pillar"]
            isOneToOne: false
            referencedRelation: "content_pillars"
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
      pinterest_conversion_events: {
        Row: {
          action_source: string
          click_id: string | null
          content_category: string | null
          content_ids: string[] | null
          content_name: string | null
          created_at: string
          currency: string | null
          email_hash: string | null
          error: string | null
          event_id: string
          event_name: string
          event_time: string
          external_id: string | null
          id: string
          num_items: number | null
          order_id: string | null
          partner_name: string | null
          phone_hash: string | null
          pinterest_response: Json | null
          sent_at: string | null
          sent_to_pinterest: boolean
          user_id: string
          value: number | null
        }
        Insert: {
          action_source?: string
          click_id?: string | null
          content_category?: string | null
          content_ids?: string[] | null
          content_name?: string | null
          created_at?: string
          currency?: string | null
          email_hash?: string | null
          error?: string | null
          event_id: string
          event_name: string
          event_time?: string
          external_id?: string | null
          id?: string
          num_items?: number | null
          order_id?: string | null
          partner_name?: string | null
          phone_hash?: string | null
          pinterest_response?: Json | null
          sent_at?: string | null
          sent_to_pinterest?: boolean
          user_id: string
          value?: number | null
        }
        Update: {
          action_source?: string
          click_id?: string | null
          content_category?: string | null
          content_ids?: string[] | null
          content_name?: string | null
          created_at?: string
          currency?: string | null
          email_hash?: string | null
          error?: string | null
          event_id?: string
          event_name?: string
          event_time?: string
          external_id?: string | null
          id?: string
          num_items?: number | null
          order_id?: string | null
          partner_name?: string | null
          phone_hash?: string | null
          pinterest_response?: Json | null
          sent_at?: string | null
          sent_to_pinterest?: boolean
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token_encrypted: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          id: string
          last_error: string | null
          last_error_at: string | null
          last_sync_at: string | null
          platform: string
          refresh_token_encrypted: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_sync_at?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
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
      post_quiz_engagement_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          day_number: number
          id: string
          instagram_handle: string
          notes: string | null
          quiz_engagement_id: string | null
          scheduled_for: string
          status: string | null
          task_type: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          day_number: number
          id?: string
          instagram_handle: string
          notes?: string | null
          quiz_engagement_id?: string | null
          scheduled_for: string
          status?: string | null
          task_type: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          day_number?: number
          id?: string
          instagram_handle?: string
          notes?: string | null
          quiz_engagement_id?: string | null
          scheduled_for?: string
          status?: string | null
          task_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_quiz_engagement_tasks_quiz_engagement_id_fkey"
            columns: ["quiz_engagement_id"]
            isOneToOne: false
            referencedRelation: "quiz_instagram_engagement"
            referencedColumns: ["id"]
          },
        ]
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
      quiz_instagram_engagement: {
        Row: {
          commented_at: string | null
          created_at: string | null
          email: string | null
          engaged_at: string | null
          engagement_status: string | null
          followed_at: string | null
          has_purchased: boolean | null
          id: string
          instagram_handle: string | null
          is_public_account: boolean | null
          notes: string | null
          order_id: string | null
          purchased_at: string | null
          quiz_completion_id: string | null
          ugc_received_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commented_at?: string | null
          created_at?: string | null
          email?: string | null
          engaged_at?: string | null
          engagement_status?: string | null
          followed_at?: string | null
          has_purchased?: boolean | null
          id?: string
          instagram_handle?: string | null
          is_public_account?: boolean | null
          notes?: string | null
          order_id?: string | null
          purchased_at?: string | null
          quiz_completion_id?: string | null
          ugc_received_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commented_at?: string | null
          created_at?: string | null
          email?: string | null
          engaged_at?: string | null
          engagement_status?: string | null
          followed_at?: string | null
          has_purchased?: boolean | null
          id?: string
          instagram_handle?: string | null
          is_public_account?: boolean | null
          notes?: string | null
          order_id?: string | null
          purchased_at?: string | null
          quiz_completion_id?: string | null
          ugc_received_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          master_image_key: string | null
          master_image_url: string | null
          mood: string
          product_id: string | null
          product_link: string | null
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
          master_image_key?: string | null
          master_image_url?: string | null
          mood: string
          product_id?: string | null
          product_link?: string | null
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
          master_image_key?: string | null
          master_image_url?: string | null
          mood?: string
          product_id?: string | null
          product_link?: string | null
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
        Relationships: [
          {
            foreignKeyName: "quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      rhythm_task_completions: {
        Row: {
          completed_at: string
          completed_date: string
          id: string
          notes: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_date: string
          id?: string
          notes?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completed_date?: string
          id?: string
          notes?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "rhythm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_tasks: {
        Row: {
          category: string
          created_at: string
          day_of_week: number
          frequency: string | null
          id: string
          is_active: boolean
          is_recurring: boolean
          sort_order: number
          task_description: string | null
          task_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          day_of_week: number
          frequency?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          sort_order?: number
          task_description?: string | null
          task_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          day_of_week?: number
          frequency?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          sort_order?: number
          task_description?: string | null
          task_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scaling_kpi_snapshots: {
        Row: {
          ad_clicks: number | null
          ad_conversions: number | null
          ad_impressions: number | null
          ad_revenue: number | null
          ad_roas: number | null
          ad_spend: number | null
          boards_active: number
          clicks: number
          created_at: string
          engagement_rate: number | null
          goals_met: Json
          id: string
          impressions: number
          organic_traffic: number | null
          overall_score: number | null
          phase: number
          pins_published: number
          products_mockuped: number
          saves: number
          snapshot_date: string
          total_conversions: number | null
          total_revenue: number | null
          user_id: string
          week_number: number
        }
        Insert: {
          ad_clicks?: number | null
          ad_conversions?: number | null
          ad_impressions?: number | null
          ad_revenue?: number | null
          ad_roas?: number | null
          ad_spend?: number | null
          boards_active?: number
          clicks?: number
          created_at?: string
          engagement_rate?: number | null
          goals_met?: Json
          id?: string
          impressions?: number
          organic_traffic?: number | null
          overall_score?: number | null
          phase: number
          pins_published?: number
          products_mockuped?: number
          saves?: number
          snapshot_date: string
          total_conversions?: number | null
          total_revenue?: number | null
          user_id: string
          week_number: number
        }
        Update: {
          ad_clicks?: number | null
          ad_conversions?: number | null
          ad_impressions?: number | null
          ad_revenue?: number | null
          ad_roas?: number | null
          ad_spend?: number | null
          boards_active?: number
          clicks?: number
          created_at?: string
          engagement_rate?: number | null
          goals_met?: Json
          id?: string
          impressions?: number
          organic_traffic?: number | null
          overall_score?: number | null
          phase?: number
          pins_published?: number
          products_mockuped?: number
          saves?: number
          snapshot_date?: string
          total_conversions?: number | null
          total_revenue?: number | null
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      scaling_playbook_progress: {
        Row: {
          created_at: string
          current_phase: number
          current_week: number
          id: string
          notes: string | null
          phase_started_at: string
          phase_targets: Json
          playbook_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: number
          current_week?: number
          id?: string
          notes?: string | null
          phase_started_at?: string
          phase_targets?: Json
          playbook_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: number
          current_week?: number
          id?: string
          notes?: string | null
          phase_started_at?: string
          phase_targets?: Json
          playbook_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      shopify_orders: {
        Row: {
          attributed_pin_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          email: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          landing_page: string | null
          line_items: Json | null
          referring_site: string | null
          shopify_created_at: string | null
          shopify_order_id: string
          shopify_order_number: string | null
          shopify_updated_at: string | null
          subtotal_price: number | null
          total_discounts: number | null
          total_price: number | null
          total_tax: number | null
          updated_at: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          attributed_pin_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          landing_page?: string | null
          line_items?: Json | null
          referring_site?: string | null
          shopify_created_at?: string | null
          shopify_order_id: string
          shopify_order_number?: string | null
          shopify_updated_at?: string | null
          subtotal_price?: number | null
          total_discounts?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          attributed_pin_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          landing_page?: string | null
          line_items?: Json | null
          referring_site?: string | null
          shopify_created_at?: string | null
          shopify_order_id?: string
          shopify_order_number?: string | null
          shopify_updated_at?: string | null
          subtotal_price?: number | null
          total_discounts?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_webhook_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          shop_domain: string
          shopify_id: string | null
          topic: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          shop_domain: string
          shopify_id?: string | null
          topic: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          shop_domain?: string
          shopify_id?: string | null
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shopify_webhooks: {
        Row: {
          address: string
          created_at: string
          id: string
          last_received_at: string | null
          receive_count: number | null
          shopify_webhook_id: string
          topic: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          last_received_at?: string | null
          receive_count?: number | null
          shopify_webhook_id: string
          topic: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          last_received_at?: string | null
          receive_count?: number | null
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
      stock_footage: {
        Row: {
          aspect_ratio: string | null
          collection: string
          created_at: string | null
          duration_seconds: number | null
          height: number | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          mood_tags: string[] | null
          notes: string | null
          orientation: string | null
          source: string
          source_id: string | null
          source_url: string
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
          video_url: string
          width: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          collection: string
          created_at?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          mood_tags?: string[] | null
          notes?: string | null
          orientation?: string | null
          source?: string
          source_id?: string | null
          source_url: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
          video_url: string
          width?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          collection?: string
          created_at?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          mood_tags?: string[] | null
          notes?: string | null
          orientation?: string | null
          source?: string
          source_id?: string | null
          source_url?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
          video_url?: string
          width?: number | null
        }
        Relationships: []
      }
      story_highlights: {
        Row: {
          auto_add_enabled: boolean | null
          auto_add_rules: Json | null
          cover_asset_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          expiration_days: number | null
          id: string
          is_active: boolean | null
          max_stories: number | null
          name: string
          slug: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_add_enabled?: boolean | null
          auto_add_rules?: Json | null
          cover_asset_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expiration_days?: number | null
          id?: string
          is_active?: boolean | null
          max_stories?: number | null
          name: string
          slug: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_add_enabled?: boolean | null
          auto_add_rules?: Json | null
          cover_asset_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          expiration_days?: number | null
          id?: string
          is_active?: boolean | null
          max_stories?: number | null
          name?: string
          slug?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_highlights_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      story_templates: {
        Row: {
          background_type: string | null
          created_at: string | null
          elements: Json | null
          id: string
          is_active: boolean | null
          is_sequence: boolean | null
          is_system: boolean | null
          link_label: string | null
          link_url: string | null
          name: string
          rotation_group: string | null
          rotation_position: number | null
          schedule_slot: string | null
          sequence_count: number | null
          story_type: string | null
          text_overlay_template: string | null
          text_position: string | null
          user_id: string | null
        }
        Insert: {
          background_type?: string | null
          created_at?: string | null
          elements?: Json | null
          id?: string
          is_active?: boolean | null
          is_sequence?: boolean | null
          is_system?: boolean | null
          link_label?: string | null
          link_url?: string | null
          name: string
          rotation_group?: string | null
          rotation_position?: number | null
          schedule_slot?: string | null
          sequence_count?: number | null
          story_type?: string | null
          text_overlay_template?: string | null
          text_position?: string | null
          user_id?: string | null
        }
        Update: {
          background_type?: string | null
          created_at?: string | null
          elements?: Json | null
          id?: string
          is_active?: boolean | null
          is_sequence?: boolean | null
          is_system?: boolean | null
          link_label?: string | null
          link_url?: string | null
          name?: string
          rotation_group?: string | null
          rotation_position?: number | null
          schedule_slot?: string | null
          sequence_count?: number | null
          story_type?: string | null
          text_overlay_template?: string | null
          text_position?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      template_usage_log: {
        Row: {
          id: string
          metrics_snapshot: Json | null
          post_id: string | null
          post_type: string | null
          template_id: string | null
          template_name: string | null
          template_type: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          metrics_snapshot?: Json | null
          post_id?: string | null
          post_type?: string | null
          template_id?: string | null
          template_name?: string | null
          template_type?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          metrics_snapshot?: Json | null
          post_id?: string | null
          post_type?: string | null
          template_id?: string | null
          template_name?: string | null
          template_type?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_usage_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instagram_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usage_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_performance"
            referencedColumns: ["template_id"]
          },
        ]
      }
      template_winners: {
        Row: {
          created_at: string | null
          id: string
          metrics: Json | null
          performance_score: number | null
          period_end: string
          period_start: string
          period_type: string | null
          repeated: boolean | null
          repeated_at: string | null
          template_id: string | null
          user_id: string | null
          win_category: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metrics?: Json | null
          performance_score?: number | null
          period_end: string
          period_start: string
          period_type?: string | null
          repeated?: boolean | null
          repeated_at?: string | null
          template_id?: string | null
          user_id?: string | null
          win_category: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metrics?: Json | null
          performance_score?: number | null
          period_end?: string
          period_start?: string
          period_type?: string | null
          repeated?: boolean | null
          repeated_at?: string | null
          template_id?: string | null
          user_id?: string | null
          win_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_winners_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "instagram_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_winners_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_performance"
            referencedColumns: ["template_id"]
          },
        ]
      }
      tiktok_attribution: {
        Row: {
          added_to_cart: boolean | null
          checkout_started: boolean | null
          content_pillar: string | null
          created_at: string | null
          email_address: string | null
          email_captured: boolean | null
          id: string
          landed_at: string | null
          landing_page: string | null
          order_id: string | null
          order_value: number | null
          pages_viewed: string[] | null
          products_purchased: string[] | null
          purchase_made: boolean | null
          quiz_completed: boolean | null
          quiz_started: boolean | null
          referrer: string | null
          session_id: string
          tiktok_post_id: string | null
          time_on_site: number | null
          updated_at: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          added_to_cart?: boolean | null
          checkout_started?: boolean | null
          content_pillar?: string | null
          created_at?: string | null
          email_address?: string | null
          email_captured?: boolean | null
          id?: string
          landed_at?: string | null
          landing_page?: string | null
          order_id?: string | null
          order_value?: number | null
          pages_viewed?: string[] | null
          products_purchased?: string[] | null
          purchase_made?: boolean | null
          quiz_completed?: boolean | null
          quiz_started?: boolean | null
          referrer?: string | null
          session_id: string
          tiktok_post_id?: string | null
          time_on_site?: number | null
          updated_at?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          added_to_cart?: boolean | null
          checkout_started?: boolean | null
          content_pillar?: string | null
          created_at?: string | null
          email_address?: string | null
          email_captured?: boolean | null
          id?: string
          landed_at?: string | null
          landing_page?: string | null
          order_id?: string | null
          order_value?: number | null
          pages_viewed?: string[] | null
          products_purchased?: string[] | null
          purchase_made?: boolean | null
          quiz_completed?: boolean | null
          quiz_started?: boolean | null
          referrer?: string | null
          session_id?: string
          tiktok_post_id?: string | null
          time_on_site?: number | null
          updated_at?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_attribution_tiktok_post_id_fkey"
            columns: ["tiktok_post_id"]
            isOneToOne: false
            referencedRelation: "tiktok_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_caption_templates: {
        Row: {
          content_pillar: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          max_length: number | null
          name: string
          platform: string | null
          template_text: string
          tone: string | null
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          content_pillar: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_length?: number | null
          name: string
          platform?: string | null
          template_text: string
          tone?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          content_pillar?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_length?: number | null
          name?: string
          platform?: string | null
          template_text?: string
          tone?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      tiktok_filming_batches: {
        Row: {
          batch_name: string
          completed_at: string | null
          created_at: string | null
          equipment_needed: string[] | null
          id: string
          lighting_tips: string | null
          setup_notes: string | null
          status: string | null
          target_count: number | null
          updated_at: string | null
          user_id: string
          videos_filmed: number | null
          week_of: string
        }
        Insert: {
          batch_name: string
          completed_at?: string | null
          created_at?: string | null
          equipment_needed?: string[] | null
          id?: string
          lighting_tips?: string | null
          setup_notes?: string | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
          user_id: string
          videos_filmed?: number | null
          week_of: string
        }
        Update: {
          batch_name?: string
          completed_at?: string | null
          created_at?: string | null
          equipment_needed?: string[] | null
          id?: string
          lighting_tips?: string | null
          setup_notes?: string | null
          status?: string | null
          target_count?: number | null
          updated_at?: string | null
          user_id?: string
          videos_filmed?: number | null
          week_of?: string
        }
        Relationships: []
      }
      tiktok_growth_benchmarks: {
        Row: {
          created_at: string | null
          id: string
          max_avg_views: number
          min_avg_views: number
          month_number: number
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_avg_views: number
          min_avg_views: number
          month_number: number
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_avg_views?: number
          min_avg_views?: number
          month_number?: number
          notes?: string | null
        }
        Relationships: []
      }
      tiktok_hashtag_groups: {
        Row: {
          category: string
          collection_affinity: string[] | null
          content_type_affinity: string[] | null
          created_at: string | null
          hashtags: string[]
          id: string
          is_active: boolean | null
          tier: string
        }
        Insert: {
          category: string
          collection_affinity?: string[] | null
          content_type_affinity?: string[] | null
          created_at?: string | null
          hashtags: string[]
          id?: string
          is_active?: boolean | null
          tier: string
        }
        Update: {
          category?: string
          collection_affinity?: string[] | null
          content_type_affinity?: string[] | null
          created_at?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean | null
          tier?: string
        }
        Relationships: []
      }
      tiktok_hashtag_usage: {
        Row: {
          group_ids: string[] | null
          hashtags: string[]
          id: string
          post_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          group_ids?: string[] | null
          hashtags: string[]
          id?: string
          post_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          group_ids?: string[] | null
          hashtags?: string[]
          id?: string
          post_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tiktok_post_metrics: {
        Row: {
          avg_watch_time_seconds: number | null
          comments: number | null
          completion_rate: number | null
          created_at: string | null
          engagement_rate: number | null
          id: string
          is_final: boolean | null
          likes: number | null
          link_clicks: number | null
          post_id: string
          profile_visits: number | null
          recorded_at: string | null
          saves: number | null
          shares: number | null
          source: string | null
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          avg_watch_time_seconds?: number | null
          comments?: number | null
          completion_rate?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          is_final?: boolean | null
          likes?: number | null
          link_clicks?: number | null
          post_id: string
          profile_visits?: number | null
          recorded_at?: string | null
          saves?: number | null
          shares?: number | null
          source?: string | null
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          avg_watch_time_seconds?: number | null
          comments?: number | null
          completion_rate?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          id?: string
          is_final?: boolean | null
          likes?: number | null
          link_clicks?: number | null
          post_id?: string
          profile_visits?: number | null
          recorded_at?: string | null
          saves?: number | null
          shares?: number | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tiktok_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_posting_log: {
        Row: {
          created_at: string | null
          date: string
          evening_posted: boolean | null
          id: string
          morning_posted: boolean | null
          total_posted: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          evening_posted?: boolean | null
          id?: string
          morning_posted?: boolean | null
          total_posted?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          evening_posted?: boolean | null
          id?: string
          morning_posted?: boolean | null
          total_posted?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tiktok_queue: {
        Row: {
          batch_id: string | null
          caption: string
          caption_template_id: string | null
          caption_text: string | null
          collection: string | null
          comments: number | null
          content_pillar: string | null
          content_type: string | null
          created_at: string | null
          downloaded_at: string | null
          duration_seconds: number | null
          filming_notes: string | null
          hashtags: string[] | null
          hook_id: string | null
          hook_text: string | null
          id: string
          likes: number | null
          posted_at: string | null
          published_at: string | null
          quote_id: string | null
          scheduled_at: string | null
          shares: number | null
          slot_type: string | null
          status: string | null
          target_date: string | null
          target_time: string | null
          thumbnail_url: string | null
          tiktok_post_id: string | null
          time_slot: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          video_asset_id: string | null
          views: number | null
        }
        Insert: {
          batch_id?: string | null
          caption: string
          caption_template_id?: string | null
          caption_text?: string | null
          collection?: string | null
          comments?: number | null
          content_pillar?: string | null
          content_type?: string | null
          created_at?: string | null
          downloaded_at?: string | null
          duration_seconds?: number | null
          filming_notes?: string | null
          hashtags?: string[] | null
          hook_id?: string | null
          hook_text?: string | null
          id?: string
          likes?: number | null
          posted_at?: string | null
          published_at?: string | null
          quote_id?: string | null
          scheduled_at?: string | null
          shares?: number | null
          slot_type?: string | null
          status?: string | null
          target_date?: string | null
          target_time?: string | null
          thumbnail_url?: string | null
          tiktok_post_id?: string | null
          time_slot?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          video_asset_id?: string | null
          views?: number | null
        }
        Update: {
          batch_id?: string | null
          caption?: string
          caption_template_id?: string | null
          caption_text?: string | null
          collection?: string | null
          comments?: number | null
          content_pillar?: string | null
          content_type?: string | null
          created_at?: string | null
          downloaded_at?: string | null
          duration_seconds?: number | null
          filming_notes?: string | null
          hashtags?: string[] | null
          hook_id?: string | null
          hook_text?: string | null
          id?: string
          likes?: number | null
          posted_at?: string | null
          published_at?: string | null
          quote_id?: string | null
          scheduled_at?: string | null
          shares?: number | null
          slot_type?: string | null
          status?: string | null
          target_date?: string | null
          target_time?: string | null
          thumbnail_url?: string | null
          tiktok_post_id?: string | null
          time_slot?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          video_asset_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_queue_hook_id_fkey"
            columns: ["hook_id"]
            isOneToOne: false
            referencedRelation: "video_hooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_queue_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_queue_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_time_performance: {
        Row: {
          avg_completion_rate: number | null
          avg_engagement_rate: number | null
          avg_views: number | null
          best_post_id: string | null
          best_views: number | null
          day_of_week: number
          hour_of_day: number
          id: string
          last_updated: string | null
          total_posts: number | null
          total_views: number | null
          user_id: string
        }
        Insert: {
          avg_completion_rate?: number | null
          avg_engagement_rate?: number | null
          avg_views?: number | null
          best_post_id?: string | null
          best_views?: number | null
          day_of_week: number
          hour_of_day: number
          id?: string
          last_updated?: string | null
          total_posts?: number | null
          total_views?: number | null
          user_id: string
        }
        Update: {
          avg_completion_rate?: number | null
          avg_engagement_rate?: number | null
          avg_views?: number | null
          best_post_id?: string | null
          best_views?: number | null
          day_of_week?: number
          hour_of_day?: number
          id?: string
          last_updated?: string | null
          total_posts?: number | null
          total_views?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_time_performance_best_post_id_fkey"
            columns: ["best_post_id"]
            isOneToOne: false
            referencedRelation: "tiktok_queue"
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
      ugc_mentions: {
        Row: {
          content_preview: string | null
          content_type: string | null
          content_url: string | null
          created_at: string | null
          discovered_at: string | null
          expires_at: string | null
          featured_at: string | null
          featured_on: string | null
          id: string
          instagram_handle: string | null
          media_url: string | null
          platform: string | null
          reposted_at: string | null
          source: string
          status: string | null
          thanked_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content_preview?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          discovered_at?: string | null
          expires_at?: string | null
          featured_at?: string | null
          featured_on?: string | null
          id?: string
          instagram_handle?: string | null
          media_url?: string | null
          platform?: string | null
          reposted_at?: string | null
          source: string
          status?: string | null
          thanked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content_preview?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          discovered_at?: string | null
          expires_at?: string | null
          featured_at?: string | null
          featured_on?: string | null
          id?: string
          instagram_handle?: string | null
          media_url?: string | null
          platform?: string | null
          reposted_at?: string | null
          source?: string
          status?: string | null
          thanked_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_campaign_milestones: {
        Row: {
          has_cart_abandoners_audience: boolean | null
          has_pixel_data: boolean | null
          has_purchasers_audience: boolean | null
          has_site_visitors_audience: boolean | null
          id: string
          phase_2_unlocked_at: string | null
          phase_3_unlocked_at: string | null
          total_purchasers: number | null
          total_sales: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          has_cart_abandoners_audience?: boolean | null
          has_pixel_data?: boolean | null
          has_purchasers_audience?: boolean | null
          has_site_visitors_audience?: boolean | null
          id?: string
          phase_2_unlocked_at?: string | null
          phase_3_unlocked_at?: string | null
          total_purchasers?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          has_cart_abandoners_audience?: boolean | null
          has_pixel_data?: boolean | null
          has_purchasers_audience?: boolean | null
          has_site_visitors_audience?: boolean | null
          id?: string
          phase_2_unlocked_at?: string | null
          phase_3_unlocked_at?: string | null
          total_purchasers?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      video_hooks: {
        Row: {
          avg_completion_rate: number | null
          avg_engagement_rate: number | null
          collections: string[] | null
          content_types: string[] | null
          created_at: string | null
          hook_text: string
          hook_type: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          last_used_at: string | null
          platforms: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          avg_completion_rate?: number | null
          avg_engagement_rate?: number | null
          collections?: string[] | null
          content_types?: string[] | null
          created_at?: string | null
          hook_text: string
          hook_type?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          platforms?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          avg_completion_rate?: number | null
          avg_engagement_rate?: number | null
          collections?: string[] | null
          content_types?: string[] | null
          created_at?: string | null
          hook_text?: string
          hook_type?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          last_used_at?: string | null
          platforms?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      video_render_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          estimated_completion_at: string | null
          footage_id: string | null
          hook_id: string | null
          id: string
          metadata: Json | null
          music_id: string | null
          quote_id: string | null
          status: string
          template_id: string | null
          updated_at: string | null
          user_id: string | null
          video_asset_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_completion_at?: string | null
          footage_id?: string | null
          hook_id?: string | null
          id: string
          metadata?: Json | null
          music_id?: string | null
          quote_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_asset_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          estimated_completion_at?: string | null
          footage_id?: string | null
          hook_id?: string | null
          id?: string
          metadata?: Json | null
          music_id?: string | null
          quote_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_render_jobs_footage_id_fkey"
            columns: ["footage_id"]
            isOneToOne: false
            referencedRelation: "stock_footage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_render_jobs_hook_id_fkey"
            columns: ["hook_id"]
            isOneToOne: false
            referencedRelation: "video_hooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_render_jobs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_render_jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_render_jobs_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_templates: {
        Row: {
          avg_completion_rate: number | null
          collections: string[] | null
          content_type: string | null
          created_at: string | null
          creatomate_template_id: string
          description: string | null
          duration_seconds: number | null
          hook_position: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_system: boolean | null
          name: string
          output_formats: string[] | null
          preview_url: string | null
          supports_hook_overlay: boolean | null
          template_style: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          avg_completion_rate?: number | null
          collections?: string[] | null
          content_type?: string | null
          created_at?: string | null
          creatomate_template_id: string
          description?: string | null
          duration_seconds?: number | null
          hook_position?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          name: string
          output_formats?: string[] | null
          preview_url?: string | null
          supports_hook_overlay?: boolean | null
          template_style?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          avg_completion_rate?: number | null
          collections?: string[] | null
          content_type?: string | null
          created_at?: string | null
          creatomate_template_id?: string
          description?: string | null
          duration_seconds?: number | null
          hook_position?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_system?: boolean | null
          name?: string
          output_formats?: string[] | null
          preview_url?: string | null
          supports_hook_overlay?: boolean | null
          template_style?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      video_thumbnails: {
        Row: {
          created_at: string | null
          file_key: string | null
          id: string
          is_selected: boolean | null
          thumbnail_url: string
          timestamp_seconds: number | null
          user_id: string
          video_asset_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_key?: string | null
          id?: string
          is_selected?: boolean | null
          thumbnail_url: string
          timestamp_seconds?: number | null
          user_id: string
          video_asset_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_key?: string | null
          id?: string
          is_selected?: boolean | null
          thumbnail_url?: string
          timestamp_seconds?: number | null
          user_id?: string
          video_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_thumbnails_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
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
      template_performance: {
        Row: {
          avg_comments: number | null
          avg_engagement_rate: number | null
          avg_likes: number | null
          avg_reach: number | null
          avg_saves: number | null
          avg_saves_rate: number | null
          avg_shares: number | null
          collection: string | null
          content_pillar: string | null
          last_used_at: string | null
          performance_score: number | null
          template_id: string | null
          template_name: string | null
          template_type: string | null
          times_used: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_pillar_performance: {
        Args: {
          p_period_start: string
          p_period_type: string
          p_user_id: string
        }
        Returns: undefined
      }
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
      check_pool_health: {
        Args: { p_user_id: string }
        Returns: {
          alert_level: string
          collection: string
          message: string
          pool_type: string
          total_count: number
          unused_count: number
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
      clean_expired_highlight_stories: { Args: never; Returns: number }
      delete_credentials: {
        Args: { p_provider: string; p_user_id: string }
        Returns: undefined
      }
      detect_cross_platform_winners: {
        Args: { p_user_id: string }
        Returns: {
          content_id: string
          engagement_rate: number
          is_new_winner: boolean
          performance_score: number
          platform: string
        }[]
      }
      expire_old_recommendations: { Args: never; Returns: undefined }
      generate_audit_actions: {
        Args: { p_metrics: Json; p_targets: Record<string, unknown> }
        Returns: Json
      }
      generate_daily_engagement_tasks: {
        Args: { p_date?: string; p_user_id: string }
        Returns: number
      }
      generate_gift_code: { Args: never; Returns: string }
      get_ab_test_stats: {
        Args: { p_test_id: string }
        Returns: {
          is_control: boolean
          overall_conversion_rate: number
          overall_ctr: number
          overall_save_rate: number
          total_clicks: number
          total_conversions: number
          total_impressions: number
          total_saves: number
          total_spend: number
          variant_id: string
          variant_name: string
        }[]
      }
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
      get_creative_health_summary: {
        Args: { p_user_id: string }
        Returns: {
          avg_fatigue_score: number
          critical: number
          declining: number
          fatigued: number
          healthy: number
          pending_baseline: number
          refresh_recommended: number
          total_tracked: number
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
      get_cross_platform_summary: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          adapted_to_pinterest: number
          avg_engagement_rate: number
          platform: string
          total_content: number
          total_engagement: number
          total_views: number
          winners_count: number
        }[]
      }
      get_default_mockup_templates: {
        Args: { p_user_id: string }
        Returns: {
          config: Json
          created_at: string
          description: string | null
          dm_template_id: string
          dm_template_url: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          is_system: boolean
          name: string
          preview_url: string | null
          recommended_collections: string[] | null
          scene_key: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mockup_scene_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_effective_mode: {
        Args: { p_module?: string; p_user_id: string }
        Returns: string
      }
      get_footage_pool_health: {
        Args: never
        Returns: {
          active_count: number
          collection: string
          total_count: number
          unused_count: number
        }[]
      }
      get_hashtag_stats: {
        Args: { p_user_id?: string }
        Returns: {
          group_count: number
          tier: string
          total_hashtags: number
          total_usage: number
        }[]
      }
      get_hashtags_by_tier: {
        Args: { p_tier: string }
        Returns: {
          group_name: string
          hashtags: string[]
        }[]
      }
      get_highlight_with_stories: {
        Args: { p_highlight_id: string }
        Returns: {
          added_at: string
          expires_at: string
          highlight_id: string
          highlight_name: string
          story_caption: string
          story_id: string
          story_thumbnail_url: string
        }[]
      }
      get_mockup_automation_settings: {
        Args: { p_user_id: string }
        Returns: {
          auto_generate: boolean
          max_per_quote: number
          notify_on_complete: boolean
          use_defaults: boolean
        }[]
      }
      get_monthly_plan: {
        Args: { p_month_number: number; p_user_id: string }
        Returns: {
          description: string
          kpis: Json
          month_number: number
          theme_name: string
          week_themes: Json
        }[]
      }
      get_music_pool_health: {
        Args: never
        Returns: {
          active_count: number
          collection: string
          total_count: number
          unused_count: number
        }[]
      }
      get_next_pin_slot: {
        Args: { p_after?: string; p_user_id: string }
        Returns: string
      }
      get_next_tiktok_slot: {
        Args: { p_user_id: string }
        Returns: {
          slot_type: string
          target_date: string
        }[]
      }
      get_recommended_rotation_set: {
        Args: { p_collection: string; p_content_pillar: string }
        Returns: string
      }
      get_rotation_set_hashtags: {
        Args: { p_set_id: string }
        Returns: string[]
      }
      get_tiktok_streak: { Args: { p_user_id: string }; Returns: number }
      get_todays_stories: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          schedule_type: string
          scheduled_at: string
          status: string
          story_type: string
          target_time_slot: string
        }[]
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
      get_weekly_pillar_counts: {
        Args: { p_user_id: string; p_week_start: string }
        Returns: {
          count: number
          pillar: string
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
      identify_template_winners: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_period_type?: string
          p_user_id: string
        }
        Returns: {
          created_at: string | null
          id: string
          metrics: Json | null
          performance_score: number | null
          period_end: string
          period_start: string
          period_type: string | null
          repeated: boolean | null
          repeated_at: string | null
          template_id: string | null
          user_id: string | null
          win_category: string
        }[]
        SetofOptions: {
          from: "*"
          to: "template_winners"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_footage_usage: {
        Args: { footage_id: string }
        Returns: undefined
      }
      increment_hashtag_group_usage: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      increment_hook_usage: { Args: { hook_id: string }; Returns: undefined }
      increment_music_usage: { Args: { track_id: string }; Returns: undefined }
      increment_rotation_set_usage: {
        Args: { p_set_id: string }
        Returns: undefined
      }
      initialize_user_highlights: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      initialize_user_monthly_themes: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_slot_available: {
        Args: { p_scheduled_at: string; p_user_id: string }
        Returns: boolean
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
      refresh_template_performance: { Args: never; Returns: undefined }
      reserve_mockup_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: {
          message: string
          remaining: number
          success: boolean
        }[]
      }
      select_music_track: {
        Args: { p_collection: string; p_user_id: string }
        Returns: {
          file_url: string
          id: string
          title: string
          usage_count: number
        }[]
      }
      select_stock_footage: {
        Args: { p_collection: string; p_user_id: string }
        Returns: {
          id: string
          usage_count: number
          video_url: string
        }[]
      }
      set_template_default: {
        Args: {
          p_is_default: boolean
          p_template_id: string
          p_user_id: string
        }
        Returns: boolean
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
      trigger_post_quiz_engagement: {
        Args: {
          p_email: string
          p_instagram_handle: string
          p_order_id?: string
          p_user_id: string
        }
        Returns: string
      }
      update_customer_stage: {
        Args: { p_customer_id: string; p_trigger_type?: string }
        Returns: string
      }
      update_mockup_automation_settings: {
        Args: {
          p_auto_generate?: boolean
          p_max_per_quote?: number
          p_notify_on_complete?: boolean
          p_use_defaults?: boolean
          p_user_id: string
        }
        Returns: boolean
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

