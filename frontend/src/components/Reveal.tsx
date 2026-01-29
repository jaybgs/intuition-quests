import React, { ReactNode } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface RevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    threshold?: number;
    threshold?: number;
    width?: 'auto' | '100%' | 'fit-content';
    disabled?: boolean;
}

export function Reveal({ children, className = '', delay = 0, threshold = 0.1, width = '100%', disabled = false }: RevealProps) {
    const ref = useScrollAnimation({ delay, threshold, disabled });

    return (
        <div ref={ref} className={className} style={{ width }}>
            {children}
        </div>
    );
}
