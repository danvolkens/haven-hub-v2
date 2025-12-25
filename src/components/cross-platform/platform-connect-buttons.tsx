'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PlatformConnection {
  platform: 'tiktok' | 'instagram';
  status: 'active' | 'expired' | 'disconnected' | 'error';
  accountName?: string;
  lastSyncAt?: string;
}

interface PlatformConnectButtonsProps {
  connections: PlatformConnection[];
  onDisconnect?: (platform: string) => void;
  onSync?: (platform: string) => void;
}

const PLATFORM_INFO = {
  tiktok: {
    name: 'TikTok',
    icon: '/icons/tiktok.svg',
    description: 'Connect your TikTok Business account to sync video performance',
    connectUrl: '/api/integrations/tiktok/install',
    color: 'bg-black',
  },
  instagram: {
    name: 'Instagram',
    icon: '/icons/instagram.svg',
    description: 'Connect your Instagram Business account to track post performance',
    connectUrl: '/api/integrations/instagram/install',
    color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
  },
};

export function PlatformConnectButtons({
  connections,
  onDisconnect,
  onSync,
}: PlatformConnectButtonsProps) {
  const getConnectionStatus = (platform: 'tiktok' | 'instagram') => {
    return connections.find((c) => c.platform === platform);
  };

  const renderPlatformCard = (platform: 'tiktok' | 'instagram') => {
    const info = PLATFORM_INFO[platform];
    const connection = getConnectionStatus(platform);
    const isConnected = connection?.status === 'active';
    const hasError = connection?.status === 'error' || connection?.status === 'expired';

    return (
      <Card key={platform} className="p-4">
        <div className="flex items-start gap-4">
          {/* Platform Icon */}
          <div
            className={`w-12 h-12 rounded-lg ${info.color} flex items-center justify-center text-white font-bold text-xl`}
          >
            {platform === 'tiktok' ? 'TT' : 'IG'}
          </div>

          {/* Platform Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{info.name}</h4>
              {isConnected && (
                <Badge variant="success" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
              {hasError && (
                <Badge variant="error" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {connection?.status === 'expired' ? 'Token Expired' : 'Error'}
                </Badge>
              )}
            </div>

            {isConnected && connection?.accountName && (
              <p className="text-sm text-muted-foreground mb-2">
                @{connection.accountName}
                {connection.lastSyncAt && (
                  <span className="ml-2">
                    Last synced: {new Date(connection.lastSyncAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            )}

            {!isConnected && (
              <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSync?.(platform)}
                    leftIcon={<RefreshCw className="h-3 w-3" />}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDisconnect?.(platform)}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = info.connectUrl;
                  }}
                >
                  Connect {info.name}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-1">Cross-Platform Connections</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your social accounts to track content performance and discover winners
        </p>
      </div>

      <div className="space-y-3">
        {renderPlatformCard('tiktok')}
        {renderPlatformCard('instagram')}
      </div>
    </div>
  );
}
