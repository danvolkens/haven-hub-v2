# Haven Hub Instagram Content Strategy: Build Prompts

*Sequential prompts for integrating content strategy into automation*

---

## How to Use This Document

This document extends `Haven_Hub_Instagram_Build_Prompts.md` with content-focused prompts derived from `Haven_Hold_Instagram_Complete_Guide.md`. 

1. **Complete Phase 1-2 from main build prompts first** — database and template engine
2. **Then use these prompts** — to seed rich content data
3. **Reference both specs** — architecture doc for technical, complete guide for content

**Dependencies:**
- `Haven_Hub_Instagram_Video_Automation_Architecture_v2.md` (technical spec)
- `Haven_Hold_Instagram_Complete_Guide.md` (content strategy)

---

## Phase A: Caption Templates Library

### Prompt A.1: Seed Feed Post Caption Templates

```
Seed the complete feed post caption templates from the Instagram guide.

Create caption templates for these 5 formula types:
1. Single Quote Showcase (Hook → Story → CTA)
2. Lifestyle Styled Shot (Scene → Meaning → Connection → Engagement)
3. Product + Benefit (Benefit → Included → Who → CTA)
4. Collection Highlight (Intro → Theme → Audience → Quiz)
5. Customer/UGC Feature (Appreciation → Tag → Special → UGC CTA)

Each template needs:
- name, template_type: 'feed'
- content_pillar (product_showcase/brand_story/educational/community)
- collection (grounding/wholeness/growth/general)
- caption_formula (hook_story_cta/problem_solution/list_value/question_content/micro_story)
- caption_template with these variables:
  {{quote_text}}, {{quote_author}}, {{collection_name}}, {{collection_meaning}},
  {{customer_handle}}, {{cta_link}}, {{cta_quiz}}

Example template - Single Quote Showcase:
"""
{{hook_line}}

"{{quote_text}}" — {{quote_meaning}}

{{personal_touch}}

{{engagement_question}}

→ Link in bio to shop
"""

Seed at least 3 variations per formula type (15 templates total).

Include the collection-specific versions:
- Grounding Collection template (earth tones, safety language)
- Wholeness Collection template (gentle, acceptance language)
- Growth Collection template (forward, transformation language)

Reference: Instagram Guide "Feed Post Templates & Examples" and "Caption Formulas"

Deliverables:
- Seed migration with 18+ feed templates
- Each template tested with sample quote data
```

**Acceptance Criteria:**
- [ ] 18+ feed templates seeded
- [ ] All 5 formula types represented
- [ ] Collection-specific templates included
- [ ] Variables substitute correctly

---

### Prompt A.2: Seed Reel Script Templates

```
Seed Reel script templates that generate both visual structure AND captions.

Create templates for these 6 Reel types (from Instagram Guide):
1. Quote Reveal (8-12 sec) — 40% of Reels
2. Room Transformation (15-20 sec) — 25%
3. Educational How-To (20-30 sec) — 20%
4. Behind-the-Scenes (12-18 sec) — 10%
5. Quiz Teaser (10-15 sec) — for funnel
6. Trending Audio Adaptation (varies)

Schema additions needed for reels:
- hook_text (appears on first frame)
- text_overlays: JSONB[] — [{timestamp: 0, text: "...", duration: 3}]
- suggested_duration_seconds
- audio_mood (for music matching)
- shot_list: TEXT[] — sequence of shots needed

Example Quote Reveal template:
{
  name: "Quote Reveal - Grounding",
  template_type: "reel",
  content_pillar: "product_showcase",
  collection: "grounding",
  hook_text: "Read this when you're overwhelmed",
  text_overlays: [
    {timestamp: 0, text: "{{hook_text}}", duration: 3},
    {timestamp: 4, text: "{{quote_text}}", duration: 4},
    {timestamp: 7, text: "Save this for the hard days", duration: 3}
  ],
  suggested_duration: 10,
  audio_mood: "soft_emotional",
  caption_template: "Some days you need walls that hold you back. 🤍\nSave this for when you need it.\n\n{{hashtags}}"
}

Reference: Instagram Guide "Reels Strategy & Scripts"

Deliverables:
- Migration to add reel-specific columns to instagram_templates
- Seed 12+ Reel templates (2 per type)
- TypeScript types updated
```

**Acceptance Criteria:**
- [ ] 12+ Reel templates seeded
- [ ] All 6 types represented
- [ ] text_overlays structure works
- [ ] Audio mood maps to music pool

---

### Prompt A.3: Seed Story Templates

```
Seed Story templates for the hybrid auto/manual system.

Create templates for these 8 story types:
1. Daily Quote (branded background + quote)
2. Poll Story (product image + poll question)
3. Question Box (engagement + community)
4. Product Highlight (4-story sequence)
5. Behind-the-Scenes (casual, unpolished)
6. Customer Feature (UGC + thank you)
7. Quiz CTA (4 versions to rotate)
8. Countdown/Urgency (for launches/sales)

Schema for story_templates:
- story_type (quote_daily/poll/question/product_highlight/bts/customer_feature/quiz_cta/countdown)
- is_sequence (boolean — true for multi-story)
- sequence_count (number of stories in sequence)
- elements: JSONB — stickers, links, polls config
- background_type (brand_color/image/video)
- schedule_slot (morning/midday/afternoon/evening)

Poll options to seed (from guide):
- "Which speaks to you more?" [Left 🌿 | Right 💫]
- "Where would you hang this?" [Bedroom | Living room]
- "Did you need to hear this today?" [Yes 😭 | Not yet]
- "Should I share how I design these?" [Yes please! | Nah]

Question box prompts:
- "What's a quote that changed how you see yourself?"
- "What room in your house needs the most love right now?"
- "Ask me anything about printing digital art!"
- "What quote should I design next?"

Quiz CTA versions (rotate daily):
1. "What's your sanctuary style?" + 2-min quiz link
2. "Not sure which prints are for you?" + 15% off mention
3. "Grounding 🌿 Wholeness 💫 Growth 🌱 — Which one are you?"
4. "The prints you need depend on the season you're in"

Reference: Instagram Guide "Stories Strategy & Templates"

Deliverables:
- Seed migration for 20+ story templates
- Poll and question options as JSONB
- Quiz CTA rotation logic
```

**Acceptance Criteria:**
- [ ] 20+ story templates seeded
- [ ] All 8 types represented
- [ ] Poll options rotate correctly
- [ ] Quiz CTAs have 4 versions

---

### Prompt A.4: Seed Carousel Templates

```
Seed Carousel templates for high-engagement educational content.

Create templates for these 5 carousel types:
1. "X Quotes for [Situation]" (6-8 slides)
2. Educational How-To (7-10 slides)
3. Quiz Result Deep-Dive (8 slides per segment)
4. Behind-the-Brand Story (6-8 slides)
5. Before/After Transformation (5-7 slides)

Schema for carousel templates:
- template_type: "carousel"
- slide_count: INTEGER
- slides: JSONB[] — [{
    slide_number: 1,
    slide_type: "hook" | "content" | "cta",
    text_template: "...",
    visual_description: "...",
    has_product: boolean
  }]
- content_pillar
- estimated_engagement_multiplier (carousels get 2x)

Seed complete slide structures:

"5 Quotes for Hardest Days" carousel:
[
  {slide_number: 1, type: "hook", text: "5 quotes for your hardest days"},
  {slide_number: 2, type: "content", text: "\"{{quote_1}}\"", has_product: true},
  {slide_number: 3, type: "content", text: "\"{{quote_2}}\"", has_product: true},
  {slide_number: 4, type: "content", text: "\"{{quote_3}}\"", has_product: true},
  {slide_number: 5, type: "content", text: "\"{{quote_4}}\"", has_product: true},
  {slide_number: 6, type: "content", text: "\"{{quote_5}}\"", has_product: true},
  {slide_number: 7, type: "collection", text: "The {{collection_name}} Collection"},
  {slide_number: 8, type: "cta", text: "Save this for when you need it 🤍\nShop: link in bio"}
]

Include full slide content for all 5 carousel types.

Create situation variations for "X Quotes for...":
- "5 quotes for when anxiety is winning"
- "5 quotes for therapy days"
- "5 quotes for fresh starts"
- "5 quotes for when you need permission to rest"

Reference: Instagram Guide "Carousel Templates"

Deliverables:
- Carousel slides JSONB schema
- Seed 10+ carousel templates
- Situation variations for quote carousels
```

**Acceptance Criteria:**
- [ ] 10+ carousel templates seeded
- [ ] Slide structures complete
- [ ] Variables substitute per slide
- [ ] Situation variations included

---

## Phase B: Hashtag System Enhancement

### Prompt B.1: Seed Content-Type Hashtag Sets

```
Enhance hashtag groups with content-type specific sets.

Create new hashtag sets organized by content type (from guide):

PRODUCT POSTS set:
#minimalistwallart #printablewallart #quoteart #digitaldownload 
#instantdownload #homedecor #wallartdecor #bedroomdecor 
#homeofficeinspo #therapyofficedecor #mentalhealthawareness 
#selfcarespace #hyggehome #cozyhome #peacefulhome 
#minimalistdesign #quotestoliveby #HavenAndHold

EDUCATIONAL POSTS set:
#printingtips #digitalart #homediy #walldecor #homedecorideas 
#framedhacks #gallerywall #interiordesigntips #homeimprovement 
#decorating #diydecor #budgetfriendlydecor #apartmentdecor 
#rentersdecorating #howtostyle

INSPIRATIONAL/QUOTE POSTS set:
#quotestoliveby #wordstoliveby #dailyquotes #mentalhealthquotes 
#anxietyquotes #healingquotes #selflovequotes #therapyquotes 
#mindfulnessquotes #motivationalquotes #inspirationalquotes 
#mentalhealthmatters #mentalwellness #selfcare

COMMUNITY/UGC POSTS set:
#customerphoto #homedecorinspo #realhomes #myhomevibe 
#cornerofmyhome #pocketofmyhome #apartmentdecor #homedetails 
#homesweethome #howyouhome #currentdesignsituation #MyHavenAndHold

Schema update:
- Add content_type field to hashtag_groups: 
  (product/educational/inspirational/community/general)
- Add collection affinity (grounding/wholeness/growth/any)

Update generateHashtags() function:
1. Accept content_type parameter
2. Prefer hashtags matching content_type
3. Layer: Brand (2) + Content-Type specific (8-10) + Collection (5-7)

Reference: Instagram Guide "Hashtag Strategy"

Deliverables:
- Seed 4 content-type hashtag sets
- Update hashtag_groups schema
- Update generateHashtags to use content_type
```

**Acceptance Criteria:**
- [ ] 4 content-type sets seeded
- [ ] generateHashtags accepts content_type
- [ ] Output has 17-20 hashtags
- [ ] Matches expected composition

---

## Phase C: Day-Specific Scheduling Logic

### Prompt C.1: Implement Day Strategy Engine

```
Build the day-specific content strategy engine from Instagram Guide.

Weekly posting strategy:
- Monday: Fresh Start — Educational carousel, engagement focus
- Tuesday: Transformation — Reel (room transformation), Q&A stories
- Wednesday: Wisdom — Best-seller product showcase
- Thursday: Throwback/Therapy — Brand story Reel, educational carousel
- Friday: Feature — UGC/customer feature, weekend shopping CTA
- Saturday: Showcase — Quote reveal Reel, styled product
- Sunday: Soul — Brand story carousel, reflection

Create getDayStrategy(date: Date) function returning:
{
  day_name: "Monday",
  theme: "Fresh Start",
  recommended_content: [
    { type: "carousel", pillar: "educational", priority: 1 },
    { type: "story", count: 5, types: ["quote", "poll", "product", "bts", "quiz"] }
  ],
  post_times: ["11:00 AM"],
  story_schedule: [
    { time: "8:00 AM", type: "quote" },
    { time: "12:00 PM", type: "poll" },
    { time: "3:00 PM", type: "product" },
    { time: "6:00 PM", type: "bts" },
    { time: "9:00 PM", type: "quiz_cta" }
  ]
}

Create schedule suggestion UI:
- When user opens scheduler for a day
- Show: "Monday is Fresh Start day"
- Suggest: "Add educational carousel (recommended)"
- Show optimal times
- Pre-fill story schedule

Reference: Instagram Guide "The Complete Posting Schedule"

Deliverables:
- getDayStrategy() function
- Day strategy constants (all 7 days)
- Integration with scheduler UI
```

**Acceptance Criteria:**
- [ ] All 7 day strategies defined
- [ ] getDayStrategy returns correct structure
- [ ] UI shows day recommendations
- [ ] Story schedule pre-fills

---

### Prompt C.2: Weekly Balance Tracker

```
Build the weekly content pillar balance tracker.

Target distribution per week:
- Product Showcase: 40% (2-3 feed posts)
- Brand Story: 20% (1-2 feed posts)
- Educational: 20% (1-2 carousels)
- Community: 20% (1-2 UGC features)

Weekly targets (from guide):
- Feed Posts: 5-7x/week
- Reels: 3-5x/week
- Carousels: 2-3x/week
- Stories: 3-7x/day (21-49/week)

Create getWeeklyBalance(startDate: Date) function:
{
  feed_posts: { current: 4, target: 6, status: "on_track" },
  reels: { current: 2, target: 4, status: "behind" },
  carousels: { current: 1, target: 2, status: "on_track" },
  stories: { current: 25, target: 35, status: "on_track" },
  pillar_breakdown: {
    product_showcase: { current: 2, target: 2.4, percentage: 40 },
    brand_story: { current: 0, target: 1.2, percentage: 20, status: "needs_content" },
    educational: { current: 1, target: 1.2, percentage: 20 },
    community: { current: 1, target: 1.2, percentage: 20 }
  },
  suggestions: [
    "Add 1 Brand Story post this week",
    "Schedule 2 more Reels"
  ]
}

Dashboard component:
- Visual bar chart of pillar distribution
- Color coding: green (on track), yellow (behind), red (critical)
- "Needs Attention" alerts
- Quick add buttons for missing content types

Reference: Instagram Guide "Content Pillars & Types"

Deliverables:
- getWeeklyBalance() function
- Weekly balance dashboard widget
- Suggestion engine for missing content
```

**Acceptance Criteria:**
- [ ] Balance calculates correctly
- [ ] Status colors accurate
- [ ] Suggestions actionable
- [ ] Dashboard displays properly

---

## Phase D: Engagement Automation

### Prompt D.1: Engagement Queue System

```
Build the engagement task queue from Instagram Guide playbook.

Daily engagement routine (30-45 min):
- Morning (15 min): Comments, DMs, engage 10 accounts
- Afternoon (15 min): Comment responses, reciprocal engagement
- Evening (15 min): Final responses, Stories, DM replies

Create engagement_tasks table:
- id, task_type (respond_comment/respond_dm/engage_account/post_story)
- priority (1-5)
- target_account (for engage_account tasks)
- target_content_id (for response tasks)
- scheduled_slot (morning/afternoon/evening)
- status (pending/completed/skipped)
- completed_at

Create generateDailyEngagementTasks() job:
- Runs at midnight
- Creates tasks for next day
- Checks: unresponded comments, unread DMs, engagement quota

Engagement dashboard:
- Today's tasks by time slot
- Completion progress bar
- "10 accounts engaged" counter
- Quick links to Instagram app

DM templates to seed:
- Welcome new follower:
  "Hey {{name}}! 👋 Thanks for following Haven & Hold — really appreciate you being here. If you're curious about which prints fit your vibe, we have a quick 2-minute quiz in the bio that's pretty fun. Feel free to reach out if you ever have questions! 🤍"

Reference: Instagram Guide "Engagement Playbook"

Deliverables:
- engagement_tasks table
- generateDailyEngagementTasks() job
- Engagement dashboard component
- DM templates seeded
```

**Acceptance Criteria:**
- [ ] Tasks generate for each day
- [ ] Time slots match guide
- [ ] Progress tracking works
- [ ] DM templates ready

---

### Prompt D.2: Comment Response Suggestions

```
Build AI-assisted comment response suggestions.

From guide — Don't say generic comments like:
- "Love this! 😍"
- "Great post!"

Instead, generate specific, genuine responses.

Create suggestCommentResponse(comment: string, context: PostContext) function:
- Analyzes incoming comment
- Returns 2-3 response options
- Considers: comment sentiment, question detection, UGC opportunity

Response types:
1. Thank + Question: "Thank you! 🤍 What room are you thinking of putting it in?"
2. Agreement + Follow-up: "That quote hits different, right? Which collection speaks to you most?"
3. Answer + Redirect: "Great question! We have a full printing guide in our bio — covers everything from file sizes to frame recommendations."

Comment categories to detect:
- Compliment → Thank + engagement question
- Question → Answer + helpful redirect
- "Where to buy?" → Product link + size recommendation
- "This is me" → Validation + collection suggestion
- UGC share → Feature offer + thank you

Integration:
- Show in notification when new comment received
- One-click to use suggestion
- Edit before posting option

Reference: Instagram Guide "Engagement Tactics"

Deliverables:
- suggestCommentResponse() function
- Comment category detection
- Response generation logic
- UI for response selection
```

**Acceptance Criteria:**
- [ ] Generates relevant responses
- [ ] Avoids generic language
- [ ] Category detection works
- [ ] One-click posting works

---

## Phase E: Quiz Funnel Integration

### Prompt E.1: Quiz CTA Distribution System

```
Build automated quiz CTA distribution across content.

From guide — Quiz mention frequency:
- Feed posts: 2-3x per week (subtle mention)
- Stories: 1x daily (dedicated quiz CTA story)
- Bio: Primary link

Create quiz CTA templates:

SUBTLE (for feed captions):
"Not sure which collection is yours? Take the 2-minute quiz in our bio — it'll tell you if you're Grounding, Wholeness, or Growth 🌿💫🌱"

DIRECT (for dedicated posts):
"→ Find your sanctuary style: Quiz in bio"

STORY CTAs (4 versions to rotate):
1. "What's your sanctuary style?" / "2-minute quiz → find out"
2. "Not sure which prints are for you?" / "Take the quiz + get 15% off"
3. "Grounding 🌿 Wholeness 💫 Growth 🌱" / "Which one are you?" / "Quiz in bio"
4. "The prints you need depend on the season you're in" / "Let's find yours"

Create getQuizCTA(type: 'subtle' | 'direct' | 'story') function:
- Returns appropriate CTA
- Tracks usage to ensure rotation
- Avoids repeating same story CTA 2 days in row

Auto-append logic:
- If scheduled post has no quiz mention AND weekly quota not met
- Append subtle CTA to caption

Quiz story scheduling:
- Auto-schedule quiz CTA story each evening (9-10 PM)
- Rotate through 4 versions

Reference: Instagram Guide "Quiz Funnel Integration"

Deliverables:
- Quiz CTA templates (all versions)
- getQuizCTA() with rotation
- Auto-append logic for captions
- Quiz story auto-scheduling
```

**Acceptance Criteria:**
- [ ] 4 story versions rotate
- [ ] Weekly quota tracked (2-3 posts, 7 stories)
- [ ] Auto-append works
- [ ] Evening quiz story scheduled

---

### Prompt E.2: Post-Quiz Instagram Engagement

```
Build post-quiz customer engagement workflow.

When someone completes quiz and purchases:
1. Follow them (if public account)
2. Like their recent posts
3. Comment on something genuine
4. Wait for them to share → repost UGC

Create quiz_completions table link:
- quiz_completion_id
- instagram_handle (if provided in quiz)
- has_purchased
- followed_at, engaged_at
- ugc_received_at

Create triggerPostQuizEngagement() function:
- Called when order confirmed
- Checks if customer has Instagram handle
- Queues engagement tasks with 24-48 hour delay

Engagement sequence:
Day 1: Follow (if public)
Day 2: Like 2-3 recent posts
Day 3: Leave genuine comment on most relevant post
Day 7+: Watch for UGC (tagged posts or brand mentions)

UGC monitoring:
- Track @HavenAndHold mentions
- Track #MyHavenAndHold hashtag
- Alert for potential UGC
- Quick-repost workflow

Reference: Instagram Guide "After-Quiz Instagram Engagement"

Deliverables:
- quiz_completions table
- triggerPostQuizEngagement() function
- Engagement sequence job
- UGC monitoring integration
```

**Acceptance Criteria:**
- [ ] Customer handles captured
- [ ] Engagement delayed appropriately
- [ ] UGC alerts work
- [ ] Sequence respects timing

---

## Phase F: Analytics & Optimization

### Prompt F.1: Content Performance Audit System

```
Build automated content performance auditing.

Weekly review metrics (from guide):
| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Reach | Growing week-over-week | More Reels, better hashtags |
| Engagement Rate | 3-6% | Improve hooks, ask more questions |
| Saves | 2%+ of reach | More valuable/educational content |
| Shares | 1%+ of reach | More emotional/relatable content |
| Profile Visits | Growing | Improve CTAs |
| Link Clicks | 2%+ of profile visits | Better bio, clearer quiz CTA |

Monthly review:
| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Follower Growth | +200-500/month | More Reels, engagement |
| Quiz Clicks from IG | 50-100/month | More quiz CTAs |
| Sales from IG | 5-10% of total | Better product posts |

Create content_audit table:
- period (weekly/monthly)
- period_start, period_end
- metrics JSONB (all values above)
- top_posts: UUID[] (top 3 by engagement)
- top_saved: UUID[] (top 3 by saves)
- top_reels: UUID[] (top 3 Reels)
- insights: TEXT[] (auto-generated)
- actions: TEXT[] (recommended actions)

Create generateWeeklyAudit() job:
- Runs every Sunday night
- Pulls metrics from Instagram API
- Compares to targets
- Generates insights like:
  - "Engagement rate 4.2% (above target ✓)"
  - "Saves at 1.5% (below 2% target — add more educational content)"
- Creates action items

Reference: Instagram Guide "Analytics & Optimization"

Deliverables:
- content_audit table
- generateWeeklyAudit() job
- Audit dashboard page
- Action item tracking
```

**Acceptance Criteria:**
- [ ] Weekly audits generate
- [ ] Metrics compare to targets
- [ ] Insights are actionable
- [ ] Top content identified

---

### Prompt F.2: Template Performance Tracking

```
Build template-level performance tracking.

Track for each template:
- Usage count
- Average engagement rate
- Average saves
- Average shares
- Best performing variation

Monthly questions to answer (from guide):
1. Which 3 posts got highest engagement?
2. Which 3 posts got most saves?
3. Which 3 Reels performed best?
4. What time slots work best?
5. Which hashtag sets performed best?

Create template_performance view:
SELECT 
  t.id, t.name, t.template_type, t.content_pillar,
  COUNT(p.id) as usage_count,
  AVG(p.engagement_rate) as avg_engagement,
  AVG(p.saves) as avg_saves,
  AVG(p.shares) as avg_shares,
  ARRAY_AGG(p.id ORDER BY p.engagement_rate DESC LIMIT 3) as top_posts
FROM instagram_templates t
JOIN instagram_scheduled_posts p ON p.template_id = t.id
WHERE p.status = 'published'
GROUP BY t.id

Create getTopTemplates(period: 'week' | 'month') function:
- Returns templates ranked by performance
- Grouped by: feed, reel, carousel, story
- Includes: "Create more of this" suggestions

Dashboard integration:
- "Top Performers" widget
- Template comparison view
- "Winners to repeat" section

Reference: Instagram Guide "Content Performance Audit"

Deliverables:
- template_performance view/materialized view
- getTopTemplates() function
- Performance dashboard widgets
- Winner highlighting
```

**Acceptance Criteria:**
- [ ] Template stats accurate
- [ ] Top performers identified
- [ ] Comparison view works
- [ ] Suggestions generated

---

## Phase G: Highlight Management

### Prompt G.1: Story Highlights System

```
Build Story Highlights curation and management.

Highlights to maintain (from guide):
| Highlight | Icon | Content |
|-----------|------|---------|
| Quiz | "?" | Quiz promotion, results explanation |
| Shop | Shopping bag | Product highlights, new arrivals |
| How To | Lightbulb | Printing tips, framing guides |
| Reviews | Heart | Customer testimonials, UGC |
| About | H&H logo | Brand story, mission, founder |
| New | Star | Latest arrivals |

Create story_highlights table:
- id, name, icon_emoji
- cover_asset_id (custom cover image)
- position (display order)
- auto_add_rules: JSONB — conditions for auto-adding stories

Auto-add rules:
- Quiz: story_type = 'quiz_cta'
- Shop: story_type = 'product_highlight'
- How To: content_pillar = 'educational'
- Reviews: has_ugc = true OR story_type = 'customer_feature'
- New: is_new_product = true

Create highlight_stories junction:
- highlight_id, story_id
- added_at
- expires_at (highlights can be culled after 90 days)

Auto-curation job:
- When story published, check auto_add_rules
- Add to matching highlights
- Remove stories older than 90 days (keep 15-20 per highlight)

Highlight management UI:
- Reorder stories within highlight
- Manual add/remove
- Preview how highlight looks
- Analytics per highlight

Reference: Instagram Guide "Stories Highlight Covers"

Deliverables:
- story_highlights table
- highlight_stories junction
- Auto-add rules engine
- Highlight management UI
```

**Acceptance Criteria:**
- [ ] 6 highlights created
- [ ] Auto-add rules work
- [ ] Stories expire correctly
- [ ] Manual override works

---

## Phase H: Content Calendar Generation

### Prompt H.1: Weekly Calendar Generator

```
Build auto-generated weekly content calendar.

From Instagram Guide weekly structure:

Week 1 (Launch/Foundation):
| Day | Feed | Reel | Carousel | Stories |
|-----|------|------|----------|---------|
| Mon | Signature quote | — | — | 5 |
| Tue | — | Transformation | — | 4 |
| Wed | #2 quote | — | — | 5 |
| Thu | — | Quote reveal | Educational | 4 |
| Fri | Lifestyle shot | — | — | 6 |
| Sat | #3 quote | Quote reveal | — | 4 |
| Sun | — | — | Brand story | 3 |

Create generateWeeklyCalendar(weekType: string, startDate: Date) function:
- weekType: 'foundation' | 'engagement' | 'community' | 'conversion'
- Returns array of scheduled posts (not yet created)
- Respects existing scheduled content (fills gaps)

Calendar templates for each week type:

WEEK 2 (Engagement Building):
- More educational carousels
- How-to Reel
- Customer feature on Friday

WEEK 3 (Community Growth):
- BTS Reel
- UGC features
- More polls in Stories

WEEK 4 (Conversion Push):
- Quiz teaser Reel
- Best-seller features
- Urgency Stories
- Limited product highlights

Create applyCalendarTemplate(weekType, startDate):
- Shows preview of what will be scheduled
- User confirms
- Creates all posts as drafts OR scheduled (based on operator mode)
- Assigns optimal times

UI:
- "Generate Week" button in scheduler
- Week type selector
- Preview before applying
- Edit individual items

Reference: Instagram Guide "Week-by-Week Content Calendar"

Deliverables:
- generateWeeklyCalendar() function
- 4 week type templates
- applyCalendarTemplate() with preview
- Week generator UI
```

**Acceptance Criteria:**
- [ ] 4 week templates defined
- [ ] Generates correct structure
- [ ] Respects existing content
- [ ] Preview before apply works

---

### Prompt H.2: Monthly Theme Planning

```
Build monthly content theme system.

From Instagram Guide monthly structure:

MONTH 1 (Launch):
- Week 1: Introduction — brand story, signature products, quiz intro
- Week 2: Value — educational heavy, authority building
- Week 3: Community — UGC, customer spotlights
- Week 4: Conversion — product focus, quiz CTAs

MONTH 2 (Growth):
- Week 5: Expand Collections — all 3 collections, segment content
- Week 6: Deepen Education — advanced tips, styling, framing
- Week 7: Social Proof — testimonials, reviews
- Week 8: Scale — repeat winners, increase frequency

MONTH 3 (Optimize):
- Weeks 9-10: Data-Driven — double down on top content
- Weeks 11-12: Seasonal — seasonal angles, gift guides

Create monthly_themes table:
- month_number (1, 2, 3...)
- theme_name
- week_themes: JSONB[] — [{week: 1, theme: "Introduction", focus: "..."}]
- kpis: JSONB — {followers: "+500", engagement: "4%+", quiz_clicks: 100}

Create getMonthlyPlan(monthNumber: number) function:
- Returns theme, weekly focuses, KPIs
- Generates high-level calendar

Monthly planning view:
- Theme header with goals
- Week-by-week focus areas
- KPI targets visible
- "Generate Weeks" button (uses H.1)

Reference: Instagram Guide "Monthly Content Calendar"

Deliverables:
- monthly_themes table with seed data
- getMonthlyPlan() function
- Monthly planning view
- KPI tracking integration
```

**Acceptance Criteria:**
- [ ] 3 months of themes seeded
- [ ] Week themes accurate
- [ ] KPIs displayed
- [ ] Generates weekly calendars

---

## Summary: Build Order

**After completing main build prompts Phase 1-2:**

**Content Foundation (Days 1-3):**
- A.1: Feed caption templates
- A.2: Reel script templates
- A.3: Story templates
- A.4: Carousel templates
- B.1: Content-type hashtags

**Scheduling Intelligence (Days 4-5):**
- C.1: Day strategy engine
- C.2: Weekly balance tracker

**Engagement & Quiz (Days 6-7):**
- D.1: Engagement queue
- D.2: Comment suggestions
- E.1: Quiz CTA distribution
- E.2: Post-quiz engagement

**Analytics & Planning (Days 8-10):**
- F.1: Performance audit
- F.2: Template tracking
- G.1: Highlights system
- H.1: Weekly calendar generator
- H.2: Monthly themes

---

## Phase I: TikTok Hooks Library

### Prompt I.1: Seed Quote Reveal Hooks (100+)

```
Seed the comprehensive TikTok hooks library for quote reveal videos.

From TikTok Strategy doc, hooks drive completion rate. Seed 100+ hooks organized by:

HOOK TYPES:
1. Pattern Interrupt (stop the scroll)
2. Direct Address (speak to viewer)
3. Curiosity Gap (incomplete info)
4. Controversy/Hot Take
5. Story Opening
6. POV Format
7. "Read This When..." Format

Seed these categories with 15+ hooks each:

EMOTIONAL HOOKS (quote reveals):
- "Read this if you're struggling right now"
- "POV: You needed to hear this today"
- "This quote broke me (in a good way)"
- "Stop scrolling if you need a sign"
- "The words I wish someone told me sooner"
- "Save this for your next breakdown"
- "If you're exhausted, this is for you"
- "Read this when the anxiety won't stop"
- "For anyone who feels like giving up"
- "This hit different at 2am"
- "The quote that changed how I see myself"
- "When your therapist is unavailable, read this"
- "For my overthinkers 🖤"
- "This is your permission slip"
- "Not motivation. Just truth."

TRANSFORMATION HOOKS (before/after):
- "Watch this boring wall become a sanctuary"
- "$27 wall transformation"
- "POV: You finally make your room feel like you"
- "How I made my apartment feel like therapy"
- "The $12 upgrade that changed everything"
- "Before vs after (I'm obsessed)"
- "Turning my blank wall into a vibe"
- "Gallery wall on a budget — watch this"

EDUCATIONAL HOOKS:
- "Stop wasting money on bad prints"
- "The $2 secret to gallery-quality prints"
- "Why your home printer is lying to you"
- "3 things I wish I knew before printing art"
- "The framing hack that saves $50+"
- "Where designers actually get cheap frames"

Schema for video_hooks:
- hook_text: TEXT
- hook_type: (pattern_interrupt/direct_address/curiosity/controversy/story/pov/read_when)
- content_types: TEXT[] (quote_reveal/transformation/educational/bts/trending)
- collections: TEXT[] (grounding/wholeness/growth/any)
- platforms: TEXT[] (tiktok/instagram/both)
- avg_completion_rate: FLOAT (track over time)
- usage_count, last_used_at

Reference: TikTok Strategy "Content Pillars" and "Hook Examples"

Deliverables:
- Seed 100+ hooks across all categories
- Hook type classification
- Collection affinity mapping
- Platform tagging (some hooks work better on TikTok vs IG)
```

**Acceptance Criteria:**
- [ ] 100+ hooks seeded
- [ ] All 7 hook types represented
- [ ] Collection affinities set
- [ ] Can query by type and collection

---

### Prompt I.2: Hook Selection Algorithm

```
Build the intelligent hook selection algorithm for TikTok/Reels.

Selection criteria (in priority order):
1. Match content_type (quote_reveal, transformation, etc.)
2. Match collection (or 'any')
3. Match platform (tiktok, instagram, both)
4. Exclude hooks used in last 14 days
5. Prefer higher avg_completion_rate (if data exists)
6. Use least-recently-used as tiebreaker

Function: selectHook(params: HookSelectionParams): Promise<Hook>

params = {
  content_type: 'quote_reveal',
  collection: 'grounding',
  platform: 'tiktok',
  exclude_hook_ids?: string[] // manual exclusions
}

Algorithm:
1. Query hooks matching content_type + collection + platform
2. Filter out hooks used in last 14 days (from usage log)
3. If pool has performance data, weight by completion_rate
4. Otherwise, select least-recently-used
5. Log selection to hook_usage table
6. Return selected hook

Performance weighting formula:
- Hooks with 0 uses: neutral weight (1.0)
- Hooks with <5 uses: slight boost for new hooks (1.1)
- Hooks with 5+ uses: weight by completion_rate percentile

Also create:
- getHookPool(content_type, collection): shows available hooks
- markHookUsed(hook_id, post_id): logs usage
- updateHookPerformance(hook_id, completion_rate): from analytics

Reference: Spec "Hook Selection Algorithm"

Deliverables:
- selectHook() function
- hook_usage tracking table
- Performance weighting logic
- Pool query functions
```

**Acceptance Criteria:**
- [ ] Selects appropriate hooks
- [ ] Never repeats within 14 days
- [ ] Performance weighting works
- [ ] Usage logged correctly

---

## Phase J: TikTok Captions & Hashtags

### Prompt J.1: TikTok Caption Templates

```
Seed TikTok-specific caption templates (different tone than Instagram).

TikTok caption style:
- Shorter than Instagram
- More casual/conversational
- Hook-forward (caption continues the hook)
- Hashtags at end (not first comment)
- Emojis used sparingly but strategically

Create templates for each content pillar:

QUOTE REVEAL (30% of content):
Template 1 - Minimal:
"""
{{hook_text}}

"{{quote_text}}"

Save this for when you need it 🤍

{{hashtags}}
"""

Template 2 - Story:
"""
{{hook_text}}

I found this quote on my hardest day.
Now it lives on my wall.

"{{quote_text}}"

Link in bio if you need it too.

{{hashtags}}
"""

Template 3 - Direct:
"""
{{hook_text}}

"{{quote_text}}"

Which one of you needed this today? 👇

{{hashtags}}
"""

TRANSFORMATION (25%):
"""
{{hook_text}}

Total cost: ${{total_cost}}
- Print: ${{print_cost}}
- Frame: ${{frame_cost}}
- The vibe: priceless

Shop prints: link in bio

{{hashtags}}
"""

EDUCATIONAL (20%):
"""
{{hook_text}}

Step 1: {{step_1}}
Step 2: {{step_2}}
Step 3: {{step_3}}

Save this for later 📌

{{hashtags}}
"""

BEHIND-THE-SCENES (15%):
"""
{{hook_text}}

The truth about running a small business:
{{vulnerable_truth}}

But moments like this make it worth it.

{{hashtags}}
"""

TRENDING ADAPTATION (10%):
"""
{{trend_format}}

"{{quote_text}}"

{{hashtags}}
"""

Schema additions:
- platform: 'tiktok' | 'instagram' | 'both'
- tone: 'casual' | 'emotional' | 'educational' | 'minimal'
- max_length: INTEGER (TikTok captions should be shorter)

Reference: TikTok Strategy "Caption Templates"

Deliverables:
- 15+ TikTok caption templates
- Platform-specific filtering
- Tone classification
```

**Acceptance Criteria:**
- [ ] 15+ TikTok templates seeded
- [ ] Shorter than Instagram equivalents
- [ ] Appropriate casual tone
- [ ] Variables substitute correctly

---

### Prompt J.2: TikTok Hashtag Strategy (5-5-5 Method)

```
Implement the TikTok 5-5-5 hashtag method.

TikTok hashtag strategy differs from Instagram:
- Fewer hashtags (15 vs 20-25)
- Different trending tags
- Niche tags more important for discoverability

5-5-5 METHOD:
- 5 Broad/Trending (1M+ views)
- 5 Medium/Niche (100K-1M views)  
- 5 Specific/Micro (<100K views)

Seed TikTok-specific hashtag groups:

BROAD (5):
#fyp #foryou #tiktokmademebuyit #homedecor #roomtransformation
#aesthetic #cozyroom #apartmenttherapy #roominspo #minimalist

MEDIUM (5 per category):
Home/Decor:
#bedroomdecor #homeofficeinspo #gallerywall #printableart #wallartdecor
#neutraldecor #cozyhome #hyggehome #apartmentdecor #rentersofinstagram

Mental Health:
#mentalhealthtiktok #anxietytips #healingtiktok #therapytiktok #selfcaretips
#mentalhealthmatters #innerwork #emotionalhealth #traumahealing #selflovefirst

MICRO (5 per category):
Therapeutic:
#quoteart #mindfuldecor #sanctuaryspace #calmcorner #peacefulhome
#therapyoffice #counselorlife #groundingpractice #nervousystemhealth

Product-specific:
#digitaldownloads #printableartwork #instantdownload #etsyfinds #shopsmall
#supportsmallbusiness #printathome #affordableart #diyhomedecor

Create generateTikTokHashtags(collection, content_type) function:
1. Select 5 from Broad pool (rotate)
2. Select 5 from Medium pool (match content_type)
3. Select 5 from Micro pool (match collection)
4. Exclude any used in last 3 TikTok posts
5. Format as single line with # prefix

Brand hashtags (always include 1-2):
#havenandhold #quietanchors

Reference: TikTok Strategy "Hashtag Strategy"

Deliverables:
- TikTok-specific hashtag groups
- generateTikTokHashtags() function
- 5-5-5 selection logic
- Rotation tracking
```

**Acceptance Criteria:**
- [ ] 15 hashtags generated (5-5-5)
- [ ] Different from Instagram hashtags
- [ ] Rotation prevents repetition
- [ ] Collection matching works

---

## Phase K: TikTok Content Calendar

### Prompt K.1: TikTok Pillar Distribution

```
Implement TikTok content pillar tracking and distribution.

TikTok pillars differ from Instagram:

| Pillar | TikTok % | Instagram % | Notes |
|--------|----------|-------------|-------|
| Quote Reveals | 30% | 40% (product) | Highest engagement |
| Transformations | 25% | 20% | High conversion |
| Educational | 20% | 20% | Same |
| Behind-the-Scenes | 15% | 10% | More personal on TikTok |
| Trending | 10% | 5% | Platform-specific |

Create getTikTokPillarBalance(period: 'week' | 'month') function:

Returns:
{
  quote_reveals: { current: 8, target: 9, percentage: 30, status: 'on_track' },
  transformations: { current: 5, target: 7.5, percentage: 25, status: 'behind' },
  educational: { current: 6, target: 6, percentage: 20, status: 'on_track' },
  bts: { current: 3, target: 4.5, percentage: 15, status: 'on_track' },
  trending: { current: 2, target: 3, percentage: 10, status: 'on_track' },
  
  weekly_target: 14, // 2x daily
  current_total: 24,
  suggestions: [
    "Add 2-3 transformation videos this week",
    "Trending content underweight — check current sounds"
  ]
}

TikTok posting frequency targets:
- Daily: 1-2 posts (minimum 1)
- Weekly: 10-14 posts
- AM slot: 7-9 AM
- PM slot: 7-9 PM

Dashboard widget for TikTok:
- Pillar breakdown chart
- Weekly posting streak
- Slot coverage (AM/PM balance)
- Content suggestions

Reference: TikTok Strategy "Content Pillars: The 5-Bucket System"

Deliverables:
- getTikTokPillarBalance() function
- TikTok-specific pillar targets
- Dashboard pillar widget
- Suggestion engine
```

**Acceptance Criteria:**
- [ ] Tracks 5 TikTok pillars
- [ ] Different from Instagram pillars
- [ ] Suggestions actionable
- [ ] Dashboard displays correctly

---

### Prompt K.2: TikTok Batch Filming Prep

```
Build batch filming preparation system.

From TikTok Strategy — weekly batch filming (90 min):
- Batch 1: Quote Reveals (5-7 videos) — same setup, different quotes
- Batch 2: Transformations (2-3 videos) — before/after shots  
- Batch 3: Talking Head (3-4 videos) — educational/story content

Create generateBatchFilmingList(week: Date) function:

Returns structured filming guide:
{
  week_of: "2025-01-06",
  total_videos_needed: 14,
  
  batches: [
    {
      batch_name: "Quote Reveals",
      count: 7,
      setup: "Ring light, print on wall or held, phone on tripod",
      items: [
        {
          quote_id: "...",
          quote_text: "You are held here",
          collection: "grounding",
          suggested_hook: "Read this when you feel alone",
          audio_mood: "soft_emotional",
          notes: "Slow zoom, 8-12 seconds"
        },
        // ... 6 more
      ]
    },
    {
      batch_name: "Transformations", 
      count: 3,
      setup: "Natural light, before/after of same wall",
      items: [
        {
          type: "wall_transformation",
          suggested_hook: "$27 wall glow-up",
          shot_list: ["blank wall", "measuring", "hanging", "styled reveal"],
          products_to_feature: ["quote_id_1", "quote_id_2"]
        }
      ]
    },
    {
      batch_name: "Educational",
      count: 4,
      setup: "Talking head OR screen recording",
      items: [
        {
          topic: "How to print digital downloads",
          hook: "Stop wasting money on bad prints",
          script_outline: ["Choose file size", "Go to print shop", "Request matte", "Frame it"],
          duration_target: "30-45 seconds"
        }
      ]
    }
  ],
  
  filming_tips: [
    "Film all quote reveals in one session (same lighting)",
    "Batch transformations need before + after of same space",
    "Educational can be filmed anytime — less setup dependent"
  ]
}

UI: Batch Filming Prep page
- Shows upcoming week's filming needs
- Printable/downloadable checklist
- Mark batches as filmed
- Links to add videos to queue

Reference: TikTok Strategy "Weekly Tasks" and "Batch Filming"

Deliverables:
- generateBatchFilmingList() function
- Batch Filming Prep page
- Printable checklist export
- Integration with TikTok Queue
```

**Acceptance Criteria:**
- [ ] Generates week's filming needs
- [ ] Organizes into logical batches
- [ ] Includes hooks and scripts
- [ ] Checklist exportable

---

### Prompt K.3: TikTok Performance Tracking

```
Build TikTok-specific performance tracking.

TikTok metrics that matter (different from Instagram):
1. Views (primary metric)
2. Completion Rate (watch time / duration)
3. Shares (viral signal)
4. Saves (intent signal)
5. Comments (engagement)
6. Profile visits (conversion signal)
7. Link clicks (if business account)

Create tiktok_post_metrics table:
- post_id (references tiktok_queue)
- views, likes, comments, shares, saves
- completion_rate (manual entry or API if available)
- profile_visits_attributed (estimate)
- link_clicks (if trackable)
- recorded_at, recorded_by (manual vs api)

Manual metrics entry (since API limited):
- After 24 hours: Enter views, likes, comments, shares
- After 48 hours: Update with final numbers
- Weekly: Estimate link clicks from UTM data

Create TikTok Analytics dashboard:
1. Weekly Performance Card
   - Total views
   - Avg completion rate
   - Top performing video
   - Worst performing (learn from it)

2. Content Pillar Performance
   - Which pillar gets most views?
   - Which gets best completion rate?
   - Which drives most link clicks?

3. Hook Performance
   - Track which hooks correlate with high views
   - Update hook avg_completion_rate
   - Surface "winning hooks" to reuse

4. Best Posting Times (learned)
   - Track performance by time slot
   - Suggest optimal times based on data

Expected results timeline (from strategy doc):
Month 1: 500-2,000 avg views
Month 2: 2,000-8,000 avg views
Month 3: 5,000-20,000 avg views
Month 6: 10,000-50,000+ avg views

Reference: TikTok Strategy "Expected Results Timeline" and "Analytics"

Deliverables:
- tiktok_post_metrics table
- Manual metrics entry UI
- TikTok Analytics dashboard
- Hook performance correlation
```

**Acceptance Criteria:**
- [ ] Metrics entry works
- [ ] Dashboard shows insights
- [ ] Hook performance updates
- [ ] Time analysis available

---

### Prompt K.4: TikTok → Shopify Conversion Tracking

```
Build TikTok to Shopify conversion attribution.

From TikTok Strategy — track the funnel:
TikTok Video → Profile Visit → Link Click → Quiz/Shop → Purchase

UTM tracking for TikTok:
- utm_source=tiktok
- utm_medium=organic (or paid if running ads)
- utm_campaign={{content_pillar}}
- utm_content={{post_id}}

Link-in-bio structure (to seed):
1. 🔥 Today's Featured Print → rotating product
2. 💙 Most Popular (Top 5)
3. 🎁 Bundle Deals (Save 40%)
4. 🆓 Free 3-Print Set (email capture)
5. 🔍 Full Shop

Create tiktok_attribution table:
- session_id
- tiktok_post_id (from utm_content)
- landed_at (timestamp)
- pages_viewed TEXT[]
- quiz_completed BOOLEAN
- email_captured BOOLEAN
- purchase_made BOOLEAN
- order_id (if purchased)
- order_value

Create attribution dashboard:
1. Top Converting Videos
   - Which TikTok posts drive most sales?
   - Revenue attributed to each

2. Content Pillar Conversion
   - Quote reveals: high views, medium conversion
   - Transformations: medium views, high conversion
   - Educational: lower views, highest trust/conversion

3. Funnel Visualization
   - TikTok views → Profile visits → Link clicks → Quiz → Purchase
   - Show drop-off at each stage
   - Identify bottlenecks

4. Link-in-Bio Performance
   - Which link gets most clicks?
   - Time on site from TikTok traffic
   - Return visitor rate

Reference: TikTok Strategy "Conversion Strategy: TikTok → Shopify"

Deliverables:
- UTM tracking setup
- tiktok_attribution table
- Attribution dashboard
- Link-in-bio analytics
```

**Acceptance Criteria:**
- [ ] UTM parameters generated
- [ ] Attribution tracked to post level
- [ ] Conversion funnel visible
- [ ] Revenue attributed correctly

---

## Summary: Complete Build Order

**After completing main build prompts Phase 1-2:**

**Content Foundation (Days 1-3):**
- A.1: Feed caption templates
- A.2: Reel script templates
- A.3: Story templates
- A.4: Carousel templates
- B.1: Content-type hashtags

**Scheduling Intelligence (Days 4-5):**
- C.1: Day strategy engine
- C.2: Weekly balance tracker

**Engagement & Quiz (Days 6-7):**
- D.1: Engagement queue
- D.2: Comment suggestions
- E.1: Quiz CTA distribution
- E.2: Post-quiz engagement

**Analytics & Planning (Days 8-10):**
- F.1: Performance audit
- F.2: Template tracking
- G.1: Highlights system
- H.1: Weekly calendar generator
- H.2: Monthly themes

**TikTok Content Strategy (Days 11-14):**
- I.1: TikTok hooks library (100+)
- I.2: Hook selection algorithm
- J.1: TikTok caption templates
- J.2: TikTok hashtag strategy (5-5-5)
- K.1: TikTok pillar distribution
- K.2: Batch filming prep
- K.3: TikTok performance tracking
- K.4: TikTok → Shopify attribution

---

## Automation Summary

### What Gets Fully Automated

| Process | Trigger | Output |
|---------|---------|--------|
| Video generation | Quote approved | 9:16 video file |
| Hook selection | Video generation | Best-match hook |
| Caption generation | Video ready | Platform-specific caption |
| Hashtag generation | Caption ready | IG (20) or TikTok (15) |
| TikTok queue entry | Video complete | Ready-to-post item |
| Instagram scheduling | Queue ready | Auto-publishes at time |
| Story scheduling | Daily job 8PM | Next day stories |
| Performance tracking | Metrics sync | Updated analytics |
| Batch filming list | Weekly job | Filming prep guide |

### What Requires Human Touch

| Task | System Support | Human Action |
|------|----------------|--------------|
| TikTok posting | Video + caption ready | Copy/paste, 2 min |
| Interactive Stories | Templates ready | Post via app |
| Metrics entry (TikTok) | Form ready | Enter numbers |
| Transformation filming | Shot list ready | Film content |
| Talking head content | Scripts ready | Film content |
| Comment responses | Suggestions shown | Approve/edit |

### Time Savings Estimate

| Task | Before | After | Savings |
|------|--------|-------|---------|
| Daily TikTok post | 45 min | 3 min | 93% |
| Daily Instagram posts | 45 min | 5 min | 89% |
| Weekly content planning | 3 hours | 15 min | 92% |
| Hashtag research | 20 min | 0 min | 100% |
| Caption writing | 15 min | 0 min | 100% |
| Batch filming prep | 1 hour | 5 min | 92% |

**Total weekly time savings: ~10 hours → ~1 hour**

---

**Total: 24 prompts across 11 phases**

Phases A-H: Instagram content strategy
Phases I-K: TikTok content strategy

Each prompt seeds content that powers the automation engine built in the main build prompts.
