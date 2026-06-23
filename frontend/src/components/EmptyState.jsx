import { FileSearch } from 'lucide-react';

export function EmptyState({ title = 'No data yet', text = 'Upload a payslip to generate an audit report.' }) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center text-center">
      <FileSearch className="h-10 w-10 text-slate-400" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

