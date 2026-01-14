import React from 'react';

interface ActionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, children, className = "", borderColor = "border-slate-700" }) => {
  return (
    <div className={`bg-slate-800/80 backdrop-blur-md border ${borderColor} rounded-xl p-6 shadow-xl w-full max-w-2xl mx-auto ${className}`}>
      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4 border-b border-slate-700 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
};