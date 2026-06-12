import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    ArrowLeft, Volume2, Search, ChevronDown, ChevronUp,
    Trash2, CheckCircle, Edit3, Save, X, NotebookPen,
    TrendingUp, Clock, Star, CheckSquare, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotebookWord {
    notebook_id: number;
    added_at: string;
    personal_note: string | null;
    word_id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    rank: number;
    frequency: number;
    difficulty_level: number;
    is_mastered: number;
    is_skipped: number;
}

type SortBy = 'added_at' | 'difficulty';
type SortOrder = 'desc' | 'asc';

const difficultyLabels: Record<number, { name: string; color: string }> = {
    1: { name: '基础', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    2: { name: '初级', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    3: { name: '中级', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    4: { name: '中高级', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    5: { name: '高级', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    6: { name: '专业', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const VocabularyNotebook: React.FC = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState<NotebookWord[]>([]);
    const [total, setTotal] = useState(0);
    const [filteredCount, setFilteredCount] = useState(0);
    const [weeklyAdded, setWeeklyAdded] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('added_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [noteDraft, setNoteDraft] = useState('');

    const fetchNotebook = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchKeyword.trim()) params.append('keyword', searchKeyword.trim());
            params.append('sortBy', sortBy);
            params.append('sortOrder', sortOrder);
            const res = await api.get(`/vocabulary-notebook?${params.toString()}`);
            setWords(res.data.words);
            setTotal(res.data.total);
            setFilteredCount(res.data.filtered_count ?? res.data.total);
            setWeeklyAdded(res.data.weekly_added);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotebook();
    }, [sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNotebook();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    const playAudio = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utter);
    };

    const toggleExpand = (id: number) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === words.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(words.map(w => w.word_id)));
        }
    };

    const handleRemove = async (wordId: number) => {
        try {
            await api.delete(`/vocabulary-notebook/${wordId}`);
            const wasInList = words.some(w => w.word_id === wordId);
            setWords(prev => prev.filter(w => w.word_id !== wordId));
            setTotal(prev => Math.max(0, prev - 1));
            if (wasInList) {
                setFilteredCount(prev => Math.max(0, prev - 1));
            }
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(wordId);
                return next;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleBatchRemove = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`确定要移除选中的 ${selectedIds.size} 个单词吗？`)) return;
        try {
            await api.post('/vocabulary-notebook/batch-remove', {
                word_ids: Array.from(selectedIds)
            });
            const removed = new Set(selectedIds);
            const removedFromList = words.filter(w => removed.has(w.word_id)).length;
            setWords(prev => prev.filter(w => !removed.has(w.word_id)));
            setTotal(prev => Math.max(0, prev - removed.size));
            setFilteredCount(prev => Math.max(0, prev - removedFromList));
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkMastered = async (wordId: number) => {
        try {
            await api.post(`/vocabulary-notebook/${wordId}/master`);
            const wasInList = words.some(w => w.word_id === wordId);
            setWords(prev => prev.filter(w => w.word_id !== wordId));
            setTotal(prev => Math.max(0, prev - 1));
            if (wasInList) {
                setFilteredCount(prev => Math.max(0, prev - 1));
            }
            setExpandedIds(prev => {
                const next = new Set(prev);
                next.delete(wordId);
                return next;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const startEditNote = (word: NotebookWord) => {
        setEditingNoteId(word.word_id);
        setNoteDraft(word.personal_note || '');
    };

    const saveNote = async (wordId: number) => {
        try {
            await api.put(`/vocabulary-notebook/${wordId}/note`, {
                personal_note: noteDraft
            });
            setWords(prev => prev.map(w =>
                w.word_id === wordId ? { ...w, personal_note: noteDraft } : w
            ));
            setEditingNoteId(null);
            setNoteDraft('');
        } catch (e) {
            console.error(e);
        }
    };

    const cancelEditNote = () => {
        setEditingNoteId(null);
        setNoteDraft('');
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const getFrequencyStars = (freq: number) => {
        return (
            <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={12}
                        className={i < Math.ceil(freq / 2) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                    />
                ))}
            </div>
        );
    };

    const allSelected = words.length > 0 && selectedIds.size === words.length;

    return (
        <div className="min-h-screen bg-page p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer"
                        title="返回主页"
                    >
                        <ArrowLeft size={20} className="text-text-primary" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 flex items-center gap-3">
                            <NotebookPen size={32} className="text-amber-400" />
                            生词本
                        </h1>
                        <p className="text-text-muted mt-1">暂存暂时记不住、希望反复回顾的词汇</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel p-5 rounded-2xl"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-amber-500/20">
                                <NotebookPen size={18} className="text-amber-400" />
                            </div>
                            <span className="text-sm text-text-muted">生词总数</span>
                        </div>
                        <p className="text-3xl font-bold text-text-primary">{total}</p>
                        <p className="text-xs text-text-faint mt-1">个单词等待复习</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-panel p-5 rounded-2xl"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <TrendingUp size={18} className="text-emerald-400" />
                            </div>
                            <span className="text-sm text-text-muted">本周新增</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">{weeklyAdded}</p>
                        <p className="text-xs text-text-faint mt-1">近7天添加的词汇</p>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="glass-panel p-4 rounded-2xl mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="搜索单词或释义..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card-bg border border-card-border text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-muted whitespace-nowrap">排序:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortBy)}
                                className="px-3 py-2 rounded-lg bg-card-bg border border-card-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                            >
                                <option value="added_at">添加时间</option>
                                <option value="difficulty">难度等级</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                className="p-2 rounded-lg bg-card-bg border border-card-border hover:bg-surface-hover transition cursor-pointer"
                                title={sortOrder === 'desc' ? '降序' : '升序'}
                            >
                                {sortOrder === 'desc' ? (
                                    <ChevronDown size={18} className="text-text-primary" />
                                ) : (
                                    <ChevronUp size={18} className="text-text-primary" />
                                )}
                            </button>
                        </div>

                        {/* Bulk Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleSelectAll}
                                className="p-2 rounded-lg bg-card-bg border border-card-border hover:bg-surface-hover transition cursor-pointer"
                                title={allSelected ? '取消全选' : '全选'}
                            >
                                {allSelected ? (
                                    <CheckSquare size={18} className="text-primary" />
                                ) : (
                                    <Square size={18} className="text-text-muted" />
                                )}
                            </button>
                            <button
                                onClick={handleBatchRemove}
                                disabled={selectedIds.size === 0}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition border cursor-pointer ${
                                    selectedIds.size > 0
                                        ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30'
                                        : 'bg-card-bg border-card-border text-text-faint opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <Trash2 size={16} />
                                批量移除 {selectedIds.size > 0 && `(${selectedIds.size})`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Word List */}
                {loading ? (
                    <div className="text-center py-16 text-text-muted">加载中...</div>
                ) : words.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-panel p-12 rounded-3xl text-center"
                    >
                        <div className="inline-flex p-4 rounded-full bg-amber-500/10 mb-4">
                            <NotebookPen size={48} className="text-amber-400/60" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-3">
                            {searchKeyword ? '未找到匹配的单词' : '生词本还是空的'}
                        </h2>
                        <p className="text-text-muted mb-6">
                            {searchKeyword
                                ? '试试其他关键词搜索'
                                : '在每日推荐中点击「加入生词本」按钮，将暂时记不住的单词存放到这里反复回顾。'}
                        </p>
                        {!searchKeyword && (
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 rounded-xl btn-primary inline-flex items-center gap-2"
                            >
                                返回主页学习
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {/* 搜索结果提示 */}
                        {searchKeyword.trim() && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel p-3 md:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    <Search size={16} className="text-primary" />
                                    <span className="text-text-muted">
                                        搜索「<span className="text-primary font-semibold">{searchKeyword.trim()}</span>」
                                        共找到 <span className="text-text-primary font-bold">{filteredCount}</span> 个匹配单词
                                        <span className="text-text-faint">（生词本总数 {total}）</span>
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSearchKeyword('')}
                                    className="px-3 py-1.5 rounded-lg text-xs bg-card-bg hover:bg-surface transition text-text-secondary hover:text-text-primary border border-card-border cursor-pointer flex items-center gap-1"
                                >
                                    <X size={14} />
                                    清除搜索
                                </button>
                            </motion.div>
                        )}
                        <AnimatePresence>
                            {words.map((word, index) => {
                                const isExpanded = expandedIds.has(word.word_id);
                                const isSelected = selectedIds.has(word.word_id);
                                const difficulty = difficultyLabels[word.difficulty_level] || difficultyLabels[3];
                                const isEditingNote = editingNoteId === word.word_id;

                                return (
                                    <motion.div
                                        key={word.word_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`glass-panel rounded-2xl overflow-hidden border transition ${
                                            isSelected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-transparent'
                                        }`}
                                    >
                                        {/* Collapsed Header */}
                                        <div
                                            className="p-4 md:p-5 cursor-pointer"
                                            onClick={() => toggleExpand(word.word_id)}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Checkbox */}
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelect(word.word_id);
                                                    }}
                                                    className="mt-1 cursor-pointer"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={20} className="text-primary" />
                                                    ) : (
                                                        <Square size={20} className="text-text-muted hover:text-text-secondary" />
                                                    )}
                                                </div>

                                                {/* Word Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                                        <h3 className="text-2xl font-bold text-text-primary">{word.word}</h3>
                                                        <span className="text-text-muted italic font-serif">{word.pos}</span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${difficulty.color}`}>
                                                            {difficulty.name}
                                                        </span>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                playAudio(word.word);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 text-primary hover:text-indigo-400 transition cursor-pointer"
                                                        >
                                                            <Volume2 size={16} />
                                                            <span className="text-sm font-mono">{word.pronunciation}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                                        <p className="text-text-secondary line-clamp-1 flex-1 min-w-[200px]">
                                                            {word.definition}
                                                        </p>
                                                        <div className="flex items-center gap-1 text-text-faint">
                                                            <Clock size={14} />
                                                            <span>添加于 {formatDate(word.added_at)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-text-faint" title="使用频率">
                                                            {getFrequencyStars(word.frequency)}
                                                        </div>
                                                        {word.personal_note && !isExpanded && (
                                                            <div className="flex items-center gap-1 text-amber-400">
                                                                <Edit3 size={14} />
                                                                <span>有备注</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expand Icon */}
                                                <div className="p-1 text-text-muted">
                                                    {isExpanded ? (
                                                        <ChevronUp size={22} />
                                                    ) : (
                                                        <ChevronDown size={22} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="border-t border-card-border"
                                                >
                                                    <div className="p-4 md:p-5 bg-card-bg/50 space-y-5">
                                                        {/* Definition */}
                                                        <div>
                                                            <h4 className="text-xs font-bold text-text-faint uppercase tracking-widest mb-2">释义</h4>
                                                            <p className="text-lg text-text-primary leading-relaxed">{word.definition}</p>
                                                        </div>

                                                        {/* Example */}
                                                        <div className="bg-surface p-4 rounded-xl border border-card-border">
                                                            <h4 className="text-xs font-bold text-text-faint uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                例句
                                                                <button
                                                                    onClick={() => playAudio(word.example)}
                                                                    className="text-primary hover:text-indigo-400 transition cursor-pointer"
                                                                    title="播放例句发音"
                                                                >
                                                                    <Volume2 size={14} />
                                                                </button>
                                                            </h4>
                                                            <p className="text-lg text-primary/80 italic font-serif">"{word.example}"</p>
                                                        </div>

                                                        {/* Personal Note */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-xs font-bold text-text-faint uppercase tracking-widest flex items-center gap-2">
                                                                    <Edit3 size={12} />
                                                                    个人备注
                                                                </h4>
                                                                {!isEditingNote && (
                                                                    <button
                                                                        onClick={() => startEditNote(word)}
                                                                        className="text-xs text-amber-400 hover:text-amber-300 transition cursor-pointer"
                                                                    >
                                                                        {word.personal_note ? '编辑' : '添加备注'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {isEditingNote ? (
                                                                <div className="space-y-2">
                                                                    <textarea
                                                                        value={noteDraft}
                                                                        onChange={(e) => setNoteDraft(e.target.value)}
                                                                        placeholder="在这里写下你对这个单词的记忆技巧、联想或心得..."
                                                                        rows={3}
                                                                        className="w-full px-3 py-2 rounded-lg bg-surface border border-card-border text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            onClick={cancelEditNote}
                                                                            className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary border border-transparent hover:border-card-border transition cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            <X size={14} />
                                                                            取消
                                                                        </button>
                                                                        <button
                                                                            onClick={() => saveNote(word.word_id)}
                                                                            className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
                                                                        >
                                                                            <Save size={14} />
                                                                            保存
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className={`p-4 rounded-xl border min-h-[56px] ${
                                                                    word.personal_note
                                                                        ? 'bg-amber-500/10 border-amber-500/20'
                                                                        : 'bg-surface border-card-border'
                                                                }`}>
                                                                    {word.personal_note ? (
                                                                        <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
                                                                            {word.personal_note}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-text-faint text-sm italic">
                                                                            暂无备注，点击右上角添加属于你的记忆笔记
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex flex-wrap gap-3 pt-2 border-t border-card-border">
                                                            <button
                                                                onClick={() => handleMarkMastered(word.word_id)}
                                                                className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition cursor-pointer flex items-center gap-2 font-medium"
                                                            >
                                                                <CheckCircle size={18} />
                                                                标记为已掌握
                                                            </button>
                                                            <button
                                                                onClick={() => playAudio(word.word)}
                                                                className="px-4 py-2.5 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition cursor-pointer flex items-center gap-2 font-medium"
                                                            >
                                                                <Volume2 size={18} />
                                                                播放发音
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemove(word.word_id)}
                                                                className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30 transition cursor-pointer flex items-center gap-2 font-medium ml-auto"
                                                            >
                                                                <Trash2 size={18} />
                                                                移出生词本
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VocabularyNotebook;
