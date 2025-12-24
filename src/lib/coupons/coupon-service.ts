import { createClient } from '@/lib/supabase/server';
import { Coupon, CreateCouponInput } from '@/types/coupons';

export async function createCoupon(
  userId: string,
  input: CreateCouponInput
): Promise<Coupon> {
  const supabase = await createClient();

  const { data: coupon, error } = await (supabase as any)
    .from('coupons')
    .insert({
      user_id: userId,
      code: input.code.toUpperCase(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      buy_quantity: input.buy_quantity,
      get_quantity: input.get_quantity,
      usage_limit: input.usage_limit,
      per_customer_limit: input.per_customer_limit ?? 1,
      minimum_purchase: input.minimum_purchase,
      minimum_quantity: input.minimum_quantity,
      collection_ids: input.collection_ids,
      product_ids: input.product_ids,
      exclude_sale_items: input.exclude_sale_items ?? false,
      first_time_only: input.first_time_only ?? false,
      starts_at: input.starts_at || new Date().toISOString(),
      expires_at: input.expires_at,
      description: input.description,
      internal_notes: input.internal_notes,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create coupon: ${error.message}`);

  return coupon;
}

export async function updateCoupon(
  userId: string,
  couponId: string,
  updates: Partial<CreateCouponInput & { status: string }>
): Promise<Coupon> {
  const supabase = await createClient();

  if (updates.code) {
    updates.code = updates.code.toUpperCase();
  }

  const { data: coupon, error } = await (supabase as any)
    .from('coupons')
    .update(updates)
    .eq('id', couponId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update coupon: ${error.message}`);

  return coupon;
}

export async function deleteCoupon(
  userId: string,
  couponId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('coupons')
    .delete()
    .eq('id', couponId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete coupon: ${error.message}`);
}

export async function getCouponStats(userId: string): Promise<{
  totalCoupons: number;
  activeCoupons: number;
  totalUsage: number;
  totalDiscountGiven: number;
}> {
  const supabase = await createClient();

  const { data: coupons } = await (supabase as any)
    .from('coupons')
    .select('status, usage_count, total_discount_amount')
    .eq('user_id', userId);

  return {
    totalCoupons: coupons?.length || 0,
    activeCoupons: coupons?.filter((c: any) => c.status === 'active').length || 0,
    totalUsage: coupons?.reduce((sum: number, c: any) => sum + c.usage_count, 0) || 0,
    totalDiscountGiven: coupons?.reduce((sum: number, c: any) => sum + Number(c.total_discount_amount), 0) || 0,
  };
}

export async function validateCoupon(
  userId: string,
  code: string,
  customerEmail: string,
  cartTotal: number
): Promise<{ valid: boolean; reason?: string; coupon?: Coupon }> {
  const supabase = await createClient();

  const { data: coupon } = await (supabase as any)
    .from('coupons')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code.toUpperCase())
    .single();

  if (!coupon) {
    return { valid: false, reason: 'Invalid coupon code' };
  }

  if (coupon.status !== 'active') {
    return { valid: false, reason: 'Coupon is not active' };
  }

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, reason: 'Coupon is not yet active' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, reason: 'Coupon has expired' };
  }

  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }

  if (coupon.minimum_purchase && cartTotal < coupon.minimum_purchase) {
    return {
      valid: false,
      reason: `Minimum purchase of $${coupon.minimum_purchase} required`,
    };
  }

  // Check per-customer usage
  if (coupon.per_customer_limit) {
    const { count } = await (supabase as any)
      .from('coupon_uses')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_email', customerEmail);

    if (count && count >= coupon.per_customer_limit) {
      return { valid: false, reason: 'You have already used this coupon' };
    }
  }

  return { valid: true, coupon };
}
