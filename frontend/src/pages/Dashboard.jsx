import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Banknote, HeartPulse, TrendingDown, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { DeductionChart, SalaryBreakdown, TrendChart } from '../components/Charts';
import { money, riskTone } from '../utils/format';

export function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports').then(({ data }) => setReports(data.data || [])).finally(() => setLoading(false));
  }, []);

  const latest = reports[0];
  const payroll = latest?.payslip?.extracted_data || {};
  const deductions = useMemo(() => Number(payroll.pf || 0) + Number(payroll.esi || 0) + Number(payroll.tds || 0) + Number(payroll.other_deductions || 0), [payroll]);

  if (loading) return <Loading label="Loading dashboard" />;
  if (!latest) return <EmptyState title="No audit reports yet" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payroll Dashboard</h1>
          <p className="text-sm text-slate-500">Latest payroll health and salary trends.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${riskTone(latest.risk_level)}`}>
          {latest.risk_level} risk
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Audit Score" value={`${latest.audit_score}/100`} icon={BadgeCheck} hint="Latest payslip score" />
        <StatCard title="Gross Salary" value={money(latest.payslip?.gross_salary)} icon={Banknote} />
        <StatCard title="Net Salary" value={money(latest.payslip?.net_salary)} icon={Wallet} />
        <StatCard title="Total Deductions" value={money(deductions)} icon={TrendingDown} />
        <StatCard title="Payroll Health" value={latest.audit_score >= 80 ? 'Healthy' : 'Needs review'} icon={HeartPulse} />
        <StatCard title="Warnings" value={(latest.verification?.warnings || []).length} icon={AlertTriangle} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryBreakdown payroll={payroll} />
        <DeductionChart payroll={payroll} />
        <TrendChart reports={reports} />
      </div>
    </div>
  );
}

