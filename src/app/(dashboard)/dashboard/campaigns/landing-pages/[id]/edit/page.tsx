'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageBuilder } from '@/components/landing-pages/builder/page-builder';
import { ContentBlock } from '@/components/landing-pages/builder/block-types';
import { useToast } from '@/hooks/use-toast';

export default function EditLandingPage() {
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [initialBlocks, setInitialBlocks] = useState<ContentBlock[]>([]);
  const [pageSettings, setPageSettings] = useState({});

  useEffect(() => {
    async function loadPage() {
      try {
        const response = await fetch(`/api/landing-pages/${params.id}`);
        if (!response.ok) throw new Error('Failed to load page');
        const page = await response.json();
        setInitialBlocks(page.content?.blocks || []);
        setPageSettings({
          title: page.title,
          slug: page.slug,
          meta_description: page.meta_description,
        });
      } catch (error) {
        toast('Failed to load landing page', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [params.id, toast]);

  const handleSave = async (blocks: ContentBlock[]) => {
    try {
      const response = await fetch(`/api/landing-pages/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { blocks },
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast('Landing page saved successfully', 'success');
    } catch (error) {
      toast('Failed to save landing page', 'error');
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <PageBuilder
      initialBlocks={initialBlocks}
      onSave={handleSave}
      pageSettings={pageSettings}
      onSettingsChange={setPageSettings}
    />
  );
}
