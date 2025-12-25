import { cronHandler } from '@/lib/cron/verify-cron';
import {
  getAllActiveConnections,
  syncTikTokContent,
  syncInstagramContent,
} from '@/lib/services/cross-platform-sync';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Cron job to sync content from TikTok and Instagram
 * Runs daily at 10 AM to fetch latest content and detect winners
 */
export const GET = cronHandler(async () => {
  const supabase = getAdminClient();

  // Get all active platform connections
  const connections = await getAllActiveConnections();

  if (connections.length === 0) {
    return {
      success: true,
      data: {
        message: 'No active platform connections',
        synced: 0,
      },
    };
  }

  let totalSynced = 0;
  let totalWinners = 0;
  const errors: string[] = [];
  const platformStats: Record<string, { synced: number; winners: number }> = {};

  // Group connections by user to batch process
  const userConnections: Record<string, typeof connections> = {};
  for (const conn of connections) {
    if (!userConnections[conn.user_id]) {
      userConnections[conn.user_id] = [];
    }
    userConnections[conn.user_id].push(conn);
  }

  // Process each user's connections
  for (const [userId, userConns] of Object.entries(userConnections)) {
    for (const connection of userConns) {
      // Skip if no token
      if (!connection.access_token_encrypted) continue;

      // Get token from integrations table (metadata fallback)
      const { data: integration } = await (supabase as any)
        .from('integrations')
        .select('metadata')
        .eq('user_id', userId)
        .eq('provider', connection.platform)
        .single();

      const accessToken =
        integration?.metadata?._access_token || connection.access_token_encrypted;

      if (!accessToken) {
        errors.push(`${connection.platform}/${userId}: No access token`);
        continue;
      }

      try {
        let result;

        if (connection.platform === 'tiktok') {
          result = await syncTikTokContent(userId, accessToken);
        } else if (connection.platform === 'instagram') {
          if (!connection.account_id) {
            errors.push(`instagram/${userId}: No account ID`);
            continue;
          }
          result = await syncInstagramContent(userId, accessToken, connection.account_id);
        } else {
          continue;
        }

        // Track stats
        if (!platformStats[connection.platform]) {
          platformStats[connection.platform] = { synced: 0, winners: 0 };
        }
        platformStats[connection.platform].synced += result.contentSynced;
        platformStats[connection.platform].winners += result.winnersDetected;
        totalSynced += result.contentSynced;
        totalWinners += result.winnersDetected;

        if (result.errors.length > 0) {
          errors.push(...result.errors.slice(0, 3).map(e => `${connection.platform}/${userId}: ${e}`));
        }

        // Log new winners to activity
        if (result.winnersDetected > 0) {
          await (supabase as any).from('activity_log').insert({
            user_id: userId,
            action: 'cross_platform_sync_winners',
            entity_type: 'cross_platform_content',
            details: {
              platform: connection.platform,
              winners_detected: result.winnersDetected,
              content_synced: result.contentSynced,
            },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${connection.platform}/${userId}: ${message}`);

        // Update connection status if there's an error
        await (supabase as any)
          .from('platform_connections')
          .update({
            last_error: message,
            last_error_at: new Date().toISOString(),
            status: message.includes('token') ? 'expired' : 'error',
          })
          .eq('id', connection.id);
      }
    }
  }

  return {
    success: errors.length === 0,
    data: {
      total_synced: totalSynced,
      total_winners: totalWinners,
      platform_stats: platformStats,
      users_processed: Object.keys(userConnections).length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    },
  };
});
