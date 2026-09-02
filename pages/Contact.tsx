import React from 'react';
import { Mail, Globe, MessageSquare, Bug, Lightbulb, Wrench } from 'lucide-react';

export const Contact: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6">Contact Us</h1>
        <p className="text-base sm:text-xl text-slate-500 max-w-2xl mx-auto">
          We’d love to hear from you! If you have any questions, feedback, or need support, feel free to contact us.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <a 
          href="mailto:liyaqatk960@gmail.com" 
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-500 mb-6 group-hover:scale-110 transition-transform">
            <Mail className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Email Us</h3>
          <span className="text-primary-500 font-medium group-hover:underline">liyaqatk960@gmail.com</span>
        </a>

        <a 
          href="https://www.lakpdf.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
            <Globe className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Visit Website</h3>
          <span className="text-blue-500 font-medium group-hover:underline">lakpdf.com</span>
        </a>
      </div>

      <div className="bg-slate-50 rounded-3xl p-8 md:p-12">
        <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">You can reach out for:</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: <Wrench className="w-5 h-5" />, text: "Technical support 24*7" },
            { icon: <Lightbulb className="w-5 h-5" />, text: "Feature requests" },
            { icon: <Bug className="w-5 h-5" />, text: "Bug reports" },
            { icon: <MessageSquare className="w-5 h-5" />, text: "General inquiries" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                {item.icon}
              </div>
              <span className="font-medium text-slate-700">{item.text}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-10 text-center">
          <p className="text-slate-500 font-medium">
            Our team will get back to you as soon as possible.
          </p>
        </div>
      </div>
    </div>
  );
};
