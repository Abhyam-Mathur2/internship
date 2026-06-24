import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: 'VALID' | 'INVALID' | 'SUSPICIOUS';
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  switch (verdict) {
    case 'VALID':
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          VALID
        </span>
      );
    case 'SUSPICIOUS':
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          SUSPICIOUS
        </span>
      );
    case 'INVALID':
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400">
          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          INVALID
        </span>
      );
    default:
      return null;
  }
}
