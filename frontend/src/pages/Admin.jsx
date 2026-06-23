import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
import { money } from '../utils/format';

export function Admin() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.get('/admin/users'), api.get('/admin/payslips')])
      .then(([u, p]) => {
        setUsers(u.data.data || []);
        setPayslips(p.data.data || []);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="card">
        <ShieldAlert className="h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-xl font-bold">Admin access required</h1>
      </div>
    );
  }

  if (loading) return <Loading label="Loading admin panel" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="font-semibold">Users</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{user.name}</td><td>{user.email}</td><td>{user.role}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="font-semibold">Uploaded Payslips</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Employee</th><th>Month</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>{payslips.map((p) => <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{p.employee?.employee_name}</td><td>{p.month || '-'}</td><td>{money(p.net_salary)}</td><td>{p.status}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

