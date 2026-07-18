export interface PayslipAnalysis {
  isValid: boolean;
  isCorrect: boolean;
  employeeName: string | null;
  employerName: string | null;
  payPeriod: string | null;
  grossPay: number | null;
  totalDeductions: number | null;
  netPay: number | null;
  calculatedNetPay: number | null;
  discrepancies: string[];
  warnings: string[];
  verdict: 'VALID' | 'INVALID' | 'SUSPICIOUS';
  verdictReason: string;
  projections?: {
    annualGrossSalary: number;
    annualNetSalary: number;
    newRegimeTax: number;
    oldRegimeTax: number;
    recommendedRegime: string;
    taxOptimizationTips: string[];
    epfForecast5Years: number;
    epfForecast10Years: number;
  };
}
