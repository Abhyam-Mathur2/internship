import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { money } from '../utils/format';

const colors = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function SalaryBreakdown({ payroll }) {
  const data = [
    ['Basic', payroll?.basic_salary],
    ['HRA', payroll?.hra],
    ['Allowances', payroll?.allowances],
    ['Bonus', payroll?.bonus],
    ['Overtime', payroll?.overtime],
  ].map(([name, value]) => ({ name, value: Number(value || 0) }));

  return (
    <div className="card">
      <h3 className="font-semibold">Salary Breakdown</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
              {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => money(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DeductionChart({ payroll }) {
  const data = [
    { name: 'PF', value: Number(payroll?.pf || 0) },
    { name: 'ESI', value: Number(payroll?.esi || 0) },
    { name: 'TDS', value: Number(payroll?.tds || 0) },
    { name: 'Other', value: Number(payroll?.other_deductions || 0) },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold">Deduction Analysis</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => money(value)} />
            <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TrendChart({ reports }) {
  const data = reports.map((report) => ({
    month: report.payslip?.month || `#${report.id}`,
    gross: Number(report.payslip?.gross_salary || 0),
    net: Number(report.payslip?.net_salary || 0),
    score: Number(report.audit_score || 0),
  })).reverse();

  return (
    <div className="card lg:col-span-2">
      <h3 className="font-semibold">Monthly Trends</h3>
      <div className="mt-4 h-80">
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="gross" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="net" stroke="#14b8a6" strokeWidth={2} />
            <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

