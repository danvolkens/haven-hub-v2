import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { uploadImage, deleteFile } from '@/lib/storage/storage-utils';
import { STORAGE_PATHS } from '@/lib/storage/r2-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    console.log('Quote image upload - Quote ID:', id, 'User ID:', userId);

    // Verify quote belongs to user
    // Filter by both id and user_id to work with RLS
    const { data: quote, error: quoteError } = await (supabase as any)
      .from('quotes')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (quoteError) {
      console.error('Quote lookup error:', {
        quoteId: id,
        userId,
        error: quoteError,
        code: quoteError.code,
        message: quoteError.message,
        details: quoteError.details,
        hint: quoteError.hint,
      });
      return NextResponse.json({
        error: 'Database error during quote lookup',
        details: quoteError.message,
        code: quoteError.code,
        quoteId: id,
      }, { status: 500 });
    }

    if (!quote) {
      console.error('Quote not found:', { quoteId: id, userId });
      return NextResponse.json({
        error: 'Quote not found',
        quoteId: id,
        hint: 'Quote may not exist or may belong to a different user'
      }, { status: 404 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Check if quote has an existing master image to delete
    // (need to fetch full quote to get master_image_key if it exists)
    const { data: fullQuote } = await (supabase as any)
      .from('quotes')
      .select('master_image_key')
      .eq('id', id)
      .single();

    // Delete old image if exists
    if (fullQuote?.master_image_key) {
      try {
        await deleteFile(fullQuote.master_image_key);
      } catch (err) {
        console.error('Failed to delete old master image:', err);
      }
    }

    // Upload new image
    const { url, key } = await uploadImage(
      STORAGE_PATHS.QUOTES,
      userId,
      file,
      {
        prefix: `master/${id}`,
        metadata: {
          quoteId: id,
          type: 'master_image',
        },
      }
    );

    // Update quote with new image
    const { data: updated, error: updateError } = await (supabase as any)
      .from('quotes')
      .update({
        master_image_url: url,
        master_image_key: key,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Quote update error:', {
        quoteId: id,
        userId,
        error: updateError,
      });
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      master_image_url: url,
      master_image_key: key,
      quote: updated,
    });
  } catch (error) {
    console.error('Quote image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // Get quote with current image
    const { data: quote, error: quoteError } = await (supabase as any)
      .from('quotes')
      .select('id, master_image_key')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Delete image from storage
    if (quote.master_image_key) {
      try {
        await deleteFile(quote.master_image_key);
      } catch (err) {
        console.error('Failed to delete master image:', err);
      }
    }

    // Clear image fields from quote
    const { error: updateError } = await (supabase as any)
      .from('quotes')
      .update({
        master_image_url: null,
        master_image_key: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Quote image delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    );
  }
}
