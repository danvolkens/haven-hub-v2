import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { PinterestClient } from '@/lib/integrations/pinterest/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    // Get campaign with ad account info
    const { data: campaign, error: fetchError } = await (supabase as any)
      .from('ad_campaigns')
      .select(`
        id,
        pinterest_campaign_id,
        pinterest_ad_accounts!inner(pinterest_ad_account_id)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Try to archive on Pinterest (campaigns can't be deleted, only archived)
    if (campaign.pinterest_campaign_id) {
      try {
        const accessToken = await (adminClient as any).rpc('get_credential', {
          p_user_id: userId,
          p_provider: 'pinterest',
          p_credential_type: 'access_token',
        });

        if (accessToken.data) {
          const pinterestClient = new PinterestClient({ accessToken: accessToken.data });
          await pinterestClient.updateAdCampaign(
            campaign.pinterest_ad_accounts.pinterest_ad_account_id,
            {
              campaign_id: campaign.pinterest_campaign_id,
              status: 'ARCHIVED',
            }
          );
        }
      } catch (pinterestError) {
        console.error('Failed to archive campaign on Pinterest:', pinterestError);
        // Continue with local deletion even if Pinterest fails
      }
    }

    // Delete ad groups first (foreign key constraint)
    await (supabase as any)
      .from('ad_groups')
      .delete()
      .eq('campaign_id', id);

    // Delete campaign from database
    const { error: deleteError } = await (supabase as any)
      .from('ad_campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
