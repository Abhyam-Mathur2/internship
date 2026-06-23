import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <section>
          <div className="inline-flex rounded-md bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            AI Payroll Auditor
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Audit salary slips before payroll errors become expensive.</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Upload payslips, extract salary components, verify statutory deductions, and receive AI-backed payroll findings in minutes.
          </p>
        </section>
        <Outlet />
      </div>
    </main>
  );
}

