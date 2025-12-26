import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

interface QuoteImport {
  text: string;
  attribution?: string;
  collection: string;
  mood: string;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { quotes } = await request.json() as { quotes: QuoteImport[] };

    if (!quotes || !Array.isArray(quotes) || quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes provided' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const quote of quotes) {
      try {
        const { error } = await (supabase as any)
          .from('quotes')
          .insert({
            user_id: userId,
            text: quote.text,
            attribution: quote.attribution || null,
            collection: quote.collection,
            mood: quote.mood,
            tags: quote.tags || [],
            status: 'active',
          });

        if (error) {
          failed++;
          errors.push(`"${quote.text.substring(0, 30)}...": ${error.message}`);
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push(`"${quote.text.substring(0, 30)}...": Unknown error`);
      }
    }

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error('Quote import error:', error);
    return NextResponse.json(
      { error: 'Failed to import quotes' },
      { status: 500 }
    );
  }
}
