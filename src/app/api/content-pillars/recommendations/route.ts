import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMixRecommendations,
  generateMixRecommendations,
  saveMixRecommendations,
  calculateActionRecommendations,
} from '@/lib/services/content-pillars';

/**
 * GET /api/content-pillars/recommendations
 * Get content mix recommendations for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recommendations = await getMixRecommendations(user.id);

    // If no recommendations exist, generate them
    if (recommendations.length === 0) {
      const generated = await generateMixRecommendations(user.id);
      await saveMixRecommendations(user.id, generated);

      const actions = calculateActionRecommendations(generated);

      return NextResponse.json({
        recommendations: generated,
        actions,
        generated_now: true,
      });
    }

    // Check if recommendations are expired
    const validUntil = recommendations[0]?.valid_until;
    const isExpired = validUntil && new Date(validUntil) < new Date();

    const actions = calculateActionRecommendations(recommendations);

    return NextResponse.json({
      recommendations,
      actions,
      is_expired: isExpired,
      generated_now: false,
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content-pillars/recommendations
 * Regenerate content mix recommendations
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate new recommendations
    const recommendations = await generateMixRecommendations(user.id);
    await saveMixRecommendations(user.id, recommendations);

    const actions = calculateActionRecommendations(recommendations);

    return NextResponse.json({
      recommendations,
      actions,
      generated_now: true,
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
