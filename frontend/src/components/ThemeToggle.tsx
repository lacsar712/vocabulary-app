import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

interface ThemeToggleProps {
    size?: number;
    className?: string;
    showLabel?: boolean;
}

const iconVariants = {
    initial: { opacity: 0, rotate: -90, scale: 0.5 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
    exit: { opacity: 0, rotate: 90, scale: 0.5 },
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    size = 20,
    className = '',
    showLabel = false,
}) => {
    const { resolvedTheme, toggleTheme, themeLabel } = useTheme();

    const isDark = resolvedTheme === 'dark';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={toggleTheme}
                aria-label={`切换主题（当前：${themeLabel}）`}
                title={`切换主题（当前：${themeLabel}）`}
                className="relative p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition-all duration-300 cursor-pointer overflow-hidden group"
            >
                <div className="relative w-[1em] h-[1em]" style={{ fontSize: `${size}px` }}>
                    <AnimatePresence mode="wait">
                        {isDark ? (
                            <motion.div
                                key="moon"
                                variants={iconVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="absolute inset-0 flex items-center justify-center text-primary"
                            >
                                <Moon size="100%" strokeWidth={2} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                variants={iconVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="absolute inset-0 flex items-center justify-center text-amber-500"
                            >
                                <Sun size="100%" strokeWidth={2} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={false}
                    animate={{
                        boxShadow: isDark
                            ? 'inset 0 0 0 0 rgba(99, 102, 241, 0)'
                            : 'inset 0 0 0 0 rgba(245, 158, 11, 0)',
                    }}
                    whileHover={{
                        boxShadow: isDark
                            ? 'inset 0 0 0 2px rgba(99, 102, 241, 0.3)'
                            : 'inset 0 0 0 2px rgba(245, 158, 11, 0.3)',
                    }}
                    transition={{ duration: 0.2 }}
                />
            </button>

            {showLabel && (
                <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
                    {themeLabel}
                </span>
            )}
        </div>
    );
};

interface ThemeSelectorProps {
    onClose?: () => void;
}

const themeOptions: { key: Theme; label: string; icon: typeof Sun; desc: string }[] = [
    { key: 'light', label: '浅色模式', icon: Sun, desc: '明亮清晰的视觉体验' },
    { key: 'dark', label: '深色模式', icon: Moon, desc: '护眼舒适的夜间模式' },
    { key: 'system', label: '跟随系统', icon: Monitor, desc: '自动匹配系统主题设置' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onClose }) => {
    const { theme, setTheme, themeLabel } = useTheme();

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">当前主题</span>
                    <span className="text-sm font-semibold text-text-primary">{themeLabel}</span>
                </div>

                <div className="grid gap-2">
                    {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = theme === option.key;
                        return (
                            <motion.button
                                key={option.key}
                                onClick={() => {
                                    setTheme(option.key);
                                    onClose?.();
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                                    isSelected
                                        ? 'bg-primary/10 border-primary/40'
                                        : 'bg-surface/50 border-border-default hover:bg-surface-hover hover:border-border-strong'
                                }`}
                            >
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isSelected
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-surface-hover text-text-muted'
                                    }`}
                                >
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className={`font-semibold text-sm ${
                                            isSelected ? 'text-primary' : 'text-text-primary'
                                        }`}
                                    >
                                        {option.label}
                                    </div>
                                    <div className="text-xs text-text-muted">{option.desc}</div>
                                </div>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M2.5 6L5 8.5L9.5 3.5"
                                                stroke="white"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ThemeToggle;
