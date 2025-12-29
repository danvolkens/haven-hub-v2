/**
 * API Route: Story Highlights
 * Manage story highlights and auto-add rules
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHighlights,
  getHighlightWithStories,
  initializeUserHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  addStoryToHighlight,
  removeStoryFromHighlight,
  reorderHighlightStories,
  cleanExpiredStories,
  getHighlightTemplates,
  getEligibleStories,
  type AutoAddRule,
} from '@/lib/instagram/highlights-service';

// GET - Get highlights and related data
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
    const highlightId = searchParams.get('highlightId');

    switch (action) {
      case 'list':
        const highlights = await getHighlights();
        return NextResponse.json(highlights);

      case 'single':
        if (!highlightId) {
          return NextResponse.json(
            { error: 'Highlight ID required' },
            { status: 400 }
          );
        }
        const highlightWithStories = await getHighlightWithStories(highlightId);
        if (!highlightWithStories) {
          return NextResponse.json(
            { error: 'Highlight not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(highlightWithStories);

      case 'templates':
        const templates = await getHighlightTemplates();
        return NextResponse.json(templates);

      case 'eligible-stories':
        if (!highlightId) {
          return NextResponse.json(
            { error: 'Highlight ID required' },
            { status: 400 }
          );
        }
        const limit = parseInt(searchParams.get('limit') || '20');
        const eligible = await getEligibleStories(highlightId, limit);
        return NextResponse.json(eligible);

      default:
        // Return list by default
        const defaultHighlights = await getHighlights();
        return NextResponse.json(defaultHighlights);
    }
  } catch (error) {
    console.error('Highlights GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

// POST - Create or manage highlights
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
      case 'initialize':
        const initialized = await initializeUserHighlights();
        return NextResponse.json({ success: initialized });

      case 'create':
        const { name, slug, description, auto_add_rules, max_stories, expiration_days } = body as {
          name: string;
          slug: string;
          description?: string;
          auto_add_rules?: AutoAddRule[];
          max_stories?: number;
          expiration_days?: number;
        };
        if (!name || !slug) {
          return NextResponse.json(
            { error: 'Name and slug required' },
            { status: 400 }
          );
        }
        const newHighlight = await createHighlight(name, slug, {
          description,
          auto_add_rules,
          max_stories,
          expiration_days,
        });
        if (!newHighlight) {
          return NextResponse.json(
            { error: 'Failed to create highlight' },
            { status: 500 }
          );
        }
        return NextResponse.json(newHighlight);

      case 'add-story':
        const { highlightId: addHighlightId, storyPostId: addStoryId } = body as {
          highlightId: string;
          storyPostId: string;
        };
        if (!addHighlightId || !addStoryId) {
          return NextResponse.json(
            { error: 'Highlight ID and Story Post ID required' },
            { status: 400 }
          );
        }
        const added = await addStoryToHighlight(addHighlightId, addStoryId);
        return NextResponse.json({ success: added });

      case 'remove-story':
        const { highlightId: removeHighlightId, storyPostId: removeStoryId } = body as {
          highlightId: string;
          storyPostId: string;
        };
        if (!removeHighlightId || !removeStoryId) {
          return NextResponse.json(
            { error: 'Highlight ID and Story Post ID required' },
            { status: 400 }
          );
        }
        const removed = await removeStoryFromHighlight(removeHighlightId, removeStoryId);
        return NextResponse.json({ success: removed });

      case 'reorder-stories':
        const { highlightId: reorderHighlightId, orderedIds } = body as {
          highlightId: string;
          orderedIds: string[];
        };
        if (!reorderHighlightId || !orderedIds) {
          return NextResponse.json(
            { error: 'Highlight ID and ordered IDs required' },
            { status: 400 }
          );
        }
        const reordered = await reorderHighlightStories(reorderHighlightId, orderedIds);
        return NextResponse.json({ success: reordered });

      case 'clean-expired':
        const deletedCount = await cleanExpiredStories();
        return NextResponse.json({ deleted: deletedCount });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Highlights POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PATCH - Update highlight
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
    const { highlightId, updates } = body as {
      highlightId: string;
      updates: {
        name?: string;
        description?: string;
        cover_url?: string;
        auto_add_enabled?: boolean;
        auto_add_rules?: AutoAddRule[];
        max_stories?: number;
        expiration_days?: number;
        is_active?: boolean;
        display_order?: number;
      };
    };

    if (!highlightId) {
      return NextResponse.json(
        { error: 'Highlight ID required' },
        { status: 400 }
      );
    }

    const updated = await updateHighlight(highlightId, updates);
    return NextResponse.json({ success: updated });
  } catch (error) {
    console.error('Highlights PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update highlight' },
      { status: 500 }
    );
  }
}

// DELETE - Delete highlight
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
    const highlightId = searchParams.get('highlightId');

    if (!highlightId) {
      return NextResponse.json(
        { error: 'Highlight ID required' },
        { status: 400 }
      );
    }

    const deleted = await deleteHighlight(highlightId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Highlights DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
}
