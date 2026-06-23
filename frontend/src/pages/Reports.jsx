import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { money, riskTone } from '../utils/format';

export function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports').then(({ data }) => setReports(data.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading reports" />;
  if (!reports.length) return <EmptyState title="No reports found" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Reports</h1>
      <div className="grid gap-4">
        {reports.map((report) => (
          <Link key={report.id} to={`/reports/${report.id}`} className="card block hover:border-blue-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{report.payslip?.employee?.employee_name || 'Employee'} - {report.payslip?.month || 'Unknown month'}</h2>
                <p className="mt-1 text-sm text-slate-500">Gross {money(report.payslip?.gross_salary)} - Net {money(report.payslip?.net_salary)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${riskTone(report.risk_level)}`}>{report.risk_level}</span>
                <span className="text-xl font-bold">{report.audit_score}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
