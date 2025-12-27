import { getAdminClient } from '@/lib/supabase/admin';
import type { MockupAutomationSettings, MockupSceneTemplate } from '@/types/mockups';

export interface AutoGenerationContext {
  userId: string;
  assetIds: string[];
  quoteId?: string;
  source: 'asset_approval' | 'quote_approval' | 'manual';
}

export interface AutoGenerationResult {
  shouldGenerate: boolean;
  templates: MockupSceneTemplate[];
  settings: MockupAutomationSettings;
  operatorMode: 'supervised' | 'assisted' | 'autopilot';
  reason?: string;
}

/**
 * Check if auto-generation should occur and get the configuration
 */
export async function checkAutoGeneration(
  context: AutoGenerationContext
): Promise<AutoGenerationResult> {
  const supabase = getAdminClient();
  const { userId, assetIds } = context;

  // Default result - no generation
  const defaultResult: AutoGenerationResult = {
    shouldGenerate: false,
    templates: [],
    settings: {
      auto_generate: false,
      use_defaults: true,
      max_per_quote: 5,
      notify_on_complete: true,
    },
    operatorMode: 'supervised',
    reason: 'Auto-generation not enabled',
  };

  // 1. Get user settings
  const { data: userSettings, error: settingsError } = await (supabase as any)
    .from('user_settings')
    .select('global_mode, module_overrides, guardrails')
    .eq('user_id', userId)
    .single();

  if (settingsError || !userSettings) {
    return { ...defaultResult, reason: 'Could not fetch user settings' };
  }

  // 2. Get mockup automation settings from guardrails
  const guardrails = userSettings.guardrails || {};
  const settings: MockupAutomationSettings = {
    auto_generate: guardrails.mockup_auto_generate ?? false,
    use_defaults: guardrails.mockup_use_defaults ?? true,
    max_per_quote: guardrails.mockup_max_per_quote ?? 5,
    notify_on_complete: guardrails.mockup_notify_on_complete ?? true,
  };

  // 3. Check if auto-generation is enabled
  if (!settings.auto_generate) {
    return { ...defaultResult, settings, reason: 'Auto-generation is disabled' };
  }

  // 4. Get operator mode for mockups module
  const operatorMode =
    userSettings.module_overrides?.mockups ||
    userSettings.global_mode ||
    'supervised';

  // 5. Get templates to use
  let templates: MockupSceneTemplate[] = [];

  if (settings.use_defaults) {
    // Get default templates
    const { data: defaultTemplates, error: templatesError } = await (supabase as any)
      .rpc('get_default_mockup_templates', { p_user_id: userId });

    if (templatesError) {
      return {
        ...defaultResult,
        settings,
        operatorMode,
        reason: 'Could not fetch default templates',
      };
    }

    templates = defaultTemplates || [];
  } else {
    // Get all active templates
    const { data: allTemplates, error: templatesError } = await (supabase as any)
      .from('mockup_scene_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .eq('is_active', true)
      .order('name');

    if (templatesError) {
      return {
        ...defaultResult,
        settings,
        operatorMode,
        reason: 'Could not fetch templates',
      };
    }

    templates = allTemplates || [];
  }

  // 6. Apply max limit
  templates = templates.slice(0, settings.max_per_quote);

  if (templates.length === 0) {
    return {
      ...defaultResult,
      settings,
      operatorMode,
      reason: 'No templates available for auto-generation',
    };
  }

  // 7. Check credit availability
  const creditsNeeded = assetIds.length * templates.length;
  const { data: creditCheck } = await (supabase as any).rpc('reserve_mockup_credits', {
    p_user_id: userId,
    p_credits: creditsNeeded,
  });

  if (!creditCheck?.[0]?.success) {
    return {
      ...defaultResult,
      settings,
      operatorMode,
      reason: creditCheck?.[0]?.message || 'Insufficient credits',
    };
  }

  return {
    shouldGenerate: true,
    templates,
    settings,
    operatorMode,
  };
}

/**
 * Get the scene keys from templates for the mockup generator
 */
export function getSceneKeysFromTemplates(templates: MockupSceneTemplate[]): string[] {
  return templates.map((t) => t.scene_key);
}
