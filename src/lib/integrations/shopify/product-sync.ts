import { getAdminClient } from '@/lib/supabase/admin';
import type { ShopifyProduct, ShopifyVariant } from './client';

// =============================================================================
// Product Sync from Shopify (webhook handler)
// =============================================================================

export async function syncProductFromShopify(
  userId: string,
  shopifyProduct: ShopifyProduct
): Promise<void> {
  const adminClient = getAdminClient();

  // Find our product by Shopify product ID
  const { data: product, error: findError } = await (adminClient as any)
    .from('products')
    .select('id, variants')
    .eq('user_id', userId)
    .eq('shopify_product_id', String(shopifyProduct.id))
    .single();

  if (findError || !product) {
    // Product doesn't exist in our system - could be created directly in Shopify
    // For now, we only sync products we've created
    console.log(`Product ${shopifyProduct.id} not found in Haven Hub, skipping sync`);
    return;
  }

  // Update product with latest Shopify data
  const { error: updateError } = await (adminClient as any)
    .from('products')
    .update({
      title: shopifyProduct.title,
      status: shopifyProduct.status === 'active' ? 'published' : 'draft',
      shopify_status: shopifyProduct.status,
      price: shopifyProduct.variants[0]?.price
        ? parseFloat(shopifyProduct.variants[0].price)
        : null,
      inventory_quantity: calculateTotalInventory(shopifyProduct.variants),
      variants: shopifyProduct.variants.map((v) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
      })),
      updated_at: new Date().toISOString(),
    })
    .eq('id', product.id);

  if (updateError) {
    console.error('Failed to sync product from Shopify:', updateError);
    throw new Error(`Failed to sync product: ${updateError.message}`);
  }

  // Log the sync
  await (adminClient as any).rpc('log_activity', {
    p_user_id: userId,
    p_action_type: 'product_synced',
    p_details: {
      shopify_product_id: shopifyProduct.id,
      title: shopifyProduct.title,
      status: shopifyProduct.status,
    },
    p_executed: true,
    p_module: 'shopify',
    p_reference_id: product.id,
    p_reference_table: 'products',
  });
}

// =============================================================================
// Product Import from Shopify (pull all products)
// =============================================================================

export async function importProductsFromShopify(
  userId: string,
  accessToken: string,
  shopDomain: string
): Promise<{ imported: number; updated: number; errors: string[] }> {
  const adminClient = getAdminClient();
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let sinceId: string | undefined;

  try {
    // Paginate through all products
    while (true) {
      const url = new URL(`https://${shopDomain}/admin/api/2024-01/products.json`);
      url.searchParams.set('limit', '250');
      if (sinceId) {
        url.searchParams.set('since_id', sinceId);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const { products } = await response.json();

      if (!products || products.length === 0) {
        break;
      }

      // Process each product
      for (const product of products as ShopifyProduct[]) {
        try {
          const result = await upsertProductFromShopify(userId, product);
          if (result.created) {
            imported++;
          } else {
            updated++;
          }
        } catch (error) {
          errors.push(
            `Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Check for next page
      if (products.length < 250) {
        break;
      }

      sinceId = String(products[products.length - 1].id);

      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Log activity
    await (adminClient as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'products_imported',
      p_details: { imported, updated, errors: errors.length },
      p_executed: true,
      p_module: 'shopify',
    });

    return { imported, updated, errors };
  } catch (error) {
    console.error('Product import error:', error);
    return {
      imported,
      updated,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function upsertProductFromShopify(
  userId: string,
  shopifyProduct: ShopifyProduct
): Promise<{ created: boolean }> {
  const adminClient = getAdminClient();

  // Check if product exists
  const { data: existing } = await (adminClient as any)
    .from('products')
    .select('id')
    .eq('user_id', userId)
    .eq('shopify_product_id', String(shopifyProduct.id))
    .single();

  const productData = {
    user_id: userId,
    shopify_product_id: String(shopifyProduct.id),
    shopify_handle: shopifyProduct.handle,
    title: shopifyProduct.title,
    description: shopifyProduct.body_html || '',
    status: shopifyProduct.status === 'active' ? 'active' : 'draft',
    tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map((t) => t.trim()) : [],
    vendor: shopifyProduct.vendor,
    product_type: shopifyProduct.product_type,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let productId: string;

  if (existing) {
    await (adminClient as any)
      .from('products')
      .update(productData)
      .eq('id', existing.id);
    productId = existing.id;
  } else {
    const { data: newProduct, error } = await (adminClient as any)
      .from('products')
      .insert({
        ...productData,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !newProduct) {
      throw new Error(`Failed to create product: ${error?.message}`);
    }
    productId = newProduct.id;
  }

  // Sync variants - delete existing and re-insert
  await (adminClient as any)
    .from('product_variants')
    .delete()
    .eq('product_id', productId);

  if (shopifyProduct.variants?.length > 0) {
    const variantData = shopifyProduct.variants.map((v, index) => ({
      product_id: productId,
      user_id: userId,
      shopify_variant_id: String(v.id),
      title: v.title || 'Default',
      sku: v.sku,
      size: v.option1 || 'Default', // Assuming first option is size
      frame_style: v.option2 || null,
      price: parseFloat(v.price) || 0,
      compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
      inventory_quantity: v.inventory_quantity || 0,
      is_active: true,
    }));

    await (adminClient as any).from('product_variants').insert(variantData);
  }

  // Sync images - delete existing and re-insert
  await (adminClient as any)
    .from('product_images')
    .delete()
    .eq('product_id', productId);

  if (shopifyProduct.images?.length > 0) {
    const imageData = shopifyProduct.images.map((img) => ({
      product_id: productId,
      user_id: userId,
      shopify_image_id: String(img.id),
      position: img.position || 0,
      src: img.src,
      alt: img.alt || '',
      source_type: 'upload',
    }));

    await (adminClient as any).from('product_images').insert(imageData);
  }

  return { created: !existing };
}

function calculateTotalInventory(variants: ShopifyVariant[]): number {
  return variants.reduce((total, v) => total + (v.inventory_quantity || 0), 0);
}
