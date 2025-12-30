# Build Prompt: Fix Email Seed to Include Editor Content

## Problem

The email seed at `/src/app/api/email-workflows/seed/route.ts` creates templates with:
- ✅ `html_content` — Full HTML template (for Klaviyo sync)
- ✅ `subject` — Email subject line
- ✅ `preview_text` — Preview text

But is **missing**:
- ❌ `content_html` — Rich text editor content (what the UI displays)
- ❌ `button_text` — CTA button text
- ❌ `button_url` — CTA button URL

This causes the UI to show "Replace this content with your email copy" placeholder text even after seeding.

## Task

Update the email seed to include `content_html`, `button_text`, and `button_url` for all 18 email templates.

## File to Modify

`/src/app/api/email-workflows/seed/route.ts`

## Implementation

### 1. Update Each Template Object

Add these three fields to every template in `EMAIL_TEMPLATES`:

```typescript
{
  position: 1,
  delay_hours: 0,
  name: 'Welcome + Lead Magnet Delivery',
  subject: 'Welcome to Haven & Hold 🌿',
  preview_text: 'Your space for quiet holding',
  // ADD THESE THREE FIELDS:
  content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Welcome to the haven.</p>
<p>You've joined a community that believes spaces should hold us gently—that the words on our walls can do some of the work when we can't.</p>
<p>As a thank you for joining us, here's 15% off your first order:</p>
<p><strong>Code: WELCOME15</strong></p>
<p>Every print includes 16 sizes, instant download, and a guide to printing at home or at any local shop.</p>
<p>Held gently,<br>Haven & Hold</p>`,
  button_text: 'Browse the Collection',
  button_url: 'https://havenandhold.com/collections/all',
  // Keep existing html_content as-is
  html_content: `...existing full HTML...`,
}
```

### 2. Full Content for All Templates

Here's the `content_html`, `button_text`, and `button_url` to add for each template:

---

#### WELCOME FLOW (4 emails)

**Email 1: Welcome + Lead Magnet Delivery**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Welcome to the haven.</p>
<p>You've joined a community that believes spaces should hold us gently—that the words on our walls can do some of the work when we can't.</p>
<p>As a thank you for joining us, here's 15% off your first order:</p>
<p><strong>Code: WELCOME15</strong></p>
<p>Every print includes 16 sizes, instant download, and a guide to printing at home or at any local shop.</p>
<p>Held gently,<br>Haven & Hold</p>`,
button_text: 'Browse the Collection',
button_url: 'https://havenandhold.com/collections/all',
```

**Email 2: Brand Story**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>A few years ago, I sat in my therapist's office staring at a quote on her wall:</p>
<blockquote>"You are allowed to be both a masterpiece and a work in progress."</blockquote>
<p>Something about those words in that space—a space that had witnessed so many hard moments—changed how I thought about what we put on our walls.</p>
<p>When I went looking for something similar for my own home, everything I found was either:</p>
<ul>
<li>Too clinical (felt like a doctor's office)</li>
<li>Too cliché (Live, Laugh, Love... no thank you)</li>
<li>Too aggressive (Rise and Grind! Be Unstoppable!)</li>
</ul>
<p>Where were the words for when you just needed permission to be held?</p>
<p>So I created Haven & Hold.</p>
<p><strong>Not motivation. Not inspiration. Just holding.</strong></p>
<p>For the spaces that witness your becoming.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Explore Our Story',
button_url: 'https://havenandhold.com/pages/our-story',
```

**Email 3: Best Sellers by Collection**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Everyone needs something different from their space.</p>
<p>That's why we organize our prints into three therapeutic collections:</p>
<p><strong>🔺 THE GROUNDING COLLECTION</strong><br>
For when you need stability, safety, an anchor. Words that remind you: you are held exactly where you are.</p>
<p><strong>⭕ THE WHOLENESS COLLECTION</strong><br>
For when you need self-compassion. Words that remind you: all of you belongs here.</p>
<p><strong>🌱 THE GROWTH COLLECTION</strong><br>
For when you're ready to transform. Words that remind you: still becoming is enough.</p>
<p>Not sure which speaks to you? Take our 2-minute quiz to find your perfect match.</p>
<p>Your 15% off code (WELCOME15) is still waiting.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Find Your Collection',
button_url: 'https://havenandhold.com/pages/quiz',
```

**Email 4: Social Proof + First Purchase Offer**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>We wanted to share what others are saying about their Haven & Hold prints:</p>
<blockquote>"I hang 'You are held here' above my bed. On hard mornings, I look up before I look down." — Sarah M.</blockquote>
<blockquote>"My therapist actually asked where I got my print. Now it's in her office too." — Jennifer R.</blockquote>
<blockquote>"These aren't just decorations. They're daily reminders that I'm allowed to take up space." — Michelle K.</blockquote>
<p>Your WELCOME15 code expires in 48 hours.</p>
<p>Your sanctuary is waiting.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Use My Code',
button_url: 'https://havenandhold.com/collections/all?discount=WELCOME15',
```

---

#### QUIZ RESULT FLOW (4 emails)

**Email 1: Your Quiz Results + Collection Recommendations**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>You took our Sanctuary Quiz, and here's what we learned:</p>
<p><strong>Your result: THE {{ quiz_result|default:'GROUNDING'|upper }} COLLECTION</strong></p>
{% if quiz_result == 'grounding' %}
<p>Right now, you need stability. Safety. An anchor when everything feels uncertain.</p>
<p>The Grounding Collection speaks to the part of you that needs permission to stand still, to find solid ground, to simply be held exactly where you are.</p>
{% elif quiz_result == 'wholeness' %}
<p>Right now, you need self-compassion. Acceptance. Permission to embrace all of who you are.</p>
<p>The Wholeness Collection speaks to the part of you that's learning to hold space for every version of yourself—the messy, the beautiful, the becoming.</p>
{% else %}
<p>Right now, you're ready to transform. To become. To step into what's next.</p>
<p>The Growth Collection speaks to the part of you that's unfolding—honoring where you've been while reaching toward who you're becoming.</p>
{% endif %}
<p>Use code <strong>SANCTUARY15</strong> for 15% off your collection.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'See Your Collection',
button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
```

**Email 2: Deep Dive into Your Collection**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Yesterday we shared your Sanctuary Quiz results: <strong>The {{ quiz_result|default:'Grounding'|title }} Collection</strong>.</p>
<p>Today, let's go deeper into why these words might resonate.</p>
{% if quiz_result == 'grounding' %}
<p>The Grounding Collection was created for the moments when the world feels too fast, too loud, too much. When you need permission to simply stand still.</p>
<p>Each quote is a quiet anchor—words that remind you: you don't have to do anything to be worthy of rest.</p>
{% elif quiz_result == 'wholeness' %}
<p>The Wholeness Collection was created for those learning to make peace with all of who they are. The parts you show the world, and the parts you're still learning to accept.</p>
<p>Each quote is an invitation—words that remind you: you don't have to hide any part of yourself here.</p>
{% else %}
<p>The Growth Collection was created for those in transition. Between who you were and who you're becoming. In the beautiful, messy middle.</p>
<p>Each quote is an encouragement—words that remind you: transformation isn't linear, and you're exactly where you need to be.</p>
{% endif %}
<p>Your SANCTUARY15 code is still active.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Explore the Collection',
button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
```

**Email 3: Styled Room Inspiration**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Wondering where to place your prints? Here's some inspiration from our community:</p>
<p><strong>Above the bed</strong> — The first words you see each morning, the last before sleep.</p>
<p><strong>Home office</strong> — A gentle reminder during the workday.</p>
<p><strong>Therapy waiting room</strong> — Yes, we have therapists who display our prints for their clients.</p>
<p><strong>Bathroom mirror</strong> — Small but powerful placement for daily affirmation.</p>
<p>The {{ quiz_result|default:'Grounding'|title }} Collection prints work beautifully in any of these spaces.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Shop Your Collection',
button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}',
```

**Email 4: Limited Time Offer for Your Collection**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your SANCTUARY15 code expires tonight at midnight.</p>
<p>If you've been thinking about bringing The {{ quiz_result|default:'Grounding'|title }} Collection into your space, now's the time.</p>
<p><strong>What you get:</strong></p>
<ul>
<li>Instant digital download</li>
<li>16 print sizes included (from 4×6" to 24×36")</li>
<li>Print guide with paper and frame recommendations</li>
<li>Lifetime access to your files</li>
</ul>
<p>No pressure. Just a gentle nudge if you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Use SANCTUARY15 Now',
button_url: '{{ url|default:"https://havenandhold.com/collections/all" }}?discount=SANCTUARY15',
```

---

#### CART ABANDONMENT FLOW (3 emails)

**Email 1: You left something behind**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your sanctuary is waiting.</p>
<p>You left something in your cart, and we wanted to make sure you didn't forget.</p>
<p>{{ items|default:'Your selected prints are' }} still there whenever you're ready.</p>
<p>Need help deciding? Reply to this email—we're happy to help you find the perfect print for your space.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Complete Your Order',
button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}',
```

**Email 2: Still thinking about it?**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Still thinking about those prints?</p>
<p>Here's a little something to help you decide:</p>
<p><strong>Code: COMEBACK10</strong> for 10% off your order.</p>
<p>One of our customers recently told us: "I kept putting off buying the print. When I finally did, I wondered why I waited so long. It's the first thing I see every morning."</p>
<p>Your cart is saved and ready when you are.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Use COMEBACK10',
button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}?discount=COMEBACK10',
```

**Email 3: Last chance + small discount**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Last chance—your cart will expire soon.</p>
<p>Your COMEBACK10 code is still active, but not for long.</p>
<p>If now isn't the right time, that's okay too. Your sanctuary will be here when you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Complete Order',
button_url: '{{ checkout_url|default:"https://havenandhold.com/cart" }}?discount=COMEBACK10',
```

---

#### POST-PURCHASE FLOW (4 emails)

**Email 1: Order Confirmation + What to Expect**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Thank you for bringing Haven & Hold into your space. 💚</p>
<p><strong>Your order is confirmed.</strong></p>
<p>Your digital downloads are ready now—check your email for the download link, or access them anytime from your account.</p>
<p><strong>What's next:</strong></p>
<ol>
<li>Download your files (16 sizes included)</li>
<li>Choose your favorite size for your space</li>
<li>Print at home or any local print shop (we recommend Staples or FedEx)</li>
<li>Frame and hang in your sanctuary</li>
</ol>
<p>Need printing tips? We've got you covered in our next email.</p>
<p>Held gently,<br>Haven & Hold</p>`,
button_text: 'Download Your Prints',
button_url: '{{ download_url|default:"https://havenandhold.com/account" }}',
```

**Email 2: Care Instructions (How to Print)**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Ready to print? Here's how to get gallery-quality results:</p>
<p><strong>Step 1: Choose your size</strong><br>
Your download includes 16 sizes. Pick the one that matches your frame or desired wall space.</p>
<p><strong>Step 2: Skip your home printer</strong><br>
For best results, take your file to Staples, FedEx Office, or a local print shop. Cost: $3-8.</p>
<p><strong>Step 3: Request matte cardstock</strong><br>
Say: "Please print this on matte cardstock, no cropping, no scaling." This gives you that premium gallery look.</p>
<p><strong>Step 4: Frame it</strong><br>
IKEA RIBBA frames are beautiful and affordable. Target and Amazon also have great options.</p>
<p>Questions? Just reply to this email.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'View Printing Guide',
button_url: 'https://havenandhold.com/pages/how-it-works',
```

**Email 3: Request Review**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>How's your print looking on the wall?</p>
<p>We'd love to see it—and hear what you think.</p>
<p>If you have a moment, would you leave us a quick review? It helps other people find Haven & Hold, and we genuinely read every single one.</p>
<p>Bonus: Tag us on Instagram (@havenandhold) and you might be featured in our customer gallery.</p>
<p>Thank you for being part of this community.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Leave a Review',
button_url: 'https://havenandhold.com/pages/reviews',
```

**Email 4: Complementary Products**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Enjoying your prints?</p>
<p>Here are some pieces that pair beautifully with what you already have:</p>
<p>Whether you're building a gallery wall or finding prints for other rooms, we thought these might speak to you.</p>
<p>As a thank you for being a customer, here's <strong>10% off your next order</strong>:</p>
<p><strong>Code: THANKYOU10</strong></p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Shop More Prints',
button_url: 'https://havenandhold.com/collections/all?discount=THANKYOU10',
```

---

#### WIN-BACK FLOW (3 emails)

**Email 1: We miss you + Special offer**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>It's been a while. 💚</p>
<p>We've been adding new quotes to the collection, and we thought of you.</p>
<p>Your sanctuary might be ready for new words.</p>
<p>Come see what's new—and if anything speaks to you, use <strong>MISSYOU20</strong> for 20% off.</p>
<p>No pressure. Just an open door.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'See What\'s New',
button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
```

**Email 2: What's new since you left**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Here's what's happened at Haven & Hold since we last saw you:</p>
<ul>
<li>New quotes added to all three collections</li>
<li>Customer favorites are now marked as bestsellers</li>
<li>We've been featured by therapists and wellness spaces</li>
</ul>
<p>Your MISSYOU20 code is still active—20% off anything in the shop.</p>
<p>We'd love to welcome you back.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Use MISSYOU20',
button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
```

**Email 3: Final reminder**
```typescript
content_html: `<p>{{ first_name|default:'Friend' }},</p>
<p>Your MISSYOU20 code expires tonight at midnight.</p>
<p>If you've been thinking about adding new words to your walls, now's the time.</p>
<p>If not, no worries. We'll be here whenever you're ready.</p>
<p>Held,<br>Haven & Hold</p>`,
button_text: 'Last Chance: 20% Off',
button_url: 'https://havenandhold.com/collections/all?discount=MISSYOU20',
```

---

### 3. Optional: Add Re-seed Capability

Since templates already exist with missing fields, add an update path:

```typescript
// In POST handler, after checking for existing template:
if (existing) {
  // Update existing template with missing fields
  const { error } = await supabase
    .from('email_templates')
    .update({
      content_html: template.content_html,
      button_text: template.button_text,
      button_url: template.button_url,
    })
    .eq('id', existing.id);
  
  if (!error) {
    updated++;
  }
  continue;
}
```

Or add a query parameter: `POST /api/email-workflows/seed?update_content=true`

## Acceptance Criteria

- [ ] All 18 templates include `content_html` with Haven & Hold branded copy
- [ ] All 18 templates include `button_text` and `button_url`
- [ ] Fresh seed populates all fields correctly
- [ ] Existing templates can be updated with new content (re-seed)
- [ ] UI editor shows actual brand copy, not placeholder
- [ ] Subject lines and preview text still populated correctly

## Testing

1. Clear existing email templates (or use update mode)
2. Run seed: `POST /api/email-workflows/seed`
3. Go to Email → Workflows → Welcome Flow
4. Verify Email 1 editor shows:
   - "Welcome to the haven." (not placeholder)
   - "WELCOME15" discount code
   - "Held gently" sign-off
5. Verify button shows "Browse the Collection" 
6. Repeat for Quiz Result, Cart Abandonment, Post-Purchase, Win-Back flows
7. Test "Sync to Klaviyo" to verify full HTML still works
