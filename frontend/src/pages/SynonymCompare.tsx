import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ArrowLeft, Volume2, BookOpen, Plus, Check, Shuffle,
    AlertTriangle, Clock, Sparkles, ChevronRight
} from 'lucide-react';

interface SynonymMember {
    id: number;
    word: string;
    pronunciation: string;
    pos: string;
    definition: string;
    example: string;
    rank: number;
    frequency: number;
    difficulty_level: number;
    usage_diff: string | null;
}

interface SearchResult {
    found: boolean;
    keyword: string;
    targetWord?: {
        id: number;
        word: string;
        pronunciation: string;
        pos: string;
        definition: string;
    };
    group?: {
        id: number;
        name: string;
        description: string;
        all_group_word_ids?: number[];
        members: SynonymMember[];
    } | null;
    all_word_ids?: number[];
    similarWords?: SynonymMember[];
}

interface ConfusablePair {
    id: number;
    word1: string;
    word2: string;
    tip: string;
}

interface HotGroup {
    id: number;
    name: string;
    description: string;
    member_count: number;
}

const difficultyLabels: Record<number, { label: string; color: string }> = {
    1: { label: '基础', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    2: { label: '初级', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    3: { label: '中级', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    4: { label: '中高级', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    5: { label: '高级', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    6: { label: '专业', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const SynonymCompare: React.FC = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [confusablePairs, setConfusablePairs] = useState<ConfusablePair[]>([]);
    const [hotGroups, setHotGroups] = useState<HotGroup[]>([]);
    const [addedWords, setAddedWords] = useState<Set<number>>(new Set());
    const [allGroupAdded, setAllGroupAdded] = useState(false);

    const fetchInitialData = useCallback(async () => {
        try {
            const [historyRes, pairsRes, hotRes] = await Promise.all([
                api.get('/synonym/search-history'),
                api.get('/synonym/confusable-pairs?limit=10'),
                api.get('/synonym/hot-groups?limit=5')
            ]);
            setSearchHistory(historyRes.data.history || []);
            setConfusablePairs(pairsRes.data.pairs || []);
            setHotGroups(hotRes.data.groups || []);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleSearch = async (searchKeyword?: string) => {
        const kw = (searchKeyword || keyword).trim().toLowerCase();
        if (!kw) return;

        setKeyword(kw);
        setLoading(true);
        setSearchResult(null);
        setAddedWords(new Set());
        setAllGroupAdded(false);

        try {
            const res = await api.get(`/synonym/search?keyword=${encodeURIComponent(kw)}`);
            setSearchResult(res.data);

            await api.post('/synonym/search-history', { keyword: kw });

            const historyRes = await api.get('/synonym/search-history');
            setSearchHistory(historyRes.data.history || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToPlan = async (wordId: number) => {
        try {
            const res = await api.post('/study-plan', { word_id: wordId });
            if (res.data.added || res.data.success) {
                setAddedWords(prev => new Set(prev).add(wordId));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddAllToPlan = async () => {
        const members = searchResult?.group?.members || searchResult?.similarWords || [];
        if (members.length === 0) return;

        const presetGroupIds = searchResult?.group?.all_group_word_ids;
        const similarGroupIds = searchResult?.all_word_ids;
        const wordIds = presetGroupIds && presetGroupIds.length > 0
            ? presetGroupIds
            : (similarGroupIds && similarGroupIds.length > 0
                ? similarGroupIds
                : members.map(m => m.id));

        try {
            const res = await api.post('/synonym/add-group-to-plan', { word_ids: wordIds });
            if (res.data.success) {
                setAddedWords(new Set(wordIds));
                setAllGroupAdded(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const playAudio = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utter);
    };

    const getDisplayMembers = (): SynonymMember[] => {
        if (!searchResult?.found) return [];
        if (searchResult.group) return searchResult.group.members;
        if (searchResult.similarWords) return searchResult.similarWords;
        return [];
    };

    const renderDifficultyBadge = (level: number) => {
        const info = difficultyLabels[level] || difficultyLabels[3];
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${info.color}`}>
                {info.label}
            </span>
        );
    };

    const renderFrequency = (freq: number) => {
        const normalized = Math.ceil(freq / 2);
        return (
            <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">常用度</span>
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${i < normalized ? 'bg-emerald-400' : 'bg-slate-600'}`}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const renderSynonymCard = (member: SynonymMember, index: number) => (
        <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-5 rounded-2xl flex flex-col"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-2xl font-bold text-text-primary">{member.word}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => playAudio(member.word)}
                            className="text-primary hover:text-indigo-400 transition cursor-pointer"
                        >
                            <Volume2 size={16} />
                        </button>
                        <span className="text-sm text-text-muted font-mono">{member.pronunciation}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {renderDifficultyBadge(member.difficulty_level)}
                    {renderFrequency(member.frequency)}
                </div>
            </div>

            <div className="mb-3">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium mr-1">
                    {member.pos}
                </span>
                <span className="text-text-secondary text-sm">{member.definition}</span>
            </div>

            {member.example && (
                <div className="bg-card-bg p-3 rounded-lg border border-card-border mb-3">
                    <p className="text-sm text-primary/80 italic font-serif">"{member.example}"</p>
                </div>
            )}

            {member.usage_diff && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">用法辨析</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{member.usage_diff}</p>
                </div>
            )}

            <button
                onClick={() => handleAddToPlan(member.id)}
                disabled={addedWords.has(member.id)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    addedWords.has(member.id)
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-surface border border-border-default text-text-secondary hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
                }`}
            >
                {addedWords.has(member.id) ? (
                    <>
                        <Check size={16} />
                        已加入学习计划
                    </>
                ) : (
                    <>
                        <Plus size={16} />
                        加入学习计划
                    </>
                )}
            </button>
        </motion.div>
    );

    const renderEmptyState = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-10 rounded-3xl text-center"
        >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface flex items-center justify-center">
                <Search size={36} className="text-text-faint" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">未找到「{searchResult?.keyword}」的相关近义词</h3>
            <p className="text-text-muted mb-6">该词暂未收录在近义词库中，试试其他常见英文单词吧</p>

            {hotGroups.length > 0 && (
                <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-text-faint uppercase tracking-widest mb-3">
                        <Sparkles size={14} className="inline mr-1" />
                        热门对比词组
                    </h4>
                    <div className="space-y-2">
                        {hotGroups.map(g => (
                            <button
                                key={g.id}
                                onClick={() => {
                                    const firstWord = g.name.split(' / ')[0];
                                    setKeyword(firstWord);
                                    handleSearch(firstWord);
                                }}
                                className="w-full text-left p-3 rounded-lg bg-surface border border-border-default hover:bg-primary/10 hover:border-primary/30 transition flex items-center gap-3 cursor-pointer"
                            >
                                <Shuffle size={16} className="text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <span className="text-text-primary font-medium text-sm">{g.name}</span>
                                    <p className="text-text-faint text-xs truncate">{g.description}</p>
                                </div>
                                <ChevronRight size={16} className="text-text-faint flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );

    const renderResult = () => {
        if (!searchResult) return null;
        if (!searchResult.found) return renderEmptyState();

        const members = getDisplayMembers();

        return (
            <div>
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 rounded-2xl mb-6"
                >
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-text-primary">{searchResult.targetWord?.word}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => playAudio(searchResult.targetWord?.word || '')} className="text-primary hover:text-indigo-400 transition cursor-pointer">
                                    <Volume2 size={18} />
                                </button>
                                <span className="text-text-muted font-mono text-sm">{searchResult.targetWord?.pronunciation}</span>
                            </div>
                        </div>
                        <div className="flex-1" />
                        <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                            {searchResult.targetWord?.pos}
                        </span>
                        <span className="text-text-secondary text-lg">{searchResult.targetWord?.definition}</span>
                    </div>
                </motion.div>

                {searchResult.group && (
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <Shuffle size={20} className="text-primary" />
                                {searchResult.group.name}
                            </h3>
                            <p className="text-text-muted text-sm">{searchResult.group.description}</p>
                        </div>
                        <button
                            onClick={handleAddAllToPlan}
                            disabled={allGroupAdded}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                                allGroupAdded
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                    : 'btn-primary'
                            }`}
                        >
                            {allGroupAdded ? (
                                <>
                                    <Check size={16} />
                                    整组已加入
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    整组加入学习计划
                                </>
                            )}
                        </button>
                    </div>
                )}

                {!searchResult.group && searchResult.similarWords && (
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Shuffle size={20} className="text-secondary" />
                            释义相近词汇
                        </h3>
                        <p className="text-text-muted text-sm">基于释义和词性相似度自动匹配</p>
                        <button
                            onClick={handleAddAllToPlan}
                            disabled={allGroupAdded}
                            className={`mt-2 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
                                allGroupAdded
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                                    : 'btn-primary'
                            }`}
                        >
                            {allGroupAdded ? (
                                <>
                                    <Check size={16} />
                                    整组已加入
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    整组加入学习计划
                                </>
                            )}
                        </button>
                    </div>
                )}

                {members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {members.map((m, i) => renderSynonymCard(m, i))}
                    </div>
                ) : (
                    <div className="glass-panel p-8 rounded-2xl text-center">
                        <p className="text-text-muted">暂无近义词数据</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-page p-4 md:p-8">
            <header className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer"
                    >
                        <ArrowLeft size={20} className="text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            近义词对比
                        </h1>
                        <p className="text-text-muted text-sm">辨析含义相近的词汇，精准掌握用法差异</p>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="glass-panel p-4 rounded-2xl">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="输入英文单词搜索近义词..."
                                    className="input-field pl-10"
                                />
                            </div>
                            <button
                                onClick={() => handleSearch()}
                                disabled={loading || !keyword.trim()}
                                className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Search size={18} />
                                搜索
                            </button>
                        </div>

                        {searchHistory.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <Clock size={14} className="text-text-faint" />
                                <span className="text-xs text-text-faint">最近搜索:</span>
                                {searchHistory.map((kw, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setKeyword(kw);
                                            handleSearch(kw);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-surface border border-border-default text-xs text-text-secondary hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition cursor-pointer"
                                    >
                                        {kw}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="glass-panel p-12 rounded-3xl text-center"
                            >
                                <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <p className="text-text-muted">正在搜索近义词...</p>
                            </motion.div>
                        ) : searchResult ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {renderResult()}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="glass-panel p-12 rounded-3xl text-center"
                            >
                                <BookOpen size={48} className="mx-auto mb-4 text-text-faint" />
                                <h3 className="text-xl font-bold text-text-primary mb-2">输入单词开始对比</h3>
                                <p className="text-text-muted">在搜索框中输入英文单词，即可查看近义词对比与用法辨析</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel p-5 rounded-2xl">
                        <h3 className="text-sm font-bold text-text-faint uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400" />
                            易混淆词对
                        </h3>
                        <div className="space-y-2">
                            {confusablePairs.map((pair) => (
                                <button
                                    key={pair.id}
                                    onClick={() => {
                                        setKeyword(pair.word1);
                                        handleSearch(pair.word1);
                                    }}
                                    className="w-full text-left p-3 rounded-lg bg-surface border border-border-default hover:border-amber-500/30 hover:bg-amber-500/5 transition cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-text-primary font-semibold text-sm">{pair.word1}</span>
                                        <span className="text-text-faint text-xs">vs</span>
                                        <span className="text-text-primary font-semibold text-sm">{pair.word2}</span>
                                    </div>
                                    <p className="text-text-faint text-xs leading-relaxed">{pair.tip}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-2xl">
                        <h3 className="text-sm font-bold text-text-faint uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-primary" />
                            推荐对比词组
                        </h3>
                        <div className="space-y-2">
                            {hotGroups.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => {
                                        const firstWord = g.name.split(' / ')[0];
                                        setKeyword(firstWord);
                                        handleSearch(firstWord);
                                    }}
                                    className="w-full text-left p-3 rounded-lg bg-surface border border-border-default hover:border-primary/30 hover:bg-primary/5 transition cursor-pointer"
                                >
                                    <span className="text-text-primary font-medium text-sm">{g.name}</span>
                                    <p className="text-text-faint text-xs mt-0.5">{g.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SynonymCompare;
