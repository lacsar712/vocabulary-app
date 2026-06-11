import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Volume2, Star, ChevronDown, ChevronUp, ArrowLeft, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Word {
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
}

interface DifficultyLevel {
    level: number;
    name: string;
    description: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

const difficultyBgColors: Record<number, string> = {
    1: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    2: 'bg-green-500/10 border-green-500/30 text-green-300',
    3: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    4: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    5: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    6: 'bg-red-500/10 border-red-500/30 text-red-300',
};

const WordBrowse: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<Word[]>([]);
    const [levels, setLevels] = useState<DifficultyLevel[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState<'difficulty' | 'frequency'>('difficulty');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

    const fetchLevels = async () => {
        try {
            const res = await api.get('/difficulty-levels');
            setLevels(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchWords = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('pageSize', '10');
            if (selectedLevels.length > 0) {
                params.append('levels', selectedLevels.join(','));
            }
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);

            const res = await api.get(`/words?${params.toString()}`);
            setWords(res.data.words);
            setPagination(res.data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLevels();
    }, []);

    useEffect(() => {
        fetchWords(1);
    }, [selectedLevels, sortBy, sortOrder]);

    const toggleLevel = (level: number) => {
        setSelectedLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    const toggleCardExpand = (id: number) => {
        setExpandedCardId(prev => prev === id ? null : id);
    };

    const playAudio = (word: string) => {
        const utter = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(utter);
    };

    const toggleStudyPlan = async (word: Word) => {
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

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            fetchWords(newPage);
        }
    };

    const renderFrequencyDots = (frequency: number) => {
        const filledDots = Math.ceil(frequency / 2);
        return (
            <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                            i < filledDots ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                    >
                        <ArrowLeft size={20} className="text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            单词浏览
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            浏览词库，将感兴趣的单词加入学习计划
                        </p>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* 左侧筛选面板 */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="glass-panel p-6 rounded-2xl sticky top-8">
                            <h2 className="text-lg font-bold text-white mb-4">难度筛选</h2>
                            <div className="space-y-2">
                                {levels.map((level) => (
                                    <button
                                        key={level.level}
                                        onClick={() => toggleLevel(level.level)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                            selectedLevels.includes(level.level)
                                                ? difficultyBgColors[level.level]
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded flex items-center justify-center ${
                                                selectedLevels.includes(level.level)
                                                    ? 'bg-white/20'
                                                    : 'bg-slate-700'
                                            }`}
                                        >
                                            {selectedLevels.includes(level.level) && (
                                                <Check size={12} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm">{level.name}</div>
                                            <div className="text-xs opacity-70">{level.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {selectedLevels.length > 0 && (
                                <button
                                    onClick={() => setSelectedLevels([])}
                                    className="w-full mt-4 text-sm text-slate-400 hover:text-white transition"
                                >
                                    清除筛选
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 右侧卡片流 */}
                    <div className="flex-1">
                        {/* 排序控制 */}
                        <div className="glass-panel p-4 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-slate-400 text-sm">排序方式：</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSortBy('difficulty')}
                                        className={`px-4 py-2 rounded-lg text-sm transition ${
                                            sortBy === 'difficulty'
                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        按难度
                                    </button>
                                    <button
                                        onClick={() => setSortBy('frequency')}
                                        className={`px-4 py-2 rounded-lg text-sm transition ${
                                            sortBy === 'frequency'
                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        按使用频率
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm"
                            >
                                {sortOrder === 'asc' ? '升序' : '降序'}
                                {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        {/* 统计信息 */}
                        <div className="text-sm text-slate-400 mb-4">
                            共 {pagination?.total || 0} 个单词
                        </div>

                        {/* 卡片列表 */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-12 text-slate-400">
                                    加载中...
                                </div>
                            ) : words.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 glass-panel rounded-2xl">
                                    <Star size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>没有找到匹配的单词</p>
                                    <p className="text-sm mt-2">试试调整筛选条件</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {words.map((word, index) => (
                                        <motion.div
                                            key={word.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`glass-panel rounded-2xl overflow-hidden cursor-pointer transition-all ${
                                                expandedCardId === word.id
                                                    ? 'ring-2 ring-primary/50'
                                                    : 'hover:bg-slate-800/80'
                                            }`}
                                            onClick={() => toggleCardExpand(word.id)}
                                        >
                                            <div className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-baseline gap-3 mb-1">
                                                            <h3 className="text-2xl font-bold text-white">
                                                                {word.word}
                                                            </h3>
                                                            <span className="text-slate-400 italic font-serif">
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
                                                            <Volume2 size={18} />
                                                            <span className="font-mono text-sm">
                                                                {word.pronunciation}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${difficultyBgColors[word.difficulty_level]}`}>
                                                            {levels.find(l => l.level === word.difficulty_level)?.name}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleStudyPlan(word);
                                                            }}
                                                            className={`p-2 rounded-full transition-all ${
                                                                word.in_study_plan
                                                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                                                            }`}
                                                            title={word.in_study_plan ? '从学习计划移除' : '加入学习计划'}
                                                        >
                                                            {word.in_study_plan ? <Star size={18} fill="currentColor" /> : <Plus size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between">
                                                    <p className="text-slate-200">{word.definition}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500">常用度</span>
                                                        {renderFrequencyDots(word.frequency)}
                                                    </div>
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
                                                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                                                                    例句
                                                                </h4>
                                                                <p className="text-indigo-200 italic font-serif text-lg">
                                                                    "{word.example}"
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className="mt-3 flex justify-center">
                                                    <ChevronDown
                                                        size={16}
                                                        className={`text-slate-500 transition-transform ${
                                                            expandedCardId === word.id ? 'rotate-180' : ''
                                                        }`}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* 分页 */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    上一页
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(pagination.totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (
                                            pageNum === 1 ||
                                            pageNum === pagination.totalPages ||
                                            (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`w-10 h-10 rounded-lg transition ${
                                                        pagination.page === pageNum
                                                            ? 'bg-primary text-white'
                                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            pageNum === pagination.page - 2 ||
                                            pageNum === pagination.page + 2
                                        ) {
                                            return <span key={pageNum} className="px-2 text-slate-500">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    下一页
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WordBrowse;
