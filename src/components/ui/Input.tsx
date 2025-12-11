import React from 'react';
import { cn } from './Card';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        {label}
                    </label>
                )}
                <input
                    className={cn(
                        "w-full bg-dark-900 border border-dark-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-600",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    }
);
