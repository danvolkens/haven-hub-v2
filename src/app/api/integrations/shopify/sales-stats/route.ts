import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);

    // Get today's stats
    const { data: todayOrders } = await (supabase as any)
      .from('shopify_orders')
      .select('total_price')
      .eq('user_id', userId)
      .gte('shopify_created_at', startOfToday.toISOString())
      .in('financial_status', ['paid', 'partially_paid']);

    const todayStats = calculateStats(todayOrders || []);

    // Get this week's stats
    const { data: weekOrders } = await (supabase as any)
      .from('shopify_orders')
      .select('total_price')
      .eq('user_id', userId)
      .gte('shopify_created_at', startOfWeek.toISOString())
      .in('financial_status', ['paid', 'partially_paid']);

    const weekStats = calculateStats(weekOrders || []);

    // Get this month's stats
    const { data: monthOrders } = await (supabase as any)
      .from('shopify_orders')
      .select('total_price')
      .eq('user_id', userId)
      .gte('shopify_created_at', startOfMonth.toISOString())
      .in('financial_status', ['paid', 'partially_paid']);

    const monthStats = calculateStats(monthOrders || []);

    // Get last week's stats for comparison
    const { data: lastWeekOrders } = await (supabase as any)
      .from('shopify_orders')
      .select('total_price')
      .eq('user_id', userId)
      .gte('shopify_created_at', startOfLastWeek.toISOString())
      .lt('shopify_created_at', endOfLastWeek.toISOString())
      .in('financial_status', ['paid', 'partially_paid']);

    const lastWeekStats = calculateStats(lastWeekOrders || []);
    const comparisonToLastWeek = lastWeekStats.revenue > 0
      ? ((weekStats.revenue - lastWeekStats.revenue) / lastWeekStats.revenue) * 100
      : weekStats.revenue > 0 ? 100 : 0;

    // Get top products this month
    const { data: monthOrdersWithItems } = await (supabase as any)
      .from('shopify_orders')
      .select('line_items')
      .eq('user_id', userId)
      .gte('shopify_created_at', startOfMonth.toISOString())
      .in('financial_status', ['paid', 'partially_paid']);

    const topProducts = calculateTopProducts(monthOrdersWithItems || []);

    return NextResponse.json({
      today: todayStats,
      thisWeek: weekStats,
      thisMonth: monthStats,
      topProducts,
      comparisonToLastWeek,
    });
  } catch (error) {
    console.error('Sales stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateStats(orders: Array<{ total_price: number | string | null }>): {
  orders: number;
  revenue: number;
} {
  const revenue = orders.reduce((sum, order) => {
    const price = typeof order.total_price === 'string'
      ? parseFloat(order.total_price)
      : (order.total_price || 0);
    return sum + price;
  }, 0);

  return {
    orders: orders.length,
    revenue,
  };
}

function calculateTopProducts(
  orders: Array<{ line_items: any[] | null }>
): Array<{ title: string; revenue: number; orders: number }> {
  const productMap = new Map<string, { title: string; revenue: number; orders: number }>();

  for (const order of orders) {
    if (!order.line_items) continue;

    for (const item of order.line_items) {
      const title = item.title || 'Unknown Product';
      const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
      const quantity = item.quantity || 1;
      const itemRevenue = price * quantity;

      const existing = productMap.get(title);
      if (existing) {
        existing.revenue += itemRevenue;
        existing.orders += 1;
      } else {
        productMap.set(title, { title, revenue: itemRevenue, orders: 1 });
      }
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
