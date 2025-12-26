'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import {
    Plus,
    Play,
    Settings,
    Trash2,
    History as HistoryIcon,
    TrendingUp,
    TrendingDown,
    Pause as PauseIcon,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

interface PerformanceRule {
    id: string;
    name: string;
    description: string;
    metric: 'cpa' | 'roas' | 'ctr' | 'conversion_rate';
    comparison: 'less_than' | 'greater_than' | 'between';
    threshold_value: number;
    threshold_min?: number;
    threshold_max?: number;
    action_type: 'increase_budget' | 'decrease_budget' | 'pause' | 'alert' | 'flag_winner';
    action_config: any;
    is_active: boolean;
    min_spend: number;
    min_days_active: number;
    min_conversions: number;
    priority: number;
}

interface PerformanceAction {
    id: string;
    action_type: string;
    status: string;
    metrics_snapshot: any;
    created_at: string;
    performance_rules?: {
        name: string;
    };
    error_message?: string;
    executed_at?: string;
}

export default function PerformanceRulesPage() {
    const [rules, setRules] = useState<PerformanceRule[]>([]);
    const [history, setHistory] = useState<PerformanceAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('rules');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<Partial<PerformanceRule> | null>(null);

    useEffect(() => {
        fetchRules();
        fetchHistory();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/performance-rules');
            const data = await res.json();
            if (data.rules) setRules(data.rules);
        } catch (error) {
            console.error('Failed to fetch rules', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/performance-actions?status=applied');
            const data = await res.json();
            if (data.actions) setHistory(data.actions);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const handleSaveRule = async (rule: Partial<PerformanceRule>) => {
        try {
            const method = rule.id ? 'PUT' : 'POST';
            const res = await fetch('/api/performance-rules', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rule),
            });
            if (res.ok) {
                fetchRules();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to save rule', error);
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            const res = await fetch(`/api/performance-rules?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchRules();
        } catch (error) {
            console.error('Failed to delete rule', error);
        }
    };

    const toggleRule = async (id: string, currentState: boolean) => {
        try {
            const res = await fetch('/api/performance-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !currentState }),
            });
            if (res.ok) {
                setRules(rules.map(r => r.id === id ? { ...r, is_active: !currentState } : r));
            }
        } catch (error) {
            console.error('Failed to update rule', error);
        }
    };

    const getMetricLabel = (metric: string) => {
        switch (metric) {
            case 'cpa': return 'CPA';
            case 'roas': return 'ROAS';
            case 'ctr': return 'CTR';
            case 'conversion_rate': return 'Conversion Rate';
            default: return metric;
        }
    };

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'increase_budget': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
            case 'decrease_budget': return <TrendingDown className="h-4 w-4 text-orange-500" />;
            case 'pause': return <PauseIcon className="h-4 w-4 text-rose-500" />;
            case 'flag_winner': return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
            default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">Performance Rules</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Automate your Pinterest advertising strategy with intelligent scaling and protection.
                    </p>
                </div>
                <Button onClick={() => { setEditingRule(null); setIsModalOpen(true); }} className="px-6 h-12 text-md shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-5 w-5" /> Create New Rule
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="rules" className="rounded-lg px-8 py-2.5 data-[state=active]:shadow-md">
                        <Settings className="mr-2 h-4 w-4" /> Configured Rules
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-8 py-2.5 data-[state=active]:shadow-md">
                        <HistoryIcon className="mr-2 h-4 w-4" /> Execution History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6">
                        {loading ? (
                            <div className="grid gap-6">
                                {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/20" />)}
                            </div>
                        ) : rules.length > 0 ? (
                            rules.map((rule) => (
                                <Card key={rule.id} className={`group border-2 transition-all hover:border-primary/30 hover:shadow-xl ${!rule.is_active ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="p-6 flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg bg-muted`}>
                                                        {getActionIcon(rule.action_type)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold">{rule.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                                                    </div>
                                                </div>
                                                <div className="md:hidden">
                                                    <Switch
                                                        checked={rule.is_active}
                                                        onChange={() => toggleRule(rule.id, rule.is_active)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Metric</label>
                                                    <span className="font-semibold">{getMetricLabel(rule.metric)}</span>
                                                </div>
                                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Condition</label>
                                                    <span className="font-semibold">
                                                        {rule.comparison === 'less_than' ? 'Under' : rule.comparison === 'greater_than' ? 'Over' : 'Between'} {
                                                            rule.comparison === 'between'
                                                                ? `${rule.threshold_min} - ${rule.threshold_max}`
                                                                : (rule.metric === 'cpa' || rule.metric === 'roas' ? `$${rule.threshold_value}` : `${rule.threshold_value}%`)
                                                        }
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Action</label>
                                                    <Badge className="font-bold border-none" variant={
                                                        rule.action_type === 'increase_budget' ? 'success' :
                                                            rule.action_type === 'pause' ? 'error' : 'secondary'
                                                    }>
                                                        {rule.action_type.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Min Requirements</label>
                                                    <span className="text-xs font-medium">
                                                        ${rule.min_spend} spend • {rule.min_days_active}d
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col items-center justify-center border-l w-32 gap-6 pl-6">
                                            <div className="flex flex-col items-center gap-2">
                                                <Switch
                                                    checked={rule.is_active}
                                                    onChange={() => toggleRule(rule.id, rule.is_active)}
                                                />
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                                                    {rule.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => { setEditingRule(rule); setIsModalOpen(true); }} className="hover:bg-primary/10 hover:text-primary">
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteRule(rule.id)} className="hover:bg-destructive/10 hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed rounded-3xl bg-muted/10 opacity-60">
                                <Settings className="h-16 w-16 mb-4 text-muted-foreground" />
                                <h3 className="text-2xl font-bold">No Rules Configured</h3>
                                <p className="text-muted-foreground max-w-sm text-center mt-2">
                                    Start by creating a rule to automatically manage your ad campaigns based on ROI or CPA targets.
                                </p>
                                <Button className="mt-8" variant="secondary" onClick={() => { setEditingRule(null); setIsModalOpen(true); }}>
                                    <Plus className="mr-2 h-4 w-4" /> Create First Rule
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-none shadow-none bg-transparent">
                        <div className="space-y-4">
                            {history.length > 0 ? (
                                <div className="border rounded-2xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="px-6 py-4 font-bold text-sm">Time</th>
                                                <th className="px-6 py-4 font-bold text-sm">Rule</th>
                                                <th className="px-6 py-4 font-bold text-sm">Action</th>
                                                <th className="px-6 py-4 font-bold text-sm">Trigger Metrics</th>
                                                <th className="px-6 py-4 font-bold text-sm">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-zinc-900 divide-y">
                                            {history.map((action) => (
                                                <tr key={action.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            {new Date(action.created_at).toLocaleDateString()}<br />
                                                            {new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {action.performance_rules?.name || 'Manual Rule'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {getActionIcon(action.action_type)}
                                                            <span className="capitalize">{action.action_type.replace('_', ' ')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs space-y-1">
                                                            <span className="inline-block px-1.5 py-0.5 bg-muted rounded">CPA: ${action.metrics_snapshot.cpa.toFixed(2)}</span>
                                                            <span className="inline-block px-1.5 py-0.5 bg-muted rounded ml-1">ROAS: {action.metrics_snapshot.roas.toFixed(2)}x</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={action.status === 'applied' ? 'success' : 'error'} className="rounded-full">
                                                            {action.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                                    <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-lg font-medium">No execution history yet</p>
                                    <p className="text-sm text-muted-foreground">Historical actions taken by the engine will appear here.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <RuleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                rule={editingRule}
                onSave={handleSaveRule}
            />
        </div>
    );
}

function RuleModal({ isOpen, onClose, rule, onSave }: { isOpen: boolean, onClose: () => void, rule: Partial<PerformanceRule> | null, onSave: (rule: Partial<PerformanceRule>) => void }) {
    const [formData, setFormData] = useState<Partial<PerformanceRule>>({
        name: '',
        description: '',
        metric: 'cpa',
        comparison: 'less_than',
        threshold_value: 0,
        action_type: 'increase_budget',
        action_config: { percentage: 20 },
        min_spend: 50,
        min_days_active: 7,
        min_conversions: 3,
        priority: 10,
        ...rule
    });

    useEffect(() => {
        if (rule) setFormData({ ...rule });
        else setFormData({
            name: '',
            description: '',
            metric: 'cpa',
            comparison: 'less_than',
            threshold_value: 0,
            action_type: 'increase_budget',
            action_config: { percentage: 20 },
            min_spend: 50,
            min_days_active: 7,
            min_conversions: 3,
            priority: 10,
        });
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={rule ? 'Edit Rule' : 'Create New Performance Rule'}
            size="lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} className="px-8 shadow-md">
                        {rule ? 'Update Rule' : 'Save Rule'}
                    </Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rule Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Scale Winners (CPA < $8)"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="h-11 rounded-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                        <Input
                            id="description"
                            placeholder="Describe what this rule does"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="h-11 rounded-lg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Metric to Monitor</Label>
                        <select
                            className="w-full flex h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.metric}
                            onChange={e => setFormData({ ...formData, metric: e.target.value as any })}
                        >
                            <option value="cpa">CPA (Cost Per Action)</option>
                            <option value="roas">ROAS (Return on Ad Spend)</option>
                            <option value="ctr">CTR (Click-Through Rate)</option>
                            <option value="conversion_rate">Conversion Rate</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Comparison</Label>
                        <select
                            className="w-full flex h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.comparison}
                            onChange={e => setFormData({ ...formData, comparison: e.target.value as any })}
                        >
                            <option value="less_than">Less Than</option>
                            <option value="greater_than">Greater Than</option>
                            <option value="between">Between</option>
                        </select>
                    </div>
                </div>

                {formData.comparison === 'between' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Min Value</Label>
                            <Input type="number" value={formData.threshold_min} onChange={e => setFormData({ ...formData, threshold_min: Number(e.target.value) })} className="h-11 rounded-lg" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Max Value</Label>
                            <Input type="number" value={formData.threshold_max} onChange={e => setFormData({ ...formData, threshold_max: Number(e.target.value) })} className="h-11 rounded-lg" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Threshold Value</Label>
                        <Input type="number" value={formData.threshold_value} onChange={e => setFormData({ ...formData, threshold_value: Number(e.target.value) })} className="h-11 rounded-lg" />
                    </div>
                )}

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                    <h4 className="text-sm font-bold uppercase text-primary">Automation Action</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Type</Label>
                            <select
                                className="w-full flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={formData.action_type}
                                onChange={e => setFormData({ ...formData, action_type: e.target.value as any })}
                            >
                                <option value="increase_budget">Increase Budget</option>
                                <option value="decrease_budget">Decrease Budget</option>
                                <option value="pause">Pause Campaign</option>
                                <option value="flag_winner">Flag as Winner</option>
                                <option value="alert">Alert Only</option>
                            </select>
                        </div>
                        {formData.action_type?.includes('budget') && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Percentage Change</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.action_config?.percentage}
                                        onChange={e => setFormData({ ...formData, action_config: { ...formData.action_config, percentage: Number(e.target.value) } })}
                                        className="h-10 rounded-lg pr-8"
                                    />
                                    <span className="absolute right-3 top-2.5 text-muted-foreground text-xs">%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase text-muted-foreground">Guardrails (Minimums)</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min Spend ($)</Label>
                            <Input type="number" value={formData.min_spend} onChange={e => setFormData({ ...formData, min_spend: Number(e.target.value) })} className="h-10 rounded-lg text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min Days Active</Label>
                            <Input type="number" value={formData.min_days_active} onChange={e => setFormData({ ...formData, min_days_active: Number(e.target.value) })} className="h-10 rounded-lg text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min Conversions</Label>
                            <Input type="number" value={formData.min_conversions} onChange={e => setFormData({ ...formData, min_conversions: Number(e.target.value) })} className="h-10 rounded-lg text-center" />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
