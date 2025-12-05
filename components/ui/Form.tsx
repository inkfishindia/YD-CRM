import React, { forwardRef } from 'react';

const baseStyles = "w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors disabled:bg-gray-100 disabled:text-gray-500";
const labelStyles = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, children, className = '' }) => (
  <div className={className}>
    {label && <label className={labelStyles}>{label}</label>}
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, icon, className = '', ...props }, ref) => (
  <FormField label={label} className={className}>
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
      )}
      <input ref={ref} className={`${baseStyles} h-10 ${icon ? 'pl-10 px-3' : 'px-3'} border`} {...props} />
    </div>
  </FormField>
));
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: readonly string[] | string[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, placeholder, className = '', children, ...props }, ref) => (
  <FormField label={label} className={className}>
    <select ref={ref} className={`${baseStyles} h-10 px-3 border`} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {children}
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </FormField>
));
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string; // Correcting prop definition which was implicit before
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, className = '', ...props }, ref) => (
  <FormField label={label} className={className}>
    <textarea ref={ref} className={`${baseStyles} p-3 border min-h-[80px]`} {...props} />
  </FormField>
));
Textarea.displayName = 'Textarea';