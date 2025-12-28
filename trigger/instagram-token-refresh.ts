/**
 * Instagram Token Refresh Job
 * Prompt 9.1: Refresh long-lived tokens before expiry
 */

import { schedules, logger } from '@trigger.dev/sdk/v3';
import { createClient } from '@supabase/supabase-js';
import { addDays, isBefore, addWeeks } from 'date-fns';

// ============================================================================
// Configuration
// ============================================================================

const GRAPH_API_VERSION = 'v18.0';
const DAYS_BEFORE_EXPIRY = 7; // Refresh tokens 7 days before expiry

// ============================================================================
// Supabase Client Factory
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// Shared Token Refresh Logic
// ============================================================================

async function performTokenRefresh() {
  const supabase = getSupabaseClient();
  const now = new Date();
  const refreshThreshold = addDays(now, DAYS_BEFORE_EXPIRY);

  logger.info('Checking Instagram tokens for refresh', {
    refreshThreshold: refreshThreshold.toISOString(),
  });

  // Get connections with tokens expiring soon
  const { data: connections, error } = await (supabase as any)
    .from('integrations')
    .select('user_id, metadata, token_expires_at')
    .eq('provider', 'instagram')
    .eq('status', 'connected')
    .lte('token_expires_at', refreshThreshold.toISOString());

  if (error) {
    logger.error('Failed to fetch Instagram connections', { error });
    return { success: false, error: 'Failed to fetch connections' };
  }

  if (!connections || connections.length === 0) {
    logger.info('No tokens need refresh');
    return { success: true, refreshed: 0 };
  }

  let refreshedCount = 0;
  let failedCount = 0;

  for (const connection of connections) {
    try {
      const accessToken = connection.metadata?._access_token;

      if (!accessToken) {
        logger.warn('No access token found for user', { userId: connection.user_id });
        continue;
      }

      // Refresh the token
      const refreshUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
          client_secret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET!,
          fb_exchange_token: accessToken,
        });

      const response = await fetch(refreshUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Token refresh failed', {
          userId: connection.user_id,
          error: errorData,
        });
        failedCount++;

        // Mark connection as needing attention
        await (supabase as any)
          .from('integrations')
          .update({
            last_error: 'Token refresh failed',
            last_error_at: now.toISOString(),
          })
          .eq('user_id', connection.user_id)
          .eq('provider', 'instagram');

        continue;
      }

      const data = await response.json();
      const newExpiresIn = data.expires_in || 5184000; // ~60 days
      const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

      // Update token in integrations table
      await (supabase as any)
        .from('integrations')
        .update({
          metadata: {
            ...connection.metadata,
            _access_token: data.access_token,
          },
          token_expires_at: newExpiresAt,
          last_error: null,
          last_error_at: null,
        })
        .eq('user_id', connection.user_id)
        .eq('provider', 'instagram');

      // Also update platform_connections if exists
      await (supabase as any)
        .from('platform_connections')
        .update({
          access_token_encrypted: data.access_token,
          token_expires_at: newExpiresAt,
        })
        .eq('user_id', connection.user_id)
        .eq('platform', 'instagram');

      // Try to update vault if available
      try {
        await (supabase as any).rpc('store_credential', {
          p_user_id: connection.user_id,
          p_provider: 'instagram',
          p_credential_type: 'access_token',
          p_credential_value: data.access_token,
        });
      } catch (vaultError) {
        // Vault may not be available
      }

      logger.info('Token refreshed successfully', {
        userId: connection.user_id,
        newExpiresAt,
      });

      refreshedCount++;
    } catch (error) {
      logger.error('Unexpected error refreshing token', {
        userId: connection.user_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failedCount++;
    }
  }

  logger.info('Token refresh complete', { refreshedCount, failedCount });

  return {
    success: true,
    refreshed: refreshedCount,
    failed: failedCount,
  };
}

// ============================================================================
// Token Refresh Job
// Runs weekly on Sundays at 6 AM
// ============================================================================

export const refreshInstagramTokensTask = schedules.task({
  id: 'instagram-refresh-tokens',
  cron: '0 6 * * 0', // Every Sunday at 6 AM

  run: async () => {
    return performTokenRefresh();
  },
});

// ============================================================================
// Manual Token Refresh (for testing)
// ============================================================================

export const refreshTokenNowTask = schedules.task({
  id: 'instagram-refresh-token-now',
  cron: '0 0 30 2 *', // Never runs automatically (Feb 30)

  run: async () => {
    logger.info('Manual token refresh triggered');
    return performTokenRefresh();
  },
});
