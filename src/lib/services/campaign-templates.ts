import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Campaign template type definitions
 */
export interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  objective: 'CONSIDERATION' | 'CONVERSIONS';
  default_daily_budget: number;
  targeting_type: 'interest' | 'keyword' | 'retargeting' | 'lookalike';
  targeting_presets: Record<string, unknown>;
  phase: number;
  min_sales_required: number;
  min_purchases_for_lookalike: number;
  requires_pixel_data: boolean;
  requires_audience: string | null;
  is_recommended: boolean;
  display_order: number;
  is_active: boolean;
}

export interface UserMilestones {
  id: string;
  user_id: string;
  total_sales: number;
  total_purchasers: number;
  has_pixel_data: boolean;
  has_site_visitors_audience: boolean;
  has_cart_abandoners_audience: boolean;
  has_purchasers_audience: boolean;
  phase_2_unlocked_at: string | null;
  phase_3_unlocked_at: string | null;
  updated_at: string;
}

export interface TemplateWithLockStatus extends CampaignTemplate {
  is_locked: boolean;
  lock_reason: string | null;
  unlock_requirements: {
    sales_needed?: number;
    purchasers_needed?: number;
    requires_pixel?: boolean;
    requires_audience?: string;
  } | null;
}

export interface TemplatesByPhase {
  phase1: TemplateWithLockStatus[];
  phase2: TemplateWithLockStatus[];
  phase3: TemplateWithLockStatus[];
  milestones: UserMilestones;
}

/**
 * Get user's campaign milestones, creating a record if none exists
 */
export async function getUserMilestones(userId: string): Promise<UserMilestones> {
  const supabase = getAdminClient();

  // Try to get existing milestones
  const { data: existing, error } = await (supabase as any)
    .from('user_campaign_milestones')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new milestones record if none exists
  const { data: created, error: createError } = await (supabase as any)
    .from('user_campaign_milestones')
    .insert({
      user_id: userId,
      total_sales: 0,
      total_purchasers: 0,
      has_pixel_data: false,
      has_site_visitors_audience: false,
      has_cart_abandoners_audience: false,
      has_purchasers_audience: false,
    })
    .select()
    .single();

  if (createError) {
    console.error('Failed to create milestones record:', createError);
    // Return default milestones
    return {
      id: '',
      user_id: userId,
      total_sales: 0,
      total_purchasers: 0,
      has_pixel_data: false,
      has_site_visitors_audience: false,
      has_cart_abandoners_audience: false,
      has_purchasers_audience: false,
      phase_2_unlocked_at: null,
      phase_3_unlocked_at: null,
      updated_at: new Date().toISOString(),
    };
  }

  return created;
}

/**
 * Determine if a template is locked based on user milestones
 */
function getTemplateLockStatus(
  template: CampaignTemplate,
  milestones: UserMilestones
): { is_locked: boolean; lock_reason: string | null; unlock_requirements: TemplateWithLockStatus['unlock_requirements'] } {
  const requirements: TemplateWithLockStatus['unlock_requirements'] = {};
  const reasons: string[] = [];

  // Check sales requirement
  if (template.min_sales_required > 0 && milestones.total_sales < template.min_sales_required) {
    requirements.sales_needed = template.min_sales_required - milestones.total_sales;
    reasons.push(`Need ${requirements.sales_needed} more sales`);
  }

  // Check purchasers requirement for lookalike
  if (template.min_purchases_for_lookalike > 0 && milestones.total_purchasers < template.min_purchases_for_lookalike) {
    requirements.purchasers_needed = template.min_purchases_for_lookalike - milestones.total_purchasers;
    reasons.push(`Need ${requirements.purchasers_needed} more purchasers`);
  }

  // Check pixel data requirement
  if (template.requires_pixel_data && !milestones.has_pixel_data) {
    requirements.requires_pixel = true;
    reasons.push('Pinterest pixel data required');
  }

  // Check audience requirements
  if (template.requires_audience) {
    let hasAudience = false;
    switch (template.requires_audience) {
      case 'site_visitors':
        hasAudience = milestones.has_site_visitors_audience;
        break;
      case 'cart_abandoners':
        hasAudience = milestones.has_cart_abandoners_audience;
        break;
      case 'purchasers':
        hasAudience = milestones.has_purchasers_audience;
        break;
    }
    if (!hasAudience) {
      requirements.requires_audience = template.requires_audience;
      reasons.push(`${template.requires_audience.replace('_', ' ')} audience required`);
    }
  }

  const is_locked = reasons.length > 0;
  return {
    is_locked,
    lock_reason: is_locked ? reasons.join(', ') : null,
    unlock_requirements: is_locked ? requirements : null,
  };
}

/**
 * Get all available templates grouped by phase with lock status
 */
export async function getAvailableTemplates(userId: string): Promise<TemplatesByPhase> {
  const supabase = getAdminClient();

  // Get all active templates
  const { data: templates, error } = await (supabase as any)
    .from('campaign_templates')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch templates:', error);
    throw new Error('Failed to fetch campaign templates');
  }

  // Get user milestones
  const milestones = await getUserMilestones(userId);

  // Add lock status to each template and group by phase
  const result: TemplatesByPhase = {
    phase1: [],
    phase2: [],
    phase3: [],
    milestones,
  };

  for (const template of templates || []) {
    const lockStatus = getTemplateLockStatus(template, milestones);
    const templateWithStatus: TemplateWithLockStatus = {
      ...template,
      ...lockStatus,
    };

    switch (template.phase) {
      case 1:
        result.phase1.push(templateWithStatus);
        break;
      case 2:
        result.phase2.push(templateWithStatus);
        break;
      case 3:
        result.phase3.push(templateWithStatus);
        break;
    }
  }

  return result;
}

/**
 * Update user milestones from Shopify integration data
 */
export async function updateMilestones(
  userId: string,
  data: {
    total_sales?: number;
    total_purchasers?: number;
    has_pixel_data?: boolean;
    has_site_visitors_audience?: boolean;
    has_cart_abandoners_audience?: boolean;
    has_purchasers_audience?: boolean;
  }
): Promise<UserMilestones> {
  const supabase = getAdminClient();

  // Get current milestones to check for phase unlocks
  const currentMilestones = await getUserMilestones(userId);

  // Build update object
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Check for phase unlocks based on new data
  const newSales = data.total_sales ?? currentMilestones.total_sales;
  const newPurchasers = data.total_purchasers ?? currentMilestones.total_purchasers;

  // Phase 2 unlocks at 50 sales
  if (newSales >= 50 && !currentMilestones.phase_2_unlocked_at) {
    updateData.phase_2_unlocked_at = new Date().toISOString();
  }

  // Phase 3 unlocks at 100 sales
  if (newSales >= 100 && !currentMilestones.phase_3_unlocked_at) {
    updateData.phase_3_unlocked_at = new Date().toISOString();
  }

  // Update or insert milestones
  const { data: updated, error } = await (supabase as any)
    .from('user_campaign_milestones')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to update milestones:', error);
    throw new Error('Failed to update milestones');
  }

  return updated;
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(templateId: string): Promise<CampaignTemplate | null> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('campaign_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Failed to fetch template:', error);
    return null;
  }

  return data;
}

/**
 * Check if a user can use a specific template
 */
export async function canUseTemplate(
  userId: string,
  templateId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const template = await getTemplateById(templateId);
  if (!template) {
    return { allowed: false, reason: 'Template not found' };
  }

  const milestones = await getUserMilestones(userId);
  const lockStatus = getTemplateLockStatus(template, milestones);

  if (lockStatus.is_locked) {
    return { allowed: false, reason: lockStatus.lock_reason || 'Template is locked' };
  }

  return { allowed: true };
}

/**
 * Get milestone progress for display
 */
export function getMilestoneProgress(milestones: UserMilestones): {
  phase2Progress: number;
  phase3Progress: number;
  nextMilestone: string;
} {
  const phase2Threshold = 50;
  const phase3Threshold = 100;

  const phase2Progress = Math.min(100, (milestones.total_sales / phase2Threshold) * 100);
  const phase3Progress = Math.min(100, (milestones.total_sales / phase3Threshold) * 100);

  let nextMilestone: string;
  if (milestones.total_sales < phase2Threshold) {
    nextMilestone = `${phase2Threshold - milestones.total_sales} sales to unlock Phase 2`;
  } else if (milestones.total_sales < phase3Threshold) {
    nextMilestone = `${phase3Threshold - milestones.total_sales} sales to unlock Phase 3`;
  } else {
    nextMilestone = 'All phases unlocked!';
  }

  return {
    phase2Progress,
    phase3Progress,
    nextMilestone,
  };
}
