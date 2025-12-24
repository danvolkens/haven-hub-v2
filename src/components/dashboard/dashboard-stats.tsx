import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Pin } from 'lucide-react';

interface DashboardStatsProps {
  userId: string;
}

export async function DashboardStats({ userId }: DashboardStatsProps) {
  const supabase = await createClient();
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Revenue (last 30 days vs previous 30)
  const { data: recentOrders } = await (supabase as any)
    .from('customer_orders')
    .select('total')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { data: previousOrders } = await (supabase as any)
    .from('customer_orders')
    .select('total')
    .eq('user_id', userId)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  const recentRevenue = (recentOrders || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const previousRevenue = (previousOrders || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const revenueChange = previousRevenue > 0
    ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;

  // Orders count
  const orderCount = recentOrders?.length || 0;
  const previousOrderCount = previousOrders?.length || 0;
  const orderChange = previousOrderCount > 0
    ? ((orderCount - previousOrderCount) / previousOrderCount) * 100
    : 0;

  // New customers
  const { count: newCustomers } = await (supabase as any)
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Active pins
  const { count: activePins } = await (supabase as any)
    .from('pins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published');

  const stats = [
    {
      title: 'Revenue (30d)',
      value: `$${recentRevenue.toLocaleString()}`,
      change: revenueChange,
      icon: DollarSign,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Orders (30d)',
      value: orderCount.toLocaleString(),
      change: orderChange,
      icon: ShoppingCart,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'New Customers',
      value: (newCustomers || 0).toLocaleString(),
      change: undefined,
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Active Pins',
      value: (activePins || 0).toLocaleString(),
      change: undefined,
      icon: Pin,
      color: 'text-red-600 bg-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              {stat.change !== undefined && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${
                  stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stat.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
