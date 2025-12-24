import { createClient } from '@/lib/supabase/server';
import { LinkInBioConfig, LinkInBioLink } from '@/types/link-in-bio';

export async function getOrCreateConfig(userId: string): Promise<LinkInBioConfig> {
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from('link_in_bio_config')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing;

  const { data: config, error } = await (supabase as any)
    .from('link_in_bio_config')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) throw new Error(`Failed to create config: ${error.message}`);
  return config;
}

export async function updateConfig(
  userId: string,
  updates: Partial<LinkInBioConfig>
): Promise<LinkInBioConfig> {
  const supabase = await createClient();

  const { data: config, error } = await (supabase as any)
    .from('link_in_bio_config')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update config: ${error.message}`);
  return config;
}

export async function getLinks(userId: string): Promise<LinkInBioLink[]> {
  const supabase = await createClient();

  const { data: links } = await (supabase as any)
    .from('link_in_bio_links')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  return links || [];
}

export async function createLink(
  userId: string,
  link: Partial<LinkInBioLink>
): Promise<LinkInBioLink> {
  const supabase = await createClient();

  // Get max position
  const { data: maxLink } = await (supabase as any)
    .from('link_in_bio_links')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxLink?.position ?? -1) + 1;

  const { data: newLink, error } = await (supabase as any)
    .from('link_in_bio_links')
    .insert({
      user_id: userId,
      url: link.url,
      title: link.title,
      description: link.description,
      icon: link.icon,
      position,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create link: ${error.message}`);
  return newLink;
}

export async function updateLinkPositions(
  userId: string,
  linkIds: string[]
): Promise<void> {
  const supabase = await createClient();

  for (let i = 0; i < linkIds.length; i++) {
    await (supabase as any)
      .from('link_in_bio_links')
      .update({ position: i })
      .eq('id', linkIds[i])
      .eq('user_id', userId);
  }
}

export async function trackClick(
  linkId: string,
  referrer?: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient();

  // Insert click record
  await (supabase as any).from('link_clicks').insert({
    link_id: linkId,
    referrer,
    user_agent: userAgent,
  });

  // Increment click count
  await (supabase as any).rpc('increment_link_clicks', { link_id: linkId });
}

export async function trackPageView(userId: string): Promise<void> {
  const supabase = await createClient();

  await (supabase as any).rpc('increment_lib_views', { p_user_id: userId });
}
