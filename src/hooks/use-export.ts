'use client';

import { useState } from 'react';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';

interface ExportState {
  isExporting: boolean;
  progress: number;
  error: string | null;
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null,
  });

  const triggerExport = async (options: {
    type: ExportType;
    format: ExportFormat;
    fields: string[];
    startDate?: Date;
    endDate?: Date;
  }) => {
    setState({ isExporting: true, progress: 0, error: null });

    try {
      const params = new URLSearchParams({
        type: options.type,
        format: options.format,
        fields: options.fields.join(','),
      });

      if (options.startDate) {
        params.set('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.set('endDate', options.endDate.toISOString());
      }

      setState(s => ({ ...s, progress: 30 }));

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      setState(s => ({ ...s, progress: 80 }));

      // Get filename from header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export-${Date.now()}.${options.format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState({ isExporting: false, progress: 100, error: null });

      // Get record count from header
      const recordCount = parseInt(response.headers.get('X-Record-Count') || '0', 10);
      return { success: true, recordCount };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setState({ isExporting: false, progress: 0, error: message });
      return { success: false, error: message };
    }
  };

  return {
    ...state,
    triggerExport,
    configs: EXPORT_CONFIGS,
  };
}
