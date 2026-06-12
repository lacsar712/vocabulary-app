import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import api from '../api';
import { Bell, Clock, Target, TrendingUp, Award, Megaphone, Trash2, CheckCheck, ChevronDown, ChevronUp, ArrowLeft, Bookmark, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';

interface Notification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    summary: string;
    detail: string | null;
    is_read: number;
    created_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

const NOTIFICATION_TYPES = [
    { key: '', label: '全部', icon: Bell, color: 'text-text-secondary', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/30' },
    { key: 'review_reminder', label: '复习提醒', icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
    { key: 'notebook_add', label: '加入生词本', icon: Bookmark, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
    { key: 'mastered_from_notebook', label: '生词已掌握', icon: CheckCircle, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/30' },
    { key: 'goal_achievement', label: '目标达成', icon: Target, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
    { key: 'rank_change', label: '排名变动', icon: TrendingUp, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/30' },
    { key: 'achievement_unlock', label: '成就解锁', icon: Award, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
    { key: 'system_announcement', label: '系统公告', icon: Megaphone, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' },
];

const getTypeConfig = (type: string) => NOTIFICATION_TYPES.find(t => t.key === type) || NOTIFICATION_TYPES[0];

function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr + 'Z');
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 30) return `${diffDay} 天前`;
    return date.toLocaleDateString('zh-CN');
}

const NotificationCenter: React.FC = () => {
    const { refreshUnreadCount } = useNotifications();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
    const [activeType, setActiveType] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchNotifications = useCallback(async (page: number = 1, type: string = activeType, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            const params: { page: number; pageSize: number; type?: string } = { page, pageSize: 10 };
            if (type) params.type = type;
            const res = await api.get('/notifications', { params });
            if (append) {
                setNotifications(prev => [...prev, ...res.data.notifications]);
            } else {
                setNotifications(res.data.notifications);
            }
            setPagination(res.data.pagination);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [activeType]);

    useEffect(() => {
        fetchNotifications(1, activeType, false);
    }, [activeType, fetchNotifications]);

    const handleTypeChange = (type: string) => {
        setActiveType(type);
        setExpandedId(null);
    };

    const handleMarkRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            refreshUnreadCount();
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleExpand = (n: Notification) => {
        if (expandedId === n.id) {
            setExpandedId(null);
        } else {
            setExpandedId(n.id);
            if (!n.is_read) {
                handleMarkRead(n.id);
            }
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            refreshUnreadCount();
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            refreshUnreadCount();
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkTypeRead = async (type: string) => {
        try {
            await api.put(`/notifications/read-type/${type}`);
            setNotifications(prev => prev.map(n => n.type === type ? { ...n, is_read: 1 } : n));
            refreshUnreadCount();
        } catch (e) {
            console.error(e);
        }
    };

    const handleLoadMore = () => {
        if (pagination.page < pagination.totalPages) {
            fetchNotifications(pagination.page + 1, activeType, true);
        }
    };

    const hasUnread = notifications.some(n => !n.is_read);
    const hasUnreadByActiveType = activeType ? notifications.some(n => n.type === activeType && !n.is_read) : hasUnread;

    if (loading) return <div className="min-h-screen bg-page flex items-center justify-center text-text-primary">加载消息中...</div>;

    return (
        <div className="min-h-screen bg-page p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-full bg-surface border border-border-default hover:bg-surface-hover transition cursor-pointer"
                        >
                            <ArrowLeft size={20} className="text-text-secondary" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                                <Bell size={24} className="text-primary" />
                                消息中心
                            </h1>
                            <p className="text-text-muted text-sm">共 {pagination.total} 条通知</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {hasUnread && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/20 transition cursor-pointer"
                            >
                                <CheckCheck size={16} />
                                全部已读
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {NOTIFICATION_TYPES.map(t => {
                        const Icon = t.icon;
                        const isActive = activeType === t.key;
                        return (
                            <button
                                key={t.key || 'all'}
                                onClick={() => handleTypeChange(t.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer border ${
                                    isActive
                                        ? `${t.bgColor} ${t.color} ${t.borderColor}`
                                        : 'bg-card-bg text-text-muted border-card-border hover:bg-surface hover:text-text-secondary'
                                }`}
                            >
                                <Icon size={14} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {activeType && hasUnreadByActiveType && (
                    <div className="flex justify-end mb-3">
                        <button
                            onClick={() => handleMarkTypeRead(activeType)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                        >
                            <CheckCheck size={12} />
                            将此类全部标为已读
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {notifications.map(n => {
                            const typeConfig = getTypeConfig(n.type);
                            const Icon = typeConfig.icon;
                            const isExpanded = expandedId === n.id;

                            return (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => handleToggleExpand(n)}
                                    className={`glass-panel rounded-xl p-4 cursor-pointer transition-all ${
                                        !n.is_read ? 'border-l-4 border-l-primary bg-surface/80' : 'bg-surface/40'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${typeConfig.bgColor} flex-shrink-0`}>
                                            <Icon size={18} className={typeConfig.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-sm font-semibold ${!n.is_read ? 'text-text-primary' : 'text-text-muted'}`}>
                                                    {n.title}
                                                </h3>
                                                {!n.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className={`text-sm ${!n.is_read ? 'text-text-secondary' : 'text-text-faint'} line-clamp-2`}>
                                                {n.summary}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs text-text-faint">{formatRelativeTime(n.created_at)}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                                                    {typeConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {isExpanded ? (
                                                <ChevronUp size={16} className="text-text-faint" />
                                            ) : (
                                                <ChevronDown size={16} className="text-text-faint" />
                                            )}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && n.detail && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 pt-3 border-t border-card-border">
                                                    <p className="text-sm text-text-secondary leading-relaxed">{n.detail}</p>
                                                    <div className="flex justify-end mt-3">
                                                        <button
                                                            onClick={(e) => handleDelete(n.id, e)}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                            删除
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

                    {notifications.length === 0 && !loading && (
                        <div className="glass-panel rounded-xl p-12 text-center">
                            <Bell size={48} className="text-text-faint mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-text-muted mb-2">暂无消息</h3>
                            <p className="text-text-faint text-sm">当有新的学习通知时，会在这里显示</p>
                        </div>
                    )}
                </div>

                {pagination.page < pagination.totalPages && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="px-6 py-2.5 rounded-xl bg-surface border border-border-default text-text-secondary hover:bg-surface-hover transition cursor-pointer disabled:opacity-50"
                        >
                            {loadingMore ? '加载中...' : '加载更多'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
