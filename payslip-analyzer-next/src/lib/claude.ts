import { PayslipAnalysis } from '../types/payslip';

export async function analyzePayslipWithClaude(base64Image: string): Promise<PayslipAnalysis> {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables.');
  }
  
  const systemPrompt = `You are a payroll verification expert. You analyze payslip documents and verify their mathematical accuracy and completeness.
You must also project annual salaries, Indian tax slabs under both regimes (Old vs New), suggest optimization tips, and project 5/10 year EPF accumulations (assume 8.25% interest rate and matching employer contribution).
You must respond in valid JSON matching this schema:
{
  "isValid": boolean,
  "isCorrect": boolean,
  "employeeName": string | null,
  "employerName": string | null,
  "payPeriod": string | null,
  "grossPay": number | null,
  "totalDeductions": number | null,
  "netPay": number | null,
  "calculatedNetPay": number | null,
  "discrepancies": string[],
  "warnings": string[],
  "verdict": "VALID" | "INVALID" | "SUSPICIOUS",
  "verdictReason": string,
  "projections": {
    "annualGrossSalary": number,
    "annualNetSalary": number,
    "newRegimeTax": number,
    "oldRegimeTax": number,
    "recommendedRegime": string,
    "taxOptimizationTips": string[],
    "epfForecast5Years": number,
    "epfForecast10Years": number;
  }
}`;
  
  const userPrompt = `Analyze this payslip image carefully. Extract all financial figures. Verify:
1. Does gross pay - total deductions = net pay? If not, flag the discrepancy.
2. Are all required fields present? (employee name, employer, pay period, gross, deductions breakdown, net pay)
3. Are there any suspicious values? (negative numbers where they shouldn't be, unusually high deductions, zero gross pay, etc.)
4. Is this actually a payslip or a different document type?`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API returned an error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const jsonString = result.choices[0]?.message?.content?.trim();

  if (!jsonString) {
    throw new Error('Groq did not return a valid response block.');
  }

  try {
    const parsed: PayslipAnalysis = JSON.parse(jsonString);
    return parsed;
  } catch (err) {
    console.error('Failed to parse Groq output as JSON:', jsonString, err);
    throw new Error('Groq returned malformed JSON.');
  }
}
