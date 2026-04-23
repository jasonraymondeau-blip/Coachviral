'use client';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
  helper?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helper, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#F1F0FF]">
            {label}
            {props.required && <span className="text-pink-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-xl bg-[#1A1A24] border border-[#2A2A3A] px-4 py-2.5 pr-10 text-sm text-white',
              'outline-none transition-all duration-200 cursor-pointer',
              'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
              error && 'border-red-500/50',
              className
            )}
            {...props}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#1A1A24]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A9D] pointer-events-none" />
        </div>
        {helper && !error && <p className="text-xs text-[#7A7A9D]">{helper}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
