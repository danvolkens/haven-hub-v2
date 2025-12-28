# Haven Hub Instagram & Video Automation: Build Prompts

*Sequential prompts for building with Claude Code*

---

## How to Use This Document

1. **Work sequentially** — prompts build on each other
2. **One prompt per session** — keeps context focused
3. **Reference the spec** — each prompt points to relevant sections
4. **Test before moving on** — each prompt has acceptance criteria

**Spec Reference:** `Haven_Hub_Instagram_Video_Automation_Architecture_v2.md`

---

## Phase 1: Database Foundation

### Prompt 1.1: Core Instagram Tables

```
Create the database schema for Instagram automation in Supabase.

Tables needed:
1. instagram_connections - OAuth tokens, account info
2. instagram_templates - Caption templates with content pillars
3. hashtag_groups - Tiered hashtag system (brand/mega/large/niche)
4. instagram_scheduled_posts - Main scheduling table

Key fields for instagram_templates:
- template_type (feed/reel/story/carousel)
- content_pillar (product_showcase/brand_story/educational/community)
- collection (grounding/wholeness/growth/general)
- caption_template (TEXT with {{variables}})
- caption_formula (single_quote/lifestyle/behind_quote/educational_value/ugc_feature)
- preferred_days (INTEGER[] for day-of-week affinity)

Key fields for hashtag_groups:
- tier (brand/mega/large/niche)
- estimated_reach (1B+, 100M-1B, 10M-100M)
- hashtags (TEXT[])

Key fields for instagram_scheduled_posts:
- content_pillar
- post_type (feed/reel/story/carousel)
- status (draft/scheduled/publishing/published/failed)
- Include indexes for status+scheduled_at and content_pillar queries

Reference: Spec sections "Database Schema: Templates", "Database Schema: Hashtag Groups", "Database Schema: Scheduled Posts"

Deliverables:
- SQL migration file
- TypeScript types for each table
- Supabase client setup if not exists
```

**Acceptance Criteria:**
- [ ] All 4 tables created with proper foreign keys
- [ ] Indexes on frequently queried columns
- [ ] TypeScript types exported
- [ ] Can insert/query test records

---

### Prompt 1.2: Video & Asset Tables

```
Create database tables for video generation pipeline.

Tables needed:
1. video_templates - Creatomate template metadata
2. video_hooks - Hook library with performance tracking
3. stock_footage - Pexels video pool
4. music_tracks - Epidemic Sound pool
5. video_thumbnails - Generated thumbnail options

Key fields for video_hooks:
- hook_text, hook_type (pattern_interrupt/question/statement/controversial/story)
- collections TEXT[], content_types TEXT[]
- usage_count, avg_completion_rate, avg_engagement_rate

Key fields for stock_footage:
- source, source_id, video_url
- collection, mood_tags TEXT[]
- usage_count, last_used_at
- orientation (must be 'portrait')

Key fields for music_tracks:
- source (epidemic_sound), file_url
- collection, mood_tags, duration_seconds, bpm
- usage_count, last_used_at

Include selection indexes: (collection, is_active, last_used_at NULLS FIRST)

Reference: Spec sections "Hooks Library", "Stock Footage Management", "Music Pool Management"

Deliverables:
- SQL migration file
- TypeScript types
- Seed data for video_hooks (20+ hooks from spec)
```

**Acceptance Criteria:**
- [ ] All 5 tables created
- [ ] 20+ hooks seeded from spec's pre-built hooks
- [ ] Selection indexes work (can query least-recently-used)
- [ ] TypeScript types exported

---

### Prompt 1.3: Stories & TikTok Tables

```
Create database tables for Stories hybrid system and TikTok queue.

Tables needed:
1. instagram_stories - Story scheduling (auto + manual queue)
2. story_templates - Templates for different story types
3. tiktok_queue - Manual posting queue
4. tiktok_posting_log - Track daily posting streak

Key fields for instagram_stories:
- story_type (quote_daily/product_highlight/poll/quiz_cta/bts/ugc)
- schedule_type (auto/manual_queue)
- target_time_slot (morning/midday/afternoon/evening)
- poll_question, poll_options TEXT[] (for interactive stories)
- expires_at (24 hours after posting)

Key fields for tiktok_queue:
- content_type (quote_reveal/educational/transformation/story)
- hook_id, hook_text
- target_date, slot_type (morning/evening)
- Performance fields: views, likes, comments, shares

Reference: Spec sections "Stories Hybrid Strategy", "TikTok Queue"

Deliverables:
- SQL migration file
- TypeScript types
- Seed story_templates (Daily Quote, Product Highlight, Quiz CTA, Poll, BTS)
```

**Acceptance Criteria:**
- [ ] All 4 tables created
- [ ] Story templates seeded
- [ ] Can track posting streak via tiktok_posting_log
- [ ] TypeScript types exported

---

## Phase 2: Template System

### Prompt 2.1: Caption Template Engine

```
Build the caption template variable substitution engine.

Supported variables:
- {{quote_text}}, {{quote_author}}
- {{collection_name}}, {{collection_lower}}, {{collection_meaning}}
- {{product_name}}, {{product_url}}
- {{shop_handle}}
- {{cta_link}}, {{cta_quiz}}
- {{customer_handle}} (for UGC)

Function signature:
applyTemplate(template: InstagramTemplate, context: TemplateContext): string

Context includes:
- quote: Quote record
- product?: ShopifyProduct
- customer?: { handle: string }
- settings: UserSettings (for cta_link, shop_handle)

Collection meanings:
- grounding: "stability and safety"
- wholeness: "self-compassion and acceptance"
- growth: "transformation and becoming"

Reference: Spec section "Template Variables"

Deliverables:
- templateEngine.ts with applyTemplate function
- Unit tests for all variable substitutions
- Handle missing optional variables gracefully
```

**Acceptance Criteria:**
- [ ] All variables substitute correctly
- [ ] Missing optional variables don't break output
- [ ] Collection meanings auto-populate
- [ ] Unit tests pass

---

### Prompt 2.2: Seed Default Templates

```
Create and seed the 15+ default Instagram caption templates.

Templates to create (from spec):

PRODUCT SHOWCASE (40%):
1. Single Quote Showcase (feed)
2. Quote Reveal Reel (reel)
3. Lifestyle Styled Shot (feed)
4. Product Detail Close-Up (feed)

BRAND STORY (20%):
5. Behind the Quote (feed/carousel)
6. Why Not Motivation (reel)
7. Sunday Reflection (carousel)

EDUCATIONAL (20%):
8. How To Print Guide (carousel)
9. Quotes For Situation (carousel)
10. Collection Explainer (reel)
11. Framing Tips (carousel)

COMMUNITY (20%):
12. Customer Feature (feed)
13. UGC Repost (feed)
14. Community Question (feed)

COLLECTION-SPECIFIC:
15. Grounding Collection (feed/reel)
16. Wholeness Collection (feed/reel)
17. Growth Collection (feed/reel)

Each template needs:
- name, template_type, content_pillar, collection
- caption_template (full text from spec)
- caption_formula
- preferred_days (based on day-specific strategy)

Reference: Spec section "Pre-Built Templates"

Deliverables:
- Seed migration or seed script
- All 17 templates with full caption text
```

**Acceptance Criteria:**
- [ ] All 17 templates seeded
- [ ] Each has correct content_pillar
- [ ] preferred_days matches day strategy (Mon=educational, Tue=product, etc.)
- [ ] Templates render correctly with test data

---

### Prompt 2.3: Seed Hashtag Groups

```
Create and seed the tiered hashtag system.

Groups to create:

BRAND (always include):
- Brand Core: #havenandhold, #quietanchors

MEGA (1B+ views, select 4-5):
- Mega General: #homedecor, #wallart, #diy, #smallbusiness, #fyp

LARGE (100M-1B, select 4-5):
- Large Home & Art: #minimalistart, #roomtransformation, #homeoffice, #digitaldownload, #printableart
- Large Mental Health: #mentalhealthmatters, #selfcare, #healingjourney, #anxietyrelief, #therapytok

NICHE (10M-100M, select 5-7):
- Niche Therapeutic: #therapyoffice, #traumahealing, #mindfulhome, #quoteart, #calmspaces, #sanctuaryhome, #intentionalliving
- Niche Decor: #bedroomdecor, #minimalistdecor, #apartmentdecor, #gallerywall, #neutraldecor, #cozyhome, #peacefulspaces

Also create rotation_sets table and seed 3 sets:
- Set A: Therapeutic Focus (Brand + Mega + Large Mental Health + Niche Therapeutic)
- Set B: Home Decor Focus (Brand + Mega + Large Home & Art + Niche Decor)
- Set C: Balanced Mix (Brand + Mega + Large Home & Art + Niche Therapeutic)

Reference: Spec section "Tiered Hashtag System"

Deliverables:
- Seed migration with all groups
- rotation_sets table and seed data
```

**Acceptance Criteria:**
- [ ] 6 hashtag groups seeded with correct tiers
- [ ] 3 rotation sets created
- [ ] Can query groups by tier
- [ ] Total hashtags per set = 15-18

---

### Prompt 2.4: Hashtag Auto-Generation

```
Build the hashtag auto-generation algorithm.

Function signature:
generateHashtags(collection: string, contentPillar: string, excludeRecent?: number): Promise<string[]>

Logic:
1. Always include Brand tier (2 tags)
2. Add Mega tier (4-5 random tags)
3. Add Large tier based on content_pillar:
   - educational or brand_story → Large Mental Health
   - product_showcase or community → Large Home & Art
4. Add Niche tier based on collection:
   - grounding or wholeness → Niche Therapeutic
   - growth or general → Niche Decor
5. Filter out hashtags used in last N posts (default 5)
6. Filter out banned hashtags
7. Track rotation set usage
8. Return 17-20 hashtags

Also create:
- getRecentPostHashtags(n: number): Promise<string[]>
- getBannedHashtags(): Promise<string[]>
- incrementRotationSetUsage(setId: string): Promise<void>

Reference: Spec section "Auto-Generation Algorithm"

Deliverables:
- hashtagGenerator.ts
- Unit tests
- Integration with scheduled_posts table
```

**Acceptance Criteria:**
- [ ] Returns 17-20 hashtags
- [ ] Brand tags always included
- [ ] Tier selection follows content_pillar logic
- [ ] Recent hashtags excluded
- [ ] Rotation tracked

---

## Phase 3: Scheduling Core

### Prompt 3.1: Day-Specific Scheduling Logic

```
Build the smart scheduling system that follows day-specific content strategy.

Day mapping:
- Sunday (0): carousel + brand_story, 10:00 AM
- Monday (1): carousel + educational, 11:00 AM
- Tuesday (2): reel + product_showcase, 9:00 AM
- Wednesday (3): feed + product_showcase, 1:00 PM
- Thursday (4): reel + brand_story (12pm), carousel + educational (7pm)
- Friday (5): feed + community, 11:00 AM
- Saturday (6): reel (9am) + feed (1pm), both product_showcase

Function signature:
findOptimalSlot(postType: string, contentPillar: string, preferredDate?: Date): Promise<ScheduleSlot>

Returns:
{
  scheduled_at: Date,
  day_theme: string,
  is_optimal: boolean
}

Logic:
1. Look ahead 14 days from preferredDate (or now)
2. Find days where postType + contentPillar match the day config
3. Check slot isn't already taken
4. Return first available optimal slot
5. Fallback to any available slot if no optimal found

Reference: Spec section "Day-Specific Content Strategy"

Deliverables:
- scheduler.ts with findOptimalSlot
- DAY_CONTENT_MAP constant
- Unit tests for various scenarios
```

**Acceptance Criteria:**
- [ ] Respects day-specific content mapping
- [ ] Doesn't double-book time slots
- [ ] Falls back gracefully when optimal not available
- [ ] Returns correct day_theme

---

### Prompt 3.2: Weekly Mix Validation

```
Build the content pillar balance tracking system.

Function signature:
getWeeklyPillarBalance(weekStartDate: Date): Promise<PillarBalance>

Returns:
{
  balance: Array<{
    pillar: string,
    label: string,
    count: number,
    actual: number (percentage),
    target: number (percentage),
    status: 'ok' | 'warning',
    suggestion: string | null
  }>,
  total: number,
  weekStartDate: Date
}

Targets:
- product_showcase: 40% (min 30%)
- brand_story: 20% (min 15%)
- educational: 20% (min 15%)
- community: 20% (min 15%)

Suggestions when under minimum:
- product_showcase: "Schedule a quote reveal or product showcase"
- brand_story: "Add a 'behind the quote' or brand story post"
- educational: "Schedule a how-to carousel or tips post"
- community: "Feature a customer photo or ask a community question"

Reference: Spec section "Weekly Content Mix Enforcement"

Deliverables:
- pillarBalance.ts
- getSuggestionForPillar helper
- Unit tests
```

**Acceptance Criteria:**
- [ ] Calculates percentages correctly
- [ ] Warning status when below minimum
- [ ] Returns actionable suggestions
- [ ] Works with 0 posts (no division errors)

---

### Prompt 3.3: Instagram API Publishing

```
Build the Instagram Graph API publishing integration.

Functions needed:

1. createMediaContainer(post: ScheduledPost): Promise<string>
   - Handles feed, reel, story, carousel types
   - Uses correct media_type for each

2. waitForContainerReady(containerId: string): Promise<void>
   - Polls status until ready
   - Timeout after 60 seconds

3. publishContainer(containerId: string): Promise<PublishResult>
   - Publishes the container
   - Returns instagram_media_id

4. postHashtagsAsFirstComment(mediaId: string, hashtags: string[]): Promise<void>
   - Posts hashtags as first comment

5. createCarouselContainer(post: ScheduledPost): Promise<string>
   - Creates child containers for each asset
   - Creates parent carousel container

API endpoints:
- POST /{ig-user-id}/media - Create container
- POST /{ig-user-id}/media_publish - Publish
- POST /{media-id}/comments - First comment

Reference: Spec sections "API Endpoints Used", "Carousel Support", "Publishing Flow"

Deliverables:
- instagramApi.ts with all functions
- Error handling for common API errors
- Rate limit awareness (log remaining calls)
```

**Acceptance Criteria:**
- [ ] Can create and publish feed post
- [ ] Can create and publish reel
- [ ] Can create and publish carousel
- [ ] Hashtags posted as first comment
- [ ] Errors caught and logged

---

### Prompt 3.4: Publishing Job (Trigger.dev)

```
Create the Trigger.dev scheduled job that publishes due posts.

Job: publish-instagram-post
Schedule: Every 5 minutes (*/5 * * * *)

Logic:
1. Query posts where status='scheduled' AND scheduled_at <= now
2. For each due post:
   a. Update status to 'publishing'
   b. Create media container
   c. Wait for ready
   d. Publish
   e. Post hashtags as first comment
   f. Add shopping tag if configured
   g. Cross-post to Facebook if enabled
   h. Update status to 'published', set instagram_media_id
   i. Log to activity feed
3. On error: call handlePublishError

handlePublishError logic:
- Check if retryable (RATE_LIMITED, TEMPORARY_ERROR, NETWORK_ERROR)
- If retryable and retry_count < 3: exponential backoff (5min, 15min, 45min)
- Else: set status='failed', notify user

Reference: Spec section "Publishing Flow", "Error Handling & Retry"

Deliverables:
- Trigger.dev job file
- handlePublishError function
- Activity logging integration
```

**Acceptance Criteria:**
- [ ] Job runs every 5 minutes
- [ ] Publishes due posts in order
- [ ] Retries with exponential backoff
- [ ] Failed posts notify user
- [ ] Activity logged

---

## Phase 4: Video Pipeline

### Prompt 4.1: Stock Footage Selection

```
Build the smart stock footage selection algorithm.

Function signature:
selectFootage(collection: string, excludeIds?: string[]): Promise<StockFootage>

Logic:
1. Query footage where:
   - collection matches OR collection='general' (fallback)
   - is_active = true
   - orientation = 'portrait'
2. Prioritize unused (usage_count = 0)
3. Then least recently used (ORDER BY last_used_at ASC NULLS FIRST)
4. Exclude any IDs in excludeIds array
5. If no footage in collection, fallback to 'general'
6. Update usage_count and last_used_at on selection

Also build:
checkPoolHealth(): Promise<PoolHealthAlert[]>
- Returns warnings for pools with < 20 videos
- Returns critical for pools with < 10 videos
- Returns warning if 0 unused videos in pool

Reference: Spec section "Smart Selection Algorithm", "Pool Health Monitoring"

Deliverables:
- stockFootage.ts with selectFootage
- checkPoolHealth function
- Unit tests
```

**Acceptance Criteria:**
- [ ] Prioritizes unused footage
- [ ] Falls back to general pool
- [ ] Updates usage tracking
- [ ] Pool health returns correct alerts

---

### Prompt 4.2: Music Selection

```
Build the music track selection algorithm (same pattern as footage).

Function signature:
selectMusic(collection: string, excludeIds?: string[]): Promise<MusicTrack>

Logic mirrors selectFootage:
1. Query tracks matching collection (or fallback to general)
2. Prioritize unused, then least recently used
3. Update usage tracking on selection

Collection → Mood mapping for future filtering:
- grounding: warm, stable, anchoring (60-80 BPM)
- wholeness: tender, nurturing, gentle
- growth: hopeful, emerging, building
- general: calm, sanctuary, neutral

Reference: Spec section "Music Pool Management"

Deliverables:
- musicTracks.ts with selectMusic
- Pool health check for music
- Unit tests
```

**Acceptance Criteria:**
- [ ] Selection logic works
- [ ] Falls back to general
- [ ] Usage tracked
- [ ] Pool health monitoring

---

### Prompt 4.3: Hook Selection

```
Build the video hook selection algorithm with performance weighting.

Function signature:
selectHook(collection: string, contentType: string): Promise<VideoHook>

Logic:
1. Query hooks where:
   - is_active = true
   - collection IN collections array
   - contentType IN content_types array
2. Calculate score for each:
   - If has performance data: (avg_completion_rate * 100) + (1 / (usage_count + 1)) * 50
   - If no data: 50 + (1 / (usage_count + 1)) * 50
3. Weighted random selection based on score
4. Update usage_count on selection

Reference: Spec section "Hook Selection Algorithm"

Deliverables:
- hooks.ts with selectHook
- weightedRandomSelect helper function
- Unit tests
```

**Acceptance Criteria:**
- [ ] Filters by collection and content type
- [ ] Weights by performance when available
- [ ] New hooks get fair chance
- [ ] Usage tracked

---

### Prompt 4.4: Creatomate Integration

```
Build the Creatomate video rendering integration.

Functions needed:

1. renderVideo(quoteId: string): Promise<RenderJob>
   - Get quote, select footage, music, template, hook
   - Call Creatomate API with modifications
   - Request thumbnail snapshots at 2s, 4s, 6s
   - Return render job info

2. Webhook handler: POST /api/webhooks/creatomate
   - Parse render completion payload
   - Download and store video in asset library
   - Generate thumbnail records
   - Update usage tracking for footage/music/hook
   - Trigger post scheduling based on Operator Mode
   - Log to activity feed

Creatomate API call structure:
{
  template_id: string,
  modifications: {
    'Quote-Text': string,
    'Background-Video': string,
    'Music-Track': string,
    'Hook-Text': string
  },
  render_preset: 'social-media-pack',
  output_format: 'mp4',
  snapshot_time: [2, 4, 6],
  metadata: { quote_id, footage_id, music_id, hook_id }
}

Reference: Spec section "Creatomate Integration"

Deliverables:
- creatomate.ts with renderVideo
- Webhook API route
- Asset storage integration
```

**Acceptance Criteria:**
- [ ] API call succeeds with test template
- [ ] Webhook receives and processes completion
- [ ] 3 thumbnails generated
- [ ] Video stored in asset library
- [ ] Usage tracking updated

---

## Phase 5: UI Components

### Prompt 5.1: Instagram Dashboard

```
Build the Instagram overview dashboard page.

Components:
1. Weekly Performance Card
   - Posts published count
   - Total reach
   - Engagement rate (with trend arrow)
   - Saves count
   - Profile visits

2. Posting Streak Card
   - Current streak (days)
   - Visual calendar showing last 2 weeks
   - Checkmarks for posted days

3. Content Pillar Balance Widget
   - 4 horizontal bars (Product/Brand/Educational/Community)
   - Shows actual % vs target %
   - Warning icon if under minimum
   - Suggestion text for underweight pillars

4. Quick Actions
   - Schedule Post button
   - Bulk Schedule button
   - View Calendar button
   - Analytics button

5. Upcoming This Week List
   - Grouped by day
   - Shows time, quote excerpt, post type, pillar

6. Needs Attention Panel
   - Pillar balance warnings
   - Missing stories warning
   - Review queue count

Use: React, Tailwind, shadcn/ui components

Reference: Spec section "Instagram Dashboard (Home View)"

Deliverables:
- Dashboard page component
- Individual card components
- Data fetching hooks
```

**Acceptance Criteria:**
- [ ] All 6 sections render
- [ ] Real data from database
- [ ] Responsive layout
- [ ] Warning states visible

---

### Prompt 5.2: Calendar View

```
Build the Instagram scheduler calendar view.

Features:
1. Month/Week toggle
2. Day cells showing scheduled posts
   - Icon for post type (📷 feed, 🎬 reel, 📱 story)
   - Time badge
   - Quote preview on hover
3. Click day to see posts for that day
4. Click post to open edit modal
5. Drag-and-drop to reschedule (optional, can skip)

Sidebar:
- Upcoming posts list
- Optimal times for the week with engagement %
- Legend for icons

Filter bar:
- Filter by post type
- Filter by status (draft/scheduled/published)
- Filter by pillar

Reference: Spec section "Instagram Scheduler Page"

Deliverables:
- Calendar page component
- Day cell component
- Post preview tooltip
- Filter state management
```

**Acceptance Criteria:**
- [ ] Calendar renders with posts
- [ ] Can switch month/week view
- [ ] Filters work
- [ ] Click opens post detail

---

### Prompt 5.3: New Post Modal

```
Build the new/edit post modal.

Sections:
1. Post Type selector (Feed/Reel/Story/Carousel radio)
2. Asset preview (video player or image)
   - Change Asset button
   - Select Thumbnail button (for video)
3. Caption editor
   - Template dropdown with Apply button
   - Edit Caption toggle for manual editing
   - Character count
4. Hashtags display
   - Count (e.g., "18/30")
   - Edit Groups button
   - Toggle: Post as first comment
5. Alt Text field with Auto-regenerate button
6. Shopping tag dropdown (Shopify products)
7. Schedule options
   - "Best available time" with preview
   - Custom date/time pickers
8. Cross-post to Facebook toggle
9. Campaign tag dropdown
10. Preview Post button
11. Action buttons: Save as Draft, Schedule Post

Reference: Spec section "New Post Modal"

Deliverables:
- Modal component
- Form state management
- Template application logic
- Validation
```

**Acceptance Criteria:**
- [ ] All form fields work
- [ ] Template applies to caption
- [ ] Can save as draft or schedule
- [ ] Validation prevents invalid posts

---

### Prompt 5.4: Preview Modal

```
Build the preview-before-publish modal.

Features:
1. Instagram device frame mockup
2. Post preview showing:
   - Profile pic and username
   - Media (image/video with play button)
   - Like/comment/share/save icons
   - Caption preview (truncated with "more")
3. View switcher: Feed / Profile Grid / Reels Tab
4. Validation checklist:
   - ✓ Caption: X characters (under 2,200 limit)
   - ✓ Hashtags: X tags (will post as first comment)
   - ✓ Alt text: Added
   - ✓ Product tag: [product name]
   - ✓ Thumbnail: Frame at Xs selected
   - ○ Facebook: Will cross-post
5. Schedule summary: "Tuesday, December 30 at 9:00 AM EST"
6. Action buttons: Back to Edit, Confirm & Schedule

Reference: Spec section "Preview Before Publish Modal"

Deliverables:
- Preview modal component
- Device frame mockup (CSS)
- View switcher logic
- Checklist component
```

**Acceptance Criteria:**
- [ ] Looks like real Instagram
- [ ] View switcher changes display
- [ ] Checklist accurate
- [ ] Can go back or confirm

---

### Prompt 5.5: Bulk Schedule Modal

```
Build the bulk scheduling modal.

Features:
1. Quote selector
   - Checkbox list of approved quotes
   - Shows video status (ready ✓, pending ◐)
   - Select All Ready button
   - Count of selected

2. Scheduling options
   - Radio: Auto-assign optimal times / Custom schedule
   - If custom: Start date picker, posts per day dropdown, time pickers

3. Content settings (apply to all)
   - Template: Auto-select by collection / specific template
   - Checkboxes: Auto hashtags, auto alt text, cross-post FB, shopping tags
   - Campaign tag dropdown

4. Preview schedule
   - List showing: Date, time, quote, post type
   - Content mix summary with warning if unbalanced

5. Action buttons: Cancel, Schedule X Posts

Logic:
- Call bulkSchedulePosts function
- Validate weekly mix
- Show warnings before confirming

Reference: Spec section "Bulk Scheduling"

Deliverables:
- Bulk schedule modal component
- bulkSchedulePosts function
- Mix validation integration
```

**Acceptance Criteria:**
- [ ] Can select multiple quotes
- [ ] Auto-assign distributes correctly
- [ ] Custom schedule works
- [ ] Mix warnings shown
- [ ] Creates all posts on confirm

---

### Prompt 5.6: Thumbnail Selection Modal

```
Build the video thumbnail selection modal.

Features:
1. Display 3 thumbnail options in a row
   - Each shows frame image
   - Timestamp label (2s, 4s, 6s)
   - Radio button for selection
2. Currently selected has checkmark
3. Tip text: "Choose a frame where the quote text is fully visible"
4. Action buttons: Cancel, Save Selection

Updates:
- selected_thumbnail_id on scheduled post
- Default selection: middle frame (4s)

Reference: Spec section "Video Thumbnail Selection"

Deliverables:
- Thumbnail modal component
- Selection state management
- Save to database
```

**Acceptance Criteria:**
- [ ] Shows 3 thumbnails
- [ ] Can select different one
- [ ] Saves selection
- [ ] Default is middle frame

---

## Phase 6: Stories System

### Prompt 6.1: Stories Queue UI

```
Build the Stories management page with hybrid approach.

Features:
1. Today's Stories timeline
   - Horizontal scroll of story slots
   - Shows: time, type, status (AUTO badge or manual)
   - Posted (✓), Scheduled (○), Empty (+)
   - Progress: "5/7 target"

2. Auto-scheduled stories section
   - Morning Quote (9 AM) - shows preview
   - Product Highlight (2 PM) - shows preview
   - Status badges

3. Manual Queue section
   - List of ready-to-post stories
   - Each shows: thumbnail, type, caption
   - Buttons: Copy to App, Mark Posted
   - Suggested time slot

4. Add Story button
   - Opens creation modal
   - Type selector: Poll, Quiz CTA, BTS, Custom

5. Tip: "3-7 stories/day keeps you visible. Mix auto + manual."

Reference: Spec section "Stories Hybrid Strategy", "Stories Queue UI"

Deliverables:
- Stories page component
- Timeline component
- Manual queue list
- Story creation modal
```

**Acceptance Criteria:**
- [ ] Timeline shows today's stories
- [ ] Auto vs manual clearly distinguished
- [ ] Can mark manual stories as posted
- [ ] Can create new story

---

### Prompt 6.2: Auto Stories Job

```
Create the Trigger.dev job that schedules daily auto-stories.

Job: schedule-auto-stories
Schedule: 8 PM daily (0 20 * * *)

Logic:
1. Get tomorrow's date
2. Select random approved quote for morning story
3. Generate story asset (quote on branded background)
4. Insert instagram_stories record:
   - story_type: 'quote_daily'
   - schedule_type: 'auto'
   - scheduled_at: tomorrow 9 AM
   - status: 'scheduled'

5. Get featured product for afternoon story
6. Insert instagram_stories record:
   - story_type: 'product_highlight'
   - schedule_type: 'auto'
   - scheduled_at: tomorrow 2 PM
   - status: 'scheduled'

7. Log to activity feed

Also create: publishStory job
- Runs every 5 minutes
- Publishes due auto-scheduled stories
- Uses Instagram Stories API

Reference: Spec section "Auto-Scheduled Story Flow"

Deliverables:
- schedule-auto-stories job
- publish-story job
- Story asset generation (simple branded background)
```

**Acceptance Criteria:**
- [ ] Job creates 2 stories for next day
- [ ] Stories publish at correct times
- [ ] Activity logged
- [ ] Handles weekends same as weekdays

---

## Phase 7: TikTok Queue

### Prompt 7.1: TikTok Queue Page

```
Build the TikTok manual queue page.

Features:
1. Week view header
   - Shows Mon-Sun with AM/PM slots
   - Visual: ✓ Posted, ○ Ready, ◐ Pending, empty
   - Streak counter: "🔥 12 days"

2. Today's slots
   - Morning slot (7-9 AM)
   - Evening slot (7-9 PM)
   - Each shows video preview, hook, caption preview

3. Ready to Post section
   - Cards for each pending item
   - Video thumbnail with play preview
   - Hook text displayed prominently
   - Caption preview
   - Buttons: Download Video, Copy Caption, Copy Hashtags
   - Mark as Posted button

4. Posted Today section
   - Collapsed list of today's posted items
   - Optional: Enter metrics (views, likes, comments, shares)

5. Auto-Fill Week button
   - Fills empty slots with quote reveals from approved quotes

Reference: Spec section "TikTok Queue", "Queue Interface Features"

Deliverables:
- TikTok queue page
- Week view component
- Queue card component
- Metrics entry modal
```

**Acceptance Criteria:**
- [ ] Week view shows all slots
- [ ] Can download video
- [ ] Can copy caption with one click
- [ ] Can mark as posted
- [ ] Streak tracks correctly

---

### Prompt 7.2: TikTok Queue Generation

```
Build the automatic TikTok queue entry creation.

Trigger: When video generation completes (in Creatomate webhook)

Function: createTikTokQueueEntry(quoteId: string, videoAssetId: string)

Logic:
1. Get quote details
2. Select hook for quote_reveal content type
3. Generate TikTok-optimized caption:
   ```
   {hook_text}
   
   "{quote_text}"
   
   {collection_tagline}
   
   Link in bio 🤍
   
   {hashtags}
   ```
4. Generate TikTok hashtags (15 using 5-5-5 method)
5. Find next available slot (morning or evening)
6. Insert tiktok_queue record

Collection taglines:
- grounding: "For the days when everything feels unsteady."
- wholeness: "All of you belongs here."
- growth: "Still becoming. And that's enough."

Reference: Spec section "Queue Generation", "TikTok Caption Template"

Deliverables:
- createTikTokQueueEntry function
- TikTok hashtag generation (5-5-5 method)
- Slot finding logic
- Integration with webhook
```

**Acceptance Criteria:**
- [ ] Queue entry created on video completion
- [ ] Caption includes hook
- [ ] 15 hashtags generated
- [ ] Slots assigned AM/PM alternating

---

## Phase 8: Review Queue

### Prompt 8.1: Review Queue UI (Supervised Mode)

```
Build the review queue for Supervised operator mode.

Features:
1. Queue count badge in sidebar
2. Filter bar: content type, collection, date
3. Queue cards showing:
   - Thumbnail (video or image)
   - Quote text
   - Collection and template used
   - Scheduled time
   - Caption preview
   - Buttons: Preview Full, Edit, Reject, Approve ✓

4. Bulk actions
   - Select multiple
   - Bulk approve
   - Bulk reject

5. Preview Full opens Preview Modal (from 5.4)

6. Edit opens New Post Modal (from 5.3) in edit mode

7. Reject flow
   - Optional rejection reason
   - Moves to rejected status

8. Approve flow
   - Changes status from 'draft' to 'scheduled'
   - Toast confirmation

Reference: Spec section "Review Queue (Supervised Mode)"

Deliverables:
- Review queue page
- Queue card component
- Bulk action logic
- Status update functions
```

**Acceptance Criteria:**
- [ ] Shows all draft posts
- [ ] Can approve single or bulk
- [ ] Can reject with reason
- [ ] Can edit before approving
- [ ] Toast on success

---

## Phase 9: Settings & OAuth

### Prompt 9.1: Instagram OAuth Flow

```
Build the Instagram Business account connection flow.

Settings page section:
1. "Connect Instagram Account" button (when not connected)
2. When connected: shows username, profile pic, connected date
3. "Disconnect" button with confirmation

OAuth flow:
1. User clicks Connect
2. Redirect to Facebook OAuth with scopes:
   - instagram_basic
   - instagram_content_publish
   - instagram_manage_comments
   - instagram_manage_insights
   - pages_show_list
   - pages_read_engagement
   - business_management
3. Callback receives code
4. Exchange for access token
5. Get long-lived token (60 days)
6. Store encrypted in instagram_connections table
7. Show success toast

Token refresh:
- Create weekly job to refresh tokens before expiry
- Alert user if refresh fails

Reference: Spec section "Instagram API Integration", "Connection Flow"

Deliverables:
- Settings UI section
- OAuth initiation route
- OAuth callback route
- Token storage (encrypted)
- Refresh job
```

**Acceptance Criteria:**
- [ ] Can connect Instagram account
- [ ] Token stored securely
- [ ] Can disconnect
- [ ] Refresh job works

---

### Prompt 9.2: Creatomate & External Services Settings

```
Build settings sections for external service configuration.

Sections:
1. Creatomate
   - API key field (masked)
   - Test connection button
   - Webhook URL display (for setup in Creatomate dashboard)

2. Pexels
   - API key field
   - Test connection button

3. Cross-posting
   - Toggle: Auto cross-post to Facebook
   - Select which content types (Feed/Reels/Stories)

4. Defaults
   - Default timezone dropdown
   - Default hashtag behavior (caption vs first comment)
   - Default shopping tag toggle

5. Operator Mode selector
   - Radio: Supervised / Assisted / Autopilot
   - Description of each mode
   - Warning when changing modes

Reference: Spec section "Settings Schema"

Deliverables:
- Settings page sections
- API key storage (encrypted)
- Connection test functions
- Mode change logic
```

**Acceptance Criteria:**
- [ ] Can save API keys securely
- [ ] Connection tests work
- [ ] Mode changes respected in system
- [ ] Settings persist

---

## Phase 10: Analytics

### Prompt 10.1: Metrics Sync Job

```
Create the Trigger.dev job that fetches Instagram metrics.

Job: sync-instagram-metrics
Schedule: 6 AM daily (0 6 * * *)

Logic:
1. Get posts published in last 30 days
2. For each post, fetch insights:
   - impressions, reach, likes, comments, saved, shares
   - For reels: also plays
3. Calculate engagement_rate: (likes + comments + saves) / reach
4. Upsert into instagram_post_metrics table
5. Fetch account metrics:
   - followers, profile_views, website_clicks
6. Insert into instagram_account_metrics (daily record)
7. Trigger recalculations:
   - recalculateOptimalTimes()
   - recalculateTemplatePerformance()
   - recalculateHashtagPerformance()

API endpoints:
- GET /{media-id}/insights?metric=impressions,reach,likes,comments,saved,shares
- GET /{ig-user-id}?fields=followers_count

Reference: Spec section "Metrics Sync Job"

Deliverables:
- sync-instagram-metrics job
- instagram_post_metrics upsert
- instagram_account_metrics insert
- Recalculation functions
```

**Acceptance Criteria:**
- [ ] Fetches metrics for recent posts
- [ ] Calculates engagement rate
- [ ] Updates optimal times based on data
- [ ] Handles API errors gracefully

---

### Prompt 10.2: Analytics Dashboard

```
Build the Instagram analytics dashboard page.

Sections:
1. Overview cards (selectable time range)
   - Total reach (with % change)
   - Average engagement rate
   - Total saves
   - Profile visits
   - Follower growth

2. Engagement over time chart
   - Line chart showing engagement rate by day
   - Reach as secondary line

3. Top performing posts
   - List of top 5 by engagement rate
   - Thumbnail, quote preview, metrics

4. Template performance table
   - Template name, times used, avg engagement, avg saves
   - Sortable columns

5. Hashtag set performance
   - Which rotation sets perform best
   - Avg engagement by set

6. Best posting times heatmap
   - 7x24 grid (day x hour)
   - Color intensity = engagement rate
   - Highlights current optimal times

Reference: Spec section "Analytics & Optimization"

Deliverables:
- Analytics page
- Chart components (use Recharts)
- Performance tables
- Time heatmap component
```

**Acceptance Criteria:**
- [ ] All sections render with data
- [ ] Time range filter works
- [ ] Charts interactive
- [ ] Tables sortable

---

## Phase 11: Asset Management UI

### Prompt 11.1: Stock Footage Library UI

```
Build the stock footage management page.

Features:
1. Tab bar: Grounding | Wholeness | Growth | General
   - Shows count per collection

2. Filter bar
   - Portrait Only toggle (default on)
   - Search by mood tags
   - Sort: Recently added, Least used, Most used

3. Grid of footage cards
   - Thumbnail with play button overlay
   - Duration badge
   - Collection tag
   - Mood tags
   - Usage stats: "Used: 3x | Last: 12d"
   - Edit button

4. Add Footage modal
   - Source dropdown: Pexels
   - URL input
   - Fetch Preview button (calls Pexels API)
   - Shows: thumbnail, duration, resolution, orientation
   - Auto-rejects landscape
   - Collection selector (radio)
   - Mood tags input (chips)
   - Notes field
   - Add to Pool button

5. Pool Health panel
   - Shows status per collection
   - ✓ Good (20+), ⚠ Low (10-19), ❌ Critical (<10)
   - Warning if 0 unused

Reference: Spec section "Stock Footage Library"

Deliverables:
- Footage library page
- Footage card component
- Add footage modal
- Pexels API integration for metadata fetch
- Pool health component
```

**Acceptance Criteria:**
- [ ] Can view footage by collection
- [ ] Can add from Pexels URL
- [ ] Landscape auto-rejected
- [ ] Pool health accurate

---

### Prompt 11.2: Music Library UI

```
Build the music track management page.

Features:
1. Filter bar
   - Collection filter
   - Mood filter
   - Search by title/artist

2. Track list
   - Track row: title, artist, duration, BPM, collection
   - Mood tags
   - Usage stats
   - Play preview button (audio player)
   - Edit button

3. Add Track modal
   - File upload OR URL input
   - Title, artist fields
   - Duration, BPM (manual or auto-detect if possible)
   - Collection selector
   - Mood tags
   - Notes

4. Pool Health panel
   - Same as footage: status per collection
   - Recommend 15+ tracks per pool

5. License tracking
   - Shows: "Epidemic Sound subscription active"
   - Renewal date if stored

Reference: Spec section "Music Library"

Deliverables:
- Music library page
- Track row component with audio preview
- Add track modal
- Pool health component
```

**Acceptance Criteria:**
- [ ] Can view and filter tracks
- [ ] Audio preview plays
- [ ] Can add new tracks
- [ ] Pool health shown

---

## Phase 12: Polish & Error Handling

### Prompt 12.1: Rate Limit Management

```
Implement rate limit tracking and protection.

Limits to track:
- Instagram posts: 25/day
- Instagram API calls: 200/hour
- Instagram comments: 60/hour

Features:
1. Rate limit tracking table
   - Store: service, limit_type, count, window_start

2. checkRateLimits() function
   - Returns: can_post, can_call_api, remaining counts
   - Called before any API operation

3. Pre-publish check
   - If approaching limit (80%), show warning
   - If at limit, delay scheduling

4. Dashboard indicator
   - Shows API quota usage
   - Warning banner if near limit

5. Graceful degradation
   - Queue posts if can't publish
   - Retry when window resets

Reference: Spec section "Rate Limit Management"

Deliverables:
- Rate limit tracking table
- checkRateLimits function
- Pre-publish integration
- Dashboard indicator
```

**Acceptance Criteria:**
- [ ] Tracks API calls
- [ ] Prevents exceeding limits
- [ ] Warning at 80%
- [ ] Queue works when limited

---

### Prompt 12.2: Asset Validation

```
Implement asset validation before scheduling.

Validation rules by post type:

Feed:
- Aspect ratio: 4:5 (1080x1350 minimum)
- Max file size: 8MB images
- Max duration: 60 seconds video

Reel:
- Aspect ratio: 9:16 (1080x1920 minimum)
- Max file size: 1GB
- Duration: 3-90 seconds

Story:
- Aspect ratio: 9:16 (1080x1920 minimum)
- Max duration: 60 seconds

Carousel:
- Aspect ratio: 4:5
- Max 10 items

Function: validateAssetForInstagram(assetId, postType): ValidationResult
Returns: { valid: boolean, errors: string[] }

Integration:
- Run before saving scheduled post
- Show errors in schedule modal
- Block scheduling if invalid
- Offer suggestions (e.g., "Image too small, minimum 1080x1350")

Reference: Spec section "Asset Validation"

Deliverables:
- validateAssetForInstagram function
- Integration in schedule modal
- Error display component
```

**Acceptance Criteria:**
- [ ] Validates all post types
- [ ] Clear error messages
- [ ] Blocks invalid posts
- [ ] Suggestions helpful

---

### Prompt 12.3: Activity Logging

```
Implement comprehensive activity logging.

Events to log:
- post_scheduled
- post_published
- post_failed
- video_generated
- video_generation_failed
- story_scheduled
- story_published
- tiktok_queued
- tiktok_posted
- ugc_received
- metrics_synced
- auto_stories_scheduled

Activity log table:
- id, event_type, entity_type, entity_id
- metadata (JSONB for event-specific data)
- created_at

Activity feed component:
- Shows recent activity
- Filterable by event type
- Links to relevant items

Dashboard integration:
- "Recent Activity" section
- Shows last 10 items

Reference: Throughout spec where logActivity() is called

Deliverables:
- activity_log table
- logActivity function
- Activity feed component
- Dashboard integration
```

**Acceptance Criteria:**
- [ ] All events logged
- [ ] Activity feed displays correctly
- [ ] Can filter by type
- [ ] Links work

---

### Prompt 12.4: Notification System

```
Implement user notifications for important events.

Notification triggers:
- Post failed (after retries exhausted)
- Review queue has items (daily digest)
- Pool health critical (< 10 items)
- Rate limit approaching
- Token refresh failed

Notification channels:
1. In-app notifications
   - Bell icon with badge count
   - Dropdown showing recent notifications
   - Mark as read

2. Email notifications (optional)
   - Daily digest of pending reviews
   - Immediate for failures
   - User can configure in settings

Database:
- notifications table: id, user_id, type, title, message, read, created_at
- notification_preferences: user_id, email_enabled, digest_time

Reference: Spec mentions notifications throughout

Deliverables:
- notifications table
- Notification creation functions
- In-app notification UI
- Email sending (if email service configured)
- Preferences in settings
```

**Acceptance Criteria:**
- [ ] Notifications created on events
- [ ] Bell icon shows count
- [ ] Can mark as read
- [ ] Email works if configured

---

## Summary: Build Order

**Week 1-2: Foundation**
- 1.1, 1.2, 1.3 (Database)
- 2.1, 2.2, 2.3, 2.4 (Templates & Hashtags)

**Week 3: Scheduling**
- 3.1, 3.2, 3.3, 3.4 (Scheduling logic & publishing)

**Week 4: Video Pipeline**
- 4.1, 4.2, 4.3, 4.4 (Selection algorithms & Creatomate)

**Week 5: UI**
- 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 (All main UI components)

**Week 6: Stories & TikTok**
- 6.1, 6.2 (Stories)
- 7.1, 7.2 (TikTok)

**Week 7: Review & Settings**
- 8.1 (Review queue)
- 9.1, 9.2 (OAuth & settings)

**Week 8: Analytics & Polish**
- 10.1, 10.2 (Analytics)
- 11.1, 11.2 (Asset management UI)
- 12.1, 12.2, 12.3, 12.4 (Polish)

---

**Total: 35 prompts across 12 phases**

Each prompt is designed to be completable in 1-3 hours with Claude Code.
