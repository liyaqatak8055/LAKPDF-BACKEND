import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import docxPkg from 'docx';
const docx = (docxPkg && docxPkg.Document) ? docxPkg : (docxPkg.default || docxPkg);
import pptxgen from 'pptxgenjs';

const outDir = path.resolve('tests/fixtures/synthetic');
fs.mkdirSync(outDir, { recursive: true });

async function buildAllFixtures() {
  console.log('Generating Synthetic Golden Test Dataset in:', outDir);

  // 1. Simple Text PDF (1 page)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]); // A4
    page.drawText('LakPDF Functional Audit — Simple Text Document', { x: 50, y: 780, size: 16, font: bold, color: rgb(0.1, 0.2, 0.4) });
    page.drawText('Document ID: DOC-SIM-001', { x: 50, y: 755, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('This is a clean, single-page reference document designed to verify text extraction, word conversion, and compression fidelity.', {
      x: 50, y: 720, size: 11, font, maxWidth: 500, lineHeight: 16
    });
    page.drawText('The quick brown fox jumps over the lazy dog. 1234567890.', { x: 50, y: 680, size: 11, font });
    page.drawText('Contact: support@lakpdf.com | Website: https://lakpdf.com', { x: 50, y: 650, size: 11, font });
    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '01_simple_text.pdf'), bytes);
  }

  // 2. Multi-page PDF (5 pages) with varied content & pagination
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (let i = 1; i <= 5; i++) {
      const page = pdf.addPage([595.28, 841.89]);
      page.drawText(`Multi-page Test Document — Page ${i} of 5`, { x: 50, y: 780, size: 16, font: bold });
      page.drawText(`Section ${i}: Detailed Analysis for Page ${i}`, { x: 50, y: 740, size: 13, font: bold, color: rgb(0.2, 0.3, 0.6) });
      page.drawText(`This page contains unique verification token: TOKEN_PAGE_${i}_VERIFIED.`, { x: 50, y: 700, size: 11, font });
      page.drawText(`Line 2 on page ${i}: Ensuring page splitting, deletion, and reordering accurately track every index.`, { x: 50, y: 670, size: 11, font });
      page.drawText(`Page Footer: ${i} / 5`, { x: 270, y: 40, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    }
    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '02_multipage_5p.pdf'), bytes);
  }

  // 3. Invoice & Numerical Table PDF (Critical for financial numbers, grounding, OCR)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mono = await pdf.embedFont(StandardFonts.Courier);
    const page = pdf.addPage([595.28, 841.89]);

    page.drawText('INVOICE / TAX STATEMENT', { x: 50, y: 800, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('Invoice Number: INV-2026-9948', { x: 50, y: 770, size: 11, font: bold });
    page.drawText('Invoice Date: 15-October-2026', { x: 50, y: 755, size: 11, font });
    page.drawText('Customer Name: Rajesh Kumar Sharma', { x: 50, y: 735, size: 11, font });
    page.drawText('Account Number: 987654321098', { x: 50, y: 720, size: 11, font });
    page.drawText('PAN Identifier: ABCDE1234F', { x: 50, y: 705, size: 11, font });

    // Table Header
    page.drawRectangle({ x: 50, y: 660, width: 495, height: 25, color: rgb(0.9, 0.93, 0.98) });
    page.drawText('Item Description                Qty    Unit Price    Total Amount', { x: 60, y: 668, size: 10, font: bold, color: rgb(0.1, 0.2, 0.4) });

    // Rows
    const rows = [
      ['Enterprise PDF License', '1', '$1,200.00', '$1,200.00'],
      ['OCR Cloud Server Processing', '5', '$150.00', '$750.00'],
      ['Document Redaction Module', '2', '$250.00', '$500.00'],
      ['AI Grounded Q&A Add-on', '1', '$450.00', '$450.00'],
    ];

    let currentY = 635;
    for (const r of rows) {
      page.drawText(`${r[0].padEnd(30)} ${r[1].padEnd(6)} ${r[2].padEnd(14)} ${r[3]}`, { x: 60, y: currentY, size: 9, font: mono });
      currentY -= 22;
    }

    page.drawLine({ start: { x: 50, y: currentY + 10 }, end: { x: 545, y: currentY + 10 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText('Subtotal: $2,900.00', { x: 380, y: currentY - 10, size: 10, font: bold });
    page.drawText('GST (18%): $522.00', { x: 380, y: currentY - 26, size: 10, font });
    page.drawText('Grand Total: $3,422.00', { x: 380, y: currentY - 46, size: 12, font: bold, color: rgb(0.8, 0.1, 0.1) });

    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '03_invoice_table.pdf'), bytes);
  }

  // 4. Resume Document (For AI Interview Generator, AI Summarizer, Q&A)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]);

    page.drawText('Johnathan Doe', { x: 50, y: 800, size: 20, font: bold });
    page.drawText('Senior Full-Stack Engineer | San Francisco, CA | john.doe@example.com | +1-555-019-2834', { x: 50, y: 780, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

    page.drawText('Professional Summary', { x: 50, y: 745, size: 13, font: bold, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('Seasoned software engineer with 8 years of experience building distributed backend architectures, scalable document processing pipelines, and high-performance React frontends.', {
      x: 50, y: 725, size: 10, font, maxWidth: 500, lineHeight: 14
    });

    page.drawText('Technical Skills', { x: 50, y: 680, size: 13, font: bold, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('• Languages: TypeScript, JavaScript, Python, Go, SQL', { x: 50, y: 660, size: 10, font });
    page.drawText('• Frameworks: Node.js, Express, React, Next.js, Vite, Playwright', { x: 50, y: 642, size: 10, font });
    page.drawText('• Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, MongoDB, Redis', { x: 50, y: 624, size: 10, font });

    page.drawText('Work Experience', { x: 50, y: 590, size: 13, font: bold, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('Lead Systems Engineer — Apex Cloud Inc. (2021 - Present)', { x: 50, y: 570, size: 11, font: bold });
    page.drawText('- Architected automated PDF conversion and redaction engine handling 5M monthly documents with 99.98% uptime.', { x: 50, y: 552, size: 10, font, maxWidth: 500 });
    page.drawText('- Reduced p99 latency by 45% using WebAssembly workers and stream-based byte piping.', { x: 50, y: 536, size: 10, font, maxWidth: 500 });

    page.drawText('Software Engineer — Core Data Labs (2018 - 2021)', { x: 50, y: 505, size: 11, font: bold });
    page.drawText('- Developed REST and GraphQL APIs using Node.js and PostgreSQL with strict rate-limiting and JWT auth.', { x: 50, y: 488, size: 10, font, maxWidth: 500 });

    page.drawText('Education', { x: 50, y: 450, size: 13, font: bold, color: rgb(0.1, 0.3, 0.7) });
    page.drawText('Bachelor of Science in Computer Science — Stanford University (Graduated 2018, GPA 3.9)', { x: 50, y: 430, size: 10, font });

    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '04_resume_candidate.pdf'), bytes);
  }

  // 5. Redaction Test Document (Containing sensitive PII, phone, email, Aadhaar-like & SSN-like numbers)
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595.28, 841.89]);

    page.drawText('CONFIDENTIAL PERSONNEL RECORD — SENSITIVE DATA', { x: 50, y: 790, size: 16, font: bold, color: rgb(0.8, 0.1, 0.1) });
    page.drawText('Target Redaction Verification Document', { x: 50, y: 765, size: 12, font });

    page.drawText('Full Name: Priya Sharma', { x: 50, y: 720, size: 11, font });
    page.drawText('National ID: 4920-8831-2940', { x: 50, y: 695, size: 11, font });
    page.drawText('PAN Card: BZAPR8921K', { x: 50, y: 670, size: 11, font });
    page.drawText('Mobile Number: +91 98765 43210', { x: 50, y: 645, size: 11, font });
    page.drawText('Email Address: priya.secret@enterprise-domain.org', { x: 50, y: 620, size: 11, font });
    page.drawText('Bank Account: 50100482910394 IFSC: HDFC0001234', { x: 50, y: 595, size: 11, font });
    page.drawText('Secret Token: LAK-TOPSECRET-TOKEN-9988', { x: 50, y: 570, size: 11, font });
    page.drawText('Public Non-Sensitive Note: This sentence must remain completely readable after redaction.', { x: 50, y: 530, size: 11, font, color: rgb(0, 0.5, 0) });

    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '05_sensitive_pii_for_redact.pdf'), bytes);
  }

  // 6. Rotated and Varied Dimensions Document
  {
    const pdf = await PDFDocument.create();
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    // Page 1: Portrait A4
    const p1 = pdf.addPage([595.28, 841.89]);
    p1.drawText('Page 1: Standard A4 Portrait (0 deg)', { x: 50, y: 780, size: 16, font: bold });

    // Page 2: Landscape Letter (rotated 90)
    const p2 = pdf.addPage([792, 612]);
    p2.setRotation(degrees(90));
    p2.drawText('Page 2: Letter Landscape (Rotated 90 deg)', { x: 50, y: 550, size: 16, font: bold });

    // Page 3: US Legal (612 x 1008)
    const p3 = pdf.addPage([612, 1008]);
    p3.drawText('Page 3: US Legal Tall Format', { x: 50, y: 920, size: 16, font: bold });

    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '06_mixed_sizes_rotations.pdf'), bytes);
  }

  // 7. Small 1-Line PDF
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const p = pdf.addPage([300, 200]);
    p.drawText('Minimalist Single Line PDF', { x: 20, y: 100, size: 12, font });
    const bytes = await pdf.save();
    fs.writeFileSync(path.join(outDir, '07_small_single_line.pdf'), bytes);
  }

  // 8. Corrupted PDF (Invalid syntax)
  {
    fs.writeFileSync(path.join(outDir, '08_corrupted_file.pdf'), '%PDF-1.4\n%Malformed PDF stream\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nCORRUPTED_BYTES_HERE');
  }

  // 9. Zero-byte file
  {
    fs.writeFileSync(path.join(outDir, '09_zero_byte.pdf'), Buffer.alloc(0));
  }

  // 10. Non-PDF file with .pdf extension
  {
    fs.writeFileSync(path.join(outDir, '10_fake_pdf.pdf'), 'Plain text file maliciously renamed to .pdf to test parser validation.');
  }

  // 11. Word Document (.docx) for Word to PDF conversion
  {
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            children: [
              new docx.TextRun({ text: 'Official Test Document — Word to PDF Conversion', bold: true, size: 32 }),
            ],
          }),
          new docx.Paragraph({
            children: [
              new docx.TextRun({ text: 'This document tests table formatting, bold/italic fonts, and paragraph fidelity.', size: 22 }),
            ],
          }),
          new docx.Table({
            rows: [
              new docx.TableRow({
                children: [
                  new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Header Col 1', bold: true })] })] }),
                  new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Header Col 2', bold: true })] })] }),
                ],
              }),
              new docx.TableRow({
                children: [
                  new docx.TableCell({ children: [new docx.Paragraph({ text: 'Data Alpha 100' })] }),
                  new docx.TableCell({ children: [new docx.Paragraph({ text: 'Data Beta 200' })] }),
                ],
              }),
            ],
          }),
        ],
      }],
    });
    const docxBuf = await docx.Packer.toBuffer(doc);
    fs.writeFileSync(path.join(outDir, '11_sample_word.docx'), docxBuf);
  }

  // 12. PowerPoint Presentation (.pptx) for PPTX to PDF conversion
  {
    const pptx = new pptxgen();
    const slide1 = pptx.addSlide();
    slide1.addText('LakPDF Presentation Slide 1', { x: 1, y: 1, fontSize: 24, bold: true, color: '1A365D' });
    slide1.addText('Slide 1 Body: Automated testing of slides to PDF conversion.', { x: 1, y: 2.5, fontSize: 14 });

    const slide2 = pptx.addSlide();
    slide2.addText('LakPDF Presentation Slide 2', { x: 1, y: 1, fontSize: 24, bold: true, color: '276749' });
    slide2.addText('Slide 2 Body: Verifying slide count, dimensions, and text fidelity.', { x: 1, y: 2.5, fontSize: 14 });

    const pptxBuf = await pptx.write({ outputType: 'nodebuffer' });
    fs.writeFileSync(path.join(outDir, '12_sample_presentation.pptx'), pptxBuf);
  }

  // 13. High resolution synthetic test image (JPG)
  {
    // Copy existing sample jpg or public image if available
    const srcJpg = path.resolve('public/founder.jpg');
    if (fs.existsSync(srcJpg)) {
      fs.copyFileSync(srcJpg, path.join(outDir, '13_sample_photo.jpg'));
    }
    const srcPng = path.resolve('public/og-image.png');
    if (fs.existsSync(srcPng)) {
      fs.copyFileSync(srcPng, path.join(outDir, '14_sample_banner.png'));
    }
  }

  console.log('✅ Generated 14 synthetic golden test fixtures successfully.');
}

buildAllFixtures().catch((err) => {
  console.error('Failed generating test fixtures:', err);
  process.exit(1);
});
