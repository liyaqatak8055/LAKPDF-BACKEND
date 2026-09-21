const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

async function main() {
  const dir = path.join(__dirname, 'test-suite');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Copy sample docx
  const mammothDocx = path.join(__dirname, '../node_modules/mammoth/test/test-data/single-paragraph.docx');
  const targetDocx = path.join(dir, 'sample.docx');
  if (fs.existsSync(mammothDocx)) {
    fs.copyFileSync(mammothDocx, targetDocx);
    console.log('Copied sample.docx');
  }

  // Create sample pptx
  const pres = new pptxgen();
  const slide = pres.addSlide();
  slide.addText('LAK PDF Test Slide', { x: 1, y: 1, fontSize: 24, color: '363636' });
  const targetPptx = path.join(dir, 'sample.pptx');
  await pres.writeFile({ fileName: targetPptx });
  console.log('Created sample.pptx');

  // Create multipage.pdf if missing
  const multipagePdfPath = path.join(__dirname, 'multipage.pdf');
  if (!fs.existsSync(multipagePdfPath)) {
    const { PDFDocument } = require('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const p1 = pdfDoc.addPage([600, 400]);
    p1.drawText('Page 1 Content for Redaction Test', { x: 50, y: 350, size: 20 });
    const p2 = pdfDoc.addPage([600, 400]);
    p2.drawText('Page 2 Content for Redaction Test', { x: 50, y: 350, size: 20 });
    fs.writeFileSync(multipagePdfPath, await pdfDoc.save());
    console.log('Created multipage.pdf');
  }

  // Create user-exact-doc.docx if missing
  const userDocxPath = path.join(__dirname, 'user-exact-doc.docx');
  if (!fs.existsSync(userDocxPath)) {
    const docx = require('docx');
    const doc = new docx.Document({
      sections: [{
        children: [
          new docx.Paragraph({ children: [new docx.TextRun('Page 1 of User Exact Document')] }),
          new docx.Paragraph({ children: [new docx.PageBreak()] }),
          new docx.Paragraph({ children: [new docx.TextRun('Page 2 of User Exact Document')] })
        ]
      }]
    });
    fs.writeFileSync(userDocxPath, await docx.Packer.toBuffer(doc));
    console.log('Created user-exact-doc.docx');
  }
}

main().catch(console.error);
