import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getApiUserId } from '@/lib/auth/session';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateTemplateRequest {
  style: string; // e.g., "product-focused", "emotional", "minimalist"
  description?: string; // Additional context
  collection?: 'grounding' | 'wholeness' | 'growth' | null;
  mood?: string | null;
}

interface GeneratedTemplate {
  name: string;
  title_template: string;
  description_template: string;
}

export async function POST(request: NextRequest) {
  try {
    await getApiUserId();

    const { style, description, collection, mood }: GenerateTemplateRequest = await request.json();

    if (!style) {
      return NextResponse.json({ error: 'Style is required' }, { status: 400 });
    }

    const prompt = `You are creating Pinterest pin copy templates for Haven & Hold, a wellness brand selling quote-based wall art products. Templates use variables that get replaced with actual values when creating pins.

Available variables:
- {quote} - The quote text itself
- {collection} - Collection name (Grounding, Wholeness, Growth)
- {mood} - Mood descriptor (calm, warm, inspiring, etc.)
- {product_link} - URL to the product
- {shop_name} - "Haven & Hold"

The brand has 3 collections:
- Grounding: stability, nature, calm, presence, earth connection
- Wholeness: balance, harmony, self-acceptance, inner peace
- Growth: transformation, learning, ambition, self-improvement

Create 3 Pinterest pin copy templates with style: "${style}"
${description ? `Additional context: ${description}` : ''}
${collection ? `Target collection: ${collection}` : ''}
${mood ? `Target mood: ${mood}` : ''}

Requirements:
- Title should be concise (under 100 chars) and include {quote} or {shop_name}
- Description should be 2-4 sentences, engaging, and include a call-to-action
- Use variables naturally - don't force all variables into every template
- Pinterest SEO: descriptions should have relevant keywords for home decor, wall art, quotes
- Vary the styles: one product-focused, one emotional/story, one minimal

Return ONLY valid JSON in this exact format:
{
  "templates": [
    {
      "name": "Descriptive template name",
      "title_template": "Template with {variables}",
      "description_template": "Longer template with {variables} and call to action."
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const templates: GeneratedTemplate[] = parsed.templates;

    if (!Array.isArray(templates) || templates.length === 0) {
      throw new Error('Invalid templates format');
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate templates' },
      { status: 500 }
    );
  }
}
