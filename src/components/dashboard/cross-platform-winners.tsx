import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface CrossPlatformWinnersProps {
  userId: string;
}

interface WinnerContent {
  id: string;
  platform: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  original_url: string;
  views: number;
  likes: number;
  engagement_rate: number;
  performance_score: number;
  is_winner: boolean;
  adapted_to_pinterest: boolean;
  winner_detected_at: string;
}

export async function CrossPlatformWinners({ userId }: CrossPlatformWinnersProps) {
  const supabase = await createClient();

  // Fetch cross-platform winners that haven't been adapted yet
  const { data: winners } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .eq('adapted_to_pinterest', false)
    .order('winner_detected_at', { ascending: false })
    .limit(5);

  // Fetch recently adapted content
  const { data: recentlyAdapted } = await (supabase as any)
    .from('cross_platform_content')
    .select('*')
    .eq('user_id', userId)
    .eq('is_winner', true)
    .eq('adapted_to_pinterest', true)
    .order('adapted_at', { ascending: false })
    .limit(3);

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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'tiktok':
        return 'TT';
      case 'instagram':
        return 'IG';
      default:
        return '?';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Cross-Platform Winners
        </h3>
        <Link href="/dashboard/analytics/cross-platform">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
            View All
          </Button>
        </Link>
      </div>

      {/* Winners to Adapt */}
      {winners && winners.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Ready to Adapt to Pinterest
          </p>
          {winners.map((winner: WinnerContent) => (
            <div
              key={winner.id}
              className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {winner.image_url ? (
                  <Image
                    src={winner.image_url}
                    alt={winner.title || 'Content'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
                {/* Platform badge */}
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getPlatformColor(winner.platform)} flex items-center justify-center text-[8px] font-bold`}
                >
                  {getPlatformIcon(winner.platform)}
                </div>
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {winner.title || winner.description?.slice(0, 50) || 'Untitled'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatNumber(winner.views)} views</span>
                  <span>-</span>
                  <span>{(winner.engagement_rate * 100).toFixed(1)}% engagement</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href={winner.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-background"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
                <Link href={`/dashboard/pinterest/adapt/${winner.id}`}>
                  <Button size="sm" variant="secondary" className="text-xs h-7 px-2">
                    Adapt
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No winners detected yet</p>
          <p className="text-xs mt-1">
            Connect TikTok or Instagram to track content performance
          </p>
        </div>
      )}

      {/* Recently Adapted Section */}
      {recentlyAdapted && recentlyAdapted.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Recently Adapted
          </p>
          <div className="flex gap-2">
            {recentlyAdapted.map((item: WinnerContent) => (
              <div
                key={item.id}
                className="relative w-10 h-10 rounded-md overflow-hidden bg-muted"
              >
                {item.image_url && (
                  <Image
                    src={item.image_url}
                    alt={item.title || 'Adapted content'}
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <Badge
                    variant="success"
                    className="text-[8px] px-1 py-0"
                  >
                    Done
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
