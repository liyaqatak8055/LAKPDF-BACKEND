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
}

main().catch(console.error);
