'use strict';
'use client';

import React from 'react';
import { PayslipAnalysis } from '../types/payslip';
import { VerdictBadge } from './VerdictBadge';
import { RefreshCw, AlertTriangle, AlertCircle, Sparkles, Building, User, Calendar, TrendingUp, PiggyBank, Scale } from 'lucide-react';

interface ResultCardProps {
  report: PayslipAnalysis;
  onReset: () => void;
}

export function ResultCard({ report, onReset }: ResultCardProps) {
  const formatMoney = (val: number | null) => {
    if (val === null || val === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const isMathCorrect = report.isCorrect;

  return (
    <div className="w-full space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-md border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Analysis Verdict</h2>
            <p className="mt-1 text-sm text-slate-400">Verifying payslip details and statutory calculations</p>
          </div>
          <div className="flex items-center gap-3">
            <VerdictBadge verdict={report.verdict} />
            <button
              onClick={onReset}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80"
            >
              <RefreshCw className="h-4 w-4" />
              Re-upload
            </button>
          </div>
        </div>

        {/* Verdict Explanation */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800/40">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI Audit Findings
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {report.verdictReason}
          </p>
        </div>
      </div>

      {/* Main Analysis Results Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Box */}
        <div className="md:col-span-2 flex flex-col gap-6 rounded-2xl bg-white p-6 shadow-md border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Extracted Metadata</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Employee</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{report.employeeName || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <Building className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Employer</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{report.employerName || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800 sm:col-span-2">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pay Period</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{report.payPeriod || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Financial Breakdown</h4>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50/50 p-4 dark:bg-slate-950/20">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Gross Pay</span>
                <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">{formatMoney(report.grossPay)}</p>
              </div>
              <div className="rounded-xl bg-slate-50/50 p-4 dark:bg-slate-950/20">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Total Deductions</span>
                <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">{formatMoney(report.totalDeductions)}</p>
              </div>
              <div className="rounded-xl bg-slate-50/50 p-4 dark:bg-slate-950/20">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Net Pay</span>
                <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-200">{formatMoney(report.netPay)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calculation verification card */}
        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-md border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Math & Audit Check</h3>
            
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Gross Salary</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(report.grossPay)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">(-) Deductions</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(report.totalDeductions)}</span>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2"></div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Calculated Net Pay</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(report.calculatedNetPay)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Declared Net Pay</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(report.netPay)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {isMathCorrect ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-950/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Calculation Match</span>
                <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-400">Math adds up perfectly</p>
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-center dark:bg-rose-950/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Math Mismatch</span>
                <p className="mt-1 text-sm font-semibold text-rose-800 dark:text-rose-400">Difference of {formatMoney(Math.abs((report.grossPay || 0) - (report.totalDeductions || 0) - (report.netPay || 0)))}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Annual Projections & Tax Advisory Section */}
      {report.projections && (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-md dark:bg-slate-900 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Annual Projections & Tax Advisory</h3>
              <p className="text-xs text-slate-400">AI-projected CTC, tax optimizations, and long-term EPF wealth accumulation</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Salary Projections Card */}
            <div className="rounded-xl bg-slate-50/50 p-5 dark:bg-slate-950/20 border border-slate-100/20 space-y-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Annual Forecast
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Projected CTC</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(report.projections.annualGrossSalary)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Take Home (Annual)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(report.projections.annualNetSalary)}</span>
                </div>
              </div>
            </div>

            {/* Tax Regime Advisory Card */}
            <div className="rounded-xl bg-slate-50/50 p-5 dark:bg-slate-950/20 border border-slate-100/20 space-y-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-400" />
                Tax Slabs (Est. Slabs)
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">New Regime Tax</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(report.projections.newRegimeTax)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Old Regime Tax</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(report.projections.oldRegimeTax)}</span>
                </div>
                <div className="border-t border-slate-100/20 my-1 pt-1.5 flex justify-between items-center text-xs">
                  <span className="text-indigo-400 font-semibold">Recommended</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{report.projections.recommendedRegime}</span>
                </div>
              </div>
            </div>

            {/* EPF Growth Forecast Card */}
            <div className="rounded-xl bg-slate-50/50 p-5 dark:bg-slate-950/20 border border-slate-100/20 space-y-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-indigo-400" />
                EPF Growth Forecast
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">In 5 Years</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(report.projections.epfForecast5Years)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">In 10 Years</span>
                  <span className="font-semibold text-slate-850 dark:text-slate-200">{formatMoney(report.projections.epfForecast10Years)}</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">Projected at 8.25% interest rate + employer match</p>
              </div>
            </div>
          </div>

          {/* Tax Optimization Tips */}
          {report.projections.taxOptimizationTips && report.projections.taxOptimizationTips.length > 0 && (
            <div className="rounded-xl bg-indigo-50/20 border border-indigo-500/10 p-5 space-y-3">
              <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Tax Saving Recommendations
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2 text-xs text-slate-300 leading-relaxed">
                {report.projections.taxOptimizationTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Discrepancies and Warnings section */}
      {(report.discrepancies.length > 0 || report.warnings.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Discrepancies */}
          {report.discrepancies.length > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-6 dark:border-rose-950/40 dark:bg-rose-950/5">
              <h3 className="flex items-center gap-2 text-base font-bold text-rose-800 dark:text-rose-400">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Critical Discrepancies ({report.discrepancies.length})
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-rose-700 dark:text-rose-400/90 leading-relaxed">
                {report.discrepancies.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-6 dark:border-amber-950/40 dark:bg-amber-950/5">
              <h3 className="flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Warnings & Advisories ({report.warnings.length})
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-amber-700 dark:text-amber-400/90 leading-relaxed">
                {report.warnings.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
