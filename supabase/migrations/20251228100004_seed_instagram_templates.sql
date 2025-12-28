-- ============================================================================
-- Migration: 20251228100004_seed_instagram_templates
-- Description: Seed 17 default Instagram caption templates
-- Feature: Instagram & Video Automation (Prompt 2.2)
-- ============================================================================

-- ============================================================================
-- PRODUCT SHOWCASE TEMPLATES (40%)
-- Preferred days: Tue (2), Wed (3), Sat (6)
-- ============================================================================

-- Template 1: Single Quote Showcase (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Single Quote Showcase',
  'feed',
  'product_showcase',
  'general',
  E'[Emotional hook that stops the scroll]\n\n"{{quote_text}}" — for the walls that witness your hardest mornings. For the rooms where you fall apart and come back together.\n\nThis one lives above my bed. It''s the first thing I see when the day feels too heavy.\n\nWhere would it live in your space?\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 3, 6],
  true,
  true,
  true
);

-- Template 2: Quote Reveal Reel (Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Quote Reveal Reel',
  'reel',
  'product_showcase',
  'general',
  E'Not motivation. Just holding. \n\n"{{quote_text}}"\n\nFor spaces that need to hold you, not push you.\n\nPart of the {{collection_name}} Collection.\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 6],
  true,
  true,
  true
);

-- Template 3: Lifestyle Styled Shot (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Lifestyle Styled Shot',
  'feed',
  'product_showcase',
  'general',
  E'Sunday morning. Coffee cooling. The world still quiet.\n\nThis is what "{{quote_text}}" looks like in real life — not a perfect moment, just a held one.\n\nSome walls just need to witness. Not motivate. Not fix. Just witness.\n\nWhat does your Sunday morning space look like?\n\n{{cta_link}}',
  'lifestyle',
  ARRAY[0, 3, 6],
  true,
  true,
  true
);

-- Template 4: Product Detail Close-Up (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Product Detail Close-Up',
  'feed',
  'product_showcase',
  'general',
  E'Not all wall art is created equal.\n\nTypography matters. Spacing matters. Intention matters.\n\n"{{quote_text}}" — designed with literary depth and therapeutic positioning.\n\nThat''s why it''s $12, not $2.99.\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 3],
  true,
  true,
  true
);

-- ============================================================================
-- BRAND STORY TEMPLATES (20%)
-- Preferred days: Thu (4), Sun (0)
-- ============================================================================

-- Template 5: Behind the Quote (Feed/Carousel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Behind the Quote',
  'carousel',
  'brand_story',
  'general',
  E'Why this quote exists in the collection:\n\n"{{quote_text}}"\n\nSome words arrive when you need them. This one found me on a hard morning, sitting in my therapist''s waiting room.\n\nI didn''t need "you''ve got this." I needed "you''re held here."\n\nThat''s the whole point of Haven & Hold. Words that hold you without demanding anything back.\n\nWhere would you put these words?\n\n{{cta_link}}',
  'behind_quote',
  ARRAY[4, 0],
  true,
  true,
  true
);

-- Template 6: Why Not Motivation (Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Why Not Motivation',
  'reel',
  'brand_story',
  'general',
  E'I could make more money selling "rise and grind" and "good vibes only."\n\nBut I won''t.\n\nBecause when you''re depressed, "choose joy" feels like failure. When you''re anxious, "just breathe" feels like mockery.\n\nSo I make the opposite. Words that hold you without demanding anything back.\n\nThat''s Haven & Hold.\n\n{{cta_link}}',
  'behind_quote',
  ARRAY[4],
  true,
  true,
  true
);

-- Template 7: Sunday Reflection (Carousel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Sunday Reflection',
  'carousel',
  'brand_story',
  'general',
  E'The story behind the {{collection_name}} Collection.\n\nThese aren''t just quotes. They''re permission slips.\n\nPermission to be held. Permission to be whole. Permission to still be becoming.\n\nSwipe to see what each one means →\n\n{{cta_link}}',
  'behind_quote',
  ARRAY[0],
  true,
  true,
  true
);

-- ============================================================================
-- EDUCATIONAL TEMPLATES (20%)
-- Preferred days: Mon (1), Thu (4)
-- ============================================================================

-- Template 8: How To Print Guide (Carousel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'How To Print Guide',
  'carousel',
  'educational',
  'general',
  E'The $3 gallery-quality print hack:\n\n1. Download your files (instant after purchase)\n2. Find your local print shop (Staples, FedEx, Walgreens)\n3. Ask for matte cardstock\n4. Say "print as-is, no cropping"\n\nThat''s it. Gallery-quality print. 5 minutes. Under $5.\n\nSave this for later\n\n{{cta_link}}',
  'educational_value',
  ARRAY[1],
  true,
  true,
  true
);

-- Template 9: Quotes For Situation (Carousel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Quotes For Situation',
  'carousel',
  'educational',
  'general',
  E'5 quotes for the days when everything feels too heavy:\n\n1. "{{quote_text}}"\n2. [Add quote 2]\n3. [Add quote 3]\n4. [Add quote 4]\n5. [Add quote 5]\n\nSave the one that hits different.\n\nAll available as instant downloads →\n\n{{cta_link}}',
  'collection_highlight',
  ARRAY[1, 4],
  true,
  true,
  true
);

-- Template 10: Collection Explainer (Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Collection Explainer',
  'reel',
  'educational',
  'general',
  E'Which do you need: Grounding, Wholeness, or Growth?\n\nGrounding = Stability when everything shakes\nWholeness = Permission to be all of yourself\nGrowth = Space to still be becoming\n\nTake the quiz to find yours →\n\n{{cta_quiz}}',
  'educational_value',
  ARRAY[1, 4],
  true,
  true,
  true
);

-- Template 11: Framing Tips (Carousel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Framing Tips',
  'carousel',
  'educational',
  'general',
  E'How to frame your prints without breaking the bank:\n\nAmazon: $12 for 11x14 black frame\nIKEA: $5 for 8x10 frame\nTarget: $8 for floating frame\n\nTotal for 3 framed prints: Under $50\n\nSave this hack\n\n{{cta_link}}',
  'educational_value',
  ARRAY[1],
  true,
  true,
  true
);

-- ============================================================================
-- COMMUNITY TEMPLATES (20%)
-- Preferred days: Fri (5)
-- ============================================================================

-- Template 12: Customer Feature (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Customer Feature',
  'feed',
  'community',
  'general',
  E'This made my whole week.\n\n{{customer_handle}} created this beautiful corner with "{{quote_text}}" and I''m not crying, you''re crying.\n\nThis is why Haven & Hold exists — to live in spaces like this. To be part of moments like this.\n\nTag us in your space. We want to see where your prints land.\n\n{{cta_link}}',
  'ugc_feature',
  ARRAY[5],
  true,
  true,
  true
);

-- Template 13: UGC Repost (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'UGC Repost',
  'feed',
  'community',
  'general',
  E'When your prints find their perfect homes\n\nThank you {{customer_handle}} for sharing this. Seeing "{{quote_text}}" in your space reminds me why I started this.\n\nYour walls are holding you beautifully.\n\nWant to be featured? Tag @havenandhold in your space.\n\n{{cta_link}}',
  'ugc_feature',
  ARRAY[5],
  true,
  true,
  true
);

-- Template 14: Community Question (Feed)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Community Question',
  'feed',
  'community',
  'general',
  E'Real question:\n\nWhat''s on your bedroom walls right now?\n\n(And is it actually helping or just... there?)\n\nDrop a comment. I''m curious.',
  'lifestyle',
  ARRAY[5],
  true,
  true,
  true
);

-- ============================================================================
-- COLLECTION-SPECIFIC TEMPLATES
-- These are product showcase but tied to specific collections
-- ============================================================================

-- Template 15: Grounding Collection (Feed/Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Grounding Collection',
  'feed',
  'product_showcase',
  'grounding',
  E'{{quote_text}}\n\nFor the days when everything feels unsteady.\nWhen you need something to anchor to.\n\nThis is your reminder: you are held here.\nRight where you are. As you are.\n\nPart of the Grounding Collection — prints for stability and safety.\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 3, 6],
  true,
  true,
  true
);

-- Template 16: Wholeness Collection (Feed/Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Wholeness Collection',
  'feed',
  'product_showcase',
  'wholeness',
  E'{{quote_text}}\n\nYou don''t have to earn rest.\nYou don''t have to prove your worth.\n\nThis print is a permission slip — for your wall, for yourself.\n\nPart of the Wholeness Collection — prints for self-compassion and acceptance.\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 3, 6],
  true,
  true,
  true
);

-- Template 17: Growth Collection (Feed/Reel)
INSERT INTO instagram_templates (
  user_id, name, template_type, content_pillar, collection,
  caption_template, caption_formula, preferred_days,
  is_default, is_system, is_active
) VALUES (
  NULL,
  'Growth Collection',
  'feed',
  'product_showcase',
  'growth',
  E'{{quote_text}}\n\nHealing isn''t linear.\nNeither is becoming.\n\nSome days you bloom. Some days you rest.\nBoth are growth.\n\nPart of the Growth Collection — prints for transformation and becoming.\n\n{{cta_link}}',
  'single_quote',
  ARRAY[2, 3, 6],
  true,
  true,
  true
);

-- ============================================================================
-- Verify: Count templates
-- ============================================================================
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM instagram_templates WHERE is_system = true;
  IF template_count != 17 THEN
    RAISE EXCEPTION 'Expected 17 system templates, found %', template_count;
  END IF;
  RAISE NOTICE 'Successfully seeded 17 Instagram caption templates';
END $$;
