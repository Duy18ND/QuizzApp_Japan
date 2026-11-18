import { Cloud, WifiOff } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { Badge } from '../ui';

interface SupabaseStatusBadgeProps {
  connected?: boolean;
  className?: string;
}

export function SupabaseStatusBadge({ connected, className }: SupabaseStatusBadgeProps) {
  const isConnected = connected ?? isSupabaseConfigured;

  if (isConnected) {
    return (
      <Badge tone="success" className={className}>
        <Cloud className="size-3.5 shrink-0" aria-hidden />
        Đã kết nối Supabase Cloud
      </Badge>
    );
  }

  return (
    <Badge tone="warning" className={className}>
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      Chế độ Offline
    </Badge>
  );
}
