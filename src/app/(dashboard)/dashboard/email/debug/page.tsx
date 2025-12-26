'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  CheckCircle2,
  XCircle,
  Zap,
  ShoppingCart,
  CreditCard,
  Heart,
  MousePointer,
  UserPlus,
  RotateCcw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventLog {
  eventType: string;
  testEmail: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

const EVENT_TYPES = [
  {
    id: 'quiz_completed',
    name: 'Quiz Completed',
    description: 'Triggers when a user completes the style quiz',
    icon: Zap,
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'cart_abandoned',
    name: 'Cart Abandoned',
    description: 'Triggers when a cart is abandoned after 1 hour',
    icon: ShoppingCart,
    color: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'placed_order',
    name: 'Placed Order',
    description: 'Triggers when an order is completed',
    icon: CreditCard,
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'pin_save',
    name: 'Pin Save',
    description: 'Triggers when a user saves a pin',
    icon: Heart,
    color: 'bg-pink-100 text-pink-800',
  },
  {
    id: 'pin_click',
    name: 'Pin Click',
    description: 'Triggers when a user clicks through from a pin',
    icon: MousePointer,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'lead_captured',
    name: 'Lead Captured',
    description: 'Triggers when a new lead is captured',
    icon: UserPlus,
    color: 'bg-teal-100 text-teal-800',
  },
  {
    id: 'win_back_started',
    name: 'Win Back Started',
    description: 'Triggers for lapsed customers (90+ days)',
    icon: RotateCcw,
    color: 'bg-amber-100 text-amber-800',
  },
];

export default function KlaviyoDebugPage() {
  const [testEmail, setTestEmail] = useState('');
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Fetch metrics to verify events are registered
  const { data: metricsData } = useQuery({
    queryKey: ['klaviyo-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/klaviyo/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
  });

  // Send test event mutation
  const sendEvent = useMutation({
    mutationFn: async (eventType: string) => {
      const res = await fetch('/api/klaviyo/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, testEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send event');
      }
      return data;
    },
    onSuccess: (data) => {
      setEventLogs((prev) => [
        {
          eventType: data.eventType,
          testEmail: data.testEmail,
          timestamp: data.timestamp,
          success: true,
        },
        ...prev,
      ]);
      setSelectedEvent(null);
    },
    onError: (error, variables) => {
      setEventLogs((prev) => [
        {
          eventType: variables,
          testEmail,
          timestamp: new Date().toISOString(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ...prev,
      ]);
      setSelectedEvent(null);
    },
  });

  const handleSendEvent = (eventType: string) => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }
    setSelectedEvent(eventType);
    sendEvent.mutate(eventType);
  };

  const registeredMetrics = metricsData?.metrics || [];
  const getMetricStatus = (eventName: string) => {
    return registeredMetrics.some(
      (m: { name: string }) => m.name.toLowerCase() === eventName.toLowerCase()
    );
  };

  return (
    <PageContainer
      title="Event Testing & Debugging"
      description="Test Klaviyo events and verify they trigger flows correctly"
    >
      {/* Test Email Input */}
      <Card className="p-4 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Test Email Address</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Events will be sent to this email. Use your own email to test
              flows.
            </p>
          </div>
        </div>
      </Card>

      {/* Event Types Grid */}
      <h2 className="text-lg font-semibold mb-4">Available Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {EVENT_TYPES.map((event) => {
          const Icon = event.icon;
          const isRegistered = getMetricStatus(event.name);
          const isLoading = selectedEvent === event.id && sendEvent.isPending;

          return (
            <Card key={event.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className={cn('p-2 rounded', event.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{event.name}</h3>
                    {isRegistered && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-100 text-green-800"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => handleSendEvent(event.id)}
                disabled={!testEmail || isLoading}
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Event
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Event Log */}
      <h2 className="text-lg font-semibold mb-4">Event Log</h2>
      {eventLogs.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Events Sent Yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter a test email above and click "Send Test Event" to test your
            Klaviyo integration.
          </p>
        </Card>
      ) : (
        <Card className="divide-y">
          {eventLogs.map((log, index) => (
            <div key={index} className="p-4 flex items-center gap-4">
              {log.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {EVENT_TYPES.find((e) => e.id === log.eventType)?.name ||
                      log.eventType}
                  </span>
                  <span className="text-sm text-muted-foreground">→</span>
                  <span className="text-sm truncate">{log.testEmail}</span>
                </div>
                {log.error && (
                  <p className="text-sm text-red-600 mt-1">{log.error}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Registered Metrics */}
      <h2 className="text-lg font-semibold mb-4 mt-8">Registered Metrics</h2>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-4">
          These are the event metrics registered in your Klaviyo account. Events
          appear here after being sent at least once.
        </p>
        {registeredMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No metrics found. Send test events to register them.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {registeredMetrics.map((metric: { id: string; name: string }) => (
              <Badge key={metric.id} variant="secondary">
                {metric.name}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Flow Verification Tips */}
      <Card className="p-4 mt-6 bg-muted/50">
        <h3 className="font-medium mb-2">Testing Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • Use your own email to receive test emails and verify flow
            triggers
          </li>
          <li>
            • Check Klaviyo's Activity Feed to see events in real-time
          </li>
          <li>
            • Events may take 1-2 minutes to appear in Klaviyo
          </li>
          <li>
            • Ensure flows are set to "Live" status to receive test triggers
          </li>
          <li>
            • Some flows have send limits - check "Already in flow" settings
          </li>
        </ul>
      </Card>
    </PageContainer>
  );
}
