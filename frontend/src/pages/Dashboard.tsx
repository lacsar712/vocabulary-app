import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../api';
import { CheckCircle, BarChart2, Book, Volume2, LogOut, RefreshCw, Gamepad2, Trophy, Bookmark, Bell, Settings, NotebookPen, Plus, Check } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import SettingsPanel from '../components/SettingsPanel';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RecommendedWord {
    id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    rank?: number;
    frequency?: number;
    difficulty_level?: number;
    theme_names?: string[];
    theme_keys?: string[];
    in_study_plan?: boolean;
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

const getThemeStyle = (key: string) => themeColorMap[key] || themeColorMap.daily;

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [word, setWord] = useState<RecommendedWord | null>(null);
    const [stats, setStats] = useState<any>([]);
    const [loading, setLoading] = useState(true);
    const [showReview, setShowReview] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [themePrefs, setThemePrefs] = useState<{id: number; key: string; name: string; icon: string; color: string}[]>([]);
    const [notebookCount, setNotebookCount] = useState(0);
    const [wordInNotebook, setWordInNotebook] = useState(false);
    const navigate = useNavigate();

    const fetchRecommendation = async () => {
        try {
            const res = await api.get('/recommend');
            setWord(res.data);
            if (res.data && res.data.id) {
                await checkWordInNotebook(res.data.id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchNotebookCount = async () => {
        try {
            const res = await api.get('/vocabulary-notebook/count');
            setNotebookCount(res.data.count);
        } catch (e) { console.error(e); }
    };

    const checkWordInNotebook = async (wordId: number) => {
        try {
            const res = await api.get(`/vocabulary-notebook/check/${wordId}`);
            setWordInNotebook(res.data.in_notebook);
        } catch (e) { console.error(e); }
    };

    const handleAddToNotebook = async () => {
        if (!word) return;
        try {
            const res = await api.post('/vocabulary-notebook', { word_id: word.id });
            if (res.data.added) {
                setWordInNotebook(true);
                setNotebookCount(prev => prev + 1);
            }
        } catch (e) { console.error(e); }
    };

    const handleRemoveFromNotebook = async () => {
        if (!word) return;
        try {
            const res = await api.delete(`/vocabulary-notebook/${word.id}`);
            if (res.data.removed) {
                setWordInNotebook(false);
                setNotebookCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/stats');
            const history = res.data.history;
            setStats({
                chartData: history.map((_: any, i: number) => ({ name: `Day ${i + 1}`, words: i + 1 })),
                history: history
            });
        } catch (e) { console.error(e); }
    };

    const fetchThemePrefs = async () => {
        try {
            const res = await api.get('/themes/preferences');
            setThemePrefs(res.data);
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const refreshData = () => {
        setLoading(true);
        Promise.all([fetchRecommendation(), fetchStats(), fetchThemePrefs(), fetchNotebookCount()]).then(() => setLoading(false));
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleLearn = async () => {
        if (!word) return;
        try {
            await api.post('/learn/record', { word_id: word.id, status: 'learned' });
            await fetchRecommendation();
            await fetchStats();
        } catch (e) { console.error(e); }
    };

    const handleSkip = async () => {
        if (!word) return;
        try {
            // Mark as skipped so it doesn't appear again immediately
            await api.post('/learn/record', { word_id: word.id, status: 'skipped' });
            await fetchRecommendation();
        } catch (e) { console.error(e); }
    };

    const playAudio = (text?: string) => { // Modified playAudio to accept optional text
        const utter = new SpeechSynthesisUtterance(text || word?.word || '');
        window.speechSynthesis.speak(utter);
    };

    if (loading) return <div className="p-8 text-center text-text-primary">加载主页中...</div>;

    return (
        <div className="min-h-screen bg-page p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        你好, {user?.username}
                    </h1>
                    <p className="text-text-muted">当前词汇量: <span className="text-text-primary font-bold">{user?.vocab_size}</span> 词</p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <button onClick={() => setShowSettings(true)} title="设置" className="p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer">
                        <Settings size={20} className="text-primary" />
                    </button>
                    <button onClick={() => navigate('/notifications')} title="消息中心" className="relative p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer">
                        <Bell size={20} className="text-primary" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-text-primary text-xs font-bold leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button onClick={refreshData} title="刷新数据" className="p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer">
                        <RefreshCw size={20} className="text-primary" />
                    </button>
                    <button onClick={handleLogout} title="退出登录" className="p-2 rounded-full bg-surface border border-border-default hover:bg-red-500/20 hover:text-red-400 hover:border-red-500 transition cursor-pointer">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {word && !('message' in word) ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 bg-white/5 rounded-bl-2xl backdrop-blur-md">
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">每日推荐</span>
                                {word.frequency && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-text-muted">常用度:</span>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        i < Math.ceil((word.frequency || 0) / 2)
                                                            ? 'bg-emerald-400'
                                                            : 'bg-slate-600'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {word.theme_keys && word.theme_keys.length > 0 && (
                                <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[60%]">
                                    {word.theme_keys.map((key, idx) => {
                                        const s = getThemeStyle(key);
                                        return (
                                            <span
                                                key={key}
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${s.badge}`}
                                            >
                                                {word.theme_names?.[idx]}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="mb-8">
                                <div className="flex items-baseline gap-4 mb-2">
                                    <h2 className="text-6xl font-bold text-text-primary tracking-tight">{word.word}</h2>
                                    <span className="text-2xl text-text-muted italic font-serif">{word.pos}</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary cursor-pointer hover:text-indigo-400 transition" onClick={() => playAudio()}> {/* Updated playAudio call */}
                                    <Volume2 size={24} />
                                    <span className="text-lg font-mono">{word.pronunciation}</span>
                                </div>
                            </div>

                            <div className="space-y-8 mb-12">
                                <div>
                                    <h3 className="text-sm font-bold text-text-faint uppercase tracking-widest mb-2">释义</h3>
                                    <p className="text-2xl text-text-secondary font-light leading-relaxed">{word.definition}</p>
                                </div>

                                <div className="bg-card-bg p-6 rounded-xl border border-card-border">
                                    <h3 className="text-sm font-bold text-text-faint uppercase tracking-widest mb-2">例句</h3>
                                    <p className="text-xl text-primary/80 italic font-serif">"{word.example}"</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={handleLearn} className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-lg">
                                    <CheckCircle size={24} />
                                    标为已掌握
                                </button>
                                <button
                                    onClick={wordInNotebook ? handleRemoveFromNotebook : handleAddToNotebook}
                                    className={`px-6 flex items-center gap-2 rounded-xl font-semibold transition border cursor-pointer ${
                                        wordInNotebook
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                                            : 'bg-surface border-border-default text-text-secondary hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-amber-300'
                                    }`}
                                    title={wordInNotebook ? '已在生词本中，点击移除' : '加入生词本'}
                                >
                                    {wordInNotebook ? <Check size={24} /> : <Plus size={24} />}
                                    <NotebookPen size={24} />
                                </button>
                                <button onClick={handleSkip} className="btn-secondary px-6" title="跳过">
                                    <Book size={24} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-panel p-12 rounded-3xl text-center">
                            <h2 className="text-3xl font-bold text-text-primary mb-4">全部完成！</h2>
                            <p className="text-text-muted">太棒了！您已经掌握了当前难度的所有单词。</p>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                            <BarChart2 size={20} className="text-secondary" />
                            学习进度
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.chartData ? stats.chartData : [{ name: 'Start', words: 0 }]}> {/* Updated data prop */}
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: 'none', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                                    />
                                    <Line type="monotone" dataKey="words" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between mt-4 text-sm text-text-muted">
                            <span>今日已学</span>
                            <span className="text-text-primary font-bold">{stats.history ? stats.history.length : 0} 词</span> {/* Updated count */}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                        <h3 className="text-lg font-bold text-text-primary mb-4">快捷操作</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/vocabulary-notebook')}
                                className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 transition text-text-secondary hover:text-text-primary flex items-center gap-3 border border-amber-500/30 relative"
                            >
                                <NotebookPen size={16} className="text-amber-400" />
                                <span className="flex-1">生词本</span>
                                {notebookCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold leading-none shadow-lg">
                                        {notebookCount > 99 ? '99+' : notebookCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/themes')}
                                className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 transition text-text-secondary hover:text-text-primary flex items-center gap-3 border border-cyan-500/30"
                            >
                                <Bookmark size={16} className="text-cyan-400" />
                                <span className="flex-1">主题学习</span>
                                {themePrefs.length > 0 && (
                                    <span className="flex items-center gap-1 text-xs">
                                        {themePrefs.map(t => (
                                            <span key={t.id}>{t.icon}</span>
                                        ))}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/browse')}
                                className="w-full text-left p-3 rounded-lg bg-card-bg hover:bg-surface transition text-text-secondary hover:text-text-primary flex items-center gap-3"
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                浏览词库
                            </button>
                            <button
                                onClick={() => setShowReview(true)}
                                className="w-full text-left p-3 rounded-lg bg-card-bg hover:bg-surface transition text-text-secondary hover:text-text-primary flex items-center gap-3"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                复习已掌握单词
                            </button>
                            <button
                                onClick={() => navigate('/test')}
                                className="w-full text-left p-3 rounded-lg bg-card-bg hover:bg-surface transition text-text-secondary hover:text-text-primary flex items-center gap-3"
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                重测词汇量
                            </button>
                            <button
                                onClick={() => navigate('/spelling-challenge')}
                                className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 transition text-text-secondary hover:text-text-primary flex items-center gap-3 border border-primary/30"
                            >
                                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                                <Gamepad2 size={16} className="text-accent" />
                                听音拼写挑战
                            </button>
                            <button
                                onClick={() => navigate('/leaderboard')}
                                className="w-full text-left p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 hover:from-yellow-500/20 hover:to-amber-500/20 transition text-text-secondary hover:text-text-primary flex items-center gap-3 border border-yellow-500/30"
                            >
                                <Trophy size={16} className="text-yellow-400" />
                                学习排行榜
                            </button>
                        </div>
                    </div>
                </div>

                {/* Review Modal */}
                {showReview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReview(false)}>
                        <div className="glass-panel bg-surface p-6 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-text-primary">已掌握单词</h2>
                                <button onClick={() => setShowReview(false)} className="text-text-muted hover:text-text-primary">✕</button>
                            </div>
                            <div className="space-y-4">
                                {stats.history && stats.history.length > 0 ? (
                                    stats.history.map((h: any, i: number) => (
                                        <div key={i} className="p-4 bg-surface rounded-lg border border-border-default">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-text-primary">{h.word}</h3>
                                                    <p className="text-primary text-sm">{h.pronunciation}</p>
                                                </div>
                                                <button onClick={() => playAudio(h.word)} className="text-text-muted hover:text-primary"><Volume2 size={18} /></button>
                                            </div>
                                            <p className="text-text-secondary mt-2 text-sm">{h.definition}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-text-faint py-8">暂无已学单词，快去学习吧！</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
};

export default Dashboard;
