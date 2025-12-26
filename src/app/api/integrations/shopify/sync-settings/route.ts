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
    // Get sync settings from user_settings
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('shopify_sync_settings')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      autoSync: settings?.shopify_sync_settings?.autoSync ?? false,
      syncFrequency: settings?.shopify_sync_settings?.syncFrequency ?? '24h',
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
      .select('shopify_sync_settings')
      .eq('user_id', user.id)
      .single();

    const currentSyncSettings = currentSettings?.shopify_sync_settings || {};

    // Merge with new settings
    const newSyncSettings = {
      ...currentSyncSettings,
      ...(autoSync !== undefined && { autoSync }),
      ...(syncFrequency !== undefined && { syncFrequency }),
      updatedAt: new Date().toISOString(),
    };

    // Upsert settings
    const { error: updateError } = await (supabase as any)
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          shopify_sync_settings: newSyncSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

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
