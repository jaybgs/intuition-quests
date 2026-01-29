
import { MotionValue, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useRef } from "react";

interface DockProps {
    className?: string;
    zoomMultiplier?: number; // Added zoomMultiplier prop
    children: React.ReactNode;
}

interface DockIconProps {
    zoomMultiplier?: number; // Added zoomMultiplier prop
    children: React.ReactNode;
}

export const Dock = ({ className, children, zoomMultiplier = 1.3 }: DockProps) => {
    // Vertical dock uses Y position
    const mouseY = useMotionValue(Infinity);

    return (
        <motion.div
            onMouseMove={(e) => mouseY.set(e.clientY)}
            onMouseLeave={() => mouseY.set(Infinity)}
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%'
            }}
        >
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { mouseY, zoomMultiplier });
                }
                return child;
            })}
        </motion.div>
    );
};

export const DockIcon = ({ mouseY, children, zoomMultiplier = 1.3 }: any) => {
    const ref = useRef<HTMLDivElement>(null);

    // Calculate distance from the center of this item (vertically)
    const distance = useTransform(mouseY, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
        return val - (bounds.y + bounds.height / 2);
    });

    // Base height for the item (approximated from CSS padding + line-height)
    // builder-nav-item has 12px padding top/bottom + 20px icon = ~44px-50px
    const baseHeight = 50;
    const magnifiedHeight = baseHeight * zoomMultiplier;

    // Transform distance to height
    const heightSync = useTransform(distance, [-120, 0, 120], [baseHeight, magnifiedHeight, baseHeight]);
    const height = useSpring(heightSync, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    // Transform distance to scale for the content (text/icon)
    // Scale ranges from 1 to zoomMultiplier
    const scaleSync = useTransform(distance, [-120, 0, 120], [1, zoomMultiplier, 1]);
    const scale = useSpring(scaleSync, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    return (
        <motion.div
            ref={ref}
            style={{
                height,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                position: 'relative', // Ensure scaling doesn't affect layout flow unexpectedly
                transformOrigin: 'center left' // Scale from left to keep aligned
            }}
            className="dock-icon-wrapper"
        >
            <motion.div
                style={{
                    scale,
                    width: '100%',
                    height: '100%',
                    transformOrigin: 'left center', // Grow text towards the right
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
};
