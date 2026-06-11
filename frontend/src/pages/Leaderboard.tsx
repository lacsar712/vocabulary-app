import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
    id: number;
    username: string;
    vocab_size: number;
    mastered_count: number;
    rank: number;
}

const periodLabels: Record<string, string> = {
    week: '本周',
    month: '本月',
};

const Leaderboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await api.get('/leaderboard', { params: { period } });
                setLeaderboard(res.data.leaderboard);
                setCurrentUser(res.data.currentUser);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [period]);

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Crown size={22} className="text-yellow-400" />;
        if (rank === 2) return <Medal size={22} className="text-gray-300" />;
        if (rank === 3) return <Medal size={22} className="text-amber-600" />;
        return null;
    };

    const getRankBg = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/40';
        if (rank === 2) return 'bg-gradient-to-r from-gray-400/15 to-gray-500/10 border-gray-400/40';
        if (rank === 3) return 'bg-gradient-to-r from-amber-700/15 to-amber-800/10 border-amber-600/40';
        return 'bg-slate-800/50 border-slate-700/50';
    };

    const isUserInList = (entry: LeaderboardEntry) => user?.id === entry.id;

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Trophy size={24} className="text-yellow-400" />
                        学习排行榜
                    </h1>
                </header>

                <div className="flex gap-2 mb-6 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    {(['week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                                period === p
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center text-slate-400 py-16">加载排行榜中...</div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center text-slate-500 py-16">
                        <Trophy size={48} className="mx-auto mb-4 opacity-30" />
                        <p>暂无排行数据</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        {leaderboard.map((entry) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: entry.rank * 0.03 }}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRankBg(entry.rank)} ${
                                    isUserInList(entry) ? 'ring-2 ring-primary/50' : ''
                                }`}
                            >
                                <div className="w-8 flex items-center justify-center shrink-0">
                                    {getRankBadge(entry.rank) || (
                                        <span className="text-slate-400 font-bold text-sm">{entry.rank}</span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-semibold truncate">
                                            {entry.username}
                                        </span>
                                        {isUserInList(entry) && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                                                我
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-white font-bold">{entry.mastered_count}</div>
                                    <div className="text-xs text-slate-400">掌握词数</div>
                                </div>

                                <div className="text-right shrink-0 w-20">
                                    <div className="text-indigo-300 font-semibold">{entry.vocab_size}</div>
                                    <div className="text-xs text-slate-400">词汇量</div>
                                </div>
                            </motion.div>
                        ))}

                        {currentUser && (
                            <>
                                <div className="flex items-center gap-2 py-2">
                                    <div className="flex-1 h-px bg-slate-700" />
                                    <span className="text-xs text-slate-500">· · ·</span>
                                    <div className="flex-1 h-px bg-slate-700" />
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-4 p-4 rounded-xl border bg-slate-800/70 border-primary/30 ring-2 ring-primary/20"
                                >
                                    <div className="w-8 flex items-center justify-center shrink-0">
                                        <span className="text-primary font-bold text-sm">{currentUser.rank}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-semibold truncate">
                                                {currentUser.username}
                                            </span>
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                                                我
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-white font-bold">{currentUser.mastered_count}</div>
                                        <div className="text-xs text-slate-400">掌握词数</div>
                                    </div>

                                    <div className="text-right shrink-0 w-20">
                                        <div className="text-indigo-300 font-semibold">{currentUser.vocab_size}</div>
                                        <div className="text-xs text-slate-400">词汇量</div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
