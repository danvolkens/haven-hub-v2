import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getPinterestAuthUrl } from '@/lib/integrations/pinterest/config';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Store state in session or database for verification
    // For simplicity, we'll encode the user ID in the state
    const stateData = Buffer.from(JSON.stringify({
      userId: user.id,
      nonce: state,
      timestamp: Date.now(),
    })).toString('base64');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`;
    const authUrl = getPinterestAuthUrl(stateData, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Pinterest connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Pinterest connection' },
      { status: 500 }
    );
  }
}
