import React from 'react';
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "bg-dark-800 border border-dark-700 rounded-xl shadow-lg overflow-hidden",
                className
            )}
            {...props}
        />
    );
}
