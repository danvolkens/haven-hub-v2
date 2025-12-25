'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PerformanceAction {
    id: string;
    action_type: string;
    campaign_id: string;
    status: string;
    new_value: any;
    previous_value: any;
    metrics_snapshot: any;
    performance_rules?: {
        name: string;
    };
    created_at: string;
}

export function PerformanceActionsWidget({ userId }: { userId: string }) {
    const [actions, setActions] = useState<PerformanceAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchActions();
    }, []);

    const fetchActions = async () => {
        try {
            const res = await fetch('/api/performance-actions?status=pending');
            if (res.ok) {
                const data = await res.json();
                setActions(data.actions || []);
            }
        } catch (error) {
            console.error('Failed to fetch performance actions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (actionId: string, decision: 'approve' | 'reject') => {
        setProcessingId(actionId);
        try {
            const res = await fetch('/api/performance-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_id: actionId, decision }),
            });
            if (res.ok) {
                setActions(actions.filter(a => a.id !== actionId));
            }
        } catch (error) {
            console.error('Failed to process action', error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && actions.length === 0) {
        return (
            <Card className="p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="space-y-2">
                        <div className="h-12 bg-muted rounded"></div>
                        <div className="h-12 bg-muted rounded"></div>
                    </div>
                </div>
            </Card>
        );
    }

    if (actions.length === 0) {
        return null; // Don't show if nothing pending
    }

    return (
        <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Performance Actions
                    <Badge variant="secondary" className="ml-1">{actions.length}</Badge>
                </h3>
                <Link href="/dashboard/pinterest/settings/performance-rules" className="text-xs text-primary hover:underline">
                    Manage Rules
                </Link>
            </div>

            <div className="space-y-4">
                {actions.map((action) => (
                    <div key={action.id} className="p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium">
                                    {action.performance_rules?.name || 'Automated Action'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {action.action_type.replace('_', ' ')}
                                </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase">
                                Pending
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-muted/50 rounded">
                                <span className="block text-muted-foreground mb-1">CPA</span>
                                <span className="font-mono font-medium">${action.metrics_snapshot.cpa.toFixed(2)}</span>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                                <span className="block text-muted-foreground mb-1">Change</span>
                                <span className="font-medium">
                                    {action.action_type === 'increase_budget' ? '+' : action.action_type === 'decrease_budget' ? '-' : ''}
                                    {action.action_type.includes('budget') ?
                                        `$${Math.abs(action.new_value.daily_budget - action.previous_value.daily_budget).toFixed(2)}` :
                                        'Pause'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 h-8"
                                onClick={() => handleDecision(action.id, 'approve')}
                                disabled={processingId === action.id}
                            >
                                <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDecision(action.id, 'reject')}
                                disabled={processingId === action.id}
                            >
                                <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
