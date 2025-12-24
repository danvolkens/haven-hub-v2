import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all loyalty records with referral data
  const { data: loyaltyRecords } = await (supabase as any)
    .from('customer_loyalty')
    .select(`
      referral_code,
      referrals_count,
      referral_points_earned,
      customers(email)
    `)
    .eq('user_id', user.id)
    .gt('referrals_count', 0)
    .order('referrals_count', { ascending: false });

  // Get referral transactions
  const { data: referralTx } = await (supabase as any)
    .from('points_transactions')
    .select('points_amount, metadata')
    .eq('user_id', user.id)
    .eq('type', 'earn_referral');

  const totalReferrals = (loyaltyRecords || []).reduce((sum: number, r: any) => sum + r.referrals_count, 0);

  // Calculate stats
  const stats = {
    totalReferrals,
    pendingReferrals: 0, // Would need additional tracking
    convertedReferrals: totalReferrals,
    totalRevenueGenerated: (referralTx || []).reduce((sum: number, tx: any) => {
      const orderValue = tx.metadata?.order_value || 0;
      return sum + orderValue;
    }, 0),
    topReferrers: (loyaltyRecords || []).slice(0, 10).map((r: any) => ({
      email: r.customers?.email || 'Unknown',
      referrals: r.referrals_count,
      conversions: r.referrals_count,
      revenue: r.referral_points_earned * 10, // Approximate
    })),
  };

  return NextResponse.json(stats);
}
