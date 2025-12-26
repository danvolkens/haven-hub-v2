import { PageContainer } from '@/components/layout/page-container';
import { AnalyticsOverview } from '@/components/pinterest/analytics-overview';
import { TopPinsTable } from '@/components/pinterest/top-pins-table';
import { CopyTemplatePerformance } from '@/components/pinterest/copy-template-performance';
import { PerformanceChart } from '@/components/pinterest/performance-chart';
import { CreativeHealthSummary } from '@/components/pinterest/creative-health-summary';
import { CreativeHealthChart } from '@/components/pinterest/creative-health-chart';
import { FatiguedContentList } from '@/components/pinterest/fatigued-content-list';

export const metadata = {
  title: 'Pinterest Analytics | Haven Hub',
};

export default function PinterestAnalyticsPage() {
  return (
    <PageContainer
      title="Pinterest Analytics"
      description="Track pin performance and optimize your strategy"
    >
      <div className="space-y-6">
        <AnalyticsOverview />

        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceChart />
          <CopyTemplatePerformance />
        </div>

        <TopPinsTable />

        {/* Creative Health Section */}
        <div className="pt-6 border-t">
          <CreativeHealthSummary />

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <CreativeHealthChart />
            <FatiguedContentList />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
