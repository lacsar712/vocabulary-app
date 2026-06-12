import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Volume2, SkipForward, Check, X, ArrowRight, Home, Trophy, Clock, Target, RefreshCw, Info } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

interface ChallengeWord {
    id: number;
    word: string;
    pronunciation: string;
    definition: string;
    pos: string;
    rank: number;
    difficulty_level: number;
}

interface AnswerResult {
    wordId: number;
    word: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
}

type GamePhase = 'rules' | 'playing' | 'result';

const REQUESTED_QUESTIONS = 10;

const SpellingChallenge: React.FC = () => {
    const [gamePhase, setGamePhase] = useState<GamePhase>('rules');
    const [words, setWords] = useState<ChallengeWord[]>([]);
    const [sessionId, setSessionId] = useState<string>('');
    const [requestedCount, setRequestedCount] = useState<number>(REQUESTED_QUESTIONS);
    const [actualCount, setActualCount] = useState<number>(0);
    const [isFallback, setIsFallback] = useState<boolean>(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [answers, setAnswers] = useState<AnswerResult[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [questionStartTime, setQuestionStartTime] = useState<number>(0);
    const [totalTime, setTotalTime] = useState(0);
    const [inputError, setInputError] = useState(false);
    const [playedAudio, setPlayedAudio] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/spelling-challenge/questions?count=${REQUESTED_QUESTIONS}`);
            setWords(res.data.words);
            setSessionId(res.data.sessionId);
            setRequestedCount(res.data.requestedCount || REQUESTED_QUESTIONS);
            setActualCount(res.data.actualCount || res.data.words.length);
            setIsFallback(res.data.isFallback || false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const playAudio = useCallback((text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 0.8;
        window.speechSynthesis.speak(utter);
        setPlayedAudio(true);
    }, []);

    const startGame = useCallback(() => {
        setGamePhase('playing');
        setCurrentIndex(0);
        setAnswers([]);
        setUserInput('');
        setShowResult(false);
        setStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setPlayedAudio(false);
        setActualCount(0);
        setIsFallback(false);
        setRequestedCount(REQUESTED_QUESTIONS);
        fetchQuestions().then(() => {
            setTimeout(() => inputRef.current?.focus(), 100);
        });
    }, [fetchQuestions]);

    const currentWord = words[currentIndex];

    const checkAnswer = useCallback(() => {
        if (!currentWord || !userInput.trim()) {
            setInputError(true);
            setTimeout(() => setInputError(false), 500);
            return;
        }

        const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

        const result: AnswerResult = {
            wordId: currentWord.id,
            word: currentWord.word,
            userAnswer: userInput.trim(),
            isCorrect,
            timeSpent
        };

        api.post('/spelling-challenge/answer', {
            sessionId,
            wordId: currentWord.id,
            userAnswer: userInput.trim(),
            isCorrect,
            timeSpent
        }).catch(e => console.error(e));

        setAnswers(prev => [...prev, result]);
        setShowResult(true);
    }, [currentWord, userInput, questionStartTime, sessionId]);

    const skipQuestion = useCallback(() => {
        if (!currentWord) return;

        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

        const result: AnswerResult = {
            wordId: currentWord.id,
            word: currentWord.word,
            userAnswer: '(跳过)',
            isCorrect: false,
            timeSpent
        };

        api.post('/spelling-challenge/answer', {
            sessionId,
            wordId: currentWord.id,
            userAnswer: '(跳过)',
            isCorrect: false,
            timeSpent
        }).catch(e => console.error(e));

        setAnswers(prev => [...prev, result]);
        setShowResult(true);
    }, [currentWord, questionStartTime, sessionId]);

    const nextQuestion = useCallback(() => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setShowResult(false);
            setQuestionStartTime(Date.now());
            setPlayedAudio(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            finishGame();
        }
    }, [currentIndex, words.length]);

    const finishGame = useCallback(async () => {
        setSubmitting(true);
        const totalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
        setTotalTime(totalTimeSpent);

        const correctCount = answers.filter(a => a.isCorrect).length;

        try {
            await api.post('/spelling-challenge/complete', {
                sessionId,
                totalQuestions: answers.length,
                correctCount,
                totalTime: totalTimeSpent,
                answers
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
            setGamePhase('result');
        }
    }, [answers, sessionId, startTime]);

    const playCurrentWord = useCallback(() => {
        if (currentWord) {
            playAudio(currentWord.word);
        }
    }, [currentWord, playAudio]);

    useEffect(() => {
        if (gamePhase === 'playing' && currentWord && !playedAudio) {
            const timer = setTimeout(() => {
                playCurrentWord();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, currentWord, playedAudio, playCurrentWord]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && gamePhase === 'playing' && !showResult) {
                checkAnswer();
            } else if (e.key === 'Enter' && showResult) {
                nextQuestion();
            }
        };
        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [gamePhase, showResult, checkAnswer, nextQuestion]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 1000) : 0;

    if (loading && gamePhase !== 'rules') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-primary text-xl font-bold animate-pulse">
                    加载中...
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
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Volume2 size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mb-2">
                            听音拼写挑战
                        </h1>
                        <p className="text-text-muted">测试你的单词拼写能力</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 p-4 bg-card-bg rounded-xl">
                            <Info size={20} className="text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-text-primary mb-1">游戏规则</h3>
                                <ul className="text-text-secondary text-sm space-y-1">
                                    <li>• 每局最多 {requestedCount} 道题，题目难度贴合你的词汇量</li>
                                    <li>• 系统会朗读单词发音，同时给出中文释义</li>
                                    <li>• 在输入框中拼写正确的英文单词</li>
                                    <li>• 提交后立即显示对错和正确答案</li>
                                    <li>• 不会的题目可以点击跳过</li>
                                    <li>• 按 Enter 键快速提交或进入下一题</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-card-bg rounded-xl">
                            <Target size={20} className="text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-text-primary mb-1">得分规则</h3>
                                <p className="text-text-secondary text-sm">
                                    满分 1000 分，根据正确率计算得分。挑战结束后会显示你的总用时和详细答题情况。
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={startGame}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                        >
                            开始挑战 <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <Home size={18} /> 返回主页
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (gamePhase === 'result') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-page">
                <div className="fixed top-4 right-4 z-50">
                    <ThemeToggle />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-8 md:p-10 rounded-3xl max-w-lg w-full"
                >
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Trophy size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-text-primary mb-2">挑战完成！</h1>
                        <p className="text-text-muted">来看看你的表现吧</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-primary mb-1">{score}</div>
                            <div className="text-xs text-text-muted">得分</div>
                        </div>
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-emerald-400 mb-1">{correctCount}/{actualCount || answers.length}</div>
                            <div className="text-xs text-text-muted">正确率</div>
                        </div>
                        <div className="bg-card-bg p-4 rounded-xl text-center">
                            <div className="text-3xl font-bold text-accent mb-1">{formatTime(totalTime)}</div>
                            <div className="text-xs text-text-muted">用时</div>
                        </div>
                    </div>

                    {actualCount > 0 && actualCount < requestedCount && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <p className="text-sm text-amber-300">
                                <span className="font-semibold">提示：</span>
                                当前可用单词不足 {requestedCount} 道，本局共 {actualCount} 道题。
                                {isFallback && ' 由于您词汇量区间的新单词不足，已从全词库中补充。'}
                                {' '}24小时内已挑战过的单词不会重复出现。
                            </p>
                        </div>
                    )}

                    <div className="mb-8">
                        <h3 className="font-semibold text-text-primary mb-4">答题详情</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {answers.map((answer, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-3 rounded-lg flex items-center justify-between ${
                                        answer.isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                            answer.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {answer.isCorrect ? <Check size={14} /> : <X size={14} />}
                                        </div>
                                        <div>
                                            <div className="font-mono font-semibold text-text-primary">{answer.word}</div>
                                            {!answer.isCorrect && answer.userAnswer !== '(跳过)' && (
                                                <div className="text-xs text-red-400">你的答案: {answer.userAnswer}</div>
                                            )}
                                            {answer.userAnswer === '(跳过)' && (
                                                <div className="text-xs text-text-faint">已跳过</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-text-faint">
                                        <Clock size={12} className="inline mr-1" />
                                        {answer.timeSpent}s
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={startGame}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                        >
                            <RefreshCw size={20} /> 再来一局
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <Home size={18} /> 返回主页
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-page">
            <div className="fixed top-0 left-0 w-full h-2 progress-track">
                <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / Math.max(1, words.length)) * 100}%` }}
                />
            </div>

            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="fixed top-6 left-6 flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur">
                    <Target size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-text-primary">
                        {currentIndex + 1} / {Math.max(1, words.length)}
                    </span>
                </div>
                {words.length > 0 && words.length < requestedCount && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur">
                        <Info size={16} className="text-amber-400" />
                        <span className="text-xs text-amber-300">
                            共{words.length}道题
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur">
                    <Check size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">{correctCount}</span>
                </div>
            </div>

            <div className="w-full max-w-xl relative">
                <AnimatePresence mode="wait">
                    {currentWord && (
                        <motion.div
                            key={currentIndex + (showResult ? '-result' : '')}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass-panel p-8 md:p-10 rounded-3xl w-full"
                        >
                            {!showResult ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <button
                                            onClick={playCurrentWord}
                                            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-primary/30"
                                        >
                                            <Volume2 size={40} className="text-white" />
                                        </button>
                                        <p className="text-text-muted text-sm mb-2">点击播放发音</p>

                                        <div className="bg-card-bg p-6 rounded-xl border border-card-border mb-6">
                                            <h3 className="text-sm font-semibold text-primary mb-2">中文释义</h3>
                                            <p className="text-2xl text-text-primary font-medium">{currentWord.definition}</p>
                                            <p className="text-sm text-text-faint mt-2">词性: {currentWord.pos}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            placeholder="请输入英文单词..."
                                            className={`input-field text-center text-xl font-mono py-4 ${
                                                inputError ? 'border-red-500 focus:ring-red-500/50' : ''
                                            }`}
                                            autoComplete="off"
                                            autoCapitalize="off"
                                            spellCheck="false"
                                        />

                                        <div className="flex gap-3">
                                            <button
                                                onClick={skipQuestion}
                                                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                            >
                                                <SkipForward size={18} /> 跳过
                                            </button>
                                            <button
                                                onClick={checkAnswer}
                                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                                            >
                                                <Check size={18} /> 提交
                                            </button>
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
                                                    <span className="text-2xl font-bold text-emerald-400">回答正确！</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                                        <X size={28} className="text-red-400" />
                                                    </div>
                                                    <span className="text-2xl font-bold text-red-400">
                                                        {answers[answers.length - 1]?.userAnswer === '(跳过)' ? '已跳过' : '回答错误'}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            <p className="text-text-muted text-sm mb-2">正确答案</p>
                                            <div className="flex items-center justify-center gap-3 mb-2">
                                                <span className="text-3xl font-bold text-text-primary font-mono">{currentWord.word}</span>
                                                <button
                                                    onClick={() => playAudio(currentWord.word)}
                                                    className="p-2 rounded-full bg-surface hover:bg-surface-hover transition"
                                                >
                                                    <Volume2 size={18} className="text-primary" />
                                                </button>
                                            </div>
                                            <p className="text-primary font-mono">{currentWord.pronunciation}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={nextQuestion}
                                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
                                    >
                                        {currentIndex < words.length - 1 ? (
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

export default SpellingChallenge;
