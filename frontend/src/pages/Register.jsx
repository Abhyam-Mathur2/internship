import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', employee_code: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md justify-self-center">
      <h2 className="text-2xl font-bold">Create account</h2>
      <p className="mt-1 text-sm text-slate-500">Start auditing salary slips securely.</p>
      {error && <div className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <label className="mt-6 block text-sm font-medium">Name</label>
      <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="mt-4 block text-sm font-medium">Email</label>
      <input className="input mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <label className="mt-4 block text-sm font-medium">Employee code</label>
      <input className="input mt-1" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
      <label className="mt-4 block text-sm font-medium">Password</label>
      <input className="input mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button disabled={loading} className="btn-primary mt-6 w-full">{loading ? 'Creating...' : 'Create account'}</button>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered? <Link className="font-semibold text-blue-600" to="/login">Sign in</Link>
      </p>
    </form>
  );
}

