import { PageContainer } from '@/components/layout/page-container';
import { ContentMixOverview } from '@/components/pinterest/content-mix-overview';
import { ContentMixCharts } from '@/components/pinterest/content-mix-charts';
import { PillarPerformanceTable } from '@/components/pinterest/pillar-performance-table';
import { ContentMixActions } from '@/components/pinterest/content-mix-actions';

export const metadata = {
  title: 'Content Mix | Haven Hub',
  description: 'Optimize your content pillar strategy',
};

export default function ContentMixPage() {
  return (
    <PageContainer
      title="Content Mix Strategy"
      description="Analyze pillar performance and optimize your content distribution"
    >
      <div className="space-y-6">
        {/* Overview stats */}
        <ContentMixOverview />

        {/* Current vs Recommended Mix Charts */}
        <ContentMixCharts />

        {/* Performance table by pillar */}
        <PillarPerformanceTable />

        {/* Action recommendations */}
        <ContentMixActions />
      </div>
    </PageContainer>
  );
}
