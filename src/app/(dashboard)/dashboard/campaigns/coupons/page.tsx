'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coupon, CouponStatus, CouponDiscountType } from '@/types/coupons';
import { Plus, Edit2, Trash2, Copy, Tag, Percent, DollarSign, Truck } from 'lucide-react';

const STATUS_BADGES: Record<CouponStatus, { variant: 'default' | 'success' | 'warning' | 'secondary'; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'warning', label: 'Paused' },
  expired: { variant: 'secondary', label: 'Expired' },
  depleted: { variant: 'secondary', label: 'Depleted' },
};

const DISCOUNT_ICONS: Record<CouponDiscountType, React.ComponentType<{ className?: string }>> = {
  percentage: Percent,
  fixed_amount: DollarSign,
  free_shipping: Truck,
  buy_x_get_y: Tag,
};

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage' as CouponDiscountType,
    discount_value: 10,
    usage_limit: undefined as number | undefined,
    expires_at: '',
    description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await fetch('/api/coupons?stats=true');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (coupon: typeof newCoupon) => {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon),
      });
      if (!response.ok) throw new Error('Failed to create coupon');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setIsCreateOpen(false);
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        usage_limit: undefined,
        expires_at: '',
        description: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });

  const coupons = data?.coupons || [];
  const stats = data?.stats;

  const formatDiscount = (coupon: Coupon): string => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% off`;
      case 'fixed_amount':
        return `$${coupon.discount_value} off`;
      case 'free_shipping':
        return 'Free shipping';
      case 'buy_x_get_y':
        return `Buy ${coupon.buy_quantity} get ${coupon.get_quantity}`;
      default:
        return '';
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <PageContainer
      title="Coupons"
      description="Manage discount codes and promotions"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      }
    >
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-[var(--color-text-secondary)]">Total Coupons</div>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--color-text-secondary)]">Active</div>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--color-text-secondary)]">Total Uses</div>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-[var(--color-text-secondary)]">Discount Given</div>
            <div className="text-2xl font-bold">
              ${stats.totalDiscountGiven.toLocaleString()}
            </div>
          </Card>
        </div>
      )}

      {/* Coupons List */}
      {isLoading ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading...</div>
      ) : coupons.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">No coupons yet</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Coupon
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon: Coupon) => {
            const Icon = DISCOUNT_ICONS[coupon.discount_type];
            return (
              <Card key={coupon.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-sage-pale rounded-lg">
                      <Icon className="h-5 w-5 text-sage" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg">{coupon.code}</code>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 hover:bg-elevated rounded"
                        >
                          <Copy className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                        </button>
                        <Badge variant={STATUS_BADGES[coupon.status].variant}>
                          {STATUS_BADGES[coupon.status].label}
                        </Badge>
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {formatDiscount(coupon)}
                        {coupon.expires_at && (
                          <> &bull; Expires {new Date(coupon.expires_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-semibold">{coupon.usage_count}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {coupon.usage_limit ? `of ${coupon.usage_limit}` : 'uses'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${Number(coupon.total_discount_amount).toLocaleString()}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">discounted</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm('Delete this coupon?')) {
                            deleteMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Coupon"
      >
        <div className="space-y-4">
          <div>
            <Label>Coupon Code</Label>
            <Input
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
            />
          </div>

          <div>
            <Label>Discount Type</Label>
            <Select
              value={newCoupon.discount_type}
              onChange={(value) => setNewCoupon({ ...newCoupon, discount_type: value as CouponDiscountType })}
              options={[
                { value: 'percentage', label: 'Percentage Off' },
                { value: 'fixed_amount', label: 'Fixed Amount Off' },
                { value: 'free_shipping', label: 'Free Shipping' },
              ]}
            />
          </div>

          {newCoupon.discount_type !== 'free_shipping' && (
            <div>
              <Label>
                {newCoupon.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                type="number"
                value={newCoupon.discount_value}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
              />
            </div>
          )}

          <div>
            <Label>Usage Limit (optional)</Label>
            <Input
              type="number"
              value={newCoupon.usage_limit || ''}
              onChange={(e) => setNewCoupon({
                ...newCoupon,
                usage_limit: e.target.value ? Number(e.target.value) : undefined,
              })}
              placeholder="Unlimited"
            />
          </div>

          <div>
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={newCoupon.expires_at}
              onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newCoupon)}
              disabled={!newCoupon.code || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
