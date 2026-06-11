import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Volume2, Star, ArrowLeft, Plus, Check, Bookmark, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Theme {
    id: number;
    key: string;
    name: string;
    icon: string;
    color: string;
    word_count: number;
    mastered_count: number;
}

interface ThemeWord {
    id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    rank: number;
    frequency: number;
    difficulty_level: number;
    in_study_plan?: boolean;
    theme_names: string[];
    theme_keys: string[];
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

const themeColorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    business: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    travel: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    academic: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    tech: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    daily: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    medical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    law: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    sports: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

const ThemeLearning: React.FC = () => {
    const navigate = useNavigate();
    const [themes, setThemes] = useState<Theme[]>([]);
    const [selectedThemes, setSelectedThemes] = useState<number[]>([]);
    const [preferences, setPreferences] = useState<number[]>([]);
    const [words, setWords] = useState<ThemeWord[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
    const [showPrefModal, setShowPrefModal] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    const fetchThemes = useCallback(async () => {
        try {
            const res = await api.get('/themes');
            setThemes(res.data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchPreferences = useCallback(async () => {
        try {
            const res = await api.get('/themes/preferences');
            setPreferences(res.data.map((t: Theme) => t.id));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchWords = useCallback(async (page = 1, append = false) => {
        if (selectedThemes.length === 0) {
            setWords([]);
            setPagination(null);
            return;
        }

        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const params = new URLSearchParams();
            params.append('themes', selectedThemes.join(','));
            params.append('page', page.toString());
            params.append('pageSize', '12');

            const res = await api.get(`/themes/words?${params.toString()}`);

            if (append) {
                setWords(prev => [...prev, ...res.data.words]);
            } else {
                setWords(res.data.words);
            }
            setPagination(res.data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedThemes]);

    useEffect(() => {
        fetchThemes();
        fetchPreferences();
    }, [fetchThemes, fetchPreferences]);

    useEffect(() => {
        fetchWords(1, false);
    }, [selectedThemes, fetchWords]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination && pagination.page < pagination.totalPages && !loadingMore) {
                    fetchWords(pagination.page + 1, true);
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [pagination, loadingMore, fetchWords]);

    const toggleTheme = (themeId: number) => {
        setSelectedThemes(prev => {
            if (prev.includes(themeId)) {
                return prev.filter(id => id !== themeId);
            }
            if (prev.length >= 2) {
                return [prev[1], themeId];
            }
            return [...prev, themeId];
        });
    };

    const playAudio = (word: string) => {
        const utter = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(utter);
    };

    const toggleStudyPlan = async (word: ThemeWord) => {
        try {
            if (word.in_study_plan) {
                await api.delete(`/study-plan/${word.id}`);
            } else {
                await api.post('/study-plan', { word_id: word.id });
            }
            setWords(prev =>
                prev.map(w =>
                    w.id === word.id
                        ? { ...w, in_study_plan: !w.in_study_plan }
                        : w
                )
            );
        } catch (e) {
            console.error(e);
        }
    };

    const savePreferences = async () => {
        try {
            await api.post('/themes/preferences', { themeIds: preferences });
            setShowPrefModal(false);
            fetchThemes();
        } catch (e) {
            console.error(e);
        }
    };

    const togglePreference = (themeId: number) => {
        setPreferences(prev => {
            if (prev.includes(themeId)) {
                return prev.filter(id => id !== themeId);
            }
            if (prev.length >= 2) {
                return [prev[1], themeId];
            }
            return [...prev, themeId];
        });
    };

    const getThemeStyle = (key: string) => themeColorMap[key] || themeColorMap.daily;

    const renderFrequencyDots = (frequency: number) => {
        const filledDots = Math.ceil(frequency / 2);
        return (
            <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${i < filledDots ? 'bg-emerald-400' : 'bg-slate-600'}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                        >
                            <ArrowLeft size={20} className="text-slate-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                主题学习
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">
                                按主题方向浏览单词，选择最多2个主题进行交叉学习
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPrefModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-slate-200 hover:from-primary/30 hover:to-secondary/30 transition cursor-pointer"
                    >
                        <Bookmark size={16} />
                        <span className="text-sm font-semibold">设定学习方向</span>
                    </button>
                </header>

                <div className="mb-6">
                    <div className="flex flex-wrap gap-3">
                        {themes.map(theme => {
                            const isSelected = selectedThemes.includes(theme.id);
                            const isPreferred = preferences.includes(theme.id);
                            const style = getThemeStyle(theme.key);
                            return (
                                <button
                                    key={theme.id}
                                    onClick={() => toggleTheme(theme.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all cursor-pointer relative ${
                                        isSelected
                                            ? `${style.bg} ${style.border} ${style.text} shadow-lg`
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                                    }`}
                                >
                                    <span>{theme.icon}</span>
                                    <span>{theme.name}</span>
                                    {isSelected && (
                                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                    )}
                                    {isPreferred && !isSelected && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full text-[8px] flex items-center justify-center text-white font-bold">★</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {selectedThemes.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500">已选主题：</span>
                            {selectedThemes.map(id => {
                                const t = themes.find(th => th.id === id);
                                if (!t) return null;
                                return (
                                    <span
                                        key={id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getThemeStyle(t.key).badge} border`}
                                    >
                                        {t.icon} {t.name}
                                    </span>
                                );
                            })}
                            {selectedThemes.length === 2 && (
                                <span className="text-xs text-accent ml-2">✨ 交叉学习模式</span>
                            )}
                            <button
                                onClick={() => setSelectedThemes([])}
                                className="text-xs text-slate-500 hover:text-slate-300 ml-2 underline"
                            >
                                清除筛选
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-64 flex-shrink-0 order-2 lg:order-1">
                        <div className="glass-panel p-6 rounded-2xl sticky top-8">
                            <h2 className="text-lg font-bold text-white mb-4">主题词库统计</h2>
                            <div className="space-y-3">
                                {themes.map(theme => {
                                    const style = getThemeStyle(theme.key);
                                    const progress = theme.word_count > 0
                                        ? Math.round((theme.mastered_count / theme.word_count) * 100)
                                        : 0;
                                    const isPreferred = preferences.includes(theme.id);
                                    return (
                                        <div
                                            key={theme.id}
                                            className={`p-3 rounded-xl border transition-all ${
                                                selectedThemes.includes(theme.id)
                                                    ? `${style.bg} ${style.border}`
                                                    : 'bg-slate-800/30 border-slate-700/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                                                    <span>{theme.icon}</span>
                                                    {theme.name}
                                                    {isPreferred && (
                                                        <span className="text-[10px] text-accent">★</span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-400">{progress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${progress}%`,
                                                        backgroundColor: theme.color
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>已掌握 {theme.mastered_count}</span>
                                                <span>共 {theme.word_count} 词</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {preferences.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-400 mb-2">当前学习方向</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {preferences.map(id => {
                                            const t = themes.find(th => th.id === id);
                                            if (!t) return null;
                                            return (
                                                <span
                                                    key={id}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getThemeStyle(t.key).badge} border`}
                                                >
                                                    {t.icon} {t.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 order-1 lg:order-2">
                        {selectedThemes.length === 0 ? (
                            <div className="glass-panel rounded-2xl p-16 text-center">
                                <div className="text-6xl mb-4">🏷️</div>
                                <h2 className="text-2xl font-bold text-white mb-3">选择主题开始学习</h2>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    点击上方的主题胶囊标签，浏览该主题下的单词。你可以同时选择最多2个主题进行交叉学习。
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="text-center py-12 text-slate-400">加载中...</div>
                        ) : words.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 glass-panel rounded-2xl">
                                <Star size={48} className="mx-auto mb-4 opacity-30" />
                                <p>没有找到匹配的单词</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm text-slate-400 mb-4">
                                    共 {pagination?.total || 0} 个单词 · 下滑加载更多
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <AnimatePresence>
                                        {words.map((word, index) => (
                                            <motion.div
                                                key={word.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ delay: index * 0.03 }}
                                                className={`glass-panel rounded-2xl overflow-hidden cursor-pointer transition-all relative ${
                                                    expandedCardId === word.id
                                                        ? 'ring-2 ring-primary/50 md:col-span-2'
                                                        : 'hover:bg-slate-800/80'
                                                }`}
                                                onClick={() => setExpandedCardId(prev => prev === word.id ? null : word.id)}
                                            >
                                                <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[60%] z-10">
                                                    {word.theme_keys.map((key, idx) => {
                                                        const s = getThemeStyle(key);
                                                        return (
                                                            <span
                                                                key={key}
                                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${s.badge}`}
                                                            >
                                                                {word.theme_names[idx]}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                <div className="p-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 pr-16">
                                                            <div className="flex items-baseline gap-3 mb-1">
                                                                <h3 className="text-xl font-bold text-white">
                                                                    {word.word}
                                                                </h3>
                                                                <span className="text-slate-400 italic font-serif text-sm">
                                                                    {word.pos}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="flex items-center gap-2 text-primary cursor-pointer hover:text-indigo-400 transition"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    playAudio(word.word);
                                                                }}
                                                            >
                                                                <Volume2 size={16} />
                                                                <span className="font-mono text-xs">
                                                                    {word.pronunciation}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleStudyPlan(word);
                                                                }}
                                                                className={`p-1.5 rounded-full transition-all ${
                                                                    word.in_study_plan
                                                                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                                                                }`}
                                                                title={word.in_study_plan ? '从学习计划移除' : '加入学习计划'}
                                                            >
                                                                {word.in_study_plan ? <Star size={14} fill="currentColor" /> : <Plus size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-200 text-sm mt-3 line-clamp-2">{word.definition}</p>

                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500">常用度</span>
                                                            {renderFrequencyDots(word.frequency)}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500">点击查看例句</span>
                                                    </div>

                                                    <AnimatePresence>
                                                        {expandedCardId === word.id && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-4 pt-4 border-t border-slate-700">
                                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                                        例句
                                                                    </h4>
                                                                    <p className="text-indigo-200 italic font-serif text-base">
                                                                        "{word.example}"
                                                                    </p>
                                                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                                                        <span>难度等级: {word.difficulty_level}</span>
                                                                        <span>词频排名: #{word.rank}</span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div ref={observerRef} className="h-20 flex items-center justify-center mt-8">
                                    {loadingMore && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>加载更多...</span>
                                        </div>
                                    )}
                                    {pagination && pagination.page >= pagination.totalPages && !loadingMore && words.length > 0 && (
                                        <p className="text-slate-500 text-sm">— 已加载全部 —</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showPrefModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrefModal(false)}>
                    <div className="glass-panel bg-slate-900 p-6 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">设定学习方向</h2>
                            <button onClick={() => setShowPrefModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            选择你当前重点学习的主题方向（最多2个），主页推荐将优先推送该主题范围内的单词。
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {themes.map(theme => {
                                const isSelected = preferences.includes(theme.id);
                                const style = getThemeStyle(theme.key);
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => togglePreference(theme.id)}
                                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                                            isSelected
                                                ? `${style.bg} ${style.border} ${style.text}`
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                            isSelected ? 'bg-white/20' : 'bg-slate-700'
                                        }`}>
                                            {isSelected && <Check size={14} />}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm flex items-center gap-1.5">
                                                <span>{theme.icon}</span> {theme.name}
                                            </div>
                                            <div className="text-xs opacity-70">{theme.word_count} 词</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {preferences.length === 2 && (
                            <p className="text-accent text-xs mb-4">
                                ✨ 已选择2个主题，将形成交叉学习方向
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPreferences([]);
                                }}
                                className="btn-secondary flex-1 py-3"
                            >
                                清除方向
                            </button>
                            <button
                                onClick={savePreferences}
                                className="btn-primary flex-1 py-3"
                            >
                                保存方向
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeLearning;
