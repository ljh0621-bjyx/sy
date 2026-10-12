/* ============================================================
 * wordcard-progress.js - 字卡学习进度【终极版】
 * ============================================================
 * 特性：
 * 1. 完整复刻图里的双进度条（紫=熟练度 / 黄橙=操控难度）
 * 2. 接入 14 个真实数据源（字卡/表情/Emoji/朋友圈/信件/...）
 * 3. 精准统计，分母合理，避免"发一条就 100%"
 * 4. 保留原有自动学习逻辑（每天 1~3 张 + 每小时 20%）
 * 5. 智能缓存，长会话不卡
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisWordcardProgress_v1';
    const CACHE_KEY = 'wcp_stats_cache_v1';
    const CACHE_TTL = 30 * 1000; // 统计缓存 30 秒

    // ========== 数据结构 ==========
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
        _statsCache.ts = 0; // 让统计缓存失效
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

    // ========== 各分类定义（颜色+图标） ==========
    const CATEGORY_META = {
        wordcard:      { name: '字卡',       icon: '📇', color: '#8b6fd4' },
        sticker:       { name: '表情包',     icon: '🎨', color: '#e67e22' },
        mySticker:     { name: '我的表情',   icon: '🖼️', color: '#3498db' },
        emoji:         { name: 'Emoji',      icon: '😊', color: '#f1c40f' },
        moments:       { name: '朋友圈',     icon: '💬', color: '#2ecc71' },
        envelope:      { name: '信件',       icon: '✉️', color: '#9b59b6' },
        poke:          { name: '拍一拍',     icon: '📝', color: '#e74c3c' },
        status:        { name: '对方状态',   icon: '🌙', color: '#34495e' },
        motto:         { name: '顶部格言',   icon: '💭', color: '#16a085' },
        intro:         { name: '开场动画',   icon: '🎬', color: '#f39c12' },
        mood:          { name: '心晴手账',   icon: '📖', color: '#e91e63' },
        pinyin:        { name: '拼音字卡',   icon: '🔤', color: '#795548' },
        emotion:       { name: '情绪字卡',   icon: '✨', color: '#ff6b6b' },
        mix:           { name: '混搭连发',   icon: '🌈', color: '#00bcd4' }
    };

    // ========== 核心：统计所有分类 ==========
    function computeStats() {
        const now = Date.now();
        // 缓存命中
        if (_statsCache.result && (now - _statsCache.ts) < CACHE_TTL) {
            return _statsCache.result;
        }

        const categories = [];
        const learnedSet = new Set(data.learned);

        // 准备消息数据集
        const allMsgs = (typeof messages !== 'undefined' && Array.isArray(messages)) ? messages : [];
        const partnerMsgs = allMsgs.filter(function (m) {
            return m && m.sender && m.sender !== 'user' &&
                   m.type !== 'system' && m.type !== 'call-event';
        });
        const totalPartnerMsgCount = Math.max(1, partnerMsgs.length);

        // ---------- 1. 字卡 ----------
        try {
            const allReplies = getAllReplies();
            if (allReplies.length > 0) {
                const learnedCount = allReplies.filter(function (t) { return learnedSet.has(t); }).length;
                categories.push(makeCat('wordcard', learnedCount, allReplies.length));
            }
        } catch (e) {}

        // ---------- 2. 对方表情包（按实际发出算） ----------
        try {
            if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary) && stickerLibrary.length > 0) {
                const total = stickerLibrary.length;
                const usedSet = new Set();
                // 建指纹索引
                const fpIndex = new Map();
                stickerLibrary.forEach(function (s) {
                    if (s) fpIndex.set(fingerprint(s), s);
                });
                allMsgs.forEach(function (m) {
                    if (!m || !m.image) return;
                    const fp = fingerprint(m.image);
                    if (fpIndex.has(fp)) usedSet.add(fpIndex.get(fp));
                });
                categories.push(makeCat('sticker', usedSet.size, total));
            }
        } catch (e) {}

        // ---------- 3. 我的表情 ----------
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
                categories.push(makeCat('mySticker', usedSet.size, total));
            }
        } catch (e) {}

        // ---------- 4. Emoji ----------
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
                categories.push(makeCat('emoji', usedSet.size, total));
            }
        } catch (e) {}

        // ---------- 5. 朋友圈（分母 + 10） ----------
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
                categories.push(makeCat('moments', postCount, postCount + 10));
            }
        } catch (e) {}

        // ---------- 6. 信件（分母 + 5） ----------
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
                categories.push(makeCat('envelope', outboxCount, outboxCount + 5));
            }
        } catch (e) {}

        // ---------- 7~10. 拍一拍 / 状态 / 格言 / 开场 ----------
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
                categories.push(makeCat(lib.key, usedSet.size, total));
            } catch (e) {}
        });

        // ---------- 11. 心晴手账（分母 30 天） ----------
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
                categories.push(makeCat('mood', moodCount, 30));
            }
        } catch (e) {}

        // ---------- 12. 拼音字卡 ----------
        try {
            const allReplies = getAllReplies();
            const total = Math.max(1, allReplies.length);
            const pinyinLearned = data.history.length;
            if (pinyinLearned > 0) {
                categories.push(makeCat('pinyin', pinyinLearned, total));
            }
        } catch (e) {}

        // ---------- 13. 情绪字卡 ----------
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
                categories.push(makeCat('emotion', emotionCount, totalPartnerMsgCount));
            }
        } catch (e) {}

        // ---------- 14. 混搭连发 ----------
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
                categories.push(makeCat('mix', mixCount, totalPartnerMsgCount));
            }
        } catch (e) {}

        // 综合熟练度
        let totalLearned = 0;
        let totalAll = 0;
        categories.forEach(function (c) {
            totalLearned += c.learned;
            totalAll += c.total;
        });
        const overallPct = totalAll > 0 ? Math.round(totalLearned / totalAll * 100) : 0;

        const result = { categories, overallLearned: totalLearned, overallTotal: totalAll, overallPct };

        // 写缓存
        _statsCache.ts = now;
        _statsCache.result = result;
        return result;
    }

    function makeCat(key, learned, total) {
        const meta = CATEGORY_META[key];
        return {
            key: key,
            name: meta.name,
            icon: meta.icon,
            color: meta.color,
            learned: learned,
            total: total,
            pct: calcPct(learned, total)
        };
    }

    // ========== 渲染分类进度条 ==========
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
            return '<div style="margin-bottom:18px;">'

                +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
                +     '<span style="font-size:14px;font-weight:700;color:var(--text-primary);">'
                +       cat.icon + ' ' + esc(cat.name)
                +       '<span style="font-size:10px;font-weight:400;color:var(--text-secondary);margin-left:6px;">'
                +         cat.learned + '/' + cat.total
                +       '</span>'
                +     '</span>'
                +     '<span style="font-size:11px;color:var(--text-secondary);">'
                +       '熟练 <b style="color:#8b6fd4;">' + pct + '%</b>'
                +       ' &nbsp; 难度 <b style="color:#e6a23c;">' + difficulty + '%</b>'
                +     '</span>'
                +   '</div>'

                // 熟练度紫条
                +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
                +     '<span style="font-size:10px;color:#8b6fd4;width:26px;flex-shrink:0;font-weight:600;">熟练</span>'
                +     '<div style="flex:1;height:6px;background:rgba(139,111,212,0.12);border-radius:4px;overflow:hidden;">'
                +       '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#9d7fe0,#8b6fd4);border-radius:4px;transition:width 0.6s ease;"></div>'
                +     '</div>'
                +   '</div>'

                // 操控难度黄橙条
                +   '<div style="display:flex;align-items:center;gap:8px;">'
                +     '<span style="font-size:10px;color:#e6a23c;width:26px;flex-shrink:0;font-weight:600;">难度</span>'
                +     '<div style="flex:1;height:6px;background:rgba(230,162,60,0.12);border-radius:4px;overflow:hidden;">'
                +       '<div style="width:' + difficulty + '%;height:100%;background:linear-gradient(90deg,#f5c26b,#e67e22);border-radius:4px;transition:width 0.6s ease;"></div>'
                +     '</div>'
                +   '</div>'

                + '</div>';
        }).join('');
    }

    // ========== 综合状态文案 ==========
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
        const categoryHTML = buildCategoryHTML(categories);

        const modal = document.createElement('div');
        modal.id = 'wcp-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:wcpFade 0.25s ease;';

        modal.innerHTML =
            '<style>'
            + '@keyframes wcpFade{from{opacity:0}to{opacity:1}}'
            + '@keyframes wcpPop{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}'
            + '@keyframes wcpBarFill{from{width:0}}'
            + '</style>'

            + '<div style="background:var(--secondary-bg);border-radius:24px;padding:20px 18px 16px;width:94%;max-width:420px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:wcpPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

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
            +   '<div style="background:linear-gradient(135deg,rgba(139,111,212,0.12),rgba(230,162,60,0.06));border-radius:16px;padding:16px 18px;margin-bottom:16px;flex-shrink:0;border:1px solid rgba(139,111,212,0.15);">'
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

            // 分类进度列表
            +   '<div style="flex:1;overflow-y:auto;padding-right:4px;">'
            +     categoryHTML
            +   '</div>'

            // 底部按钮
            +   '<div style="display:flex;gap:8px;margin-top:12px;flex-shrink:0;">'
            +     '<button id="wcp-close-btn" style="flex:1;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">好的</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

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

        // 每 5 分钟让缓存失效一次（保证用户看到的是最新的）
        setInterval(function () { _statsCache.ts = 0; }, 5 * 60 * 1000);

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                autoLearnDaily();
                _statsCache.ts = 0; // 切回页面刷新统计
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[wordcard-progress] 字卡学习进度【终极版】已加载 ✓');
})();