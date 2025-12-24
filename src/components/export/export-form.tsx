'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { useExport } from '@/hooks/use-export';
import { EXPORT_CONFIGS, ExportType, ExportFormat } from '@/lib/export/export-config';
import { Download, FileSpreadsheet, FileJson, Calendar } from 'lucide-react';

export function ExportForm() {
  const { isExporting, progress, error, triggerExport } = useExport();

  const [exportType, setExportType] = useState<ExportType>('leads');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const config = EXPORT_CONFIGS[exportType];

  // Initialize selected fields when type changes
  const handleTypeChange = (type: ExportType) => {
    setExportType(type);
    const newConfig = EXPORT_CONFIGS[type];
    setSelectedFields(newConfig.fields.filter(f => f.default).map(f => f.key));
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(config.fields.map(f => f.key));
  };

  const selectDefaultFields = () => {
    setSelectedFields(config.fields.filter(f => f.default).map(f => f.key));
  };

  const handleExport = async () => {
    await triggerExport({
      type: exportType,
      format,
      fields: selectedFields.length > 0
        ? selectedFields
        : config.fields.filter(f => f.default).map(f => f.key),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  // Initialize default fields on mount
  useEffect(() => {
    handleTypeChange('leads');
  }, []);

  return (
    <div className="space-y-6">
      {/* Export Type Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">1. Select Data Type</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.values(EXPORT_CONFIGS).map((cfg) => (
            <button
              key={cfg.type}
              onClick={() => handleTypeChange(cfg.type)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                exportType === cfg.type
                  ? 'border-sage bg-sage/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{cfg.label}</div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                {cfg.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Format & Date Range */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">2. Format & Date Range</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Format */}
          <div>
            <Label className="mb-2 block">Export Format</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  format === 'csv'
                    ? 'border-sage bg-sage/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className="h-5 w-5" />
                CSV
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  format === 'json'
                    ? 'border-sage bg-sage/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileJson className="h-5 w-5" />
                JSON
              </button>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="startDate" className="mb-2 block">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="endDate" className="mb-2 block">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Field Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">3. Select Fields</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllFields}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectDefaultFields}>
              Default Only
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {config.fields.map((field) => (
            <label
              key={field.key}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFields.includes(field.key)
                  ? 'border-sage bg-sage/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Checkbox
                checked={selectedFields.includes(field.key)}
                onChange={() => toggleField(field.key)}
              />
              <span className="text-sm">
                {field.label}
                {field.default && (
                  <span className="text-xs text-[var(--color-text-secondary)] ml-1">(default)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Export Button & Progress */}
      <Card className="p-6">
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {isExporting && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Exporting...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--color-text-secondary)]">
            {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            {' • '}
            Max {config.maxRecords.toLocaleString()} records
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting || selectedFields.length === 0}
            className="min-w-[150px]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
