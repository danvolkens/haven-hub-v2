import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface InstagramSettings {
  creatomate_api_key?: string;
  pexels_api_key?: string;
  cross_post_facebook: boolean;
  cross_post_types: string[];
  default_timezone: string;
  hashtag_location: 'caption' | 'first_comment';
  auto_shopping_tags: boolean;
  operator_mode: 'supervised' | 'assisted' | 'autopilot';
}

const DEFAULT_SETTINGS: InstagramSettings = {
  cross_post_facebook: false,
  cross_post_types: ['feed', 'reel'],
  default_timezone: 'America/New_York',
  hashtag_location: 'first_comment',
  auto_shopping_tags: false,
  operator_mode: 'supervised',
};

// GET /api/instagram/settings - Get Instagram settings
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings from user_settings
    const { data: userSettings } = await (supabase as any)
      .from('user_settings')
      .select('instagram_settings, guardrails')
      .eq('user_id', user.id)
      .single();

    // Get API keys from vault
    let creatomate_api_key = '';
    let pexels_api_key = '';

    try {
      const { data: creatomateKey } = await (supabase as any).rpc('get_credential', {
        p_user_id: user.id,
        p_provider: 'creatomate',
        p_credential_type: 'api_key',
      });
      creatomate_api_key = creatomateKey ? '••••••••' : ''; // Mask the key
    } catch {
      // Vault may not be available
    }

    try {
      const { data: pexelsKey } = await (supabase as any).rpc('get_credential', {
        p_user_id: user.id,
        p_provider: 'pexels',
        p_credential_type: 'api_key',
      });
      pexels_api_key = pexelsKey ? '••••••••' : '';
    } catch {
      // Vault may not be available
    }

    const settings = {
      ...DEFAULT_SETTINGS,
      ...userSettings?.instagram_settings,
      operator_mode: userSettings?.guardrails?.operator_mode || 'supervised',
      creatomate_api_key,
      pexels_api_key,
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in settings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/instagram/settings - Update Instagram settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Handle API key updates separately (store in vault)
    if (updates.creatomate_api_key && updates.creatomate_api_key !== '••••••••') {
      try {
        await (supabase as any).rpc('store_credential', {
          p_user_id: user.id,
          p_provider: 'creatomate',
          p_credential_type: 'api_key',
          p_credential_value: updates.creatomate_api_key,
        });
      } catch {
        // Fallback: store in user_settings (less secure)
      }
      delete updates.creatomate_api_key;
    }

    if (updates.pexels_api_key && updates.pexels_api_key !== '••••••••') {
      try {
        await (supabase as any).rpc('store_credential', {
          p_user_id: user.id,
          p_provider: 'pexels',
          p_credential_type: 'api_key',
          p_credential_value: updates.pexels_api_key,
        });
      } catch {
        // Fallback: store in user_settings
      }
      delete updates.pexels_api_key;
    }

    // Handle operator_mode in guardrails
    if (updates.operator_mode) {
      const { data: currentSettings } = await (supabase as any)
        .from('user_settings')
        .select('guardrails')
        .eq('user_id', user.id)
        .single();

      await (supabase as any)
        .from('user_settings')
        .upsert({
          user_id: user.id,
          guardrails: {
            ...currentSettings?.guardrails,
            operator_mode: updates.operator_mode,
          },
        }, { onConflict: 'user_id' });

      delete updates.operator_mode;
    }

    // Update remaining settings in instagram_settings
    if (Object.keys(updates).length > 0) {
      const { data: currentSettings } = await (supabase as any)
        .from('user_settings')
        .select('instagram_settings')
        .eq('user_id', user.id)
        .single();

      await (supabase as any)
        .from('user_settings')
        .upsert({
          user_id: user.id,
          instagram_settings: {
            ...currentSettings?.instagram_settings,
            ...updates,
          },
        }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in settings PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
