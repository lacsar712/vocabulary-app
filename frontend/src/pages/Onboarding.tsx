import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Brain,
    Target,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    SkipForward,
    Sparkles,
    CheckCircle2,
    XCircle,
    Volume2,
    Book,
    PartyPopper,
    Star,
} from 'lucide-react';
import SpotlightOverlay from '../components/SpotlightOverlay';
import { ThemeToggle } from '../components/ThemeToggle';

const TOTAL_STEPS = 5;

const Onboarding: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [demoState, setDemoState] = useState<'idle' | 'learned' | 'skipped'>('idle');
    const [spotlightTarget, setSpotlightTarget] = useState<
        'learnBtn' | 'skipBtn' | 'wordCard' | null
    >(null);
    const [testSkipped, setTestSkipped] = useState(false);

    const learnBtnRef = useRef<HTMLButtonElement>(null);
    const skipBtnRef = useRef<HTMLButtonElement>(null);
    const wordCardRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const { completeOnboarding } = useAuth();

    const handleNext = async () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
            if (currentStep === 3) {
                setSpotlightTarget('wordCard');
                setTimeout(() => setSpotlightTarget('learnBtn'), 1500);
                setTimeout(() => setSpotlightTarget('skipBtn'), 3000);
                setTimeout(() => setSpotlightTarget(null), 4500);
            } else {
                setSpotlightTarget(null);
            }
        } else {
            await completeOnboarding();
            navigate('/');
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            setSpotlightTarget(null);
        }
    };

    const handleSkip = async () => {
        await completeOnboarding();
        navigate('/');
    };

    const handleGoToTest = () => {
        navigate('/test?from=onboarding');
    };

    const handleSkipTest = () => {
        setTestSkipped(true);
    };

    const handleDemoLearn = () => {
        setDemoState('learned');
        setSpotlightTarget(null);
    };

    const handleDemoSkip = () => {
        setDemoState('skipped');
        setSpotlightTarget(null);
    };

    const resetDemo = () => {
        setDemoState('idle');
    };

    const renderProgressDots = () => (
        <div className="flex items-center gap-2">
            {[...Array(TOTAL_STEPS)].map((_, i) => (
                <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                        i + 1 < currentStep
                            ? 'w-8 bg-primary'
                            : i + 1 === currentStep
                            ? 'w-8 bg-gradient-to-r from-primary to-accent'
                            : 'w-4 bg-text-faint'
                    }`}
                />
            ))}
        </div>
    );

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="text-center"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-2xl shadow-primary/40"
                        >
                            <BookOpen size={48} className="text-white" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent"
                        >
                            欢迎来到词汇大师
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-text-secondary text-lg mb-10 max-w-md mx-auto leading-relaxed"
                        >
                            一款智能化的英语词汇学习助手，帮助你科学高效地扩展词汇量
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
                        >
                            {[
                                { icon: Brain, label: '智能推荐', desc: 'i+1算法' },
                                { icon: Target, label: '精准评估', desc: '词汇量测试' },
                                { icon: Sparkles, label: '趣味学习', desc: '多种模式' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + i * 0.1 }}
                                    className="glass-panel p-5 rounded-2xl"
                                >
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <item.icon size={24} className="text-primary" />
                                    </div>
                                    <div className="text-text-primary font-semibold text-sm mb-1">
                                        {item.label}
                                    </div>
                                    <div className="text-text-muted text-xs">{item.desc}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="text-center max-w-lg mx-auto"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40"
                        >
                            <Target size={48} className="text-white" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold mb-6 text-text-primary"
                        >
                            先了解你的起点
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-4 text-left"
                        >
                            <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Star size={20} className="text-primary" />
                                </div>
                                <div>
                                    <div className="text-text-primary font-semibold mb-1">
                                        个性化推荐
                                    </div>
                                    <div className="text-text-muted text-sm leading-relaxed">
                                        基于你的词汇量，系统将使用 i+1 算法推荐最合适你水平的单词
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 size={20} className="text-secondary" />
                                </div>
                                <div>
                                    <div className="text-text-primary font-semibold mb-1">
                                        精准自适应测试
                                    </div>
                                    <div className="text-text-muted text-sm leading-relaxed">
                                        仅需 15 道题，通过自适应算法快速评估你的真实词汇量水平
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel p-5 rounded-2xl flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={20} className="text-accent" />
                                </div>
                                <div>
                                    <div className="text-text-primary font-semibold mb-1">
                                        持续追踪进步
                                    </div>
                                    <div className="text-text-muted text-sm leading-relaxed">
                                        每次重测都会更新你的词汇量数据，直观感受学习带来的成长
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="text-center max-w-md mx-auto"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40"
                        >
                            <Brain size={48} className="text-white" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold mb-4 text-text-primary"
                        >
                            开始词汇量测试
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-text-secondary mb-8 leading-relaxed"
                        >
                            大约需要 2-3 分钟完成测试，帮助我们为你推荐最合适的学习内容
                        </motion.p>

                        {!testSkipped ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="space-y-4"
                            >
                                <button
                                    onClick={handleGoToTest}
                                    className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
                                >
                                    <Target size={22} />
                                    开始词汇量测试
                                </button>
                                <button
                                    onClick={handleSkipTest}
                                    className="w-full btn-secondary py-3 text-text-muted hover:text-text-secondary"
                                >
                                    暂时跳过，稍后再测
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-panel p-6 rounded-2xl"
                            >
                                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-text-faint/20 flex items-center justify-center">
                                    <SkipForward size={24} className="text-text-muted" />
                                </div>
                                <div className="text-text-secondary mb-1">已选择跳过测试</div>
                                <div className="text-text-muted text-sm mb-4">
                                    你可以随时在主页的「快捷操作」中重新测试
                                </div>
                                <button
                                    onClick={handleGoToTest}
                                    className="text-primary hover:text-indigo-400 text-sm font-medium"
                                >
                                    还是去测试一下 →
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="text-center max-w-2xl mx-auto"
                    >
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-bold mb-2 text-text-primary"
                        >
                            试试卡片操作
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-text-secondary text-sm mb-6"
                        >
                            跟着高亮提示，体验一下如何标记已掌握和跳过单词
                        </motion.p>

                        <div ref={wordCardRef} className="relative mb-6">
                            <AnimatePresence mode="wait">
                                {demoState === 'idle' && (
                                    <motion.div
                                        key="idle"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="glass-panel p-8 rounded-3xl relative overflow-hidden text-left"
                                    >
                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/5 text-xs text-text-muted uppercase tracking-wider">
                                            示例单词
                                        </div>

                                        <div className="mb-6">
                                            <div className="flex items-baseline gap-4 mb-2">
                                                <h3 className="text-5xl font-bold text-text-primary tracking-tight">
                                                    serendipity
                                                </h3>
                                                <span className="text-xl text-text-muted italic font-serif">
                                                    n.
                                                </span>
                                            </div>
                                            <div
                                                className="flex items-center gap-2 text-primary cursor-pointer hover:text-indigo-400 transition"
                                                onClick={() => {
                                                    const utter = new SpeechSynthesisUtterance('serendipity');
                                                    window.speechSynthesis.speak(utter);
                                                }}
                                            >
                                                <Volume2 size={20} />
                                                <span className="text-lg font-mono">/ˌserənˈdɪpəti/</span>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <h4 className="text-xs font-bold text-text-faint uppercase tracking-widest mb-2">
                                                    释义
                                                </h4>
                                                <p className="text-2xl text-text-secondary font-light leading-relaxed">
                                                    意外发现美好事物的能力；机缘巧合
                                                </p>
                                            </div>

                                            <div className="bg-card-bg p-5 rounded-xl border border-card-border">
                                                <h4 className="text-xs font-bold text-text-faint uppercase tracking-widest mb-2">
                                                    例句
                                                </h4>
                                                <p className="text-lg text-primary/80 italic font-serif">
                                                    "Finding this café was pure serendipity."
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mt-8">
                                            <button
                                                ref={learnBtnRef}
                                                onClick={handleDemoLearn}
                                                className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-lg"
                                            >
                                                <CheckCircle size={22} />
                                                标为已掌握
                                            </button>
                                            <button
                                                ref={skipBtnRef}
                                                onClick={handleDemoSkip}
                                                className="btn-secondary px-6 flex items-center justify-center"
                                                title="跳过"
                                            >
                                                <Book size={22} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {demoState === 'learned' && (
                                    <motion.div
                                        key="learned"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="glass-panel p-10 rounded-3xl text-center"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', delay: 0.1 }}
                                            className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-500/20 flex items-center justify-center"
                                        >
                                            <CheckCircle2 size={48} className="text-emerald-400" />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold text-emerald-400 mb-2">
                                            太棒了！
                                        </h3>
                                        <p className="text-text-secondary mb-4">
                                            你已掌握 "serendipity"，这个单词会加入你的已学列表
                                        </p>
                                        <button
                                            onClick={resetDemo}
                                            className="btn-secondary px-6 py-2 text-sm"
                                        >
                                            再试一次
                                        </button>
                                    </motion.div>
                                )}

                                {demoState === 'skipped' && (
                                    <motion.div
                                        key="skipped"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="glass-panel p-10 rounded-3xl text-center"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', delay: 0.1 }}
                                            className="w-20 h-20 mx-auto mb-5 rounded-full bg-blue-500/20 flex items-center justify-center"
                                        >
                                            <XCircle size={48} className="text-blue-400" />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold text-blue-400 mb-2">
                                            已跳过
                                        </h3>
                                        <p className="text-text-secondary mb-4">
                                            这个单词会暂时隐藏，稍后会出现其他单词
                                        </p>
                                        <button
                                            onClick={resetDemo}
                                            className="btn-secondary px-6 py-2 text-sm"
                                        >
                                            再试一次
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="glass-panel p-4 rounded-xl max-w-md mx-auto">
                            <div className="flex items-start gap-3 text-left">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary text-sm font-bold">💡</span>
                                </div>
                                <p className="text-text-muted text-sm leading-relaxed">
                                    实际学习中，「标为已掌握」会记录到你的学习进度，「跳过」则暂时跳过该单词，系统会推荐新内容
                                </p>
                            </div>
                        </div>

                        <SpotlightOverlay
                            targetRef={
                                spotlightTarget === 'learnBtn'
                                    ? learnBtnRef
                                    : spotlightTarget === 'skipBtn'
                                    ? skipBtnRef
                                    : spotlightTarget === 'wordCard'
                                    ? wordCardRef
                                    : null
                            }
                            isActive={spotlightTarget !== null}
                            hintText={
                                spotlightTarget === 'learnBtn'
                                    ? '点击「标为已掌握」记录你已经学会这个单词'
                                    : spotlightTarget === 'skipBtn'
                                    ? '点击「跳过」暂时跳过这个单词，稍后再来学习'
                                    : spotlightTarget === 'wordCard'
                                    ? '这是学习卡片，展示单词的详细信息'
                                    : ''
                            }
                            hintPosition={
                                spotlightTarget === 'learnBtn'
                                    ? 'top'
                                    : spotlightTarget === 'skipBtn'
                                    ? 'top'
                                    : 'bottom'
                            }
                        />
                    </motion.div>
                );

            case 5:
                return (
                    <motion.div
                        key="step5"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="text-center max-w-md mx-auto"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-purple-500/40"
                        >
                            <PartyPopper size={56} className="text-white" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400"
                        >
                            引导完成！
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-text-secondary text-lg mb-8 leading-relaxed"
                        >
                            你已了解所有核心功能，准备好开启你的词汇学习之旅了吗？
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="glass-panel p-6 rounded-2xl mb-8 text-left space-y-3"
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-text-secondary text-sm">了解产品价值与核心功能</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-text-secondary text-sm">知晓词汇量测试的作用</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-text-secondary text-sm">体验学习卡片操作流程</span>
                            </div>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            onClick={handleNext}
                            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
                        >
                            开始使用
                            <ArrowRight size={22} />
                        </motion.button>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-page aurora-bg flex flex-col">
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            {currentStep > 1 && (
                <button
                    onClick={handleSkip}
                    className="fixed top-4 left-4 z-50 px-4 py-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface transition text-sm flex items-center gap-1.5"
                >
                    <SkipForward size={16} />
                    跳过引导
                </button>
            )}

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-3xl">
                    <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
                </div>
            </div>

            <div className="border-t border-border-default py-6 px-6">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {renderProgressDots()}
                        <span className="text-text-muted text-sm">
                            {currentStep} / {TOTAL_STEPS}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {currentStep > 1 && (
                            <button
                                onClick={handlePrev}
                                className="btn-secondary px-5 py-2.5 flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                上一步
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="btn-primary px-6 py-2.5 flex items-center gap-2"
                        >
                            {currentStep === TOTAL_STEPS ? '完成' : '下一步'}
                            {currentStep !== TOTAL_STEPS && <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
