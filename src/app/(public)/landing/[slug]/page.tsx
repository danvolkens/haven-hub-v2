import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LandingPageTemplate } from './template';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getLandingPage(slug: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  // Increment view count
  await (supabase as any)
    .from('landing_pages')
    .update({ views: (data.views || 0) + 1 })
    .eq('id', data.id);

  return data;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: page.meta_title || page.headline,
    description: page.meta_description || page.subheadline,
  };
}

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getLandingPage(slug);

  if (!page) {
    notFound();
  }

  return <LandingPageTemplate page={page} />;
}
