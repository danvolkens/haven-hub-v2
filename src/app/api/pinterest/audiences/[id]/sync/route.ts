import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApiUserId } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/supabase/admin';

// Hash email for Pinterest
function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;
    const supabase = getAdminClient();

    // Get audience
    const { data: audience } = await (supabase as any)
      .from('audience_exports')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    // Get Pinterest integration
    const { data: integration } = await (supabase as any)
      .from('integrations')
      .select('access_token_encrypted, metadata')
      .eq('user_id', userId)
      .eq('provider', 'pinterest')
      .eq('status', 'connected')
      .single();

    if (!integration || !integration.metadata?.ad_account_id) {
      return NextResponse.json({ error: 'Pinterest Ads not connected' }, { status: 400 });
    }

    // Update status to exporting
    await (supabase as any)
      .from('audience_exports')
      .update({ status: 'exporting', error: null })
      .eq('id', id);

    // Get customer emails based on segment criteria
    // For now, get all customers - in production, apply segment_criteria filters
    const { data: customers } = await (supabase as any)
      .from('customers')
      .select('email')
      .eq('user_id', userId)
      .not('email', 'is', null);

    const emails = customers?.map((c: any) => c.email).filter(Boolean) || [];

    if (emails.length === 0) {
      await (supabase as any)
        .from('audience_exports')
        .update({
          status: 'error',
          error: 'No customer emails found',
        })
        .eq('id', id);

      return NextResponse.json({ error: 'No customer emails found' }, { status: 400 });
    }

    // Hash emails
    const hashedEmails = emails.map(hashEmail);

    // Create or update Pinterest audience
    const adAccountId = integration.metadata.ad_account_id;
    const accessToken = integration.access_token_encrypted; // TODO: Decrypt

    try {
      let pinterestAudienceId = audience.pinterest_audience_id;

      if (!pinterestAudienceId) {
        // Create new audience
        const createResponse = await fetch(
          `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/audiences`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: `Haven Hub - ${audience.name}`,
              audience_type: 'CUSTOMER_LIST',
              description: audience.description || 'Created by Haven Hub',
            }),
          }
        );

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || 'Failed to create Pinterest audience');
        }

        const createData = await createResponse.json();
        pinterestAudienceId = createData.id;

        // Update with Pinterest audience ID
        await (supabase as any)
          .from('audience_exports')
          .update({
            pinterest_audience_id: pinterestAudienceId,
            pinterest_audience_name: createData.name,
          })
          .eq('id', id);
      }

      // Add emails to audience
      const updateResponse = await fetch(
        `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/audiences/${pinterestAudienceId}/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: hashedEmails.map((email: string) => ({ em: email })),
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to update Pinterest audience');
      }

      // Update status to synced
      await (supabase as any)
        .from('audience_exports')
        .update({
          status: 'synced',
          total_profiles: emails.length,
          last_synced_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        profilesExported: emails.length,
        pinterestAudienceId,
      });
    } catch (pinterestError) {
      // Update status to error
      await (supabase as any)
        .from('audience_exports')
        .update({
          status: 'error',
          error: pinterestError instanceof Error ? pinterestError.message : 'Pinterest API error',
        })
        .eq('id', id);

      throw pinterestError;
    }
  } catch (error) {
    console.error('Error syncing audience:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync audience' },
      { status: 500 }
    );
  }
}
