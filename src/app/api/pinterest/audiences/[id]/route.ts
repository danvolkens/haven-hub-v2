import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;
    const supabase = getAdminClient();

    // Verify ownership
    const { data: audience } = await (supabase as any)
      .from('audience_exports')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    // Delete audience
    const { error } = await (supabase as any)
      .from('audience_exports')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting audience:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete audience' },
      { status: 500 }
    );
  }
}
