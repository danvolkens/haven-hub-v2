'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui';
import {
  BookOpen,
  Sparkles,
  Image,
  CheckCircle,
  Pin,
  BarChart3,
  Settings,
  Zap,
  Lightbulb,
  Palette,
  HelpCircle,
  Layers,
  MousePointerClick,
  ShoppingBag,
  Users,
  UserPlus,
  Heart,
  Gift,
  Ticket,
  Calendar,
  Link as LinkIcon,
  Share2,
  Megaphone,
  FlaskConical,
  Target,
  TrendingUp,
  Mail,
  Store,
  CreditCard,
  Bell,
  Shield,
  Database,
  Webhook,
  Frame,
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface DocCategory {
  name: string;
  sections: DocSection[];
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const categories: DocCategory[] = [
    {
      name: 'Getting Started',
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          icon: <BookOpen className="h-4 w-4" />,
          content: <OverviewSection />,
        },
        {
          id: 'workflow',
          title: 'Workflow',
          icon: <Zap className="h-4 w-4" />,
          content: <WorkflowSection />,
        },
      ],
    },
    {
      name: 'Content Creation',
      sections: [
        {
          id: 'quotes',
          title: 'Quotes',
          icon: <Lightbulb className="h-4 w-4" />,
          content: <QuotesSection />,
        },
        {
          id: 'design',
          title: 'Design Engine',
          icon: <Palette className="h-4 w-4" />,
          content: <DesignSection />,
        },
        {
          id: 'mockups',
          title: 'Mockups',
          icon: <Frame className="h-4 w-4" />,
          content: <MockupsSection />,
        },
        {
          id: 'assets',
          title: 'Assets Library',
          icon: <Image className="h-4 w-4" />,
          content: <AssetsSection />,
        },
        {
          id: 'approvals',
          title: 'Approvals',
          icon: <CheckCircle className="h-4 w-4" />,
          content: <ApprovalsSection />,
        },
      ],
    },
    {
      name: 'Pinterest',
      sections: [
        {
          id: 'pinterest',
          title: 'Pin Manager',
          icon: <Pin className="h-4 w-4" />,
          content: <PinterestSection />,
        },
        {
          id: 'pinterest-analytics',
          title: 'Analytics',
          icon: <BarChart3 className="h-4 w-4" />,
          content: <PinterestAnalyticsSection />,
        },
        {
          id: 'pinterest-ads',
          title: 'Ads Manager',
          icon: <Megaphone className="h-4 w-4" />,
          content: <PinterestAdsSection />,
        },
        {
          id: 'ab-tests',
          title: 'A/B Testing',
          icon: <FlaskConical className="h-4 w-4" />,
          content: <ABTestingSection />,
        },
      ],
    },
    {
      name: 'Lead Generation',
      sections: [
        {
          id: 'quiz',
          title: 'Quiz Builder',
          icon: <HelpCircle className="h-4 w-4" />,
          content: <QuizSection />,
        },
        {
          id: 'landing-pages',
          title: 'Landing Pages',
          icon: <Layers className="h-4 w-4" />,
          content: <LandingPagesSection />,
        },
        {
          id: 'popups',
          title: 'Popups',
          icon: <MousePointerClick className="h-4 w-4" />,
          content: <PopupsSection />,
        },
        {
          id: 'abandonment',
          title: 'Cart Abandonment',
          icon: <ShoppingBag className="h-4 w-4" />,
          content: <AbandonmentSection />,
        },
      ],
    },
    {
      name: 'Customer Management',
      sections: [
        {
          id: 'customers',
          title: 'Customer Overview',
          icon: <Users className="h-4 w-4" />,
          content: <CustomersSection />,
        },
        {
          id: 'referrals',
          title: 'Referral Program',
          icon: <UserPlus className="h-4 w-4" />,
          content: <ReferralsSection />,
        },
        {
          id: 'winback',
          title: 'Win-Back Campaigns',
          icon: <Heart className="h-4 w-4" />,
          content: <WinBackSection />,
        },
        {
          id: 'gifts',
          title: 'Gifting System',
          icon: <Gift className="h-4 w-4" />,
          content: <GiftsSection />,
        },
      ],
    },
    {
      name: 'Campaigns',
      sections: [
        {
          id: 'campaigns',
          title: 'Campaign Manager',
          icon: <Megaphone className="h-4 w-4" />,
          content: <CampaignsSection />,
        },
        {
          id: 'coupons',
          title: 'Coupon Manager',
          icon: <Ticket className="h-4 w-4" />,
          content: <CouponsSection />,
        },
        {
          id: 'calendar',
          title: 'Content Calendar',
          icon: <Calendar className="h-4 w-4" />,
          content: <CalendarSection />,
        },
      ],
    },
    {
      name: 'Email Marketing',
      sections: [
        {
          id: 'email-overview',
          title: 'Email Overview',
          icon: <Mail className="h-4 w-4" />,
          content: <EmailOverviewSection />,
        },
        {
          id: 'email-setup',
          title: 'Klaviyo Setup',
          icon: <Settings className="h-4 w-4" />,
          content: <EmailSetupSection />,
        },
        {
          id: 'email-flows',
          title: 'Email Flows',
          icon: <Zap className="h-4 w-4" />,
          content: <EmailFlowsSection />,
        },
      ],
    },
    {
      name: 'Content & Analytics',
      sections: [
        {
          id: 'link-in-bio',
          title: 'Link-in-Bio',
          icon: <LinkIcon className="h-4 w-4" />,
          content: <LinkInBioSection />,
        },
        {
          id: 'cross-platform',
          title: 'Cross-Platform',
          icon: <Share2 className="h-4 w-4" />,
          content: <CrossPlatformSection />,
        },
        {
          id: 'attribution',
          title: 'Attribution',
          icon: <Target className="h-4 w-4" />,
          content: <AttributionSection />,
        },
        {
          id: 'scaling-playbook',
          title: 'Scaling Playbook',
          icon: <TrendingUp className="h-4 w-4" />,
          content: <ScalingPlaybookSection />,
        },
        {
          id: 'performance-alerts',
          title: 'Performance Alerts',
          icon: <Bell className="h-4 w-4" />,
          content: <PerformanceAlertsSection />,
        },
        {
          id: 'audiences',
          title: 'Pinterest Audiences',
          icon: <Target className="h-4 w-4" />,
          content: <AudiencesSection />,
        },
      ],
    },
    {
      name: 'Settings',
      sections: [
        {
          id: 'integrations',
          title: 'Integrations',
          icon: <Webhook className="h-4 w-4" />,
          content: <IntegrationsSection />,
        },
        {
          id: 'settings',
          title: 'Account Settings',
          icon: <Settings className="h-4 w-4" />,
          content: <SettingsSection />,
        },
      ],
    },
  ];

  const allSections = categories.flatMap((cat) => cat.sections);

  return (
    <PageContainer
      title="Documentation"
      description="Learn how to use Haven Hub to automate your Pinterest marketing"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-72 flex-shrink-0">
          <Card>
            <CardContent className="p-3">
              <nav className="space-y-4">
                {categories.map((category) => (
                  <div key={category.name}>
                    <h3 className="px-3 py-1 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                      {category.name}
                    </h3>
                    <div className="space-y-0.5 mt-1">
                      {category.sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveTab(section.id)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                            activeTab === section.id
                              ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-medium'
                              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {section.icon}
                          {section.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              {allSections.find((s) => s.id === activeTab)?.content}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

// ============================================================================
// GETTING STARTED SECTIONS
// ============================================================================

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Haven Hub</h2>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Haven Hub is a Pinterest-first marketing automation platform designed specifically for
          Shopify stores selling quote-based products. It automates the entire content creation
          pipeline from quote to published pin, while providing powerful tools for lead generation,
          customer retention, and campaign management.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          icon={<HelpCircle className="h-6 w-6 text-purple-500" />}
          title="Lead Capture"
          description="Build quizzes, landing pages, and popups to capture and nurture leads."
        />
        <FeatureCard
          icon={<Users className="h-6 w-6 text-blue-500" />}
          title="Customer Retention"
          description="Win-back campaigns, referral programs, and gifting to keep customers engaged."
        />
        <FeatureCard
          icon={<BarChart3 className="h-6 w-6 text-indigo-500" />}
          title="Analytics & Attribution"
          description="Track performance across Pinterest with attribution back to your Shopify store."
        />
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Quick Start Guide</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li><strong>Connect integrations</strong> - Link Shopify, Pinterest, and Klaviyo in Settings</li>
          <li><strong>Add quotes</strong> - Import or create quotes in your library</li>
          <li><strong>Generate designs</strong> - Create Pinterest-optimized images</li>
          <li><strong>Create mockups</strong> - Place designs on product scenes</li>
          <li><strong>Review & approve</strong> - Quality check all content</li>
          <li><strong>Schedule & publish</strong> - Post to Pinterest boards</li>
          <li><strong>Track performance</strong> - Monitor analytics and optimize</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Store className="h-5 w-5 text-green-600" />
            Shopify Integration
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sync products, track orders, and attribute sales back to your Pinterest content.
            Haven Hub integrates deeply with your Shopify store.
          </p>
        </div>
        <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            Klaviyo Integration
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Automatically sync leads to Klaviyo lists, trigger flows, and track email
            engagement alongside Pinterest performance.
          </p>
        </div>
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
      details: ['CSV import supported', 'Manual entry available', 'Mood tagging for design matching', 'Author attribution optional'],
    },
    {
      number: 2,
      title: 'Generate Designs',
      description: 'The Design Engine creates Pinterest-optimized images from your quotes.',
      details: ['Multiple formats (Pinterest Pin, Story, Square)', 'AI color palette selection', 'Quality scoring system', 'Custom design rules'],
    },
    {
      number: 3,
      title: 'Create Mockups',
      description: 'Dynamic Mockups places your designs on realistic product scenes.',
      details: ['Multiple scene templates', 'Automatic fit & scaling', 'High-resolution output', '1 credit per render'],
    },
    {
      number: 4,
      title: 'Review & Approve',
      description: 'Quality check all generated content before publishing.',
      details: ['AI confidence scores', 'Bulk approve/reject', 'Flag problematic content', 'Filter by collection'],
    },
    {
      number: 5,
      title: 'Schedule & Publish',
      description: 'Schedule approved content to your Pinterest boards.',
      details: ['Board selection per pin', 'Optimal timing suggestions', 'Auto-hashtag generation', 'Content calendar view'],
    },
    {
      number: 6,
      title: 'Track & Optimize',
      description: 'Monitor performance and optimize your content strategy.',
      details: ['Pin performance analytics', 'Sales attribution', 'A/B test results', 'Content mix recommendations'],
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

// ============================================================================
// CONTENT CREATION SECTIONS
// ============================================================================

function QuotesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Quotes Management</h2>
        <p className="text-[var(--color-text-secondary)]">
          Quotes are the foundation of your content. Organize them into collections that match
          your brand&apos;s themes and emotional tones.
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
              <dd className="text-sm text-[var(--color-text-secondary)]">The quote content itself. Keep it concise for Pinterest readability (under 150 characters ideal).</dd>
            </div>
            <div>
              <dt className="font-medium">Author (optional)</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Attribution for the quote. Leave blank for anonymous/original quotes.</dd>
            </div>
            <div>
              <dt className="font-medium">Mood</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Emotional tone (calm, uplifting, reflective, inspiring, peaceful) - influences design colors and imagery.</dd>
            </div>
            <div>
              <dt className="font-medium">Collection</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Which thematic collection this quote belongs to (Grounding, Wholeness, Growth).</dd>
            </div>
            <div>
              <dt className="font-medium">Tags</dt>
              <dd className="text-sm text-[var(--color-text-secondary)]">Additional categorization for filtering and organization.</dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Importing Quotes</h3>
        <p className="text-[var(--color-text-secondary)] mb-2">
          Bulk import quotes using CSV format with these columns:
        </p>
        <code className="block bg-[var(--color-bg-secondary)] p-3 rounded text-sm mb-3">
          text,author,collection,mood,tags
        </code>
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Example: &quot;Be present in every moment&quot;,Anonymous,Grounding,calm,&quot;mindfulness,presence&quot;
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">Tips for Great Quotes</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Keep quotes under 150 characters for best Pinterest readability</li>
          <li>• Use emotional, relatable language that resonates with your audience</li>
          <li>• Mix original quotes with attributed ones for variety</li>
          <li>• Tag quotes accurately for better design matching</li>
        </ul>
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
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Best for standard pins</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">9:16</div>
            <div className="font-medium">Story/Idea Pin</div>
            <div className="text-sm text-[var(--color-text-tertiary)]">1080 x 1920px</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Best for idea pins</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-teal-600 mb-1">1:1</div>
            <div className="font-medium">Square</div>
            <div className="text-sm text-[var(--color-text-tertiary)]">1080 x 1080px</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Cross-platform ready</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quality Scoring</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Each generated design receives quality scores to help prioritize content:
        </p>
        <div className="space-y-2">
          <ScoreItem name="Readability" description="Text contrast and legibility on the background" />
          <ScoreItem name="Composition" description="Visual balance and layout aesthetics" />
          <ScoreItem name="Contrast" description="Color contrast ratios (WCAG compliance)" />
          <ScoreItem name="Engagement" description="Predicted Pinterest engagement potential" />
          <ScoreItem name="Overall" description="Combined weighted quality score" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Design Rules</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Customize design generation in Settings → Design Rules:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text-secondary)] space-y-1">
          <li><strong>Fonts:</strong> Select from approved font families for your brand</li>
          <li><strong>Color Palettes:</strong> Define brand colors and mood-based palettes</li>
          <li><strong>Layouts:</strong> Choose preferred text positions and alignments</li>
          <li><strong>Backgrounds:</strong> Set background styles (solid, gradient, textured)</li>
          <li><strong>Overlays:</strong> Configure text shadow and overlay opacity</li>
        </ul>
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
          <li>Review in Approvals queue before publishing</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Scene Templates</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Mockup scenes are configured in Settings → Mockups. Each scene defines:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Template ID:</strong> Dynamic Mockups template identifier</li>
          <li><strong>Smart Object:</strong> Placement area within the scene</li>
          <li><strong>Fit Mode:</strong> How design fits (cover, contain, stretch)</li>
          <li><strong>Output Size:</strong> Final image dimensions</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Scene Categories</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
            <div className="font-medium mb-1">Wall Art</div>
            <p className="text-sm text-[var(--color-text-secondary)]">Framed prints, canvases, and posters in room settings</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
            <div className="font-medium mb-1">Desktop</div>
            <p className="text-sm text-[var(--color-text-secondary)]">Desk frames, stands, and workspace scenes</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
            <div className="font-medium mb-1">Lifestyle</div>
            <p className="text-sm text-[var(--color-text-secondary)]">Products in natural, lifestyle environments</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3">
            <div className="font-medium mb-1">Flat Lay</div>
            <p className="text-sm text-[var(--color-text-secondary)]">Top-down product arrangements</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[var(--color-text-secondary)]" />
          Credits
        </h3>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Mockup generation uses Dynamic Mockups credits. Each render costs 1 credit.
          Track your usage and remaining credits in Settings → Integrations.
        </p>
      </div>
    </div>
  );
}

function AssetsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Assets Library</h2>
        <p className="text-[var(--color-text-secondary)]">
          The Assets Library is your central repository for all approved content. Browse,
          organize, and manage designs and mockups ready for publishing.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Asset Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Quote Designs</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Generated images with quotes, ready for direct publishing or mockup creation.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Product Mockups</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Lifestyle scenes showing designs on products, ideal for Pinterest pins.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Filtering & Organization</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Collection:</strong> Filter by Grounding, Wholeness, or Growth</li>
          <li><strong>Type:</strong> Designs only, mockups only, or all</li>
          <li><strong>Status:</strong> Published, scheduled, or ready</li>
          <li><strong>Format:</strong> Filter by aspect ratio (2:3, 9:16, 1:1)</li>
          <li><strong>Date:</strong> Sort by creation or publish date</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Actions</h3>
        <div className="space-y-2">
          <ActionItem
            action="Publish"
            color="text-green-600"
            description="Send to Pinterest immediately or add to schedule queue"
          />
          <ActionItem
            action="Schedule"
            color="text-blue-600"
            description="Add to content calendar for future publishing"
          />
          <ActionItem
            action="Download"
            color="text-gray-600"
            description="Download high-resolution version for other uses"
          />
          <ActionItem
            action="Archive"
            color="text-amber-600"
            description="Remove from active library without deleting"
          />
        </div>
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
        <h3 className="font-semibold text-lg mb-3">Review Actions</h3>
        <div className="space-y-2">
          <ActionItem
            action="Approve"
            color="text-green-600"
            description="Mark as ready for publishing. Moves to Assets library."
          />
          <ActionItem
            action="Reject"
            color="text-red-600"
            description="Remove from queue permanently. Will be regenerated if needed."
          />
          <ActionItem
            action="Skip"
            color="text-gray-600"
            description="Temporarily skip for later review."
          />
          <ActionItem
            action="Flag"
            color="text-amber-600"
            description="Mark for attention (quality concerns, needs edits)."
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quality Indicators</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          AI analysis flags potential issues automatically:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Low contrast:</strong> Text may be hard to read</li>
          <li><strong>Readability:</strong> Font size or style concerns</li>
          <li><strong>Composition:</strong> Layout balance issues</li>
          <li><strong>Duplicate:</strong> Similar to existing approved content</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Bulk Actions</h3>
        <p className="text-[var(--color-text-secondary)]">
          Select multiple items to approve or reject in batch. Use filters to quickly
          process content by collection, type, or flag status.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// PINTEREST SECTIONS
// ============================================================================

function PinterestSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pinterest Pin Manager</h2>
        <p className="text-[var(--color-text-secondary)]">
          Manage your Pinterest content from a single dashboard. View boards, schedule pins,
          and track publishing history.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Go to Settings → Integrations</li>
          <li>Click &quot;Connect Pinterest&quot;</li>
          <li>Authorize Haven Hub to manage your pins</li>
          <li>Select which boards to use for publishing</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Board Management</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>View all Pinterest boards in your account</li>
          <li>Select default boards for each collection</li>
          <li>Map collections to boards (e.g., Grounding → Mindfulness Board)</li>
          <li>Create board-specific publishing rules</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Publishing Options</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Publish Now</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Immediately post selected pins to Pinterest boards.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Schedule</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Add to queue with specific date/time or optimal timing.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">Best Practices</h4>
        <ul className="space-y-2 text-sm text-amber-800">
          <li><strong>Consistency:</strong> Post 3-5 pins per day for optimal reach</li>
          <li><strong>Timing:</strong> Schedule for evenings and weekends when engagement peaks</li>
          <li><strong>Variety:</strong> Mix quote designs with mockups for visual diversity</li>
          <li><strong>Boards:</strong> Use themed boards that match your collections</li>
          <li><strong>Descriptions:</strong> Add keyword-rich descriptions for discoverability</li>
        </ul>
      </div>
    </div>
  );
}

function PinterestAnalyticsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pinterest Analytics</h2>
        <p className="text-[var(--color-text-secondary)]">
          Track your Pinterest performance with detailed analytics. Monitor engagement,
          discover top-performing content, and optimize your strategy.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Key Metrics</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Impressions" description="How many times your pins were seen" />
          <MetricCard title="Engagements" description="Saves, clicks, and comments combined" />
          <MetricCard title="Save Rate" description="Percentage of viewers who saved" />
          <MetricCard title="Click-through Rate" description="Percentage who clicked to your site" />
          <MetricCard title="Closeups" description="Users who tapped to see pin details" />
          <MetricCard title="Outbound Clicks" description="Clicks through to your Shopify store" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Content Mix Analysis</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Understand which content types perform best:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>By Collection:</strong> Compare Grounding vs. Wholeness vs. Growth</li>
          <li><strong>By Format:</strong> Standard pins vs. Idea pins vs. Story pins</li>
          <li><strong>By Type:</strong> Quote designs vs. Product mockups</li>
          <li><strong>By Mood:</strong> Which emotional tones resonate most</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Top Performers</h3>
        <p className="text-[var(--color-text-secondary)]">
          Automatically identifies your best-performing pins based on engagement.
          Use insights to guide future content creation and design decisions.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Performance Rules</h3>
        <p className="text-[var(--color-text-secondary)]">
          Set up automated rules in Pinterest → Rules to take action on performance:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Boost pins that exceed engagement thresholds</li>
          <li>Archive underperforming content</li>
          <li>Notify when viral content detected</li>
          <li>Auto-repost top performers on schedule</li>
        </ul>
      </div>
    </div>
  );
}

function PinterestAdsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pinterest Ads Manager</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create and manage Pinterest advertising campaigns directly from Haven Hub.
          Promote your best-performing content to reach new audiences.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Awareness</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Maximize reach and impressions to build brand awareness.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Consideration</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Drive traffic to your website and increase engagement.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Conversions</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Optimize for purchases and specific actions on your site.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Catalog Sales</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Promote products from your Shopify catalog dynamically.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Wizard</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Use the Campaign Wizard for guided setup:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Select campaign objective</li>
          <li>Choose target audience (interests, demographics, keywords)</li>
          <li>Set budget and schedule</li>
          <li>Select pins to promote from your Assets library</li>
          <li>Review and launch</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Budget Management</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Daily Budget:</strong> Set maximum spend per day</li>
          <li><strong>Lifetime Budget:</strong> Total campaign spend cap</li>
          <li><strong>Bid Strategy:</strong> Automatic or manual bidding</li>
          <li><strong>Pacing:</strong> Standard or accelerated delivery</li>
        </ul>
      </div>
    </div>
  );
}

function ABTestingSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">A/B Testing</h2>
        <p className="text-[var(--color-text-secondary)]">
          Run experiments to discover what content performs best. Test different designs,
          copy, and publishing strategies with statistical confidence.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">What You Can Test</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Design Variants</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Test different color palettes, layouts, or fonts for the same quote.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Pin Descriptions</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Compare different titles, descriptions, and hashtags.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Mockup vs. Design</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              See if mockups outperform flat designs for your audience.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Posting Times</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Find optimal publishing times for your content.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Running a Test</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Create test with 2-4 variants</li>
          <li>Set success metric (saves, clicks, or engagement rate)</li>
          <li>Define test duration or sample size</li>
          <li>Launch test - variants are published randomly</li>
          <li>Review results with statistical significance</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Understanding Results</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Winner:</strong> Variant with highest performance and statistical significance</li>
          <li><strong>Confidence:</strong> Probability the winner is truly better (aim for 95%+)</li>
          <li><strong>Lift:</strong> Percentage improvement over baseline/control</li>
          <li><strong>Sample Size:</strong> Number of impressions per variant</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// LEAD GENERATION SECTIONS
// ============================================================================

function QuizSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Quiz Builder</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create engaging personality quizzes to capture leads and recommend products.
          Quizzes are one of the highest-converting lead capture methods.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quiz Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Personality Quiz</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              &quot;What&apos;s Your Mindfulness Style?&quot; - Match users to collections based on answers.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Product Finder</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              &quot;Find Your Perfect Quote&quot; - Recommend specific products based on preferences.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Quiz Components</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Questions:</strong> Multiple choice, image selection, or slider</li>
          <li><strong>Results:</strong> Outcome pages with product recommendations</li>
          <li><strong>Lead Capture:</strong> Email gate before or after results</li>
          <li><strong>Thank You:</strong> Custom page with discount code</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Result Mapping</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Map quiz answers to outcomes:
        </p>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium">Grounding Result</dt>
              <dd className="text-[var(--color-text-secondary)]">→ Grounding collection products</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Wholeness Result</dt>
              <dd className="text-[var(--color-text-secondary)]">→ Wholeness collection products</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Growth Result</dt>
              <dd className="text-[var(--color-text-secondary)]">→ Growth collection products</dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Sharing & Embedding</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Standalone quiz page URL for Pinterest promotion</li>
          <li>Embed code for your Shopify store</li>
          <li>Social sharing on results page</li>
          <li>QR code for print materials</li>
        </ul>
      </div>
    </div>
  );
}

function LandingPagesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Landing Pages</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create focused landing pages for campaigns, collections, or special offers.
          Optimized for conversions with built-in lead capture.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Page Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Collection Page</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Showcase a specific collection with curated products.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Offer Page</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Promote discounts or special offers with urgency.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Lead Magnet</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Offer free content in exchange for email signups.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Campaign Landing</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Seasonal or promotional campaign destination.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Page Sections</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Hero:</strong> Headline, subhead, and CTA button</li>
          <li><strong>Features:</strong> Key benefits with icons</li>
          <li><strong>Products:</strong> Featured product grid</li>
          <li><strong>Testimonials:</strong> Customer reviews and social proof</li>
          <li><strong>Lead Capture:</strong> Email signup form</li>
          <li><strong>FAQ:</strong> Common questions answered</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Pinterest Integration</h3>
        <p className="text-[var(--color-text-secondary)]">
          Landing pages are designed to work seamlessly with Pinterest traffic:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Fast load times optimized for mobile</li>
          <li>Rich Pin meta tags automatically added</li>
          <li>Pinterest tag tracking for conversions</li>
          <li>Retargeting pixel integration</li>
        </ul>
      </div>
    </div>
  );
}

function PopupsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Popup Manager</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create attention-grabbing popups to capture emails and promote offers.
          Smart triggers ensure popups appear at the right moment.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Popup Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Email Capture</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Grow your list with discount offers or content downloads.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Exit Intent</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Catch visitors before they leave with special offers.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Announcement</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Share sales, new products, or important updates.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Spin-to-Win</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Gamified discount wheel for email capture.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Trigger Options</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Time Delay:</strong> Show after X seconds on page</li>
          <li><strong>Scroll Depth:</strong> Show after scrolling X% of page</li>
          <li><strong>Exit Intent:</strong> Show when cursor moves toward close</li>
          <li><strong>Click:</strong> Show when specific element clicked</li>
          <li><strong>Page Views:</strong> Show after X page views in session</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Targeting Rules</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>New vs. returning visitors</li>
          <li>Traffic source (Pinterest, direct, search)</li>
          <li>Device type (mobile, desktop, tablet)</li>
          <li>Cart value thresholds</li>
          <li>Pages visited or excluded</li>
        </ul>
      </div>
    </div>
  );
}

function AbandonmentSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Cart Abandonment</h2>
        <p className="text-[var(--color-text-secondary)]">
          Recover lost sales with automated abandonment recovery flows.
          Reach customers who left items in their cart before completing purchase.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Recovery Flow</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li><strong>Detection:</strong> Cart abandoned detected via Shopify webhook</li>
          <li><strong>Email 1:</strong> Reminder sent 1 hour after abandonment</li>
          <li><strong>Email 2:</strong> Follow-up with social proof at 24 hours</li>
          <li><strong>Email 3:</strong> Final offer with discount at 72 hours</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Email Content</h3>
        <div className="grid gap-3">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Cart Contents</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Dynamic product images and details from abandoned cart.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Incentives</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Optional discount codes with configurable amounts and expiration.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Social Proof</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Reviews and testimonials for abandoned products.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Performance Tracking</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Carts abandoned vs. recovered</li>
          <li>Revenue recovered per email</li>
          <li>Optimal timing analysis</li>
          <li>Discount code usage rates</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOMER MANAGEMENT SECTIONS
// ============================================================================

function CustomersSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Customer Overview</h2>
        <p className="text-[var(--color-text-secondary)]">
          Understand your customers with unified profiles combining Shopify orders,
          Pinterest engagement, and Haven Hub interactions.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Customer Profile</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Contact Info:</strong> Email, name, and preferences</li>
          <li><strong>Order History:</strong> All Shopify purchases</li>
          <li><strong>Lifetime Value:</strong> Total revenue from customer</li>
          <li><strong>Collection Affinity:</strong> Preferred themes based on purchases</li>
          <li><strong>Engagement Score:</strong> Email opens, clicks, and site visits</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Customer Segments</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">New Customers</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              First-time buyers in last 30 days.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Repeat Buyers</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Customers with 2+ orders.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">VIP</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Top 10% by lifetime value.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">At Risk</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              No purchase in 90+ days.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Customer Journey</h3>
        <p className="text-[var(--color-text-secondary)]">
          Track the full customer journey from first touch to repeat purchase:
        </p>
        <div className="flex items-center gap-2 mt-3 text-sm overflow-x-auto pb-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded whitespace-nowrap">Pinterest Pin</span>
          <span>→</span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded whitespace-nowrap">Quiz/Landing</span>
          <span>→</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded whitespace-nowrap">Email Signup</span>
          <span>→</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded whitespace-nowrap">First Purchase</span>
          <span>→</span>
          <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded whitespace-nowrap">Repeat Buyer</span>
        </div>
      </div>
    </div>
  );
}

function ReferralsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Referral Program</h2>
        <p className="text-[var(--color-text-secondary)]">
          Turn happy customers into brand advocates with a referral program.
          Reward both referrers and new customers to drive word-of-mouth growth.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Customer receives unique referral link after purchase</li>
          <li>They share link with friends via email or social</li>
          <li>Friend clicks link and makes a purchase</li>
          <li>Both get rewards automatically applied</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Reward Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Percentage Discount</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              e.g., Referrer gets 20% off, friend gets 15% off
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Fixed Amount</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              e.g., Give $10, Get $10 credit
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Free Product</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              e.g., Free mini print after 3 referrals
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Tiered Rewards</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Increasing rewards for more referrals
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Tracking</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Referral link clicks and conversions</li>
          <li>Revenue generated from referrals</li>
          <li>Top referrers leaderboard</li>
          <li>Reward costs and ROI</li>
        </ul>
      </div>
    </div>
  );
}

function WinBackSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Win-Back Campaigns</h2>
        <p className="text-[var(--color-text-secondary)]">
          Re-engage customers who haven&apos;t purchased recently. Automated campaigns
          bring lapsed customers back with personalized offers.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Triggers</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">30-Day Lapsed</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Gentle reminder with new arrivals.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">60-Day Lapsed</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              &quot;We miss you&quot; with small incentive.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">90-Day Lapsed</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Significant offer to drive return.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">At-Risk VIP</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Special attention for high-value customers.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Email Sequence</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li><strong>Reminder:</strong> Show what they&apos;re missing (new products)</li>
          <li><strong>Social Proof:</strong> Reviews from similar customers</li>
          <li><strong>Incentive:</strong> Exclusive discount with urgency</li>
          <li><strong>Last Chance:</strong> Final reminder before offer expires</li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Personalization</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Product recommendations based on past purchases</li>
          <li>Collection suggestions based on preferences</li>
          <li>Personalized discount amounts based on LTV</li>
          <li>Dynamic content based on browsing history</li>
        </ul>
      </div>
    </div>
  );
}

function GiftsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Gifting System</h2>
        <p className="text-[var(--color-text-secondary)]">
          Enable gift purchases and gift cards to expand your customer base.
          Make it easy for customers to share your products with loved ones.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Gift Options</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Gift Cards</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Digital gift cards with customizable amounts and messages.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Gift Wrapping</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Add-on gift wrapping service at checkout.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Gift Messages</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Personal notes included with orders.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Gift Registry</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Wish lists for special occasions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Gift Card Features</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Digital delivery via email</li>
          <li>Scheduled delivery for special dates</li>
          <li>Custom amounts or preset values</li>
          <li>Themed designs matching collections</li>
          <li>Balance tracking and reminders</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Gift Recipient Journey</h3>
        <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li>Recipient receives gift card email</li>
          <li>Clicks to redeem and browses store</li>
          <li>Gets personalized quiz recommendation</li>
          <li>Makes purchase with gift card balance</li>
          <li>Becomes new customer in your database</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// CAMPAIGNS SECTIONS
// ============================================================================

function CampaignsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Campaign Manager</h2>
        <p className="text-[var(--color-text-secondary)]">
          Plan and execute marketing campaigns across Pinterest and email.
          Coordinate content, offers, and timing for maximum impact.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Seasonal</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Holiday themes, seasonal moods, and time-based content.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Collection Launch</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Introduce new quote collections or products.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Sale/Promotion</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Discount events and special offers.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Awareness</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Mental health days, awareness months, etc.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Components</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Content:</strong> Scheduled pins and assets for Pinterest</li>
          <li><strong>Email:</strong> Klaviyo campaigns triggered by campaign</li>
          <li><strong>Landing Page:</strong> Dedicated page for campaign traffic</li>
          <li><strong>Coupons:</strong> Campaign-specific discount codes</li>
          <li><strong>Budget:</strong> Pinterest ad spend allocation</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Campaign Planning</h3>
        <p className="text-[var(--color-text-secondary)]">
          View all campaigns on the Content Calendar. Set dates, assign content,
          and track progress from planning through execution and analysis.
        </p>
      </div>
    </div>
  );
}

function CouponsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Coupon Manager</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create and manage discount codes for campaigns, lead capture,
          and customer retention programs.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Coupon Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Percentage Off</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              10%, 20%, 25% off entire order or collection.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Fixed Amount</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              $5, $10, $15 off with minimum purchase.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Free Shipping</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Waive shipping costs above threshold.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Buy X Get Y</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Bundle deals and product promotions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Coupon Settings</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Code:</strong> Auto-generated or custom code</li>
          <li><strong>Usage Limit:</strong> Total uses or per customer</li>
          <li><strong>Expiration:</strong> Fixed date or days from issue</li>
          <li><strong>Minimum:</strong> Cart value requirement</li>
          <li><strong>Products:</strong> All or specific collections</li>
          <li><strong>Combinable:</strong> Allow with other discounts</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Coupon Usage</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Welcome offers for new email subscribers</li>
          <li>Abandoned cart recovery incentives</li>
          <li>Win-back campaigns for lapsed customers</li>
          <li>Referral rewards for both parties</li>
          <li>Seasonal sale promotions</li>
          <li>VIP exclusive discounts</li>
        </ul>
      </div>
    </div>
  );
}

function CalendarSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Content Calendar</h2>
        <p className="text-[var(--color-text-secondary)]">
          Plan and visualize your content schedule across Pinterest and campaigns.
          See what&apos;s publishing when and maintain consistent posting.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Calendar Views</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="font-medium">Month</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Overview of entire month
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="font-medium">Week</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Detailed weekly planning
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
            <div className="font-medium">Day</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Hour-by-hour schedule
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Calendar Features</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Drag & Drop:</strong> Reschedule content easily</li>
          <li><strong>Color Coding:</strong> Visual differentiation by collection</li>
          <li><strong>Campaign Overlay:</strong> See campaigns alongside posts</li>
          <li><strong>Publishing Status:</strong> Scheduled, published, failed</li>
          <li><strong>Quick Add:</strong> Schedule from calendar directly</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Scheduling Tips</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <ul className="space-y-2 text-sm text-amber-800">
            <li><strong>Consistency:</strong> Post at regular times daily</li>
            <li><strong>Mix Content:</strong> Vary quotes, mockups, and formats</li>
            <li><strong>Peak Times:</strong> Evenings (7-10pm) and weekends perform best</li>
            <li><strong>Gaps:</strong> Avoid more than 2 days without posting</li>
            <li><strong>Holidays:</strong> Plan themed content in advance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTENT & ANALYTICS SECTIONS
// ============================================================================

function LinkInBioSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Link-in-Bio</h2>
        <p className="text-[var(--color-text-secondary)]">
          Create a branded link page to share in your Pinterest bio and pins.
          Drive traffic to your most important destinations.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Link Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Shop Link</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Direct link to Shopify store or collection.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Quiz Link</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Link to your personality quiz for leads.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Landing Page</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Campaign or offer landing pages.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Social Links</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Instagram, TikTok, and other profiles.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Customization</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Custom URL slug (yourbrand.haven-hub.com/links)</li>
          <li>Logo and brand colors</li>
          <li>Button styles and shapes</li>
          <li>Background image or color</li>
          <li>Link icons and thumbnails</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Analytics</h3>
        <p className="text-[var(--color-text-secondary)]">
          Track link clicks and conversions from your bio page:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Total page views</li>
          <li>Click-through rate per link</li>
          <li>Traffic sources</li>
          <li>Conversion tracking</li>
        </ul>
      </div>
    </div>
  );
}

function CrossPlatformSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Cross-Platform Content</h2>
        <p className="text-[var(--color-text-secondary)]">
          Repurpose Pinterest content for other platforms. Export designs in
          platform-specific formats for Instagram, TikTok, and more.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Supported Platforms</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Instagram</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Feed posts (1:1), Stories (9:16), Reels covers
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">TikTok</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Video covers and static posts (9:16)
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Facebook</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Feed posts, Stories, and cover images
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Twitter/X</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              In-feed images (16:9, 1:1)
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Export Options</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Batch export multiple assets</li>
          <li>Automatic resizing for each platform</li>
          <li>Download as ZIP archive</li>
          <li>Direct share to connected accounts</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Content Adaptation</h3>
        <p className="text-[var(--color-text-secondary)]">
          Tips for repurposing Pinterest content:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Adjust aspect ratios for each platform</li>
          <li>Modify captions for platform tone</li>
          <li>Add platform-specific hashtags</li>
          <li>Consider video versions for TikTok/Reels</li>
        </ul>
      </div>
    </div>
  );
}

function AttributionSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Attribution Tracking</h2>
        <p className="text-[var(--color-text-secondary)]">
          Understand how Pinterest content drives sales. Track the customer journey
          from pin view to Shopify purchase.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Attribution Models</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">First Touch</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Credit to first pin that introduced customer.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Last Touch</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Credit to last pin before purchase.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Linear</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Equal credit to all touchpoints.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Time Decay</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              More credit to recent interactions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Key Metrics</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Pinterest Revenue:</strong> Sales attributed to Pinterest</li>
          <li><strong>ROAS:</strong> Return on ad spend for promoted pins</li>
          <li><strong>Conversion Rate:</strong> Visitors to customers</li>
          <li><strong>Average Order Value:</strong> From Pinterest traffic</li>
          <li><strong>Customer Acquisition Cost:</strong> Per Pinterest customer</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Tracking Setup</h3>
        <p className="text-[var(--color-text-secondary)]">
          Attribution requires proper tracking setup:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Pinterest tag installed on Shopify</li>
          <li>UTM parameters on all pin links</li>
          <li>Haven Hub webhook connected</li>
          <li>Conversion events configured</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS SECTIONS
// ============================================================================

function IntegrationsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Integrations</h2>
        <p className="text-[var(--color-text-secondary)]">
          Connect Haven Hub to your essential services. Each integration
          unlocks additional features and automation capabilities.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Required Integrations</h3>
        <div className="space-y-3">
          <IntegrationCard
            name="Shopify"
            description="Sync products, track orders, and attribute sales"
            status="required"
          />
          <IntegrationCard
            name="Pinterest"
            description="Publish pins and track performance"
            status="required"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Optional Integrations</h3>
        <div className="space-y-3">
          <IntegrationCard
            name="Klaviyo"
            description="Sync leads and trigger email flows"
            status="optional"
          />
          <IntegrationCard
            name="Dynamic Mockups"
            description="Generate product mockups"
            status="optional"
          />
          <IntegrationCard
            name="Anthropic (Claude)"
            description="AI-powered design and copy generation"
            status="optional"
          />
          <IntegrationCard
            name="Resend"
            description="Transactional email delivery"
            status="optional"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">API Keys & Credentials</h3>
        <p className="text-[var(--color-text-secondary)]">
          Each integration requires API credentials. Find these in each service&apos;s
          developer settings or admin panel. Never share credentials publicly.
        </p>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
        <p className="text-[var(--color-text-secondary)]">
          Configure your Haven Hub account, preferences, and team access.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Settings Categories</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Users className="h-4 w-4" /> Account
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Profile, email, password, and billing.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Integrations
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Connect Shopify, Pinterest, Klaviyo.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Palette className="h-4 w-4" /> Design Rules
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Fonts, colors, layouts for designs.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Frame className="h-4 w-4" /> Mockups
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Configure mockup scenes and templates.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Email alerts and digest preferences.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Security
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Two-factor auth and session management.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Team Management</h3>
        <p className="text-[var(--color-text-secondary)] mb-3">
          Invite team members with role-based access:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Admin:</strong> Full access including billing and settings</li>
          <li><strong>Manager:</strong> Content, campaigns, and analytics</li>
          <li><strong>Creator:</strong> Create and schedule content only</li>
          <li><strong>Viewer:</strong> Read-only access to reports</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Data & Privacy</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Export all your data anytime</li>
          <li>GDPR-compliant data handling</li>
          <li>Delete account and data permanently</li>
          <li>View API usage and logs</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// EMAIL MARKETING SECTIONS
// ============================================================================

function EmailOverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Email Marketing</h2>
        <p className="text-[var(--color-text-secondary)]">
          Connect Klaviyo to power your email automation with Haven Hub events.
          Track email performance, manage flows, and see revenue attribution.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<Mail className="h-6 w-6 text-purple-500" />}
          title="Email Dashboard"
          description="View key metrics like open rates, click rates, and email revenue at a glance."
        />
        <FeatureCard
          icon={<Zap className="h-6 w-6 text-amber-500" />}
          title="Automated Flows"
          description="Monitor your Klaviyo flows - welcome series, cart abandonment, post-purchase, and more."
        />
        <FeatureCard
          icon={<TrendingUp className="h-6 w-6 text-green-500" />}
          title="Revenue Attribution"
          description="See how much revenue is driven by each email flow and campaign."
        />
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Key Features</h3>
        <ul className="list-disc list-inside space-y-2 text-[var(--color-text-secondary)]">
          <li><strong>Flow Performance:</strong> View metrics for all your Klaviyo flows</li>
          <li><strong>Campaign Tracking:</strong> See recent email campaigns and their results</li>
          <li><strong>Event Sync:</strong> Quiz completions, cart abandonment, and purchases sync automatically</li>
          <li><strong>List Management:</strong> Create and manage Klaviyo lists from Haven Hub</li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Getting Started</h3>
        <p className="text-[var(--color-text-secondary)]">
          Go to <strong>Email → Setup</strong> to connect your Klaviyo account and configure
          the required lists and flows for Haven Hub automation.
        </p>
      </div>
    </div>
  );
}

function EmailSetupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Klaviyo Setup</h2>
        <p className="text-[var(--color-text-secondary)]">
          The Setup Wizard guides you through connecting Klaviyo and configuring
          the lists and flows needed for Haven Hub automation.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Setup Steps</h3>
        <div className="space-y-4">
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">1</span>
              </div>
              <h4 className="font-medium">Connect Klaviyo</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Add your Klaviyo API key in Settings → Integrations. Haven Hub will verify the connection.
            </p>
          </div>
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">2</span>
              </div>
              <h4 className="font-medium">Create Required Lists</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Haven Hub will create lists for All Leads, Quiz Takers, and each collection (Grounding, Wholeness, Growth).
            </p>
          </div>
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">3</span>
              </div>
              <h4 className="font-medium">Create Flows in Klaviyo</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Create your email flows in Klaviyo using Haven Hub events as triggers. The setup page provides templates.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Required Lists</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Haven Hub - All Leads</li>
          <li>Haven Hub - Quiz Takers</li>
          <li>Haven Hub - Grounding</li>
          <li>Haven Hub - Wholeness</li>
          <li>Haven Hub - Growth</li>
          <li>Haven Hub - Customers</li>
          <li>Haven Hub - VIP</li>
        </ul>
      </div>
    </div>
  );
}

function EmailFlowsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Email Flows</h2>
        <p className="text-[var(--color-text-secondary)]">
          View and monitor your Klaviyo flows from Haven Hub. See performance metrics,
          identify opportunities, and track revenue attribution.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Recommended Flows</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Welcome Series</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: List subscription. Introduce new leads to your brand over 4 emails.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Quiz Results</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: Quiz Completed event. Share personalized recommendations based on quiz results.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Cart Abandonment</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: Cart Abandoned event. Recover lost sales with timely reminders.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Post-Purchase</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: Placed Order event. Thank customers, request reviews, cross-sell.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Win-Back</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: Win Back Started event. Re-engage customers who haven't purchased recently.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">VIP Rewards</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Trigger: LTV threshold. Reward your best customers with exclusive offers.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Flow Metrics</h3>
        <p className="text-[var(--color-text-secondary)]">
          For each flow, track:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)] mt-2">
          <li>Total emails sent</li>
          <li>Open rate and click rate</li>
          <li>Revenue attributed to the flow</li>
          <li>Flow status (live, draft, paused)</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// NEW ANALYTICS SECTIONS
// ============================================================================

function ScalingPlaybookSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">16-Week Scaling Playbook</h2>
        <p className="text-[var(--color-text-secondary)]">
          A structured 16-week program to scale your Pinterest presence from foundation
          to full automation. Track weekly KPIs and phase goals.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">The Four Phases</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
            <div className="font-medium text-blue-600 mb-1">Phase 1: Foundation</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Weeks 1-4. Build your Pinterest presence with quality content.
            </p>
          </div>
          <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
            <div className="font-medium text-green-600 mb-1">Phase 2: Growth</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Weeks 5-8. Start paid advertising and drive traffic.
            </p>
          </div>
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
            <div className="font-medium text-amber-600 mb-1">Phase 3: Optimization</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Weeks 9-12. Refine for maximum ROAS and efficiency.
            </p>
          </div>
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-4">
            <div className="font-medium text-purple-600 mb-1">Phase 4: Scale</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Weeks 13-16. Maximize returns with full automation.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Weekly Tracking</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Pins published per week</li>
          <li>Impressions, saves, and clicks</li>
          <li>Ad spend and ROAS</li>
          <li>Total revenue from Pinterest</li>
          <li>Goal achievement score (0-100%)</li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Getting Started</h3>
        <p className="text-[var(--color-text-secondary)]">
          Go to <strong>Analytics → Scaling Playbook</strong> to start your 16-week journey.
          Set your targets and advance through phases as you hit milestones.
        </p>
      </div>
    </div>
  );
}

function PerformanceAlertsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Performance Alerts</h2>
        <p className="text-[var(--color-text-secondary)]">
          Set up automated alerts for important events like pin milestones,
          underperforming content, campaign CPA thresholds, and more.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Alert Types</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Pin Milestone</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Get notified when a pin hits impression or save milestones.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Underperformer Alert</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Flag pins that fall below engagement thresholds.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Campaign CPA</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Alert when cost-per-acquisition exceeds your target.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">ROAS Threshold</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Notify when ROAS drops below or exceeds targets.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Daily Spend</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Track daily ad spend against budget limits.
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
            <div className="font-medium mb-1">Winner Detected</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Celebrate when a pin achieves top-performer status.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Notification Options</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>Email notifications</li>
          <li>In-app notifications</li>
          <li>Create approval tasks for manual review</li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Configure Alerts</h3>
        <p className="text-[var(--color-text-secondary)]">
          Go to <strong>Analytics → Alerts</strong> to set up your alert rules.
          Define the metric, threshold, and what actions to take.
        </p>
      </div>
    </div>
  );
}

function AudiencesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pinterest Audiences</h2>
        <p className="text-[var(--color-text-secondary)]">
          Export customer segments as Pinterest Custom Audiences for retargeting.
          Hash customer emails securely and sync to Pinterest Ads Manager.
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">How It Works</h3>
        <div className="space-y-4">
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">1</span>
              </div>
              <h4 className="font-medium">Create Segment</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Define criteria like purchase history, quiz results, or engagement level.
            </p>
          </div>
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">2</span>
              </div>
              <h4 className="font-medium">Export to Pinterest</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Email addresses are hashed (SHA-256) and sent securely to Pinterest.
            </p>
          </div>
          <div className="border border-[var(--color-border-primary)] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center">
                <span className="font-semibold text-sage">3</span>
              </div>
              <h4 className="font-medium">Target in Ads</h4>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] pl-11">
              Use the audience in Pinterest Ads Manager for retargeting campaigns.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Audience Ideas</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li>High-value customers (LTV greater than $100)</li>
          <li>Cart abandoners (last 30 days)</li>
          <li>Quiz takers by collection preference</li>
          <li>Recent purchasers (cross-sell)</li>
          <li>Lapsed customers (win-back)</li>
          <li>Email engaged (opened in last 90 days)</li>
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Sync Options</h3>
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          <li><strong>Manual:</strong> Export when you need to update</li>
          <li><strong>Daily:</strong> Auto-sync every day</li>
          <li><strong>Weekly:</strong> Auto-sync every week</li>
          <li><strong>Monthly:</strong> Auto-sync every month</li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <h3 className="font-semibold mb-2">Requirements</h3>
        <p className="text-[var(--color-text-secondary)]">
          You need a Pinterest Business account with an Ad Account connected.
          Go to <strong>Pinterest → Audiences</strong> to get started.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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
      <span className="w-28 font-medium">{name}</span>
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

function MetricCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 text-center">
      <div className="font-medium">{title}</div>
      <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function IntegrationCard({ name, description, status }: { name: string; description: string; status: 'required' | 'optional' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
      <div>
        <div className="font-medium">{name}</div>
        <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        status === 'required'
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-600'
      }`}>
        {status}
      </span>
    </div>
  );
}
