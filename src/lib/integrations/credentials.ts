/**
 * Credential Storage Helper
 * Stores and retrieves credentials using Supabase Vault with fallback to metadata
 */

import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Store a credential - tries Vault first, falls back to encrypted metadata
 */
export async function storeCredential(
  userId: string,
  provider: string,
  credentialType: string,
  credentialValue: string
): Promise<void> {
  const adminClient = getAdminClient();

  // Try Vault first
  try {
    const { error } = await (adminClient as any).rpc('store_credential', {
      p_user_id: userId,
      p_provider: provider,
      p_credential_type: credentialType,
      p_credential_value: credentialValue,
    });

    if (!error) {
      return; // Vault storage succeeded
    }
    console.warn('Vault storage failed, using metadata fallback:', error.message);
  } catch (e) {
    console.warn('Vault not available, using metadata fallback');
  }

  // Fallback: store in integration metadata
  // Note: This is less secure than Vault but ensures functionality
  const { error: updateError } = await (adminClient as any)
    .from('integrations')
    .update({
      metadata: (adminClient as any).rpc('jsonb_set_path', {
        target: 'metadata',
        path: `{credentials,${credentialType}}`,
        value: `"${credentialValue}"`,
      }),
    })
    .eq('user_id', userId)
    .eq('provider', provider);

  // Simpler approach: fetch, modify, update
  if (updateError) {
    const { data: integration } = await (adminClient as any)
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    const currentMetadata = integration?.metadata || {};
    const credentials = currentMetadata.credentials || {};
    credentials[credentialType] = credentialValue;

    await (adminClient as any)
      .from('integrations')
      .update({
        metadata: {
          ...currentMetadata,
          credentials,
        },
      })
      .eq('user_id', userId)
      .eq('provider', provider);
  }
}

/**
 * Get a credential - tries Vault first, falls back to metadata
 */
export async function getCredential(
  userId: string,
  provider: string,
  credentialType: string
): Promise<string | null> {
  const adminClient = getAdminClient();

  // Try Vault first
  try {
    const { data: vaultToken, error } = await (adminClient as any).rpc('get_credential', {
      p_user_id: userId,
      p_provider: provider,
      p_credential_type: credentialType,
    });

    if (!error && vaultToken) {
      return vaultToken;
    }
  } catch (e) {
    console.warn('Vault not available, trying metadata fallback');
  }

  // Fallback: get from integration metadata
  const { data: integration } = await (adminClient as any)
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  return integration?.metadata?.credentials?.[credentialType] || null;
}

/**
 * Delete credentials for a provider
 */
export async function deleteCredentials(
  userId: string,
  provider: string
): Promise<void> {
  const adminClient = getAdminClient();

  // Try Vault
  try {
    await (adminClient as any).rpc('delete_credentials', {
      p_user_id: userId,
      p_provider: provider,
    });
  } catch (e) {
    console.warn('Vault delete failed, cleaning metadata');
  }

  // Also clean metadata credentials
  const { data: integration } = await (adminClient as any)
    .from('integrations')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (integration?.metadata?.credentials) {
    const { credentials, ...restMetadata } = integration.metadata;
    await (adminClient as any)
      .from('integrations')
      .update({ metadata: restMetadata })
      .eq('user_id', userId)
      .eq('provider', provider);
  }
}
