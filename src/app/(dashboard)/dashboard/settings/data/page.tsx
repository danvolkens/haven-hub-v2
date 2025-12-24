import { Metadata } from 'next';
import { ExportForm } from '@/components/export/export-form';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = {
  title: 'Data Export | Haven Hub',
  description: 'Export your data',
};

export default function DataExportPage() {
  return (
    <PageContainer
      title="Data Export"
      description="Export your data in CSV or JSON format"
    >
      <ExportForm />
    </PageContainer>
  );
}
