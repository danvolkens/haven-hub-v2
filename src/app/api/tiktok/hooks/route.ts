/**
 * API Route: TikTok Video Hooks
 * Prompt I.2: Hook selection and management
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  selectHook,
  getHookPool,
  markHookUsed,
  updateHookPerformance,
  getHooksByType,
  searchHooks,
  getTopPerformingHooks,
  getHookUsageHistory,
  type ContentType,
  type Collection,
  type Platform,
  type HookType,
} from '@/lib/tiktok/hook-selector';

// GET - Get hooks based on criteria
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'select': {
        // Select best hook for given criteria
        const content_type = searchParams.get('content_type') as ContentType;
        const collection = searchParams.get('collection') as Collection | undefined;
        const platform = (searchParams.get('platform') as Platform) || 'tiktok';
        const excludeIds = searchParams.get('exclude')?.split(',') || [];

        if (!content_type) {
          return NextResponse.json(
            { error: 'content_type required' },
            { status: 400 }
          );
        }

        const hook = await selectHook({
          content_type,
          collection,
          platform,
          exclude_hook_ids: excludeIds,
        });

        return NextResponse.json(hook);
      }

      case 'pool': {
        // Get all available hooks for criteria
        const content_type = searchParams.get('content_type') as ContentType;
        const collection = searchParams.get('collection') as Collection | undefined;
        const platform = searchParams.get('platform') as Platform | undefined;

        if (!content_type) {
          return NextResponse.json(
            { error: 'content_type required' },
            { status: 400 }
          );
        }

        const hooks = await getHookPool(content_type, collection, platform);
        return NextResponse.json(hooks);
      }

      case 'by-type': {
        // Get hooks by type
        const hookType = searchParams.get('hook_type') as HookType;
        if (!hookType) {
          return NextResponse.json(
            { error: 'hook_type required' },
            { status: 400 }
          );
        }

        const hooks = await getHooksByType(hookType);
        return NextResponse.json(hooks);
      }

      case 'search': {
        // Search hooks by text
        const query = searchParams.get('q');
        if (!query) {
          return NextResponse.json(
            { error: 'Search query required' },
            { status: 400 }
          );
        }

        const hooks = await searchHooks(query);
        return NextResponse.json(hooks);
      }

      case 'top': {
        // Get top performing hooks
        const limit = parseInt(searchParams.get('limit') || '10');
        const hooks = await getTopPerformingHooks(limit);
        return NextResponse.json(hooks);
      }

      case 'history': {
        // Get usage history for a hook
        const hookId = searchParams.get('hookId');
        if (!hookId) {
          return NextResponse.json(
            { error: 'hookId required' },
            { status: 400 }
          );
        }

        const limit = parseInt(searchParams.get('limit') || '10');
        const history = await getHookUsageHistory(hookId, limit);
        return NextResponse.json(history);
      }

      case 'all':
      default: {
        // Get all system hooks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: hooks } = await (supabase as any)
          .from('video_hooks')
          .select('*')
          .eq('is_active', true)
          .order('hook_type')
          .order('avg_completion_rate', { ascending: false });

        return NextResponse.json(hooks || []);
      }
    }
  } catch (error) {
    console.error('Hooks GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hooks' },
      { status: 500 }
    );
  }
}

// POST - Create hook or log usage
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'mark-used': {
        const { hookId, postId } = body as { hookId: string; postId?: string };
        if (!hookId) {
          return NextResponse.json(
            { error: 'hookId required' },
            { status: 400 }
          );
        }

        const success = await markHookUsed(hookId, postId);
        return NextResponse.json({ success });
      }

      case 'update-performance': {
        const { hookId, completionRate } = body as {
          hookId: string;
          completionRate: number;
        };
        if (!hookId || completionRate === undefined) {
          return NextResponse.json(
            { error: 'hookId and completionRate required' },
            { status: 400 }
          );
        }

        const success = await updateHookPerformance(hookId, completionRate);
        return NextResponse.json({ success });
      }

      case 'create': {
        // Create custom user hook
        const {
          hook_text,
          hook_type,
          content_types = ['quote_reveal'],
          collections = ['any'],
          platforms = ['both'],
        } = body as {
          hook_text: string;
          hook_type: HookType;
          content_types?: ContentType[];
          collections?: Collection[];
          platforms?: Platform[];
        };

        if (!hook_text || !hook_type) {
          return NextResponse.json(
            { error: 'hook_text and hook_type required' },
            { status: 400 }
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: hook, error } = await (supabase as any)
          .from('video_hooks')
          .insert({
            user_id: user.id,
            hook_text,
            hook_type,
            content_types,
            collections,
            platforms,
            is_system: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create hook:', error);
          return NextResponse.json(
            { error: 'Failed to create hook' },
            { status: 500 }
          );
        }

        return NextResponse.json(hook);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Hooks POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PATCH - Update hook
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: 'Hook ID required' }, { status: 400 });
    }

    // Only allow updating own hooks (non-system)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hook, error: fetchError } = await (supabase as any)
      .from('video_hooks')
      .select('user_id, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !hook) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 });
    }

    if (hook.is_system || hook.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot modify system hooks' },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase as any)
      .from('video_hooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update hook:', error);
      return NextResponse.json(
        { error: 'Failed to update hook' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Hooks PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update hook' },
      { status: 500 }
    );
  }
}

// DELETE - Delete hook
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Hook ID required' }, { status: 400 });
    }

    // Only allow deleting own hooks (non-system)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hook, error: fetchError } = await (supabase as any)
      .from('video_hooks')
      .select('user_id, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !hook) {
      return NextResponse.json({ error: 'Hook not found' }, { status: 404 });
    }

    if (hook.is_system || hook.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot delete system hooks' },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('video_hooks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete hook:', error);
      return NextResponse.json(
        { error: 'Failed to delete hook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hooks DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete hook' },
      { status: 500 }
    );
  }
}
