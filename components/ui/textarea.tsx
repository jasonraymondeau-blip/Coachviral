import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[#F1F0FF]">
            {label}
            {props.required && <span className="text-pink-400 ml-1">*</span>}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-[#1A1A24] border border-[#2A2A3A] px-4 py-2.5 text-sm text-white',
            'placeholder:text-[#7A7A9D] outline-none transition-all duration-200 resize-none',
            'focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {helper && !error && <p className="text-xs text-[#7A7A9D]">{helper}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
