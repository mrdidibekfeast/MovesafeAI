import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { MovementReport } from '../types/report';

/*
 * PDF export for a single movement report.
 *
 * The printable report container is captured with html2canvas and placed
 * onto A4 portrait pages, slicing vertically when the report is taller
 * than one page. Elements marked with data-html2canvas-ignore (and the
 * .pdf-exclude class) never appear in the PDF.
 */

export interface ReportPdfOptions {
  fileName: string;
  title?: string;
}

// Readable, sanitized file name — never includes user IDs, emails,
// upload file names, or the full report ID.
export function buildReportPdfFileName(report: MovementReport): string {
  const movement =
    report.movementType === 'custom' && report.customMovementName
      ? report.customMovementName
      : report.movementType;
  const slug = movement
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const datePart = report.createdAt.slice(0, 10); // YYYY-MM-DD
  return `movesafe-${slug || 'movement'}-report-${datePart}.pdf`;
}

export async function exportReportToPdf(
  element: HTMLElement,
  options: ReportPdfOptions,
): Promise<void> {
  if (!element) {
    throw new Error('The report content is not available for export.');
  }
  if (!options.fileName || !options.fileName.trim()) {
    throw new Error('A file name is required for the PDF export.');
  }

  // Temporary export styling: white background, no shadows, no animations.
  element.classList.add('pdf-exporting');
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 12; // mm
    const printableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const printableHeight = pdf.internal.pageSize.getHeight() - margin * 2;

    // Map canvas pixels to millimetres so the aspect ratio is preserved.
    const pxPerMm = canvas.width / printableWidth;
    const pageHeightPx = Math.floor(printableHeight * pxPerMm);

    let renderedPx = 0;
    let pageIndex = 0;

    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

      // Draw one vertical slice of the capture onto its own canvas.
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceHeightPx;
      const context = slice.getContext('2d');
      if (!context) {
        throw new Error('The report content is not available for export.');
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(
        canvas,
        0,
        renderedPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx,
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(
        slice.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        printableWidth,
        sliceHeightPx / pxPerMm,
      );

      renderedPx += sliceHeightPx;
      pageIndex += 1;
    }

    pdf.save(options.fileName);
  } finally {
    // Never leave the page in export mode, even after an error.
    element.classList.remove('pdf-exporting');
  }
}
