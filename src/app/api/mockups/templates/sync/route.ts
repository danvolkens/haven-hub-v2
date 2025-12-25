import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getApiUserId } from '@/lib/auth/session';
import { DynamicMockupsClient } from '@/lib/integrations/dynamic-mockups/client';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    // Get API key from vault or fall back to env
    let credential: string | null = null;

    try {
      const { data } = await (adminClient as any).rpc('get_credential', {
        p_user_id: userId,
        p_provider: 'dynamic_mockups',
        p_credential_type: 'api_key',
      });
      credential = data;
    } catch (err) {
      console.log('Vault not available, checking env:', err);
    }

    // Fall back to env variable for local development
    if (!credential) {
      credential = process.env.DYNAMIC_MOCKUPS_API_KEY || null;
    }

    if (!credential) {
      return NextResponse.json(
        { error: 'Dynamic Mockups not connected. Please add DYNAMIC_MOCKUPS_API_KEY to your environment or connect in settings.' },
        { status: 400 }
      );
    }

    // Initialize client with user's API key
    const client = new DynamicMockupsClient(credential);

    let allMockups: any[] = [];
    let collectionsFound: any[] = [];

    // First try to fetch collections
    try {
      const { collections } = await client.listCollections({ include_all_catalogs: true });
      collectionsFound = collections || [];
      console.log(`Found ${collectionsFound.length} collections:`, collectionsFound.map(c => c.name));

      // Fetch mockups from each collection
      for (const collection of collectionsFound) {
        try {
          const collectionDetail = await client.getCollectionMockups(collection.id);
          console.log(`Collection ${collection.name}: ${collectionDetail.templates?.length || 0} mockups`);
          if (collectionDetail.templates) {
            allMockups = allMockups.concat(
              collectionDetail.templates.map((t) => ({
                ...t,
                collection_id: collection.id,
                collection_name: collection.name,
              }))
            );
          }
        } catch (err) {
          console.error(`Error fetching collection ${collection.id}:`, err);
        }
      }
    } catch (error) {
      console.log('Collections API error, trying mockups directly:', error);
    }

    // If no mockups from collections, try direct mockups endpoint
    if (allMockups.length === 0) {
      try {
        const response = await client.listMockups({ include_all_catalogs: true });
        allMockups = response.data || [];
        console.log(`Direct mockups fetch: ${allMockups.length} mockups`);
      } catch (error) {
        console.error('Error fetching mockups:', error);
      }
    }

    if (allMockups.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        collections: collectionsFound.length,
        message: collectionsFound.length > 0
          ? `Found ${collectionsFound.length} collections but no mockups. Mockups may need to be added to your collections.`
          : 'No mockups found in your Dynamic Mockups account.',
      });
    }

    // Upsert mockups to database
    const mockupsForDb = allMockups.map((mockup) => ({
      user_id: userId,
      scene_key: `dm_${mockup.uuid}`,
      name: mockup.name,
      description: mockup.collection_name || null,
      dm_template_id: mockup.uuid,
      dm_template_url: mockup.thumbnail,
      preview_url: mockup.thumbnail,
      config: {
        smart_objects: mockup.smart_objects || [],
        text_layers: mockup.text_layers || [],
        original_name: mockup.name,
        collection_id: mockup.collection_id,
        collection_name: mockup.collection_name,
        thumbnails: mockup.thumbnails || [],
      },
      is_active: true,
      is_system: false,
    }));

    // Insert/update mockups - use admin client to bypass RLS
    let synced = 0;
    for (const mockup of mockupsForDb) {
      try {
        // Check if exists first
        const { data: existing } = await (adminClient as any)
          .from('mockup_scene_templates')
          .select('id')
          .eq('user_id', userId)
          .eq('dm_template_id', mockup.dm_template_id)
          .single();

        if (existing) {
          // Update existing
          const { error } = await (adminClient as any)
            .from('mockup_scene_templates')
            .update({
              name: mockup.name,
              description: mockup.description,
              dm_template_url: mockup.dm_template_url,
              preview_url: mockup.preview_url,
              config: mockup.config,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (!error) synced++;
        } else {
          // Insert new
          const { error } = await (adminClient as any)
            .from('mockup_scene_templates')
            .insert(mockup);
          if (!error) synced++;
          else console.error('Insert error:', error);
        }
      } catch (err) {
        console.error('Error upserting mockup:', err);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      collections: collectionsFound.length,
      mockups: allMockups.slice(0, 20).map((m) => ({
        uuid: m.uuid,
        name: m.name,
        thumbnail: m.thumbnail,
        collection: m.collection_name,
      })),
      message: `Successfully synced ${synced} mockups${collectionsFound.length > 0 ? ` from ${collectionsFound.length} collections` : ''}.`,
    });
  } catch (error) {
    console.error('Template sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync templates' },
      { status: 500 }
    );
  }
}

// GET - List synced templates
export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data: templates, error } = await (supabase as any)
      .from('mockup_scene_templates')
      .select('*')
      .or(`is_system.eq.true,user_id.eq.${userId}`)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
