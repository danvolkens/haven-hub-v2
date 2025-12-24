import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LinkInBioConfig, LinkInBioLink } from '@/types/link-in-bio';
import { Link as LinkIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageData(slug: string) {
  const supabase = await createClient();

  const { data: config } = await (supabase as any)
    .from('link_in_bio_config')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!config) return null;

  const { data: links } = await (supabase as any)
    .from('link_in_bio_links')
    .select('*')
    .eq('user_id', config.user_id)
    .eq('is_active', true)
    .order('position', { ascending: true });

  return { config: config as LinkInBioConfig, links: (links || []) as LinkInBioLink[] };
}

export default async function LinkInBioPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) {
    notFound();
  }

  const { config, links } = data;

  const buttonStyles: Record<string, string> = {
    rounded: 'rounded-lg',
    pill: 'rounded-full',
    square: 'rounded-none',
    outline: 'rounded-lg border-2 bg-transparent',
  };

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{
        backgroundColor: config.background_color,
        color: config.text_color,
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Profile */}
        <div className="text-center mb-8">
          {config.avatar_url && (
            <img
              src={config.avatar_url}
              alt={config.title}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <h1 className="text-2xl font-bold mb-2">{config.title}</h1>
          {config.bio && (
            <p className="text-sm opacity-80">{config.bio}</p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {links.map((link) => {
            const IconComponent = link.icon
              ? (Icons as any)[link.icon] || LinkIcon
              : LinkIcon;

            return (
              <a
                key={link.id}
                href={`/api/links/click/${link.id}?url=${encodeURIComponent(link.url)}`}
                className={`block w-full p-4 text-center font-medium transition-transform hover:scale-[1.02] ${
                  buttonStyles[config.button_style]
                } ${link.is_featured ? 'ring-2 ring-offset-2' : ''}`}
                style={{
                  backgroundColor: config.button_style === 'outline'
                    ? 'transparent'
                    : config.accent_color,
                  color: config.button_style === 'outline'
                    ? config.accent_color
                    : '#ffffff',
                  borderColor: config.accent_color,
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <IconComponent className="h-5 w-5" />
                  {link.title}
                </span>
              </a>
            );
          })}
        </div>

        {/* Powered by */}
        <div className="text-center mt-12 text-sm opacity-50">
          Powered by Haven Hub
        </div>
      </div>
    </div>
  );
}
