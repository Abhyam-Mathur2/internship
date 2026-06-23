import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { FileUp, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((accepted) => {
    setFile(accepted[0]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  async function runAudit() {
    if (!file) return setError('Choose a PDF, JPG, or PNG payslip first.');
    setLoading(true);
    setError('');
    try {
      setStatus('Uploading payslip');
      const form = new FormData();
      form.append('file', file);
      const upload = await api.post('/upload-payslip', form);
      setStatus('Extracting payroll fields');
      await api.post('/extract', { payslip_id: upload.data.payslip.id });
      setStatus('Running AI payroll audit');
      const analysis = await api.post('/analyze', { payslip_id: upload.data.payslip.id });
      navigate(`/reports/${analysis.data.report.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Audit failed. Check file type, size, or API configuration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Payslip</h1>
        <p className="text-sm text-slate-500">PDF, JPG, or PNG up to 5 MB.</p>
      </div>
      <div {...getRootProps()} className={`card grid min-h-72 cursor-pointer place-items-center border-dashed text-center ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
        <input {...getInputProps()} />
        <div>
          <FileUp className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-4 text-lg font-semibold">{file ? file.name : 'Drop your payslip here'}</h2>
          <p className="mt-1 text-sm text-slate-500">or click to browse secure local files</p>
        </div>
      </div>
      {error && <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {status && <div className="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-700">{status}</div>}
      <button disabled={loading} onClick={runAudit} className="btn-primary">
        <Sparkles className="h-4 w-4" />
        {loading ? 'Auditing...' : 'Extract and Analyze'}
      </button>
    </div>
  );
}

