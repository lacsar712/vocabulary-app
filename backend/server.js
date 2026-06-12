const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, THEMES, CONFUSABLE_PAIRS, createNotification } = require('./database');
const app = express();
const PORT = 3000;
const SECRET_KEY = "supersecretkey_vocabulary_1209"; // In prod, use .env

app.use(cors());
app.use(express.json());

// Middleware to authenticate
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token.split(' ')[1], SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash], function (err) {
        if (err) return res.status(400).json({ error: "用户名已存在" });
        res.json({ id: this.lastID, username, vocab_size: 0, onboarding_completed: 0 });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user || applyPasswordCheck(password, user)) return res.status(401).json({ error: "无效的用户名或密码" });
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                vocab_size: user.vocab_size,
                onboarding_completed: user.onboarding_completed || 0
            }
        });
    });
});

function applyPasswordCheck(password, user) {
    return !bcrypt.compareSync(password, user.password_hash);
}

// User Profile
app.get('/api/me', authenticate, (req, res) => {
    db.get("SELECT id, username, vocab_size, onboarding_completed, created_at FROM users WHERE id = ?", [req.user.id], (err, row) => {
        res.json(row);
    });
});

// Check if user needs onboarding (no vocab test AND no learning records)
app.get('/api/onboarding/needs', authenticate, (req, res) => {
    db.get("SELECT vocab_size, onboarding_completed FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT COUNT(*) as cnt FROM learning_history WHERE user_id = ?", [req.user.id], (err2, stats) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const needsOnboarding = !user.onboarding_completed && user.vocab_size === 0 && stats.cnt === 0;
            res.json({ needs_onboarding: needsOnboarding, onboarding_completed: !!user.onboarding_completed });
        });
    });
});

// Mark onboarding as completed
app.post('/api/onboarding/complete', authenticate, (req, res) => {
    db.run("UPDATE users SET onboarding_completed = 1 WHERE id = ?", [req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, onboarding_completed: true });
    });
});

// Reset onboarding status (for re-watching from settings)
app.post('/api/onboarding/reset', authenticate, (req, res) => {
    db.run("UPDATE users SET onboarding_completed = 0 WHERE id = ?", [req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, onboarding_completed: false });
    });
});

// Vocab Test Routes
// Adaptive test: Start with medium difficulty, adjust based on answers
app.get('/api/test/words', (req, res) => {
    // Get words from each difficulty level for adaptive testing
    // Returns words grouped by difficulty for frontend to implement adaptive logic
    const sql = `
        SELECT * FROM words
        ORDER BY difficulty_level ASC, RANDOM()
    `;
    db.all(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get next adaptive test word based on current ability estimate
app.post('/api/test/next-word', authenticate, (req, res) => {
    const { currentAbility, answeredWordIds } = req.body;
    // currentAbility: estimated rank level (starts at 3000)
    // answeredWordIds: array of word IDs already answered

    const excludeIds = answeredWordIds && answeredWordIds.length > 0
        ? answeredWordIds.join(',')
        : '0';

    // Find word closest to current ability estimate
    const sql = `
        SELECT *, ABS(rank - ?) as distance
        FROM words
        WHERE id NOT IN (${excludeIds})
        ORDER BY distance ASC, RANDOM()
        LIMIT 1
    `;

    db.get(sql, [currentAbility], (err, word) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!word) return res.json({ finished: true });
        res.json(word);
    });
});

// Submit test result with detailed answer data for accurate estimation
app.post('/api/test/submit', authenticate, (req, res) => {
    const { answers } = req.body;
    // answers: [{ wordId, rank, isCorrect }]

    if (!answers || answers.length === 0) {
        return res.status(400).json({ error: "No answers provided" });
    }

    // Binary search estimation using Item Response Theory (IRT) simplified
    // Find the rank threshold where user transitions from knowing to not knowing
    const sortedAnswers = [...answers].sort((a, b) => a.rank - b.rank);

    let correctByRank = sortedAnswers.map(a => ({
        rank: a.rank,
        correct: a.isCorrect ? 1 : 0
    }));

    // Calculate weighted average based on correct/incorrect boundary
    // Words answered correctly contribute their rank, incorrect ones don't
    let totalWeight = 0;
    let weightedSum = 0;

    correctByRank.forEach((item, index) => {
        const weight = item.correct ? 1.5 : 0.5;
        weightedSum += item.rank * weight * (item.correct ? 1 : 0.3);
        totalWeight += weight * (item.correct ? 1 : 0.3);
    });

    // Find the highest rank where user got correct
    const correctAnswers = sortedAnswers.filter(a => a.isCorrect);
    const incorrectAnswers = sortedAnswers.filter(a => !a.isCorrect);

    let estimatedVocab;

    if (correctAnswers.length === 0) {
        // All wrong - estimate at lowest rank
        estimatedVocab = Math.min(...sortedAnswers.map(a => a.rank)) * 0.5;
    } else if (incorrectAnswers.length === 0) {
        // All correct - estimate above highest tested rank
        estimatedVocab = Math.max(...sortedAnswers.map(a => a.rank)) * 1.2;
    } else {
        // Mixed results - find the boundary
        const maxCorrectRank = Math.max(...correctAnswers.map(a => a.rank));
        const minIncorrectRank = Math.min(...incorrectAnswers.map(a => a.rank));

        // Estimate is between highest correct and lowest incorrect
        // Weight towards correct answers
        const correctRatio = correctAnswers.length / answers.length;
        estimatedVocab = maxCorrectRank * 0.7 + minIncorrectRank * 0.3;

        // Adjust based on overall performance
        estimatedVocab = estimatedVocab * (0.8 + correctRatio * 0.4);
    }

    estimatedVocab = Math.round(Math.max(100, Math.min(10000, estimatedVocab)));

    // Record test history
    const stmt = db.prepare(`
        INSERT INTO test_history (user_id, word_id, is_correct, word_rank)
        VALUES (?, ?, ?, ?)
    `);

    answers.forEach(a => {
        stmt.run(req.user.id, a.wordId, a.isCorrect ? 1 : 0, a.rank);
    });
    stmt.finalize();

    // Update user vocab size
    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (e3, oldUser) => {
        const oldVocab = oldUser ? oldUser.vocab_size : 0;
        db.run("UPDATE users SET vocab_size = ? WHERE id = ?", [estimatedVocab, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const diff = estimatedVocab - oldVocab;
            if (diff !== 0) {
                const direction = diff > 0 ? '上升' : '下降';
                const absDiff = Math.abs(diff);
                createNotification(
                    req.user.id,
                    'rank_change',
                    '词汇量变动通知',
                    `你的词汇量评估${direction}了 ${absDiff} 词，当前为 ${estimatedVocab} 词`,
                    `经过词汇量测试，你的词汇量从 ${oldVocab} 词${direction}至 ${estimatedVocab} 词。${diff > 0 ? '继续保持进步！' : '不要灰心，坚持学习就会提升！'}`
                );
            }

            res.json({
                vocab_size: estimatedVocab,
                correct_count: correctAnswers.length,
                total_questions: answers.length,
                accuracy: Math.round((correctAnswers.length / answers.length) * 100)
            });
        });
    });
});

// Recommendation Engine (i+1) - Enhanced with study plan priority, frequency and learning history
app.get('/api/recommend', authenticate, (req, res) => {
    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const i = user.vocab_size;

        db.all("SELECT theme_id FROM user_theme_preferences WHERE user_id = ?", [req.user.id], (err, prefRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const themeIds = prefRows.map(r => r.theme_id);
            const hasThemePref = themeIds.length > 0;

            const themeJoin = hasThemePref
                ? `LEFT JOIN word_themes wt_pref ON wt_pref.word_id = w.id AND wt_pref.theme_id IN (${themeIds.map(() => '?').join(',')})`
                : '';
            const themeScore = hasThemePref
                ? `, CASE WHEN wt_pref.theme_id IS NOT NULL THEN 150 ELSE 0 END as theme_score`
                : ', 0 as theme_score';
            const themeParams = hasThemePref ? themeIds : [];

            const sql = `
                SELECT w.*,
                       CASE
                           WHEN sp.id IS NOT NULL THEN 200
                           WHEN w.rank BETWEEN ? AND ? THEN 100
                           WHEN w.rank BETWEEN ? AND ? THEN 80
                           WHEN w.rank < ? THEN 60
                           ELSE 40
                       END as level_score,
                       (w.frequency * 10) as frequency_score,
                       sp.id IS NOT NULL as in_study_plan
                       ${themeScore},
                       GROUP_CONCAT(DISTINCT t_all.name) as theme_names,
                       GROUP_CONCAT(DISTINCT t_all.key) as theme_keys
                FROM words w
                LEFT JOIN study_plan sp ON sp.word_id = w.id AND sp.user_id = ?
                ${themeJoin}
                LEFT JOIN word_themes wt_all ON wt_all.word_id = w.id
                LEFT JOIN themes t_all ON t_all.id = wt_all.theme_id
                WHERE w.id NOT IN (
                    SELECT word_id FROM learning_history
                    WHERE user_id = ? AND status = 'learned'
                )
                AND w.id NOT IN (
                    SELECT word_id FROM learning_history
                    WHERE user_id = ? AND status = 'skipped'
                    AND updated_at > datetime('now', '-1 hour')
                )
                GROUP BY w.id
                ORDER BY (level_score + frequency_score + theme_score) DESC, w.rank ASC
                LIMIT 1
            `;

            const params = [
                i, i + 1500,
                i + 1500, i + 3000,
                i,
                req.user.id,
                ...themeParams,
                req.user.id,
                req.user.id
            ];

            db.get(sql, params, (err, word) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!word) {
                    db.get(`
                        SELECT w.*,
                               GROUP_CONCAT(DISTINCT t.name) as theme_names,
                               GROUP_CONCAT(DISTINCT t.key) as theme_keys
                        FROM words w
                        LEFT JOIN word_themes wt ON wt.word_id = w.id
                        LEFT JOIN themes t ON t.id = wt.theme_id
                        WHERE w.id NOT IN (SELECT word_id FROM learning_history WHERE user_id = ? AND status = 'learned')
                        AND w.id NOT IN (SELECT word_id FROM learning_history WHERE user_id = ? AND status = 'skipped' AND updated_at > datetime('now', '-1 hour'))
                        GROUP BY w.id
                        ORDER BY w.frequency DESC, w.rank ASC
                        LIMIT 1
                    `, [req.user.id, req.user.id], (err, fallback) => {
                        if (fallback) {
                            fallback.theme_names = fallback.theme_names ? fallback.theme_names.split(',') : [];
                            fallback.theme_keys = fallback.theme_keys ? fallback.theme_keys.split(',') : [];
                            return res.json(fallback);
                        }
                        return res.json({ message: "暂无新单词. 您已掌握所有词汇!" });
                    });
                    return;
                }
                word.theme_names = word.theme_names ? word.theme_names.split(',') : [];
                word.theme_keys = word.theme_keys ? word.theme_keys.split(',') : [];
                res.json(word);
            });
        });
    });
});

// Get multiple recommendations for batch learning
app.get('/api/recommend/batch', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 5;

    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const i = user.vocab_size;

        db.all("SELECT theme_id FROM user_theme_preferences WHERE user_id = ?", [req.user.id], (err, prefRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const themeIds = prefRows.map(r => r.theme_id);
            const hasThemePref = themeIds.length > 0;

            const themeJoin = hasThemePref
                ? `LEFT JOIN word_themes wt_pref ON wt_pref.word_id = w.id AND wt_pref.theme_id IN (${themeIds.map(() => '?').join(',')})`
                : '';
            const themeScore = hasThemePref
                ? `, CASE WHEN wt_pref.theme_id IS NOT NULL THEN 150 ELSE 0 END as theme_score`
                : ', 0 as theme_score';
            const themeParams = hasThemePref ? themeIds : [];

            const sql = `
                SELECT w.*,
                       CASE
                           WHEN sp.id IS NOT NULL THEN 200
                           WHEN w.rank BETWEEN ? AND ? THEN 100
                           WHEN w.rank BETWEEN ? AND ? THEN 80
                           WHEN w.rank < ? THEN 60
                           ELSE 40
                       END as level_score,
                       (w.frequency * 10) as frequency_score,
                       sp.id IS NOT NULL as in_study_plan
                       ${themeScore}
                FROM words w
                LEFT JOIN study_plan sp ON sp.word_id = w.id AND sp.user_id = ?
                ${themeJoin}
                WHERE w.id NOT IN (
                    SELECT word_id FROM learning_history
                    WHERE user_id = ? AND status = 'learned'
                )
                ORDER BY (level_score + frequency_score + theme_score) DESC, w.rank ASC
                LIMIT ?
            `;

            db.all(sql, [i, i + 1500, i + 1500, i + 3000, i, req.user.id, ...themeParams, req.user.id, limit], (err, words) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(words);
            });
        });
    });
});

// Mark word as learned
app.post('/api/learn/record', authenticate, (req, res) => {
    const { word_id, status } = req.body;
    db.run("INSERT INTO learning_history (user_id, word_id, status) VALUES (?, ?, ?)", [req.user.id, word_id, status || 'learned'], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        if (status === 'learned') {
            db.get("SELECT word FROM words WHERE id = ?", [word_id], (e2, w) => {
                if (w) {
                    createNotification(req.user.id, 'review_reminder', '新单词已掌握', `你已掌握单词 "${w.word}"，记得及时复习哦！`, `单词 "${w.word}" 已加入你的已掌握列表，建议在24小时内进行复习以巩固记忆。`);
                }
            });

            db.get("SELECT COUNT(*) as cnt FROM learning_history WHERE user_id = ? AND status = 'learned'", [req.user.id], (e2, row) => {
                if (row) {
                    const cnt = row.cnt;
                    const milestones = [10, 50, 100, 200, 500, 1000];
                    if (milestones.includes(cnt)) {
                        createNotification(req.user.id, 'goal_achievement', '学习目标达成！', `恭喜！你已累计掌握 ${cnt} 个单词！`, `你的词汇学习取得了重大进展，已累计掌握 ${cnt} 个单词。继续加油！`);
                    }
                }
            });
        }

        res.json({ success: true });
    });
});

// Statistics
app.get('/api/stats', authenticate, (req, res) => {
    const sql = `
        SELECT lh.*, w.word, w.definition, w.pronunciation 
        FROM learning_history lh
        JOIN words w ON lh.word_id = w.id
        WHERE lh.user_id = ?
        ORDER BY lh.updated_at DESC
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ learned_count: rows.length, history: rows });
    });
});

// Study Plan - 获取用户学习计划列表
app.get('/api/study-plan', authenticate, (req, res) => {
    const sql = `
        SELECT sp.id as plan_id, sp.added_at, w.*
        FROM study_plan sp
        JOIN words w ON sp.word_id = w.id
        WHERE sp.user_id = ?
        ORDER BY sp.added_at DESC
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: rows.length, words: rows });
    });
});

// Study Plan - 添加单词到学习计划
app.post('/api/study-plan', authenticate, (req, res) => {
    const { word_id } = req.body;
    if (!word_id) return res.status(400).json({ error: '缺少 word_id 参数' });

    db.run("INSERT OR IGNORE INTO study_plan (user_id, word_id) VALUES (?, ?)", 
        [req.user.id, word_id], 
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, added: this.changes > 0 });
        }
    );
});

// Study Plan - 从学习计划移除单词
app.delete('/api/study-plan/:wordId', authenticate, (req, res) => {
    const wordId = req.params.wordId;
    db.run("DELETE FROM study_plan WHERE user_id = ? AND word_id = ?", 
        [req.user.id, wordId], 
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, removed: this.changes > 0 });
        }
    );
});

// Study Plan - 检查单词是否在学习计划中
app.get('/api/study-plan/check/:wordId', authenticate, (req, res) => {
    const wordId = req.params.wordId;
    db.get("SELECT id FROM study_plan WHERE user_id = ? AND word_id = ?", 
        [req.user.id, wordId], 
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ in_plan: !!row });
        }
    );
});

// Word Browsing - 分页获取单词列表（支持筛选和排序）
app.get('/api/words', authenticate, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const difficultyLevels = req.query.levels ? req.query.levels.split(',').map(Number) : null;
    const sortBy = req.query.sortBy || 'difficulty'; // 'difficulty' | 'frequency'
    const sortOrder = req.query.sortOrder || 'asc'; // 'asc' | 'desc'

    const offset = (page - 1) * pageSize;

    let whereClause = '';
    let params = [];

    if (difficultyLevels && difficultyLevels.length > 0) {
        const placeholders = difficultyLevels.map(() => '?').join(',');
        whereClause = `WHERE difficulty_level IN (${placeholders})`;
        params = difficultyLevels;
    }

    const validSortColumns = ['difficulty', 'frequency', 'rank'];
    const sortColumn = validSortColumns.includes(sortBy) 
        ? (sortBy === 'difficulty' ? 'difficulty_level' : sortBy)
        : 'difficulty_level';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const countSql = `SELECT COUNT(*) as total FROM words ${whereClause}`;
    const dataSql = `
        SELECT w.*, 
               EXISTS(SELECT 1 FROM study_plan sp WHERE sp.user_id = ? AND sp.word_id = w.id) as in_study_plan
        FROM words w
        ${whereClause}
        ORDER BY ${sortColumn} ${order}, w.rank ASC
        LIMIT ? OFFSET ?
    `;

    db.get(countSql, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countResult.total;

        const dataParams = [req.user.id, ...params, pageSize, offset];
        db.all(dataSql, dataParams, (err, words) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                words,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            });
        });
    });
});

// Get all difficulty levels info
app.get('/api/difficulty-levels', authenticate, (req, res) => {
    const levels = [
        { level: 1, name: '基础', description: '日常简单词汇' },
        { level: 2, name: '初级', description: '入门常用词汇' },
        { level: 3, name: '中级', description: '进阶常用词汇' },
        { level: 4, name: '中高级', description: '较难进阶词汇' },
        { level: 5, name: '高级', description: '高难度词汇' },
        { level: 6, name: '专业', description: '专业学术词汇' }
    ];
    res.json(levels);
});

// Spelling Challenge - Get questions for a new game
app.get('/api/spelling-challenge/questions', authenticate, (req, res) => {
    const count = parseInt(req.query.count) || 10;

    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const vocabSize = user.vocab_size || 3000;

        // Determine difficulty range based on user's vocab size
        // Select words around user's level (±20% range) to keep it challenging but not too hard
        const minRank = Math.max(100, Math.floor(vocabSize * 0.6));
        const maxRank = Math.min(10000, Math.ceil(vocabSize * 1.4));

        const sql = `
            SELECT w.*
            FROM words w
            WHERE w.rank BETWEEN ? AND ?
            AND w.id NOT IN (
                SELECT word_id FROM spelling_challenge_history
                WHERE user_id = ? AND created_at > datetime('now', '-24 hours')
            )
            ORDER BY ABS(w.rank - ?) ASC, RANDOM()
            LIMIT ?
        `;

        db.all(sql, [minRank, maxRank, req.user.id, vocabSize, count], (err, words) => {
            if (err) return res.status(500).json({ error: err.message });

            // If not enough words in range, fallback to any words
            if (words.length < count) {
                const fallbackSql = `
                    SELECT w.*
                    FROM words w
                    WHERE w.id NOT IN (
                        SELECT word_id FROM spelling_challenge_history
                        WHERE user_id = ? AND created_at > datetime('now', '-24 hours')
                    )
                    ORDER BY RANDOM()
                    LIMIT ?
                `;
                db.all(fallbackSql, [req.user.id, count], (err, fallbackWords) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const sessionId = `spelling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    res.json({
                        sessionId,
                        words: fallbackWords.map(w => ({
                            id: w.id,
                            word: w.word,
                            pronunciation: w.pronunciation,
                            definition: w.definition,
                            pos: w.pos,
                            rank: w.rank,
                            difficulty_level: w.difficulty_level
                        }))
                    });
                });
                return;
            }

            const sessionId = `spelling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            res.json({
                sessionId,
                words: words.map(w => ({
                    id: w.id,
                    word: w.word,
                    pronunciation: w.pronunciation,
                    definition: w.definition,
                    pos: w.pos,
                    rank: w.rank,
                    difficulty_level: w.difficulty_level
                }))
            });
        });
    });
});

// Spelling Challenge - Submit answer for a single question
app.post('/api/spelling-challenge/answer', authenticate, (req, res) => {
    const { sessionId, wordId, userAnswer, isCorrect, timeSpent } = req.body;

    if (!sessionId || !wordId) {
        return res.status(400).json({ error: "缺少必要参数" });
    }

    const correct = isCorrect ? 1 : 0;
    const time = timeSpent || 0;

    db.run(
        "INSERT INTO spelling_challenge_history (user_id, session_id, word_id, user_answer, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, sessionId, wordId, userAnswer || '', correct, time],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Spelling Challenge - Submit complete game result
app.post('/api/spelling-challenge/complete', authenticate, (req, res) => {
    const { sessionId, totalQuestions, correctCount, totalTime, answers } = req.body;

    if (!sessionId || totalQuestions === undefined || correctCount === undefined) {
        return res.status(400).json({ error: "缺少必要参数" });
    }

    const score = Math.round((correctCount / totalQuestions) * 1000);
    const accuracy = Math.round((correctCount / totalQuestions) * 100);

    if (accuracy === 100) {
        createNotification(req.user.id, 'achievement_unlock', '拼写挑战满分！', `恭喜！你在拼写挑战中获得了满分 ${score} 分！`, `你在本次拼写挑战中全部拼写正确，获得了 ${score} 分的满分成绩！`);
    } else if (accuracy >= 80) {
        createNotification(req.user.id, 'achievement_unlock', '拼写挑战优秀！', `你在拼写挑战中获得了 ${score} 分，正确率 ${accuracy}%`, `本次拼写挑战你答对了 ${correctCount}/${totalQuestions} 题，得分 ${score} 分，正确率 ${accuracy}%。`);
    }

    db.run(
        "INSERT INTO spelling_challenge_sessions (user_id, session_id, total_questions, correct_count, total_time, score) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, sessionId, totalQuestions, correctCount, totalTime || 0, score],
        function (err) {
            if (err) {
                // If UNIQUE constraint failed, update existing record
                if (err.message.includes('UNIQUE')) {
                    db.run(
                        "UPDATE spelling_challenge_sessions SET total_questions = ?, correct_count = ?, total_time = ?, score = ? WHERE session_id = ? AND user_id = ?",
                        [totalQuestions, correctCount, totalTime || 0, score, sessionId, req.user.id],
                        (updateErr) => {
                            if (updateErr) return res.status(500).json({ error: updateErr.message });
                            res.json({ success: true, sessionId, score, correctCount, totalQuestions });
                        }
                    );
                    return;
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, sessionId, score, correctCount, totalQuestions });
        }
    );
});

// Spelling Challenge - Get user's challenge history
app.get('/api/spelling-challenge/history', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const sql = `
        SELECT scs.*,
               (SELECT COUNT(*) FROM spelling_challenge_sessions WHERE user_id = ?) as total_games,
               (SELECT AVG(score) FROM spelling_challenge_sessions WHERE user_id = ?) as avg_score
        FROM spelling_challenge_sessions scs
        WHERE scs.user_id = ?
        ORDER BY scs.created_at DESC
        LIMIT ?
    `;

    db.all(sql, [req.user.id, req.user.id, req.user.id, limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            history: rows,
            totalGames: rows[0]?.total_games || 0,
            avgScore: rows[0]?.avg_score ? Math.round(rows[0].avg_score) : 0
        });
    });
});

// ========== Listening Practice (听力辨词) API ==========

// Helper: Find distractor words with same POS and similar definition/rank
const findDistractors = (db, targetWord, vocabSize, excludeIds, count, callback) => {
    const samePosSql = `
        SELECT w.*
        FROM words w
        WHERE w.pos = ?
          AND w.id != ?
          AND w.id NOT IN (${excludeIds.length > 0 ? excludeIds.join(',') : '0'})
        ORDER BY ABS(w.rank - ?) ASC, RANDOM()
        LIMIT ?
    `;

    db.all(samePosSql, [targetWord.pos, targetWord.id, targetWord.rank, count], (err, samePosWords) => {
        if (err) return callback(err, null);

        if (samePosWords.length >= count) {
            return callback(null, samePosWords.slice(0, count));
        }

        const needed = count - samePosWords.length;
        const existingIds = [...excludeIds, targetWord.id, ...samePosWords.map(w => w.id)];

        const fallbackSql = `
            SELECT w.*
            FROM words w
            WHERE w.id NOT IN (${existingIds.join(',')})
            ORDER BY ABS(w.rank - ?) ASC, RANDOM()
            LIMIT ?
        `;

        db.all(fallbackSql, [targetWord.rank, needed], (err2, fallbackWords) => {
            if (err2) return callback(err2, null);
            callback(null, [...samePosWords, ...fallbackWords]);
        });
    });
};

// Listening Practice - Generate questions for a new round
app.get('/api/listening-practice/questions', authenticate, (req, res) => {
    const mode = req.query.mode === 'challenge' ? 'challenge' : 'consolidate';
    const count = parseInt(req.query.count) || 5;

    db.get("SELECT vocab_size FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.status(404).json({ error: "用户未找到" });

        const vocabSize = user.vocab_size || 3000;

        let targetWordsSql;
        let targetParams = [];

        if (mode === 'consolidate') {
            // 巩固模式：从已掌握词汇中选取
            targetWordsSql = `
                SELECT w.*
                FROM words w
                JOIN learning_history lh ON lh.word_id = w.id
                WHERE lh.user_id = ? AND lh.status = 'learned'
                  AND w.id NOT IN (
                    SELECT word_id FROM listening_practice_history
                    WHERE user_id = ? AND created_at > datetime('now', '-24 hours')
                  )
                ORDER BY RANDOM()
                LIMIT ?
            `;
            targetParams = [req.user.id, req.user.id, count];
        } else {
            // 挑战模式：选取接近用户词汇量上限的新词
            const minRank = Math.max(100, Math.floor(vocabSize * 0.85));
            const maxRank = Math.min(10000, Math.ceil(vocabSize * 1.3));
            targetWordsSql = `
                SELECT w.*
                FROM words w
                WHERE w.rank BETWEEN ? AND ?
                  AND w.id NOT IN (
                    SELECT word_id FROM learning_history
                    WHERE user_id = ? AND status = 'learned'
                  )
                  AND w.id NOT IN (
                    SELECT word_id FROM listening_practice_history
                    WHERE user_id = ? AND created_at > datetime('now', '-24 hours')
                  )
                ORDER BY ABS(w.rank - ?) ASC, RANDOM()
                LIMIT ?
            `;
            targetParams = [minRank, maxRank, req.user.id, req.user.id, vocabSize, count];
        }

        db.all(targetWordsSql, targetParams, (err, targetWords) => {
            if (err) return res.status(500).json({ error: err.message });

            if (targetWords.length < count) {
                // Fallback: if not enough words, pick any words
                const fallbackSql = `
                    SELECT w.*
                    FROM words w
                    WHERE w.id NOT IN (
                        SELECT word_id FROM listening_practice_history
                        WHERE user_id = ? AND created_at > datetime('now', '-24 hours')
                    )
                    ORDER BY RANDOM()
                    LIMIT ?
                `;
                db.all(fallbackSql, [req.user.id, count], (err2, fallbackWords) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    buildQuestions(req.user.id, fallbackWords, count, mode, res);
                });
                return;
            }

            buildQuestions(req.user.id, targetWords, count, mode, res);
        });
    });
});

// Helper: Build question objects with options
const buildQuestions = (userId, targetWords, count, mode, res) => {
    const sessionId = `listening_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const questions = [];
    const usedWordIds = targetWords.map(w => w.id);

    let processed = 0;

    targetWords.forEach((targetWord, idx) => {
        findDistractors(db, targetWord, 3000, usedWordIds, 3, (err, distractors) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Shuffle options
            const allOptions = [
                { id: targetWord.id, word: targetWord.word, pronunciation: targetWord.pronunciation, pos: targetWord.pos, definition: targetWord.definition, is_correct: true },
                ...distractors.map(d => ({ id: d.id, word: d.word, pronunciation: d.pronunciation, pos: d.pos, definition: d.definition, is_correct: false }))
            ];

            // Fisher-Yates shuffle
            for (let i = allOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
            }

            // Track correct option index after shuffle
            const correctOptionIndex = allOptions.findIndex(o => o.is_correct);

            questions.push({
                question_index: idx,
                target_word_id: targetWord.id,
                target_word: targetWord.word,
                target_pronunciation: targetWord.pronunciation,
                target_pos: targetWord.pos,
                target_definition: targetWord.definition,
                correct_option_index: correctOptionIndex,
                options: allOptions.map((o, i) => ({
                    option_index: i,
                    word_id: o.id,
                    word: o.word,
                    pronunciation: o.pronunciation,
                    pos: o.pos,
                    definition: o.definition
                }))
            });

            processed++;

            if (processed === targetWords.length) {
                // Sort by question_index to maintain order
                questions.sort((a, b) => a.question_index - b.question_index);
                res.json({
                    sessionId,
                    mode,
                    total_questions: questions.length,
                    questions
                });
            }
        });
    });
};

// Listening Practice - Submit answer for a single question
app.post('/api/listening-practice/answer', authenticate, (req, res) => {
    const { sessionId, wordId, selectedOptionIndex, isCorrect, timeSpent } = req.body;

    if (!sessionId || wordId === undefined || selectedOptionIndex === undefined) {
        return res.status(400).json({ error: "缺少必要参数" });
    }

    const correct = isCorrect ? 1 : 0;
    const time = timeSpent || 0;

    db.run(
        "INSERT INTO listening_practice_history (user_id, session_id, word_id, selected_option_id, is_correct, time_spent) VALUES (?, ?, ?, ?, ?, ?)",
        [req.user.id, sessionId, wordId, selectedOptionIndex, correct, time],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Listening Practice - Submit complete round result
app.post('/api/listening-practice/complete', authenticate, (req, res) => {
    const { sessionId, mode, totalQuestions, correctCount, totalTime, avgReactionTime, maxStreak, answers } = req.body;

    if (!sessionId || totalQuestions === undefined || correctCount === undefined) {
        return res.status(400).json({ error: "缺少必要参数" });
    }

    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const score = correctCount * 100 + maxStreak * 20;

    if (accuracy === 100) {
        createNotification(req.user.id, 'achievement_unlock', '听力辨词满分！', `恭喜！你在听力辨词（${mode === 'challenge' ? '挑战模式' : '巩固模式'}）中获得了满分！`, `你在本轮听力辨词练习中全部答对，最高连对 ${maxStreak} 题，得分 ${score} 分！`);
    } else if (accuracy >= 80) {
        createNotification(req.user.id, 'achievement_unlock', '听力辨词优秀！', `你在听力辨词中获得 ${accuracy}% 正确率`, `本次听力辨词你答对了 ${correctCount}/${totalQuestions} 题，最高连对 ${maxStreak} 题，平均反应时间 ${avgReactionTime || 0}秒，得分 ${score} 分。`);
    }

    db.run(
        "INSERT INTO listening_practice_sessions (user_id, session_id, mode, total_questions, correct_count, total_time, avg_reaction_time, max_streak, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [req.user.id, sessionId, mode, totalQuestions, correctCount, totalTime || 0, avgReactionTime || 0, maxStreak || 0, score],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    db.run(
                        "UPDATE listening_practice_sessions SET total_questions = ?, correct_count = ?, total_time = ?, avg_reaction_time = ?, max_streak = ?, score = ? WHERE session_id = ? AND user_id = ?",
                        [totalQuestions, correctCount, totalTime || 0, avgReactionTime || 0, maxStreak || 0, score, sessionId, req.user.id],
                        (updateErr) => {
                            if (updateErr) return res.status(500).json({ error: updateErr.message });
                            res.json({ success: true, sessionId, score, correctCount, totalQuestions, accuracy });
                        }
                    );
                    return;
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, sessionId, score, correctCount, totalQuestions, accuracy });
        }
    );
});

// Listening Practice - Get user's practice history
app.get('/api/listening-practice/history', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const sql = `
        SELECT lps.*,
               (SELECT COUNT(*) FROM listening_practice_sessions WHERE user_id = ?) as total_sessions,
               (SELECT AVG(score) FROM listening_practice_sessions WHERE user_id = ?) as avg_score
        FROM listening_practice_sessions lps
        WHERE lps.user_id = ?
        ORDER BY lps.created_at DESC
        LIMIT ?
    `;

    db.all(sql, [req.user.id, req.user.id, req.user.id, limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            history: rows,
            totalSessions: rows[0]?.total_sessions || 0,
            avgScore: rows[0]?.avg_score ? Math.round(rows[0].avg_score) : 0
        });
    });
});


app.get('/api/themes', authenticate, (req, res) => {
    const themeIds = req.query.ids ? req.query.ids.split(',').map(Number) : null;

    let sql = `
        SELECT t.*,
               COUNT(DISTINCT wt.word_id) as word_count,
               COUNT(DISTINCT CASE WHEN lh.status = 'learned' THEN wt.word_id END) as mastered_count
        FROM themes t
        LEFT JOIN word_themes wt ON wt.theme_id = t.id
        LEFT JOIN learning_history lh ON lh.word_id = wt.word_id AND lh.user_id = ?
        GROUP BY t.id
        ORDER BY t.id ASC
    `;

    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (themeIds) {
            rows = rows.filter(r => themeIds.includes(r.id));
        }

        res.json(rows.map(r => ({
            id: r.id,
            key: r.key,
            name: r.name,
            icon: r.icon,
            color: r.color,
            word_count: r.word_count,
            mastered_count: r.mastered_count
        })));
    });
});

app.get('/api/themes/words', authenticate, (req, res) => {
    const themeIds = req.query.themes ? req.query.themes.split(',').map(Number) : [];
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    if (themeIds.length === 0) {
        return res.json({ words: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
    }

    const placeholders = themeIds.map(() => '?').join(',');

    const havingClause = themeIds.length > 1
        ? `HAVING COUNT(DISTINCT wt.theme_id) >= 1`
        : '';

    const countSql = `
        SELECT COUNT(*) as total FROM (
            SELECT w.id
            FROM words w
            JOIN word_themes wt ON wt.word_id = w.id
            WHERE wt.theme_id IN (${placeholders})
            GROUP BY w.id
            ${havingClause}
        )
    `;

    const dataSql = `
        SELECT w.*,
               EXISTS(SELECT 1 FROM study_plan sp WHERE sp.user_id = ? AND sp.word_id = w.id) as in_study_plan,
               GROUP_CONCAT(DISTINCT t.name) as theme_names,
               GROUP_CONCAT(DISTINCT t.key) as theme_keys
        FROM words w
        JOIN word_themes wt ON wt.word_id = w.id
        JOIN themes t ON t.id = wt.theme_id
        WHERE wt.theme_id IN (${placeholders})
        GROUP BY w.id
        ${havingClause}
        ORDER BY w.frequency DESC, w.rank ASC
        LIMIT ? OFFSET ?
    `;

    const countParams = [...themeIds];
    const dataParams = [req.user.id, ...themeIds, pageSize, offset];

    db.get(countSql, countParams, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countResult.total;

        db.all(dataSql, dataParams, (err, words) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                words: words.map(w => ({
                    ...w,
                    theme_names: w.theme_names ? w.theme_names.split(',') : [],
                    theme_keys: w.theme_keys ? w.theme_keys.split(',') : []
                })),
                pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
            });
        });
    });
});

app.get('/api/themes/preferences', authenticate, (req, res) => {
    const sql = `
        SELECT t.*, utp.created_at
        FROM user_theme_preferences utp
        JOIN themes t ON t.id = utp.theme_id
        WHERE utp.user_id = ?
        ORDER BY utp.created_at ASC
    `;

    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/themes/preferences', authenticate, (req, res) => {
    const { themeIds } = req.body;

    if (!Array.isArray(themeIds) || themeIds.length > 2) {
        return res.status(400).json({ error: '最多只能选择2个主题方向' });
    }

    db.run("DELETE FROM user_theme_preferences WHERE user_id = ?", [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        if (themeIds.length === 0) {
            return res.json({ success: true, themes: [] });
        }

        const stmt = db.prepare("INSERT INTO user_theme_preferences (user_id, theme_id) VALUES (?, ?)");
        themeIds.forEach(tid => {
            stmt.run(req.user.id, tid);
        });
        stmt.finalize();

        const sql = `
            SELECT t.* FROM themes t
            WHERE t.id IN (${themeIds.map(() => '?').join(',')})
        `;
        db.all(sql, themeIds, (err, themes) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, themes });
        });
    });
});

app.get('/api/leaderboard', authenticate, (req, res) => {
    const period = req.query.period === 'month' ? 'month' : 'week';

    const timeCondition = period === 'month'
        ? "lh.updated_at >= datetime('now', '-1 month')"
        : "lh.updated_at >= datetime('now', '-7 days')";

    const leaderboardSql = `
        SELECT u.id, u.username, u.vocab_size,
               COUNT(lh.id) as mastered_count,
               RANK() OVER (ORDER BY COUNT(lh.id) DESC) as rank
        FROM users u
        LEFT JOIN learning_history lh ON lh.user_id = u.id AND lh.status = 'learned' AND ${timeCondition}
        GROUP BY u.id
        ORDER BY mastered_count DESC, u.vocab_size DESC
        LIMIT 20
    `;

    db.all(leaderboardSql, (err, leaderboard) => {
        if (err) return res.status(500).json({ error: err.message });

        const inTop20 = leaderboard.some(row => row.id === req.user.id);

        if (inTop20) {
            return res.json({ period, leaderboard, currentUser: null });
        }

        const currentUserSql = `
            SELECT u.id, u.username, u.vocab_size,
                   COUNT(lh.id) as mastered_count,
                   (SELECT COUNT(*) + 1 FROM (
                       SELECT COUNT(lh2.id) as cnt
                       FROM users u2
                       LEFT JOIN learning_history lh2 ON lh2.user_id = u2.id AND lh2.status = 'learned' AND ${timeCondition}
                       GROUP BY u2.id
                       HAVING cnt > 0
                   ) sub) as rank
            FROM users u
            LEFT JOIN learning_history lh ON lh.user_id = u.id AND lh.status = 'learned' AND ${timeCondition}
            WHERE u.id = ?
            GROUP BY u.id
        `;

        db.get(currentUserSql, [req.user.id], (err2, currentUser) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ period, leaderboard, currentUser });
        });
    });
});


app.get('/api/notifications', authenticate, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const type = req.query.type || null;
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    let dataSql = 'SELECT * FROM notifications WHERE user_id = ?';
    let countParams = [req.user.id];
    let dataParams = [req.user.id];

    if (type) {
        countSql += ' AND type = ?';
        dataSql += ' AND type = ?';
        countParams.push(type);
        dataParams.push(type);
    }

    dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    dataParams.push(pageSize, offset);

    db.get(countSql, countParams, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = countResult.total;

        db.all(dataSql, dataParams, (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                notifications: rows,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            });
        });
    });
});

app.get('/api/notifications/unread-count', authenticate, (req, res) => {
    db.get(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        [req.user.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ count: row.count });
        }
    );
});

app.put('/api/notifications/:id/read', authenticate, (req, res) => {
    db.run(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes > 0 });
        }
    );
});

app.put('/api/notifications/read-all', authenticate, (req, res) => {
    db.run(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
        [req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes });
        }
    );
});

app.put('/api/notifications/read-type/:type', authenticate, (req, res) => {
    db.run(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = ? AND is_read = 0",
        [req.user.id, req.params.type],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes });
        }
    );
});

app.delete('/api/notifications/:id', authenticate, (req, res) => {
    db.run(
        "DELETE FROM notifications WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, deleted: this.changes > 0 });
        }
    );
});

app.post('/api/notifications', authenticate, (req, res) => {
    const { type, title, summary, detail } = req.body;
    if (!type || !title || !summary) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    db.run(
        "INSERT INTO notifications (user_id, type, title, summary, detail) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, type, title, summary, detail || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ========== Vocabulary Notebook (生词本) API ==========

// 获取生词本列表（支持搜索和排序）
app.get('/api/vocabulary-notebook', authenticate, (req, res) => {
    const keyword = req.query.keyword ? `%${req.query.keyword}%` : null;
    const sortBy = req.query.sortBy === 'difficulty' ? 'difficulty_level' : 'added_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    let whereClause = 'WHERE vn.user_id = ?';
    let params = [req.user.id];

    if (keyword) {
        whereClause += ` AND (w.word LIKE ? OR w.definition LIKE ?)`;
        params.push(keyword, keyword);
    }

    const countSql = `
        SELECT COUNT(*) as total
        FROM vocabulary_notebook vn
        JOIN words w ON vn.word_id = w.id
        ${whereClause}
    `;

    const dataSql = `
        SELECT vn.id as notebook_id, vn.added_at, vn.personal_note,
               w.id as word_id, w.word, w.pronunciation, w.pos, w.definition, w.example, w.rank, w.frequency, w.difficulty_level,
               EXISTS(SELECT 1 FROM learning_history lh WHERE lh.user_id = vn.user_id AND lh.word_id = w.id AND lh.status = 'learned') as is_mastered,
               EXISTS(SELECT 1 FROM learning_history lh WHERE lh.user_id = vn.user_id AND lh.word_id = w.id AND lh.status = 'skipped') as is_skipped
        FROM vocabulary_notebook vn
        JOIN words w ON vn.word_id = w.id
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
    `;

    db.get(countSql, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(dataSql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Get weekly added count
            db.get(`
                SELECT COUNT(*) as weekly_added
                FROM vocabulary_notebook
                WHERE user_id = ? AND added_at >= datetime('now', '-7 days')
            `, [req.user.id], (err2, weeklyResult) => {
                if (err2) return res.status(500).json({ error: err2.message });

                res.json({
                    total: countResult.total,
                    weekly_added: weeklyResult.weekly_added,
                    words: rows
                });
            });
        });
    });
});

// 获取生词本数量（用于主页角标）
app.get('/api/vocabulary-notebook/count', authenticate, (req, res) => {
    db.get(
        "SELECT COUNT(*) as count FROM vocabulary_notebook WHERE user_id = ?",
        [req.user.id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ count: row.count });
        }
    );
});

// 检查单词是否在生词本中
app.get('/api/vocabulary-notebook/check/:wordId', authenticate, (req, res) => {
    const wordId = parseInt(req.params.wordId);
    db.get(
        "SELECT id FROM vocabulary_notebook WHERE user_id = ? AND word_id = ?",
        [req.user.id, wordId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ in_notebook: !!row });
        }
    );
});

// 添加单词到生词本
app.post('/api/vocabulary-notebook', authenticate, (req, res) => {
    const { word_id } = req.body;
    if (!word_id) return res.status(400).json({ error: '缺少 word_id 参数' });

    db.run("INSERT OR IGNORE INTO vocabulary_notebook (user_id, word_id) VALUES (?, ?)",
        [req.user.id, word_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const added = this.changes > 0;
            if (added) {
                db.get("SELECT word FROM words WHERE id = ?", [word_id], (e2, w) => {
                    if (w) {
                        createNotification(req.user.id, 'notebook_add', '加入生词本', `单词 "${w.word}" 已加入生词本`, `单词 "${w.word}" 已成功添加到你的生词本，你可以在生词本页面进行反复回顾。`);
                    }
                });
            }
            res.json({ success: true, added });
        }
    );
});

// 从生词本移除单个单词
app.delete('/api/vocabulary-notebook/:wordId', authenticate, (req, res) => {
    const wordId = parseInt(req.params.wordId);
    db.run("DELETE FROM vocabulary_notebook WHERE user_id = ? AND word_id = ?",
        [req.user.id, wordId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, removed: this.changes > 0 });
        }
    );
});

// 批量移除生词本中的单词
app.post('/api/vocabulary-notebook/batch-remove', authenticate, (req, res) => {
    const { word_ids } = req.body;
    if (!Array.isArray(word_ids) || word_ids.length === 0) {
        return res.status(400).json({ error: '请选择要移除的单词' });
    }

    const placeholders = word_ids.map(() => '?').join(',');
    const params = [req.user.id, ...word_ids];

    db.run(`DELETE FROM vocabulary_notebook WHERE user_id = ? AND word_id IN (${placeholders})`,
        params,
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, removed_count: this.changes });
        }
    );
});

// 更新个人备注
app.put('/api/vocabulary-notebook/:wordId/note', authenticate, (req, res) => {
    const wordId = parseInt(req.params.wordId);
    const { personal_note } = req.body;
    if (personal_note === undefined) {
        return res.status(400).json({ error: '缺少 personal_note 参数' });
    }

    db.run("UPDATE vocabulary_notebook SET personal_note = ? WHERE user_id = ? AND word_id = ?",
        [personal_note, req.user.id, wordId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes > 0 });
        }
    );
});

// 标记单词为已掌握（同时从生词本移出并加入学习记录）
app.post('/api/vocabulary-notebook/:wordId/master', authenticate, (req, res) => {
    const wordId = parseInt(req.params.wordId);

    db.serialize(() => {
        // 1. 加入学习记录
        const stmt1 = db.prepare("INSERT OR IGNORE INTO learning_history (user_id, word_id, status) VALUES (?, ?, 'learned')");
        stmt1.run(req.user.id, wordId);
        stmt1.finalize();

        // 2. 从生词本移除
        const stmt2 = db.prepare("DELETE FROM vocabulary_notebook WHERE user_id = ? AND word_id = ?");
        stmt2.run(req.user.id, wordId, function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // 3. 发送通知
            db.get("SELECT word FROM words WHERE id = ?", [wordId], (e2, w) => {
                if (w) {
                    createNotification(req.user.id, 'mastered_from_notebook', '生词已掌握', `恭喜！单词 "${w.word}" 已掌握并从生词本移除`, `你已成功掌握单词 "${w.word}"，它已从生词本中移除并计入学习记录。继续加油！`);
                }
            });

            // 4. 检查里程碑
            db.get("SELECT COUNT(*) as cnt FROM learning_history WHERE user_id = ? AND status = 'learned'", [req.user.id], (e2, row) => {
                if (row) {
                    const cnt = row.cnt;
                    const milestones = [10, 50, 100, 200, 500, 1000];
                    if (milestones.includes(cnt)) {
                        createNotification(req.user.id, 'goal_achievement', '学习目标达成！', `恭喜！你已累计掌握 ${cnt} 个单词！`, `你的词汇学习取得了重大进展，已累计掌握 ${cnt} 个单词。继续加油！`);
                    }
                }
                res.json({ success: true, mastered: true });
            });
        });
        stmt2.finalize();
    });
});


// ========== Synonym Compare (近义词对比) API ==========

app.get('/api/synonym/search', authenticate, (req, res) => {
    const keyword = (req.query.keyword || '').trim().toLowerCase();
    if (!keyword) return res.status(400).json({ error: '请输入搜索关键词' });

    db.get("SELECT * FROM words WHERE LOWER(word) = ?", [keyword], (err, targetWord) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!targetWord) return res.json({ found: false, keyword });

        db.get(`
            SELECT sg.id as group_id, sg.name as group_name, sg.description as group_description
            FROM synonym_group_members sgm
            JOIN synonym_groups sg ON sg.id = sgm.group_id
            WHERE sgm.word_id = ?
            LIMIT 1
        `, [targetWord.id], (err2, groupRow) => {
            if (err2) return res.status(500).json({ error: err2.message });

            if (groupRow) {
                db.all(`
                    SELECT sgm.usage_diff, w.*
                    FROM synonym_group_members sgm
                    JOIN words w ON w.id = sgm.word_id
                    WHERE sgm.group_id = ?
                    ORDER BY w.id
                `, [groupRow.group_id], (err3, members) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({
                        found: true,
                        keyword,
                        targetWord: {
                            id: targetWord.id,
                            word: targetWord.word,
                            pronunciation: targetWord.pronunciation,
                            pos: targetWord.pos,
                            definition: targetWord.definition
                        },
                        group: {
                            id: groupRow.group_id,
                            name: groupRow.group_name,
                            description: groupRow.group_description,
                            members: members.map(m => ({
                                id: m.id,
                                word: m.word,
                                pronunciation: m.pronunciation,
                                pos: m.pos,
                                definition: m.definition,
                                example: m.example,
                                rank: m.rank,
                                frequency: m.frequency,
                                difficulty_level: m.difficulty_level,
                                usage_diff: m.usage_diff
                            }))
                        }
                    });
                });
                return;
            }

            const defKeywords = targetWord.definition.split(/[，,、；;]\s*/).filter(d => d.length > 0);
            let whereClause = 'WHERE w.id != ? AND (';
            const params = [targetWord.id];
            const conditions = [];

            if (targetWord.pos) {
                conditions.push('w.pos = ?');
                params.push(targetWord.pos);
            }

            defKeywords.forEach(dk => {
                if (dk.length >= 2) {
                    conditions.push('w.definition LIKE ?');
                    params.push(`%${dk}%`);
                }
            });

            if (conditions.length > 0) {
                whereClause += conditions.join(' OR ') + ')';
            } else {
                whereClause += '1=0)';
            }

            whereClause += ` AND ABS(w.rank - ?) < 2000`;
            params.push(targetWord.rank);

            const similarSql = `
                SELECT w.*,
                    CASE
                        WHEN w.pos = ? THEN 20 ELSE 0
                    END as pos_score,
                    (SELECT COUNT(*) FROM synonym_group_members sgm2 WHERE sgm2.word_id = w.id) as in_group
                FROM words w
                ${whereClause}
                ORDER BY pos_score DESC, ABS(w.rank - ?) ASC
                LIMIT 3
            `;
            params.push(targetWord.pos, targetWord.rank);

            db.all(similarSql, params, (err3, similarWords) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({
                    found: true,
                    keyword,
                    targetWord: {
                        id: targetWord.id,
                        word: targetWord.word,
                        pronunciation: targetWord.pronunciation,
                        pos: targetWord.pos,
                        definition: targetWord.definition
                    },
                    group: null,
                    similarWords: similarWords.map(w => ({
                        id: w.id,
                        word: w.word,
                        pronunciation: w.pronunciation,
                        pos: w.pos,
                        definition: w.definition,
                        example: w.example,
                        rank: w.rank,
                        frequency: w.frequency,
                        difficulty_level: w.difficulty_level,
                        usage_diff: null
                    }))
                });
            });
        });
    });
});

app.get('/api/synonym/groups', authenticate, (req, res) => {
    const sql = `
        SELECT sg.id, sg.name, sg.description,
               COUNT(sgm.id) as member_count
        FROM synonym_groups sg
        LEFT JOIN synonym_group_members sgm ON sgm.group_id = sg.id
        GROUP BY sg.id
        ORDER BY sg.id
    `;

    db.all(sql, [], (err, groups) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ groups });
    });
});

app.get('/api/synonym/groups/:groupId', authenticate, (req, res) => {
    const groupId = parseInt(req.params.groupId);

    db.get("SELECT * FROM synonym_groups WHERE id = ?", [groupId], (err, group) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!group) return res.status(404).json({ error: '词组未找到' });

        db.all(`
            SELECT sgm.usage_diff, w.*
            FROM synonym_group_members sgm
            JOIN words w ON w.id = sgm.word_id
            WHERE sgm.group_id = ?
            ORDER BY w.rank
        `, [groupId], (err2, members) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                id: group.id,
                name: group.name,
                description: group.description,
                members: members.map(m => ({
                    id: m.id,
                    word: m.word,
                    pronunciation: m.pronunciation,
                    pos: m.pos,
                    definition: m.definition,
                    example: m.example,
                    rank: m.rank,
                    frequency: m.frequency,
                    difficulty_level: m.difficulty_level,
                    usage_diff: m.usage_diff
                }))
            });
        });
    });
});

app.get('/api/synonym/confusable-pairs', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    db.all("SELECT * FROM confusable_pairs ORDER BY RANDOM() LIMIT ?", [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pairs: rows });
    });
});

app.get('/api/synonym/search-history', authenticate, (req, res) => {
    db.all(`
        SELECT DISTINCT keyword, MAX(searched_at) as last_searched
        FROM synonym_search_history
        WHERE user_id = ?
        GROUP BY keyword
        ORDER BY last_searched DESC
        LIMIT 5
    `, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ history: rows.map(r => r.keyword) });
    });
});

app.post('/api/synonym/search-history', authenticate, (req, res) => {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: '缺少关键词' });

    db.run(
        "INSERT INTO synonym_search_history (user_id, keyword) VALUES (?, ?)",
        [req.user.id, keyword.trim().toLowerCase()],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.post('/api/synonym/add-group-to-plan', authenticate, (req, res) => {
    const { word_ids } = req.body;
    if (!Array.isArray(word_ids) || word_ids.length === 0) {
        return res.status(400).json({ error: '请选择要加入的单词' });
    }

    const stmt = db.prepare("INSERT OR IGNORE INTO study_plan (user_id, word_id) VALUES (?, ?)");
    let addedCount = 0;

    word_ids.forEach(wid => {
        stmt.run(req.user.id, wid, function(err) {
            if (!err && this.changes > 0) addedCount++;
        });
    });
    stmt.finalize(() => {
        res.json({ success: true, added_count: addedCount });
    });
});

app.get('/api/synonym/hot-groups', authenticate, (req, res) => {
    const limit = parseInt(req.query.limit) || 5;

    db.all(`
        SELECT sg.id, sg.name, sg.description,
               COUNT(sgm.id) as member_count
        FROM synonym_groups sg
        LEFT JOIN synonym_group_members sgm ON sgm.group_id = sg.id
        GROUP BY sg.id
        ORDER BY RANDOM()
        LIMIT ?
    `, [limit], (err, groups) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ groups });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
