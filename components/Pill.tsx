
import React from 'react';

interface PillProps {
  text: string;
}

export const Pill: React.FC<PillProps> = ({ text }) => {
  return (
    <span className="inline-block bg-sky-700 hover:bg-sky-600 transition-colors text-sky-100 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full shadow-md cursor-default">
      {text}
    </span>
  );
};
