import { PageContainer } from '@/components/layout/page-container';
import { AnalyticsOverview } from '@/components/pinterest/analytics-overview';
import { TopPinsTable } from '@/components/pinterest/top-pins-table';
import { CopyTemplatePerformance } from '@/components/pinterest/copy-template-performance';
import { PerformanceChart } from '@/components/pinterest/performance-chart';

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
      </div>
    </PageContainer>
  );
}
