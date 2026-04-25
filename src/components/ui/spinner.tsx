import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps): React.ReactElement {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}
