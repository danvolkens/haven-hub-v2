'use client';

import { Card } from '@/components/ui/card';
import { Brain, TrendingUp, Lightbulb, Target } from 'lucide-react';

export default function IntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3E50]">AI Intelligence</h1>
        <p className="text-[#6B6560] mt-1">
          AI-powered insights and recommendations for your marketing
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#7A9E7E]/10 rounded-lg">
              <Brain className="h-5 w-5 text-[#7A9E7E]" />
            </div>
            <h2 className="font-semibold text-[#2D3E50]">Content Analysis</h2>
          </div>
          <p className="text-[#6B6560] text-sm mb-4">
            AI analyzes your content performance to identify patterns and opportunities.
          </p>
          <div className="text-sm text-[#6B6560]">
            Coming soon...
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#4A9B9B]/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-[#4A9B9B]" />
            </div>
            <h2 className="font-semibold text-[#2D3E50]">Trend Detection</h2>
          </div>
          <p className="text-[#6B6560] text-sm mb-4">
            Identify emerging trends in your audience engagement and content performance.
          </p>
          <div className="text-sm text-[#6B6560]">
            Coming soon...
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#D4A574]/10 rounded-lg">
              <Lightbulb className="h-5 w-5 text-[#D4A574]" />
            </div>
            <h2 className="font-semibold text-[#2D3E50]">Smart Recommendations</h2>
          </div>
          <p className="text-[#6B6560] text-sm mb-4">
            Get personalized recommendations for content, timing, and targeting.
          </p>
          <div className="text-sm text-[#6B6560]">
            Coming soon...
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#2D3E50]/10 rounded-lg">
              <Target className="h-5 w-5 text-[#2D3E50]" />
            </div>
            <h2 className="font-semibold text-[#2D3E50]">Audience Insights</h2>
          </div>
          <p className="text-[#6B6560] text-sm mb-4">
            Deep understanding of your audience preferences and behaviors.
          </p>
          <div className="text-sm text-[#6B6560]">
            Coming soon...
          </div>
        </Card>
      </div>
    </div>
  );
}
