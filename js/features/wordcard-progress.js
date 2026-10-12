/* ============================================================
 * wordcard-progress.js - 字卡学习进度【终极版 v4】
 * ============================================================
 * v4 新增：
 *   ✅ 点击曲线柱子 → 查看当天学了什么
 *   ✅ 展开分类 → 显示"已学 / 未学"两组
 *   ✅ 学习速率趋势（近3天 vs 前4天）
 * 保留：
 *   ✅ 学习曲线图（7天柱状）
 *   ✅ 分类点击展开
 *   ✅ 原自动学习逻辑
 *   ✅ 14 个真实数据源 + 智能缓存
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisWordcardProgress_v1';
    const CACHE_TTL = 30 * 1000;

    let data = {
        learned: [],
        lastMsgCount: 0,
        history: [],
        lastAutoLearnDate: null,
        lastAutoLearnTs: 0
    };

    let _loaded = false;
    let _statsCache = { ts: 0, result: null };

    // ========== 基础工具 ==========
    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
        _loaded = true;
    }
    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }

    function getAllReplies() {
        try {
            return (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(function (t) { return t && String(t).trim(); })
                : [];
        } catch (e) { return []; }
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function dateKeyOf(ts) {
        const d = new Date(ts);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function safeJSONParse(str, fallback) {
        try { return JSON.parse(str) || fallback; } catch (e) { return fallback; }
    }

    function calcPct(learned, total) {
        if (total <= 0) return 0;
        return Math.min(100, Math.round(learned / total * 100));
    }

    function fingerprint(str) {
        return String(str || '').slice(0, 60);
    }

    // ========== 标记一张已学 ==========
    function markLearned(text, silent) {
        if (!text) return false;
        const trimmed = String(text).trim();
        if (!trimmed) return false;
        if (data.learned.indexOf(trimmed) !== -1) return false;
        data.learned.push(trimmed);
        data.history.unshift({ text: trimmed, ts: Date.now() });
        data.history = data.history.slice(0, 100);
        _statsCache.ts = 0;
        persist();
        if (!silent && typeof showNotification === 'function') {
            showNotification('📚 ' + getPartnerName() + ' 学会了新字卡', 'success', 1800);
        }
        return true;
    }

    // ========== 他自主学习 ==========
    function autoLearnOne(silent) {
        const allReplies = getAllReplies();
        if (!allReplies.length) return false;
        const unlearned = allReplies.filter(function (t) { return data.learned.indexOf(t) === -1; });
        if (!unlearned.length) return false;
        const pick = unlearned[Math.floor(Math.random() * unlearned.length)];
        return markLearned(pick, silent);
    }

    async function autoLearnDaily() {
        const today = todayStr();
        if (data.lastAutoLearnDate === today) return;

        const count = 1 + Math.floor(Math.random() * 3);
        const allReplies = getAllReplies();
        if (!allReplies.length) return;
        let learnedToday = 0;
        for (let i = 0; i < count; i++) {
            if (autoLearnOne(true)) learnedToday++;
        }
        data.lastAutoLearnDate = today;
        data.lastAutoLearnTs = Date.now();
        persist();

        if (learnedToday > 0 && typeof showNotification === 'function') {
            const pn = getPartnerName();
            setTimeout(function () {
                showNotification('📚 ' + pn + ' 今天又学了 ' + learnedToday + ' 张字卡', 'info', 2500);
            }, 3000 + Math.random() * 4000);
        }
    }

    function autoLearnHourly() {
        const now = Date.now();
        if (now - data.lastAutoLearnTs < 1.5 * 3600000) return;
        if (Math.random() > 0.20) return;
        if (autoLearnOne(true)) {
            data.lastAutoLearnTs = now;
            persist();
        }
    }

    function scanMessages() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            const total = messages.length;
            if (total <= data.lastMsgCount) {
                if (total < data.lastMsgCount) data.lastMsgCount = total;
                return;
            }
            const newMsgs = messages.slice(Math.max(0, total - 5));
            data.lastMsgCount = total;

            const allReplies = getAllReplies();
            if (allReplies.length === 0) return;

            newMsgs.forEach(function (m) {
                if (!m || m.sender !== 'user' || !m.text) return;
                const text = String(m.text).trim();
                const hit = allReplies.find(function (r) {
                    const rt = String(r).trim();
                    return rt === text || text.indexOf(rt) !== -1 || rt.indexOf(text) !== -1;
                });
                if (hit) markLearned(hit, true);
            });
        } catch (e) {}
    }

    // ========== 分类元数据 ==========
    const CATEGORY_META = {
        wordcard:  { name: '字卡',       icon: '📇', color: '#8b6fd4', detailType: 'text'  },
        sticker:   { name: '表情包',     icon: '🎨', color: '#e67e22', detailType: 'image' },
        mySticker: { name: '我的表情',   icon: '🖼️', color: '#3498db', detailType: 'image' },
        emoji:     { name: 'Emoji',      icon: '😊', color: '#f1c40f', detailType: 'text'  },
        moments:   { name: '朋友圈',     icon: '💬', color: '#2ecc71', detailType: 'info'  },
        envelope:  { name: '信件',       icon: '✉️', color: '#9b59b6', detailType: 'info'  },
        poke:      { name: '拍一拍',     icon: '📝', color: '#e74c3c', detailType: 'text'  },
        status:    { name: '对方状态',   icon: '🌙', color: '#34495e', detailType: 'text'  },
        motto:     { name: '顶部格言',   icon: '💭', color: '#16a085', detailType: 'text'  },
        intro:     { name: '开场动画',   icon: '🎬', color: '#f39c12', detailType: 'text'  },
        mood:      { name: '心晴手账',   icon: '📖', color: '#e91e63', detailType: 'info'  },
        pinyin:    { name: '拼音字卡',   icon: '🔤', color: '#795548', detailType: 'text'  },
        emotion:   { name: '情绪字卡',   icon: '✨', color: '#ff6b6b', detailType: 'info'  },
        mix:       { name: '混搭连发',   icon: '🌈', color: '#00bcd4', detailType: 'info'  }
    };

    function makeCat(key, learned, total, learnedItems, allItems) {
        const meta = CATEGORY_META[key];
        return {
            key: key,
            name: meta.name,
            icon: meta.icon,
            color: meta.color,
            detailType: meta.detailType,
            learned: learned,
            total: total,
            pct: calcPct(learned, total),
            learnedItems: learnedItems || [],
            allItems: allItems || []     // ★ 新增：完整条目列表（用于"未学"）
        };
    }

    // ========== 核心统计 ==========
    function computeStats() {
        const now = Date.now();
        if (_statsCache.result && (now - _statsCache.ts) < CACHE_TTL) {
            return _statsCache.result;
        }

        const categories = [];
        const learnedSet = new Set(data.learned);

        const allMsgs = (typeof messages !== 'undefined' && Array.isArray(messages)) ? messages : [];
        const partnerMsgs = allMsgs.filter(function (m) {
            return m && m.sender && m.sender !== 'user' &&
                   m.type !== 'system' && m.type !== 'call-event';
        });
        const totalPartnerMsgCount = Math.max(1, partnerMsgs.length);

        // 1. 字卡
        try {
            const allReplies = getAllReplies();
            if (allReplies.length > 0) {
                const learnedItems = allReplies.filter(function (t) { return learnedSet.has(t); });
                categories.push(makeCat('wordcard', learnedItems.length, allReplies.length, learnedItems, allReplies));
            }
        } catch (e) {}

        // 2. 对方表情包
        try {
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary) && stickerLibrary.length > 0) {
                const total = stickerLibrary.length;
                const usedSet = new Set();
                const fpIndex = new Map();
                stickerLibrary.forEach(function (s) {
                    if (s) fpIndex.set(fingerprint(s), s);
                });
                allMsgs.forEach(function (m) {
                    if (!m || !m.image) return;
                    const fp = fingerprint(m.image);
                    if (fpIndex.has(fp)) usedSet.add(fpIndex.get(fp));
                });
                const learnedItems = Array.from(usedSet);
                categories.push(makeCat('sticker', learnedItems.length, total, learnedItems, stickerLibrary));
            }
        } catch (e) {}

        // 3. 我的表情
        try {
            if (typeof myStickerLibrary !== 'undefined' && Array.isArray(myStickerLibrary) && myStickerLibrary.length > 0) {
                const total = myStickerLibrary.length;
                const usedSet = new Set();
                const fpIndex = new Map();
                myStickerLibrary.forEach(function (s) {
                    if (s) fpIndex.set(fingerprint(s), s);
                });
                allMsgs.forEach(function (m) {
                    if (!m || !m.image) return;
                    const fp = fingerprint(m.image);
                    if (fpIndex.has(fp)) usedSet.add(fpIndex.get(fp));
                });
                const learnedItems = Array.from(usedSet);
                categories.push(makeCat('mySticker', learnedItems.length, total, learnedItems, myStickerLibrary));
            }
        } catch (e) {}

        // 4. Emoji
        try {
            if (typeof customEmojis !== 'undefined' && Array.isArray(customEmojis) && customEmojis.length > 0) {
                const total = customEmojis.length;
                const usedSet = new Set();
                allMsgs.forEach(function (m) {
                    if (!m || !m.text) return;
                    const t = String(m.text);
                    customEmojis.forEach(function (e) {
                        if (e && t.indexOf(e) !== -1) usedSet.add(e);
                    });
                });
                const learnedItems = Array.from(usedSet);
                categories.push(makeCat('emoji', learnedItems.length, total, learnedItems, customEmojis));
            }
        } catch (e) {}

        // 5. 朋友圈
        try {
            let postCount = 0;
            try {
                const raw = localStorage.getItem(getStorageKey('momentsData_v1'));
                if (raw) {
                    const parsed = safeJSONParse(raw, { posts: [] });
                    if (parsed && Array.isArray(parsed.posts)) postCount = parsed.posts.length;
                }
            } catch (e) {}
            if (typeof window.momentsData !== 'undefined' &&
                window.momentsData.posts && Array.isArray(window.momentsData.posts)) {
                postCount = Math.max(postCount, window.momentsData.posts.length);
            }
            if (postCount > 0) {
                categories.push(makeCat('moments', postCount, postCount + 10, [], []));
            }
        } catch (e) {}

        // 6. 信件
        try {
            let outboxCount = 0;
            try {
                const raw = localStorage.getItem(getStorageKey('envelopeData'));
                if (raw) {
                    const parsed = safeJSONParse(raw, { outbox: [] });
                    if (parsed && Array.isArray(parsed.outbox)) outboxCount = parsed.outbox.length;
                }
            } catch (e) {}
            if (typeof envelopeData !== 'undefined' &&
                envelopeData.outbox && Array.isArray(envelopeData.outbox)) {
                outboxCount = Math.max(outboxCount, envelopeData.outbox.length);
            }
            if (outboxCount > 0) {
                categories.push(makeCat('envelope', outboxCount, outboxCount + 5, [], []));
            }
        } catch (e) {}

        // 7~10. 拍一拍 / 状态 / 格言 / 开场
        const textLibs = [
            { key: 'poke',   list: (typeof customPokes    !== 'undefined' && Array.isArray(customPokes))    ? customPokes    : [] },
            { key: 'status', list: (typeof customStatuses !== 'undefined' && Array.isArray(customStatuses)) ? customStatuses : [] },
            { key: 'motto',  list: (typeof customMottos   !== 'undefined' && Array.isArray(customMottos))   ? customMottos   : [] },
            { key: 'intro',  list: (typeof customIntros   !== 'undefined' && Array.isArray(customIntros))   ? customIntros   : [] }
        ];
        textLibs.forEach(function (lib) {
            try {
                if (lib.list.length === 0) return;
                const total = lib.list.length;
                const usedSet = new Set();
                allMsgs.forEach(function (m) {
                    if (!m || !m.text) return;
                    const t = String(m.text);
                    lib.list.forEach(function (item) {
                        if (item && t.indexOf(item) !== -1) usedSet.add(item);
                    });
                });
                const learnedItems = Array.from(usedSet);
                categories.push(makeCat(lib.key, learnedItems.length, total, learnedItems, lib.list));
            } catch (e) {}
        });

        // 11. 心晴手账
        try {
            let moodCount = 0;
            try {
                const raw = localStorage.getItem(getStorageKey('moodCalendar'));
                if (raw) {
                    const parsed = safeJSONParse(raw, {});
                    if (parsed && typeof parsed === 'object') {
                        moodCount = Object.keys(parsed).filter(function (k) {
                            return parsed[k] && (parsed[k].user || parsed[k].partner);
                        }).length;
                    }
                }
            } catch (e) {}
            if (typeof window.moodData !== 'undefined' && typeof window.moodData === 'object') {
                const localCount = Object.keys(window.moodData).filter(function (k) {
                    const v = window.moodData[k];
                    return v && (v.user || v.partner);
                }).length;
                moodCount = Math.max(moodCount, localCount);
            }
            if (moodCount > 0) {
                categories.push(makeCat('mood', moodCount, 30, [], []));
            }
        } catch (e) {}

        // 12. 拼音字卡
        try {
            const allReplies = getAllReplies();
            const total = Math.max(1, allReplies.length);
            const pinyinLearned = data.history.length;
            if (pinyinLearned > 0) {
                const learnedItems = data.history.slice(0, 30).map(function (h) { return h.text; });
                categories.push(makeCat('pinyin', pinyinLearned, total, learnedItems, allReplies));
            }
        } catch (e) {}

        // 13. 情绪字卡
        try {
            const EMOTION_WORDS = [
                '开心','难过','想你','委屈','心疼','哭','笑','害怕','紧张',
                '幸福','生气','焦虑','孤单','喜欢','讨厌','爱','恨','烦','累',
                '思念','担心','期待','失落','烦躁','寂寞','感动','甜','苦'
            ];
            let emotionCount = 0;
            partnerMsgs.forEach(function (m) {
                if (!m || !m.text) return;
                const t = String(m.text);
                if (EMOTION_WORDS.some(function (w) { return t.indexOf(w) !== -1; })) emotionCount++;
            });
            if (emotionCount > 0) {
                categories.push(makeCat('emotion', emotionCount, totalPartnerMsgCount, [], []));
            }
        } catch (e) {}

        // 14. 混搭连发
        try {
            let mixCount = 0;
            partnerMsgs.forEach(function (m) {
                if (!m || !m.text) return;
                const t = String(m.text);
                const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t);
                const cleanText = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
                if (hasEmoji && cleanText.length > 0) mixCount++;
            });
            if (mixCount > 0) {
                categories.push(makeCat('mix', mixCount, totalPartnerMsgCount, [], []));
            }
        } catch (e) {}

        // 综合
        let totalLearned = 0;
        let totalAll = 0;
        categories.forEach(function (c) {
            totalLearned += c.learned;
            totalAll += c.total;
        });
        const overallPct = totalAll > 0 ? Math.round(totalLearned / totalAll * 100) : 0;

        const result = { categories, overallLearned: totalLearned, overallTotal: totalAll, overallPct };
        _statsCache.ts = now;
        _statsCache.result = result;
        return result;
    }

    // ========== 每日学习记录（含当天具体学了什么） ==========
    function getDailyLearnData(days) {
        days = days || 7;
        const result = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = dateKeyOf(d);
            const items = data.history.filter(function (h) {
                return dateKeyOf(h.ts) === key;
            });
            result.push({
                key: key,
                label: (d.getMonth() + 1) + '/' + d.getDate(),
                weekday: ['日','一','二','三','四','五','六'][d.getDay()],
                count: items.length,
                items: items,
                isToday: i === 0
            });
        }
        return result;
    }

    // ========== ★ 学习速率趋势 ==========
    function getLearnTrend() {
        const daily = getDailyLearnData(7);
        // 近 3 天（今天+昨天+前天）
        const recent3 = daily.slice(-3).reduce(function (a, b) { return a + b.count; }, 0);
        // 前 4 天
        const earlier4 = daily.slice(0, 4).reduce(function (a, b) { return a + b.count; }, 0);

        // 日均
        const avgRecent = recent3 / 3;
        const avgEarlier = earlier4 / 4;

        let text = '';
        let trendColor = '#8b6fd4';
        let trendIcon = '📊';

        if (recent3 === 0 && earlier4 === 0) {
            text = '还没有学习记录';
            trendColor = 'var(--text-secondary)';
            trendIcon = '💤';
        } else if (avgRecent > avgEarlier * 1.2) {
            text = '最近加速了，比之前更勤快';
            trendColor = '#2ecc71';
            trendIcon = '📈';
        } else if (avgRecent < avgEarlier * 0.8 && avgRecent > 0) {
            text = '最近稍微慢了一点';
            trendColor = '#e6a23c';
            trendIcon = '📉';
        } else if (avgRecent === 0) {
            text = '最近 3 天没学了';
            trendColor = '#e67e22';
            trendIcon = '😴';
        } else {
            text = '学习节奏很稳定';
            trendColor = '#8b6fd4';
            trendIcon = '✨';
        }

        return {
            recent3: recent3,
            earlier4: earlier4,
            avgRecent: Math.round(avgRecent * 10) / 10,
            avgEarlier: Math.round(avgEarlier * 10) / 10,
            text: text,
            color: trendColor,
            icon: trendIcon
        };
    }

    // ========== ★ 学习曲线 HTML（柱子可点） ==========
    function buildLearnCurveHTML(dailyData) {
        const maxCount = Math.max(1, Math.max.apply(null, dailyData.map(function (d) { return d.count; })));
        const totalWeek = dailyData.reduce(function (a, b) { return a + b.count; }, 0);
        const todayCount = dailyData[dailyData.length - 1].count;
        const trend = getLearnTrend();

        const barsHTML = dailyData.map(function (d, idx) {
            const h = d.count > 0 ? Math.max(4, Math.round(d.count / maxCount * 60)) : 2;
            const barColor = d.isToday
                ? 'linear-gradient(180deg,#9d7fe0,#8b6fd4)'
                : 'linear-gradient(180deg,rgba(157,127,224,0.55),rgba(139,111,212,0.75))';
            return '<div class="wcp-bar-col" data-day-idx="' + idx + '" style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;cursor:' + (d.count > 0 ? 'pointer' : 'default') + ';padding:2px 0;border-radius:6px;transition:background 0.2s;">'
                +   '<div style="font-size:9px;color:' + (d.count > 0 ? '#8b6fd4' : 'transparent') + ';font-weight:700;margin-bottom:2px;height:12px;line-height:12px;">'
                +     (d.count > 0 ? d.count : '·')
                +   '</div>'
                +   '<div style="width:60%;max-width:22px;height:64px;background:rgba(139,111,212,0.06);border-radius:4px;display:flex;align-items:flex-end;overflow:hidden;">'
                +     '<div style="width:100%;height:' + h + 'px;background:' + barColor + ';border-radius:4px;transition:height 0.5s ease;"></div>'
                +   '</div>'
                +   '<div style="font-size:9px;color:' + (d.isToday ? '#8b6fd4' : 'var(--text-secondary)') + ';margin-top:4px;font-weight:' + (d.isToday ? '700' : '400') + ';">'
                +     d.label
                +   '</div>'
                + '</div>';
        }).join('');

        return '<div style="background:var(--primary-bg);border-radius:14px;padding:14px 12px 10px;margin-bottom:14px;border:1px solid var(--border-color);flex-shrink:0;">'

            // 标题 + 统计
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 4px;">'
            +     '<span style="font-size:12px;font-weight:700;color:var(--text-primary);">📈 最近 7 天学习曲线</span>'
            +     '<span style="font-size:11px;color:var(--text-secondary);">'
            +       '今日 <b style="color:#8b6fd4;">+' + todayCount + '</b> · 共 <b style="color:#8b6fd4;">' + totalWeek + '</b>'
            +     '</span>'
            +   '</div>'

            // 趋势横幅
            +   '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:10px;background:rgba(139,111,212,0.06);border-radius:10px;border:1px dashed rgba(139,111,212,0.2);">'
            +     '<span style="font-size:14px;">' + trend.icon + '</span>'
            +     '<div style="flex:1;min-width:0;">'
            +       '<div style="font-size:11.5px;font-weight:600;color:' + trend.color + ';">' + trend.text + '</div>'
            +       '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">'
            +         '近 3 天日均 <b>' + trend.avgRecent + '</b> 张 · 前 4 天日均 <b>' + trend.avgEarlier + '</b> 张'
            +       '</div>'
            +     '</div>'
            +   '</div>'

            // 柱子
            +   '<div style="display:flex;align-items:flex-end;gap:4px;padding:0 4px;">'
            +     barsHTML
            +   '</div>'

            // 点击提示
            +   '<div style="text-align:center;font-size:10px;color:var(--text-secondary);opacity:0.6;margin-top:6px;">'
            +     '点击柱子查看当天学习内容'
            +   '</div>'

            + '</div>';
    }

    // ========== ★ 点击柱子 → 弹出当天学了什么 ==========
    function showDayLearnPopup(dayData) {
        const old = document.getElementById('wcp-day-popup');
        if (old) old.remove();

        const itemsHTML = dayData.items.length === 0
            ? '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:12px;opacity:0.7;">这天没有学习记录</div>'
            : dayData.items.slice(0, 30).map(function (h, i) {
                const time = new Date(h.ts);
                const timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
                return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--primary-bg);border-radius:8px;margin-bottom:5px;">'
                    +   '<span style="font-size:10px;color:var(--text-secondary);flex-shrink:0;font-family:monospace;padding-top:2px;">' + timeStr + '</span>'
                    +   '<span style="flex:1;font-size:12px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + esc(String(h.text).slice(0, 200)) + '</span>'
                    + '</div>';
            }).join('');

        const moreText = dayData.items.length > 30
            ? '<div style="text-align:center;font-size:10px;color:var(--text-secondary);padding:6px;">还有 ' + (dayData.items.length - 30) + ' 条未显示</div>'
            : '';

        const popup = document.createElement('div');
        popup.id = 'wcp-day-popup';
        popup.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:wcpFade 0.2s ease;';

        popup.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:20px;width:88%;max-width:360px;max-height:75vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.5);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div>'
            +       '<div style="font-size:15px;font-weight:700;color:var(--text-primary);">'
            +         '📅 ' + dayData.label + ' 星期' + dayData.weekday
            +         (dayData.isToday ? '<span style="font-size:10px;color:#8b6fd4;margin-left:6px;font-weight:600;">今天</span>' : '')
            +       '</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">'
            +         '共学会 <b style="color:#8b6fd4;">' + dayData.count + '</b> 张'
            +       '</div>'
            +     '</div>'
            +     '<button id="wcp-day-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;padding-right:4px;">'
            +     itemsHTML + moreText
            +   '</div>'
            + '</div>';

        document.body.appendChild(popup);

        const close = function () { popup.remove(); };
        popup.querySelector('#wcp-day-close').onclick = close;
        popup.addEventListener('click', function (e) { if (e.target === popup) close(); });
    }

    // ========== ★ 分类详情（已学 / 未学两组） ==========
    function buildCategoryDetailHTML(cat) {
        // 计数型 / 无条目型 → 只显示说明
        if (cat.detailType === 'info' || cat.allItems.length === 0) {
            let infoText = '';
            if (cat.key === 'moments')       infoText = '你一共发过 ' + cat.learned + ' 条动态';
            else if (cat.key === 'envelope') infoText = '你一共寄出过 ' + cat.learned + ' 封信';
            else if (cat.key === 'mood')     infoText = '你一共记录了 ' + cat.learned + ' 天心情';
            else if (cat.key === 'emotion')  infoText = '对方发过 ' + cat.learned + ' 条含情绪词的消息';
            else if (cat.key === 'mix')      infoText = '对方发过 ' + cat.learned + ' 条 emoji + 文字混搭消息';
            else infoText = '暂无可展开的条目';

            return '<div style="padding:10px 12px;background:var(--primary-bg);border-radius:10px;font-size:11.5px;color:var(--text-secondary);line-height:1.7;">'
                +   'ℹ️ ' + infoText
                + '</div>';
        }

        // 计算未学条目
        const learnedSet = new Set(cat.learnedItems);
        const unlearnedItems = cat.allItems.filter(function (item) {
            return !learnedSet.has(item);
        });

        // 已学分组
        const learnedHTML = cat.learnedItems.length === 0
            ? '<div style="text-align:center;padding:12px;color:var(--text-secondary);font-size:11px;opacity:0.6;">还没有已学内容</div>'
            : cat.detailType === 'image'
                ? buildImageGridHTML(cat.learnedItems, 30, '#8b6fd4')
                : buildTextListHTML(cat.learnedItems, 30, '已学');

        // 未学分组
        const unlearnedHTML = unlearnedItems.length === 0
            ? '<div style="text-align:center;padding:12px;color:#2ecc71;font-size:11px;font-weight:600;">🎉 全部学会了！</div>'
            : cat.detailType === 'image'
                ? buildImageGridHTML(unlearnedItems, 30, '#c8c8c8')
                : buildTextListHTML(unlearnedItems, 30, '未学');

        return '<div style="margin-bottom:4px;">'

            // 已学分组
            +   '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">'
            +     '<span style="width:8px;height:8px;border-radius:50%;background:#8b6fd4;"></span>'
            +     '<span style="font-size:11px;font-weight:700;color:#8b6fd4;">已学 (' + cat.learnedItems.length + ')</span>'
            +   '</div>'
            +   learnedHTML

            // 未学分组
            +   '<div style="display:flex;align-items:center;gap:6px;margin:14px 0 8px;">'
            +     '<span style="width:8px;height:8px;border-radius:50%;background:#c8c8c8;"></span>'
            +     '<span style="font-size:11px;font-weight:700;color:var(--text-secondary);">未学 (' + unlearnedItems.length + ')</span>'
            +   '</div>'
            +   unlearnedHTML

            + '</div>';
    }

    function buildTextListHTML(items, limit, _tag) {
        const shown = items.slice(0, limit);
        const more = items.length > limit
            ? '<div style="text-align:center;font-size:10px;color:var(--text-secondary);padding:6px;">还有 ' + (items.length - limit) + ' 条未显示</div>'
            : '';
        return '<div>'
            + shown.map(function (t) {
                return '<div style="padding:6px 10px;background:var(--secondary-bg);border-radius:8px;font-size:12px;color:var(--text-primary);line-height:1.5;word-break:break-word;margin-bottom:4px;">'
                    +   esc(String(t).slice(0, 200))
                    + '</div>';
            }).join('')
            + more
            + '</div>';
    }

    function buildImageGridHTML(items, limit, _accentColor) {
        const shown = items.slice(0, limit);
        const more = items.length > limit
            ? '<div style="grid-column:1/-1;text-align:center;font-size:10px;color:var(--text-secondary);padding:6px;">还有 ' + (items.length - limit) + ' 张未显示</div>'
            : '';
        return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">'
            + shown.map(function (url) {
                return '<div style="aspect-ratio:1/1;border-radius:7px;overflow:hidden;background:var(--secondary-bg);">'
                    +   '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">'
                    + '</div>';
            }).join('')
            + more
            + '</div>';
    }

    // ========== 分类卡片 HTML ==========
    function buildCategoryHTML(categories) {
        if (categories.length === 0) {
            return '<div style="text-align:center;padding:36px 12px;color:var(--text-secondary);font-size:13px;opacity:0.75;line-height:1.8;">'
                + '<div style="font-size:36px;margin-bottom:12px;opacity:0.4;">📚</div>'
                + '还没有任何学习内容<br>'
                + '<span style="font-size:11px;opacity:0.6;">先去「自定义回复」加几张字卡吧</span>'
                + '</div>';
        }

        return categories.map(function (cat) {
            const pct = cat.pct;
            const difficulty = Math.max(10, 100 - pct);
            const canExpand = cat.allItems.length > 0;

            return '<div class="wcp-cat" data-cat-key="' + cat.key + '" style="margin-bottom:6px;background:var(--primary-bg);border-radius:12px;border:1px solid var(--border-color);overflow:hidden;">'

                +   '<div class="wcp-cat-header" style="padding:12px 14px 10px;cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;">'
                +     '<span style="font-size:14px;font-weight:700;color:var(--text-primary);">'
                +       cat.icon + ' ' + esc(cat.name)
                +       '<span style="font-size:10px;font-weight:400;color:var(--text-secondary);margin-left:6px;">'
                +         cat.learned + '/' + cat.total
                +       '</span>'
                +     '</span>'
                +     '<div style="display:flex;align-items:center;gap:8px;">'
                +       '<span style="font-size:11px;color:var(--text-secondary);">'
                +         '熟练 <b style="color:#8b6fd4;">' + pct + '%</b>'
                +         ' &nbsp; 难度 <b style="color:#e6a23c;">' + difficulty + '%</b>'
                +       '</span>'
                +       (canExpand
                            ? '<span class="wcp-chevron" style="font-size:10px;color:var(--text-secondary);transition:transform 0.2s;display:inline-block;">▼</span>'
                            : '<span style="font-size:10px;color:var(--text-secondary);opacity:0.3;">·</span>')
                +     '</div>'
                +   '</div>'

                +   '<div style="padding:0 14px 12px;">'
                +     '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
                +       '<span style="font-size:10px;color:#8b6fd4;width:26px;flex-shrink:0;font-weight:600;">熟练</span>'
                +       '<div style="flex:1;height:6px;background:rgba(139,111,212,0.12);border-radius:4px;overflow:hidden;">'
                +         '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#9d7fe0,#8b6fd4);border-radius:4px;transition:width 0.6s ease;"></div>'
                +       '</div>'
                +     '</div>'
                +     '<div style="display:flex;align-items:center;gap:8px;">'
                +       '<span style="font-size:10px;color:#e6a23c;width:26px;flex-shrink:0;font-weight:600;">难度</span>'
                +       '<div style="flex:1;height:6px;background:rgba(230,162,60,0.12);border-radius:4px;overflow:hidden;">'
                +         '<div style="width:' + difficulty + '%;height:100%;background:linear-gradient(90deg,#f5c26b,#e67e22);border-radius:4px;transition:width 0.6s ease;"></div>'
                +       '</div>'
                +     '</div>'
                +   '</div>'

                +   '<div class="wcp-cat-detail" style="display:none;padding:0 14px 12px;border-top:1px dashed var(--border-color);margin-top:2px;padding-top:10px;">'
                +     buildCategoryDetailHTML(cat)
                +   '</div>'

                + '</div>';
        }).join('');
    }

    function getOverallStatus(pct) {
        if (pct >= 90) return { text: '非常熟练', color: '#2ecc71' };
        if (pct >= 60) return { text: '挺熟练的', color: '#8b6fd4' };
        if (pct >= 30) return { text: '在慢慢进步', color: '#e6a23c' };
        return { text: '还不顺手', color: '#e67e22' };
    }

    // ========== 打开面板 ==========
    window.openWordcardProgressPanel = async function () {
        await load();

        const old = document.getElementById('wcp-panel');
        if (old) old.remove();

        const pName = getPartnerName();
        const { categories, overallLearned, overallTotal, overallPct } = computeStats();
        const statusInfo = getOverallStatus(overallPct);
        const dailyData = getDailyLearnData(7);
        const categoryHTML = buildCategoryHTML(categories);
        const curveHTML = buildLearnCurveHTML(dailyData);

        const modal = document.createElement('div');
        modal.id = 'wcp-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:wcpFade 0.25s ease;';

        modal.innerHTML =
            '<style>'
            + '@keyframes wcpFade{from{opacity:0}to{opacity:1}}'
            + '@keyframes wcpPop{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}'
            + '.wcp-bar-col:hover{background:rgba(139,111,212,0.08);}'
            + '</style>'

            + '<div style="background:var(--secondary-bg);border-radius:24px;padding:20px 18px 16px;width:94%;max-width:420px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:wcpPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

            // 顶部标题
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:8px;">'
            +       '<span style="font-size:18px;">📊</span>'
            +       '<span style="font-size:16px;font-weight:800;color:var(--text-primary);">字卡学习进度</span>'
            +     '</div>'
            +     '<button id="wcp-reassess" style="padding:6px 12px;border:1px solid var(--border-color);border-radius:20px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">'
            +       '🔄 重新测评'
            +     '</button>'
            +   '</div>'

            // 图例
            +   '<div style="display:flex;gap:14px;margin-bottom:14px;flex-shrink:0;padding-left:2px;">'
            +     '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);">'
            +       '<span style="width:10px;height:10px;border-radius:3px;background:#8b6fd4;"></span>熟练度'
            +     '</span>'
            +     '<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);">'
            +       '<span style="width:10px;height:10px;border-radius:3px;background:#e6a23c;"></span>操控难度（越高越不方便）'
            +     '</span>'
            +   '</div>'

            // 综合熟练度大卡片
            +   '<div style="background:linear-gradient(135deg,rgba(139,111,212,0.12),rgba(230,162,60,0.06));border-radius:16px;padding:16px 18px;margin-bottom:14px;flex-shrink:0;border:1px solid rgba(139,111,212,0.15);">'
            +     '<div style="display:flex;align-items:center;justify-content:space-between;">'
            +       '<div style="display:flex;align-items:center;gap:10px;">'
            +         '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#9d7fe0,#8b6fd4);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(139,111,212,0.3);">🧠</div>'
            +         '<div>'
            +           '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:0.5px;">综合熟练度</div>'
            +           '<div style="font-size:22px;font-weight:900;color:#8b6fd4;font-family:Georgia,serif;line-height:1.1;">' + overallPct + '%</div>'
            +         '</div>'
            +       '</div>'
            +       '<div style="text-align:right;">'
            +         '<div style="font-size:11px;color:var(--text-secondary);">' + esc(pName) + '</div>'
            +         '<div style="font-size:13px;font-weight:700;color:' + statusInfo.color + ';">' + statusInfo.text + '</div>'
            +       '</div>'
            +     '</div>'
            +     '<div style="margin-top:10px;font-size:11px;color:var(--text-secondary);">已学习 ' + overallLearned + ' / ' + overallTotal + ' 项</div>'
            +   '</div>'

            // 学习曲线
            +   curveHTML

            // 分类列表
            +   '<div style="flex:1;overflow-y:auto;padding-right:4px;">'
            +     categoryHTML
            +   '</div>'

            // 底部按钮
            +   '<div style="display:flex;gap:8px;margin-top:12px;flex-shrink:0;">'
            +     '<button id="wcp-close-btn" style="flex:1;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">好的</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        // ---- 事件绑定 ----
        const close = function () { modal.remove(); };
        modal.querySelector('#wcp-close-btn').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        // 重新测评
        modal.querySelector('#wcp-reassess').onclick = function () {
            if (!confirm('确定要重新测评吗？他会重置学习进度，从零开始学。')) return;
            data.learned = [];
            data.history = [];
            data.lastMsgCount = 0;
            data.lastAutoLearnDate = null;
            data.lastAutoLearnTs = 0;
            _statsCache.ts = 0;
            _statsCache.result = null;
            persist();
            close();
            setTimeout(window.openWordcardProgressPanel, 100);
            if (typeof showNotification === 'function') {
                showNotification('已重新测评，进度归零', 'success');
            }
        };

        // ★ 曲线柱子点击
        modal.querySelectorAll('.wcp-bar-col').forEach(function (col) {
            col.onclick = function () {
                const idx = parseInt(col.dataset.dayIdx, 10);
                const dayData = dailyData[idx];
                if (!dayData) return;
                if (dayData.items.length === 0 && !dayData.isToday) return;
                showDayLearnPopup(dayData);
            };
        });

        // ★ 分类点击展开
        modal.querySelectorAll('.wcp-cat-header').forEach(function (header) {
            header.onclick = function () {
                const catEl = header.closest('.wcp-cat');
                const detail = catEl.querySelector('.wcp-cat-detail');
                const chevron = catEl.querySelector('.wcp-chevron');
                if (!detail) return;
                const isOpen = detail.style.display !== 'none';
                detail.style.display = isOpen ? 'none' : 'block';
                if (chevron) {
                    chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            };
        });
    };

    // ========== 初始化 ==========
    window.initWordcardProgress = init;

    async function init() {
        await load();
        try {
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                if (data.lastMsgCount === 0) data.lastMsgCount = messages.length;
            }
        } catch (e) {}

        setTimeout(autoLearnDaily, 8000);
        setInterval(autoLearnHourly, 15 * 60 * 1000);
        setInterval(scanMessages, 10000);
        setInterval(function () { _statsCache.ts = 0; }, 5 * 60 * 1000);

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                autoLearnDaily();
                _statsCache.ts = 0;
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[wordcard-progress] 字卡学习进度【终极版 v4】已加载 ✓');
})();