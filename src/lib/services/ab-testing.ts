import { getAdminClient } from '@/lib/supabase/admin';

// Types
export type TestType =
  | 'pin_creative'
  | 'headline'
  | 'description'
  | 'hook'
  | 'cta'
  | 'audience'
  | 'schedule';

export type PrimaryMetric =
  | 'ctr'
  | 'save_rate'
  | 'conversion_rate'
  | 'engagement_rate'
  | 'cpa'
  | 'roas';

export type TestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface ABTest {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  test_type: TestType;
  control_variant_id: string;
  test_variant_ids: string[];
  traffic_split: { control: number; test: number };
  primary_metric: PrimaryMetric;
  confidence_threshold: number;
  minimum_sample_size: number;
  status: TestStatus;
  started_at: string | null;
  ended_at: string | null;
  scheduled_end_at: string | null;
  winner_variant_id: string | null;
  winner_declared_at: string | null;
  winner_confidence: number | null;
  results_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ABTestVariant {
  id: string;
  test_id: string;
  user_id: string;
  name: string;
  is_control: boolean;
  content_type: string;
  content_id: string;
  variant_config: Record<string, unknown>;
  traffic_percentage: number;
  created_at: string;
}

export interface ABTestResult {
  id: string;
  test_id: string;
  variant_id: string;
  user_id: string;
  result_date: string;
  impressions: number;
  clicks: number;
  saves: number;
  conversions: number;
  spend: number;
  ctr: number | null;
  save_rate: number | null;
  conversion_rate: number | null;
  cumulative_impressions: number;
  cumulative_conversions: number;
  created_at: string;
}

export interface VariantStats {
  variant_id: string;
  variant_name: string;
  is_control: boolean;
  total_impressions: number;
  total_clicks: number;
  total_saves: number;
  total_conversions: number;
  total_spend: number;
  overall_ctr: number;
  overall_save_rate: number;
  overall_conversion_rate: number;
}

export interface SignificanceResult {
  is_significant: boolean;
  confidence: number;
  p_value: number;
  z_score: number;
  lift: number;
  winner: 'control' | 'test' | 'none';
  sample_size_met: boolean;
}

export interface CreateTestInput {
  name: string;
  description?: string;
  hypothesis?: string;
  test_type: TestType;
  primary_metric: PrimaryMetric;
  confidence_threshold?: number;
  minimum_sample_size?: number;
  scheduled_end_at?: string;
  control: {
    name: string;
    content_type: string;
    content_id: string;
    variant_config?: Record<string, unknown>;
  };
  variants: Array<{
    name: string;
    content_type: string;
    content_id: string;
    variant_config?: Record<string, unknown>;
  }>;
  traffic_split?: { control: number; test: number };
}

/**
 * Calculate the two-proportion z-test for statistical significance
 * Used to compare conversion rates between control and test variants
 */
function calculateTwoProportionZTest(
  control: { successes: number; trials: number },
  test: { successes: number; trials: number }
): SignificanceResult {
  const n1 = control.trials;
  const n2 = test.trials;
  const x1 = control.successes;
  const x2 = test.successes;

  // If not enough data, return not significant
  if (n1 === 0 || n2 === 0) {
    return {
      is_significant: false,
      confidence: 0,
      p_value: 1,
      z_score: 0,
      lift: 0,
      winner: 'none',
      sample_size_met: false,
    };
  }

  // Calculate proportions
  const p1 = x1 / n1; // Control conversion rate
  const p2 = x2 / n2; // Test conversion rate

  // Pooled proportion
  const pPooled = (x1 + x2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

  // If SE is 0 (all or none converted), handle edge case
  if (se === 0) {
    return {
      is_significant: false,
      confidence: 0,
      p_value: 1,
      z_score: 0,
      lift: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0,
      winner: 'none',
      sample_size_met: n1 >= 100 && n2 >= 100,
    };
  }

  // Z-score
  const zScore = (p2 - p1) / se;

  // Two-tailed p-value using normal distribution approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Confidence level (1 - p-value)
  const confidence = 1 - pValue;

  // Lift (percentage improvement of test over control)
  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  // Determine winner
  let winner: 'control' | 'test' | 'none' = 'none';
  if (pValue < 0.05) {
    // 95% confidence
    winner = zScore > 0 ? 'test' : 'control';
  }

  return {
    is_significant: pValue < 0.05,
    confidence,
    p_value: pValue,
    z_score: zScore,
    lift,
    winner,
    sample_size_met: n1 >= 100 && n2 >= 100,
  };
}

/**
 * Cumulative distribution function for standard normal distribution
 * Using Abramowitz and Stegun approximation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Create a new A/B test with control and test variants
 */
export async function createTest(
  userId: string,
  input: CreateTestInput
): Promise<{ test: ABTest; variants: ABTestVariant[] } | null> {
  const supabase = getAdminClient();

  // Calculate traffic split
  const variantCount = input.variants.length + 1; // +1 for control
  const defaultSplit = Math.floor(100 / variantCount);
  const trafficSplit = input.traffic_split || {
    control: defaultSplit,
    test: 100 - defaultSplit,
  };

  // Create control variant first to get its ID
  const controlVariantId = crypto.randomUUID();
  const testVariantIds = input.variants.map(() => crypto.randomUUID());

  // Create the test
  const { data: test, error: testError } = await (supabase as any)
    .from('ab_tests')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description || null,
      hypothesis: input.hypothesis || null,
      test_type: input.test_type,
      primary_metric: input.primary_metric,
      confidence_threshold: input.confidence_threshold || 0.95,
      minimum_sample_size: input.minimum_sample_size || 1000,
      scheduled_end_at: input.scheduled_end_at || null,
      control_variant_id: controlVariantId,
      test_variant_ids: testVariantIds,
      traffic_split: trafficSplit,
      status: 'draft',
    })
    .select()
    .single();

  if (testError) {
    console.error('Error creating A/B test:', testError);
    return null;
  }

  // Create variants
  const variantsToInsert = [
    {
      id: controlVariantId,
      test_id: test.id,
      user_id: userId,
      name: input.control.name,
      is_control: true,
      content_type: input.control.content_type,
      content_id: input.control.content_id,
      variant_config: input.control.variant_config || {},
      traffic_percentage: trafficSplit.control,
    },
    ...input.variants.map((variant, index) => ({
      id: testVariantIds[index],
      test_id: test.id,
      user_id: userId,
      name: variant.name,
      is_control: false,
      content_type: variant.content_type,
      content_id: variant.content_id,
      variant_config: variant.variant_config || {},
      traffic_percentage: Math.floor(trafficSplit.test / input.variants.length),
    })),
  ];

  const { data: variants, error: variantsError } = await (supabase as any)
    .from('ab_test_variants')
    .insert(variantsToInsert)
    .select();

  if (variantsError) {
    console.error('Error creating variants:', variantsError);
    // Clean up the test
    await (supabase as any).from('ab_tests').delete().eq('id', test.id);
    return null;
  }

  return { test, variants };
}

/**
 * Start a test - changes status to running
 */
export async function startTest(
  userId: string,
  testId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('ab_tests')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('user_id', userId)
    .eq('status', 'draft');

  if (error) {
    console.error('Error starting test:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Pause a running test
 */
export async function pauseTest(
  userId: string,
  testId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('ab_tests')
    .update({ status: 'paused' })
    .eq('id', testId)
    .eq('user_id', userId)
    .eq('status', 'running');

  if (error) {
    console.error('Error pausing test:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resume a paused test
 */
export async function resumeTest(
  userId: string,
  testId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('ab_tests')
    .update({ status: 'running' })
    .eq('id', testId)
    .eq('user_id', userId)
    .eq('status', 'paused');

  if (error) {
    console.error('Error resuming test:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cancel a test
 */
export async function cancelTest(
  userId: string,
  testId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('ab_tests')
    .update({
      status: 'cancelled',
      ended_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('user_id', userId)
    .in('status', ['draft', 'running', 'paused']);

  if (error) {
    console.error('Error cancelling test:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record daily results for a variant
 */
export async function recordResults(
  userId: string,
  testId: string,
  variantId: string,
  metrics: {
    impressions: number;
    clicks: number;
    saves: number;
    conversions: number;
    spend?: number;
  },
  resultDate?: string
): Promise<{ success: boolean; result?: ABTestResult; error?: string }> {
  const supabase = getAdminClient();
  const date = resultDate || new Date().toISOString().split('T')[0];

  // Calculate rates
  const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : null;
  const save_rate = metrics.impressions > 0 ? metrics.saves / metrics.impressions : null;
  const conversion_rate = metrics.impressions > 0 ? metrics.conversions / metrics.impressions : null;

  // Get cumulative values
  const { data: existingResults } = await (supabase as any)
    .from('ab_test_results')
    .select('cumulative_impressions, cumulative_conversions')
    .eq('variant_id', variantId)
    .order('result_date', { ascending: false })
    .limit(1);

  const prevCumulativeImpressions = existingResults?.[0]?.cumulative_impressions || 0;
  const prevCumulativeConversions = existingResults?.[0]?.cumulative_conversions || 0;

  // Upsert the result
  const { data: result, error } = await (supabase as any)
    .from('ab_test_results')
    .upsert(
      {
        test_id: testId,
        variant_id: variantId,
        user_id: userId,
        result_date: date,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        saves: metrics.saves,
        conversions: metrics.conversions,
        spend: metrics.spend || 0,
        ctr,
        save_rate,
        conversion_rate,
        cumulative_impressions: prevCumulativeImpressions + metrics.impressions,
        cumulative_conversions: prevCumulativeConversions + metrics.conversions,
      },
      { onConflict: 'test_id,variant_id,result_date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error recording results:', error);
    return { success: false, error: error.message };
  }

  return { success: true, result };
}

/**
 * Calculate statistical significance for a test
 */
export async function calculateSignificance(
  testId: string
): Promise<{ success: boolean; result?: SignificanceResult; error?: string }> {
  const supabase = getAdminClient();

  // Get test details
  const { data: test, error: testError } = await (supabase as any)
    .from('ab_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testError || !test) {
    return { success: false, error: 'Test not found' };
  }

  // Get variant stats using the DB function
  const { data: stats, error: statsError } = await (supabase as any).rpc(
    'get_ab_test_stats',
    { p_test_id: testId }
  );

  if (statsError || !stats || stats.length < 2) {
    // Fallback to manual calculation if RPC doesn't exist
    const { data: variants } = await (supabase as any)
      .from('ab_test_variants')
      .select('id, name, is_control')
      .eq('test_id', testId);

    if (!variants || variants.length < 2) {
      return { success: false, error: 'Not enough variants' };
    }

    // Get results for each variant
    const variantStats: VariantStats[] = [];
    for (const variant of variants) {
      const { data: results } = await (supabase as any)
        .from('ab_test_results')
        .select('impressions, clicks, saves, conversions, spend')
        .eq('variant_id', variant.id);

      const totals = (results || []).reduce(
        (acc: any, r: any) => ({
          impressions: acc.impressions + (r.impressions || 0),
          clicks: acc.clicks + (r.clicks || 0),
          saves: acc.saves + (r.saves || 0),
          conversions: acc.conversions + (r.conversions || 0),
          spend: acc.spend + (r.spend || 0),
        }),
        { impressions: 0, clicks: 0, saves: 0, conversions: 0, spend: 0 }
      );

      variantStats.push({
        variant_id: variant.id,
        variant_name: variant.name,
        is_control: variant.is_control,
        total_impressions: totals.impressions,
        total_clicks: totals.clicks,
        total_saves: totals.saves,
        total_conversions: totals.conversions,
        total_spend: totals.spend,
        overall_ctr:
          totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
        overall_save_rate:
          totals.impressions > 0 ? totals.saves / totals.impressions : 0,
        overall_conversion_rate:
          totals.impressions > 0 ? totals.conversions / totals.impressions : 0,
      });
    }

    return calculateSignificanceFromStats(test, variantStats);
  }

  return calculateSignificanceFromStats(test, stats);
}

function calculateSignificanceFromStats(
  test: ABTest,
  stats: VariantStats[]
): { success: boolean; result?: SignificanceResult; error?: string } {
  const controlStats = stats.find((s) => s.is_control);
  const testStats = stats.find((s) => !s.is_control);

  if (!controlStats || !testStats) {
    return { success: false, error: 'Missing control or test variant stats' };
  }

  // Determine which metric to use based on primary_metric
  let controlData: { successes: number; trials: number };
  let testData: { successes: number; trials: number };

  switch (test.primary_metric) {
    case 'ctr':
      controlData = {
        successes: controlStats.total_clicks,
        trials: controlStats.total_impressions,
      };
      testData = {
        successes: testStats.total_clicks,
        trials: testStats.total_impressions,
      };
      break;
    case 'save_rate':
      controlData = {
        successes: controlStats.total_saves,
        trials: controlStats.total_impressions,
      };
      testData = {
        successes: testStats.total_saves,
        trials: testStats.total_impressions,
      };
      break;
    case 'conversion_rate':
      controlData = {
        successes: controlStats.total_conversions,
        trials: controlStats.total_impressions,
      };
      testData = {
        successes: testStats.total_conversions,
        trials: testStats.total_impressions,
      };
      break;
    case 'engagement_rate':
      // Engagement = clicks + saves
      controlData = {
        successes: controlStats.total_clicks + controlStats.total_saves,
        trials: controlStats.total_impressions,
      };
      testData = {
        successes: testStats.total_clicks + testStats.total_saves,
        trials: testStats.total_impressions,
      };
      break;
    default:
      controlData = {
        successes: controlStats.total_clicks,
        trials: controlStats.total_impressions,
      };
      testData = {
        successes: testStats.total_clicks,
        trials: testStats.total_impressions,
      };
  }

  const result = calculateTwoProportionZTest(controlData, testData);

  // Check if minimum sample size is met
  result.sample_size_met =
    controlData.trials >= test.minimum_sample_size &&
    testData.trials >= test.minimum_sample_size;

  return { success: true, result };
}

/**
 * Declare a winner for the test
 */
export async function declareWinner(
  userId: string,
  testId: string,
  winnerVariantId: string,
  confidence: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  // Get final stats for results summary
  const { data: stats } = await (supabase as any).rpc('get_ab_test_stats', {
    p_test_id: testId,
  });

  const resultsSummary = {
    variants: stats || [],
    winner_declared_automatically: false,
    final_confidence: confidence,
  };

  const { error } = await (supabase as any)
    .from('ab_tests')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      winner_variant_id: winnerVariantId,
      winner_declared_at: new Date().toISOString(),
      winner_confidence: confidence,
      results_summary: resultsSummary,
    })
    .eq('id', testId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error declaring winner:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all tests for a user
 */
export async function getTests(
  userId: string,
  options: {
    status?: TestStatus | TestStatus[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ tests: ABTest[]; count: number }> {
  const supabase = getAdminClient();
  const { status, limit = 50, offset = 0 } = options;

  let query = (supabase as any)
    .from('ab_tests')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching tests:', error);
    return { tests: [], count: 0 };
  }

  return { tests: data || [], count: count || 0 };
}

/**
 * Get a single test with its variants
 */
export async function getTestWithVariants(
  userId: string,
  testId: string
): Promise<{ test: ABTest; variants: ABTestVariant[] } | null> {
  const supabase = getAdminClient();

  const { data: test, error: testError } = await (supabase as any)
    .from('ab_tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', userId)
    .single();

  if (testError || !test) {
    return null;
  }

  const { data: variants, error: variantsError } = await (supabase as any)
    .from('ab_test_variants')
    .select('*')
    .eq('test_id', testId)
    .order('is_control', { ascending: false });

  if (variantsError) {
    return null;
  }

  return { test, variants: variants || [] };
}

/**
 * Get test results over time for charting
 */
export async function getTestResults(
  testId: string,
  options: { limit?: number } = {}
): Promise<ABTestResult[]> {
  const supabase = getAdminClient();
  const { limit = 90 } = options;

  const { data, error } = await (supabase as any)
    .from('ab_test_results')
    .select('*')
    .eq('test_id', testId)
    .order('result_date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching test results:', error);
    return [];
  }

  return data || [];
}

/**
 * Get running tests that may have reached significance
 */
export async function getTestsForSignificanceCheck(): Promise<ABTest[]> {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from('ab_tests')
    .select('*')
    .eq('status', 'running');

  if (error) {
    console.error('Error fetching running tests:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a test (only drafts can be deleted)
 */
export async function deleteTest(
  userId: string,
  testId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from('ab_tests')
    .delete()
    .eq('id', testId)
    .eq('user_id', userId)
    .eq('status', 'draft');

  if (error) {
    console.error('Error deleting test:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
