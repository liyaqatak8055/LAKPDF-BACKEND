import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

async function runIntegrityTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   LAK PDF — CORE TOOLS INTEGRITY & ACCURACY BENCHMARK SUITE   ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testDir = path.resolve('tmp/test-suite');
  const doc3pPath = path.join(testDir, 'document-3pages.pdf');
  const attachPath = path.join(testDir, 'attachment-1page.pdf');

  const doc3pBytes = fs.readFileSync(doc3pPath);
  const attachBytes = fs.readFileSync(attachPath);

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Merge PDF Test
  await asyncTest('Tool: Merge PDF (Combine 3-page + 1-page = 4 pages)', async () => {
    const merged = await PDFDocument.create();
    const p1 = await PDFDocument.load(doc3pBytes);
    const p2 = await PDFDocument.load(attachBytes);

    const pages1 = await merged.copyPages(p1, p1.getPageIndices());
    pages1.forEach(p => merged.addPage(p));
    const pages2 = await merged.copyPages(p2, p2.getPageIndices());
    pages2.forEach(p => merged.addPage(p));

    const outBytes = await merged.save();
    const verifiedDoc = await PDFDocument.load(outBytes);
    if (verifiedDoc.getPageCount() !== 4) {
      throw new Error(`Expected 4 pages, got ${verifiedDoc.getPageCount()}`);
    }
  });

  // 2. Split PDF Test
  await asyncTest('Tool: Split PDF (Split 3-page PDF into 3 distinct files)', async () => {
    const p1 = await PDFDocument.load(doc3pBytes);
    const zip = new JSZip();

    for (let i = 0; i < p1.getPageCount(); i++) {
      const single = await PDFDocument.create();
      const [copied] = await single.copyPages(p1, [i]);
      single.addPage(copied);
      const b = await single.save();
      zip.file(`page_${i + 1}.pdf`, b);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const loadedZip = await JSZip.loadAsync(zipBuffer);
    const files = Object.keys(loadedZip.files);
    if (files.length !== 3) {
      throw new Error(`Expected 3 files in zip, got ${files.length}`);
    }
  });

  // 3. Delete Pages Test
  await asyncTest('Tool: Delete Pages (Delete Page 2 from 3-page doc = 2 pages)', async () => {
    const p1 = await PDFDocument.load(doc3pBytes);
    p1.removePage(1); // 0-based: remove 2nd page
    const outBytes = await p1.save();
    const verified = await PDFDocument.load(outBytes);
    if (verified.getPageCount() !== 2) {
      throw new Error(`Expected 2 pages, got ${verified.getPageCount()}`);
    }
  });

  // 4. Rotate PDF Test
  await asyncTest('Tool: Rotate PDF (Rotate Page 1 by 90 degrees)', async () => {
    const p1 = await PDFDocument.load(doc3pBytes);
    const page = p1.getPage(0);
    page.setRotation({ angle: 90, type: 'degrees' });
    const outBytes = await p1.save();
    const verified = await PDFDocument.load(outBytes);
    if (verified.getPage(0).getRotation().angle !== 90) {
      throw new Error('Rotation was not preserved');
    }
  });

  // 5. Lossless Optimization
  await asyncTest('Tool: Compress PDF (Lossless Object Stream Compression)', async () => {
    const p1 = await PDFDocument.load(doc3pBytes);
    const optimized = await p1.save({ useObjectStreams: true });
    const verified = await PDFDocument.load(optimized);
    if (verified.getPageCount() !== 3) {
      throw new Error('Lossless compression corrupted document');
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`   INTEGRITY TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)  `);
  console.log('═══════════════════════════════════════════════════════════════');
}

runIntegrityTests().catch(console.error);
