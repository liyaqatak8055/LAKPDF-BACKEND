import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function createTestFiles() {
  const scratchDir = path.resolve('tmp/test-suite');
  fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Create a 3-page text & table PDF
  const pdf1 = await PDFDocument.create();
  const font = await pdf1.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf1.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Headings & Paragraphs
  const page1 = pdf1.addPage([595, 842]); // A4
  page1.drawText('Sample Document for LAK PDF Testing', { x: 50, y: 780, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText('Executive Summary & Overview', { x: 50, y: 740, size: 14, font: boldFont, color: rgb(0.2, 0.4, 0.8) });
  page1.drawText('This document is generated to test merge, compression, conversion to Word, OCR, watermark, and page numbering features of LAK PDF.', { x: 50, y: 710, size: 11, font, maxWidth: 495, lineHeight: 16 });
  page1.drawText('Section 1: Performance Goals', { x: 50, y: 640, size: 14, font: boldFont, color: rgb(0.2, 0.4, 0.8) });
  page1.drawText('The goal of this tool suite is to achieve output quality superior to industry standards (e.g. iLovePDF), with sub-second browser processing.', { x: 50, y: 610, size: 11, font, maxWidth: 495, lineHeight: 16 });

  // Page 2: Table structure
  const page2 = pdf1.addPage([595, 842]);
  page2.drawText('Financial Report & Table Data', { x: 50, y: 780, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  page2.drawText('Item Description          Q1 Revenue    Q2 Revenue    Growth', { x: 50, y: 730, size: 11, font: boldFont });
  page2.drawText('PDF Processing Core       $120,000      $145,000      +20.8%', { x: 50, y: 700, size: 11, font });
  page2.drawText('OCR Engine Module         $85,000       $98,000       +15.2%', { x: 50, y: 670, size: 11, font });
  page2.drawText('AI Summarizer & MCQ       $210,000      $295,000      +40.5%', { x: 50, y: 640, size: 11, font });
  page2.drawText('Total Ecosystem Revenue   $415,000      $538,000      +29.6%', { x: 50, y: 600, size: 11, font: boldFont });

  // Page 3: Conclusion & Signature area
  const page3 = pdf1.addPage([595, 842]);
  page3.drawText('Sign-off & Approval', { x: 50, y: 780, size: 18, font: boldFont });
  page3.drawText('Approved by Lead Engineer on 01 September 2026.', { x: 50, y: 740, size: 11, font });
  page3.drawText('Signature: ______________________', { x: 50, y: 680, size: 12, font });

  const pdf1Bytes = await pdf1.save();
  const pdf1Path = path.join(scratchDir, 'document-3pages.pdf');
  fs.writeFileSync(pdf1Path, pdf1Bytes);

  // 2. Create second PDF for Merge / Compare
  const pdf2 = await PDFDocument.create();
  const page2_1 = pdf2.addPage([595, 842]);
  page2_1.drawText('Attachment A: Technical Specifications', { x: 50, y: 780, size: 18, font: boldFont, color: rgb(0.8, 0.2, 0.2) });
  page2_1.drawText('Specification version 2.4 - Full WebAssembly / Pure Client Architecture.', { x: 50, y: 740, size: 11, font });
  const pdf2Bytes = await pdf2.save();
  const pdf2Path = path.join(scratchDir, 'attachment-1page.pdf');
  fs.writeFileSync(pdf2Path, pdf2Bytes);

  console.log(`Created test PDFs in ${scratchDir}:`);
  console.log(`- ${pdf1Path} (${pdf1Bytes.length} bytes, 3 pages)`);
  console.log(`- ${pdf2Path} (${pdf2Bytes.length} bytes, 1 page)`);
}

createTestFiles().catch(console.error);
