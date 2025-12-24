import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface TopPerformersProps {
  userId: string;
}

export async function TopPerformers({ userId }: TopPerformersProps) {
  const supabase = await createClient();

  // Fetch top performing pins by engagement
  const { data: topPins } = await (supabase as any)
    .from('pins')
    .select('id, title, impressions, saves, clicks, pinterest_url')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('saves', { ascending: false })
    .limit(5);

  // Fetch top products by orders
  const { data: topProducts } = await (supabase as any)
    .from('products')
    .select('id, title, total_orders, total_revenue')
    .eq('user_id', userId)
    .order('total_orders', { ascending: false })
    .limit(5);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Top Performers
      </h3>

      <div className="space-y-6">
        {/* Top Pins */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Pins</h4>
          <div className="space-y-2">
            {topPins && topPins.length > 0 ? (
              topPins.map((pin: any, index: number) => (
                <div key={pin.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{pin.title || 'Untitled'}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{(pin.saves || 0).toLocaleString()} saves</span>
                      <span>•</span>
                      <span>{(pin.clicks || 0).toLocaleString()} clicks</span>
                    </div>
                  </div>
                  {pin.pinterest_url && (
                    <a
                      href={pin.pinterest_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No published pins yet</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Products</h4>
          <div className="space-y-2">
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{product.title}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{(product.total_orders || 0).toLocaleString()} orders</span>
                      <span>•</span>
                      <span>${(product.total_revenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No products yet</p>
            )}
          </div>
        </div>
      </div>

      <Link
        href="/dashboard/analytics"
        className="block text-sm text-primary hover:underline mt-4"
      >
        View full analytics →
      </Link>
    </Card>
  );
}
