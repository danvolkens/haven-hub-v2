import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/intelligence - Get intelligence overview/summary
export async function GET(_request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get counts for insights
    const { data: insightCounts } = await (supabase as any)
      .from('insights')
      .select('status, priority')
      .eq('user_id', userId)
      .in('status', ['new', 'viewed']);

    // Get counts for recommendations
    const { data: recommendationCounts } = await (supabase as any)
      .from('recommendations')
      .select('status, type')
      .eq('user_id', userId)
      .eq('status', 'pending');

    // Get latest AI analysis job
    const { data: latestJob } = await (supabase as any)
      .from('ai_analysis_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Count by priority
    const insightsByPriority = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const insightsByStatus = {
      new: 0,
      viewed: 0,
    };

    for (const insight of insightCounts || []) {
      if (insight.priority in insightsByPriority) {
        insightsByPriority[insight.priority as keyof typeof insightsByPriority]++;
      }
      if (insight.status in insightsByStatus) {
        insightsByStatus[insight.status as keyof typeof insightsByStatus]++;
      }
    }

    // Count recommendations by type
    const recommendationsByType: Record<string, number> = {};
    for (const rec of recommendationCounts || []) {
      recommendationsByType[rec.type] = (recommendationsByType[rec.type] || 0) + 1;
    }

    return NextResponse.json({
      insights: {
        total: (insightCounts || []).length,
        byPriority: insightsByPriority,
        byStatus: insightsByStatus,
        hasUrgent: insightsByPriority.critical > 0 || insightsByPriority.high > 0,
      },
      recommendations: {
        total: (recommendationCounts || []).length,
        byType: recommendationsByType,
      },
      lastAnalysis: latestJob ? {
        type: latestJob.type,
        status: latestJob.status,
        completedAt: latestJob.completed_at,
        insightsGenerated: latestJob.insights_generated,
        recommendationsGenerated: latestJob.recommendations_generated,
      } : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch intelligence overview' },
      { status: 500 }
    );
  }
}

// POST /api/intelligence - Trigger AI analysis
export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { type = 'daily_analysis' } = await request.json().catch(() => ({}));

    // Validate type
    const validTypes = [
      'daily_analysis',
      'weekly_analysis',
      'content_analysis',
      'performance_analysis',
      'trend_detection',
      'anomaly_detection',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    // Check if there's already a pending/processing job of this type
    const { data: existingJob } = await (supabase as any)
      .from('ai_analysis_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('type', type)
      .in('status', ['pending', 'processing'])
      .limit(1)
      .single();

    if (existingJob) {
      return NextResponse.json({
        message: 'Analysis already in progress',
        jobId: existingJob.id,
        status: existingJob.status,
      });
    }

    // Create new analysis job
    const { data: job, error } = await (supabase as any)
      .from('ai_analysis_jobs')
      .insert({
        user_id: userId,
        type,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Trigger the actual AI analysis task via Trigger.dev
    // For now, we'll simulate by generating some basic insights

    // Mark job as processing
    await (supabase as any)
      .from('ai_analysis_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    // Generate basic insights based on current data
    let insightsGenerated = 0;
    let recommendationsGenerated = 0;

    try {
      // Check for underperforming pins
      const { data: underperformers } = await (supabase as any)
        .from('pins')
        .select('id, title, impressions, engagement_rate')
        .eq('user_id', userId)
        .eq('performance_tier', 'underperformer')
        .limit(3);

      if (underperformers && underperformers.length > 0) {
        await (supabase as any).from('insights').insert({
          user_id: userId,
          type: 'warning',
          category: 'pinterest',
          title: `${underperformers.length} underperforming pins detected`,
          summary: 'Some of your pins are not performing as expected. Consider refreshing their content or adjusting posting times.',
          details: {
            pins: underperformers.map((p: any) => ({
              id: p.id,
              title: p.title,
              impressions: p.impressions,
              engagementRate: p.engagement_rate,
            })),
          },
          priority: 'medium',
          suggested_actions: [
            { action: 'Review pin content', description: 'Check if the pins need updated copy or images', impact: 'Medium' },
            { action: 'Adjust posting schedule', description: 'Try posting at different times', impact: 'Low' },
          ],
          confidence_score: 0.8,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        insightsGenerated++;
      }

      // Check for top performers
      const { data: topPerformers } = await (supabase as any)
        .from('pins')
        .select('id, title, collection, impressions, engagement_rate')
        .eq('user_id', userId)
        .eq('performance_tier', 'top')
        .limit(3);

      if (topPerformers && topPerformers.length > 0) {
        const topCollection = topPerformers[0]?.collection || 'general';

        await (supabase as any).from('insights').insert({
          user_id: userId,
          type: 'opportunity',
          category: 'content',
          title: 'High-performing content pattern detected',
          summary: `Your "${topCollection}" collection content is performing exceptionally well. Consider creating more content in this style.`,
          details: {
            topPerformers: topPerformers.map((p: any) => ({
              id: p.id,
              title: p.title,
              collection: p.collection,
              impressions: p.impressions,
              engagementRate: p.engagement_rate,
            })),
          },
          priority: 'high',
          suggested_actions: [
            { action: 'Create similar content', description: `Generate more ${topCollection} themed quotes`, impact: 'High' },
            { action: 'Boost top pins', description: 'Consider promoting your best performers', impact: 'Medium' },
          ],
          confidence_score: 0.85,
          valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        insightsGenerated++;

        // Create recommendation for this pattern
        await (supabase as any).from('recommendations').insert({
          user_id: userId,
          type: 'collection_focus',
          title: `Focus on ${topCollection} content`,
          description: `Based on your recent performance, your ${topCollection} collection is resonating well with your audience.`,
          rationale: 'This recommendation is based on the higher engagement rates observed in this collection.',
          data: {
            collection: topCollection,
            avgEngagementRate: topPerformers.reduce((sum: number, p: any) => sum + (p.engagement_rate || 0), 0) / topPerformers.length,
            topPins: topPerformers.length,
          },
          expected_impact: 'Increased engagement and follower growth',
          impact_score: 0.75,
          confidence_score: 0.8,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        recommendationsGenerated++;
      }

      // Update job as completed
      await (supabase as any)
        .from('ai_analysis_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          insights_generated: insightsGenerated,
          recommendations_generated: recommendationsGenerated,
        })
        .eq('id', job.id);
    } catch (analysisError) {
      // Mark job as failed
      await (supabase as any)
        .from('ai_analysis_jobs')
        .update({
          status: 'failed',
          error_message: analysisError instanceof Error ? analysisError.message : 'Analysis failed',
        })
        .eq('id', job.id);
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      insightsGenerated,
      recommendationsGenerated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}
