import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Loading } from '../components/Loading';
import { SalaryBreakdown, DeductionChart } from '../components/Charts';
import { money, riskTone } from '../utils/format';

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/report/${id}`).then(({ data }) => setReport(data.report)).finally(() => setLoading(false));
  }, [id]);

  async function exportPdf() {
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, width, height);
    pdf.save(`payroll-audit-${id}.pdf`);
  }

  async function removeReport() {
    await api.delete(`/report/${id}`);
    navigate('/reports');
  }

  if (loading) return <Loading label="Loading report" />;
  const payroll = report?.payslip?.extracted_data || {};
  const warnings = report?.verification?.warnings || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Professional Audit Report</h1>
          <p className="text-sm text-slate-500">{report.payslip?.employee?.employee_name} - {report.payslip?.month}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportPdf}><Download className="h-4 w-4" /> Export PDF</button>
          <button className="btn-secondary text-rose-600" onClick={removeReport}><Trash2 className="h-4 w-4" /> Delete</button>
        </div>
      </div>
      <section ref={reportRef} className="space-y-6 bg-white p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Employee Information</h2>
              <p className="mt-2 text-sm text-slate-500">Name: {payroll.employee_name}</p>
              <p className="text-sm text-slate-500">Employee ID: {payroll.employee_id}</p>
              <p className="text-sm text-slate-500">Working days: {payroll.working_days} - Paid days: {payroll.paid_days}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{report.audit_score}</div>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${riskTone(report.risk_level)}`}>{report.risk_level} risk</span>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card"><p className="text-sm text-slate-500">Gross Salary</p><p className="mt-2 text-2xl font-bold">{money(payroll.gross_salary)}</p></div>
          <div className="card"><p className="text-sm text-slate-500">Net Salary</p><p className="mt-2 text-2xl font-bold">{money(payroll.net_salary)}</p></div>
          <div className="card"><p className="text-sm text-slate-500">Total Deductions</p><p className="mt-2 text-2xl font-bold">{money(report.verification?.computed_total_deductions)}</p></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SalaryBreakdown payroll={payroll} />
          <DeductionChart payroll={payroll} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Audit Findings" items={warnings.length ? warnings : ['No calculation mismatch found.']} />
          <Panel title="AI Recommendations" items={report.recommendations || []} />
          <Panel title="Risk Indicators" items={report.ai_analysis?.risk_indicators || []} />
          <div className="card">
            <h3 className="font-semibold">Plain-Language Deduction Explanation</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.ai_analysis?.deduction_explanation}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, items }) {
  const normalizedItems = normalizePanelItems(items);

  return (
    <div className="card">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {normalizedItems.map((item, index) => <li key={index}>- {item}</li>)}
      </ul>
    </div>
  );
}

function normalizePanelItems(items) {
  if (!items) return ['No items.'];

  if (Array.isArray(items)) {
    const flattened = items.flatMap((item) => normalizePanelItems(item));
    return flattened.length ? flattened : ['No items.'];
  }

  if (typeof items === 'string') {
    return items.trim() ? [items] : ['No items.'];
  }

  if (typeof items === 'number' || typeof items === 'boolean') {
    return [String(items)];
  }

  if (typeof items === 'object') {
    const entries = Object.entries(items)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === '') return null;

        if (Array.isArray(value)) {
          const normalized = normalizePanelItems(value);
          return `${formatPanelKey(key)}: ${normalized.join(', ')}`;
        }

        if (typeof value === 'object') {
          return `${formatPanelKey(key)}: ${JSON.stringify(value)}`;
        }

        return `${formatPanelKey(key)}: ${value}`;
      })
      .filter(Boolean);

    return entries.length ? entries : ['No items.'];
  }

  return ['No items.'];
}

function formatPanelKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
