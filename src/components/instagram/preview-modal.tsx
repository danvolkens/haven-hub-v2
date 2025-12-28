'use client';

import { useState } from 'react';
import {
  Button,
  Badge,
} from '@/components/ui';
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Grid3x3,
  PlaySquare,
  User,
  Check,
  Circle,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Facebook,
  Hash,
  ImageIcon,
  Tag,
  Clock,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'feed' | 'grid' | 'reels';

interface PostPreviewData {
  post_type: 'feed' | 'reel' | 'story' | 'carousel';
  asset_url: string;
  asset_type: 'image' | 'video';
  caption: string;
  hashtags: string[];
  hashtags_as_comment: boolean;
  alt_text: string;
  product_name?: string;
  thumbnail_time?: number;
  cross_post_facebook: boolean;
  scheduled_at: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onBack: () => void;
  post: PostPreviewData;
  profilePic?: string;
  username?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VIEW_MODES: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'feed', label: 'Feed', icon: ImageIcon },
  { value: 'grid', label: 'Profile Grid', icon: Grid3x3 },
  { value: 'reels', label: 'Reels Tab', icon: PlaySquare },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatScheduleDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function truncateCaption(caption: string, maxLength: number = 125): string {
  if (caption.length <= maxLength) return caption;
  return caption.slice(0, maxLength).trim() + '...';
}

// ============================================================================
// Components
// ============================================================================

interface ChecklistItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isValid: boolean;
}

function ChecklistItem({ icon: Icon, label, value, isValid }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          isValid ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isValid ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}:</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

interface FeedPreviewProps {
  post: PostPreviewData;
  profilePic: string;
  username: string;
}

function FeedPreview({ post, profilePic, username }: FeedPreviewProps) {
  const displayCaption = post.hashtags_as_comment
    ? post.caption
    : `${post.caption}\n\n${post.hashtags.join(' ')}`;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ width: '320px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-0.5">
          <div className="h-full w-full rounded-full overflow-hidden bg-white p-0.5">
            {profilePic ? (
              <img src={profilePic} alt={username} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{username}</p>
        </div>
        <button className="text-gray-600">•••</button>
      </div>

      {/* Media */}
      <div className="aspect-square bg-gray-100 relative">
        {post.asset_type === 'video' ? (
          <>
            <video
              src={post.asset_url}
              className="w-full h-full object-cover"
              poster={post.asset_url}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                <PlaySquare className="h-8 w-8 text-gray-900 ml-1" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={post.asset_url}
            alt={post.alt_text}
            className="w-full h-full object-cover"
          />
        )}
        {post.post_type === 'carousel' && (
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            1/3
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-gray-900" />
          <MessageCircle className="h-6 w-6 text-gray-900" />
          <Send className="h-6 w-6 text-gray-900" />
        </div>
        <Bookmark className="h-6 w-6 text-gray-900" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{username}</span>{' '}
          {truncateCaption(displayCaption)}
          {displayCaption.length > 125 && (
            <span className="text-gray-500 ml-1">more</span>
          )}
        </p>
        {post.hashtags_as_comment && post.hashtags.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            View all {post.hashtags.length > 0 ? 1 : 0} comments
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Scheduled • {formatScheduleDate(post.scheduled_at).split(' at ')[0]}
        </p>
      </div>
    </div>
  );
}

function GridPreview({ post }: { post: PostPreviewData }) {
  return (
    <div className="grid grid-cols-3 gap-1" style={{ width: '320px' }}>
      {/* Show as part of a 3x3 grid */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <div key={i} className="aspect-square bg-gray-200 relative overflow-hidden">
          {i === 1 ? (
            <>
              {post.asset_type === 'video' ? (
                <>
                  <img
                    src={post.asset_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                  <PlaySquare className="absolute top-1 right-1 h-4 w-4 text-white drop-shadow-lg" />
                </>
              ) : (
                <img
                  src={post.asset_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              )}
              {post.post_type === 'carousel' && (
                <div className="absolute top-1 right-1">
                  <Grid3x3 className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
        </div>
      ))}
    </div>
  );
}

function ReelsPreview({ post, profilePic, username }: FeedPreviewProps) {
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-black"
      style={{ width: '200px', height: '356px' }}
    >
      {/* Video Background */}
      <div className="absolute inset-0">
        {post.asset_url ? (
          <img
            src={post.asset_url}
            alt="Reel"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      </div>

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
          <PlaySquare className="h-6 w-6 text-white ml-0.5" />
        </div>
      </div>

      {/* Actions Sidebar */}
      <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4">
        <button className="flex flex-col items-center">
          <Heart className="h-6 w-6 text-white" />
          <span className="text-xs text-white mt-1">-</span>
        </button>
        <button className="flex flex-col items-center">
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="text-xs text-white mt-1">-</span>
        </button>
        <button>
          <Send className="h-6 w-6 text-white" />
        </button>
        <button>
          <Bookmark className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Caption Overlay */}
      <div className="absolute bottom-0 left-0 right-10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full overflow-hidden bg-white/20">
            {profilePic ? (
              <img src={profilePic} alt={username} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-white">{username}</span>
        </div>
        <p className="text-xs text-white/90 line-clamp-2">
          {truncateCaption(post.caption, 80)}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PreviewModal({
  isOpen,
  onClose,
  onConfirm,
  onBack,
  post,
  profilePic = '',
  username = 'your_account',
}: PreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('feed');

  if (!isOpen) return null;

  // Build checklist items
  const checklistItems: ChecklistItemProps[] = [
    {
      icon: MessageCircle,
      label: 'Caption',
      value: `${post.caption.length} characters (under 2,200 limit)`,
      isValid: post.caption.length > 0 && post.caption.length <= 2200,
    },
    {
      icon: Hash,
      label: 'Hashtags',
      value: post.hashtags_as_comment
        ? `${post.hashtags.length} tags (will post as first comment)`
        : `${post.hashtags.length} tags (in caption)`,
      isValid: post.hashtags.length > 0 && post.hashtags.length <= 30,
    },
    {
      icon: ImageIcon,
      label: 'Alt text',
      value: post.alt_text ? 'Added' : 'Not added',
      isValid: !!post.alt_text,
    },
  ];

  if (post.product_name) {
    checklistItems.push({
      icon: Tag,
      label: 'Product tag',
      value: post.product_name,
      isValid: true,
    });
  }

  if (post.asset_type === 'video' && post.thumbnail_time !== undefined) {
    checklistItems.push({
      icon: Clock,
      label: 'Thumbnail',
      value: `Frame at ${post.thumbnail_time}s selected`,
      isValid: true,
    });
  }

  if (post.cross_post_facebook) {
    checklistItems.push({
      icon: Facebook,
      label: 'Facebook',
      value: 'Will cross-post',
      isValid: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-elevation-3">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-surface px-6 py-4">
          <h2 className="text-xl font-semibold">Preview Post</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left Column - Device Preview */}
          <div className="space-y-4">
            {/* View Switcher */}
            <div className="flex justify-center gap-1 p-1 bg-muted rounded-lg">
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = viewMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    onClick={() => setViewMode(mode.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-surface shadow-sm text-sage'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Device Frame */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative rounded-[40px] border-[12px] border-gray-800 bg-gray-800 p-1 shadow-xl">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-800 rounded-b-xl z-10" />

                  {/* Screen */}
                  <div className="relative rounded-[28px] overflow-hidden bg-white">
                    <div className="pt-8 px-2 pb-4 flex justify-center">
                      {viewMode === 'feed' && (
                        <FeedPreview post={post} profilePic={profilePic} username={username} />
                      )}
                      {viewMode === 'grid' && <GridPreview post={post} />}
                      {viewMode === 'reels' && (
                        <ReelsPreview post={post} profilePic={profilePic} username={username} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Checklist & Actions */}
          <div className="space-y-6">
            {/* Validation Checklist */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Pre-publish Checklist</h3>
              <div className="space-y-1">
                {checklistItems.map((item, idx) => (
                  <ChecklistItem key={idx} {...item} />
                ))}
              </div>
            </div>

            {/* Schedule Summary */}
            <div className="bg-sage/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-sage" />
                <div>
                  <p className="text-sm font-medium">Scheduled for</p>
                  <p className="text-lg font-semibold">{formatScheduleDate(post.scheduled_at)}</p>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {post.caption.length === 0 && (
              <div className="flex items-start gap-3 bg-warning/10 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Missing caption</p>
                  <p className="text-sm text-muted-foreground">
                    Posts without captions typically get less engagement.
                  </p>
                </div>
              </div>
            )}

            {!post.alt_text && (
              <div className="flex items-start gap-3 bg-muted rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No alt text</p>
                  <p className="text-sm text-muted-foreground">
                    Alt text helps make your content accessible to everyone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-surface px-6 py-4">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button onClick={onConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Confirm & Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
