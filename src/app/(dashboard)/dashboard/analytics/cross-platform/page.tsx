import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  ArrowUpRight,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function CrossPlatformAnalyticsPage() {
  const userId = await getUserId();

  const supabase = await createClient();

  // Fetch platform connections
  const { data: connections } = await (supabase as any)
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId);

  // Fetch platform summary
  const { data: platformSummary } = await (supabase as any).rpc(
    'get_cross_platform_summary',
    {
      p_user_id: userId,
      p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0],
    }
  );

  // Fetch all winners
  const { data: winners } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .order('winner_detected_at', { ascending: false })
    .limit(20);

  // Fetch all content for comparison
  const { data: allContent } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .order('views', { ascending: false })
    .limit(50);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'tiktok':
        return 'bg-black text-white';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const noConnections = !connections || connections.length === 0;

  if (noConnections) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Cross-Platform Analytics</h1>
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Connect Your Platforms</h2>
          <p className="text-muted-foreground mb-4">
            Connect TikTok and Instagram to track content performance and discover winners
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/api/integrations/tiktok/install">
              <Button>Connect TikTok</Button>
            </Link>
            <Link href="/api/integrations/instagram/install">
              <Button variant="secondary">Connect Instagram</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cross-Platform Analytics</h1>
          <p className="text-muted-foreground">
            Compare performance across TikTok and Instagram
          </p>
        </div>
        <Link href="/dashboard/setup">
          <Button variant="secondary">Manage Connections</Button>
        </Link>
      </div>

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platformSummary?.map((platform: any) => (
          <Card key={platform.platform} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg ${getPlatformColor(platform.platform)} flex items-center justify-center font-bold`}
              >
                {platform.platform === 'tiktok' ? 'TT' : 'IG'}
              </div>
              <div>
                <h3 className="font-semibold capitalize">{platform.platform}</h3>
                <p className="text-xs text-muted-foreground">
                  {platform.total_content} posts tracked
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-lg font-semibold">
                  {formatNumber(platform.total_views || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="text-lg font-semibold">
                  {((platform.avg_engagement_rate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Winners</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {platform.winners_count || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adapted</p>
                <p className="text-lg font-semibold text-green-600">
                  {platform.adapted_to_pinterest || 0}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Overall Stats Card */}
        <Card className="p-4 bg-gradient-to-br from-sage/10 to-teal-focus/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-sage text-white flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Overall</h3>
              <p className="text-xs text-muted-foreground">All platforms combined</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Content</p>
              <p className="text-lg font-semibold">
                {allContent?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Winners</p>
              <p className="text-lg font-semibold text-yellow-600">
                {winners?.length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Winners Section */}
      <Card>
        <CardHeader
          title="Top Performing Content"
          description="Content that exceeded engagement thresholds"
          action={
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {winners?.length || 0} Winners
            </Badge>
          }
        />
        <CardContent>
          {winners && winners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {winners.map((winner: any) => (
                <div
                  key={winner.id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted">
                    {winner.image_url ? (
                      <Image
                        src={winner.image_url}
                        alt={winner.title || 'Content'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(winner.platform)}`}
                    >
                      {winner.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                    </div>
                    {winner.adapted_to_pinterest && (
                      <Badge
                        variant="success"
                        className="absolute top-2 right-2 text-xs"
                      >
                        Adapted
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 mb-2">
                      {winner.title || winner.description?.slice(0, 100) || 'Untitled'}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(winner.views || 0)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(winner.likes || 0)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(winner.comments || 0)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        {formatNumber(winner.shares || 0)}
                      </div>
                    </div>

                    {/* Engagement Rate */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="font-medium text-green-600">
                          {((winner.engagement_rate || 0) * 100).toFixed(2)}% engagement
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Score: {winner.performance_score || 0}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={winner.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          rightIcon={<ExternalLink className="h-3 w-3" />}
                        >
                          View Original
                        </Button>
                      </a>
                      {!winner.adapted_to_pinterest && (
                        <Link href={`/dashboard/pinterest/adapt/${winner.id}`}>
                          <Button
                            size="sm"
                            rightIcon={<ArrowUpRight className="h-3 w-3" />}
                          >
                            Adapt
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No winners detected yet</p>
              <p className="text-sm mt-1">
                Content with high engagement will appear here automatically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Content Table */}
      <Card>
        <CardHeader
          title="All Tracked Content"
          description="Performance data synced from connected platforms"
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Content</th>
                  <th className="pb-3 font-medium">Platform</th>
                  <th className="pb-3 font-medium text-right">Views</th>
                  <th className="pb-3 font-medium text-right">Engagement</th>
                  <th className="pb-3 font-medium text-right">Score</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {allContent?.slice(0, 20).map((content: any) => (
                  <tr key={content.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          {content.image_url && (
                            <Image
                              src={content.image_url}
                              alt=""
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          )}
                        </div>
                        <span className="truncate max-w-[200px]">
                          {content.title || content.description?.slice(0, 50) || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge className={getPlatformColor(content.platform)}>
                        {content.platform}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {formatNumber(content.views || 0)}
                    </td>
                    <td className="py-3 text-right">
                      {((content.engagement_rate || 0) * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 text-right">
                      {content.performance_score || 0}
                    </td>
                    <td className="py-3 text-center">
                      {content.is_winner ? (
                        content.adapted_to_pinterest ? (
                          <Badge variant="success">Adapted</Badge>
                        ) : (
                          <Badge variant="default">
                            <Trophy className="h-3 w-3 mr-1" />
                            Winner
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Tracked</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
