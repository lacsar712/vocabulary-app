import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotlightPosition {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface SpotlightOverlayProps {
    targetRef: React.RefObject<HTMLElement | null> | null;
    isActive: boolean;
    hintText?: string;
    hintPosition?: 'top' | 'bottom' | 'left' | 'right';
    padding?: number;
    borderRadius?: number;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
    targetRef,
    isActive,
    hintText,
    hintPosition = 'bottom',
    padding = 8,
    borderRadius = 12,
}) => {
    const [position, setPosition] = useState<SpotlightPosition | null>(null);

    useEffect(() => {
        if (!isActive || !targetRef?.current) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            const el = targetRef?.current as HTMLElement | null;
            if (el) {
                const rect = el.getBoundingClientRect();
                setPosition({
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                });
            }
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isActive, targetRef, padding]);

    const getHintPosition = () => {
        if (!position) return {};
        const centerX = position.left + position.width / 2;
        const centerY = position.top + position.height / 2;

        switch (hintPosition) {
            case 'top':
                return {
                    bottom: window.innerHeight - position.top + 16,
                    left: centerX,
                    transform: 'translateX(-50%)',
                };
            case 'bottom':
                return {
                    top: position.top + position.height + 16,
                    left: centerX,
                    transform: 'translateX(-50%)',
                };
            case 'left':
                return {
                    right: window.innerWidth - position.left + 16,
                    top: centerY,
                    transform: 'translateY(-50%)',
                };
            case 'right':
                return {
                    left: position.left + position.width + 16,
                    top: centerY,
                    transform: 'translateY(-50%)',
                };
        }
    };

    if (!isActive) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] pointer-events-none"
                style={{
                    background: position
                        ? `radial-gradient(circle at ${position.left + position.width / 2}px ${position.top + position.height / 2}px, transparent ${Math.max(position.width, position.height) / 2 + 40}px, rgba(0, 0, 0, 0.75) ${Math.max(position.width, position.height) / 2 + 120}px)`
                        : 'rgba(0, 0, 0, 0.75)',
                }}
            >
                {position && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute border-2 border-primary rounded-xl pointer-events-none"
                        style={{
                            top: position.top,
                            left: position.left,
                            width: position.width,
                            height: position.height,
                            borderRadius: borderRadius,
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0), 0 0 40px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(99, 102, 241, 0.2)',
                        }}
                    />
                )}
                {hintText && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="absolute max-w-xs px-4 py-3 rounded-xl glass-panel pointer-events-none"
                        style={getHintPosition()}
                    >
                        <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-primary text-sm font-bold">!</span>
                            </div>
                            <p className="text-text-secondary text-sm leading-relaxed">{hintText}</p>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default SpotlightOverlay;
