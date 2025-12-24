import { createClient } from '@/lib/supabase/server';
import { Gift, CreateGiftInput } from '@/types/gifts';

export async function createGift(
  userId: string,
  customerId: string | null,
  input: CreateGiftInput
): Promise<Gift> {
  const supabase = await createClient();

  // Generate gift code
  const { data: codeResult } = await (supabase as any).rpc('generate_gift_code');
  const giftCode = codeResult as string;

  const { data: gift, error } = await (supabase as any)
    .from('gifts')
    .insert({
      user_id: userId,
      sender_customer_id: customerId,
      gift_code: giftCode,
      ...input,
      status: input.scheduled_delivery_at ? 'pending' : 'delivered',
      delivered_at: input.scheduled_delivery_at ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create gift: ${error.message}`);

  // If immediate delivery, trigger email
  if (!input.scheduled_delivery_at) {
    await sendGiftNotification(gift);
  }

  return gift;
}

export async function claimGift(
  giftCode: string,
  customerId: string
): Promise<Gift> {
  const supabase = await createClient();

  const { data: gift, error } = await (supabase as any)
    .rpc('claim_gift', {
      p_gift_code: giftCode,
      p_customer_id: customerId,
    });

  if (error) throw new Error(`Failed to claim gift: ${error.message}`);

  return gift;
}

export async function getGiftByCode(giftCode: string): Promise<Gift | null> {
  const supabase = await createClient();

  const { data: gift } = await (supabase as any)
    .from('gifts')
    .select('*')
    .eq('gift_code', giftCode)
    .single();

  return gift;
}

export async function processScheduledGifts(): Promise<number> {
  const supabase = await createClient();

  // Find gifts ready to deliver
  const now = new Date().toISOString();
  const { data: gifts } = await (supabase as any)
    .from('gifts')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_delivery_at', now)
    .is('delivered_at', null);

  if (!gifts || gifts.length === 0) return 0;

  let delivered = 0;
  for (const gift of gifts) {
    try {
      await sendGiftNotification(gift);

      await (supabase as any)
        .from('gifts')
        .update({
          status: 'delivered',
          delivered_at: now,
        })
        .eq('id', gift.id);

      delivered++;
    } catch (error) {
      console.error(`Failed to deliver gift ${gift.id}:`, error);
    }
  }

  return delivered;
}

async function sendGiftNotification(gift: Gift): Promise<void> {
  // Trigger Klaviyo event for gift notification
  const klaviyoApiKey = process.env.KLAVIYO_API_KEY;
  if (!klaviyoApiKey) return;

  await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
      'Content-Type': 'application/json',
      'revision': '2024-02-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          profile: { email: gift.recipient_email },
          metric: { name: 'Gift Received' },
          properties: {
            gift_code: gift.gift_code,
            sender_name: gift.sender_name || 'Someone special',
            message: gift.message,
            claim_url: `${process.env.NEXT_PUBLIC_APP_URL}/gift/claim/${gift.gift_code}`,
            expires_at: gift.expires_at,
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });
}

export async function getGiftStats(userId: string): Promise<{
  totalGifts: number;
  pendingGifts: number;
  claimedGifts: number;
  expiredGifts: number;
}> {
  const supabase = await createClient();

  const { data: gifts } = await (supabase as any)
    .from('gifts')
    .select('status')
    .eq('user_id', userId);

  const stats = {
    totalGifts: gifts?.length || 0,
    pendingGifts: gifts?.filter((g: Gift) => g.status === 'pending').length || 0,
    claimedGifts: gifts?.filter((g: Gift) => g.status === 'claimed').length || 0,
    expiredGifts: gifts?.filter((g: Gift) => g.status === 'expired').length || 0,
  };

  return stats;
}
