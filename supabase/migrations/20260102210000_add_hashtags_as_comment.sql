-- Add hashtags_as_comment column to instagram_scheduled_posts
-- This controls whether hashtags appear in the caption or as the first comment

ALTER TABLE instagram_scheduled_posts
ADD COLUMN IF NOT EXISTS hashtags_as_comment BOOLEAN DEFAULT true;

COMMENT ON COLUMN instagram_scheduled_posts.hashtags_as_comment IS
  'When true, hashtags are posted as the first comment instead of in the caption';
