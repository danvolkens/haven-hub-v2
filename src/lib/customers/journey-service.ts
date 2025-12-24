import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  Customer,
  Touchpoint,
  TouchpointType,
  TouchpointChannel,
  SegmentCriteria
} from '@/types/customer-journey';

export async function recordTouchpoint(
  userId: string,
  email: string,
  touchpoint: {
    type: TouchpointType;
    channel: TouchpointChannel;
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, unknown>;
    value?: number;
    collection?: 'grounding' | 'wholeness' | 'growth';
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  try {
    // Get or create customer
    let { data: customer } = await (supabase as any)
      .from('customers')
      .select('id, total_orders, lifetime_value')
      .eq('user_id', userId)
      .eq('email', email)
      .single();

    if (!customer) {
      const { data: newCustomer, error: createError } = await (supabase as any)
        .from('customers')
        .insert({
          user_id: userId,
          email,
          stage: 'visitor',
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }
      customer = newCustomer;
    }

    // Record touchpoint
    const { error: touchpointError } = await (supabase as any)
      .from('touchpoints')
      .insert({
        user_id: userId,
        customer_id: customer.id,
        type: touchpoint.type,
        channel: touchpoint.channel,
        reference_id: touchpoint.referenceId,
        reference_type: touchpoint.referenceType,
        metadata: touchpoint.metadata || {},
        value: touchpoint.value,
        collection: touchpoint.collection,
        utm_source: touchpoint.utmSource,
        utm_medium: touchpoint.utmMedium,
        utm_campaign: touchpoint.utmCampaign,
      });

    if (touchpointError) {
      throw new Error(touchpointError.message);
    }

    // Update customer last activity
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (touchpoint.type === 'email_open') {
      updateData.last_email_open_at = new Date().toISOString();
    } else if (touchpoint.type === 'email_click') {
      updateData.last_email_click_at = new Date().toISOString();
    } else if (touchpoint.type === 'page_view') {
      updateData.last_site_visit_at = new Date().toISOString();
    } else if (touchpoint.type === 'purchase') {
      updateData.last_purchase_at = new Date().toISOString();
      // Increment total_orders and lifetime_value
      updateData.total_orders = (customer.total_orders || 0) + 1;
      if (touchpoint.value) {
        updateData.lifetime_value = (customer.lifetime_value || 0) + touchpoint.value;
      }
    } else if (touchpoint.type === 'lead_capture') {
      updateData.became_lead_at = new Date().toISOString();
      updateData.stage = 'lead';
    }

    await (supabase as any)
      .from('customers')
      .update(updateData)
      .eq('id', customer.id);

    // Update stage if needed
    await (supabase as any).rpc('update_customer_stage', {
      p_customer_id: customer.id,
      p_trigger_type: touchpoint.type,
    });

    // Update collection affinity
    if (touchpoint.collection) {
      await (supabase as any).rpc('calculate_collection_affinity', {
        p_customer_id: customer.id,
      });
    }

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error('Record touchpoint error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCustomerJourney(
  userId: string,
  customerId: string
): Promise<{
  customer: Customer | null;
  touchpoints: Touchpoint[];
  transitions: any[];
}> {
  const supabase = await createServerSupabaseClient();

  const { data: customer } = await (supabase as any)
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('user_id', userId)
    .single();

  const { data: touchpoints } = await (supabase as any)
    .from('touchpoints')
    .select('*')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
    .limit(100);

  const { data: transitions } = await (supabase as any)
    .from('stage_transitions')
    .select('*')
    .eq('customer_id', customerId)
    .order('transitioned_at', { ascending: false });

  return {
    customer: customer as Customer | null,
    touchpoints: (touchpoints || []) as Touchpoint[],
    transitions: transitions || [],
  };
}

export async function evaluateSegmentMembership(
  userId: string,
  segmentId: string
): Promise<{ added: number; removed: number }> {
  const supabase = await createServerSupabaseClient();
  let added = 0;
  let removed = 0;

  const { data: segment } = await (supabase as any)
    .from('customer_segments')
    .select('*')
    .eq('id', segmentId)
    .eq('user_id', userId)
    .single();

  if (!segment || !segment.is_dynamic) {
    return { added: 0, removed: 0 };
  }

  const criteria = segment.criteria as SegmentCriteria;

  // Build query for matching customers
  let query = (supabase as any)
    .from('customers')
    .select('id')
    .eq('user_id', userId);

  if (criteria.stages && criteria.stages.length > 0) {
    query = query.in('stage', criteria.stages);
  }

  if (criteria.collections && criteria.collections.length > 0) {
    query = query.in('primary_collection', criteria.collections);
  }

  if (criteria.min_ltv !== undefined) {
    query = query.gte('lifetime_value', criteria.min_ltv);
  }

  if (criteria.max_ltv !== undefined) {
    query = query.lte('lifetime_value', criteria.max_ltv);
  }

  if (criteria.min_orders !== undefined) {
    query = query.gte('total_orders', criteria.min_orders);
  }

  if (criteria.max_orders !== undefined) {
    query = query.lte('total_orders', criteria.max_orders);
  }

  if (criteria.email_subscribed !== undefined) {
    query = query.eq('email_subscribed', criteria.email_subscribed);
  }

  const { data: matchingCustomers } = await query;
  const matchingIds = new Set(matchingCustomers?.map((c: { id: string }) => c.id) || []);

  // Get current members
  const { data: currentMembers } = await (supabase as any)
    .from('segment_memberships')
    .select('customer_id')
    .eq('segment_id', segmentId)
    .is('removed_at', null);

  const currentIds = new Set(currentMembers?.map((m: { customer_id: string }) => m.customer_id) || []);

  // Add new members
  for (const id of matchingIds) {
    if (!currentIds.has(id)) {
      await (supabase as any).from('segment_memberships').insert({
        segment_id: segmentId,
        customer_id: id,
      });
      added++;
    }
  }

  // Remove non-matching members
  for (const id of currentIds) {
    if (!matchingIds.has(id)) {
      await (supabase as any)
        .from('segment_memberships')
        .update({ removed_at: new Date().toISOString() })
        .eq('segment_id', segmentId)
        .eq('customer_id', id);
      removed++;
    }
  }

  // Update segment count
  await (supabase as any)
    .from('customer_segments')
    .update({ customer_count: matchingIds.size })
    .eq('id', segmentId);

  return { added, removed };
}

export async function getJourneyAnalytics(userId: string): Promise<{
  stageDistribution: Record<string, number>;
  collectionDistribution: Record<string, number>;
  conversionFunnel: {
    visitors: number;
    leads: number;
    customers: number;
    repeat: number;
  };
  atRiskCount: number;
  avgLifetimeValue: number;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: customers } = await (supabase as any)
    .from('customers')
    .select('stage, primary_collection, lifetime_value')
    .eq('user_id', userId);

  if (!customers || customers.length === 0) {
    return {
      stageDistribution: {},
      collectionDistribution: {},
      conversionFunnel: { visitors: 0, leads: 0, customers: 0, repeat: 0 },
      atRiskCount: 0,
      avgLifetimeValue: 0,
    };
  }

  const stageDistribution: Record<string, number> = {};
  const collectionDistribution: Record<string, number> = {};
  let totalLtv = 0;
  let atRiskCount = 0;

  for (const customer of customers) {
    stageDistribution[customer.stage] = (stageDistribution[customer.stage] || 0) + 1;

    if (customer.primary_collection) {
      collectionDistribution[customer.primary_collection] =
        (collectionDistribution[customer.primary_collection] || 0) + 1;
    }

    totalLtv += customer.lifetime_value || 0;

    if (customer.stage === 'at_risk') {
      atRiskCount++;
    }
  }

  return {
    stageDistribution,
    collectionDistribution,
    conversionFunnel: {
      visitors: stageDistribution['visitor'] || 0,
      leads: (stageDistribution['lead'] || 0) + (stageDistribution['prospect'] || 0),
      customers: stageDistribution['customer'] || 0,
      repeat: (stageDistribution['repeat'] || 0) + (stageDistribution['vip'] || 0),
    },
    atRiskCount,
    avgLifetimeValue: customers.length > 0 ? totalLtv / customers.length : 0,
  };
}
