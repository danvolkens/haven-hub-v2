'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
} from '@/components/ui';
import {
  Instagram,
  Users,
  UserPlus,
  Image,
  Heart,
  MessageCircle,
  ExternalLink,
  Globe,
  FileText,
  Calendar,
  Check,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  biography: string | null;
  website: string | null;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

interface InstagramMedia {
  id: string;
  caption: string | null;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

interface AccountData {
  profile: InstagramProfile;
  media: InstagramMedia[];
  connection: {
    connected_at: string;
    token_expires_at: string;
    page_name: string;
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function InstagramAccountPage() {
  const {
    data: account,
    isLoading,
    error,
    refetch,
  } = useQuery<AccountData>({
    queryKey: ['instagram-account'],
    queryFn: async () => {
      const res = await fetch('/api/instagram/account');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch account');
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <PageContainer title="Instagram Account">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (error || !account) {
    return (
      <PageContainer title="Instagram Account">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Instagram Not Connected</h3>
                <p className="text-muted-foreground mt-1">
                  {error?.message || 'Connect your Instagram Business account to view profile and media.'}
                </p>
              </div>
              <Link href="/api/integrations/instagram/install">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Instagram className="mr-2 h-5 w-5" />
                  Connect Instagram
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { profile, media, connection } = account;

  return (
    <PageContainer title="Instagram Account Overview">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Account Overview</h2>
              <p className="text-sm text-muted-foreground">
                Live data from Instagram API (instagram_basic permission)
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Profile Information</h3>
              <Badge variant="success" size="sm">
                <Check className="mr-1 h-3 w-3" />
                Live Data
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Profile fields retrieved using instagram_basic permission
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Picture & Handle */}
              <div className="flex flex-col items-center md:items-start gap-3">
                <img
                  src={profile.profile_picture_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full border-4 border-purple-200"
                />
                <div className="text-center md:text-left">
                  <h4 className="text-xl font-bold">@{profile.username}</h4>
                  <p className="text-muted-foreground">{profile.name}</p>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="flex-1 grid gap-4 md:grid-cols-2">
                {/* Account ID */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Instagram Account ID
                  </p>
                  <p className="font-mono text-sm mt-1">{profile.id}</p>
                </div>

                {/* Username */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Username (Handle)
                  </p>
                  <p className="text-sm mt-1">@{profile.username}</p>
                </div>

                {/* Name */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Display Name
                  </p>
                  <p className="text-sm mt-1">{profile.name || 'Not set'}</p>
                </div>

                {/* Followers */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1">
                    <Users className="h-3 w-3" /> Followers
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {profile.followers_count.toLocaleString()}
                  </p>
                </div>

                {/* Following */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> Following
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {profile.follows_count.toLocaleString()}
                  </p>
                </div>

                {/* Media Count */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1">
                    <Image className="h-3 w-3" /> Total Posts
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {profile.media_count.toLocaleString()}
                  </p>
                </div>

                {/* Biography */}
                <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase">
                    Biography
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {profile.biography || 'No biography set'}
                  </p>
                </div>

                {/* Website */}
                {profile.website && (
                  <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Website
                    </p>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm mt-1 text-primary hover:underline flex items-center gap-1"
                    >
                      {profile.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Info */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  <span>
                    Connected via: <strong>{connection.page_name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Connected: {format(parseISO(connection.connected_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Token expires: {format(parseISO(connection.token_expires_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media List Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Media List</h3>
                  <Badge variant="success" size="sm">
                    <Check className="mr-1 h-3 w-3" />
                    Live Data
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Recent posts from @{profile.username} retrieved via instagram_basic
                </p>
              </div>
              <Badge variant="secondary">
                Showing {media.length} of {profile.media_count} posts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {media.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No posts found on this account</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((post) => (
                  <MediaCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// ============================================================================
// Media Card Component
// ============================================================================

function MediaCard({ post }: { post: InstagramMedia }) {
  const imageUrl = post.thumbnail_url || post.media_url;
  const timestamp = parseISO(post.timestamp);

  const mediaTypeLabel = {
    IMAGE: 'Photo',
    VIDEO: 'Video',
    CAROUSEL_ALBUM: 'Carousel',
    REELS: 'Reel',
  };

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
    >
      {/* Media Image */}
      <img
        src={imageUrl}
        alt={post.caption || 'Instagram post'}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
        {/* Top: Type badge */}
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="text-xs">
            {mediaTypeLabel[post.media_type]}
          </Badge>
          <ExternalLink className="h-4 w-4 text-white" />
        </div>

        {/* Bottom: Stats */}
        <div>
          <div className="flex items-center gap-3 text-white text-sm">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {post.like_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.comments_count.toLocaleString()}
            </span>
          </div>
          <p className="text-white/80 text-xs mt-1">
            {format(timestamp, 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Post ID Label (visible) */}
      <div className="absolute top-2 left-2">
        <span className="text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded font-mono">
          ID: {post.id.slice(-8)}
        </span>
      </div>
    </a>
  );
}
