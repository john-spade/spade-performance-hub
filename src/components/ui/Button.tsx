import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', ...props }, ref) => {
        const variants = {
            primary: "bg-gold-500 text-dark-900 font-bold hover:bg-gold-400",
            secondary: "bg-dark-700 text-white font-medium hover:bg-dark-600",
            outline: "border border-gold-500 text-gold-500 hover:bg-gold-500/10",
            ghost: "text-gray-400 hover:text-white hover:bg-white/5"
        };

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-lg px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    variants[variant],
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
