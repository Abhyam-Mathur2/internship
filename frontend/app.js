// Vanilla JS App Core for AI Payroll Auditor

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8000/api';

// State Management
let currentUser = JSON.parse(localStorage.getItem('payroll_user') || 'null');
let currentToken = localStorage.getItem('payroll_token') || '';
let activeCharts = [];

// Helper to make API requests with Authorization interceptor
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('payroll_token');
      localStorage.removeItem('payroll_user');
      currentUser = null;
      currentToken = '';
      window.location.hash = '#login';
      throw new Error('Unauthorized session. Please login again.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

// Format currency
function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

// Risk Tone Styling
function getRiskToneClass(risk) {
  switch (risk?.toLowerCase()) {
    case 'low': return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'medium': return 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400';
    case 'high': return 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-400';
    default: return 'bg-slate-50 text-slate-700 ring-slate-600/20';
  }
}

// Destroys previous chart instances to prevent memory leaks / canvas reuse errors
function clearActiveCharts() {
  activeCharts.forEach(chart => chart.destroy());
  activeCharts = [];
}

// SPA Router
async function handleRouting() {
  clearActiveCharts();
  const hash = window.location.hash || '#dashboard';
  
  const authLayout = document.getElementById('auth-layout');
  const appLayout = document.getElementById('app-layout');
  const mainContent = document.getElementById('main-content');
  
  // Auth guard check
  if (!currentToken) {
    if (hash !== '#register') {
      window.location.hash = '#login';
      renderLogin();
      authLayout.classList.remove('hidden');
      appLayout.classList.add('hidden');
      return;
    } else {
      renderRegister();
      authLayout.classList.remove('hidden');
      appLayout.classList.add('hidden');
      return;
    }
  }

  // If logged in and hitting auth pages, redirect to dashboard
  if (hash === '#login' || hash === '#register') {
    window.location.hash = '#dashboard';
    return;
  }

  // Setup app shell details
  authLayout.classList.add('hidden');
  appLayout.classList.remove('hidden');
  document.getElementById('header-username').textContent = currentUser?.name || 'User';
  
  // Hide admin link if not admin
  const adminLinks = document.querySelectorAll('.admin-only');
  adminLinks.forEach(link => {
    if (currentUser?.role === 'admin') {
      link.classList.remove('hidden');
    } else {
      link.classList.add('hidden');
    }
  });

  // Load appropriate page view
  if (hash === '#dashboard') {
    await renderDashboard(mainContent);
  } else if (hash === '#upload') {
    renderUpload(mainContent);
  } else if (hash === '#reports') {
    await renderReports(mainContent);
  } else if (hash.startsWith('#report-detail/')) {
    const id = hash.split('/')[1];
    await renderReportDetail(mainContent, id);
  } else if (hash === '#admin') {
    await renderAdmin(mainContent);
  } else {
    window.location.hash = '#dashboard';
  }

  // Refresh Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Theme toggler
function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  updateThemeIcon(isDark);

  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const darkNow = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', darkNow ? 'dark' : 'light');
    updateThemeIcon(darkNow);
  });
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle-btn');
  if (isDark) {
    btn.innerHTML = `<i data-lucide="sun" class="h-4 w-4"></i>`;
  } else {
    btn.innerHTML = `<i data-lucide="moon" class="h-4 w-4"></i>`;
  }
  if (window.lucide) window.lucide.createIcons();
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (e) {
    console.error(e);
  } finally {
    localStorage.removeItem('payroll_token');
    localStorage.removeItem('payroll_user');
    currentUser = null;
    currentToken = '';
    window.location.hash = '#login';
  }
});

// View Renderers
function renderLogin() {
  const container = document.getElementById('auth-view');
  container.innerHTML = `
    <form id="login-form" class="card w-full max-w-md justify-self-center">
      <h2 class="text-2xl font-bold">Sign in</h2>
      <p class="mt-1 text-sm text-slate-500">Use your employee account to audit payslips.</p>
      <div id="login-error" class="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 hidden"></div>
      
      <label class="mt-6 block text-sm font-medium">Email</label>
      <input id="login-email" class="input mt-1" type="email" value="employee@payrollaudit.test" required />
      
      <label class="mt-4 block text-sm font-medium">Password</label>
      <input id="login-password" class="input mt-1" type="password" value="password" required />
      
      <button id="login-submit" class="btn-primary mt-6 w-full">Sign in</button>
      <p class="mt-4 text-center text-sm text-slate-500">
        New here? <a class="font-semibold text-blue-600" href="#register">Create account</a>
      </p>
    </form>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    errorEl.classList.add('hidden');

    try {
      const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('payroll_token', response.access_token);
      localStorage.setItem('payroll_user', JSON.stringify(response.user));
      currentUser = response.user;
      currentToken = response.access_token;
      window.location.hash = '#dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Unable to sign in.';
      errorEl.classList.remove('hidden');
      submitBtn.textContent = 'Sign in';
      submitBtn.disabled = false;
    }
  });
}

function renderRegister() {
  const container = document.getElementById('auth-view');
  container.innerHTML = `
    <form id="register-form" class="card w-full max-w-md justify-self-center">
      <h2 class="text-2xl font-bold">Create account</h2>
      <p class="mt-1 text-sm text-slate-500">Start auditing salary slips securely.</p>
      <div id="register-error" class="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 hidden"></div>
      
      <label class="mt-6 block text-sm font-medium">Name</label>
      <input id="reg-name" class="input mt-1" type="text" required />
      
      <label class="mt-4 block text-sm font-medium">Email</label>
      <input id="reg-email" class="input mt-1" type="email" required />
      
      <label class="mt-4 block text-sm font-medium">Employee code</label>
      <input id="reg-code" class="input mt-1" type="text" required />
      
      <label class="mt-4 block text-sm font-medium">Password</label>
      <input id="reg-password" class="input mt-1" type="password" required />
      
      <button id="register-submit" class="btn-primary mt-6 w-full">Create account</button>
      <p class="mt-4 text-center text-sm text-slate-500">
        Already registered? <a class="font-semibold text-blue-600" href="#login">Sign in</a>
      </p>
    </form>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const employee_code = document.getElementById('reg-code').value;
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');
    const submitBtn = document.getElementById('register-submit');

    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    errorEl.classList.add('hidden');

    try {
      const response = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, employee_code, password })
      });
      localStorage.setItem('payroll_token', response.access_token);
      localStorage.setItem('payroll_user', JSON.stringify(response.user));
      currentUser = response.user;
      currentToken = response.access_token;
      window.location.hash = '#dashboard';
    } catch (err) {
      errorEl.textContent = err.message || 'Unable to create account.';
      errorEl.classList.remove('hidden');
      submitBtn.textContent = 'Create account';
      submitBtn.disabled = false;
    }
  });
}

async function renderDashboard(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
    </div>
  `;

  try {
    const { data: reports } = await apiRequest('/reports');
    
    if (!reports || reports.length === 0) {
      container.innerHTML = `
        <div class="card text-center py-12">
          <i data-lucide="file-text" class="mx-auto h-12 w-12 text-slate-400"></i>
          <h2 class="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No audit reports yet</h2>
          <p class="mt-1 text-sm text-slate-500">Upload your first payslip to begin auditing.</p>
          <a href="#upload" class="btn-primary mt-6 inline-block">Upload Payslip</a>
        </div>
      `;
      return;
    }

    const latest = reports[0];
    const payroll = latest?.payslip?.extracted_data || {};
    const deductions = Number(payroll.pf || 0) + Number(payroll.esi || 0) + Number(payroll.tds || 0) + Number(payroll.other_deductions || 0);

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold">Payroll Dashboard</h1>
            <p class="text-sm text-slate-500">Latest payroll health and salary trends.</p>
          </div>
          <span class="rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getRiskToneClass(latest.risk_level)}">
            ${latest.risk_level} risk
          </span>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Audit Score</p><p class="mt-2 text-2xl font-bold">${latest.audit_score}/100</p><p class="text-xs text-slate-400 mt-1">Latest payslip score</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="badge-check" class="h-6 w-6"></i></div>
          </div>
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Gross Salary</p><p class="mt-2 text-2xl font-bold">${formatMoney(latest.payslip?.gross_salary)}</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="banknote" class="h-6 w-6"></i></div>
          </div>
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Net Salary</p><p class="mt-2 text-2xl font-bold">${formatMoney(latest.payslip?.net_salary)}</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="wallet" class="h-6 w-6"></i></div>
          </div>
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Total Deductions</p><p class="mt-2 text-2xl font-bold">${formatMoney(deductions)}</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="trending-down" class="h-6 w-6"></i></div>
          </div>
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Payroll Health</p><p class="mt-2 text-2xl font-bold">${latest.audit_score >= 80 ? 'Healthy' : 'Needs review'}</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="heart-pulse" class="h-6 w-6"></i></div>
          </div>
          <div class="card flex items-center justify-between">
            <div><p class="text-sm text-slate-500">Warnings</p><p class="mt-2 text-2xl font-bold">${(latest.verification?.warnings || []).length}</p></div>
            <div class="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40"><i data-lucide="alert-triangle" class="h-6 w-6"></i></div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="card">
            <h3 class="font-semibold">Salary Breakdown</h3>
            <div class="mt-4 h-72 relative"><canvas id="breakdown-chart"></canvas></div>
          </div>
          <div class="card">
            <h3 class="font-semibold">Deduction Analysis</h3>
            <div class="mt-4 h-72 relative"><canvas id="deduction-chart"></canvas></div>
          </div>
          <div class="card lg:col-span-2">
            <h3 class="font-semibold">Monthly Trends</h3>
            <div class="mt-4 h-80 relative"><canvas id="trend-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;

    // Render Breakdown Chart (Pie)
    const breakdownCtx = document.getElementById('breakdown-chart').getContext('2d');
    const breakdownData = [
      Number(payroll.basic_salary || 0),
      Number(payroll.hra || 0),
      Number(payroll.allowances || 0),
      Number(payroll.bonus || 0),
      Number(payroll.overtime || 0)
    ];
    const breakdownChart = new Chart(breakdownCtx, {
      type: 'pie',
      data: {
        labels: ['Basic', 'HRA', 'Allowances', 'Bonus', 'Overtime'],
        datasets: [{
          data: breakdownData,
          backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
    activeCharts.push(breakdownChart);

    // Render Deduction Chart (Bar)
    const deductionCtx = document.getElementById('deduction-chart').getContext('2d');
    const deductionChart = new Chart(deductionCtx, {
      type: 'bar',
      data: {
        labels: ['PF', 'ESI', 'TDS', 'Other'],
        datasets: [{
          label: 'Deductions',
          data: [
            Number(payroll.pf || 0),
            Number(payroll.esi || 0),
            Number(payroll.tds || 0),
            Number(payroll.other_deductions || 0)
          ],
          backgroundColor: '#2563eb',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
    activeCharts.push(deductionChart);

    // Render Monthly Trend Chart (Line)
    const trendCtx = document.getElementById('trend-chart').getContext('2d');
    const trendReports = [...reports].reverse();
    const trendLabels = trendReports.map(r => r.payslip?.month || `#${r.id}`);
    const grossData = trendReports.map(r => Number(r.payslip?.gross_salary || 0));
    const netData = trendReports.map(r => Number(r.payslip?.net_salary || 0));
    const scoreData = trendReports.map(r => Number(r.audit_score || 0));

    const trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [
          { label: 'Gross Salary', data: grossData, borderColor: '#2563eb', backgroundColor: '#2563eb', tension: 0.1, borderWidth: 2 },
          { label: 'Net Salary', data: netData, borderColor: '#14b8a6', backgroundColor: '#14b8a6', tension: 0.1, borderWidth: 2 },
          { label: 'Audit Score', data: scoreData, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.1, borderWidth: 2, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { type: 'linear', display: true, position: 'left' },
          y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100 }
        }
      }
    });
    activeCharts.push(trendChart);

  } catch (err) {
    container.innerHTML = `
      <div class="card bg-rose-50 text-rose-800 p-6">
        <h3 class="font-bold">Error loading dashboard</h3>
        <p class="mt-2 text-sm">${err.message}</p>
      </div>
    `;
  }
}

function renderUpload(container) {
  container.innerHTML = `
    <div class="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 class="text-2xl font-bold">Upload Payslip</h1>
        <p class="text-sm text-slate-500">PDF, JPG, or PNG up to 5 MB.</p>
      </div>
      <div id="dropzone" class="card grid min-h-72 cursor-pointer place-items-center border-2 border-dashed border-slate-350 text-center hover:border-blue-500">
        <input type="file" id="file-input" class="hidden" accept=".pdf,image/jpeg,image/png" />
        <div>
          <i data-lucide="file-up" class="mx-auto h-12 w-12 text-blue-600"></i>
          <h2 id="filename" class="mt-4 text-lg font-semibold">Drop your payslip here</h2>
          <p class="mt-1 text-sm text-slate-500">or click to browse secure local files</p>
        </div>
      </div>
      <div id="upload-error" class="rounded-md bg-rose-50 p-3 text-sm text-rose-700 hidden"></div>
      <div id="upload-status" class="rounded-md bg-blue-50 p-3 text-sm font-medium text-blue-700 hidden"></div>
      <button id="run-audit-btn" class="btn-primary flex items-center gap-2">
        <i data-lucide="sparkles" class="h-4 w-4"></i>
        Extract and Analyze
      </button>
    </div>
  `;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const filename = document.getElementById('filename');
  const errorEl = document.getElementById('upload-error');
  const statusEl = document.getElementById('upload-status');
  const runBtn = document.getElementById('run-audit-btn');
  let selectedFile = null;

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      selectedFile = e.target.files[0];
      filename.textContent = selectedFile.name;
      errorEl.classList.add('hidden');
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-blue-500', 'bg-blue-50');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-blue-500', 'bg-blue-50');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-blue-500', 'bg-blue-50');
    if (e.dataTransfer.files[0]) {
      selectedFile = e.dataTransfer.files[0];
      filename.textContent = selectedFile.name;
      errorEl.classList.add('hidden');
    }
  });

  runBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      errorEl.textContent = 'Choose a PDF, JPG, or PNG payslip first.';
      errorEl.classList.remove('hidden');
      return;
    }

    runBtn.disabled = true;
    runBtn.textContent = 'Auditing...';
    errorEl.classList.add('hidden');
    statusEl.classList.remove('hidden');

    try {
      statusEl.textContent = 'Uploading payslip...';
      const form = new FormData();
      form.append('file', selectedFile);

      const uploadResponse = await apiRequest('/upload-payslip', {
        method: 'POST',
        body: form,
        headers: {
          // fetch will automatically generate boundary headers when sending FormData
          'Content-Type': undefined 
        }
      });

      statusEl.textContent = 'Extracting payroll fields...';
      await apiRequest('/extract', {
        method: 'POST',
        body: JSON.stringify({ payslip_id: uploadResponse.payslip.id })
      });

      statusEl.textContent = 'Running AI payroll audit...';
      const analysisResponse = await apiRequest('/analyze', {
        method: 'POST',
        body: JSON.stringify({ payslip_id: uploadResponse.payslip.id })
      });

      window.location.hash = `#report-detail/${analysisResponse.report.id}`;
    } catch (err) {
      errorEl.textContent = err.message || 'Audit failed. Check file type, size, or API configuration.';
      errorEl.classList.remove('hidden');
      statusEl.classList.add('hidden');
      runBtn.disabled = false;
      runBtn.textContent = 'Extract and Analyze';
    }
  });
}

async function renderReports(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
    </div>
  `;

  try {
    const { data: reports } = await apiRequest('/reports');

    if (!reports || reports.length === 0) {
      container.innerHTML = `
        <div class="card text-center py-12">
          <i data-lucide="file-text" class="mx-auto h-12 w-12 text-slate-400"></i>
          <h2 class="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">No reports found</h2>
          <p class="mt-1 text-sm text-slate-500">Audit reports will appear here after upload.</p>
        </div>
      `;
      return;
    }

    let reportsListMarkup = '';
    reports.forEach(report => {
      reportsListMarkup += `
        <a href="#report-detail/${report.id}" class="card block hover:border-blue-300 transition-all duration-200">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-800 dark:text-slate-200">
                ${report.payslip?.employee?.employee_name || 'Employee'} - ${report.payslip?.month || 'Unknown month'}
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Gross ${formatMoney(report.payslip?.gross_salary)} - Net ${formatMoney(report.payslip?.net_salary)}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getRiskToneClass(report.risk_level)}">
                ${report.risk_level}
              </span>
              <span class="text-xl font-bold">${report.audit_score}</span>
            </div>
          </div>
        </a>
      `;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <h1 class="text-2xl font-bold">Audit Reports</h1>
        <div class="grid gap-4">
          ${reportsListMarkup}
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="card bg-rose-50 text-rose-800 p-6">
        <h3 class="font-bold">Error loading reports</h3>
        <p class="mt-2 text-sm">${err.message}</p>
      </div>
    `;
  }
}

async function renderReportDetail(container, id) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
    </div>
  `;

  try {
    const { report } = await apiRequest(`/report/${id}`);
    const payroll = report?.payslip?.extracted_data || {};
    const warnings = report?.verification?.warnings || [];

    let warningsList = '';
    if (warnings.length > 0) {
      warnings.forEach(w => { warningsList += `<li>- ${w}</li>`; });
    } else {
      warningsList = '<li>- No calculation mismatch found.</li>';
    }

    let recommendationsList = '';
    const recs = report.recommendations || [];
    if (recs.length > 0) {
      recs.forEach(r => { recommendationsList += `<li>- ${r}</li>`; });
    } else {
      recommendationsList = '<li>- No recommendations.</li>';
    }

    let riskIndicatorsList = '';
    const risks = report.ai_analysis?.risk_indicators || [];
    if (risks.length > 0) {
      risks.forEach(rk => { riskIndicatorsList += `<li>- ${rk}</li>`; });
    } else {
      riskIndicatorsList = '<li>- No risk indicators.</li>';
    }

    // Projections template markup if present
    let projectionsMarkup = '';
    const projections = report.ai_analysis?.projections;
    if (projections) {
      let tipsList = '';
      if (projections.tax_optimization_tips && projections.tax_optimization_tips.length > 0) {
        projections.tax_optimization_tips.forEach(t => {
          tipsList += `<li>${t}</li>`;
        });
      }

      projectionsMarkup = `
        <div class="card space-y-4">
          <h3 class="font-semibold text-lg border-b pb-2 border-slate-100 dark:border-slate-800">Annual Projections & Tax Advisory</h3>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="p-3 bg-slate-50 rounded-lg dark:bg-slate-900/50">
              <span class="text-xs text-slate-500 font-semibold uppercase">Annual Forecast</span>
              <p class="mt-1.5 text-sm">Projected CTC: <strong>${formatMoney(projections.annual_gross_salary)}</strong></p>
              <p class="text-sm">Take Home (Est): <strong class="text-emerald-600">${formatMoney(projections.annual_net_salary)}</strong></p>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg dark:bg-slate-900/50">
              <span class="text-xs text-slate-500 font-semibold uppercase">Tax Slab Advisor</span>
              <p class="mt-1.5 text-sm">New Regime: <strong>${formatMoney(projections.new_regime_tax)}</strong></p>
              <p class="text-sm">Old Regime: <strong>${formatMoney(projections.old_regime_tax)}</strong></p>
              <p class="text-xs mt-1.5 text-indigo-500 font-bold">Recommended: ${projections.recommended_regime}</p>
            </div>
            <div class="p-3 bg-slate-50 rounded-lg dark:bg-slate-900/50">
              <span class="text-xs text-slate-500 font-semibold uppercase">EPF Wealth Forecast</span>
              <p class="mt-1.5 text-sm">In 5 Years: <strong>${formatMoney(projections.epf_forecast_5_years)}</strong></p>
              <p class="text-sm">In 10 Years: <strong>${formatMoney(projections.epf_forecast_10_years)}</strong></p>
            </div>
          </div>
          ${tipsList ? `
            <div class="mt-2">
              <h4 class="text-sm font-semibold text-indigo-500 mb-1">AI Tax Optimization Advice</h4>
              <ul class="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                ${tipsList}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold">Professional Audit Report</h1>
            <p class="text-sm text-slate-500">${report.payslip?.employee?.employee_name} - ${report.payslip?.month}</p>
          </div>
          <div class="flex gap-2">
            <button id="export-pdf-btn" class="btn-secondary flex items-center gap-2"><i data-lucide="download" class="h-4 w-4"></i> Export PDF</button>
            <button id="delete-report-btn" class="btn-secondary text-rose-600 flex items-center gap-2"><i data-lucide="trash-2" class="h-4 w-4"></i> Delete</button>
          </div>
        </div>

        <section id="report-sheet" class="space-y-6 bg-white p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
          <div class="card">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 class="text-xl font-bold">Employee Information</h2>
                <p class="mt-2 text-sm text-slate-500">Name: ${payroll.employee_name || 'N/A'}</p>
                <p class="text-sm text-slate-500">Employee ID: ${payroll.employee_id || 'N/A'}</p>
                <p class="text-sm text-slate-500">Working days: ${payroll.working_days || 0} - Paid days: ${payroll.paid_days || 0}</p>
              </div>
              <div class="text-right">
                <div class="text-4xl font-bold">${report.audit_score}</div>
                <span class="mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getRiskToneClass(report.risk_level)}">${report.risk_level} risk</span>
              </div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="card"><p class="text-sm text-slate-500">Gross Salary</p><p class="mt-2 text-2xl font-bold">${formatMoney(payroll.gross_salary)}</p></div>
            <div class="card"><p class="text-sm text-slate-500">Net Salary</p><p class="mt-2 text-2xl font-bold">${formatMoney(payroll.net_salary)}</p></div>
            <div class="card"><p class="text-sm text-slate-500">Total Deductions</p><p class="mt-2 text-2xl font-bold">${formatMoney(report.verification?.computed_total_deductions)}</p></div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="card">
              <h3 class="font-semibold">Salary Breakdown</h3>
              <div class="mt-4 h-72 relative"><canvas id="detail-breakdown-chart"></canvas></div>
            </div>
            <div class="card">
              <h3 class="font-semibold">Deduction Analysis</h3>
              <div class="mt-4 h-72 relative"><canvas id="detail-deduction-chart"></canvas></div>
            </div>
          </div>

          ${projectionsMarkup}

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="card">
              <h3 class="font-semibold text-slate-800 dark:text-slate-200">Audit Findings</h3>
              <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                ${warningsList}
              </ul>
            </div>
            <div class="card">
              <h3 class="font-semibold text-slate-800 dark:text-slate-200">AI Recommendations</h3>
              <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                ${recommendationsList}
              </ul>
            </div>
            <div class="card">
              <h3 class="font-semibold text-slate-800 dark:text-slate-200">Risk Indicators</h3>
              <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                ${riskIndicatorsList}
              </ul>
            </div>
            <div class="card">
              <h3 class="font-semibold">Plain-Language Deduction Explanation</h3>
              <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">${report.ai_analysis?.deduction_explanation || 'No details.'}</p>
            </div>
          </div>
        </section>
      </div>
    `;

    // Render Breakdown Chart
    const breakdownCtx = document.getElementById('detail-breakdown-chart').getContext('2d');
    const breakdownChart = new Chart(breakdownCtx, {
      type: 'pie',
      data: {
        labels: ['Basic', 'HRA', 'Allowances', 'Bonus', 'Overtime'],
        datasets: [{
          data: [
            Number(payroll.basic_salary || 0),
            Number(payroll.hra || 0),
            Number(payroll.allowances || 0),
            Number(payroll.bonus || 0),
            Number(payroll.overtime || 0)
          ],
          backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
    activeCharts.push(breakdownChart);

    // Render Deduction Chart
    const deductionCtx = document.getElementById('detail-deduction-chart').getContext('2d');
    const deductionChart = new Chart(deductionCtx, {
      type: 'bar',
      data: {
        labels: ['PF', 'ESI', 'TDS', 'Other'],
        datasets: [{
          data: [
            Number(payroll.pf || 0),
            Number(payroll.esi || 0),
            Number(payroll.tds || 0),
            Number(payroll.other_deductions || 0)
          ],
          backgroundColor: '#2563eb',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
    activeCharts.push(deductionChart);

    // PDF Export Action
    document.getElementById('export-pdf-btn').addEventListener('click', async () => {
      const { jsPDF } = window.jspdf;
      const sheet = document.getElementById('report-sheet');

      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`payroll-audit-${id}.pdf`);
    });

    // Delete Report Action
    document.getElementById('delete-report-btn').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this report?')) {
        await apiRequest(`/report/${id}`, { method: 'DELETE' });
        window.location.hash = '#reports';
      }
    });

  } catch (err) {
    container.innerHTML = `
      <div class="card bg-rose-50 text-rose-800 p-6">
        <h3 class="font-bold">Error loading report details</h3>
        <p class="mt-2 text-sm">${err.message}</p>
      </div>
    `;
  }
}

async function renderAdmin(container) {
  if (currentUser?.role !== 'admin') {
    container.innerHTML = `
      <div class="card">
        <i data-lucide="shield-alert" class="h-8 w-8 text-amber-500"></i>
        <h1 class="mt-3 text-xl font-bold">Admin access required</h1>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-center p-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
    </div>
  `;

  try {
    const [usersRes, payslipsRes] = await Promise.all([
      apiRequest('/admin/users'),
      apiRequest('/admin/payslips')
    ]);

    const users = usersRes.data || [];
    const payslips = payslipsRes.data || [];

    let usersMarkup = '';
    users.forEach(u => {
      usersMarkup += `
        <tr class="border-t border-slate-100 dark:border-slate-800">
          <td class="py-2">${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
        </tr>
      `;
    });

    let payslipsMarkup = '';
    payslips.forEach(p => {
      payslipsMarkup += `
        <tr class="border-t border-slate-100 dark:border-slate-800">
          <td class="py-2">${p.employee?.employee_name || 'N/A'}</td>
          <td>${p.month || '-'}</td>
          <td>${formatMoney(p.net_salary)}</td>
          <td>${p.status}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <h1 class="text-2xl font-bold">Admin Panel</h1>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="card overflow-x-auto">
            <h2 class="font-semibold text-slate-800 dark:text-slate-200">Users</h2>
            <table class="mt-4 w-full text-left text-sm">
              <thead class="text-slate-500">
                <tr>
                  <th class="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                ${usersMarkup}
              </tbody>
            </table>
          </div>
          <div class="card overflow-x-auto">
            <h2 class="font-semibold text-slate-800 dark:text-slate-200">Uploaded Payslips</h2>
            <table class="mt-4 w-full text-left text-sm">
              <thead class="text-slate-500">
                <tr>
                  <th class="py-2">Employee</th>
                  <th>Month</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${payslipsMarkup}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="card bg-rose-50 text-rose-800 p-6">
        <h3 class="font-bold">Error loading admin dashboard</h3>
        <p class="mt-2 text-sm">${err.message}</p>
      </div>
    `;
  }
}

// Router Event Listeners
window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  handleRouting();
});
