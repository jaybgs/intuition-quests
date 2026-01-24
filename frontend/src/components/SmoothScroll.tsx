import { ReactLenis } from '@studio-freight/react-lenis';

interface SmoothScrollProps {
    children: React.ReactNode;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
    return (
        <ReactLenis
            root
            options={{
                lerp: 0.1,
                duration: 1.2,
                smoothWheel: true,
                wheelMultiplier: 1,
                touchMultiplier: 2,
            }}
        >
            {children}
        </ReactLenis>
    );
}
