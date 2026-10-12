/* ============================================================
 * remember.js - 他记得你说过
 * 捕捉你说的关键词，几天后他主动问起
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'remember_v1';

    // 关键词库：扫到这些词就记下来
    // { tags: 触发词, topic: 主题, question: 事后怎么问 }
    const PATTERNS = [
        { tags: ['睡不好', '失眠', '睡不着', '睡眠'],   topic: 'sleep',
          question: '这两天睡得怎么样？有没有好一点。' },
        { tags: ['腰疼', '腰酸', '肩疼', '脖子疼', '脖子酸'], topic: 'body',
          question: '腰/肩膀还好吗？还疼不疼？' },
        { tags: ['头疼', '头晕', '感冒', '发烧', '咳嗽'],  topic: 'sick',
          question: '身体好些了吗？记得多喝水。' },
        { tags: ['加班', '好忙', '好累', '累死', '忙死'], topic: 'work',
          question: '最近还在忙吗？别太累着自己。' },
        { tags: ['考试', '面试', '答辩', '报告'],        topic: 'stress',
          question: '那件事顺利吗？' },
        { tags: ['想吃', '想吃火锅', '想喝奶茶', '想吃辣', '想吃甜'], topic: 'food',
          question: '上次说想吃的那家，去过了吗？' },
        { tags: ['讨厌', '不喜欢', '烦死', '受不了'],     topic: 'dislike',
          question: '还遇到那件事了吗？希望你今天顺一点。' },
        { tags: ['喜欢', '最喜欢', '好爱', '超喜欢'],     topic: 'like',
          question: '上次你说喜欢的那件事，我记住了。' },
        { tags: ['下雨', '下雪', '好冷', '好热'],        topic: 'weather',
          question: '今天那边天气怎么样？' },
        { tags: ['难过', '不开心', '心情不好', '想哭'],    topic: 'mood',
          question: '心情好点了吗？我一直在。' },
        { tags: ['朋友', '同事', '室友', '老板'],        topic: 'people',
          question: '上次提到的那个朋友，最近怎么样？' },
        { tags: ['周末', '假期', '放假', '出去玩'],        topic: 'plan',
          question: '周末打算去哪儿玩？' }
    ];

    // 记忆保留多少天；问起的时间区间
    const KEEP_DAYS = 30;
    const MIN_ASK_DAYS = 2;
    const MAX_ASK_DAYS = 7;

    let data = {
        memories: []    // [{ id, topic, text, ts, asked, askedAt }]
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && Array.isArray(saved.memories)) data.memories = saved.memories;
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    // ========== 扫描消息，抓关键词 ==========
    let _lastScannedTs = 0;

    function scanMessages() {
        if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
        const cutoff = Date.now() - 60 * 60 * 1000;  // 只看最近 1 小时的新消息
        let changed = false;

        messages.forEach(function (m) {
            if (!m || !m.text) return;
            if (m.sender !== 'user') return;   // 只看"我"说的
            if (!m.timestamp) return;
            const ts = new Date(m.timestamp).getTime();
            if (ts <= _lastScannedTs) return;
            if (ts > cutoff && _lastScannedTs > 0) return;  // 太新的等一会再处理

            // 检查是否已记录过这条消息
            const msgIdStr = 'msg_' + m.id;
            if (data.memories.some(function (x) { return x._srcId === msgIdStr; })) return;

            // 匹配关键词
            for (let i = 0; i < PATTERNS.length; i++) {
                const p = PATTERNS[i];
                for (let j = 0; j < p.tags.length; j++) {
                    if (String(m.text).indexOf(p.tags[j]) !== -1) {
                        data.memories.push({
                            id: 'mem_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                            topic: p.topic,
                            question: p.question,
                            text: String(m.text).slice(0, 60),
                            ts: ts,
                            asked: false,
                            askedAt: null,
                            _srcId: msgIdStr
                        });
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }
        });

        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last && last.timestamp) {
                _lastScannedTs = Math.max(_lastScannedTs, new Date(last.timestamp).getTime());
            }
        }

        if (changed) {
            cleanupOld();
            save();
        }
    }

    function cleanupOld() {
        const cutoff = Date.now() - KEEP_DAYS * 86400000;
        data.memories = data.memories.filter(function (m) { return m.ts >= cutoff; });
    }

    // ========== 挑一条合适的来问 ==========
    function pickUnasked() {
        const now = Date.now();
        const minMs = MIN_ASK_DAYS * 86400000;
        const maxMs = MAX_ASK_DAYS * 86400000;

        const candidates = data.memories.filter(function (m) {
            if (m.asked) return false;
            const daysSince = now - m.ts;
            return daysSince >= minMs && daysSince <= maxMs;
        });

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // ========== 主动问起 ==========
    async function askMemory() {
        const item = pickUnasked();
        if (!item) return false;

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: item.question,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, item.question);
        }

        item.asked = true;
        item.askedAt = Date.now();
        await save();
        return true;
    }

    // ========== 定时调度 ==========
    function scheduleAsk() {
        if (window._rememberTimer) clearTimeout(window._rememberTimer);
        // 每 30~90 分钟检查一次有没有可以"问起"的记忆
        const delay = (30 + Math.random() * 60) * 60 * 1000;
        window._rememberTimer = setTimeout(function () {
            try { askMemory(); } catch (e) {}
            scheduleAsk();
        }, delay);
    }

    // ========== 面板：看你都"被记住了"什么 ==========
    window.openRememberPanel = function () {
        const old = document.getElementById('remember-panel');
        if (old) old.remove();

        const list = data.memories.slice().sort(function (a, b) { return b.ts - a.ts; });

        const listHTML = list.length === 0
            ? '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);font-size:13px;opacity:0.7;">'
                + '<div style="font-size:36px;opacity:0.3;margin-bottom:12px;">💭</div>'
                + '他还没记住什么<br><span style="font-size:11px;opacity:0.6;">你平时聊到的，他会慢慢记下来</span>'
              + '</div>'
            : list.map(function (m) {
                const d = new Date(m.ts);
                const dateStr = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
                const askedLabel = m.asked ? '✓ 已问起' : '💭 记着';
                return '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;margin-bottom:8px;' + (m.asked ? 'opacity:0.65;' : '') + '">'
                    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
                    +     '<span style="font-size:11px;color:var(--accent-color);font-weight:600;">' + askedLabel + '</span>'
                    +     '<span style="font-size:11px;color:var(--text-secondary);">' + dateStr + '</span>'
                    +   '</div>'
                    +   '<div style="font-size:12.5px;color:var(--text-primary);line-height:1.6;opacity:0.85;">' + String(m.text).replace(/</g, '&lt;') + '</div>'
                    +   '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;font-style:italic;">→ 他会问：' + m.question + '</div>'
                    + '</div>';
            }).join('');

        const modal = document.createElement('div');
        modal.id = 'remember-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-brain" style="color:var(--accent-color);margin-right:8px;"></i>他记得你说过</span>'
            +     '<button id="rm-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:14px;line-height:1.7;">你聊天里提到过的事，他都会记下来。过 2~7 天，他会挑一件事来问你。</div>'
            +   '<div style="flex:1;overflow-y:auto;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('#rm-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    };

    // ========== 初始化 ==========
    window.initRemember = function () {
        load().then(function () {
            // 首次扫描
            scanMessages();
            // 每 60 秒扫一次新消息
            setInterval(scanMessages, 60000);
            // 启动定时问起
            scheduleAsk();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initRemember, 2000); });
    } else {
        setTimeout(window.initRemember, 2000);
    }

    console.log('[remember] 他记得你说过 - 已加载 ✓');
})();