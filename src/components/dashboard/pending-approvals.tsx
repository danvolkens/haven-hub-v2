import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import Link from 'next/link';

interface PendingApprovalsProps {
  userId: string;
}

export async function PendingApprovals({ userId }: PendingApprovalsProps) {
  const supabase = await createClient();

  // Fetch pending approvals
  const { data: approvals, count } = await (supabase as any)
    .from('approvals')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Approvals
        </h3>
        {count && count > 0 && (
          <Badge variant="secondary">{count}</Badge>
        )}
      </div>
      <div className="space-y-3">
        {approvals && approvals.length > 0 ? (
          <>
            {approvals.map((approval: any) => (
              <div key={approval.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{approval.title || approval.type}</span>
                <Badge variant="outline" className="text-xs">
                  {approval.type}
                </Badge>
              </div>
            ))}
            <Link
              href="/dashboard/approvals"
              className="block text-sm text-primary hover:underline mt-2"
            >
              View all approvals →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No pending approvals</p>
        )}
      </div>
    </Card>
  );
}
