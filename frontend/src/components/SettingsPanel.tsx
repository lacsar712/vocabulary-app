import React, { useState } from 'react';
import { X, Settings, Palette, User, Shield, Bell, ChevronRight, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeSelector } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingSection {
    id: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    description: string;
}

const sections: SettingSection[] = [
    { id: 'appearance', icon: Palette, label: '外观设置', description: '主题、颜色与视觉风格' },
    { id: 'notifications', icon: Bell, label: '通知设置', description: '消息推送与提醒方式' },
    { id: 'account', icon: User, label: '账户信息', description: '个人资料与安全' },
    { id: 'privacy', icon: Shield, label: '隐私设置', description: '数据与隐私保护' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
    const [activeSection, setActiveSection] = useState<string>('appearance');
    const { user, resetOnboarding } = useAuth();
    const { themeLabel, resetToSystem } = useTheme();
    const navigate = useNavigate();

    const handleReplayOnboarding = async () => {
        await resetOnboarding();
        onClose();
        navigate('/onboarding');
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'appearance':
                return (
                    <motion.div
                        key="appearance"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-1">外观设置</h3>
                            <p className="text-sm text-text-muted">
                                自定义你的视觉体验，选择喜欢的主题风格
                            </p>
                        </div>

                        <div className="glass-panel rounded-2xl p-5">
                            <ThemeSelector onClose={onClose} />
                        </div>

                        <div className="glass-panel rounded-2xl p-5">
                            <h4 className="text-sm font-semibold text-text-primary mb-4">快速操作</h4>
                            <div className="space-y-2">
                                <button
                                    onClick={resetToSystem}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border-default hover:bg-surface-hover hover:border-border-strong transition-all cursor-pointer"
                                >
                                    <span className="text-sm text-text-secondary">恢复跟随系统</span>
                                    <ChevronRight size={16} className="text-text-muted" />
                                </button>
                            </div>
                        </div>

                        <div className="glass-panel rounded-2xl p-5">
                            <h4 className="text-sm font-semibold text-text-primary mb-3">设计说明</h4>
                            <ul className="space-y-2 text-sm text-text-muted">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                    <span>采用极光玻璃拟态设计语言，兼顾透明质感与层次深度</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                                    <span>主题切换时所有元素带有平滑过渡动画，视觉更自然</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                                    <span>浅色模式自动调整对比度，保证良好可读性</span>
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                );

            case 'notifications':
                return (
                    <motion.div
                        key="notifications"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-1">通知设置</h3>
                            <p className="text-sm text-text-muted">管理消息推送和学习提醒</p>
                        </div>
                        <div className="glass-panel rounded-2xl p-12 text-center">
                            <Bell size={48} className="mx-auto mb-4 text-text-faint" />
                            <p className="text-text-muted">通知设置功能开发中...</p>
                        </div>
                    </motion.div>
                );

            case 'account':
                return (
                    <motion.div
                        key="account"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-1">账户信息</h3>
                            <p className="text-sm text-text-muted">查看和管理你的账户信息</p>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white">
                                    {user?.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-text-primary">{user?.username}</div>
                                    <div className="text-sm text-text-muted">
                                        当前词汇量: <span className="font-semibold text-primary">{user?.vocab_size || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-border-default" />
                            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                                <div>
                                    <div className="text-text-muted mb-1">用户ID</div>
                                    <div className="text-text-primary font-mono">#{user?.id}</div>
                                </div>
                                <div>
                                    <div className="text-text-muted mb-1">当前主题</div>
                                    <div className="text-text-primary">{themeLabel}</div>
                                </div>
                            </div>
                            <div className="h-px bg-border-default" />
                            <div className="pt-5">
                                <h4 className="text-sm font-semibold text-text-primary mb-3">更多操作</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={handleReplayOnboarding}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border-default hover:bg-surface-hover hover:border-border-strong transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                                                <BookOpen size={18} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-text-primary">重新观看新手引导</div>
                                                <div className="text-xs text-text-muted">回顾产品功能与操作指引</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-text-muted" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 'privacy':
                return (
                    <motion.div
                        key="privacy"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-1">隐私设置</h3>
                            <p className="text-sm text-text-muted">你的数据隐私保护</p>
                        </div>
                        <div className="glass-panel rounded-2xl p-12 text-center">
                            <Shield size={48} className="mx-auto mb-4 text-text-faint" />
                            <p className="text-text-muted">隐私设置功能开发中...</p>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 theme-backdrop"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col bg-page border-l border-border-default shadow-2xl"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-border-default">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                    <Settings size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary">设置</h2>
                                    <p className="text-xs text-text-muted">个性化你的使用体验</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex">
                            <div className="w-48 border-r border-border-default p-3 space-y-1 overflow-y-auto flex-shrink-0">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    const isActive = activeSection === section.id;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full flex items-start gap-2 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                                                isActive
                                                    ? 'bg-primary/10 border border-primary/30'
                                                    : 'hover:bg-surface-hover border border-transparent'
                                            }`}
                                        >
                                            <Icon
                                                size={18}
                                                className={isActive ? 'text-primary flex-shrink-0 mt-0.5' : 'text-text-muted flex-shrink-0 mt-0.5'}
                                            />
                                            <div className="min-w-0">
                                                <div
                                                    className={`text-sm font-semibold ${
                                                        isActive ? 'text-primary' : 'text-text-primary'
                                                    }`}
                                                >
                                                    {section.label}
                                                </div>
                                                <div className="text-[11px] text-text-muted leading-tight mt-0.5">
                                                    {section.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex-1 p-5 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    {renderSectionContent()}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsPanel;
