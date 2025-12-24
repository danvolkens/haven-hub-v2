import { createClient } from '@/lib/supabase/server';
import { withCache, userCacheKey, cacheInvalidateByTag } from './redis-cache';

// Cache user settings
export async function getCachedUserSettings(userId: string) {
  return withCache(
    userCacheKey(userId, 'settings'),
    async () => {
      const supabase = await createClient();
      const { data } = await (supabase as any)
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      return data;
    },
    { ttl: 300, tags: [`user:${userId}`] }
  );
}

// Cache integration status
export async function getCachedIntegrations(userId: string) {
  return withCache(
    userCacheKey(userId, 'integrations'),
    async () => {
      const supabase = await createClient();
      const { data } = await (supabase as any)
        .from('integrations')
        .select('provider, status, metadata')
        .eq('user_id', userId);
      return data || [];
    },
    { ttl: 60, tags: [`user:${userId}`, 'integrations'] }
  );
}

// Cache dashboard stats
export async function getCachedDashboardStats(userId: string) {
  return withCache(
    userCacheKey(userId, 'dashboard-stats'),
    async () => {
      const supabase = await createClient();

      const [orders, customers, pins] = await Promise.all([
        (supabase as any)
          .from('customer_orders')
          .select('total')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        (supabase as any)
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        (supabase as any)
          .from('pins')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'published'),
      ]);

      return {
        revenue: (orders.data || []).reduce((sum: number, o: any) => sum + Number(o.total), 0),
        orderCount: orders.data?.length || 0,
        customerCount: customers.count || 0,
        pinCount: pins.count || 0,
      };
    },
    { ttl: 300, tags: [`user:${userId}`, 'stats'] }
  );
}

// Cache top pins
export async function getCachedTopPins(userId: string, limit = 5) {
  return withCache(
    userCacheKey(userId, 'top-pins', String(limit)),
    async () => {
      const supabase = await createClient();
      const { data } = await (supabase as any)
        .from('pin_analytics')
        .select(`
          pin_id,
          impressions,
          saves,
          clicks,
          pins(title, image_url)
        `)
        .eq('user_id', userId)
        .order('saves', { ascending: false })
        .limit(limit);
      return data || [];
    },
    { ttl: 600, tags: [`user:${userId}`, 'pins'] }
  );
}

// Invalidate all user cache
export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheInvalidateByTag(`user:${userId}`);
}
