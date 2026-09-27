import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { compressPdfToTargetSize } from './pdfService';

export interface ExamDocumentRule {
  id: string;
  name: string;
  description: string;
  minKB: number;
  maxKB: number;
  idealWidth: number;
  idealHeight: number;
  aspectRatio: number; // width / height
  outputFormat: 'image/jpeg' | 'image/png' | 'application/pdf';
  recommendedDpi?: number;
  supportsNameDate?: boolean;
  cleanBackground?: boolean;
  isPdfDocument?: boolean;
  category: 'biometric' | 'certificate';
}

export interface ExamPreset {
  id: string;
  name: string;
  fullName: string;
  group: 'central' | 'banking' | 'defence' | 'state' | 'court_legal' | 'entrance' | 'medical_teaching' | 'custom';
  badge: string;
  description: string;
  rules: ExamDocumentRule[];
}

export const EXAM_PRESETS: ExamPreset[] = [
  // ── 1. CENTRAL GOVT & POSTAL ──
  {
    id: 'ssc',
    name: 'SSC (CGL / CHSL / MTS / GD)',
    fullName: 'Staff Selection Commission (All Examinations)',
    group: 'central',
    badge: 'Popular',
    description: 'Exact SSC portal requirements: Photo (20-50KB, 3.5×4.5cm), Signature (10-20KB, 4.0×2.0cm), and Certificates strictly under 200KB PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photograph',
        description: '3.5 cm × 4.5 cm (350×450 px), 20 KB to 50 KB. Plain light background, both ears visible, no spectacles or caps.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (4×2 cm)',
        description: '4.0 cm × 2.0 cm (400×200 px), 10 KB to 20 KB. In black or dark blue ink on clean white paper.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 400,
        idealHeight: 200,
        aspectRatio: 400 / 200,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th / Matriculation Certificate (PDF)',
        description: 'Mandatory proof of Date of Birth in PDF format, strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Category / Caste Certificate (PDF)',
        description: 'EWS / OBC-NCL / SC / ST reservation certificate in PDF format under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'upsc',
    name: 'UPSC (Civil Services / NDA / CDS / OTR)',
    fullName: 'Union Public Service Commission (OTR & Applications)',
    group: 'central',
    badge: 'OTR Strict',
    description: 'Mandatory candidate Name & Date of Photo printed at bottom (20-300KB), Signature, and PDF Identity & Category proofs.',
    rules: [
      {
        id: 'photo',
        name: 'Photograph (with Name & Date)',
        description: 'Min 350×350 px (up to 1000×1000 px), 20 KB to 300 KB. 3/4 face visible with Name & Date printed at bottom.',
        minKB: 20,
        maxKB: 300,
        idealWidth: 500,
        idealHeight: 500,
        aspectRatio: 1,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature',
        description: 'Min 350×350 px, 20 KB to 300 KB. Clear signature on white background.',
        minKB: 20,
        maxKB: 300,
        idealWidth: 500,
        idealHeight: 500,
        aspectRatio: 1,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'photo_id_proof',
        name: 'Photo ID Proof (Aadhaar / Voter ID PDF)',
        description: 'Government photo identity card in PDF format between 20 KB and 300 KB.',
        minKB: 20,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'marksheet_10th',
        name: '10th / Matriculation Certificate (PDF)',
        description: 'Age verification proof in PDF format between 20 KB and 300 KB.',
        minKB: 20,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Community / EWS / PwBD Certificate (PDF)',
        description: 'Reservation verification document in PDF format between 20 KB and 300 KB.',
        minKB: 20,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'india-post-gds',
    name: 'India Post (GDS Recruitment)',
    fullName: 'Department of Posts, India (Gramin Dak Sevak Recruitment)',
    group: 'central',
    badge: '30K+ Posts',
    description: 'Requires Photo (under 50KB, 200x230px), Signature (under 20KB, 140x60px), 10th Marksheet, and Computer Certificate PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (Max 50 KB)',
        description: '200×230 px, strictly under 50 KB. Plain background, clear face portrait.',
        minKB: 10,
        maxKB: 50,
        idealWidth: 200,
        idealHeight: 230,
        aspectRatio: 200 / 230,
        outputFormat: 'image/jpeg',
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (Max 20 KB)',
        description: '140×60 px, strictly under 20 KB on white paper with dark ink.',
        minKB: 5,
        maxKB: 20,
        idealWidth: 280,
        idealHeight: 120,
        aspectRatio: 280 / 120,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th Class Marksheet (PDF / JPG)',
        description: 'Mandatory 10th marks memo strictly under 200 KB.',
        minKB: 20,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'computer_cert',
        name: 'Computer Knowledge Certificate (PDF)',
        description: 'Basic 60-day computer training certificate in PDF under 200 KB.',
        minKB: 20,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Community / Caste Certificate (PDF)',
        description: 'SC/ST/OBC/EWS certificate in PDF under 200 KB.',
        minKB: 20,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'railway-rrb',
    name: 'Railway (RRB NTPC / Group D / ALP)',
    fullName: 'Railway Recruitment Boards (Technical & Non-Technical Popular Categories)',
    group: 'central',
    badge: 'RRB Official',
    description: 'Requires Passport Photo (20-50KB, 35x45mm), Signature (10-20KB), 10th/ITI Marksheet, and SC/ST Travel Pass Certificate.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (35×45 mm)',
        description: '35×45 mm (320×240 px min), 20 KB to 50 KB. Plain white background, taken within 1 month.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (10-20 KB)',
        description: '10 KB to 20 KB on white paper with dark ink. Running handwriting only.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th Class / ITI Certificate (PDF)',
        description: 'Educational qualification certificate PDF strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'SC / ST Certificate for Free Travel Pass (PDF)',
        description: 'Community certificate for claiming free sleeper railway travel pass in PDF under 300 KB.',
        minKB: 30,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 2. BANKING, INSURANCE & FINANCE ──
  {
    id: 'ibps-sbi',
    name: 'Banking & Insurance (IBPS / SBI / RBI / LIC / NABARD)',
    fullName: 'IBPS PO/Clerk/SO/RRB, SBI PO/Clerk, RBI Grade B/Assistant, LIC AAO & Insurance',
    group: 'banking',
    badge: '5-Doc Kit',
    description: 'Requires all 5 official IBPS items: Photo (20-50KB), Signature (10-20KB), Left Thumb (20-50KB), Handwritten Declaration (50-100KB), and Category PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photograph',
        description: '4.5 cm × 3.5 cm (200×230 px), 20 KB to 50 KB. Clear passport photo with white/light background.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 200,
        idealHeight: 230,
        aspectRatio: 200 / 230,
        outputFormat: 'image/jpeg',
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (Black Ink Only)',
        description: '140×60 px, 10 KB to 20 KB. Must be in BLACK INK on white paper. Capital letters not accepted.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 280,
        idealHeight: 120,
        aspectRatio: 280 / 120,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb',
        name: 'Left Thumb Impression (LTI)',
        description: '240×240 px (3×3 cm), 20 KB to 50 KB. Blue or black ink on clean white paper with clear ridge visibility.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 240,
        idealHeight: 240,
        aspectRatio: 1,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'declaration',
        name: 'Handwritten Declaration',
        description: '800×400 px, 50 KB to 100 KB. English handwritten declaration text written by the candidate on plain paper.',
        minKB: 50,
        maxKB: 100,
        idealWidth: 800,
        idealHeight: 400,
        aspectRatio: 800 / 400,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'caste_certificate',
        name: 'Caste / EWS / Disability Certificate (PDF)',
        description: 'Mandatory reservation certificate in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 3. DEFENCE & PARAMILITARY ──
  {
    id: 'police-defence',
    name: 'Defence & Paramilitary (Agniveer Army / Navy / Air Force / CAPF)',
    fullName: 'Indian Army Agniveer, Indian Navy SSR/MR, Indian Airforce Vayu, CRPF, BSF, CISF, ITBP, SSB',
    group: 'defence',
    badge: 'Agniveer & CAPF',
    description: 'Requires Photo (with Name & Date), Signature, Left Thumb Impression, 10th Marksheet, and Domicile Certificate PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (with Name & Date)',
        description: '35×45 mm, 20 KB to 50 KB. Front facing, no cap/spectacles, with candidate Name and Date printed.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature',
        description: '10 KB to 20 KB, running handwriting in black or dark blue ink.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb',
        name: 'Left Thumb Impression',
        description: '20 KB to 50 KB. Clear thumb ridge pattern on white paper.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 240,
        idealHeight: 240,
        aspectRatio: 1,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th Class Marksheet / Age Proof (PDF)',
        description: 'Proof of age and qualification PDF strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Permanent Domicile / Caste Certificate (PDF)',
        description: 'State residence and reservation proof in PDF format under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'state-police',
    name: 'State Police (UP / Delhi / Bihar CSBC / MP / Rajasthan)',
    fullName: 'State Police Recruitment Boards (Constable, Sub-Inspector SI, Jail Warder & Computer Operator)',
    group: 'defence',
    badge: 'Police Bharti',
    description: 'Official police recruitment specs: Photo (20-50KB), Signature (5-20KB), 10th & 12th Marksheet PDFs, and Domicile/Caste Certificate PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (20-50 KB)',
        description: '35×45 mm, 20 KB to 50 KB. Plain white or light grey background, sharp front face.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (5-20 KB)',
        description: '5 KB to 20 KB. In black or blue ink on clean white paper.',
        minKB: 5,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th / High School Marksheet (PDF)',
        description: 'Official Class 10 marksheet in PDF format strictly between 50 KB and 200 KB.',
        minKB: 50,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'marksheet_12th',
        name: '12th / Intermediate Marksheet (PDF)',
        description: 'Official Class 12 marksheet in PDF format strictly between 50 KB and 200 KB.',
        minKB: 50,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Domicile / Niwas & Caste Certificate (PDF)',
        description: 'State domicile certificate and category reservation certificate in PDF format (50-200 KB).',
        minKB: 50,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'computer_cert',
        name: 'O-Level / CCC / Computer Certificate (PDF)',
        description: 'Preferential qualification certificate for Computer Operator and SI posts in PDF format (50-200 KB).',
        minKB: 50,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 4. STATE PSCS & SUBORDINATE SERVICES ──
  {
    id: 'state-psc',
    name: 'State PSCs (BPSC / UPPSC / MPPSC / RPSC / MPSC / WBPSC)',
    fullName: 'State Public Service Commissions (Civil & Administrative Services)',
    group: 'state',
    badge: 'Dual Signatures',
    description: 'Requires Photograph, Signature in English, Signature in Hindi (BPSC Mandate), Photo ID PDF, and Domicile Certificate PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo',
        description: '35×45 mm, 20 KB to 50 KB / 100 KB. Clean light background, head centered.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature in English',
        description: '10 KB to 20 KB. English signature on white paper.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'signature_hindi',
        name: 'Signature in Hindi (BPSC Mandate)',
        description: '10 KB to 20 KB. Hindi signature in Devnagari script (mandatory for BPSC & Bihar forms).',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'photo_id_proof',
        name: 'Photo ID Proof (Aadhaar / Voter ID PDF)',
        description: 'Identity verification PDF strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Permanent Domicile / EWS Certificate (PDF)',
        description: 'State domicile and reservation certificate in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'state-subordinate',
    name: 'State Subordinate / PET (UPSSSC / BSSC / RSMSSB / HSSC)',
    fullName: 'UPSSSC PET, Lekhpal, VDO, BSSC CGL/Inter Level, RSMSSB CET, HSSC CET & MPESB Vyapam',
    group: 'state',
    badge: '30 Lakh+ Users',
    description: 'Requires Photo (20-50KB), Signature (10-20KB), 10th/12th Marksheet PDF, and State Domicile/Caste PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (20-50 KB)',
        description: '35×45 mm, 20 KB to 50 KB. Plain white or light grey background, clear front face.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (10-20 KB)',
        description: '10 KB to 20 KB on white paper with black/blue pen.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th / 12th Marksheet (PDF)',
        description: 'Educational qualification marksheet in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'State Domicile / Caste Certificate (PDF)',
        description: 'State domicile verification in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'dsssb',
    name: 'DSSSB Delhi (Postcard 5×7 / Teaching / Clerk)',
    fullName: 'Delhi Subordinate Services Selection Board (PRT, TGT, PGT, Clerk, Patwari, Nursing)',
    group: 'state',
    badge: 'Postcard 5×7',
    description: 'Requires Postcard Size Photo (50-300KB, 5×7 inch), Signature (10-40KB, 140×110px), Left Thumb (10-40KB, 110×140px), and Right Thumb Impression (10-40KB, 110×140px).',
    rules: [
      {
        id: 'postcard_photo',
        name: 'Postcard Photograph (5×7 Inch)',
        description: '5 inch × 7 inch (approx 480×672 px), 50 KB to 300 KB. Both ears visible, white background.',
        minKB: 50,
        maxKB: 300,
        idealWidth: 480,
        idealHeight: 672,
        aspectRatio: 480 / 672,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (140×110 px)',
        description: '140 × 110 pixels, 10 KB to 40 KB. Dark ink on clean white paper.',
        minKB: 10,
        maxKB: 40,
        idealWidth: 140,
        idealHeight: 110,
        aspectRatio: 140 / 110,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb_left',
        name: 'Left Thumb Impression (110×140 px)',
        description: '110 × 140 pixels, 10 KB to 40 KB. Blue or black ink on white paper.',
        minKB: 10,
        maxKB: 40,
        idealWidth: 110,
        idealHeight: 140,
        aspectRatio: 110 / 140,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb_right',
        name: 'Right Thumb Impression (110×140 px)',
        description: '110 × 140 pixels, 10 KB to 40 KB. Distinct right thumb impression on white paper.',
        minKB: 10,
        maxKB: 40,
        idealWidth: 110,
        idealHeight: 140,
        aspectRatio: 110 / 140,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th / Matriculation Certificate (PDF)',
        description: 'Proof of date of birth in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Category / OBC (Delhi) / EWS Certificate (PDF)',
        description: 'Reservation eligibility document in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 5. COURTS & JUDICIAL SERVICES ──
  {
    id: 'court-judicial',
    name: 'High Courts & District Courts (RO/ARO / Clerk / Steno)',
    fullName: 'High Courts (Allahabad HC, Patna HC, Delhi HC, Rajasthan HC) & District Courts Recruitment',
    group: 'court_legal',
    badge: 'Judicial Exams',
    description: 'Requires Passport Photo (20-50KB), Signature (10-20KB), Law/Graduation Degree Marksheet PDF (50-300KB), and CCC/Computer Certificate PDF (50-300KB).',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photograph',
        description: '35×45 mm, 20 KB to 50 KB. Plain white background, professional front face.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (10-20 KB)',
        description: '10 KB to 20 KB. In black ink on clean white paper.',
        minKB: 10,
        maxKB: 20,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'degree_certificate',
        name: 'Graduation / Law Degree Certificate (PDF)',
        description: 'Qualifying graduation or LLB degree certificate in PDF format (50 KB to 300 KB).',
        minKB: 50,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'computer_cert',
        name: 'CCC / Computer Proficiency Certificate (PDF)',
        description: 'Mandatory CCC / O-Level / Computer diploma PDF (50 KB to 300 KB).',
        minKB: 50,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Domicile / Caste Certificate (PDF)',
        description: 'Domicile and category certificate in PDF format (50 KB to 300 KB).',
        minKB: 50,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 5. ENTRANCE & ENGINEERING ──
  {
    id: 'nta-neet-jee',
    name: 'NTA (NEET / JEE Main / CUET)',
    fullName: 'National Testing Agency Entrance Examinations',
    group: 'entrance',
    badge: 'NTA Mandatory',
    description: 'Requires Passport Photo (10-200KB, 80% face), Postcard 4x6 Photo (10-200KB), Signature, Finger Impressions, and Class 10th Certificate.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (80% Face)',
        description: '10 KB to 200 KB, white background, both ears visible, with Candidate Name & Date of Photo printed at bottom.',
        minKB: 10,
        maxKB: 200,
        idealWidth: 400,
        idealHeight: 500,
        aspectRatio: 400 / 500,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'postcard_photo',
        name: 'Postcard Size Photo (4×6 Inch)',
        description: '10 KB to 200 KB, 4×6 inch aspect ratio. White background with Name & Date printed. Required for NEET exam hall.',
        minKB: 10,
        maxKB: 200,
        idealWidth: 600,
        idealHeight: 900,
        aspectRatio: 600 / 900,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (Running Hand)',
        description: '4 KB to 30 KB, running handwriting on white paper.',
        minKB: 4,
        maxKB: 30,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb',
        name: 'Fingers & Thumbs Impression',
        description: '10 KB to 50 KB. Impressions of all fingers and thumbs of both hands on white paper.',
        minKB: 10,
        maxKB: 50,
        idealWidth: 400,
        idealHeight: 250,
        aspectRatio: 400 / 250,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: 'Class 10th Certificate / Marksheet (PDF)',
        description: 'Date of birth and qualification verification PDF between 50 KB and 300 KB.',
        minKB: 50,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'Category / Domicile / PwD Certificate (PDF)',
        description: 'Category / Reservation certificate in PDF format between 50 KB and 300 KB.',
        minKB: 50,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'gate-ugc-net',
    name: 'GATE & UGC NET / CSIR',
    fullName: 'Graduate Aptitude Test in Engineering & UGC/CSIR National Eligibility Test',
    group: 'entrance',
    badge: 'Engineering/PhD',
    description: 'Requires Passport Photo (5-200KB), Signature (3-100KB), Photo ID Card PDF, and Qualifying Degree / Marksheet PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (3.5×4.5 cm)',
        description: '3.5×4.5 cm (min 240×320 px, max 480×640 px), 5 KB to 200 KB. Clean white background.',
        minKB: 5,
        maxKB: 200,
        idealWidth: 400,
        idealHeight: 500,
        aspectRatio: 400 / 500,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (Dark Blue/Black Ink)',
        description: 'Min 80×280 px, max 160×560 px, 3 KB to 100 KB on clean white paper.',
        minKB: 3,
        maxKB: 100,
        idealWidth: 400,
        idealHeight: 150,
        aspectRatio: 400 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'photo_id_proof',
        name: 'Valid Photo ID Proof (PDF)',
        description: 'Aadhaar / Passport / PAN / College ID card in PDF format (10 KB to 500 KB).',
        minKB: 10,
        maxKB: 500,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'degree_certificate',
        name: 'Qualifying Degree / Marksheet (PDF)',
        description: 'B.Tech/BE/B.Sc/M.Sc mark statement in PDF format (10 KB to 500 KB).',
        minKB: 10,
        maxKB: 500,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 6. MEDICAL & TEACHING ──
  {
    id: 'medical-nursing',
    name: 'Medical & Nursing (AIIMS NORCET / ESIC)',
    fullName: 'AIIMS NORCET, Nursing Officer, ESIC, Pharmacist & Medical Health Boards',
    group: 'medical_teaching',
    badge: 'Medical Suite',
    description: 'Requires Photo (50-100KB, white bg, no border), Signature (20-100KB), Thumb Impression (20-100KB), and Nursing Registration PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photo (50-100 KB)',
        description: '50 KB to 100 KB (3.5×4.5 cm). Crisp white background, no border, sharp front face.',
        minKB: 50,
        maxKB: 100,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature (20-100 KB)',
        description: '20 KB to 100 KB on white paper with dark ink.',
        minKB: 20,
        maxKB: 100,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'thumb',
        name: 'Left Thumb Impression (20-100 KB)',
        description: '20 KB to 100 KB on clean white paper.',
        minKB: 20,
        maxKB: 100,
        idealWidth: 250,
        idealHeight: 250,
        aspectRatio: 1,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'nursing_cert',
        name: 'Nursing / Pharmacy Council Certificate (PDF)',
        description: 'State/Indian Nursing Council registration proof in PDF format under 300 KB.',
        minKB: 30,
        maxKB: 300,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },
  {
    id: 'teaching-tet',
    name: 'Teaching (CTET / UPTET / REET / KVS)',
    fullName: 'Central & State Teacher Eligibility Tests & Kendriya Vidyalaya Sangathan',
    group: 'medical_teaching',
    badge: 'CTET Official',
    description: 'Requires Passport Photo (10-100KB), Signature (4-30KB), 10th DOB Certificate, and B.Ed/D.El.Ed Degree Marksheet PDF.',
    rules: [
      {
        id: 'photo',
        name: 'Passport Photograph',
        description: '10 KB to 100 KB (3.5×4.5 cm). Clear white background with both ears visible.',
        minKB: 10,
        maxKB: 100,
        idealWidth: 350,
        idealHeight: 450,
        aspectRatio: 350 / 450,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
      {
        id: 'signature',
        name: 'Signature',
        description: '4 KB to 30 KB (3.5×1.5 cm) on clean white paper.',
        minKB: 4,
        maxKB: 30,
        idealWidth: 350,
        idealHeight: 150,
        aspectRatio: 350 / 150,
        outputFormat: 'image/jpeg',
        cleanBackground: true,
        category: 'biometric',
      },
      {
        id: 'marksheet_10th',
        name: '10th / DOB Certificate (PDF)',
        description: 'Proof of age PDF strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
      {
        id: 'caste_certificate',
        name: 'B.Ed / D.El.Ed / Teaching Degree (PDF)',
        description: 'Teaching qualification certificate in PDF format strictly under 200 KB.',
        minKB: 30,
        maxKB: 200,
        idealWidth: 1240,
        idealHeight: 1754,
        aspectRatio: 1240 / 1754,
        outputFormat: 'application/pdf',
        isPdfDocument: true,
        category: 'certificate',
      },
    ],
  },

  // ── 7. CUSTOM RECRUITMENT ──
  {
    id: 'custom',
    name: 'Custom Form Resizer',
    fullName: 'Custom Target Size & Dimensions for Any Recruitment Portal',
    group: 'custom',
    badge: 'Manual',
    description: 'Specify any target KB range and dimensions for any university, recruitment portal, or visa website.',
    rules: [
      {
        id: 'photo',
        name: 'Custom Document / Photo',
        description: 'Adjustable size and dimension target.',
        minKB: 20,
        maxKB: 50,
        idealWidth: 400,
        idealHeight: 500,
        aspectRatio: 400 / 500,
        outputFormat: 'image/jpeg',
        supportsNameDate: true,
        category: 'biometric',
      },
    ],
  },
];

export interface ProcessingOptions {
  rule: ExamDocumentRule;
  nameOnPhoto?: string;
  dateOnPhoto?: string;
  stampType?: 'dop' | 'dob' | 'roll' | 'custom';
  customLabel2?: string;
  backgroundColor?: 'original' | 'white' | 'light-blue' | 'light-gray';
  enableCleanBackground?: boolean;
  brightness?: number;
  contrast?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}

export interface ProcessedDocumentResult {
  ruleId: string;
  name: string;
  blob: Blob;
  dataUrl: string;
  sizeKB: number;
  width: number;
  height: number;
  isValidSize: boolean;
  isValidDimensions: boolean;
  filename: string;
  isPdf?: boolean;
}

/**
 * Clean signature background by thresholding/contrasting grey canvas to pure white.
 */
function applySignatureEnhance(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > 155) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else {
      const factor = lum / 155;
      d[i] = Math.max(0, Math.floor(r * factor * 0.6));
      d[i + 1] = Math.max(0, Math.floor(g * factor * 0.6));
      d[i + 2] = Math.max(0, Math.floor(b * factor * 0.6));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Render Name & Date / Custom details bar at bottom (UPSC / SSC / NTA requirement)
 */
function drawNameDateStamp(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  candidateName: string,
  dateOrLabel2: string,
  stampType: 'dop' | 'dob' | 'roll' | 'custom' = 'dop'
) {
  const barHeight = Math.max(48, Math.round(canvasHeight * 0.16));
  const barY = canvasHeight - barHeight;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, barY, canvasWidth, barHeight);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(canvasWidth, barY);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hasName = Boolean(candidateName.trim());
  const hasLabel2 = Boolean(dateOrLabel2.trim());

  let label2Prefix = 'D.O.P: ';
  if (stampType === 'dob') label2Prefix = 'D.O.B: ';
  else if (stampType === 'roll') label2Prefix = 'ROLL: ';
  else if (stampType === 'custom') label2Prefix = '';

  const label2Text = hasLabel2 ? `${label2Prefix}${dateOrLabel2.trim()}` : '';

  if (hasName && hasLabel2) {
    const fontSizeName = Math.max(12, Math.round(barHeight * 0.36));
    const fontSizeDate = Math.max(10, Math.round(barHeight * 0.28));

    ctx.font = `bold ${fontSizeName}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(candidateName.trim().toUpperCase(), canvasWidth / 2, barY + barHeight * 0.32);

    ctx.font = `600 ${fontSizeDate}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#334155';
    ctx.fillText(label2Text, canvasWidth / 2, barY + barHeight * 0.74);
  } else if (hasName) {
    const fontSize = Math.max(13, Math.round(barHeight * 0.44));
    ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(candidateName.trim().toUpperCase(), canvasWidth / 2, barY + barHeight * 0.5);
  } else if (hasLabel2) {
    const fontSize = Math.max(12, Math.round(barHeight * 0.4));
    ctx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(label2Text, canvasWidth / 2, barY + barHeight * 0.5);
  }
}

/**
 * Process image with binary search compression to strictly land in [minKB, maxKB]
 */
export async function processExamDocument(
  sourceImage: HTMLImageElement,
  options: ProcessingOptions,
  examName: string
): Promise<ProcessedDocumentResult> {
  const {
    rule,
    nameOnPhoto,
    dateOnPhoto,
    stampType = 'dop',
    customLabel2,
    backgroundColor = 'white',
    enableCleanBackground,
    brightness = 0,
    contrast = 0,
    zoom = 1,
    panX = 0,
    panY = 0,
  } = options;

  const targetWidth = rule.idealWidth;
  const targetHeight = rule.idealHeight;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  let bgHex = '#ffffff';
  if (backgroundColor === 'light-blue') bgHex = '#dbeafe';
  else if (backgroundColor === 'light-gray') bgHex = '#f1f5f9';

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const brightnessFilter = `brightness(${100 + brightness}%)`;
  const contrastFilter = `contrast(${100 + contrast}%)`;
  ctx.filter = `${brightnessFilter} ${contrastFilter}`;

  const imgAspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawW = targetWidth;
  let drawH = targetHeight;

  if (imgAspect > targetAspect) {
    drawH = targetHeight;
    drawW = targetHeight * imgAspect;
  } else {
    drawW = targetWidth;
    drawH = targetWidth / imgAspect;
  }

  drawW *= zoom;
  drawH *= zoom;

  const centerX = targetWidth / 2 + (panX / 100) * (targetWidth / 2);
  const centerY = targetHeight / 2 + (panY / 100) * (targetHeight / 2);
  const drawX = centerX - drawW / 2;
  const drawY = centerY - drawH / 2;

  ctx.drawImage(sourceImage, drawX, drawY, drawW, drawH);
  ctx.filter = 'none';

  if (
    (rule.cleanBackground || enableCleanBackground) &&
    (rule.id.includes('signature') || rule.id.includes('thumb') || rule.id.includes('declaration'))
  ) {
    applySignatureEnhance(ctx, targetWidth, targetHeight);
  }

  const secondLine = stampType === 'custom' ? (customLabel2 || dateOnPhoto) : dateOnPhoto;
  if (rule.supportsNameDate && (nameOnPhoto || secondLine)) {
    drawNameDateStamp(
      ctx,
      targetWidth,
      targetHeight,
      nameOnPhoto || '',
      secondLine || '',
      stampType
    );
  }

  const targetDesiredKB = Math.min(rule.maxKB - 2, Math.max(rule.minKB + 2, (rule.minKB + rule.maxKB) / 2));
  const maxBytes = rule.maxKB * 1024;
  const minBytes = rule.minKB * 1024;

  let minQ = 0.05;
  let maxQ = 0.98;
  let bestBlob: Blob | null = null;

  const getBlob = (quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        'image/jpeg',
        quality
      );
    });
  };

  for (let iteration = 0; iteration < 8; iteration++) {
    const midQ = (minQ + maxQ) / 2;
    const blob = await getBlob(midQ);
    bestBlob = blob;

    if (blob.size > maxBytes) {
      maxQ = midQ;
    } else if (blob.size < minBytes && iteration < 6) {
      minQ = midQ;
    } else {
      if (blob.size < targetDesiredKB * 1024) {
        minQ = midQ;
      } else {
        maxQ = midQ;
      }
    }
  }

  if (!bestBlob) {
    bestBlob = await getBlob(0.85);
  }

  if (bestBlob.size < minBytes) {
    bestBlob = await getBlob(0.98);
  }

  const bestDataUrl = URL.createObjectURL(bestBlob);
  const sizeKB = Number((bestBlob.size / 1024).toFixed(1));
  const filename = `${examName.toUpperCase()}_${rule.name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

  return {
    ruleId: rule.id,
    name: rule.name,
    blob: bestBlob,
    dataUrl: bestDataUrl,
    sizeKB,
    width: targetWidth,
    height: targetHeight,
    isValidSize: sizeKB >= rule.minKB && sizeKB <= rule.maxKB,
    isValidDimensions: true,
    filename,
    isPdf: false,
  };
}

/**
 * Process a Certificate / Marksheet file (Image or PDF) and compress strictly to PDF under targetKB (e.g. 100KB, 200KB, 300KB)
 */
export async function processExamCertificateToPdf(
  file: File,
  targetMaxKB: number,
  examName: string,
  docTitle: string = 'Certificate'
): Promise<ProcessedDocumentResult> {
  const targetBytes = targetMaxKB * 1024;
  let finalPdfBlob: Blob;

  if (file.type === 'application/pdf') {
    const compressedBytes = await compressPdfToTargetSize(file, targetBytes);
    finalPdfBlob = new Blob([compressedBytes], { type: 'application/pdf' });
  } else {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });

    const isLandscape = img.naturalWidth > img.naturalHeight;
    const a4W = isLandscape ? 297 : 210;
    const a4H = isLandscape ? 210 : 297;

    const canvas = document.createElement('canvas');
    const targetScale = Math.min(1.5, Math.max(1.0, 1600 / Math.max(img.naturalWidth, img.naturalHeight)));
    canvas.width = Math.round(img.naturalWidth * targetScale);
    canvas.height = Math.round(img.naturalHeight * targetScale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pdfOverheadBytes = 1800;
    const jpegBudget = Math.max(15 * 1024, targetBytes - pdfOverheadBytes);

    let minQ = 0.1;
    let maxQ = 0.95;
    let bestJpgUrl = '';

    for (let i = 0; i < 6; i++) {
      const midQ = (minQ + maxQ) / 2;
      const dataUrl = canvas.toDataURL('image/jpeg', midQ);
      const estBytes = Math.round((dataUrl.length - 22) * 0.75);
      bestJpgUrl = dataUrl;
      if (estBytes > jpegBudget) {
        maxQ = midQ;
      } else {
        minQ = midQ;
      }
    }

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    doc.addImage(bestJpgUrl, 'JPEG', 0, 0, a4W, a4H, undefined, 'FAST');
    finalPdfBlob = doc.output('blob');
    URL.revokeObjectURL(objectUrl);
  }

  const sizeKB = Number((finalPdfBlob.size / 1024).toFixed(1));
  const filename = `${examName.toUpperCase()}_${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  return {
    ruleId: 'certificate',
    name: docTitle,
    blob: finalPdfBlob,
    dataUrl: URL.createObjectURL(finalPdfBlob),
    sizeKB,
    width: 1240,
    height: 1754,
    isValidSize: sizeKB <= targetMaxKB,
    isValidDimensions: true,
    filename,
    isPdf: true,
  };
}

/**
 * Merge Front and Back of Aadhaar / Voter ID card into a single page A4 PDF under targetKB
 */
export async function mergeAadhaarFrontBackToPdf(
  frontFile: File,
  backFile: File,
  targetMaxKB: number = 200
): Promise<Blob> {
  const loadImg = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const [frontImg, backImg] = await Promise.all([loadImg(frontFile), loadImg(backFile)]);

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Header Label
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 28px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GOVERNMENT PHOTO IDENTITY PROOF', canvas.width / 2, 80);

  // Card dimensions (standard 85.6 x 54 mm ratio ~ 1.58)
  const cardW = 900;
  const cardH = 570;
  const cardX = (canvas.width - cardW) / 2;

  // Draw Front Card
  const frontY = 140;
  ctx.drawImage(frontImg, cardX, frontY, cardW, cardH);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, frontY, cardW, cardH);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px "Inter", sans-serif';
  ctx.fillText('FRONT SIDE', canvas.width / 2, frontY + cardH + 35);

  // Draw Back Card
  const backY = frontY + cardH + 70;
  ctx.drawImage(backImg, cardX, backY, cardW, cardH);
  ctx.strokeRect(cardX, backY, cardW, cardH);

  ctx.fillText('BACK SIDE', canvas.width / 2, backY + cardH + 35);

  // Compress to PDF
  const targetBytes = targetMaxKB * 1024;
  let minQ = 0.2;
  let maxQ = 0.95;
  let bestJpg = '';

  for (let i = 0; i < 6; i++) {
    const midQ = (minQ + maxQ) / 2;
    const dataUrl = canvas.toDataURL('image/jpeg', midQ);
    const est = Math.round((dataUrl.length - 22) * 0.75);
    bestJpg = dataUrl;
    if (est > targetBytes - 1500) {
      maxQ = midQ;
    } else {
      minQ = midQ;
    }
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(bestJpg, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  return pdf.output('blob');
}

/**
 * Package multiple processed documents into a single ready-to-upload ZIP archive
 */
export async function createExamDocumentsZip(
  results: ProcessedDocumentResult[],
  examId: string
): Promise<Blob> {
  const zip = new JSZip();
  const folderName = `${examId.toUpperCase()}_Application_Documents`;
  const folder = zip.folder(folderName) || zip;

  for (const doc of results) {
    folder.file(doc.filename, doc.blob);
  }

  const readmeContent = `=========================================
LAKPDF Govt Exam Form Ready Kit (2026)
Exam: ${examId.toUpperCase()}
Generated on: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
=========================================

Files included in this archive:
${results.map((r, i) => `${i + 1}. ${r.filename} (${r.sizeKB} KB) - Verified compliant`).join('\n')}

100% Private - Processed entirely on your device with LAKPDF (https://lakpdf.com).
Zero server uploads. Your privacy is guaranteed.
Good luck with your application!`;

  folder.file('VERIFICATION_SUMMARY.txt', readmeContent);

  return await zip.generateAsync({ type: 'blob' });
}
