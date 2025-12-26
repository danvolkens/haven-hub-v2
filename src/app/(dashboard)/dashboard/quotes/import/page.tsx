'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Card, CardHeader, CardContent } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { COLLECTIONS, MOODS } from '@/lib/constants';

interface ParsedQuote {
  text: string;
  attribution?: string;
  collection: string;
  mood: string;
  tags?: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function QuotesImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuotes, setParsedQuotes] = useState<ParsedQuote[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast('Please select a CSV file', 'error');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

      if (lines.length < 2) {
        setParseErrors(['CSV file must have a header row and at least one data row']);
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const requiredHeaders = ['text', 'collection', 'mood'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setParseErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
        return;
      }

      const quotes: ParsedQuote[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.trim().replace(/^"|"$/g, '') || '';
        });

        if (!row.text) {
          errors.push(`Row ${i + 1}: Missing quote text`);
          continue;
        }

        const collection = row.collection?.toLowerCase();
        const mood = row.mood?.toLowerCase();

        if (!COLLECTIONS.includes(collection as any)) {
          errors.push(`Row ${i + 1}: Invalid collection "${row.collection}". Must be one of: ${COLLECTIONS.join(', ')}`);
          continue;
        }

        if (!MOODS.includes(mood as any)) {
          errors.push(`Row ${i + 1}: Invalid mood "${row.mood}". Must be one of: ${MOODS.join(', ')}`);
          continue;
        }

        quotes.push({
          text: row.text,
          attribution: row.attribution || undefined,
          collection,
          mood,
          tags: row.tags ? row.tags.split(';').map(t => t.trim()) : undefined,
        });
      }

      setParsedQuotes(quotes);
      setParseErrors(errors);
    };

    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleImport = async () => {
    if (parsedQuotes.length === 0) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/quotes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes: parsedQuotes }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult(result);

      if (result.success > 0) {
        toast(`Successfully imported ${result.success} quotes`, 'success');
      }
    } catch (error) {
      toast('Failed to import quotes', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <PageContainer
      title="Import Quotes"
      description="Import quotes from a CSV file"
      actions={
        <Link href="/dashboard/quotes">
          <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Quotes
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl">
        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader
            title="Upload CSV File"
            description="Your CSV should have columns: text, collection, mood. Optional: attribution, tags"
          />
          <CardContent>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center cursor-pointer hover:border-sage transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-sage" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-body font-medium mb-1">Click to upload or drag and drop</p>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">CSV files only</p>
                </>
              )}
            </div>

            {/* CSV Format Help */}
            <div className="mt-4 p-4 bg-elevated rounded-lg">
              <p className="text-body-sm font-medium mb-2">CSV Format Example:</p>
              <code className="text-caption text-[var(--color-text-secondary)] block whitespace-pre">
{`text,attribution,collection,mood,tags
"The best way to predict the future is to create it.",Abraham Lincoln,growth,inspiring,motivation;leadership
"Peace comes from within.",Buddha,grounding,peaceful,mindfulness`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Parse Results */}
        {(parsedQuotes.length > 0 || parseErrors.length > 0) && (
          <Card className="mb-6">
            <CardHeader title="Preview" />
            <CardContent>
              {parseErrors.length > 0 && (
                <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg">
                  <div className="flex items-center gap-2 text-error mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{parseErrors.length} errors found</span>
                  </div>
                  <ul className="text-body-sm text-error space-y-1">
                    {parseErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li>...and {parseErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {parsedQuotes.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-success mb-4">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">{parsedQuotes.length} quotes ready to import</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {parsedQuotes.slice(0, 10).map((quote, i) => (
                      <div key={i} className="p-3 bg-elevated rounded text-body-sm">
                        <p className="font-serif italic line-clamp-2">&ldquo;{quote.text}&rdquo;</p>
                        <div className="mt-1 text-[var(--color-text-tertiary)]">
                          {quote.attribution && <span>{quote.attribution} &bull; </span>}
                          <span>{quote.collection} &bull; {quote.mood}</span>
                        </div>
                      </div>
                    ))}
                    {parsedQuotes.length > 10 && (
                      <p className="text-center text-body-sm text-[var(--color-text-secondary)]">
                        ...and {parsedQuotes.length - 10} more
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={handleImport}
                      isLoading={isImporting}
                      disabled={parsedQuotes.length === 0}
                    >
                      Import {parsedQuotes.length} Quotes
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
              <h3 className="text-h3 mb-2">Import Complete</h3>
              <p className="text-body text-[var(--color-text-secondary)] mb-4">
                {importResult.success} quotes imported successfully
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </p>
              <Link href="/dashboard/quotes">
                <Button>View Quotes</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
