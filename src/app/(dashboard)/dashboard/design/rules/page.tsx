import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/layout/page-container';
import { DesignRulesEditor } from '@/components/design/design-rules-editor';

export default async function DesignRulesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <PageContainer
      title="Design Rules"
      description="Configure default styling for generated assets"
    >
      <DesignRulesEditor userId={user.id} />
    </PageContainer>
  );
}
