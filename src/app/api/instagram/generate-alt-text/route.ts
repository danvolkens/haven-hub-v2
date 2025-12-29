import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Helper to fetch image and convert to base64
async function imageUrlToBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const mediaType = contentType.split(';')[0].trim();

  return { base64, mediaType };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { asset_id, image_url, caption } = body;

    // Get image URL from asset if asset_id provided
    let imageToAnalyze = image_url;
    if (asset_id && !imageToAnalyze) {
      const { data: asset } = await (supabase as any)
        .from('assets')
        .select('file_url, thumbnail_url')
        .eq('id', asset_id)
        .single();

      if (asset) {
        imageToAnalyze = asset.thumbnail_url || asset.file_url;
      }
    }

    if (!imageToAnalyze) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Fetch image and convert to base64 (Anthropic requires base64)
    const { base64, mediaType } = await imageUrlToBase64(imageToAnalyze);

    // Use Anthropic to generate alt text
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Generate Instagram alt text for this image. The alt text should:
- Be descriptive and accessible for screen readers
- Be under 500 characters
- Describe the visual elements, colors, composition, and mood
- Focus on what's most important in the image
${caption ? `- Consider this caption context: "${caption}"` : ''}

Return ONLY the alt text, no explanations or quotes.`,
            },
          ],
        },
      ],
    });

    const altText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : '';

    return NextResponse.json({ alt_text: altText });
  } catch (error) {
    console.error('Error generating alt text:', error);
    return NextResponse.json(
      { error: 'Failed to generate alt text' },
      { status: 500 }
    );
  }
}
