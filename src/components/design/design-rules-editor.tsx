'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, RotateCcw } from 'lucide-react';

interface DesignRulesEditorProps {
  userId: string;
}

export function DesignRulesEditor({ userId }: DesignRulesEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('typography');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['design-rules'],
    queryFn: async () => {
      const response = await fetch('/api/design-rules');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const [localRules, setLocalRules] = useState(rules?.rules || {});

  const saveMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch('/api/design-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-rules'] });
      setHasChanges(false);
    },
  });

  const updateRule = (category: string, key: string, value: any) => {
    setLocalRules((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localRules);
  };

  const handleReset = () => {
    setLocalRules(rules?.rules || {});
    setHasChanges(false);
  };

  if (isLoading) {
    return <div>Loading design rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Design Rules</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Primary Font</Label>
              <Select
                value={localRules.typography?.primary_font || 'Playfair Display'}
                onChange={(v) => updateRule('typography', 'primary_font', v as string)}
                options={[
                  { value: 'Playfair Display', label: 'Playfair Display' },
                  { value: 'Montserrat', label: 'Montserrat' },
                  { value: 'Lora', label: 'Lora' },
                  { value: 'Roboto', label: 'Roboto' },
                  { value: 'Open Sans', label: 'Open Sans' },
                ]}
              />
            </div>

            <div>
              <Label>Base Font Size: {localRules.typography?.base_size || 48}px</Label>
              <Slider
                value={[localRules.typography?.base_size || 48]}
                onValueChange={([v]) => updateRule('typography', 'base_size', v)}
                min={24}
                max={96}
                step={2}
              />
            </div>

            <div>
              <Label>Line Height: {localRules.typography?.line_height || 1.4}</Label>
              <Slider
                value={[localRules.typography?.line_height || 1.4]}
                onValueChange={([v]) => updateRule('typography', 'line_height', v)}
                min={1}
                max={2}
                step={0.1}
              />
            </div>

            <div>
              <Label>Letter Spacing: {localRules.typography?.letter_spacing || 0}px</Label>
              <Slider
                value={[localRules.typography?.letter_spacing || 0]}
                onValueChange={([v]) => updateRule('typography', 'letter_spacing', v)}
                min={-2}
                max={10}
                step={0.5}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.background || '#ffffff'}
                    onChange={(e) => updateRule('colors', 'background', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.background || '#ffffff'}
                    onChange={(e) => updateRule('colors', 'background', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.text || '#1a1a1a'}
                    onChange={(e) => updateRule('colors', 'text', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.text || '#1a1a1a'}
                    onChange={(e) => updateRule('colors', 'text', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Accent Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.accent || '#4f7c5f'}
                    onChange={(e) => updateRule('colors', 'accent', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.accent || '#4f7c5f'}
                    onChange={(e) => updateRule('colors', 'accent', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Attribution Color</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={localRules.colors?.attribution || '#666666'}
                    onChange={(e) => updateRule('colors', 'attribution', e.target.value)}
                    className="h-10 w-20 rounded border cursor-pointer"
                  />
                  <Input
                    value={localRules.colors?.attribution || '#666666'}
                    onChange={(e) => updateRule('colors', 'attribution', e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Default Text Position</Label>
              <Select
                value={localRules.layout?.text_position || 'center'}
                onChange={(v) => updateRule('layout', 'text_position', v as string)}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'top', label: 'Top' },
                  { value: 'bottom', label: 'Bottom' },
                ]}
              />
            </div>

            <div>
              <Label>Horizontal Padding: {localRules.layout?.padding_x || 60}px</Label>
              <Slider
                value={[localRules.layout?.padding_x || 60]}
                onValueChange={([v]) => updateRule('layout', 'padding_x', v)}
                min={20}
                max={150}
                step={5}
              />
            </div>

            <div>
              <Label>Vertical Padding: {localRules.layout?.padding_y || 80}px</Label>
              <Slider
                value={[localRules.layout?.padding_y || 80]}
                onValueChange={([v]) => updateRule('layout', 'padding_y', v)}
                min={20}
                max={150}
                step={5}
              />
            </div>

            <div>
              <Label>Safe Zone Margin: {localRules.layout?.safe_zone || 5}%</Label>
              <Slider
                value={[localRules.layout?.safe_zone || 5]}
                onValueChange={([v]) => updateRule('layout', 'safe_zone', v)}
                min={0}
                max={15}
                step={1}
              />
            </div>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality">
          <Card className="p-6 space-y-6">
            <div>
              <Label>Minimum Contrast Ratio: {localRules.quality?.min_contrast || 4.5}</Label>
              <Slider
                value={[localRules.quality?.min_contrast || 4.5]}
                onValueChange={([v]) => updateRule('quality', 'min_contrast', v)}
                min={3}
                max={7}
                step={0.5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                WCAG AA requires 4.5:1 for normal text
              </p>
            </div>

            <div>
              <Label>Auto-Approval Threshold: {localRules.quality?.auto_approve_threshold || 85}%</Label>
              <Slider
                value={[localRules.quality?.auto_approve_threshold || 85]}
                onValueChange={([v]) => updateRule('quality', 'auto_approve_threshold', v)}
                min={50}
                max={100}
                step={5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Assets above this score are auto-approved in Assisted mode
              </p>
            </div>

            <div>
              <Label>Minimum Quality Score: {localRules.quality?.min_score || 60}%</Label>
              <Slider
                value={[localRules.quality?.min_score || 60]}
                onValueChange={([v]) => updateRule('quality', 'min_score', v)}
                min={0}
                max={80}
                step={5}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Assets below this score are flagged for review
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
