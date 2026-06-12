import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Headphones, Volume2, VolumeX, Check, X, ArrowRight, Home, Trophy, Clock, Target, RefreshCw, Info, Zap, Flame, ChevronRight, Gauge, Book } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionOption {
    option_index: number;
    word_id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
}

interface Question {
    question_index: number;
    target_word_id: number;
    target_word: string;
    target_pronunciation: string;
    target_pos: string;
    target_definition: string;
    correct_option_index: number;
    options: QuestionOption[];
}

interface AnswerResult {
    questionIndex: number;
    targetWordId: number;
    targetWord: string;
    targetPronunciation: string;
    targetPos: string;
    targetDefinition: string;
    selectedOptionIndex: number;
    selectedWord: string;
    correctOptionIndex: number;
    isCorrect: boolean;
    timeSpent: number;
}

type GameMode = 'consolidate' | 'challenge';
type GamePhase = 'select-mode' | 'rules' | 'playing' | 'result';

const TOTAL_QUESTIONS = 5;

const ListeningPractice: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>('select-mode');
    const [mode, setMode] = useState<GameMode>('consolidate');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswerResult[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [totalTime, setTotalTime] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [playedAudio, setPlayedAudio] = useState(false);

    const navigate = useNavigate();

    const fetchQuestions = useCallback(async (selectedMode: GameMode) => {
        try {
            setLoading(true);
            const res = await api.get(`/listening-practice/questions?mode=${selectedMode}&count=${TOTAL_QUESTIONS}`);
            setQuestions(res.data.questions);
            setSessionId(res.data.sessionId);
            setMode(res.data.mode);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const playAudio = useCallback((text: string, slow = false) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = slow ? 0.5 : 0.9;
        utter.pitch = 1;
        window.speechSynthesis.speak(utter);
        setPlayedAudio(true);
    }, []);

    const selectMode = useCallback((selectedMode: GameMode) => {
        setMode(selectedMode);
        setGamePhase('rules');
    }, []);

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowResult(false);
        setCurrentStreak(0);
        setMaxStreak(0);
        setStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setPlayedAudio(false);
        fetchQuestions(mode).then(() => {
        });
    }, [fetchQuestions, mode]);

    const restartWithMode = useCallback((newMode: GameMode) => {
        setMode(newMode);
        setGamePhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setShowResult(false);
        setCurrentStreak(0);
        setMaxStreak(0);
        setStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setPlayedAudio(false);
        fetchQuestions(newMode).then(() => {
        });
    }, [fetchQuestions]);

    const currentQuestion = questions[currentIndex];

    const selectAnswer = useCallback((optionIndex: number) => {
        if (!currentQuestion || showResult) return;

        const isCorrect = optionIndex === currentQuestion.correct_option_index;
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

        const selectedOpt = currentQuestion.options.find(o => o.option_index === optionIndex);

        const result: AnswerResult = {
            questionIndex: currentIndex,
            targetWordId: currentQuestion.target_word_id,
            targetWord: currentQuestion.target_word,
            targetPronunciation: currentQuestion.target_pronunciation,
            targetPos: currentQuestion.target_pos,
            targetDefinition: currentQuestion.target_definition,
            selectedOptionIndex: optionIndex,
            selectedWord: selectedOpt?.word || '',
            correctOptionIndex: currentQuestion.correct_option_index,
            isCorrect,
            timeSpent
        };

        api.post('/listening-practice/answer', {
            sessionId,
            wordId: currentQuestion.target_word_id,
            selectedOptionIndex: optionIndex,
            isCorrect,
            timeSpent
        }).catch(e => console.error(e));

        setAnswers(prev => [...prev, result]);
        setSelectedOption(optionIndex);
        setShowResult(true);

        if (isCorrect) {
            const newStreak = currentStreak + 1;
            setCurrentStreak(newStreak);
            if (newStreak > maxStreak) {
                setMaxStreak(newStreak);
            }
        } else {
            setCurrentStreak(0);
        }
    }, [currentQuestion, currentIndex, questionStartTime, sessionId, showResult, currentStreak, maxStreak]);

    const nextQuestion = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
            setQuestionStartTime(Date.now());
            setPlayedAudio(false);
        } else {
            finishGame();
        }
    }, [currentIndex, questions.length]);

    const finishGame = useCallback(async () => {
        setSubmitting(true);
        const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
        setTotalTime(totalTimeSpent);

        const correctCount = answers.filter(a => a.isCorrect).length;
        const reactionTimes = answers.map(a => a.timeSpent);
        const avgReaction = reactionTimes.length > 0
            ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
            : 0;

        try {
            await api.post('/listening-practice/complete', {
                sessionId,
                mode,
                totalQuestions: answers.length,
                correctCount,
                totalTime: totalTimeSpent,
                avgReactionTime: avgReaction,
                maxStreak: maxStreak,
                answers
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
            setGamePhase('result');
        }
    }, [answers, sessionId, mode, startTime, maxStreak]);

    const playCurrentWord = useCallback((slow = false) => {
        if (currentQuestion) {
            playAudio(currentQuestion.target_word, slow);
        }
    }, [currentQuestion, playAudio]);

    useEffect(() => {
        if (gamePhase === 'playing' && currentQuestion && !playedAudio) {
            const timer = setTimeout(() => {
                playCurrentWord();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, currentQuestion, playedAudio, playCurrentWord]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const correctCount = answers.filter(a => a.isCorrect).length;
    const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    const score = correctCount * 100 + maxStreak * 20;
    const wrongAnswers = answers.filter(a => !a.isCorrect);
    const reactionTimes = answers.map(a => a.timeSpent);
    const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;

    if (loading && gamePhase === 'playing') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">
                    组题中...
                </div>
            </div>
        );
    }

    if (submitting) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">
                    提交成绩中...
                </div>
            </div>
        );
    }

    if (gamePhase === 'select-mode') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-page">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 md:p-10 rounded-3xl max-w-2xl w-full"
                >
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                            <Headphones size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 mb-2">
                            听力辨词训练
                        </h1>
                        <p className="text-text-muted">听音辨词，提升你的听力敏感度</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-10">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectMode('consolidate')}
                            className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 hover:border-amber-500/60 transition text-left group"
                        >
                            <div className="w-12 h-12 mb-4 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Book size={24} className="text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-2">
                                巩固模式
                                <ChevronRight size={18} className="text-text-faint group-hover:text-amber-400 transition" />
                            </h3>
                            <p className="text-sm text-text-muted leading-relaxed">
                                围绕已掌握词汇进行复习，强化听力记忆，巩固你已经学会的单词发音。
                            </p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectMode('challenge')}
                            className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/30 hover:border-violet-500/60 transition text-left group"
                        >
                            <div className="w-12 h-12 mb-4 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                <Zap size={24} className="text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-2">
                                挑战模式
                                <ChevronRight size={18} className="text-text-faint group-hover:text-violet-400 transition" />
                            </h3>
                            <p className="text-sm text-text-muted leading-relaxed">
                                选取接近你词汇量上限的新词，挑战更高难度，扩展听力边界。
                            </p>
                        </motion.button>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Home size={18} /> 返回主页
                    </button>
                </motion.div>
            </div>
        );
    }

    if (gamePhase === 'rules') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-page">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 md:p-10 rounded-3xl max-w-lg w-full"
                >
                    <div className="text-center mb-8">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                            mode === 'consolidate'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                                : 'bg-gradient-to-br from-violet-500 to-purple-500'
                        }`}>
                            <Headphones size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400 mb-2">
                            听力辨词 · {mode === 'consolidate' ? '巩固模式' : '挑战模式'}
                        </h1>
                        <p className="text-text-muted">准备好开始训练了吗？</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 p-4 bg-card-bg rounded-xl">
                            <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-text-primary mb-1">训练规则</h3>
                                <ul className="text-text-secondary text-sm space-y-1">
                                    <li>• 每轮共 {TOTAL_QUESTIONS} 道题，每题听发音辨单词</li>
                                    <li>• 系统朗读一个单词，从四个选项中选正确答案</li>
                                    <li>• 每题支持慢速重播，方便反复辨识</li>
                                    <li>• 连对越多，额外加分越多</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-card-bg rounded-xl">
                            <Target size={20} className="text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-text-primary mb-1">得分规则</h3>
                                <p className="text-text-secondary text-sm">
                                    每题答对 +100 分，连对额外 +20 分/题。
                                    结束后显示正确率、平均反应时间和错题回顾。
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={startGame}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                        >
                            开始训练 <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={() => setGamePhase('select-mode')}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            返回选择模式
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (gamePhase === 'result') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-page py-10">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-8 md:p-10 rounded-3xl max-w-2xl w-full"
                >
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                            <Trophy size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-text-primary mb-2">训练完成！</h1>
                        <p className="text-text-muted">
                            {mode === 'consolidate' ? '巩固模式' : '挑战模式'} · 来看看你的表现吧
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-primary mb-1">{score}</div>
                            <div className="text-xs text-text-muted">总得分</div>
                        </div>
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-emerald-400 mb-1">{accuracy}%</div>
                            <div className="text-xs text-text-muted">正确率</div>
                        </div>
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-accent mb-1">{avgReaction}s</div>
                            <div className="text-xs text-text-muted">平均反应</div>
                        </div>
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-orange-400 mb-1">{maxStreak}</div>
                            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
                                <Flame size={12} /> 最高连对
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-text-primary">答题详情</h3>
                            <span className="text-sm text-text-muted">
                                {correctCount}/{answers.length} 正确
                            </span>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {answers.map((answer, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-4 rounded-xl flex items-center justify-between gap-4 ${
                                        answer.isCorrect
                                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                                            : 'bg-red-500/10 border border-red-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                                            answer.isCorrect
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {answer.isCorrect ? <Check size={16} /> : <X size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-text-primary truncate">
                                                    {answer.targetWord}
                                                </span>
                                                <span className="text-xs text-primary">
                                                    {answer.targetPos}
                                                </span>
                                            </div>
                                            {!answer.isCorrect && (
                                                <div className="text-xs text-red-400 mt-0.5">
                                                    你选了: {answer.selectedWord}
                                                </div>
                                            )}
                                            <div className="text-xs text-text-faint mt-0.5 truncate">
                                                {answer.targetDefinition}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => playAudio(answer.targetWord)}
                                            className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover transition"
                                            title="听发音"
                                        >
                                            <Volume2 size={14} className="text-primary" />
                                        </button>
                                        <div className="text-xs text-text-faint whitespace-nowrap">
                                            <Clock size={12} className="inline mr-1" />
                                            {answer.timeSpent}s
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {wrongAnswers.length > 0 && (
                        <div className="mb-8 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                                <X size={16} className="text-red-400" />
                                错题回顾 ({wrongAnswers.length}题)
                            </h3>
                            <div className="space-y-3">
                                {wrongAnswers.map((wrong, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-surface/50 border border-border-default">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold font-mono text-text-primary">
                                                    {wrong.targetWord}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                    {wrong.targetPos}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => playAudio(wrong.targetWord)}
                                                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition"
                                                title="播放正确发音"
                                            >
                                                <Volume2 size={16} className="text-primary" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-primary mb-1 font-mono">
                                            {wrong.targetPronunciation}
                                        </div>
                                        <div className="text-sm text-text-secondary">
                                            <span className="text-text-faint">释义：</span>
                                            {wrong.targetDefinition}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => restartWithMode('consolidate')}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                            >
                                <Book size={18} /> 巩固再来
                            </button>
                            <button
                                onClick={() => restartWithMode('challenge')}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition bg-violet-500/15 border border-violet-500/40 text-violet-300 hover:bg-violet-500/25"
                            >
                                <Zap size={18} /> 继续挑战
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={startGame}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                            >
                                <RefreshCw size={18} /> 同模式再来
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
                            >
                                <Home size={18} /> 返回主页
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-page">
            <div className="fixed top-0 left-0 w-full h-2 progress-track">
                <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%` }}
                />
            </div>

            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="fixed top-6 left-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur">
                    <Target size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-text-primary">
                        {currentIndex + 1} / {TOTAL_QUESTIONS}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">{correctCount}</span>
                </div>
                {currentStreak > 0 && (
                    <motion.div
                        key={currentStreak}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 backdrop-blur border border-orange-500/40"
                    >
                        <Flame size={16} className="text-orange-400" />
                        <span className="text-sm font-semibold text-orange-400">连对 {currentStreak}</span>
                    </motion.div>
                )}
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur ${
                    mode === 'consolidate'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                }`}>
                    {mode === 'consolidate' ? '巩固模式' : '挑战模式'}
                </div>
            </div>

            <div className="w-full max-w-xl relative mt-16">
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div
                            key={currentIndex + (showResult ? '-result' : '')}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass-panel p-8 md:p-10 rounded-3xl w-full"
                        >
                            {!showResult ? (
                                <div className="space-y-8">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-4 mb-6">
                                            <button
                                                onClick={() => playCurrentWord(false)}
                                                className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-teal-500/30 active:scale-95"
                                                title="正常速度播放"
                                            >
                                                <Volume2 size={36} className="text-white" />
                                            </button>
                                            <button
                                                onClick={() => playCurrentWord(true)}
                                                className="w-14 h-14 rounded-full bg-card-bg border-2 border-teal-500/40 flex items-center justify-center hover:bg-teal-500/10 hover:border-teal-500/60 transition cursor-pointer active:scale-95"
                                                title="慢速重播 (0.5x)"
                                            >
                                                <div className="relative">
                                                    <Gauge size={24} className="text-teal-400" />
                                                    <span className="absolute -bottom-1 -right-2 text-[9px] font-bold text-teal-400 bg-surface px-1 rounded">
                                                        0.5x
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                        <p className="text-text-muted text-sm">
                                            点击按钮播放发音，支持慢速重播
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-text-faint uppercase tracking-widest mb-4 text-center">
                                            请选择你听到的单词
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {currentQuestion.options.map((option) => (
                                                <motion.button
                                                    key={option.option_index}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => selectAnswer(option.option_index)}
                                                    className={`p-4 rounded-xl text-left transition border-2 ${
                                                        selectedOption === option.option_index
                                                            ? 'border-primary bg-primary/10'
                                                            : 'border-border-default bg-card-bg hover:border-teal-500/50 hover:bg-surface'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-lg font-bold font-mono text-text-primary">
                                                            {option.word}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-surface text-text-faint">
                                                            {option.pos}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-primary font-mono">
                                                        {option.pronunciation}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className={`p-6 rounded-xl border ${
                                        answers[answers.length - 1]?.isCorrect
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-red-500/10 border-red-500/30'
                                    }`}>
                                        <div className="flex items-center justify-center gap-3 mb-4">
                                            {answers[answers.length - 1]?.isCorrect ? (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                        <Check size={28} className="text-emerald-400" />
                                                    </div>
                                                    <span className="text-2xl font-bold text-emerald-400">
                                                        回答正确！
                                                        {currentStreak > 1 && (
                                                            <span className="ml-2 text-lg">
                                                                🔥 ×{currentStreak}
                                                            </span>
                                                        )}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                                        <X size={28} className="text-red-400" />
                                                    </div>
                                                    <span className="text-2xl font-bold text-red-400">回答错误</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            <p className="text-text-muted text-sm mb-2">正确答案</p>
                                            <div className="flex items-center justify-center gap-3 mb-2">
                                                <span className="text-3xl font-bold text-text-primary font-mono">
                                                    {currentQuestion.target_word}
                                                </span>
                                                <button
                                                    onClick={() => playAudio(currentQuestion.target_word)}
                                                    className="p-2 rounded-full bg-surface hover:bg-surface-hover transition"
                                                    title="再听一次"
                                                >
                                                    <Volume2 size={20} className="text-primary" />
                                                </button>
                                            </div>
                                            <p className="text-primary font-mono mb-2">
                                                {currentQuestion.target_pronunciation}
                                                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/10">
                                                    {currentQuestion.target_pos}
                                                </span>
                                            </p>
                                            <p className="text-text-secondary">
                                                {currentQuestion.target_definition}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={nextQuestion}
                                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                                    >
                                        {currentIndex < questions.length - 1 ? (
                                            <>下一题 <ArrowRight size={20} /></>
                                        ) : (
                                            <>查看结果 <Trophy size={20} /></>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ListeningPractice;
