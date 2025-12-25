import { getAdminClient } from '@/lib/supabase/admin';
import { getPinterestClient } from '@/lib/integrations/pinterest/service';
import type { PinterestClient } from '@/lib/integrations/pinterest/client';

// Campaign template definitions
export const CAMPAIGN_TEMPLATES = {
  'mh-core-traffic': {
    id: 'mh-core-traffic',
    name: 'MH-Core-Traffic',
    description: 'Mental Health core audience targeting for awareness and traffic',
    dailyBudget: 5,
    objective: 'CONSIDERATION' as const,
    targeting: {
      interests: ['mental health', 'therapy', 'counseling', 'psychology', 'self-care', 'mindfulness'],
      keywords: ['therapy office decor', 'counselor office prints', 'anxiety wall art'],
      demographics: { genders: ['female'], ages: ['25-34', '35-44', '45-54'] },
    },
  },
  'hd-core-traffic': {
    id: 'hd-core-traffic',
    name: 'HD-Core-Traffic',
    description: 'Home Decor core audience for wall art enthusiasts',
    dailyBudget: 4,
    objective: 'CONSIDERATION' as const,
    targeting: {
      interests: ['home decor', 'interior design', 'minimalism', 'wall art'],
      keywords: ['printable wall art', 'minimalist quotes', 'bedroom prints'],
      demographics: { genders: ['female'], ages: ['25-34', '35-44', '45-54'] },
    },
  },
  'rt-site-visitors': {
    id: 'rt-site-visitors',
    name: 'RT-SiteVisitors',
    description: 'Retargeting campaign for site visitors who did not purchase',
    dailyBudget: 2,
    objective: 'CONVERSIONS' as const,
    targeting: { audienceType: 'site_visitors' as const, excludePurchasers: true },
  },
  'b2b-therapists': {
    id: 'b2b-therapists',
    name: 'TO-Core-Traffic',
    description: 'B2B targeting for therapy office professionals',
    dailyBudget: 3,
    objective: 'CONSIDERATION' as const,
    targeting: {
      interests: ['therapy practice', 'counseling', 'psychology', 'office decor'],
      keywords: ['therapy office decor', 'counselor office art'],
      demographics: { genders: ['female', 'male'], ages: ['25-34', '35-44', '45-54', '55-64'] },
    },
  },
} as const;

export type CampaignTemplateId = keyof typeof CAMPAIGN_TEMPLATES;

export interface CreateCampaignOptions {
  dailyBudget?: number;
  name?: string;
  pinIds?: string[];
  adAccountId?: string;
}

export interface CampaignResult {
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  adGroup: {
    id: string;
    name: string;
  };
  dbRecord: {
    id: string;
    name: string;
    template_id: string;
    daily_budget: number;
    status: string;
    pin_count: number;
  };
}

/**
 * Get the user's Pinterest ad account ID
 */
async function getAdAccountId(client: PinterestClient, userId: string): Promise<string> {
  // First check if we have a stored ad account preference
  const supabase = getAdminClient();
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('preferences')
    .eq('user_id', userId)
    .single();

  if (settings?.preferences?.pinterest_ad_account_id) {
    return settings.preferences.pinterest_ad_account_id;
  }

  // Otherwise fetch from Pinterest and use the first one
  const { items: adAccounts } = await client.getAdAccounts();
  if (!adAccounts?.length) {
    throw new Error('No Pinterest ad account found. Please set up a Pinterest Ads account first.');
  }

  return adAccounts[0].id;
}

/**
 * Build targeting spec from template
 */
function buildTargetingSpec(
  template: typeof CAMPAIGN_TEMPLATES[CampaignTemplateId],
  visitorAudienceId?: string
): Record<string, any> {
  // Retargeting campaigns use audience-based targeting
  if ('audienceType' in template.targeting && template.targeting.audienceType === 'site_visitors') {
    if (!visitorAudienceId) {
      // Return empty targeting if no audience found - will need to be set up later
      return {};
    }
    return {
      AUDIENCE_INCLUDE: [visitorAudienceId],
    };
  }

  // Standard interest/keyword targeting
  const targeting = template.targeting as {
    interests?: string[];
    keywords?: string[];
    demographics?: { genders?: string[]; ages?: string[] };
  };

  const spec: Record<string, any> = {
    GEO: ['US'],
    LOCALE: ['en-US'],
  };

  if (targeting.interests?.length) {
    spec.INTEREST = targeting.interests;
  }

  if (targeting.keywords?.length) {
    spec.KEYWORD = targeting.keywords.map((keyword) => ({
      keyword,
      match_type: 'BROAD',
    }));
  }

  if (targeting.demographics?.genders?.length) {
    spec.GENDER = targeting.demographics.genders;
  }

  if (targeting.demographics?.ages?.length) {
    spec.AGE_BUCKET = targeting.demographics.ages;
  }

  return spec;
}

/**
 * Create a Pinterest campaign from a template
 */
export async function createPinterestCampaign(
  userId: string,
  templateId: CampaignTemplateId,
  options: CreateCampaignOptions = {}
): Promise<CampaignResult> {
  const template = CAMPAIGN_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const client = await getPinterestClient(userId);
  if (!client) {
    throw new Error('Pinterest not connected. Please connect your Pinterest account first.');
  }

  const supabase = getAdminClient();

  // Get ad account ID
  const adAccountId = options.adAccountId || await getAdAccountId(client, userId);

  // Generate campaign name with month prefix
  const monthPrefix = new Date().toLocaleDateString('en-US', { month: 'short' });
  const campaignName = options.name || `${monthPrefix}-${template.name}`;
  const dailyBudget = options.dailyBudget || template.dailyBudget;

  // Check if we need visitor audience for retargeting
  let visitorAudienceId: string | undefined;
  if ('audienceType' in template.targeting && template.targeting.audienceType === 'site_visitors') {
    try {
      const { items: audiences } = await client.getAudiences(adAccountId);
      const visitorAudience = audiences?.find((a) => a.audience_type === 'VISITOR');
      visitorAudienceId = visitorAudience?.id;
    } catch (err) {
      console.warn('Could not fetch audiences:', err);
    }
  }

  // Create campaign on Pinterest
  const campaign = await client.createAdCampaign(adAccountId, {
    name: campaignName,
    status: 'PAUSED',
    objective_type: template.objective,
    daily_spend_cap: dailyBudget * 1000000, // Pinterest uses micro-currency
  });

  // Build targeting spec
  const targetingSpec = buildTargetingSpec(template, visitorAudienceId);

  // Create ad group
  const adGroup = await client.createAdGroup(adAccountId, {
    name: `${campaignName}-AdGroup`,
    campaign_id: campaign.id,
    status: 'PAUSED',
    auto_targeting_enabled: false,
    billable_event: 'CLICKTHROUGH',
    targeting_spec: targetingSpec,
  });

  // Add pins if provided
  let addedPinCount = 0;
  if (options.pinIds?.length) {
    for (const pinId of options.pinIds) {
      try {
        await client.createAd(adAccountId, {
          ad_group_id: adGroup.id,
          pin_id: pinId,
          status: 'PAUSED',
          creative_type: 'REGULAR',
        });
        addedPinCount++;
      } catch (err) {
        console.error(`Failed to add pin ${pinId} to campaign:`, err);
      }
    }
  }

  // Get or create ad account record in database
  let dbAdAccountId: string;
  const { data: existingAdAccount } = await (supabase as any)
    .from('pinterest_ad_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('pinterest_ad_account_id', adAccountId)
    .single();

  if (existingAdAccount) {
    dbAdAccountId = existingAdAccount.id;
  } else {
    // Create ad account record
    const { data: newAdAccount } = await (supabase as any)
      .from('pinterest_ad_accounts')
      .insert({
        user_id: userId,
        pinterest_ad_account_id: adAccountId,
        name: 'Pinterest Ads',
        currency: 'USD',
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    dbAdAccountId = newAdAccount.id;
  }

  // Store campaign in database
  const { data: dbCampaign, error: dbError } = await (supabase as any)
    .from('ad_campaigns')
    .insert({
      user_id: userId,
      ad_account_id: dbAdAccountId,
      pinterest_campaign_id: campaign.id,
      name: campaignName,
      objective: template.objective,
      daily_spend_cap: dailyBudget,
      status: 'PAUSED',
    })
    .select()
    .single();

  if (dbError) {
    console.error('Failed to store campaign in database:', dbError);
    throw new Error('Campaign created on Pinterest but failed to save locally');
  }

  // Store ad group in database
  const { data: dbAdGroup, error: adGroupError } = await (supabase as any)
    .from('ad_groups')
    .insert({
      user_id: userId,
      campaign_id: dbCampaign.id,
      pinterest_ad_group_id: adGroup.id,
      name: adGroup.name,
      targeting: targetingSpec,
      status: 'PAUSED',
    })
    .select()
    .single();

  if (adGroupError) {
    console.error('Failed to store ad group in database:', adGroupError);
  }

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    },
    adGroup: {
      id: adGroup.id,
      name: adGroup.name,
    },
    dbRecord: {
      id: dbCampaign.id,
      name: dbCampaign.name,
      template_id: templateId,
      daily_budget: dailyBudget,
      status: 'paused',
      pin_count: addedPinCount,
    },
  };
}

/**
 * Activate a campaign (set to ACTIVE status)
 */
export async function activateCampaign(
  userId: string,
  campaignId: string
): Promise<{ success: boolean }> {
  const supabase = getAdminClient();
  const client = await getPinterestClient(userId);

  if (!client) {
    throw new Error('Pinterest not connected');
  }

  // Get campaign from database
  const { data: campaign, error } = await (supabase as any)
    .from('ad_campaigns')
    .select(`
      id,
      pinterest_campaign_id,
      ad_account_id,
      pinterest_ad_accounts!inner(pinterest_ad_account_id)
    `)
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (error || !campaign) {
    throw new Error('Campaign not found');
  }

  // Get ad groups for this campaign
  const { data: adGroups } = await (supabase as any)
    .from('ad_groups')
    .select('pinterest_ad_group_id')
    .eq('campaign_id', campaignId);

  // Check if campaign has any ads
  const { count: adCount } = await (supabase as any)
    .from('promoted_pins')
    .select('id', { count: 'exact', head: true })
    .in('ad_group_id', adGroups?.map((ag: any) => ag.id) || []);

  if (!adCount || adCount === 0) {
    throw new Error('Add at least one pin before activating the campaign');
  }

  const pinterestAdAccountId = campaign.pinterest_ad_accounts.pinterest_ad_account_id;

  // Activate campaign on Pinterest
  await client.updateAdCampaign(pinterestAdAccountId, {
    campaign_id: campaign.pinterest_campaign_id,
    status: 'ACTIVE',
  });

  // Activate all ad groups
  for (const adGroup of adGroups || []) {
    if (adGroup.pinterest_ad_group_id) {
      await client.updateAdGroup(pinterestAdAccountId, {
        ad_group_id: adGroup.pinterest_ad_group_id,
        status: 'ACTIVE',
      });
    }
  }

  // Update database
  await (supabase as any)
    .from('ad_campaigns')
    .update({
      status: 'ACTIVE',
      start_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', campaignId);

  await (supabase as any)
    .from('ad_groups')
    .update({ status: 'ACTIVE' })
    .eq('campaign_id', campaignId);

  return { success: true };
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(
  userId: string,
  campaignId: string
): Promise<{ success: boolean }> {
  const supabase = getAdminClient();
  const client = await getPinterestClient(userId);

  if (!client) {
    throw new Error('Pinterest not connected');
  }

  // Get campaign from database
  const { data: campaign, error } = await (supabase as any)
    .from('ad_campaigns')
    .select(`
      id,
      pinterest_campaign_id,
      pinterest_ad_accounts!inner(pinterest_ad_account_id)
    `)
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (error || !campaign) {
    throw new Error('Campaign not found');
  }

  const pinterestAdAccountId = campaign.pinterest_ad_accounts.pinterest_ad_account_id;

  // Pause campaign on Pinterest
  await client.updateAdCampaign(pinterestAdAccountId, {
    campaign_id: campaign.pinterest_campaign_id,
    status: 'PAUSED',
  });

  // Update database
  await (supabase as any)
    .from('ad_campaigns')
    .update({ status: 'PAUSED' })
    .eq('id', campaignId);

  return { success: true };
}

/**
 * Add pins to a campaign's ad group
 */
export async function addPinsToCampaign(
  userId: string,
  campaignId: string,
  pinIds: string[]
): Promise<{ added: number; failed: number }> {
  const supabase = getAdminClient();
  const client = await getPinterestClient(userId);

  if (!client) {
    throw new Error('Pinterest not connected');
  }

  // Get campaign and ad group from database
  const { data: campaign, error } = await (supabase as any)
    .from('ad_campaigns')
    .select(`
      id,
      pinterest_ad_accounts!inner(pinterest_ad_account_id),
      ad_groups(id, pinterest_ad_group_id)
    `)
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (error || !campaign) {
    throw new Error('Campaign not found');
  }

  const adGroup = campaign.ad_groups?.[0];
  if (!adGroup) {
    throw new Error('No ad group found for campaign');
  }

  const pinterestAdAccountId = campaign.pinterest_ad_accounts.pinterest_ad_account_id;
  let added = 0;
  let failed = 0;

  for (const pinId of pinIds) {
    try {
      // Get the Pinterest pin ID from our pins table
      const { data: pin } = await (supabase as any)
        .from('pins')
        .select('pinterest_pin_id')
        .eq('id', pinId)
        .eq('user_id', userId)
        .single();

      if (!pin?.pinterest_pin_id) {
        console.error(`Pin ${pinId} has no Pinterest pin ID`);
        failed++;
        continue;
      }

      // Create ad on Pinterest
      const ad = await client.createAd(pinterestAdAccountId, {
        ad_group_id: adGroup.pinterest_ad_group_id,
        pin_id: pin.pinterest_pin_id,
        status: 'PAUSED',
        creative_type: 'REGULAR',
      });

      // Store in database
      await (supabase as any)
        .from('promoted_pins')
        .insert({
          user_id: userId,
          ad_group_id: adGroup.id,
          pin_id: pinId,
          pinterest_ad_id: ad.id,
          pinterest_pin_id: pin.pinterest_pin_id,
          status: 'PAUSED',
        });

      added++;
    } catch (err) {
      console.error(`Failed to add pin ${pinId} to campaign:`, err);
      failed++;
    }
  }

  return { added, failed };
}

/**
 * Get campaigns for a user
 */
export async function getCampaigns(userId: string): Promise<any[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('ad_campaigns')
    .select(`
      *,
      pinterest_ad_accounts(name, currency),
      ad_groups(
        id,
        name,
        status,
        promoted_pins(id)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Add pin count to each campaign
  return (data || []).map((campaign: any) => ({
    ...campaign,
    pin_count: campaign.ad_groups?.reduce(
      (sum: number, ag: any) => sum + (ag.promoted_pins?.length || 0),
      0
    ) || 0,
  }));
}

/**
 * Get published pins available for promotion
 */
export async function getAvailablePins(userId: string): Promise<any[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('pins')
    .select('id, pinterest_pin_id, title, image_url, status')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('pinterest_pin_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data || [];
}
