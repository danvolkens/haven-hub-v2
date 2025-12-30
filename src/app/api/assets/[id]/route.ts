import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { invalidate, cacheKey, CACHE_PREFIX } from '@/lib/cache/cache-utils';
import { deleteFile } from '@/lib/storage/storage-utils';

/**
 * DELETE /api/assets/[id]
 * Delete an approved asset or mockup by its approval_item ID
 *
 * Query params:
 * - type: 'asset' | 'mockup' (required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['asset', 'mockup'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter' },
        { status: 400 }
      );
    }

    // Get the approval item to find the reference_id
    const { data: approvalItem, error: fetchError } = await (supabase as any)
      .from('approval_items')
      .select('id, reference_id, type')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !approvalItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const referenceId = approvalItem.reference_id;

    // Delete the file from R2 storage and the database record
    if (type === 'asset') {
      // First, find and clean up all mockups created from this asset
      const { data: relatedMockups } = await (supabase as any)
        .from('mockups')
        .select('id, file_key')
        .eq('asset_id', referenceId)
        .eq('user_id', userId);

      if (relatedMockups && relatedMockups.length > 0) {
        const mockupIds = relatedMockups.map((m: { id: string }) => m.id);

        // Delete mockup files from R2
        for (const mockup of relatedMockups) {
          if (mockup.file_key) {
            try {
              await deleteFile(mockup.file_key);
            } catch (err) {
              console.error('Failed to delete mockup file from storage:', err);
            }
          }
        }

        // Delete approval_items for these mockups
        const { error: approvalDeleteError } = await (supabase as any)
          .from('approval_items')
          .delete()
          .in('reference_id', mockupIds)
          .eq('user_id', userId)
          .eq('type', 'mockup');

        if (approvalDeleteError) {
          console.error('Failed to delete mockup approval items:', approvalDeleteError);
        }

        console.log(`Cleaned up ${relatedMockups.length} mockups for asset ${referenceId}`);
      }

      // Now delete the asset file from R2
      const { data: asset } = await (supabase as any)
        .from('assets')
        .select('file_key')
        .eq('id', referenceId)
        .eq('user_id', userId)
        .single();

      if (asset?.file_key) {
        try {
          await deleteFile(asset.file_key);
        } catch (err) {
          console.error('Failed to delete asset file from storage:', err);
        }
      }

      // Delete the asset record (mockup records cascade automatically)
      const { error: deleteError } = await (supabase as any)
        .from('assets')
        .delete()
        .eq('id', referenceId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Failed to delete asset record:', deleteError);
      }
    } else if (type === 'mockup') {
      const { data: mockup } = await (supabase as any)
        .from('mockups')
        .select('file_key')
        .eq('id', referenceId)
        .eq('user_id', userId)
        .single();

      if (mockup?.file_key) {
        try {
          await deleteFile(mockup.file_key);
        } catch (err) {
          console.error('Failed to delete mockup file from storage:', err);
        }
      }

      // Delete the mockup record
      const { error: deleteError } = await (supabase as any)
        .from('mockups')
        .delete()
        .eq('id', referenceId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Failed to delete mockup record:', deleteError);
      }
    }

    // Delete the approval item
    await (supabase as any)
      .from('approval_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    // Invalidate caches
    await invalidate(cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId));

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: `${type}_deleted`,
      p_details: { itemId: id, referenceId },
      p_executed: true,
      p_module: type,
      p_reference_id: referenceId,
      p_reference_table: type === 'asset' ? 'assets' : 'mockups',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
