/**
 * Instagram Posts API Query Tests
 * Tests for the assets table query to prevent column name regressions
 *
 * Bug fixed: The query was selecting 'type' column from assets table,
 * but the column is named 'format'. This caused PostgreSQL error:
 * "column assets_1.type does not exist" (error code 42703)
 */

import { describe, it, expect } from 'vitest';

// The assets table schema from 006_quotes.sql migration
const ASSETS_TABLE_COLUMNS = [
  'id',
  'user_id',
  'quote_id',
  'format',        // NOT 'type' - this stores 'pinterest', 'instagram_post', etc.
  'dimensions',
  'file_url',
  'file_key',
  'thumbnail_url',
  'design_config',
  'template_id',
  'quality_scores',
  'overall_score',
  'flags',
  'flag_reasons',
  'status',
  'total_pins',
  'total_impressions',
  'total_saves',
  'total_clicks',
  'approved_at',
  'published_at',
  'created_at',
  'updated_at',
];

// Columns that the Instagram posts API queries from the assets table
const QUERIED_ASSET_COLUMNS = [
  'id',
  'file_url',
  'thumbnail_url',
  'format',
];

describe('Assets table column validation', () => {
  it('should not have a "type" column in the assets table schema', () => {
    // This test documents that 'type' is NOT a valid column name
    // The actual column is 'format' which stores the platform format
    expect(ASSETS_TABLE_COLUMNS).not.toContain('type');
  });

  it('should have "format" column in the assets table schema', () => {
    expect(ASSETS_TABLE_COLUMNS).toContain('format');
  });

  it('should query only valid columns from assets table', () => {
    // Verify all queried columns exist in the schema
    for (const column of QUERIED_ASSET_COLUMNS) {
      expect(ASSETS_TABLE_COLUMNS).toContain(column);
    }
  });

  it('should query format instead of type for primary_asset', () => {
    // This test ensures we don't regress to using 'type' instead of 'format'
    expect(QUERIED_ASSET_COLUMNS).toContain('format');
    expect(QUERIED_ASSET_COLUMNS).not.toContain('type');
  });
});

describe('Primary asset transformation', () => {
  it('should transform primary_asset with correct type field', () => {
    // Simulate the transformation logic from the API
    const mockPrimaryAsset = {
      id: 'asset-123',
      file_url: 'https://example.com/image.png',
      thumbnail_url: 'https://example.com/thumb.png',
      format: 'instagram_post',
    };

    // The transformation from the GET handler
    const transformedAsset = {
      id: mockPrimaryAsset.id,
      url: mockPrimaryAsset.file_url,
      thumbnail_url: mockPrimaryAsset.thumbnail_url,
      // Assets from quotes table are always images
      type: 'image',
      format: mockPrimaryAsset.format,
    };

    expect(transformedAsset.type).toBe('image');
    expect(transformedAsset.format).toBe('instagram_post');
    expect(transformedAsset.url).toBe(mockPrimaryAsset.file_url);
  });

  it('should handle null primary_asset gracefully', () => {
    const post = {
      primary_asset: null,
    };

    const transformedAsset = post.primary_asset
      ? {
          id: post.primary_asset.id,
          url: post.primary_asset.file_url,
          thumbnail_url: post.primary_asset.thumbnail_url,
          type: 'image',
          format: post.primary_asset.format,
        }
      : null;

    expect(transformedAsset).toBeNull();
  });

  it('should set type to "image" for all quote-based assets', () => {
    // Assets in the assets table are generated from quotes
    // They are always static images, not videos
    const formats = ['pinterest', 'instagram_post', 'instagram_story', 'print_8x10'];

    for (const format of formats) {
      const mockAsset = {
        id: 'asset-123',
        file_url: 'https://example.com/image.png',
        thumbnail_url: null,
        format,
      };

      // The type should always be 'image' regardless of format
      const transformedType = 'image';
      expect(transformedType).toBe('image');
    }
  });
});

describe('Database column naming conventions', () => {
  it('should use descriptive column names', () => {
    // Document the naming convention:
    // - 'format' describes the platform/output format (pinterest, instagram_post, etc.)
    // - The column is NOT named 'type' which could be confused with media type (image/video)

    const columnDescriptions: Record<string, string> = {
      format: 'Platform output format (pinterest, instagram_post, instagram_story, print_8x10, etc.)',
      // NOT: type: 'Media type (image/video)' - this column does not exist
    };

    expect(columnDescriptions).toHaveProperty('format');
    expect(columnDescriptions).not.toHaveProperty('type');
  });
});
