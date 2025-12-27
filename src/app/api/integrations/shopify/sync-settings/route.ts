import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get sync settings from module_overrides JSONB
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('module_overrides')
      .eq('user_id', user.id)
      .single();

    const syncSettings = settings?.module_overrides?.shopify_sync || {};

    return NextResponse.json({
      autoSync: syncSettings.autoSync ?? false,
      syncFrequency: syncSettings.syncFrequency ?? '24h',
    });
  } catch (error) {
    console.error('Error fetching sync settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { autoSync, syncFrequency } = body;

    // Get current settings
    const { data: currentSettings } = await (supabase as any)
      .from('user_settings')
      .select('module_overrides')
      .eq('user_id', user.id)
      .single();

    const currentOverrides = currentSettings?.module_overrides || {};
    const currentSyncSettings = currentOverrides.shopify_sync || {};

    // Merge with new settings
    const newSyncSettings = {
      ...currentSyncSettings,
      ...(autoSync !== undefined && { autoSync }),
      ...(syncFrequency !== undefined && { syncFrequency }),
      updatedAt: new Date().toISOString(),
    };

    // Update module_overrides with shopify_sync settings
    const { error: updateError } = await (supabase as any)
      .from('user_settings')
      .update({
        module_overrides: {
          ...currentOverrides,
          shopify_sync: newSyncSettings,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      settings: newSyncSettings,
    });
  } catch (error) {
    console.error('Error updating sync settings:', error);
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    );
  }
}
