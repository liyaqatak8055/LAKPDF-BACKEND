import React from "react";
import { Helmet } from "react-helmet-async";
import { ToolSEOContent } from "../components/ToolSEOContent";
import { ComingSoonTool } from "../components/ComingSoonTool";

export const AiPdfToMcq: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>AI PDF to MCQ Generator Online Free | Question Paper Maker - LAK PDF</title>
        <meta
          name="description"
          content="Generate multiple choice questions (MCQs) from PDF online free. Create question papers, answer keys, and quizzes from study materials with AI."
        />
        <link rel="canonical" href="https://lakpdf.com/ai-pdf-to-mcq" />
        <meta property="og:title" content="AI PDF to MCQ Generator Online Free - LAK PDF" />
        <meta property="og:description" content="Generate multiple choice questions (MCQs) from PDF online free. Create quizzes and question papers instantly." />
        <meta property="og:url" content="https://lakpdf.com/ai-pdf-to-mcq" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lakpdf.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="AI PDF to MCQ Generator Online Free - LAK PDF" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI PDF to MCQ Generator Online Free - LAK PDF" />
        <meta name="twitter:description" content="Generate multiple choice questions (MCQs) from PDF online free." />
        <meta name="twitter:image" content="https://lakpdf.com/og-image.png" />
      </Helmet>

      <ComingSoonTool
        title="AI PDF to MCQ Generator"
        subtitle="Transform school notes, chapters & syllabus into mock exams and quizzes"
        description="We are developing an AI quiz generation engine capable of automatically extracting key facts, definitions, and theories from your PDFs to create customized MCQs with full answer keys and detailed explanations."
        features={[
          "Difficulty Selection (Easy, Medium, Hard)",
          "Interactive Timed Quiz Test Mode",
          "Automated Scorecard & Mistake Analysis",
          "Download Printable MCQ Question Paper PDF",
          "Download Teacher's Answer Key with Explanations",
          "1-Click Copy to Clipboard for Google Forms / Quizizz"
        ]}
        estimatedLaunch="Launching in Next Update"
        relatedTools={[
          { label: "PDF to Word", path: "/pdf-to-word" },
          { label: "Word to PDF", path: "/word-to-pdf" },
          { label: "Merge PDF", path: "/merge" },
          { label: "Page Numbers", path: "/page-number" }
        ]}
      />

      <ToolSEOContent toolKey="/ai-pdf-to-mcq" />
    </>
  );
};

export default AiPdfToMcq;
