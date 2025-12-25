import { cronHandler } from '@/lib/cron/verify-cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { updateMilestones } from '@/lib/services/campaign-templates';

export const GET = cronHandler(async () => {
  const supabase = getAdminClient();

  // Get all users with Shopify integration
  const { data: users, error: usersError } = await (supabase as any)
    .from('integrations')
    .select('user_id, credentials')
    .eq('provider', 'shopify')
    .eq('is_active', true);

  if (usersError) {
    console.error('Failed to fetch users with Shopify:', usersError);
    return { success: false, data: { error: 'Failed to fetch users' } };
  }

  let updatedCount = 0;
  let errorCount = 0;
  const phaseUnlocks: { user_id: string; phase: number }[] = [];

  for (const user of users || []) {
    try {
      // Get order stats from Shopify integration data
      // This queries the orders or customer journey tables that track Shopify data
      const { data: orderStats } = await (supabase as any)
        .from('customer_orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      const { data: uniqueCustomers } = await (supabase as any)
        .from('customer_orders')
        .select('customer_email')
        .eq('user_id', user.user_id);

      // Count unique purchasers
      const uniqueEmails = new Set(uniqueCustomers?.map((c: any) => c.customer_email) || []);
      const totalPurchasers = uniqueEmails.size;
      const totalSales = orderStats?.count || 0;

      // Check Pinterest pixel and audience status
      const { data: pixelData } = await (supabase as any)
        .from('pinterest_conversions')
        .select('id')
        .eq('user_id', user.user_id)
        .limit(1);

      const hasPixelData = !!pixelData?.length;

      // Check for Pinterest audiences
      const { data: audiences } = await (supabase as any)
        .from('pinterest_audiences')
        .select('audience_type')
        .eq('user_id', user.user_id);

      const audienceTypes = new Set(audiences?.map((a: any) => a.audience_type) || []);

      // Get current milestones to check for new phase unlocks
      const { data: currentMilestones } = await (supabase as any)
        .from('user_campaign_milestones')
        .select('phase_2_unlocked_at, phase_3_unlocked_at, total_sales')
        .eq('user_id', user.user_id)
        .single();

      // Update milestones
      const updated = await updateMilestones(user.user_id, {
        total_sales: totalSales,
        total_purchasers: totalPurchasers,
        has_pixel_data: hasPixelData,
        has_site_visitors_audience: audienceTypes.has('site_visitors') || audienceTypes.has('VISITOR'),
        has_cart_abandoners_audience: audienceTypes.has('cart_abandoners') || audienceTypes.has('CART_ABANDONER'),
        has_purchasers_audience: audienceTypes.has('purchasers') || audienceTypes.has('PURCHASER'),
      });

      // Track phase unlocks for notifications
      if (!currentMilestones?.phase_2_unlocked_at && updated.phase_2_unlocked_at) {
        phaseUnlocks.push({ user_id: user.user_id, phase: 2 });
      }
      if (!currentMilestones?.phase_3_unlocked_at && updated.phase_3_unlocked_at) {
        phaseUnlocks.push({ user_id: user.user_id, phase: 3 });
      }

      updatedCount++;
    } catch (error) {
      console.error(`Failed to update milestones for user ${user.user_id}:`, error);
      errorCount++;
    }
  }

  // Log any phase unlocks for potential notification triggers
  if (phaseUnlocks.length > 0) {
    console.log('Phase unlocks triggered:', phaseUnlocks);

    // Create activity log entries for phase unlocks
    for (const unlock of phaseUnlocks) {
      await (supabase as any)
        .from('activity_log')
        .insert({
          user_id: unlock.user_id,
          action: 'campaign_phase_unlocked',
          entity_type: 'campaign_milestone',
          entity_id: null,
          metadata: {
            phase: unlock.phase,
            message: `Phase ${unlock.phase} campaign templates are now available!`,
          },
        });
    }
  }

  return {
    success: true,
    data: {
      users_processed: updatedCount,
      errors: errorCount,
      phase_unlocks: phaseUnlocks.length,
    },
  };
});
