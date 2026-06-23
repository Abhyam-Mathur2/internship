export function StatCard({ title, value, icon: Icon, hint }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-blue-600" />}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

