import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/instagram/test-pexels - Test Pexels connection
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API key from vault
    let apiKey = '';
    try {
      const { data } = await (supabase as any).rpc('get_credential', {
        p_user_id: user.id,
        p_provider: 'pexels',
        p_credential_type: 'api_key',
      });
      apiKey = data;
    } catch {
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 400 });
    }

    // Test the Pexels API with a simple search
    const response = await fetch('https://api.pexels.com/videos/search?query=nature&per_page=1', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: 'Connection failed',
        details: error,
      }, { status: 400 });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      total_results: data.total_results,
    });
  } catch (error) {
    console.error('Error testing Pexels:', error);
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 });
  }
}
