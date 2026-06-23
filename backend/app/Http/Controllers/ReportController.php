<?php

namespace App\Http\Controllers;

use App\Models\AuditReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $reports = AuditReport::query()
            ->with('payslip.employee.user')
            ->when($request->user()->role !== 'admin', function ($query) use ($request) {
                $query->whereHas('payslip.employee', fn ($q) => $q->where('user_id', $request->user()->id));
            })
            ->latest()
            ->paginate(12);

        return response()->json($reports);
    }

    public function show(Request $request, AuditReport $report): JsonResponse
    {
        $report->load('payslip.employee.user');
        abort_if(
            $request->user()->role !== 'admin' && $report->payslip->employee->user_id !== $request->user()->id,
            403
        );

        return response()->json(['report' => $report]);
    }

    public function destroy(Request $request, AuditReport $report): JsonResponse
    {
        $report->load('payslip.employee');
        abort_if(
            $request->user()->role !== 'admin' && $report->payslip->employee->user_id !== $request->user()->id,
            403
        );

        $report->delete();

        return response()->json(['message' => 'Report deleted.']);
    }
}

