
import React from 'react';
import { CopyButton } from './CopyButton';

interface GeneratedSectionProps {
  title: string;
  content: string; // Original content for copying
  customRender?: (contentForRender: string) => React.ReactNode; // Optional custom rendering logic, content prop is still for copy
  isPreformatted?: boolean; // If true, applies whitespace: pre-wrap
}

export const GeneratedSection: React.FC<GeneratedSectionProps> = ({ title, content, customRender, isPreformatted = false }) => {
  return (
    <section className="bg-slate-700/70 p-4 sm:p-6 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-emerald-400">{title}</h3>
        <CopyButton textToCopy={content} />
      </div>
      {customRender ? (
        customRender(content) 
      ) : (
        <div 
          className={`text-slate-300 leading-relaxed text-sm sm:text-base ${isPreformatted ? 'whitespace-pre-wrap font-roboto-mono' : 'font-inter'}`}
        >
          {content.split('\n\n').map((paragraph, index) => ( // Basic paragraph handling for non-preformatted text
            <p key={index} className={index > 0 ? 'mt-2' : ''}>{paragraph}</p>
          ))}
        </div>
      )}
    </section>
  );
};
