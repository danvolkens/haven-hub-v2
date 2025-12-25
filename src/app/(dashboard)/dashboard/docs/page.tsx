'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  BookOpen,
  Sparkles,
  Image,
  CheckCircle,
  Pin,
  BarChart3,
  Settings,
  Zap,
  ArrowRight,
  Lightbulb,
  Target,
  Palette,
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <BookOpen className="h-5 w-5" />,
      content: <OverviewSection />,
    },
    {
      id: 'workflow',
      title: 'Workflow',
      icon: <Zap className="h-5 w-5" />,
      content: <WorkflowSection />,
    },
    {
      id: 'quotes',
      title: 'Quotes',
      icon: <Lightbulb className="h-5 w-5" />,
      content: <QuotesSection />,
    },
    {
      id: 'design',
      title: 'Design Engine',
      icon: <Palette className="h-5 w-5" />,
      content: <DesignSection />,
    },
    {
      id: 'mockups',
      title: 'Mockups',
      icon: <Image className="h-5 w-5" />,
      content: <MockupsSection />,
    },
    {
      id: 'approvals',
      title: 'Approvals',
      icon: <CheckCircle className="h-5 w-5" />,
      content: <ApprovalsSection />,
    },
    {
      id: 'pinterest',
      title: 'Pinterest',
      icon: <Pin className="h-5 w-5" />,
      content: <PinterestSection />,
    },
  ];

  return (
    <PageContainer
      title="Documentation"
      description="Learn how to use Haven Hub to automate your Pinterest marketing"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === section.id
                        ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {section.icon}
                    {section.title}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              {sections.find((s) => s.id === activeTab)?.content}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Haven Hub</h2>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Haven Hub is a Pinterest-first marketing automation platform designed specifically for
          Shopify stores selling quote-based products. It automates the entire content creation
          pipeline from quote to published pin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          icon={<Sparkles className="h-6 w-6 text-amber-500" />}
          title="AI-Powered Design"
          description="Automatically generate beautiful quote designs optimized for Pinterest engagement."
        />
        <FeatureCard
          icon={<Image className="h-6 w-6 text-teal-500" />}
          title="Dynamic Mockups"
          description="See your quotes on real product mockups with one click using Dynamic Mockups integration."
        />
        <FeatureCard
          icon={<CheckCircle className="h-6 w-6 text-green-500" />}
          title="Quality Control"
          description="AI-powered approval queue ensures only high-quality content gets published."
        />
        <FeatureCard
          icon={<BarChart3 className="h-6 w-6 text-blue-500" />}
          title="Analytics"
          description="Track performance across Pinterest with attribution back to your Shopify store."
        />
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Quick Start</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Add quotes to your library in the Quotes section</li>
          <li>Generate designs and mockups with one click</li>
          <li>Review and approve content in the Approvals queue</li>
          <li>Schedule approved content to Pinterest boards</li>
          <li>Track performance in Analytics</li>
        </ol>
      </div>
    </div>
  );
}

function WorkflowSection() {
  const steps = [
    {
      number: 1,
      title: 'Add Quotes',
      description: 'Import or create quotes organized by collection (Grounding, Wholeness, Growth).',
      details: ['CSV import supported', 'Manual entry available', 'Mood tagging for design matching'],
    },
    {
      number: 2,
      title: 'Generate Designs',
      description: 'The Design Engine creates Pinterest-optimized images from your quotes.',
      details: ['Multiple formats (Pinterest Pin, Story, Square)', 'AI color palette selection', 'Quality scoring'],
    },
    {
      number: 3,
      title: 'Create Mockups',
      description: 'Dynamic Mockups places your designs on realistic product scenes.',
      details: ['Multiple scene templates', 'Automatic fit & scaling', 'High-resolution output'],
    },
    {
      number: 4,
      title: 'Review & Approve',
      description: 'Quality check all generated content before publishing.',
      details: ['AI confidence scores', 'Bulk approve/reject', 'Flag problematic content'],
    },
    {
      number: 5,
      title: 'Publish to Pinterest',
      description: 'Schedule approved content to your Pinterest boards.',
      details: ['Board selection', 'Optimal timing', 'Hashtag suggestions'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Content Workflow</h2>
        <p className="text-[var(--color-text-secondary)]">
          Haven Hub follows a streamlined workflow from quote to published pin. Each step is
          automated but allows for human oversight and customization.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                {step.number}
              </div>
              <div className="flex-1 pb-8">
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-[var(--color-text-secondary)] mb-2">{step.description}</p>
                <ul className="list-disc list-inside text-sm text-[var(--color-text-tertiary)] space-y-1">
                  {step.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-10 w-px h-full bg-[var(--color-border-primary)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuotesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Quotes Management</h2>
        <p className="text-[var(--color-text-secondary)]">
          Quotes are the foundation of your content. Organize them into collections that match
          your brand's themes and emotional tones.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Collections</h3>
        <div className="grid gap-3">
          <CollectionCard
            name="Grounding"
            color="bg-teal-100 text-teal-800"
            description="Quotes about stability, presence, and finding your center. Calming earth tones and nature imagery."
          />
          <CollectionCard
            name="Wholeness"
            color="bg-amber-100 text-amber-800"
            description="Quotes about completeness, self-acceptance, and inner peace. Warm, harmonious color palettes."
          />
          <CollectionCard
            name="Growth"
            color="bg-green-100 text-green-800"
            description="Quotes about change, potential, and becoming. Fresh greens and uplifting imagery."
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quote Properties</h3>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
          <dl className="space-y-3">
            <div>
              <dt className="font-medium">Text</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">The quote content itself. Keep it concise for Pinterest readability.</dd>
            </div>
            <div>
              <dt className="font-medium">Author (optional)</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Attribution for the quote. Leave blank for anonymous/original quotes.</dd>
            </div>
            <div>
              <dt className="font-medium">Mood</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Emotional tone (calm, uplifting, reflective, etc.) - influences design colors.</dd>
            </div>
            <div>
              <dt className="font-medium">Collection</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Which thematic collection this quote belongs to.</dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Importing Quotes</h3>
        <p className="text-[var(--color-text-secondary)] mb-2">
          Bulk import quotes using CSV format with these columns:
        </p>
        <code className="block bg-[var(--color-bg-secondary)] p-3 rounded text-sm">
          text,author,collection,mood
        </code>
      </div>
    </div>
  );
}

function DesignSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Design Engine</h2>
        <p className="text-[var(--color-text-secondary)]">
          The Design Engine automatically creates beautiful, Pinterest-optimized images from your
          quotes using AI-powered layout and color selection.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Output Formats</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">2:3</div>
            <div className="font-medium">Pinterest Pin</div>
            <div className="text-sm text-[var(--color-text-tertiary)]">1000 x 1500px</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">9:16</div>
            <div className="font-medium">Story/Idea Pin</div>
            <div className="text-sm text-[var(--color-text-tertiary)]">1080 x 1920px</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">1:1</div>
            <div className="font-medium">Square</div>
            <div className="text-sm text-[var(--color-text-tertiary)]">1080 x 1080px</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quality Scoring</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Each generated design receives quality scores to help prioritize content:
        </p>
        <div className="space-y-2">
          <ScoreItem name="Readability" description="Text contrast and legibility" />
          <ScoreItem name="Composition" description="Visual balance and layout" />
          <ScoreItem name="Contrast" description="Color contrast ratios" />
          <ScoreItem name="Overall" description="Combined quality score" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Design Rules</h3>
        <p className="text-[var(--color-text-secondary)]">
          Customize design generation with rules for fonts, colors, and layouts in Settings &rarr; Design Rules.
        </p>
      </div>
    </div>
  );
}

function MockupsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Mockup Generation</h2>
        <p className="text-[var(--color-text-secondary)]">
          Transform flat designs into lifestyle mockups showing your quotes on real products
          in beautiful settings. Powered by Dynamic Mockups API.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Select a quote with a generated design</li>
          <li>Choose mockup scenes (frame on wall, canvas in room, etc.)</li>
          <li>Click Generate - mockups are created automatically</li>
          <li>Review in Approvals queue</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Scene Templates</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Mockup scenes are configured in Settings &rarr; Mockups. Each scene defines:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Dynamic Mockups template ID</li>
          <li>Smart object placement area</li>
          <li>Image fit mode (cover, contain, stretch)</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Credits</h3>
        <p className="text-[var(--color-text-secondary)]">
          Mockup generation uses Dynamic Mockups credits. Track your usage in Settings &rarr; Integrations.
          Each mockup render typically costs 1 credit.
        </p>
      </div>
    </div>
  );
}

function ApprovalsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Approval Queue</h2>
        <p className="text-[var(--color-text-secondary)]">
          All generated content flows through the approval queue before publishing. This ensures
          quality control and gives you final say on what represents your brand.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Content Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Assets</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Generated quote designs ready for use or mockup creation.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Mockups</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Product mockups showing designs in lifestyle settings.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Actions</h3>
        <div className="space-y-2">
          <ActionItem
            action="Approve"
            color="text-green-600"
            description="Mark content as ready for publishing. Moves to Assets library."
          />
          <ActionItem
            action="Reject"
            color="text-red-600"
            description="Remove content from queue. Won't be used."
          />
          <ActionItem
            action="Skip"
            color="text-gray-600"
            description="Temporarily skip for later review."
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Filtering</h3>
        <p className="text-[var(--color-text-secondary)]">
          Filter the queue by content type, collection, or flagged items. Flagged items have
          potential quality issues detected by AI (low contrast, readability concerns, etc.).
        </p>
      </div>
    </div>
  );
}

function PinterestSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pinterest Integration</h2>
        <p className="text-[var(--color-text-secondary)]">
          Connect your Pinterest Business account to publish approved content directly to your boards.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Go to Settings &rarr; Integrations</li>
          <li>Click "Connect Pinterest"</li>
          <li>Authorize Haven Hub to manage your pins</li>
          <li>Select which boards to use for publishing</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Publishing</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Once connected, you can:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Publish individual pins from the Assets library</li>
          <li>Schedule pins for optimal times</li>
          <li>Set up automated publishing workflows</li>
          <li>Track pin performance and engagement</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Best Practices</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <ul className="space-y-2 text-sm text-amber-900">
            <li><strong>Consistency:</strong> Post 3-5 pins per day for optimal reach</li>
            <li><strong>Timing:</strong> Schedule for evenings and weekends when engagement peaks</li>
            <li><strong>Variety:</strong> Mix quote designs with mockups for visual diversity</li>
            <li><strong>Boards:</strong> Use themed boards that match your collections</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function CollectionCard({ name, color, description }: { name: string; color: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg">
      <span className={`px-2 py-1 rounded text-sm font-medium ${color}`}>{name}</span>
      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function ScoreItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 font-medium">{name}</span>
      <span className="text-[var(--color-text-secondary)]">{description}</span>
    </div>
  );
}

function ActionItem({ action, color, description }: { action: string; color: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`font-medium w-20 ${color}`}>{action}</span>
      <span className="text-sm text-[var(--color-text-secondary)]">{description}</span>
    </div>
  );
}
