'use client';

import React, { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { ResultCard } from '../components/ResultCard';
import { PayslipAnalysis } from '../types/payslip';
import { Sparkles, ShieldCheck, FileText, Cpu, AlertCircle } from 'lucide-react';

const LOADING_STEPS = [
  'Reading uploaded document...',
  'Converting document to visual format...',
  'Sending payload to Claude 3.5 Sonnet...',
  'Extracting employee and salary metadata...',
  'Auditing statutory deductions (gross - deductions = net)...',
  'Generating compliance report and anomaly checks...',
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<PayslipAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rotate loading step messages for premium UX
  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleFileCleared = () => {
    setFile(null);
    setAnalysisResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setLoadingStepIndex(0);
    setAnalysisResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze-payslip', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred during analysis.');
      }

      setAnalysisResult(data.report);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to the server. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background gradients for premium glassmorphism feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px]" />

      <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 relative z-10">
        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-950/40 text-indigo-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Claude 3.5 Sonnet Vision Enabled
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-slate-100 to-emerald-200">
            AI Payslip Auditor
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg">
            Instantly audit employee payslips. Upload any PDF or image to extract fields, detect mathematical discrepancies, and flag compliance anomalies.
          </p>
        </header>

        {/* Dashboard Grid */}
        <main className="space-y-8">
          {/* Main Action Card */}
          {!analysisResult && !isAnalyzing && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <UploadZone onFileSelected={handleFileSelected} onFileCleared={handleFileCleared} />
              
              {file && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleAnalyze}
                    className="w-full md:w-auto px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Analyze Payslip
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-400 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Premium Loading State */}
          {isAnalyzing && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center space-y-6 min-h-[350px]">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full border-4 border-indigo-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/40 animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-200">Analyzing Document</h3>
                <p className="text-sm text-indigo-400 font-mono tracking-wider min-h-[20px] transition-all duration-300">
                  {LOADING_STEPS[loadingStepIndex]}
                </p>
              </div>
            </div>
          )}

          {/* Results Screen */}
          {analysisResult && !isAnalyzing && (
            <div className="animate-fade-in space-y-6">
              <ResultCard report={analysisResult} onReset={handleFileCleared} />
            </div>
          )}

          {/* Info Section */}
          <section className="grid gap-6 md:grid-cols-3 pt-6 border-t border-slate-900">
            <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-900 flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm">Security Assured</h4>
                <p className="text-xs text-slate-500 mt-1">Processed securely in memory. No persistent storage or file retention.</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-900 flex items-start gap-4">
              <Cpu className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm">Vision Intelligence</h4>
                <p className="text-xs text-slate-500 mt-1">Extracts nested tabular data directly from raw images using advanced OCR heuristics.</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-900 flex items-start gap-4">
              <FileText className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-200 text-sm">PDF & Image Support</h4>
                <p className="text-xs text-slate-500 mt-1">Accepts PDF documents and formats like PNG/JPG, converting automatically under the hood.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
