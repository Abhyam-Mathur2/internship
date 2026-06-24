import * as pdfjs from 'pdfjs-dist';
import { createCanvas } from 'canvas';

export async function convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  const data = new Uint8Array(pdfBuffer);
  
  // Load PDF document
  const loadingTask = pdfjs.getDocument({
    data: data,
    useSystemFonts: true,
    disableFontFace: true,
  });
  
  const pdfDocument = await loadingTask.promise;
  
  if (pdfDocument.numPages === 0) {
    throw new Error('PDF document has no pages.');
  }

  // Get the first page
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better vision OCR quality

  // Create canvas using 'canvas' npm library
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // Render PDF page into canvas context
  const renderContext = {
    canvasContext: context as any,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  // Convert canvas to JPEG buffer
  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}
