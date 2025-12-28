# Haven Hub Instagram & Video Automation

*Complete Technical Specification for Social Media Automation*

December 2025 | Haven & Hold

---

## Executive Summary

This specification adds comprehensive Instagram automation and video generation capabilities to Haven Hub, enabling near-zero-touch social media publishing while maintaining brand quality and therapeutic positioning.

**Core Components:**
1. Instagram scheduling (Feed, Reels, Stories, Carousels)
2. Content template system (captions, hashtags)
3. Video generation pipeline (Creatomate + Pexels + Epidemic Sound)
4. Stock footage and music curation
5. TikTok manual queue
6. Analytics and performance tracking

**Automation Goal:** Quote approval → Published content with minimal daily touch.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Instagram API Integration](#instagram-api-integration)
3. [Content Template System](#content-template-system)
4. [Hashtag Management](#hashtag-management)
5. [Video Generation Pipeline](#video-generation-pipeline)
6. [Stock Footage Management](#stock-footage-management)
7. [Music Pool Management](#music-pool-management)
8. [Instagram Scheduler](#instagram-scheduler)
9. [TikTok Queue](#tiktok-queue)
10. [UGC Collection](#ugc-collection)
11. [Analytics Integration](#analytics-integration)
12. [Operator Mode Integration](#operator-mode-integration)
13. [Technical Infrastructure](#technical-infrastructure)
14. [UI Specifications](#ui-specifications)
15. [Implementation Plan](#implementation-plan)

---

## Architecture Overview

### Full Automation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         QUOTE APPROVED                                   │
│                              ↓                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     ASSET GENERATION                               │  │
│  │                                                                    │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐    │  │
│  │   │ Print Files │   │  Mockups    │   │   Video Assets      │    │  │
│  │   │ (existing)  │   │ (existing)  │   │      (NEW)          │    │  │
│  │   └─────────────┘   └─────────────┘   └──────────┬──────────┘    │  │
│  │                                                   ↓               │  │
│  │   ┌───────────────────────────────────────────────────────────┐  │  │
│  │   │              VIDEO GENERATION ENGINE                       │  │  │
│  │   │                                                            │  │  │
│  │   │  1. Match collection → footage pool                        │  │  │
│  │   │  2. Select footage (least recently used)                   │  │  │
│  │   │  3. Match collection → music pool                          │  │  │
│  │   │  4. Select music track (least recently used)               │  │  │
│  │   │  5. Call Creatomate API:                                   │  │  │
│  │   │     • Template ID (brand-designed)                         │  │  │
│  │   │     • Quote text variable                                  │  │  │
│  │   │     • Stock video URL                                      │  │  │
│  │   │     • Music track URL                                      │  │  │
│  │   │  6. Render outputs: 9:16 (Reels/TikTok) + 4:5 (Feed)      │  │  │
│  │   │  7. Webhook → save to asset library                        │  │  │
│  │   └───────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   CONTENT GENERATION                               │  │
│  │                                                                    │  │
│  │  Caption ← Template + {{quote_text}} + {{collection}}             │  │
│  │  Hashtags ← Pool rotation (exclude last 5 posts' tags)           │  │
│  │  Alt Text ← Auto-generated from quote + collection                │  │
│  │  Optimal Time ← Historical engagement data                        │  │
│  │  Shopping Tags ← Linked Shopify product                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     OPERATOR MODE                                  │  │
│  │                                                                    │  │
│  │  SUPERVISED: Save draft → Review queue → Manual approve           │  │
│  │  ASSISTED: Schedule → Notify → Auto-publish at scheduled time     │  │
│  │  AUTOPILOT: Schedule → Publish → Log to activity feed only        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      PUBLISHING                                    │  │
│  │                                                                    │  │
│  │  Instagram Feed (4:5) ────→ Graph API ────→ ✓ Auto-publish        │  │
│  │  Instagram Reels (9:16) ──→ Graph API ────→ ✓ Auto-publish        │  │
│  │  Instagram Stories (9:16) → Graph API ────→ ✓ Auto-publish        │  │
│  │  Facebook Cross-post ─────→ Graph API ────→ ✓ Auto-publish        │  │
│  │  TikTok (9:16) ───────────→ Manual Queue ─→ One-click copy        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              ↓                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   ANALYTICS (Daily Sync)                           │  │
│  │                                                                    │  │
│  │  Fetch metrics → Update optimal times → Track template perf       │  │
│  │  → Track hashtag perf → Surface insights                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Navigation Structure

```
Haven Hub Sidebar
─────────────────
Dashboard
Quotes
Assets
─────────────────
📌 Pinterest
📸 Instagram           ← NEW SECTION
  ├─ Scheduler
  ├─ Templates
  ├─ Hashtags
  ├─ UGC
  └─ Analytics
🎬 Video               ← NEW SECTION
  ├─ Templates         (Creatomate)
  ├─ Stock Footage     (Pexels pools)
  ├─ Music             (Epidemic Sound pools)
  └─ Generated
📱 TikTok              ← NEW SECTION
  └─ Queue
─────────────────
Email
Settings
```

---

## Instagram API Integration

### Authentication

| Setting | Description |
|---------|-------------|
| `instagram_business_account_id` | Connected Instagram Business/Creator account |
| `facebook_page_id` | Linked Facebook Page (required) |
| `instagram_access_token` | Long-lived access token (60-day, auto-refreshed) |
| `instagram_connected` | Boolean connection status |
| `instagram_permissions` | Granted scopes |

### Required Permissions

```
instagram_basic
instagram_content_publish
instagram_manage_comments
instagram_manage_insights
pages_show_list
pages_read_engagement
business_management
```

### Connection Flow

1. User navigates to Settings → Integrations → Instagram
2. Clicks "Connect Instagram Account"
3. OAuth flow via Meta Business Suite
4. Select Facebook Page and linked Instagram account
5. Haven Hub stores tokens (encrypted) in user_settings
6. Token refresh job runs weekly (tokens expire in 60 days)

### API Endpoints Used

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `POST /{ig-user-id}/media` | Create media container | 25/day |
| `POST /{ig-user-id}/media_publish` | Publish container | 25/day |
| `GET /{ig-user-id}/media` | List published posts | 200/hour |
| `GET /{media-id}/insights` | Post performance | 200/hour |
| `GET /{ig-user-id}/tags` | Get tagged/mentioned posts | 30/hour |
| `POST /{media-id}/comments` | Post first comment (hashtags) | 60/hour |

### Database Schema: Connections

```sql
CREATE TABLE instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- Account info
  instagram_account_id VARCHAR(100) NOT NULL,
  instagram_username VARCHAR(100),
  facebook_page_id VARCHAR(100) NOT NULL,
  
  -- Tokens (encrypted)
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Content Template System

### Overview

Templates enable rapid, consistent caption generation while maintaining Haven & Hold's therapeutic voice. Each template supports variable substitution and can be tied to specific collections, post types, and content pillars.

### Content Pillars Strategy

Haven & Hold follows a **40/20/20/20 content mix** to balance product visibility with community building:

| Pillar | % of Content | Purpose | Post Types | Conversion Goal |
|--------|--------------|---------|------------|-----------------|
| **Product Showcase** | 40% | Show prints beautifully | Feed, Reel (quote reveals) | Shop visits |
| **Brand Story** | 20% | Build emotional connection | Carousel, Reel (behind-scenes) | Trust + Follow |
| **Educational** | 20% | Provide value | Carousel, Reel (how-to) | Save + Share |
| **Community** | 20% | Build relationships | Feed (UGC), Stories | Engagement + UGC |

### Database Schema: Templates

```sql
CREATE TABLE instagram_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL,  -- 'feed', 'reel', 'story', 'carousel'
  content_pillar VARCHAR(50) NOT NULL, -- 'product_showcase', 'brand_story', 'educational', 'community'
  collection VARCHAR(50),               -- 'grounding', 'wholeness', 'growth', 'general'
  
  -- Template content
  caption_template TEXT NOT NULL,
  
  -- Caption formula reference
  caption_formula VARCHAR(50),          -- 'single_quote', 'lifestyle', 'collection_highlight', 'behind_quote', 'educational_value', 'ugc_feature'
  
  -- Hashtag configuration
  hashtag_groups UUID[],                -- References to hashtag_groups
  hashtags_in_caption BOOLEAN DEFAULT false,  -- false = first comment
  
  -- Shopping
  include_shopping_tag BOOLEAN DEFAULT true,
  
  -- Day affinity (for smart scheduling)
  preferred_days INTEGER[],             -- 0=Sun, 1=Mon, etc.
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Performance tracking
  usage_count INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Template Variables

| Variable | Source | Example Output |
|----------|--------|----------------|
| `{{quote_text}}` | Quote record | "You are held here" |
| `{{quote_author}}` | Quote record | "— Mary Oliver" |
| `{{collection_name}}` | Quote collection | "Grounding" |
| `{{collection_lower}}` | Quote collection | "grounding" |
| `{{collection_meaning}}` | Collection definition | "stability and safety" |
| `{{product_name}}` | Shopify product | "You Are Held Here Print" |
| `{{product_url}}` | Shopify product | Full URL |
| `{{shop_handle}}` | Settings | "havenandhold" |
| `{{cta_link}}` | Configurable | "Link in bio" |
| `{{cta_quiz}}` | Settings | "Take the quiz ↓" |

### Caption Formulas

Each template follows a proven caption structure:

| Formula | Structure | Best For |
|---------|-----------|----------|
| **Single Quote** | Hook → Meaning → Personal → Soft CTA | Product Showcase (Feed) |
| **Lifestyle** | Scene-setting → Representation → Connection → Question | Styled shots |
| **Collection Highlight** | Intro → Quotes list → Meaning → CTA | Carousels |
| **Behind the Quote** | Story → Why exists → Personal revelation | Brand Story |
| **Educational Value** | Problem → Solution steps → Value add → CTA | How-to content |
| **UGC Feature** | Gratitude → Quote context → Community → Invite | Customer features |

### Pre-Built Templates

---

#### PRODUCT SHOWCASE TEMPLATES (40% of content)

**Template: Single Quote Showcase (Feed)**
```
Name: Single Quote Showcase
Type: feed
Pillar: product_showcase
Formula: single_quote
Collection: general

Caption:
[Emotional hook that stops the scroll]

"{{quote_text}}" — for the walls that witness your hardest mornings. For the rooms where you fall apart and come back together.

This one lives above my bed. It's the first thing I see when the day feels too heavy.

Where would it live in your space?

{{cta_link}}
```

**Template: Quote Reveal Reel (Reel)**
```
Name: Quote Reveal Reel
Type: reel
Pillar: product_showcase
Formula: single_quote
Collection: general

Caption:
Not motivation. Just holding. 🤍

"{{quote_text}}"

For spaces that need to hold you, not push you.

Part of the {{collection_name}} Collection.

{{cta_link}}
```

**Template: Lifestyle Styled Shot (Feed)**
```
Name: Lifestyle Styled Shot
Type: feed
Pillar: product_showcase
Formula: lifestyle
Collection: general

Caption:
Sunday morning. Coffee cooling. The world still quiet.

This is what "{{quote_text}}" looks like in real life — not a perfect moment, just a held one.

Some walls just need to witness. Not motivate. Not fix. Just witness.

What does your Sunday morning space look like?

{{cta_link}}
```

**Template: Product Detail (Feed)**
```
Name: Product Detail Close-Up
Type: feed
Pillar: product_showcase
Formula: single_quote
Collection: general

Caption:
Not all wall art is created equal.

Typography matters. Spacing matters. Intention matters.

"{{quote_text}}" — designed with literary depth and therapeutic positioning.

That's why it's $12, not $2.99.

{{cta_link}}
```

---

#### BRAND STORY TEMPLATES (20% of content)

**Template: Behind the Quote (Feed/Carousel)**
```
Name: Behind the Quote
Type: feed, carousel
Pillar: brand_story
Formula: behind_quote
Collection: general

Caption:
Why this quote exists in the collection:

"{{quote_text}}"

Some words arrive when you need them. This one found me on a hard morning, sitting in my therapist's waiting room.

I didn't need "you've got this." I needed "you're held here."

That's the whole point of Haven & Hold. Words that hold you without demanding anything back.

Where would you put these words?

{{cta_link}}
```

**Template: Why Not Motivation (Reel)**
```
Name: Why Not Motivation
Type: reel
Pillar: brand_story
Formula: behind_quote
Collection: general

Caption:
I could make more money selling "rise and grind" and "good vibes only."

But I won't.

Because when you're depressed, "choose joy" feels like failure. When you're anxious, "just breathe" feels like mockery.

So I make the opposite. Words that hold you without demanding anything back.

That's Haven & Hold. 🤍

{{cta_link}}
```

**Template: Sunday Reflection (Carousel)**
```
Name: Sunday Reflection
Type: carousel
Pillar: brand_story
Formula: behind_quote
Collection: general

Caption:
The story behind the {{collection_name}} Collection.

These aren't just quotes. They're permission slips.

Permission to be held. Permission to be whole. Permission to still be becoming.

Swipe to see what each one means →

{{cta_link}}
```

---

#### EDUCATIONAL TEMPLATES (20% of content)

**Template: How To Print Guide (Carousel)**
```
Name: How To Print Guide
Type: carousel
Pillar: educational
Formula: educational_value
Collection: general

Caption:
The $3 gallery-quality print hack:

1. Download your files (instant after purchase)
2. Find your local print shop (Staples, FedEx, Walgreens)
3. Ask for matte cardstock
4. Say "print as-is, no cropping"

That's it. Gallery-quality print. 5 minutes. Under $5.

Save this for later 📌

{{cta_link}}
```

**Template: Quotes For Situation (Carousel)**
```
Name: Quotes For [Situation]
Type: carousel
Pillar: educational
Formula: collection_highlight
Collection: general

Caption:
5 quotes for the days when everything feels too heavy:

1. "{{quote_1}}"
2. "{{quote_2}}"
3. "{{quote_3}}"
4. "{{quote_4}}"
5. "{{quote_5}}"

Save the one that hits different. 🤍

All available as instant downloads →

{{cta_link}}
```

**Template: Collection Explainer (Reel)**
```
Name: Collection Explainer
Type: reel
Pillar: educational
Formula: educational_value
Collection: general

Caption:
Which do you need: Grounding, Wholeness, or Growth?

△ Grounding = Stability when everything shakes
○ Wholeness = Permission to be all of yourself
□ Growth = Space to still be becoming

Take the quiz to find yours →

{{cta_quiz}}
```

**Template: Framing Tips (Carousel)**
```
Name: Framing Tips
Type: carousel
Pillar: educational
Formula: educational_value
Collection: general

Caption:
How to frame your prints without breaking the bank:

Amazon: $12 for 11×14 black frame
IKEA: $5 for 8×10 frame
Target: $8 for floating frame

Total for 3 framed prints: Under $50

Save this hack 📌

{{cta_link}}
```

---

#### COMMUNITY TEMPLATES (20% of content)

**Template: Customer Feature (Feed)**
```
Name: Customer Feature
Type: feed
Pillar: community
Formula: ugc_feature
Collection: general

Caption:
This made my whole week. 🤍

@{{customer_handle}} created this beautiful corner with "{{quote_text}}" and I'm not crying, you're crying.

This is why Haven & Hold exists — to live in spaces like this. To be part of moments like this.

Tag us in your space. We want to see where your prints land.

{{cta_link}}
```

**Template: UGC Repost (Feed)**
```
Name: UGC Repost
Type: feed
Pillar: community
Formula: ugc_feature
Collection: general

Caption:
When your prints find their perfect homes 🏠

Thank you @{{customer_handle}} for sharing this. Seeing "{{quote_text}}" in your space reminds me why I started this.

Your walls are holding you beautifully.

Want to be featured? Tag @havenandhold in your space.

{{cta_link}}
```

**Template: Community Question (Feed)**
```
Name: Community Question
Type: feed
Pillar: community
Formula: lifestyle
Collection: general

Caption:
Real question:

What's on your bedroom walls right now?

(And is it actually helping or just... there?)

Drop a comment. I'm curious. 👇
```

---

#### COLLECTION-SPECIFIC TEMPLATES

**Template: Grounding Collection (Feed/Reel)**
```
Name: Grounding Collection
Type: feed, reel
Pillar: product_showcase
Formula: single_quote
Collection: grounding

Caption:
{{quote_text}}

For the days when everything feels unsteady.
When you need something to anchor to.

This is your reminder: you are held here.
Right where you are. As you are.

Part of the Grounding Collection — prints for stability and safety.

{{cta_link}}
```

**Template: Wholeness Collection (Feed/Reel)**
```
Name: Wholeness Collection
Type: feed, reel
Pillar: product_showcase
Formula: single_quote
Collection: wholeness

Caption:
{{quote_text}}

You don't have to earn rest.
You don't have to prove your worth.

This print is a permission slip — for your wall, for yourself.

Part of the Wholeness Collection — prints for self-compassion and acceptance.

{{cta_link}}
```

**Template: Growth Collection (Feed/Reel)**
```
Name: Growth Collection
Type: feed, reel
Pillar: product_showcase
Formula: single_quote
Collection: growth

Caption:
{{quote_text}}

Healing isn't linear.
Neither is becoming.

Some days you bloom. Some days you rest.
Both are growth.

Part of the Growth Collection — prints for transformation and becoming.

{{cta_link}}
```

### Alt Text Generation

Auto-generated for accessibility and SEO:

```
Template: Minimalist quote print reading "{{quote_text}}" in sanctuary neutral 
tones. Part of the Haven & Hold {{collection_name}} collection—therapeutic 
wall art for {{room_type}}.
```

| Collection | Room Types |
|------------|------------|
| Grounding | bedrooms, reading nooks, meditation spaces |
| Wholeness | bathrooms, personal spaces, self-care corners |
| Growth | home offices, studios, creative spaces |
| General | living rooms, therapy offices, calm corners |

---

## Hashtag Management

### Strategy

Hashtags posted as **first comment** (not in caption) for cleaner aesthetic and better algorithm performance. Uses a **tiered approach** for optimal reach across different audience sizes.

### Database Schema: Hashtag Groups

```sql
CREATE TABLE hashtag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL,            -- 'brand', 'mega', 'large', 'niche'
  estimated_reach VARCHAR(50),          -- '1B+', '100M-1B', '10M-100M'
  hashtags TEXT[] NOT NULL,
  
  -- Rotation tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Performance
  avg_engagement_rate DECIMAL(5,4),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE banned_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag VARCHAR(100) NOT NULL UNIQUE,
  reason TEXT,                          -- 'shadowban', 'off_brand', 'spam'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tiered Hashtag System

**Tier Structure:**

| Tier | Reach | Quantity | Purpose |
|------|-------|----------|---------|
| **Brand** | N/A | 2 (always) | Attribution, brand building |
| **Mega** | 1B+ views | 4-5 | Maximum exposure, broad discovery |
| **Large** | 100M-1B | 4-5 | Strong reach, category discovery |
| **Niche** | 10M-100M | 5-7 | Targeted audience, higher conversion |

**Total per post:** 15-20 hashtags

### Pre-Built Hashtag Groups

**Brand (Always Include — 2 tags)**
```sql
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags) VALUES
('Brand Core', 'brand', 'N/A', ARRAY[
  '#havenandhold',
  '#quietanchors'
]);
```

**Mega Tier (1B+ views — 5 tags)**
```sql
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags) VALUES
('Mega - General', 'mega', '1B+', ARRAY[
  '#homedecor',
  '#wallart',
  '#diy',
  '#smallbusiness',
  '#fyp'
]);
```

**Large Tier (100M-1B views — 5 tags)**
```sql
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags) VALUES
('Large - Home & Art', 'large', '100M-1B', ARRAY[
  '#minimalistart',
  '#roomtransformation',
  '#homeoffice',
  '#digitaldownload',
  '#printableart'
]),
('Large - Mental Health', 'large', '100M-1B', ARRAY[
  '#mentalhealthmatters',
  '#selfcare',
  '#healingjourney',
  '#anxietyrelief',
  '#therapytok'
]);
```

**Niche Tier (10M-100M views — 7 tags)**
```sql
INSERT INTO hashtag_groups (name, tier, estimated_reach, hashtags) VALUES
('Niche - Therapeutic', 'niche', '10M-100M', ARRAY[
  '#therapyoffice',
  '#traumahealing',
  '#mindfulhome',
  '#quoteart',
  '#calmspaces',
  '#sanctuaryhome',
  '#intentionalliving'
]),
('Niche - Decor', 'niche', '10M-100M', ARRAY[
  '#bedroomdecor',
  '#minimalistdecor',
  '#apartmentdecor',
  '#gallerywall',
  '#neutraldecor',
  '#cozyhome',
  '#peacefulspaces'
]);
```

### Rotation Sets

Create 3 rotation sets to avoid spam detection:

```sql
-- Set A: Mental health focus
INSERT INTO hashtag_rotation_sets (name, group_ids) VALUES
('Set A - Therapeutic Focus', ARRAY[
  (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
  (SELECT id FROM hashtag_groups WHERE name = 'Mega - General'),
  (SELECT id FROM hashtag_groups WHERE name = 'Large - Mental Health'),
  (SELECT id FROM hashtag_groups WHERE name = 'Niche - Therapeutic')
]);

-- Set B: Home decor focus
INSERT INTO hashtag_rotation_sets (name, group_ids) VALUES
('Set B - Home Decor Focus', ARRAY[
  (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
  (SELECT id FROM hashtag_groups WHERE name = 'Mega - General'),
  (SELECT id FROM hashtag_groups WHERE name = 'Large - Home & Art'),
  (SELECT id FROM hashtag_groups WHERE name = 'Niche - Decor')
]);

-- Set C: Mixed
INSERT INTO hashtag_rotation_sets (name, group_ids) VALUES
('Set C - Balanced Mix', ARRAY[
  (SELECT id FROM hashtag_groups WHERE name = 'Brand Core'),
  (SELECT id FROM hashtag_groups WHERE name = 'Mega - General'),
  (SELECT id FROM hashtag_groups WHERE name = 'Large - Home & Art'),
  (SELECT id FROM hashtag_groups WHERE name = 'Niche - Therapeutic')
]);
```

### Auto-Generation Algorithm

```javascript
async function generateHashtags(
  collection: string, 
  contentPillar: string,
  excludeRecent: number = 5
) {
  const recentHashtags = await getRecentPostHashtags(excludeRecent);
  const bannedHashtags = await getBannedHashtags();
  
  // Determine which rotation set to use
  const rotationSet = await getNextRotationSet();
  
  let hashtags: string[] = [];
  
  // 1. Always include Brand (2 tags)
  const brandCore = await getHashtagGroup('Brand Core');
  hashtags.push(...brandCore.hashtags);
  
  // 2. Add Mega tier (4-5 tags)
  const mega = await getHashtagGroup('Mega - General');
  hashtags.push(...selectRandom(mega.hashtags, 4));
  
  // 3. Add Large tier based on content pillar (4-5 tags)
  const largeTier = contentPillar === 'educational' || contentPillar === 'brand_story'
    ? 'Large - Mental Health'
    : 'Large - Home & Art';
  const large = await getHashtagGroup(largeTier);
  hashtags.push(...selectRandom(large.hashtags, 4));
  
  // 4. Add Niche tier based on collection (5-7 tags)
  const nicheTier = collection === 'grounding' || collection === 'wholeness'
    ? 'Niche - Therapeutic'
    : 'Niche - Decor';
  const niche = await getHashtagGroup(nicheTier);
  hashtags.push(...selectRandom(niche.hashtags, 6));
  
  // 5. Filter out recently used and banned
  hashtags = hashtags.filter(h => 
    !recentHashtags.includes(h) && 
    !bannedHashtags.includes(h)
  );
  
  // 6. Track rotation set usage
  await incrementRotationSetUsage(rotationSet.id);
  
  // 7. Limit to 17-20 (Instagram allows 30)
  return hashtags.slice(0, 18);
}
```

### First Comment Posting

```javascript
async function postHashtagsAsFirstComment(mediaId: string, hashtags: string[]) {
  const hashtagString = hashtags.join(' ');
  
  await fetch(`https://graph.facebook.com/v18.0/${mediaId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: hashtagString,
      access_token: ACCESS_TOKEN
    })
  });
}
```

---

## Video Generation Pipeline

### Overview

Videos are generated automatically when quotes are approved, combining:
- Stock footage from curated Pexels pools
- Music from curated Epidemic Sound pools
- Quote text overlay via Creatomate templates

### Video Content Types

Following the **40/30/20/10 TikTok strategy** (also applies to Reels):

| Content Type | % of Videos | Description | Creatomate Template |
|--------------|-------------|-------------|---------------------|
| **Quote Reveal** | 40% | Core product showcase, quote appears over footage | `quote_fade`, `quote_reveal` |
| **Educational** | 30% | Collection explainers, how-to, tips | `text_sequence`, `split_screen` |
| **Transformation** | 20% | Before/after, room makeovers | `before_after`, `transition_wipe` |
| **Story/Vulnerable** | 10% | Why this matters, brand story | `talking_head_overlay` |

### Hooks Library

First second determines everything. System stores and rotates proven hooks:

```sql
CREATE TABLE video_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  hook_text TEXT NOT NULL,
  hook_type VARCHAR(50),              -- 'pattern_interrupt', 'question', 'statement', 'controversial', 'story'
  
  -- Targeting
  collections TEXT[],                  -- Which collections this works for
  content_types TEXT[],               -- 'quote_reveal', 'educational', etc.
  
  -- Performance tracking
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,4),
  avg_engagement_rate DECIMAL(5,4),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Pre-Built Hooks (Seed Data):**

```sql
-- Pattern Interrupt Hooks
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types) VALUES
('Stop scrolling if you''re in therapy', 'pattern_interrupt', ARRAY['grounding', 'wholeness', 'growth'], ARRAY['quote_reveal']),
('POV: You finally found wall art that doesn''t say "good vibes only"', 'pattern_interrupt', ARRAY['general'], ARRAY['quote_reveal']),
('If your walls say "rise and grind" we need to talk', 'pattern_interrupt', ARRAY['general'], ARRAY['quote_reveal']),
('This is for people who can''t "just stay positive"', 'pattern_interrupt', ARRAY['wholeness'], ARRAY['quote_reveal']),
('POV: Your bedroom finally feels safe', 'pattern_interrupt', ARRAY['grounding'], ARRAY['quote_reveal']);

-- Question Hooks
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types) VALUES
('Do your walls stress you out or hold you?', 'question', ARRAY['general'], ARRAY['quote_reveal', 'educational']),
('Which do you need: grounding, wholeness, or growth?', 'question', ARRAY['general'], ARRAY['educational']),
('What''s on your bedroom walls right now?', 'question', ARRAY['general'], ARRAY['quote_reveal']),
('Why do therapists'' offices always have generic art?', 'question', ARRAY['general'], ARRAY['educational']);

-- Statement Hooks
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types) VALUES
('Your walls should hold you, not motivate you', 'statement', ARRAY['general'], ARRAY['quote_reveal']),
('I made the opposite of hustle culture wall art', 'statement', ARRAY['general'], ARRAY['brand_story']),
('Not motivation. Just holding.', 'statement', ARRAY['grounding'], ARRAY['quote_reveal']),
('Therapy-informed wall art is now a thing', 'statement', ARRAY['general'], ARRAY['educational']);

-- Controversial/Hot Take Hooks
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types) VALUES
('Unpopular opinion: motivational quotes are toxic', 'controversial', ARRAY['general'], ARRAY['brand_story']),
('Your "good vibes only" sign is gaslighting you', 'controversial', ARRAY['general'], ARRAY['brand_story']),
('If you''re tired, you don''t need inspiration', 'controversial', ARRAY['wholeness'], ARRAY['quote_reveal']),
('Stop telling anxious people to "just breathe"', 'controversial', ARRAY['grounding'], ARRAY['brand_story']);

-- Story Hooks
INSERT INTO video_hooks (hook_text, hook_type, collections, content_types) VALUES
('I launched a business for my therapist''s office', 'story', ARRAY['general'], ARRAY['brand_story']),
('This print saved my bedroom from becoming a panic room', 'story', ARRAY['grounding'], ARRAY['quote_reveal']),
('After 30 years as a designer, I made this', 'story', ARRAY['general'], ARRAY['brand_story']),
('What my therapist has on her walls vs what mine say now', 'story', ARRAY['general'], ARRAY['transformation']);
```

### Hook Selection Algorithm

```javascript
async function selectHook(collection: string, contentType: string) {
  // Get hooks that match collection and content type
  const hooks = await db.video_hooks
    .where({ is_active: true })
    .whereArrayContains('collections', collection)
    .whereArrayContains('content_types', contentType)
    .orderBy('usage_count', 'asc')  // Prioritize less-used hooks
    .limit(5);
  
  // Weight by performance if we have data
  const hooksWithScores = hooks.map(h => ({
    ...h,
    score: h.avg_completion_rate 
      ? h.avg_completion_rate * 100 + (1 / (h.usage_count + 1)) * 50
      : 50 + (1 / (h.usage_count + 1)) * 50  // New hooks get neutral score
  }));
  
  // Weighted random selection
  const selected = weightedRandomSelect(hooksWithScores, 'score');
  
  // Update usage
  await db.video_hooks.update(selected.id, {
    usage_count: selected.usage_count + 1
  });
  
  return selected;
}
```

### Creatomate Integration

**Connection Type:** API only (metadata management in Haven Hub)

**Database Schema: Video Templates**

```sql
CREATE TABLE video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Creatomate reference
  creatomate_template_id VARCHAR(100) NOT NULL,
  
  -- Metadata (managed in Haven Hub)
  name VARCHAR(100) NOT NULL,
  description TEXT,
  preview_url TEXT,
  
  -- Categorization
  template_style VARCHAR(50),        -- 'quote_fade', 'quote_reveal', 'quote_minimal', 'before_after', 'text_sequence'
  content_type VARCHAR(50),          -- 'quote_reveal', 'educational', 'transformation', 'brand_story'
  output_formats TEXT[],             -- ['9:16', '4:5']
  duration_seconds INTEGER,
  
  -- Hook configuration
  supports_hook_overlay BOOLEAN DEFAULT true,
  hook_position VARCHAR(20),         -- 'top', 'center', 'bottom'
  
  -- Collection mapping
  collections TEXT[],                -- Which collections this works for
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_completion_rate DECIMAL(5,4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Template Styles:**

| Style | Description | Duration | Content Type | Hook Position |
|-------|-------------|----------|--------------|---------------|
| `quote_fade` | Quote fades in over footage, holds, fades out | 8-10 sec | Quote Reveal | Top or none |
| `quote_reveal` | Text types on letter by letter | 6-8 sec | Quote Reveal | Top |
| `quote_minimal` | Static text, footage does the work | 5-7 sec | Quote Reveal | None |
| `before_after` | Split screen or transition wipe | 8-12 sec | Transformation | Top |
| `text_sequence` | Multiple text slides with transitions | 10-15 sec | Educational | Center |
| `collection_showcase` | 3 quotes from collection with icons | 12-18 sec | Educational | Top |

**Creatomate API Call:**

```javascript
async function renderVideo(quoteId: string) {
  const quote = await getQuote(quoteId);
  const footage = await selectFootage(quote.collection);
  const music = await selectMusic(quote.collection);
  const template = await getDefaultVideoTemplate(quote.collection);
  const hook = await selectHook(quote.collection, 'quote_reveal');
  
  const response = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: template.creatomate_template_id,
      modifications: {
        'Quote-Text': quote.text,
        'Background-Video': footage.video_url,
        'Music-Track': music.file_url,
        'Hook-Text': hook.hook_text
      },
      // Render both formats in one call
      render_preset: 'social-media-pack',
      output_format: 'mp4',
      // Generate thumbnail options
      snapshot_time: [2, 4, 6],  // Capture frames at 2s, 4s, 6s
      metadata: {
        quote_id: quoteId,
        footage_id: footage.id,
        music_id: music.id,
        hook_id: hook.id
      }
    })
  });
  
  return response.json();
}
```

### Video Thumbnail Selection

For Reels and TikTok, the cover image significantly impacts click-through. System generates multiple thumbnail options:

**Database Schema: Thumbnails**

```sql
CREATE TABLE video_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_asset_id UUID REFERENCES assets(id),
  
  -- Thumbnail data
  thumbnail_url TEXT NOT NULL,
  timestamp_seconds DECIMAL(5,2),      -- When in video this was captured
  
  -- Selection
  is_selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add to scheduled posts
ALTER TABLE instagram_scheduled_posts 
ADD COLUMN selected_thumbnail_id UUID REFERENCES video_thumbnails(id);
```

**Thumbnail Generation:**

```javascript
async function generateThumbnails(videoAssetId: string, videoUrl: string) {
  // Capture frames at key moments
  const timestamps = [2, 4, 6];  // seconds
  
  const thumbnails = await Promise.all(
    timestamps.map(async (ts) => {
      const thumbnailUrl = await captureFrame(videoUrl, ts);
      
      return db.video_thumbnails.insert({
        video_asset_id: videoAssetId,
        thumbnail_url: thumbnailUrl,
        timestamp_seconds: ts,
        is_selected: ts === 4  // Default to middle frame
      });
    })
  );
  
  return thumbnails;
}
```

**Thumbnail Selection UI:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Select Cover Image                                               [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Choose the thumbnail that will appear in the feed:                    │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │              │  │              │  │              │                  │
│  │   Frame 1    │  │   Frame 2    │  │   Frame 3    │                  │
│  │    (2s)      │  │    (4s)      │  │    (6s)      │                  │
│  │              │  │      ✓       │  │              │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│       ○ Select        ● Selected        ○ Select                       │
│                                                                         │
│  💡 Tip: Choose a frame where the quote text is fully visible          │
│                                                                         │
│                                            [Cancel]  [Save Selection]   │
└─────────────────────────────────────────────────────────────────────────┘
```
```

**Webhook Handler:**

```javascript
// POST /api/webhooks/creatomate
async function handleCreatomateWebhook(req: Request) {
  const { id, status, url, metadata } = req.body;
  
  if (status === 'succeeded') {
    // Download and store in asset library
    const asset = await downloadAndStoreVideo(url, metadata.quote_id);
    
    // Update usage tracking
    await incrementFootageUsage(metadata.footage_id);
    await incrementMusicUsage(metadata.music_id);
    
    // Trigger scheduling based on Operator Mode
    await triggerPostScheduling(metadata.quote_id, asset.id);
    
    // Log to activity feed
    await logActivity('video_generated', { quote_id: metadata.quote_id, asset_id: asset.id });
  }
  
  if (status === 'failed') {
    await logError('video_generation_failed', { render_id: id, metadata });
    await notifyUser('Video generation failed', metadata.quote_id);
  }
}
```

### Output Specifications

| Format | Dimensions | Aspect Ratio | Use Case |
|--------|------------|--------------|----------|
| `feed` | 1080x1350 | 4:5 portrait | Instagram Feed |
| `reel` | 1080x1920 | 9:16 | Instagram Reels, TikTok, Stories |

---

## Stock Footage Management

### Overview

Curated pools of Pexels videos organized by collection, with smart selection to avoid repetition.

### Database Schema

```sql
CREATE TABLE stock_footage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'pexels',
  source_id VARCHAR(100),
  source_url TEXT NOT NULL,
  video_url TEXT NOT NULL,              -- Direct file URL for API calls
  
  -- Metadata (auto-fetched)
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  aspect_ratio VARCHAR(10),             -- '16:9', '9:16'
  orientation VARCHAR(20),              -- 'landscape', 'portrait'
  
  -- Categorization
  collection VARCHAR(50) NOT NULL,      -- 'grounding', 'wholeness', 'growth', 'general'
  mood_tags TEXT[],
  notes TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_footage_selection 
ON stock_footage(collection, is_active, orientation, last_used_at NULLS FIRST);
```

### Pexels API Integration

```javascript
async function fetchPexelsMetadata(url: string) {
  // Extract video ID from URL
  const videoId = extractPexelsId(url);
  
  const response = await fetch(
    `https://api.pexels.com/videos/videos/${videoId}`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  
  const data = await response.json();
  
  // Find HD portrait version
  const videoFile = data.video_files
    .filter(f => f.height > f.width)  // Portrait only
    .sort((a, b) => b.height - a.height)  // Highest quality
    .find(f => f.quality === 'hd' || f.quality === 'sd');
  
  return {
    source_id: data.id.toString(),
    source_url: data.url,
    video_url: videoFile?.link,
    duration_seconds: data.duration,
    width: videoFile?.width,
    height: videoFile?.height,
    aspect_ratio: videoFile?.width < videoFile?.height ? '9:16' : '16:9',
    orientation: videoFile?.width < videoFile?.height ? 'portrait' : 'landscape',
    suggested_tags: data.tags?.map(t => t.toLowerCase()) || []
  };
}
```

### Smart Selection Algorithm

```javascript
async function selectFootage(collection: string, excludeIds: string[] = []) {
  // 1. Try unused portrait footage in collection
  let footage = await db.stock_footage
    .where({ 
      collection, 
      is_active: true, 
      orientation: 'portrait',
      usage_count: 0 
    })
    .whereNotIn('id', excludeIds)
    .orderBy('created_at', 'asc')
    .first();
  
  // 2. If all used, get least recently used
  if (!footage) {
    footage = await db.stock_footage
      .where({ collection, is_active: true, orientation: 'portrait' })
      .whereNotIn('id', excludeIds)
      .orderBy('last_used_at', 'asc')
      .first();
  }
  
  // 3. Fallback to General pool
  if (!footage && collection !== 'general') {
    return selectFootage('general', excludeIds);
  }
  
  // 4. Update usage
  if (footage) {
    await db.stock_footage.update(footage.id, {
      usage_count: footage.usage_count + 1,
      last_used_at: new Date()
    });
  }
  
  return footage;
}
```

### Pool Health Monitoring

```javascript
async function checkPoolHealth() {
  const collections = ['grounding', 'wholeness', 'growth', 'general'];
  const alerts = [];
  
  for (const collection of collections) {
    const count = await db.stock_footage
      .where({ collection, is_active: true, orientation: 'portrait' })
      .count();
    
    const unused = await db.stock_footage
      .where({ collection, is_active: true, orientation: 'portrait', usage_count: 0 })
      .count();
    
    if (count < 10) {
      alerts.push({ collection, level: 'critical', message: `Only ${count} videos` });
    } else if (count < 20) {
      alerts.push({ collection, level: 'warning', message: `${count} videos (add more)` });
    } else if (unused === 0) {
      alerts.push({ collection, level: 'warning', message: 'All videos used, will repeat' });
    }
  }
  
  return alerts;
}
```

### Mood Tags by Collection

| Collection | Suggested Search Terms | Mood Tags |
|------------|------------------------|-----------|
| Grounding | "cozy bedroom", "morning light curtains", "calm reading nook", "soft blanket" | cozy, warm, safe, anchored, stable |
| Wholeness | "self care morning", "peaceful bath", "gentle hands coffee", "journaling" | tender, nurturing, gentle, soft |
| Growth | "sunrise timelapse", "plant growing", "walking forest", "light through trees" | emerging, hopeful, becoming, fresh |
| General | "minimalist home", "soft natural light", "calm interior", "neutral decor" | calm, neutral, sanctuary, peaceful |

---

## Music Pool Management

### Overview

Curated ambient music from Epidemic Sound, organized by collection mood, with rotation to avoid repetition.

### Database Schema

```sql
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source VARCHAR(50) NOT NULL DEFAULT 'epidemic_sound',
  source_id VARCHAR(100),
  source_url TEXT NOT NULL,             -- Epidemic Sound page URL
  file_url TEXT NOT NULL,               -- Downloaded file URL (stored in Haven Hub)
  
  -- Metadata
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200),
  duration_seconds INTEGER,
  bpm INTEGER,
  
  -- Categorization
  collection VARCHAR(50) NOT NULL,
  mood_tags TEXT[],
  genre VARCHAR(100),
  notes TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- License tracking
  license_type VARCHAR(50) DEFAULT 'epidemic_subscription',
  license_expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_music_selection 
ON music_tracks(collection, is_active, last_used_at NULLS FIRST);
```

### Smart Selection Algorithm

```javascript
async function selectMusic(collection: string, excludeIds: string[] = []) {
  // Same pattern as footage selection
  let track = await db.music_tracks
    .where({ collection, is_active: true, usage_count: 0 })
    .whereNotIn('id', excludeIds)
    .orderBy('created_at', 'asc')
    .first();
  
  if (!track) {
    track = await db.music_tracks
      .where({ collection, is_active: true })
      .whereNotIn('id', excludeIds)
      .orderBy('last_used_at', 'asc')
      .first();
  }
  
  if (!track && collection !== 'general') {
    return selectMusic('general', excludeIds);
  }
  
  if (track) {
    await db.music_tracks.update(track.id, {
      usage_count: track.usage_count + 1,
      last_used_at: new Date()
    });
  }
  
  return track;
}
```

### Music Mood Guidelines

| Collection | Music Mood | Characteristics | Example Genres |
|------------|------------|-----------------|----------------|
| Grounding | Warm, stable, anchoring | Slow tempo (60-80 BPM), major keys, sustained notes | Ambient piano, acoustic guitar, warm pads |
| Wholeness | Tender, nurturing | Gentle dynamics, soft attacks, flowing | Gentle strings, music box, lullaby-style |
| Growth | Hopeful, emerging | Building progressions, ascending melodies | Sunrise ambient, nature sounds, soft crescendos |
| General | Calm, sanctuary | Neutral, unobtrusive, meditative | Lo-fi ambient, rain sounds, meditation music |

### File Storage

Music files are downloaded from Epidemic Sound and stored in Haven Hub's asset storage:

```
/assets/music/
  ├── grounding/
  │   ├── soft-morning-light.mp3
  │   └── warm-embrace.mp3
  ├── wholeness/
  │   ├── gentle-rain.mp3
  │   └── tender-moment.mp3
  ├── growth/
  │   └── sunrise-hope.mp3
  └── general/
      └── calm-sanctuary.mp3
```

---

## Instagram Scheduler

### Day-Specific Content Strategy

The scheduler enforces Haven & Hold's weekly content rhythm:

| Day | Primary Content | Content Pillar | Best Time (EST) |
|-----|-----------------|----------------|-----------------|
| **Monday** | Carousel (Educational) | Educational | 11:00 AM |
| **Tuesday** | Reel (Transformation) | Product Showcase | 9:00 AM |
| **Wednesday** | Feed (Best-seller) | Product Showcase | 1:00 PM |
| **Thursday** | Reel + Carousel | Brand Story | 12:00 PM, 7:00 PM |
| **Friday** | Feed (UGC/Customer) | Community | 11:00 AM |
| **Saturday** | Reel + Feed (Product) | Product Showcase | 9:00 AM, 1:00 PM |
| **Sunday** | Carousel (Reflection) | Brand Story | 10:00 AM |

### Weekly Content Mix Enforcement

```javascript
const WEEKLY_TARGETS = {
  feed_posts: { min: 5, max: 7 },
  reels: { min: 3, max: 5 },
  carousels: { min: 2, max: 3 },
  stories: { min: 21, max: 49 }  // 3-7 per day
};

const PILLAR_MIX = {
  product_showcase: 0.40,  // ~3 per week
  brand_story: 0.20,       // ~1-2 per week
  educational: 0.20,       // ~1-2 per week
  community: 0.20          // ~1-2 per week
};

async function validateWeeklyMix(weekStartDate: Date) {
  const scheduled = await getScheduledPostsForWeek(weekStartDate);
  
  const pillarCounts = {
    product_showcase: 0,
    brand_story: 0,
    educational: 0,
    community: 0
  };
  
  scheduled.forEach(post => {
    pillarCounts[post.content_pillar]++;
  });
  
  const total = scheduled.length;
  const warnings = [];
  
  Object.entries(PILLAR_MIX).forEach(([pillar, target]) => {
    const actual = pillarCounts[pillar] / total;
    if (actual < target - 0.1) {
      warnings.push(`Low ${pillar}: ${Math.round(actual * 100)}% vs target ${Math.round(target * 100)}%`);
    }
  });
  
  return { pillarCounts, warnings };
}
```

### Database Schema: Scheduled Posts

```sql
CREATE TABLE instagram_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content references
  quote_id UUID REFERENCES quotes(id),
  template_id UUID REFERENCES instagram_templates(id),
  
  -- Content classification
  content_pillar VARCHAR(50) NOT NULL,  -- 'product_showcase', 'brand_story', 'educational', 'community'
  
  -- Assets
  primary_asset_id UUID REFERENCES assets(id),
  additional_assets UUID[],             -- For carousels (up to 10)
  video_asset_id UUID REFERENCES assets(id),
  thumbnail_asset_id UUID REFERENCES assets(id),
  
  -- Post type
  post_type VARCHAR(20) NOT NULL,       -- 'feed', 'reel', 'story', 'carousel'
  
  -- Generated content
  caption TEXT NOT NULL,
  hashtags TEXT[],
  alt_text TEXT,
  
  -- Shopping
  product_id VARCHAR(100),              -- Shopify product ID
  include_shopping_tag BOOLEAN DEFAULT true,
  
  -- Location
  location_id VARCHAR(100),
  location_name VARCHAR(200),
  
  -- Cross-posting
  crosspost_to_facebook BOOLEAN DEFAULT true,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft',   -- draft, scheduled, publishing, published, failed
  published_at TIMESTAMPTZ,
  instagram_media_id VARCHAR(100),
  facebook_media_id VARCHAR(100),
  
  -- Operator mode
  requires_review BOOLEAN DEFAULT true,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  
  -- Campaigns/Tags
  campaign_tag VARCHAR(100),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_status ON instagram_scheduled_posts(status, scheduled_at);
CREATE INDEX idx_scheduled_posts_queue ON instagram_scheduled_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_posts_pillar ON instagram_scheduled_posts(content_pillar, scheduled_at);
```

### Smart Day-Based Scheduling

```javascript
const DAY_CONTENT_MAP = {
  0: { // Sunday
    primary: { type: 'carousel', pillar: 'brand_story', time: '10:00' },
    theme: 'reflection'
  },
  1: { // Monday
    primary: { type: 'carousel', pillar: 'educational', time: '11:00' },
    theme: 'fresh_start'
  },
  2: { // Tuesday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    theme: 'transformation'
  },
  3: { // Wednesday
    primary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'bestseller'
  },
  4: { // Thursday
    primary: { type: 'reel', pillar: 'brand_story', time: '12:00' },
    secondary: { type: 'carousel', pillar: 'educational', time: '19:00' },
    theme: 'therapy_thursday'
  },
  5: { // Friday
    primary: { type: 'feed', pillar: 'community', time: '11:00' },
    theme: 'feature_friday'
  },
  6: { // Saturday
    primary: { type: 'reel', pillar: 'product_showcase', time: '09:00' },
    secondary: { type: 'feed', pillar: 'product_showcase', time: '13:00' },
    theme: 'showcase'
  }
};

async function findOptimalSlot(
  postType: string,
  contentPillar: string,
  preferredDate?: Date
) {
  const startDate = preferredDate || new Date();
  
  // Look ahead 14 days for best slot
  for (let i = 0; i < 14; i++) {
    const checkDate = addDays(startDate, i);
    const dayOfWeek = checkDate.getDay();
    const dayConfig = DAY_CONTENT_MAP[dayOfWeek];
    
    // Check if this day matches content type
    const matchesPrimary = dayConfig.primary.type === postType && 
                           dayConfig.primary.pillar === contentPillar;
    const matchesSecondary = dayConfig.secondary?.type === postType && 
                             dayConfig.secondary?.pillar === contentPillar;
    
    if (matchesPrimary || matchesSecondary) {
      const timeSlot = matchesPrimary ? dayConfig.primary.time : dayConfig.secondary.time;
      const scheduledAt = setTimeOnDate(checkDate, timeSlot);
      
      // Check slot isn't already taken
      const existing = await db.instagram_scheduled_posts
        .where({ scheduled_at: scheduledAt, status: 'scheduled' })
        .first();
      
      if (!existing) {
        return {
          scheduled_at: scheduledAt,
          day_theme: dayConfig.theme,
          is_optimal: true
        };
      }
    }
  }
  
  // Fallback: find any available slot
  return findAnyAvailableSlot(postType, startDate);
}
```

### Optimal Posting Times (Data-Driven)

```sql
CREATE TABLE instagram_optimal_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  day_of_week INTEGER,                  -- 0=Sunday, 6=Saturday
  hour INTEGER,                         -- 0-23
  
  -- Performance data
  avg_engagement_rate DECIMAL(5,4),
  avg_reach INTEGER,
  sample_size INTEGER,
  
  -- Slot availability
  posts_this_week INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with industry defaults
INSERT INTO instagram_optimal_times (day_of_week, hour, avg_engagement_rate) VALUES
(1, 9, 0.035),   -- Monday 9am
(2, 9, 0.038),   -- Tuesday 9am
(2, 12, 0.032),  -- Tuesday 12pm
(3, 9, 0.036),   -- Wednesday 9am
(4, 9, 0.034),   -- Thursday 9am
(4, 12, 0.031),  -- Thursday 12pm
(5, 9, 0.033),   -- Friday 9am
(6, 10, 0.029);  -- Saturday 10am
```

### Scheduling Algorithm

```javascript
async function findOptimalTime(preferredDate?: Date) {
  const nextWeek = getNextWeekSlots();
  
  // Get slots sorted by engagement rate
  const slots = await db.instagram_optimal_times
    .where('posts_this_week', '<', 1)  // Max 1 post per slot per week
    .orderBy('avg_engagement_rate', 'desc')
    .limit(5);
  
  // Find next available slot
  for (const slot of slots) {
    const slotDate = getNextOccurrence(slot.day_of_week, slot.hour);
    
    if (preferredDate && slotDate < preferredDate) continue;
    if (slotDate < new Date()) continue;
    
    // Check not already scheduled
    const existing = await db.instagram_scheduled_posts
      .where({ scheduled_at: slotDate, status: 'scheduled' })
      .first();
    
    if (!existing) {
      return slotDate;
    }
  }
  
  // Fallback: next day at 9am
  return getNextDayAt(9);
}
```

### Publishing Flow

```javascript
// Trigger.dev scheduled job
export const publishInstagramPost = schedules.task({
  id: 'publish-instagram-post',
  cron: '*/5 * * * *',  // Every 5 minutes
  run: async () => {
    const duePost = await db.instagram_scheduled_posts
      .where('status', 'scheduled')
      .where('scheduled_at', '<=', new Date())
      .orderBy('scheduled_at', 'asc')
      .first();
    
    if (!duePost) return;
    
    try {
      await updatePostStatus(duePost.id, 'publishing');
      
      // 1. Create media container
      const container = await createMediaContainer(duePost);
      
      // 2. Wait for processing
      await waitForContainerReady(container.id);
      
      // 3. Publish
      const result = await publishContainer(container.id);
      
      // 4. Post hashtags as first comment
      if (duePost.hashtags?.length > 0) {
        await postHashtagsAsFirstComment(result.id, duePost.hashtags);
      }
      
      // 5. Add shopping tag
      if (duePost.include_shopping_tag && duePost.product_id) {
        await addShoppingTag(result.id, duePost.product_id);
      }
      
      // 6. Cross-post to Facebook
      if (duePost.crosspost_to_facebook) {
        await crosspostToFacebook(duePost, result);
      }
      
      // 7. Update status
      await db.instagram_scheduled_posts.update(duePost.id, {
        status: 'published',
        published_at: new Date(),
        instagram_media_id: result.id
      });
      
      // 8. Log activity
      await logActivity('instagram_published', { post_id: duePost.id });
      
    } catch (error) {
      await handlePublishError(duePost.id, error);
    }
  }
});
```

### Error Handling & Retry

```javascript
async function handlePublishError(postId: string, error: Error) {
  const post = await db.instagram_scheduled_posts.findById(postId);
  
  const isRetryable = [
    'RATE_LIMITED',
    'TEMPORARY_ERROR',
    'NETWORK_ERROR'
  ].includes(error.code);
  
  if (isRetryable && post.retry_count < 3) {
    // Exponential backoff: 5min, 15min, 45min
    const delayMinutes = 5 * Math.pow(3, post.retry_count);
    
    await db.instagram_scheduled_posts.update(postId, {
      status: 'scheduled',
      scheduled_at: addMinutes(new Date(), delayMinutes),
      retry_count: post.retry_count + 1,
      last_retry_at: new Date(),
      error_message: error.message
    });
    
    await logActivity('instagram_publish_retry', { 
      post_id: postId, 
      retry_count: post.retry_count + 1,
      next_attempt: delayMinutes 
    });
  } else {
    await db.instagram_scheduled_posts.update(postId, {
      status: 'failed',
      error_message: error.message
    });
    
    await notifyUser('Instagram post failed', {
      post_id: postId,
      error: error.message
    });
    
    await logActivity('instagram_publish_failed', { 
      post_id: postId, 
      error: error.message 
    });
  }
}
```

### Rate Limit Management

```javascript
const RATE_LIMITS = {
  posts_per_day: 25,
  api_calls_per_hour: 200,
  comments_per_hour: 60
};

async function checkRateLimits() {
  const today = startOfDay(new Date());
  const hourAgo = subHours(new Date(), 1);
  
  const postsToday = await db.instagram_scheduled_posts
    .where('published_at', '>=', today)
    .where('status', 'published')
    .count();
  
  const apiCallsThisHour = await db.api_logs
    .where('service', 'instagram')
    .where('created_at', '>=', hourAgo)
    .count();
  
  return {
    can_post: postsToday < RATE_LIMITS.posts_per_day,
    can_call_api: apiCallsThisHour < RATE_LIMITS.api_calls_per_hour,
    posts_remaining: RATE_LIMITS.posts_per_day - postsToday,
    api_calls_remaining: RATE_LIMITS.api_calls_per_hour - apiCallsThisHour
  };
}
```

### Carousel Support

```javascript
async function createCarouselContainer(post: ScheduledPost) {
  const childContainers = [];
  
  // Create container for each image (up to 10)
  for (const assetId of post.additional_assets.slice(0, 10)) {
    const asset = await getAsset(assetId);
    
    const child = await fetch(`https://graph.facebook.com/v18.0/${IG_USER_ID}/media`, {
      method: 'POST',
      body: JSON.stringify({
        image_url: asset.public_url,
        is_carousel_item: true,
        access_token: ACCESS_TOKEN
      })
    });
    
    childContainers.push(child.id);
  }
  
  // Create parent carousel container
  const carousel = await fetch(`https://graph.facebook.com/v18.0/${IG_USER_ID}/media`, {
    method: 'POST',
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      caption: post.caption,
      children: childContainers.join(','),
      access_token: ACCESS_TOKEN
    })
  });
  
  return carousel;
}
```

### Stories Support

```javascript
async function createStoryContainer(post: ScheduledPost) {
  const asset = await getAsset(post.primary_asset_id);
  
  const isVideo = asset.mime_type.startsWith('video/');
  
  const container = await fetch(`https://graph.facebook.com/v18.0/${IG_USER_ID}/media`, {
    method: 'POST',
    body: JSON.stringify({
      [isVideo ? 'video_url' : 'image_url']: asset.public_url,
      media_type: isVideo ? 'STORIES' : 'STORIES',
      access_token: ACCESS_TOKEN
    })
  });
  
  return container;
}
```

### Stories Hybrid Strategy

Your Instagram guide calls for 3-7 Stories daily posted "throughout the day." Since Stories require different timing and often reactive content, Haven Hub uses a **hybrid approach**:

**Automated Stories (1-2/day):**
- Daily quote Story (morning, auto-scheduled)
- Product highlight Story (afternoon, auto-scheduled)

**Manual Queue Stories (1-5/day):**
- Polls and questions
- Behind-the-scenes moments
- Quiz CTAs
- Reactive/timely content
- Customer features

**Database Schema: Story Queue**

```sql
CREATE TABLE instagram_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  asset_id UUID REFERENCES assets(id),
  story_type VARCHAR(50),              -- 'quote_daily', 'product_highlight', 'poll', 'quiz_cta', 'bts', 'ugc'
  
  -- For auto-scheduled stories
  template_id UUID REFERENCES story_templates(id),
  caption_overlay TEXT,                -- Text to overlay on image/video
  
  -- For polls/questions (manual)
  poll_question TEXT,
  poll_options TEXT[],
  
  -- Scheduling
  schedule_type VARCHAR(20),           -- 'auto', 'manual_queue'
  scheduled_at TIMESTAMPTZ,
  target_time_slot VARCHAR(20),        -- 'morning', 'midday', 'afternoon', 'evening'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, scheduled, posted, expired
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,              -- 24 hours after posting
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(100) NOT NULL,
  story_type VARCHAR(50),              -- 'quote_daily', 'product_highlight', 'quiz_cta'
  
  -- Visual template
  background_type VARCHAR(20),         -- 'image', 'video', 'branded_solid'
  text_overlay_template TEXT,
  text_position VARCHAR(20),           -- 'top', 'center', 'bottom'
  
  -- CTA
  link_url TEXT,
  link_label TEXT,                     -- "See more", "Take quiz", etc.
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Auto-Scheduled Story Flow:**

```javascript
// Daily job: Schedule tomorrow's auto-stories
export const scheduleAutoStories = schedules.task({
  id: 'schedule-auto-stories',
  cron: '0 20 * * *',  // 8 PM daily, schedule for next day
  run: async () => {
    const tomorrow = addDays(new Date(), 1);
    
    // 1. Morning Quote Story (9 AM)
    const morningQuote = await getRandomApprovedQuote();
    await db.instagram_stories.insert({
      asset_id: await generateStoryAsset(morningQuote, 'quote_daily'),
      story_type: 'quote_daily',
      template_id: await getTemplate('Daily Quote Story'),
      caption_overlay: morningQuote.text,
      schedule_type: 'auto',
      scheduled_at: setHours(tomorrow, 9),
      target_time_slot: 'morning',
      status: 'scheduled'
    });
    
    // 2. Afternoon Product Story (2 PM)
    const featuredProduct = await getFeaturedProduct();
    await db.instagram_stories.insert({
      asset_id: featuredProduct.mockup_asset_id,
      story_type: 'product_highlight',
      template_id: await getTemplate('Product Highlight Story'),
      schedule_type: 'auto',
      scheduled_at: setHours(tomorrow, 14),
      target_time_slot: 'afternoon',
      status: 'scheduled'
    });
    
    // Log for activity feed
    await logActivity('auto_stories_scheduled', { date: tomorrow, count: 2 });
  }
});
```

**Stories Queue UI:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stories                                               [+ Create Story]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Today's Stories                                          5/7 target   │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌ ─ ─ ─┐ ┌ ─ ─ ─┐      │
│  │  ✓   │ │  ✓   │ │  ✓   │ │  ○   │ │  ○   │ │      │ │      │      │
│  │ 9am  │ │ 11am │ │ 2pm  │ │ 5pm  │ │ 7pm  │ │  +   │ │  +   │      │
│  │Quote │ │ Poll │ │Prod. │ │ BTS  │ │ Quiz │ │      │ │      │      │
│  │ AUTO │ │manual│ │ AUTO │ │queue │ │queue │ │      │ │      │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └ ─ ─ ─┘ └ ─ ─ ─┘      │
│                                                                         │
│  ✓ Posted  ○ Scheduled/Ready  + Add more                               │
│                                                                         │
│  Manual Queue (ready to post)                                          │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ┌────────┐  Poll: "Which collection speaks to you?"               │ │
│  │ │ thumb  │  Options: Grounding / Wholeness / Growth               │ │
│  │ └────────┘  Suggested time: Evening                               │ │
│  │                                    [Copy to App]  [Mark Posted]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ┌────────┐  Quiz CTA: "Find your sanctuary style"                 │ │
│  │ │ thumb  │  Link: Quiz URL                                        │ │
│  │ └────────┘  Suggested time: Midday or Evening                     │ │
│  │                                    [Copy to App]  [Mark Posted]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  💡 Tip: 3-7 stories/day keeps you visible. Mix auto + manual.        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Story Templates (Pre-Built):**

| Template | Type | Auto/Manual | Frequency |
|----------|------|-------------|-----------|
| Daily Quote Story | quote_daily | Auto | 1/day (morning) |
| Product Highlight | product_highlight | Auto | 1/day (afternoon) |
| Quiz CTA | quiz_cta | Manual queue | 1/day |
| Poll | poll | Manual queue | 2-3/week |
| Behind the Scenes | bts | Manual queue | 2-3/week |
| Customer Feature | ugc | Manual queue | When available |

**Story Time Slots:**

| Slot | Time Range | Best For |
|------|------------|----------|
| Morning | 8-10 AM | Quote of the day, inspiration |
| Midday | 11 AM-1 PM | Educational, polls |
| Afternoon | 2-4 PM | Product highlights |
| Evening | 6-9 PM | Quiz CTAs, engagement, BTS |
```

---

## TikTok Queue

### Overview

Since TikTok doesn't have a public posting API, Haven Hub generates content and provides a streamlined manual posting experience. TikTok is a **primary traffic driver** (25-35% of traffic) requiring consistent daily posting.

### TikTok Posting Strategy

| Phase | Frequency | Timing |
|-------|-----------|--------|
| Pre-Launch | 1 video/day | Build anticipation |
| Launch Week | 2 videos/day | Morning (7-9 AM) + Evening (7-9 PM) |
| Weeks 2-8 | 1-2 videos/day | Consistency is key |

**Video Length Targets:**
- Ideal: 7-15 seconds (highest completion rate)
- Maximum: 30 seconds
- First 1 second = everything

### Content Mix for TikTok

| Type | % | Auto-Generated? |
|------|---|-----------------|
| Quote Reveals | 40% | ✓ Yes (video pipeline) |
| Educational | 30% | Partial (templates + manual) |
| Transformation | 20% | Partial (before/after templates) |
| Vulnerable/Story | 10% | Manual (requires filming) |

### Database Schema

```sql
CREATE TABLE tiktok_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content references
  quote_id UUID REFERENCES quotes(id),
  video_asset_id UUID REFERENCES assets(id),
  
  -- Content classification
  content_type VARCHAR(50),           -- 'quote_reveal', 'educational', 'transformation', 'story'
  
  -- Hook (from hooks library)
  hook_id UUID REFERENCES video_hooks(id),
  hook_text TEXT,
  
  -- Generated content
  caption TEXT NOT NULL,
  hashtags TEXT[],
  
  -- Scheduling
  target_date DATE,
  target_time TIME,                   -- Morning or evening slot
  slot_type VARCHAR(20),              -- 'morning', 'evening'
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, ready, downloaded, posted
  downloaded_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  
  -- Performance (manual entry)
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track daily posting to ensure consistency
CREATE TABLE tiktok_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  morning_posted BOOLEAN DEFAULT false,
  evening_posted BOOLEAN DEFAULT false,
  total_posted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Queue Generation

When a quote is approved, system automatically:
1. Generates video (same as Instagram Reel)
2. Creates TikTok queue entry
3. Generates TikTok-optimized caption
4. Assigns target date/time slot
5. Selects and applies hook

```javascript
async function createTikTokQueueEntry(quoteId: string, videoAssetId: string) {
  const quote = await getQuote(quoteId);
  
  // Select hook for this content
  const hook = await selectHook(quote.collection, 'quote_reveal');
  
  // Generate TikTok-optimized caption
  const caption = await generateTikTokCaption(quote, hook);
  
  // Generate hashtags (TikTok uses 15-hashtag strategy)
  const hashtags = await generateTikTokHashtags(quote.collection);
  
  // Find next available slot
  const { targetDate, slotType } = await findNextTikTokSlot();
  
  return db.tiktok_queue.insert({
    quote_id: quoteId,
    video_asset_id: videoAssetId,
    content_type: 'quote_reveal',
    hook_id: hook.id,
    hook_text: hook.hook_text,
    caption,
    hashtags,
    target_date: targetDate,
    slot_type: slotType,
    status: 'ready'
  });
}
```

### TikTok Caption Template

```javascript
function generateTikTokCaption(quote: Quote, hook: Hook): string {
  return `${hook.hook_text}

"${quote.text}"

${getCollectionTagline(quote.collection)}

Link in bio 🤍

${TIKTOK_HASHTAGS.join(' ')}`;
}

const COLLECTION_TAGLINES = {
  grounding: 'For the days when everything feels unsteady.',
  wholeness: 'All of you belongs here.',
  growth: 'Still becoming. And that\'s enough.'
};
```

### TikTok Hashtag Strategy

**The 5-5-5 Method (15 hashtags):**

```sql
-- Tier 1: Mega (5 hashtags, 1B+ views)
INSERT INTO tiktok_hashtag_groups (name, tier, hashtags) VALUES
('TikTok Mega', 'mega', ARRAY[
  '#homedecor',
  '#wallart', 
  '#diy',
  '#smallbusiness',
  '#fyp'
]);

-- Tier 2: Large (5 hashtags, 100M-1B views)
INSERT INTO tiktok_hashtag_groups (name, tier, hashtags) VALUES
('TikTok Large', 'large', ARRAY[
  '#minimalistart',
  '#roomtransformation',
  '#homeoffice',
  '#digitaldownload',
  '#mentalhealthmatters'
]);

-- Tier 3: Niche (5 hashtags, 10M-100M views)
INSERT INTO tiktok_hashtag_groups (name, tier, hashtags) VALUES
('TikTok Niche', 'niche', ARRAY[
  '#printableart',
  '#therapyoffice',
  '#traumahealing',
  '#mindfulhome',
  '#quoteart'
]);
```

### Queue Interface Features

**Daily Dashboard:**
- Shows today's posting slots (morning/evening)
- Visual indicator for posted vs. pending
- Streak tracker (consecutive days posted)

**One-Click Workflow:**
1. View video preview
2. Copy caption button (includes hook + hashtags)
3. Download video button
4. Mark as posted
5. Optional: Enter performance metrics

### Batch Preparation View

For weekly content planning:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TikTok Week View                                   Week of Dec 30      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Mon 12/30    Tue 12/31    Wed 1/1     Thu 1/2     Fri 1/3            │
│  ┌────────┐   ┌────────┐   ┌────────┐  ┌────────┐  ┌────────┐         │
│  │ AM: ✓  │   │ AM: ○  │   │ AM: ○  │  │ AM: ○  │  │ AM: ○  │         │
│  │ PM: ✓  │   │ PM: ○  │   │ PM: ○  │  │ PM: ○  │  │ PM: ○  │         │
│  └────────┘   └────────┘   └────────┘  └────────┘  └────────┘         │
│                                                                         │
│  ✓ Posted  ○ Ready  ◐ Pending Generation  ○ Empty                      │
│                                                                         │
│  This Week: 2/14 posted │ Streak: 5 days 🔥                            │
│                                                                         │
│  [Auto-Fill Week with Quote Reveals]                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Performance Tracking

After posting, user can optionally log performance:

```sql
-- Update queue entry with performance
UPDATE tiktok_queue SET
  posted_at = NOW(),
  status = 'posted',
  views = 1500,
  likes = 89,
  comments = 12,
  shares = 5
WHERE id = 'queue_entry_id';

-- System calculates and stores
-- completion_rate, engagement_rate for hook performance analysis
```

This feeds back into hook selection algorithm to prioritize high-performing hooks.

---

## UGC Collection

### Overview

Track mentions and tags to collect user-generated content for social proof and community building.

### Database Schema

```sql
CREATE TABLE instagram_ugc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Instagram data
  instagram_media_id VARCHAR(100) NOT NULL,
  instagram_user_id VARCHAR(100),
  instagram_username VARCHAR(100),
  
  -- Content
  media_type VARCHAR(20),               -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'
  media_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  permalink TEXT,
  
  -- Discovery
  mention_type VARCHAR(20),             -- 'tag', 'mention', 'hashtag'
  
  -- Curation
  status VARCHAR(20) DEFAULT 'new',     -- new, approved, rejected, featured
  notes TEXT,
  
  -- Permissions
  permission_requested BOOLEAN DEFAULT false,
  permission_granted BOOLEAN DEFAULT false,
  permission_requested_at TIMESTAMPTZ,
  permission_response_at TIMESTAMPTZ,
  
  -- Usage
  reposted BOOLEAN DEFAULT false,
  reposted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Mention Monitoring Job

```javascript
// Daily job to fetch new mentions
export const fetchInstagramMentions = schedules.task({
  id: 'fetch-instagram-mentions',
  cron: '0 9 * * *',  // Daily at 9am
  run: async () => {
    // Fetch posts where account is tagged
    const taggedMedia = await fetch(
      `https://graph.facebook.com/v18.0/${IG_USER_ID}/tags?fields=id,media_type,media_url,permalink,caption,username&access_token=${ACCESS_TOKEN}`
    );
    
    for (const media of taggedMedia.data) {
      // Skip if already in database
      const existing = await db.instagram_ugc
        .where('instagram_media_id', media.id)
        .first();
      
      if (existing) continue;
      
      // Save new UGC
      await db.instagram_ugc.insert({
        instagram_media_id: media.id,
        instagram_username: media.username,
        media_type: media.media_type,
        media_url: media.media_url,
        permalink: media.permalink,
        caption: media.caption,
        mention_type: 'tag'
      });
    }
    
    await logActivity('ugc_sync_complete', { 
      new_items: taggedMedia.data.length 
    });
  }
});
```

---

## Analytics Integration

### Database Schema

```sql
CREATE TABLE instagram_post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES instagram_scheduled_posts(id),
  instagram_media_id VARCHAR(100),
  
  -- Engagement metrics
  impressions INTEGER,
  reach INTEGER,
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,
  
  -- Calculated
  engagement_rate DECIMAL(5,4),
  
  -- Reel-specific
  plays INTEGER,
  
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE instagram_account_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  date DATE NOT NULL UNIQUE,
  
  -- Account metrics
  followers INTEGER,
  follower_change INTEGER,
  profile_views INTEGER,
  website_clicks INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track template performance
CREATE TABLE template_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES instagram_templates(id),
  
  total_posts INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,4),
  avg_reach INTEGER,
  avg_saves INTEGER,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track hashtag performance
CREATE TABLE hashtag_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag VARCHAR(100) NOT NULL UNIQUE,
  
  times_used INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,4),
  avg_reach INTEGER,
  
  is_shadowbanned BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Metrics Sync Job

```javascript
export const syncInstagramMetrics = schedules.task({
  id: 'sync-instagram-metrics',
  cron: '0 6 * * *',  // Daily at 6am
  run: async () => {
    // Get posts from last 30 days
    const recentPosts = await db.instagram_scheduled_posts
      .where('status', 'published')
      .where('published_at', '>=', subDays(new Date(), 30));
    
    for (const post of recentPosts) {
      const insights = await fetch(
        `https://graph.facebook.com/v18.0/${post.instagram_media_id}/insights?metric=impressions,reach,likes,comments,saved,shares&access_token=${ACCESS_TOKEN}`
      );
      
      const metrics = parseInsights(insights.data);
      
      await db.instagram_post_metrics.upsert({
        post_id: post.id,
        instagram_media_id: post.instagram_media_id,
        ...metrics,
        engagement_rate: calculateEngagementRate(metrics),
        fetched_at: new Date()
      });
    }
    
    // Update optimal times based on new data
    await recalculateOptimalTimes();
    
    // Update template performance
    await recalculateTemplatePerformance();
    
    // Update hashtag performance
    await recalculateHashtagPerformance();
  }
});
```

---

## Operator Mode Integration

### Behavior by Mode

| Mode | Video Generation | Post Creation | Scheduling | Publishing |
|------|------------------|---------------|------------|------------|
| **Supervised** | Generates, saves to temp | Creates draft | Queued for review | Manual approve required |
| **Assisted** | Generates, saves to library | Creates scheduled post | Auto-selects optimal time | Auto-publishes, notifies |
| **Autopilot** | Generates, saves to library | Creates scheduled post | Auto-selects optimal time | Auto-publishes, logs only |

### Review Queue (Supervised Mode)

```sql
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  item_type VARCHAR(50) NOT NULL,       -- 'instagram_post', 'video', 'tiktok'
  item_id UUID NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  
  preview_data JSONB,                   -- Cached preview info
  
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Review Workflow

```javascript
async function handleQuoteApproval(quoteId: string) {
  const operatorMode = await getOperatorMode();
  
  // Generate video
  const videoJob = await triggerVideoGeneration(quoteId);
  
  // Wait for completion
  const videoAsset = await waitForVideoCompletion(videoJob.id);
  
  // Create post draft
  const post = await createPostDraft(quoteId, videoAsset.id);
  
  if (operatorMode === 'supervised') {
    // Add to review queue
    await db.review_queue.insert({
      item_type: 'instagram_post',
      item_id: post.id,
      preview_data: {
        quote_text: post.quote_text,
        caption_preview: post.caption.substring(0, 100),
        thumbnail_url: videoAsset.thumbnail_url,
        scheduled_at: post.scheduled_at
      }
    });
    
    await notifyUser('Post ready for review', { post_id: post.id });
  }
  
  if (operatorMode === 'assisted') {
    await db.instagram_scheduled_posts.update(post.id, { 
      status: 'scheduled' 
    });
    
    await showToast(`Scheduled "${post.quote_text}" for ${formatDate(post.scheduled_at)}`);
  }
  
  if (operatorMode === 'autopilot') {
    await db.instagram_scheduled_posts.update(post.id, { 
      status: 'scheduled' 
    });
    
    await logActivity('post_auto_scheduled', { post_id: post.id });
  }
}
```

---

## Technical Infrastructure

### Settings Schema

```sql
-- Add to user_settings or create dedicated table
ALTER TABLE user_settings ADD COLUMN instagram_settings JSONB DEFAULT '{
  "auto_schedule_on_approval": true,
  "use_default_template": true,
  "default_template_id": null,
  "preferred_post_times": ["09:00", "12:00", "18:00"],
  "timezone": "America/New_York",
  "posts_per_day_limit": 3,
  "crosspost_to_facebook": true,
  "hashtags_in_caption": false,
  "auto_generate_video": true,
  "auto_generate_alt_text": true,
  "include_shopping_tags": true
}';

ALTER TABLE user_settings ADD COLUMN video_settings JSONB DEFAULT '{
  "auto_generate_on_approval": true,
  "default_template_style": "quote_fade",
  "output_formats": ["9:16", "4:5"],
  "music_enabled": true
}';
```

### API Routes

```
POST   /api/instagram/connect           - OAuth initiation
GET    /api/instagram/callback          - OAuth callback
DELETE /api/instagram/disconnect        - Disconnect account

GET    /api/instagram/posts             - List scheduled posts
POST   /api/instagram/posts             - Create new post
GET    /api/instagram/posts/:id         - Get post details
PATCH  /api/instagram/posts/:id         - Update post
DELETE /api/instagram/posts/:id         - Delete post
POST   /api/instagram/posts/:id/publish - Force publish now

GET    /api/instagram/templates         - List templates
POST   /api/instagram/templates         - Create template
PATCH  /api/instagram/templates/:id     - Update template
DELETE /api/instagram/templates/:id     - Delete template

GET    /api/instagram/hashtags          - List hashtag groups
POST   /api/instagram/hashtags          - Create group
PATCH  /api/instagram/hashtags/:id      - Update group
DELETE /api/instagram/hashtags/:id      - Delete group

GET    /api/instagram/ugc               - List UGC
PATCH  /api/instagram/ugc/:id           - Update UGC status

GET    /api/instagram/analytics         - Get analytics dashboard data

GET    /api/video/templates             - List video templates
POST   /api/video/templates             - Create (metadata only)
PATCH  /api/video/templates/:id         - Update metadata
DELETE /api/video/templates/:id         - Delete

GET    /api/video/footage               - List stock footage
POST   /api/video/footage               - Add to pool
PATCH  /api/video/footage/:id           - Update categorization
DELETE /api/video/footage/:id           - Remove from pool

GET    /api/video/music                 - List music tracks
POST   /api/video/music                 - Add to pool
PATCH  /api/video/music/:id             - Update categorization
DELETE /api/video/music/:id             - Remove from pool

POST   /api/video/render                - Trigger manual render
GET    /api/video/render/:id            - Get render status

POST   /api/webhooks/creatomate         - Creatomate completion webhook

GET    /api/tiktok/queue                - List TikTok queue
PATCH  /api/tiktok/queue/:id            - Update status
```

### Background Jobs (Trigger.dev)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `publish-instagram-post` | Every 5 min | Publish due posts |
| `sync-instagram-metrics` | Daily 6am | Fetch post metrics |
| `fetch-instagram-mentions` | Daily 9am | Collect UGC |
| `refresh-instagram-token` | Weekly | Refresh access token |
| `check-pool-health` | Daily 10am | Alert on low pools |
| `recalculate-optimal-times` | Weekly | Update posting times from data |

### Asset Validation

```javascript
async function validateAssetForInstagram(assetId: string, postType: string) {
  const asset = await getAsset(assetId);
  
  const requirements = {
    feed: { 
      aspectRatio: '4:5', 
      minWidth: 1080, 
      minHeight: 1350,
      maxFileSize: 8 * 1024 * 1024,  // 8MB for images
      maxDuration: 60  // seconds for video
    },
    reel: { 
      aspectRatio: '9:16', 
      minWidth: 1080, 
      minHeight: 1920,
      maxFileSize: 1024 * 1024 * 1024,  // 1GB
      minDuration: 3,
      maxDuration: 90
    },
    story: { 
      aspectRatio: '9:16', 
      minWidth: 1080, 
      minHeight: 1920,
      maxDuration: 60
    },
    carousel: {
      aspectRatio: '4:5',
      minWidth: 1080,
      minHeight: 1350,
      maxItems: 10
    }
  };
  
  const req = requirements[postType];
  const errors = [];
  
  if (asset.width < req.minWidth) {
    errors.push(`Width must be at least ${req.minWidth}px`);
  }
  
  if (asset.height < req.minHeight) {
    errors.push(`Height must be at least ${req.minHeight}px`);
  }
  
  if (asset.file_size > req.maxFileSize) {
    errors.push(`File size exceeds ${formatBytes(req.maxFileSize)}`);
  }
  
  if (asset.duration && asset.duration > req.maxDuration) {
    errors.push(`Duration exceeds ${req.maxDuration} seconds`);
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## UI Specifications

### Instagram Dashboard (Home View)

The Instagram section home shows key metrics and content balance:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Instagram Overview                                    Week of Dec 30   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ This Week's Performance         │  │ Content Pillar Balance      │  │
│  │                                 │  │                             │  │
│  │ Posts: 5 published              │  │ Target    Actual            │  │
│  │ Reach: 2,340                    │  │                             │  │
│  │ Engagement: 4.2% ↑              │  │ Product   ████████░░ 40%    │  │
│  │ Saves: 89                       │  │ Showcase  (3 posts) ✓       │  │
│  │ Profile visits: 156             │  │                             │  │
│  │                                 │  │ Brand     ████░░░░░░ 20%    │  │
│  │                                 │  │ Story     (1 post) ✓        │  │
│  └─────────────────────────────────┘  │                             │  │
│                                       │ Education ████░░░░░░ 20%    │  │
│  ┌─────────────────────────────────┐  │ al        (1 post) ✓        │  │
│  │ Posting Streak                  │  │                             │  │
│  │                                 │  │ Community ██░░░░░░░░ 10%    │  │
│  │ 🔥 12 days                      │  │           (0 posts) ⚠       │  │
│  │                                 │  │                             │  │
│  │ M T W T F S S M T W T F        │  │ ⚠ Add community content     │  │
│  │ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ○        │  │   (UGC or customer feature) │  │
│  │                                 │  │                             │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Quick Actions                                                     │ │
│  │                                                                   │ │
│  │  [+ Schedule Post]  [Bulk Schedule]  [View Calendar]  [Analytics] │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Upcoming This Week                                    [View All]  │ │
│  │                                                                   │ │
│  │ TODAY                                                             │ │
│  │ ○ 9:00 AM  "You are held here" — Reel • Product Showcase         │ │
│  │                                                                   │ │
│  │ TOMORROW                                                          │ │
│  │ ○ 1:00 PM  "Safe harbor" — Feed • Product Showcase               │ │
│  │                                                                   │ │
│  │ THURSDAY                                                          │ │
│  │ ○ 12:00 PM "Behind the quote" — Reel • Brand Story               │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Needs Attention                                                   │ │
│  │                                                                   │ │
│  │ ⚠ Community pillar at 10% (target: 20%) — Schedule UGC post      │ │
│  │ ⚠ No Stories scheduled for tomorrow — Add to queue               │ │
│  │ ○ 3 posts in review queue — [Review Now]                         │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Weekly Pillar Balance Widget

Shows real-time content mix against targets:

```javascript
async function getWeeklyPillarBalance(weekStartDate: Date) {
  const weekEnd = addDays(weekStartDate, 7);
  
  const posts = await db.instagram_scheduled_posts
    .where('scheduled_at', '>=', weekStartDate)
    .where('scheduled_at', '<', weekEnd)
    .whereIn('status', ['scheduled', 'published']);
  
  const total = posts.length;
  
  const pillarCounts = {
    product_showcase: posts.filter(p => p.content_pillar === 'product_showcase').length,
    brand_story: posts.filter(p => p.content_pillar === 'brand_story').length,
    educational: posts.filter(p => p.content_pillar === 'educational').length,
    community: posts.filter(p => p.content_pillar === 'community').length
  };
  
  const targets = {
    product_showcase: { target: 0.40, min: 0.30, label: 'Product Showcase' },
    brand_story: { target: 0.20, min: 0.15, label: 'Brand Story' },
    educational: { target: 0.20, min: 0.15, label: 'Educational' },
    community: { target: 0.20, min: 0.15, label: 'Community' }
  };
  
  const balance = Object.entries(pillarCounts).map(([pillar, count]) => {
    const actual = total > 0 ? count / total : 0;
    const target = targets[pillar];
    
    return {
      pillar,
      label: target.label,
      count,
      actual,
      target: target.target,
      status: actual >= target.min ? 'ok' : 'warning',
      suggestion: actual < target.min 
        ? getSuggestionForPillar(pillar)
        : null
    };
  });
  
  return { balance, total, weekStartDate };
}

function getSuggestionForPillar(pillar: string): string {
  const suggestions = {
    product_showcase: 'Schedule a quote reveal or product showcase',
    brand_story: 'Add a "behind the quote" or brand story post',
    educational: 'Schedule a how-to carousel or tips post',
    community: 'Feature a customer photo or ask a community question'
  };
  return suggestions[pillar];
}
```

### Instagram Scheduler Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Instagram Scheduler                     [+ New Post] [Bulk Schedule]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  View: [Calendar ▼]  Filter: [All Types ▼]  [All Status ▼]             │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │      December 2025              │  │ Upcoming Posts               │ │
│  │  ◀  Week View  Month  ▶         │  │                              │ │
│  │                                 │  │ ┌────────────────────────┐   │ │
│  │  Sun Mon Tue Wed Thu Fri Sat    │  │ │ ○ Tue 9:00 AM          │   │ │
│  │                                 │  │ │ "You are held here"    │   │ │
│  │       1   2   3   4   5   6     │  │ │ Feed • Grounding       │   │ │
│  │           📷      🎬            │  │ │ [Preview] [Edit] [⋮]   │   │ │
│  │   7   8   9  10  11  12  13     │  │ └────────────────────────┘   │ │
│  │       🎬          📷            │  │                              │ │
│  │  14  15  16  17  18  19  20     │  │ ┌────────────────────────┐   │ │
│  │                                 │  │ │ ○ Thu 12:00 PM         │   │ │
│  │  ...                            │  │ │ "Safe harbor"          │   │ │
│  └─────────────────────────────────┘  │ │ Reel • Grounding       │   │ │
│                                       │ │ [Preview] [Edit] [⋮]   │   │ │
│  Legend: 📷 Feed  🎬 Reel  📱 Story   │ └────────────────────────┘   │ │
│                                       │                              │ │
│  Optimal Times This Week              │ Published Today              │ │
│  ┌─────────────────────────────────┐  │ ┌────────────────────────┐   │ │
│  │ Tue 9am  ████████ 3.8% eng      │  │ │ ✓ Mon 9:00 AM          │   │ │
│  │ Thu 12pm ███████ 3.2% eng       │  │ │ 142 likes • 12 saves   │   │ │
│  │ Sat 10am ██████ 2.9% eng        │  │ └────────────────────────┘   │ │
│  └─────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### New Post Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Create Instagram Post                                            [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Post Type:  ○ Feed  ● Reel  ○ Story  ○ Carousel                       │
│                                                                         │
│  ┌─────────────┐  Content                                              │
│  │             │  ┌───────────────────────────────────────────────┐    │
│  │   [Video    │  │ "You are held here."                          │    │
│  │   Preview]  │  │                                               │    │
│  │             │  │ Not because you need fixing.                  │    │
│  │  ▶ 0:08     │  │ Because you deserve spaces that hold you     │    │
│  │  1080x1920  │  │ gently.                                       │    │
│  │             │  │                                               │    │
│  └─────────────┘  │ Link in bio                                   │    │
│                   └───────────────────────────────────────────────┘    │
│  [Change Asset]                                                        │
│  [Select Thumbnail]                                                    │
│                                                                         │
│  Template: [Quote Reveal - Standard ▼]  [Apply]  [Edit Caption]        │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Hashtags (18/30)                               [Edit Groups]    │   │
│  │ #havenandhold #minimalistprint #quoteart #wallart #homedecor   │   │
│  │ #digitaldownload #therapyoffice #mentalhealthmatters ...       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ☑ Post hashtags as first comment                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Alt Text                                              [Auto ↻]  │   │
│  │ Minimalist quote print reading "You are held here" in          │   │
│  │ sanctuary neutral tones. Part of the Haven & Hold Grounding... │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Shopping: [You Are Held Here Print ▼]  ☑ Tag product                  │
│                                                                         │
│  Schedule For                                                          │
│  ● Best available time (Tue Dec 30, 9:00 AM EST) — 3.8% avg eng       │
│  ○ Custom: [Date ▼] [Time ▼]                                          │
│                                                                         │
│  ☑ Cross-post to Facebook                                              │
│                                                                         │
│  Campaign Tag: [Launch Week ▼]                                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      [Preview Post]                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                              [Save as Draft]  [Schedule Post]          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Preview Before Publish Modal

Shows exactly how the post will appear on Instagram before scheduling:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Preview Post                                                     [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     INSTAGRAM PREVIEW                            │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │ ○ havenandhold                                      • • • │  │   │
│  │  ├───────────────────────────────────────────────────────────┤  │   │
│  │  │                                                           │  │   │
│  │  │                                                           │  │   │
│  │  │                    [Video Preview]                        │  │   │
│  │  │                         ▶                                 │  │   │
│  │  │                    "You are held                          │  │   │
│  │  │                        here"                              │  │   │
│  │  │                                                           │  │   │
│  │  │                                                           │  │   │
│  │  ├───────────────────────────────────────────────────────────┤  │   │
│  │  │ ♡  💬  ➤                                           ⊡     │  │   │
│  │  │                                                           │  │   │
│  │  │ havenandhold Some spaces just need to hold you.          │  │   │
│  │  │                                                           │  │   │
│  │  │ "You are held here" — for the walls that witness your    │  │   │
│  │  │ hardest mornings. For the rooms where you fall apart     │  │   │
│  │  │ and come back together...                                │  │   │
│  │  │                                                           │  │   │
│  │  │ more                                                      │  │   │
│  │  │                                                           │  │   │
│  │  │ View all comments                                         │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Preview: [Feed ▼]  ← Switch between Feed / Profile Grid / Reels Tab   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Caption: 247 characters (under 2,200 limit)                   │   │
│  │ ✓ Hashtags: 18 tags (will post as first comment)                │   │
│  │ ✓ Alt text: Added                                               │   │
│  │ ✓ Product tag: You Are Held Here Print                          │   │
│  │ ✓ Thumbnail: Frame at 4s selected                               │   │
│  │ ○ Facebook: Will cross-post                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Scheduled: Tuesday, December 30 at 9:00 AM EST                        │
│                                                                         │
│                          [Back to Edit]  [Confirm & Schedule]          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Preview Modes:**

| Mode | Shows |
|------|-------|
| Feed | How post appears in follower feeds |
| Profile Grid | How thumbnail fits in your 3-column grid |
| Reels Tab | How cover image appears in Reels tab (9:16 preview) |

### Bulk Scheduling

Schedule multiple posts at once for efficient content planning:

**Bulk Schedule Modal:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Bulk Schedule Posts                                              [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Select quotes to schedule:                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ☑ "You are held here" — Grounding          Video ready ✓        │   │
│  │ ☑ "Safe harbor" — Grounding                Video ready ✓        │   │
│  │ ☑ "Space for all of you" — Wholeness       Video ready ✓        │   │
│  │ ☐ "Still becoming" — Growth                Video pending ◐      │   │
│  │ ☑ "Permission to rest" — Wholeness         Video ready ✓        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  4 selected                                        [Select All Ready]  │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Scheduling Options:                                                   │
│                                                                         │
│  ● Auto-assign optimal times                                           │
│    System will distribute across best available slots                  │
│    following day-specific content strategy                             │
│                                                                         │
│  ○ Custom schedule                                                     │
│    Start date: [Dec 30 ▼]  Posts per day: [1 ▼]                       │
│    Preferred times: [9:00 AM ▼] [1:00 PM ▼]                           │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Content Settings (apply to all):                                      │
│                                                                         │
│  Template: [Auto-select by collection ▼]                               │
│  ☑ Auto-generate hashtags (with rotation)                              │
│  ☑ Auto-generate alt text                                              │
│  ☑ Cross-post to Facebook                                              │
│  ☑ Include shopping tags                                               │
│                                                                         │
│  Campaign tag: [Q1 Launch ▼]                                           │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  Preview Schedule:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Tue Dec 30, 9:00 AM  — "You are held here" (Reel)               │   │
│  │ Wed Dec 31, 1:00 PM  — "Safe harbor" (Feed)                     │   │
│  │ Thu Jan 1, 12:00 PM  — "Space for all of you" (Reel)            │   │
│  │ Fri Jan 2, 11:00 AM  — "Permission to rest" (Feed)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ⚠ Content mix: 2 Reels, 2 Feed posts — Balanced ✓                    │
│                                                                         │
│                              [Cancel]  [Schedule 4 Posts]              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Bulk Scheduling Logic:**

```javascript
async function bulkSchedulePosts(
  quoteIds: string[],
  options: BulkScheduleOptions
) {
  const posts = [];
  let currentDate = options.startDate || new Date();
  
  for (const quoteId of quoteIds) {
    const quote = await getQuote(quoteId);
    const videoAsset = await getVideoAssetForQuote(quoteId);
    
    // Find optimal slot based on content pillar and collection
    const postType = determinePostType(quote.collection, currentDate);
    const template = await getTemplateForCollection(quote.collection, postType);
    
    // Get next optimal slot
    const slot = options.autoAssign
      ? await findOptimalSlot(postType, template.content_pillar, currentDate)
      : getNextCustomSlot(currentDate, options);
    
    // Generate content
    const caption = await applyTemplate(template, quote);
    const hashtags = await generateHashtags(quote.collection, template.content_pillar);
    const altText = await generateAltText(quote);
    
    // Create scheduled post
    const post = await db.instagram_scheduled_posts.insert({
      quote_id: quoteId,
      template_id: template.id,
      video_asset_id: videoAsset?.id,
      post_type: postType,
      content_pillar: template.content_pillar,
      caption,
      hashtags,
      alt_text: altText,
      scheduled_at: slot.scheduled_at,
      campaign_tag: options.campaignTag,
      crosspost_to_facebook: options.crosspostFacebook,
      include_shopping_tag: options.includeShoppingTags,
      status: options.operatorMode === 'supervised' ? 'draft' : 'scheduled'
    });
    
    posts.push(post);
    currentDate = addDays(slot.scheduled_at, 1);
  }
  
  // Validate content mix
  const mixWarnings = await validateWeeklyMix(options.startDate);
  
  return { posts, mixWarnings };
}
```

### Stock Footage Library

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stock Footage Library                              [+ Add Footage]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filter: [All Collections ▼]  [Portrait Only ✓]    🔍 Search...        │
│                                                                         │
│  Grounding (24) │ Wholeness (18) │ Growth (22) │ General (35)          │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  ▶ thumb │  │  ▶ thumb │  │  ▶ thumb │  │  ▶ thumb │               │
│  │  0:08    │  │  0:12    │  │  0:06    │  │  0:10    │               │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤               │
│  │Grounding │  │Grounding │  │Wholeness │  │ Growth   │               │
│  │cozy,warm │  │bedroom   │  │self-care │  │ sunrise  │               │
│  │Used: 3x  │  │Used: 0x  │  │Used: 5x  │  │ Used: 1x │               │
│  │Last: 12d │  │Last: —   │  │Last: 2d  │  │ Last: 8d │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│       [Edit]        [Edit]        [Edit]        [Edit]                 │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│  Pool Health:                                                          │
│  ✓ Grounding: 24 videos (8 unused)                                     │
│  ⚠ Wholeness: 18 videos (0 unused) — Add more variety                  │
│  ✓ Growth: 22 videos (12 unused)                                       │
│  ✓ General: 35 videos (20 unused)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Add Footage Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Add Stock Footage                                                [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Source: [Pexels ▼]                                                    │
│                                                                         │
│  Video URL:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ https://www.pexels.com/video/cozy-bedroom-morning-3571264       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [Fetch Preview]                                                       │
│                                                                         │
│  ┌─────────────┐  Metadata                                             │
│  │             │  Duration: 0:08                                       │
│  │     ▶       │  Resolution: 1080x1920                                │
│  │             │  Orientation: Portrait ✓                              │
│  │             │  Source: Pexels #3571264                              │
│  └─────────────┘                                                       │
│                                                                         │
│  Collection:                                                           │
│  ● Grounding  ○ Wholeness  ○ Growth  ○ General                        │
│                                                                         │
│  Mood Tags:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [cozy ×] [morning ×] [bedroom ×]  [+ Add tag]                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  Suggested: warm, soft, natural light, peaceful                        │
│                                                                         │
│  Notes:                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Soft light through curtains, unmade bed, warm tones             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                            [Cancel]  [Add to Pool]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Music Library

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Music Library                                         [+ Add Track]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filter: [All Collections ▼]  [All Moods ▼]    🔍 Search...            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ♪ Soft Morning Light                                 Grounding   │ │
│  │   Artist: Ambient Dreams • 2:34 • 72 BPM                         │ │
│  │   Mood: warm, gentle, piano                                      │ │
│  │   Used: 3x │ Last: 12 days ago                                   │ │
│  │                                               [▶ Preview] [Edit] │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ♪ Rain on Window                                     General     │ │
│  │   Artist: Nature Sounds • 3:12 • Ambient                         │ │
│  │   Mood: calm, peaceful, nature                                   │ │
│  │   Used: 1x │ Last: 5 days ago                                    │ │
│  │                                               [▶ Preview] [Edit] │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│  Pool Health:                                                          │
│  ✓ Grounding: 6 tracks                                                 │
│  ⚠ Wholeness: 3 tracks — Add more                                      │
│  ✓ Growth: 5 tracks                                                    │
│  ✓ General: 8 tracks                                                   │
│                                                                         │
│  License: Epidemic Sound subscription active (renews Jan 15, 2026)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Review Queue (Supervised Mode)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Review Queue                                              3 pending    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Instagram Post • Reel                           Added 2 hours ago │ │
│  │                                                                    │ │
│  │  ┌──────────┐  "You are held here"                                │ │
│  │  │  thumb   │  Collection: Grounding                              │ │
│  │  │   ▶      │  Template: Quote Reveal - Standard                  │ │
│  │  └──────────┘  Scheduled: Tue Dec 30, 9:00 AM                     │ │
│  │                                                                    │ │
│  │  Caption preview: "You are held here." Not because you need...   │ │
│  │                                                                    │ │
│  │              [Preview Full Post]  [Edit]  [Reject]  [Approve ✓]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Instagram Post • Feed                           Added 3 hours ago │ │
│  │                                                                    │ │
│  │  ┌──────────┐  "Safe harbor"                                      │ │
│  │  │  thumb   │  Collection: Grounding                              │ │
│  │  │          │  Template: Quote Reveal - Standard                  │ │
│  │  └──────────┘  Scheduled: Thu Jan 1, 12:00 PM                     │ │
│  │                                                                    │ │
│  │              [Preview Full Post]  [Edit]  [Reject]  [Approve ✓]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### TikTok Queue

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TikTok Queue                                              3 pending    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Ready to Post                                                         │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ┌──────────┐                                                      │ │
│  │ │  thumb   │  "You are held here"                                 │ │
│  │ │   ▶      │  Target: Today                                       │ │
│  │ │  0:08    │                                                      │ │
│  │ └──────────┘  Caption:                                            │ │
│  │               "You are held here." Not because you need fixing... │ │
│  │                                                                    │ │
│  │  [Download Video]  [Copy Caption]  [Copy Hashtags]                │ │
│  │                                                                    │ │
│  │                                              [Mark as Posted ✓]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Posted                                                                │
│  ───────────────────────────────────────────────────────────────────── │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ ✓ "Safe harbor" • Posted Dec 26                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (4-5 days)

- [ ] Database schema creation (all tables)
- [ ] Instagram OAuth connection flow
- [ ] Settings UI for Instagram integration
- [ ] Token refresh mechanism
- [ ] Basic API routes structure

### Phase 2: Content Templates (2-3 days)

- [ ] Templates CRUD UI
- [ ] Template editor with variable preview
- [ ] Variable substitution engine
- [ ] Caption formulas implementation
- [ ] Seed default templates (15+ templates)
- [ ] Alt text auto-generation

### Phase 3: Hashtag System (2-3 days)

- [ ] Hashtag groups CRUD UI
- [ ] Tiered hashtag structure (Brand/Mega/Large/Niche)
- [ ] Seed default groups with rotation sets
- [ ] Auto-generation algorithm with pillar awareness
- [ ] First-comment posting logic
- [ ] Rotation tracking

### Phase 4: Video Pipeline (4-5 days)

- [ ] Video templates metadata management
- [ ] Stock footage pool UI with Pexels integration
- [ ] Music pool UI
- [ ] Hooks library with seed data (20+ hooks)
- [ ] Creatomate API integration
- [ ] Thumbnail generation (3 frames per video)
- [ ] Webhook handler for render completion
- [ ] Smart selection algorithms (footage, music, hooks)

### Phase 5: Scheduler Core (4-5 days)

- [ ] Calendar view component
- [ ] New Post modal (all post types)
- [ ] **Preview before publish modal** (Feed/Grid/Reels views)
- [ ] **Bulk scheduling UI and logic**
- [ ] **Thumbnail selection UI**
- [ ] Day-specific scheduling logic
- [ ] Content pillar tracking per post
- [ ] Scheduling queue and publishing jobs (Trigger.dev)
- [ ] Optimal time calculation

### Phase 6: Stories System (2-3 days)

- [ ] Stories database schema
- [ ] Story templates (Quote Daily, Product Highlight, Quiz CTA)
- [ ] Auto-scheduled stories job (morning + afternoon)
- [ ] Manual stories queue UI
- [ ] Stories timeline view (today's stories tracker)

### Phase 7: Dashboard & Balance (2 days)

- [ ] **Instagram dashboard home view**
- [ ] **Weekly pillar balance widget**
- [ ] Posting streak tracker
- [ ] "Needs Attention" alerts
- [ ] Quick actions panel

### Phase 8: Advanced Features (3-4 days)

- [ ] Carousel post support
- [ ] Facebook cross-posting
- [ ] Instagram Shopping tags
- [ ] Campaign tagging

### Phase 9: TikTok Queue (2-3 days)

- [ ] TikTok queue database schema
- [ ] Queue generation on quote approval
- [ ] TikTok-specific caption templates
- [ ] AM/PM slot assignment
- [ ] Week view with batch preparation
- [ ] Streak tracking
- [ ] Performance entry (manual metrics)

### Phase 10: Review Queue & UGC (2-3 days)

- [ ] Review queue UI (Supervised mode)
- [ ] Approval workflow
- [ ] Mention monitoring job
- [ ] UGC curation UI

### Phase 11: Analytics (2-3 days)

- [ ] Metrics sync job
- [ ] Analytics dashboard
- [ ] Template performance tracking
- [ ] Hashtag performance tracking
- [ ] Hook performance tracking (completion rates)
- [ ] Optimal time learning from data

### Phase 12: Error Handling & Polish (2-3 days)

- [ ] Retry logic with exponential backoff
- [ ] Rate limit management
- [ ] Asset validation
- [ ] Pool health monitoring (footage, music, hooks)
- [ ] Activity logging
- [ ] Error notifications
- [ ] Documentation & tooltips

### Estimated Total: 32-42 days

### Priority Order

If time-constrained, implement in this order:

1. **MVP (Weeks 1-2):** Phases 1-4 — Foundation through Video Pipeline
2. **Core Scheduling (Week 3):** Phase 5 — Calendar, posting, bulk schedule
3. **Content Balance (Week 4):** Phases 6-7 — Stories + Dashboard
4. **TikTok (Week 5):** Phase 9 — TikTok queue
5. **Polish (Week 6):** Phases 10-12 — UGC, Analytics, Error handling

---

## External Dependencies

### APIs Required

| Service | Purpose | Cost |
|---------|---------|------|
| Instagram Graph API | Publishing, insights | Free (requires Business account) |
| Facebook Pages API | Cross-posting | Free |
| Pexels API | Stock footage metadata | Free |
| Creatomate | Video rendering | $41-99/mo |
| Epidemic Sound | Music licensing | $10-13/mo |

### NPM Packages

```json
{
  "dependencies": {
    "@trigger.dev/sdk": "^3.0.0",
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  }
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time saved per post | 95%+ reduction | Actual: 45min → <2min |
| Posts scheduled/week | 7-14 | System tracking |
| Template usage rate | 90%+ | Posts using templates |
| Video generation success | 98%+ | Creatomate success rate |
| Publishing success rate | 98%+ | Failed / Total |
| Avg engagement rate | 3%+ | Instagram metrics |
| Review queue turnaround | <2 hours (Supervised) | Time from ready → approved |

---

*— End of Document —*

Haven Hub Instagram & Video Automation Architecture v1.0 | December 2025
