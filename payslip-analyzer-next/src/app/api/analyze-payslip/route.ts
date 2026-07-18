import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToImage } from '../../../lib/pdf-to-image';
import { analyzePayslipWithClaude } from '../../../lib/claude';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, PNG, or JPG.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let imageBuffer: Buffer;

    if (file.type === 'application/pdf') {
      try {
        // Convert the PDF's first page to a JPEG buffer
        imageBuffer = await convertPdfToImage(fileBuffer);
      } catch (pdfError: any) {
        console.error('PDF to Image conversion failed:', pdfError);
        return NextResponse.json({ error: 'Failed to process PDF file. Make sure it is not corrupted.' }, { status: 500 });
      }
    } else {
      imageBuffer = fileBuffer;
    }

    // Convert image buffer to base64 for Claude Vision API
    const base64Image = imageBuffer.toString('base64');

    // Call Claude Vision API
    const analysisResult = await analyzePayslipWithClaude(base64Image);

    return NextResponse.json({ report: analysisResult });
  } catch (error: any) {
    console.error('Payslip analysis route error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}
