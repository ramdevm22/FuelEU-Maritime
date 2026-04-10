import React from 'react';

// ─── Badge ───────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; variant?: 'success' | 'danger' | 'neutral' | 'warning'; }
export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const colors = {
    success: 'bg-teal-400/15 text-teal-300 border-teal-400/30',
    danger:  'bg-red-400/15 text-red-300 border-red-400/30',
    neutral: 'bg-ocean-700/50 text-ocean-200 border-ocean-600/30',
    warning: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
};

// ─── Card ─────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; className?: string; }
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-ocean-900/80 border border-ocean-700/50 rounded-xl backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────
interface KpiCardProps { label: string; value: string | number; unit?: string; sub?: string; accent?: string; }
export const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, sub, accent = 'text-ocean-300' }) => (
  <Card className="p-5">
    <p className="text-xs font-mono text-ocean-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-display font-bold ${accent}`}>
      {value}{unit && <span className="text-sm font-mono text-ocean-400 ml-1">{unit}</span>}
    </p>
    {sub && <p className="text-xs text-ocean-500 mt-1">{sub}</p>}
  </Card>
);

// ─── Button ───────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = 'inline-flex items-center gap-2 rounded-lg font-body font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-ocean-500 hover:bg-ocean-400 text-white shadow-lg shadow-ocean-900/50',
    ghost:   'border border-ocean-700 hover:border-ocean-500 text-ocean-200 hover:text-white hover:bg-ocean-800/50',
    danger:  'bg-red-700/30 hover:bg-red-600/40 text-red-300 border border-red-700/40',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ─── Input ────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-mono text-ocean-400 uppercase tracking-wider">{label}</label>}
    <input
      className={`bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-ocean-100
        placeholder:text-ocean-600 focus:outline-none focus:border-ocean-400 transition-colors ${className}`}
      {...props}
    />
  </div>
);

// ─── Select ───────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; options: { value: string; label: string }[]; }
export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-mono text-ocean-400 uppercase tracking-wider">{label}</label>}
    <select
      className={`bg-ocean-900 border border-ocean-700 rounded-lg px-3 py-2 text-sm text-ocean-100
        focus:outline-none focus:border-ocean-400 transition-colors ${className}`}
      {...props}
    >
      <option value="">All</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Spinner ──────────────────────────────────────────────
export const Spinner: React.FC = () => (
  <div className="flex items-center justify-center p-12">
    <div className="w-8 h-8 border-2 border-ocean-700 border-t-ocean-400 rounded-full animate-spin" />
  </div>
);

// ─── Error Message ────────────────────────────────────────
export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 text-sm font-mono">
    ⚠ {message}
  </div>
);

// ─── Section Header ───────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-display font-bold text-ocean-100">{title}</h2>
    {subtitle && <p className="text-sm text-ocean-400 mt-1">{subtitle}</p>}
  </div>
);
