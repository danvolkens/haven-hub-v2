'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Gift, Check, AlertCircle } from 'lucide-react';

export default function ClaimGiftPage() {
  const params = useParams();
  const giftCode = params.code as string;

  const [gift, setGift] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function fetchGift() {
      try {
        const response = await fetch(`/api/gifts/claim/${giftCode}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Gift not found');
        }
        const data = await response.json();
        setGift(data.gift);

        if (data.gift.status === 'claimed') {
          setClaimed(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gift');
      } finally {
        setIsLoading(false);
      }
    }

    fetchGift();
  }, [giftCode]);

  const handleClaim = async () => {
    if (!email) return;

    setIsClaiming(true);
    try {
      const response = await fetch(`/api/gifts/claim/${giftCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim gift');
      }

      setClaimed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim gift');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Gift Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Gift Claimed!</h1>
          <p className="text-muted-foreground mb-6">
            Your gift has been claimed. Check your email for download instructions.
          </p>
          <Link href="/" className={buttonVariants({ variant: 'primary' })}>
            Continue Shopping
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-sage-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">You've Received a Gift!</h1>
          {gift?.sender_name && (
            <p className="text-muted-foreground">
              From {gift.sender_name}
            </p>
          )}
        </div>

        {gift?.message && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 italic text-center">
            &ldquo;{gift.message}&rdquo;
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Enter your email to claim
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={!email || isClaiming}
          >
            {isClaiming ? 'Claiming...' : 'Claim Gift'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Expires: {new Date(gift?.expires_at).toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}
