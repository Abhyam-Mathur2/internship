# AI Payroll Auditor

Production-ready MVP SaaS for uploading payslips, extracting payroll data, verifying salary calculations, detecting anomalies, and generating AI audit reports with Groq.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Recharts, React Dropzone, Lucide React
- Backend: Laravel 12, PHP 8.3, MySQL, JWT auth
- AI: Groq API
- OCR: local Tesseract or OCR.space abstraction
- Deployment: Docker Compose

## Quick Start

1. Copy environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Set secrets in `backend/.env`:

```env
APP_KEY=
JWT_SECRET=
GROQ_API_KEY=
OCR_DRIVER=mock
```

3. Start services:

```bash
docker compose up --build
```

4. In the backend container:

```bash
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

5. Open:

- Frontend: http://localhost:5173
- API: http://localhost:8000/api

## Local Development

Backend:

```bash
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Set `JWT_SECRET` to a long random string in production. For local development, `APP_KEY` is used as a fallback when `JWT_SECRET` is empty.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Demo Users

- Admin: `admin@payrollaudit.test` / `password`
- Employee: `employee@payrollaudit.test` / `password`

## OCR Modes

- `OCR_DRIVER=mock`: deterministic sample extraction for development
- `OCR_DRIVER=tesseract`: requires `tesseract` binary installed
- `OCR_DRIVER=ocrspace`: requires `OCR_SPACE_API_KEY`

## API

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/upload-payslip`
- `POST /api/extract`
- `POST /api/analyze`
- `GET /api/reports`
- `GET /api/report/{id}`
- `DELETE /api/report/{id}`
- `GET /api/admin/users`
- `GET /api/admin/payslips`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Security Notes

- JWT-protected API routes
- Laravel validation for all inputs
- MIME and file size validation for uploads
- Uploads stored outside the public path by default
- API rate limiting enabled
- Admin endpoints protected by role middleware
- Groq API key read only from environment
