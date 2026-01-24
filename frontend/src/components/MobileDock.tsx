
import { MotionValue, motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

interface MobileDockProps {
    items: {
        id: string;
        icon: React.ReactNode;
        label: string;
        onClick: () => void;
        isActive?: boolean;
    }[];
}

export const MobileDock = ({ items }: MobileDockProps) => {
    const mouseX = useMotionValue(Infinity);

    return (
        <motion.div
            className="mobile-dock-container"
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            onTouchMove={(e) => mouseX.set(e.touches[0].clientX)}
            onTouchEnd={() => mouseX.set(Infinity)}
            initial={{ y: 100, x: "-50%" }}
            animate={{ y: 0, x: "-50%" }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            style={{
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                // transform x handled by motion
                width: 'auto',
                maxWidth: '96vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                padding: '16px 24px',
                background: 'rgba(10, 14, 39, 0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: '32px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 9999,
                pointerEvents: 'auto',
            }}
        >
            {items.map((item) => (
                <DockItem key={item.id} mouseX={mouseX} {...item} />
            ))}
        </motion.div>
    );
};

interface DockItemProps {
    mouseX: MotionValue;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    isActive?: boolean;
}

const DockItem = ({ mouseX, icon, label, onClick, isActive }: DockItemProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - (bounds.x + bounds.width / 2);
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    return (
        <button
            className="mobile-dock-item"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
            style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                outline: 'none',
            }}
        >
            <AnimatePresence>
                {(isHovered || isActive) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: -45, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                ref={ref}
                style={{
                    width,
                    height: width,
                    borderRadius: '50%',
                    background: isActive
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.4), rgba(37, 99, 235, 0.2))'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: isActive
                        ? '1px solid rgba(37, 99, 235, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#60a5fa' : 'white',
                    boxShadow: isActive ? '0 0 15px rgba(37, 99, 235, 0.3)' : 'none',
                }}
                whileTap={{ scale: 0.9 }}
            >
                {icon}
            </motion.div>

            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    style={{
                        position: 'absolute',
                        bottom: '-6px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: '#60a5fa',
                    }}
                />
            )}
        </button>
    );
};
