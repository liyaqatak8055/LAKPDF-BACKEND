import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Mail, 
  Globe, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Wrench, 
  Clock, 
  Check, 
  Copy, 
  Send, 
  ShieldCheck, 
  HelpCircle, 
  ChevronDown, 
  Sparkles 
} from 'lucide-react';

export const Contact: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const [copied, setCopied] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<'support' | 'bug' | 'feature' | 'business' | 'other'>('support');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const supportEmail = "liyaqatk960@gmail.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    // Compose formatted mailto link
    const topicLabels: Record<string, string> = {
      support: "[Support Request]",
      bug: "[Bug Report]",
      feature: "[Feature Suggestion]",
      business: "[Business Inquiry]",
      other: "[General Inquiry]"
    };

    const fullSubject = `${topicLabels[selectedTopic]} ${subject || 'LAK PDF User Message'}`;
    const bodyContent = `Name: ${name}\nEmail: ${email}\nTopic: ${selectedTopic}\n\nMessage:\n${message}`;
    
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(bodyContent)}`;
    setSubmitted(true);
  };

  const faqs = [
    {
      q: "How do I report a file formatting or conversion issue?",
      a: "Please let us know which tool you were using, your browser/device type, and the approximate file size. If possible, describe whether any error message appeared. We never ask for sensitive documents."
    },
    {
      q: "Are my documents uploaded when I contact support?",
      a: "No. LAK PDF operates with client-side WebAssembly processing. Your files remain on your own device. When you email us, you only share the text information you write in your message."
    },
    {
      q: "Can I request a new tool or specific government exam preset?",
      a: "Absolutely! We actively build new features based on user requests. If you need a specific photo dimension (like SSC, UPSC, IBPS, or state exams) or an automated workflow, let us know and we usually ship it within 24-48 hours."
    },
    {
      q: "Is LAK PDF completely free for commercial or office use?",
      a: "Yes. All 30+ tools on LAK PDF are 100% free for students, teachers, businesses, and government job aspirants without any subscription fees or hidden charges."
    },
    {
      q: "What is your typical support response time?",
      a: "Our core engineering team monitors inquiries 7 days a week. We aim to reply to all user inquiries and bug reports within 6 to 12 hours."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Contact Support & Help Desk | LAK PDF</title>
        <meta
          name="description"
          content="Get in touch with LAK PDF support for technical help, bug reports, feature requests, or partnership inquiries. We reply within 6-12 hours."
        />
        <meta name="keywords" content="contact LAK PDF, support, bug report, feature request, help desk, customer service" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://lakpdf.com/contact" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact LAK PDF Support",
          "description": "Customer support and inquiry portal for LAK PDF.",
          "url": "https://lakpdf.com/contact",
          "mainEntity": {
            "@type": "Organization",
            "name": "LAK PDF",
            "email": supportEmail,
            "url": "https://lakpdf.com"
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen py-8 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-dark-surface border border-slate-200/90 dark:border-dark-border shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-slate-500 dark:text-slate-400 group-hover:text-primary-500" />
              <span>Back</span>
            </button>
          </div>

          {/* ── HEADER ── */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/60 text-primary-700 dark:text-primary-300 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>We're Here to Help</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Get in Touch with Our Team
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Have a question about a tool, encountered a formatting edge case, or want to suggest a new feature? We read and reply to every message.
            </p>
          </div>

          {/* ── TOP CONTACT CHANNELS STRIP ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            
            {/* Email Card with 1-Click Copy */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Direct Support Email</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  For bug reports, feature requests, or technical help.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-dark-border flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 truncate">
                    {supportEmail}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors"
                    title="Copy Email"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <a
                href={`mailto:${supportEmail}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-300 text-xs font-bold transition-colors"
              >
                <span>Compose Mail</span>
                <Send className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Response Time SLA Card */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Fast Turnaround</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  We value your time and prioritize user tickets promptly.
                </p>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Average Response:</span>
                    <strong className="text-slate-900 dark:text-white">Under 12 Hours</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Availability:</span>
                    <strong className="text-slate-900 dark:text-white">7 Days a Week</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Languages:</span>
                    <strong className="text-slate-900 dark:text-white">English, Hindi</strong>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-dark-border flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Support desk is online</span>
              </div>
            </div>

            {/* Official Domain & Verification */}
            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200/80 dark:border-dark-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Official Website</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Always verify you are visiting our secure, authentic domain.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-dark-border flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    https://lakpdf.com
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <a
                href="https://lakpdf.com"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                <span>Visit Homepage</span>
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

          {/* ── TWO-COLUMN MAIN SECTION: FORM + TOPIC GUIDANCE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 items-start">
            
            {/* Interactive Contact Form */}
            <div className="lg:col-span-7 bg-white dark:bg-dark-surface p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-dark-border shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Send Us a Message
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
                Fill out the details below and we will get back to you shortly.
              </p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Message Prepared!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    Your email client should have opened with your message details. If not, you can copy our email directly: <strong>{supportEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 underline hover:no-underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Topic Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Inquiry Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'support', label: 'Tech Support', icon: <Wrench className="w-3.5 h-3.5" /> },
                        { id: 'bug', label: 'Bug Report', icon: <Bug className="w-3.5 h-3.5" /> },
                        { id: 'feature', label: 'Feature Idea', icon: <Lightbulb className="w-3.5 h-3.5" /> },
                        { id: 'business', label: 'Business / Ads', icon: <Globe className="w-3.5 h-3.5" /> },
                        { id: 'other', label: 'General', icon: <MessageSquare className="w-3.5 h-3.5" /> }
                      ].map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setSelectedTopic(topic.id as any)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedTopic === topic.id
                              ? 'bg-primary-500 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {topic.icon}
                          <span>{topic.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Email Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Your Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Your Email *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Question about 50KB image compression"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Message *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {message.length} chars
                      </span>
                    </div>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what you need help with, or share your suggestion in detail..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-md shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Support Message</span>
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Help Guidelines & Privacy Guarantee */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-slate-50 dark:bg-dark-surface p-6 rounded-3xl border border-slate-200/80 dark:border-dark-border space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Privacy & Security Pledge</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  We take user confidentiality seriously. Our support staff will:
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Never request passwords, OTPs, or payment details.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Never sell or share your contact email address.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Keep all troubleshooting discussions strictly confidential.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary-50 to-sky-50 dark:from-primary-950/40 dark:to-dark-surface p-6 rounded-3xl border border-primary-200/80 dark:border-primary-900/60 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary-500" />
                  <span>Submitting a Feature Request?</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Have an idea for a document tool that could help your daily workflow or student exam applications? Let us know the exact document requirements (e.g. 20KB-50KB JPG, 300 DPI, signature dimensions) and we’ll build it!
                </p>
              </div>

            </div>

          </div>

          {/* ── FAQ SECTION ACCORDION ── */}
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary-500" />
                <span>Frequently Asked Questions</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Quick answers to common questions about LAK PDF support.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/80 dark:border-dark-border overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${expandedFaq === idx ? 'rotate-180 text-primary-500' : ''}`} />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-dark-border/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
