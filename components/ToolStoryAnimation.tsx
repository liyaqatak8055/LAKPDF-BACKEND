import React from 'react';

interface ToolStoryAnimationProps {
  toolId: string;
}

/**
 * ToolStoryAnimation
 * Features:
 * - 2-Stage conversion flow from left (-30%) to right (118%).
 * - Micro water splash sparkle at 50% conversion center.
 * - Trailing water wake bubbles behind the vessel.
 * - Dynamic speed-up and water reaction on card hover.
 * - Bioluminescent neon glow in Dark Mode.
 */
export const ToolStoryAnimation: React.FC<ToolStoryAnimationProps> = ({ toolId }) => {
  const normalizedId = toolId.replace(/^\//, '');

  // Helper renderer with wake trail and center splash
  const renderShipTrack = (
    badgeClass: string,
    startContent: React.ReactNode,
    endContent: React.ReactNode,
    isRotate = false
  ) => {
    return (
      <div className="tool-story-stage" aria-hidden="true">
        <div className="story-track">
          {/* Floating Vessel with Trailing Wake */}
          <div
            className={`story-item story-continuous-ship ${isRotate ? 'story-rotate-ship' : ''
              }`}
          >
            {/* Trailing foam/bubbles behind ship */}
            <div className="story-wake-foam" />

            {/* Badge container */}
            <div className={`story-card-badge ${badgeClass}`}>
              <span className="morph-stage-start">{startContent}</span>
              <span className="morph-stage-end">{endContent}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 1. COMPRESS PDF
  if (
    normalizedId.includes('compress-pdf') ||
    normalizedId === 'compress'
  ) {
    return renderShipTrack(
      'badge-morph-compress-pdf',
      <>📄 10MB PDF</>,
      <>📉 200KB PDF</>
    );
  }

  // 2. IMAGE TO PDF
  if (normalizedId === 'img-to-pdf' || normalizedId === 'image-to-pdf') {
    return renderShipTrack(
      'badge-morph-img-to-pdf',
      <>🖼️ JPG Photo</>,
      <>📄 PDF Doc</>
    );
  }

  // 3. PDF TO IMAGE
  if (normalizedId === 'pdf-to-img') {
    return renderShipTrack(
      'badge-morph-pdf-to-img',
      <>📄 PDF Doc</>,
      <>🖼️ JPG Photo</>
    );
  }

  // 4. COMPRESS IMAGE
  if (
    normalizedId.includes('compress-img') ||
    normalizedId === 'advance-compress-img'
  ) {
    return renderShipTrack(
      'badge-morph-compress-img',
      <>🖼️ 5MB IMG</>,
      <>⚡ 50KB IMG</>
    );
  }

  // 5. PDF TO WORD
  if (normalizedId === 'pdf-to-word') {
    return renderShipTrack(
      'badge-morph-pdf-to-word',
      <>📄 PDF Doc</>,
      <>📝 Word DOCX</>
    );
  }

  // 6. WORD TO PDF
  if (normalizedId === 'word-to-pdf') {
    return renderShipTrack(
      'badge-morph-word-to-pdf',
      <>📝 Word DOCX</>,
      <>📄 PDF Doc</>
    );
  }

  // 6b. PDF TO POWERPOINT
  if (
    normalizedId === 'pdf-to-powerpoint' ||
    normalizedId === 'pdf-to-ppt'
  ) {
    return renderShipTrack(
      'badge-morph-pdf-to-ppt',
      <>📄 PDF Doc</>,
      <>📊 PPTX Slides</>
    );
  }

  // 6c. POWERPOINT TO PDF
  if (
    normalizedId === 'powerpoint-to-pdf' ||
    normalizedId === 'ppt-to-pdf'
  ) {
    return renderShipTrack(
      'badge-morph-ppt-to-pdf',
      <>📊 PPTX Slides</>,
      <>📄 PDF Doc</>
    );
  }


  // 7. MERGE PDF: 2 separate floating PDF boxes (0% to 50%) merge into 1 Combined PDF (50% to 100%)
  if (
    normalizedId === 'merge' ||
    normalizedId === 'merge-pdf' ||
    normalizedId.includes('merge')
  ) {
    return (
      <div className="tool-story-stage" aria-hidden="true">
        <div className="story-track">
          {/* Stage 1: 2 Separate floating boxes (0% to 50%) */}
          <div className="story-item story-merge-box-1">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-merge-box-1">
              <span>📄 PDF 1</span>
            </div>
          </div>
          <div className="story-item story-merge-box-2">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-merge-box-2">
              <span>📄 PDF 2</span>
            </div>
          </div>

          {/* Stage 2: 1 Combined MERGED PDF box (50% to 100%) */}
          <div className="story-item story-merge-combined">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-merge-combined">
              <span>📚 1 Merged PDF</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 8. SPLIT PDF: 1 Big PDF (0% to 50%) splits into 2 separate page boxes from 50% to 100%
  if (
    normalizedId === 'split' ||
    normalizedId === 'split-pdf' ||
    normalizedId.includes('split')
  ) {
    return (
      <div className="tool-story-stage" aria-hidden="true">
        <div className="story-track">
          {/* Stage 1: 1 Single Big PDF box (0% to 50%) */}
          <div className="story-item story-split-single">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-split-parent">
              <span>📑 1 Big PDF</span>
            </div>
          </div>

          {/* Stage 2: 2 Separate split boxes (50% to 100%) */}
          <div className="story-item story-split-box-1">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-split-child-1">
              <span>✂️ Page 1</span>
            </div>
          </div>
          <div className="story-item story-split-box-2">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-split-child-2">
              <span>✂️ Page 2</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // 9. SIGN PDF
  if (normalizedId === 'sign-pdf') {
    return renderShipTrack(
      'badge-morph-sign',
      <>📄 Plain PDF</>,
      <>✍️ Signed PDF</>
    );
  }

  // 10. ROTATE PDF: Continuously rotating page as it sails across
  if (
    normalizedId === 'rotate' ||
    normalizedId === 'rotate-pdf' ||
    normalizedId.includes('rotate')
  ) {
    return (
      <div className="tool-story-stage" aria-hidden="true">
        <div className="story-track">
          {/* Floating Vessel with Trailing Wake */}
          <div className="story-item story-continuous-ship story-rotate-ship">
            <div className="story-wake-foam" />
            <div className="story-card-badge badge-morph-rotate">
              <span className="story-rotate-doc-icon">📄</span>
              <span className="morph-stage-start">0° Rotate</span>
              <span className="morph-stage-end">90° Rotated</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // 11. OCR PDF
  if (normalizedId === 'ocr-pdf') {
    return renderShipTrack(
      'badge-morph-ocr',
      <>📷 Scanned PDF</>,
      <>🔍 Text OCR</>
    );
  }

  // 12. DELETE PAGES: 📄 5 Pages -> 🗑️ 4 Pages
  if (
    normalizedId === 'delete-page' ||
    normalizedId === 'delete-pages' ||
    normalizedId.includes('delete')
  ) {
    return renderShipTrack(
      'badge-morph-delete',
      <>📄 5 Pages</>,
      <>🗑️ 4 Pages</>
    );
  }

  // 13. ORGANIZE PDF: 🔀 P3, P1, P2 -> 📋 P1, P2, P3
  if (normalizedId === 'organize-pdf' || normalizedId === 'organize') {
    return renderShipTrack(
      'badge-morph-organize',
      <>🔀 P3, P1, P2</>,
      <>📋 P1, P2, P3</>
    );
  }

  // 14. PAGE NUMBERS: 📄 Plain PDF -> 🔢 Page 1, 2, 3
  if (
    normalizedId === 'page-number' ||
    normalizedId === 'page-numbers' ||
    normalizedId.includes('page-number')
  ) {
    return renderShipTrack(
      'badge-morph-page-numbers',
      <>📄 Plain PDF</>,
      <>🔢 Page 1, 2, 3</>
    );
  }

  // 15. CROP PDF: 📐 Full Margin -> ✂️ Cropped PDF
  if (normalizedId === 'crop-pdf' || normalizedId === 'crop') {
    return renderShipTrack(
      'badge-morph-crop',
      <>📐 Full Margin</>,
      <>✂️ Cropped PDF</>
    );
  }

  // 16. DETECT DUPLICATES: 👥 2x Duplicate -> ✨ Clean Unique
  if (
    normalizedId === 'detect-duplicates' ||
    normalizedId.includes('duplicate')
  ) {
    return renderShipTrack(
      'badge-morph-duplicates',
      <>👥 2x Duplicate</>,
      <>✨ Clean Unique</>
    );
  }

  // 17. SCAN TO PDF: 📷 Camera Paper -> 📄 Clean PDF
  if (
    normalizedId === 'scan-pdf' ||
    normalizedId === 'scan-to-pdf' ||
    normalizedId.includes('scan')
  ) {
    return renderShipTrack(
      'badge-morph-scan-pdf',
      <>📷 Camera Paper</>,
      <>📄 Clean PDF</>
    );
  }

  // 18. COMPARE PDF: ⚖️ Doc A vs Doc B -> 🔍 Diff Highlight
  if (
    normalizedId === 'compare-pdf' ||
    normalizedId === 'compare' ||
    normalizedId.includes('compare')
  ) {
    return renderShipTrack(
      'badge-morph-compare',
      <>⚖️ Doc A vs Doc B</>,
      <>🔍 Diff Highlight</>
    );
  }

  // 19. PDF EDITOR: 📄 Read-Only PDF -> ✏️ EDITED PDF
  if (
    normalizedId === 'pdf-editor' ||
    normalizedId === 'edit-pdf' ||
    normalizedId.includes('editor')
  ) {
    return renderShipTrack(
      'badge-morph-editor',
      <>📄 Read-Only PDF</>,
      <>✏️ EDITED PDF</>
    );
  }

  // 20. WATERMARK PDF: 📄 No Watermark -> 💧 WATERMARKED
  if (
    normalizedId === 'watermark' ||
    normalizedId === 'watermark-pdf' ||
    normalizedId.includes('watermark')
  ) {
    return renderShipTrack(
      'badge-morph-watermark',
      <>📄 No Watermark</>,
      <>💧 WATERMARKED</>
    );
  }

  // 21. FORMDOCFIXER / GOVT EXAM RESIZER: 📸 Raw Photo -> ✅ 20-50KB SSC
  if (
    normalizedId === 'govt-exam-resizer' ||
    normalizedId === 'form-doc-fixer' ||
    normalizedId === 'formdocfixer' ||
    normalizedId.includes('sarkari')
  ) {
    return renderShipTrack(
      'badge-morph-govt-exam',
      <>📸 Raw Photo</>,
      <>✅ 20-50KB SSC</>
    );
  }

  // 22. PASSPORT PHOTO MAKER: 📱 Phone Pic -> 👔 3.5×4.5cm
  if (
    normalizedId === 'passport-photo-maker' ||
    normalizedId === 'passport-photo' ||
    normalizedId.includes('passport')
  ) {
    return renderShipTrack(
      'badge-morph-passport',
      <>📱 Phone Pic</>,
      <>👔 3.5×4.5cm</>
    );
  }

  // 23. MAKE PPT (Images to PPT): 🖼️ JPG Images -> 📊 PPTX Slides
  if (
    normalizedId === 'make-ppt' ||
    normalizedId === 'img-to-ppt' ||
    normalizedId.includes('make-ppt')
  ) {
    return renderShipTrack(
      'badge-morph-make-ppt',
      <>🖼️ JPG Images</>,
      <>📊 PPTX Slides</>
    );
  }

  // 24. REDACT PDF: 🔒 Aadhaar/PAN -> ⬛ 100% Redacted
  if (
    normalizedId === 'redact-pdf' ||
    normalizedId === 'blackout-pdf' ||
    normalizedId.includes('redact') ||
    normalizedId.includes('blackout')
  ) {
    return renderShipTrack(
      'badge-morph-redact',
      <>🔒 Aadhaar/PAN</>,
      <>⬛ Redacted</>
    );
  }

  // 25. AI SUMMARY / Q&A: 📚 50-Page PDF -> 💡 AI Summary
  if (
    normalizedId === 'summarizer-qa' ||
    normalizedId === 'ai-summary' ||
    normalizedId.includes('summarizer')
  ) {
    return renderShipTrack(
      'badge-morph-summarizer',
      <>📚 50-Page PDF</>,
      <>💡 AI Summary</>
    );
  }

  // 26. AI PDF TO MCQ: 📖 Notes PDF -> ❓ 100+ MCQs
  if (
    normalizedId === 'ai-pdf-to-mcq' ||
    normalizedId === 'pdf-to-mcq' ||
    normalizedId.includes('mcq')
  ) {
    return renderShipTrack(
      'badge-morph-mcq',
      <>📖 Notes PDF</>,
      <>❓ 100+ MCQs</>
    );
  }

  // 27. AI INTERVIEW GENERATOR: 📄 Resume PDF -> 🎯 Interview Q&A
  if (
    normalizedId === 'ai-interview-generator' ||
    normalizedId === 'ai-interview-prep' ||
    normalizedId.includes('interview')
  ) {
    return renderShipTrack(
      'badge-morph-interview',
      <>📄 Resume PDF</>,
      <>🎯 Interview Q&A</>
    );
  }

  // 28. AI EDIT PDF: 📄 PDF Doc -> ✨ AI Edited
  if (
    normalizedId === 'ai-edit-pdf' ||
    normalizedId.includes('ai-edit')
  ) {
    return renderShipTrack(
      'badge-morph-ai-edit',
      <>📄 PDF Doc</>,
      <>✨ AI Edited</>
    );
  }

  // 29. PROTECT PDF: 🔓 Plain PDF -> 🔐 Password Protected
  if (
    normalizedId === 'protect-pdf' ||
    normalizedId === 'protect'
  ) {
    return renderShipTrack(
      'badge-morph-protect',
      <>🔓 Plain PDF</>,
      <>🔐 Protected</>
    );
  }

  // 30. UNLOCK PDF: 🔐 Locked PDF -> 🔓 Unlocked PDF
  if (
    normalizedId === 'unlock-pdf' ||
    normalizedId === 'unlock'
  ) {
    return renderShipTrack(
      'badge-morph-unlock',
      <>🔐 Locked PDF</>,
      <>🔓 Unlocked</>
    );
  }

  // 31. PDF TO TEXT: 📄 PDF Doc -> 📝 Text TXT
  if (
    normalizedId === 'pdf-to-text' ||
    normalizedId.includes('pdf-to-text')
  ) {
    return renderShipTrack(
      'badge-morph-pdf-to-text',
      <>📄 PDF Doc</>,
      <>📝 Text TXT</>
    );
  }

  // Default
  return renderShipTrack(
    'badge-doc-neutral',
    <>📄 PDF Doc</>,
    <>📄 PDF Doc</>
  );
};









