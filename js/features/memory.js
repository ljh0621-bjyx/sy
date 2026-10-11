/* ============================================================
 * memory.js - 那年今日 / 回忆卡片
 * ============================================================ */
(function () {
    'use strict';
    
     alert('memory.js 已加载');

    const KEY = 'memoryData_v1';
    let data = {
        lastShownDate: null
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function daysBetween(t1, t2) {
        return Math.round((t2 - t1) / 86400000);
    }

    // 从聊天记录里找一条"值得回忆"的消息
    function pickMemoryMessage() {
        if (typeof messages === 'undefined' || !Array.isArray(messages) || messages.length === 0) return null;

        const now = new Date();
        const candidates = [];

        messages.forEach(function (m) {
            if (!m || !m.timestamp) return;
            if (m.type === 'system' || m.type === 'call-event') return;
            if (!m.text && !m.image) return;

            const d = new Date(m.timestamp);
            const daysAgo = daysBetween(d.getTime(), now.getTime());
            if (daysAgo < 7) return;   // 太近的不算

            // 整百天、整年、一年前的今天
            const isSameDayLastYear = d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear();
            const isSameDayLastMonth = d.getDate() === now.getDate() && daysAgo >= 25 && daysAgo <= 35;
            const isMilestone = [30, 100, 200, 365, 500, 730, 1000].some(function (n) { return Math.abs(daysAgo - n) <= 1; });

            if (isSameDayLastYear || isSameDayLastMonth || isMilestone) {
                candidates.push({
                    msg: m,
                    daysAgo: daysAgo,
                    priority: isSameDayLastYear ? 3 : (isMilestone ? 2 : 1)
                });
            }
        });

        if (candidates.length === 0) return null;
        candidates.sort(function (a, b) { return b.priority - a.priority; });
        const top = candidates.slice(0, 5);
        return top[Math.floor(Math.random() * top.length)];
    }

    // ========== 回忆卡片 ==========
    function showMemoryCard(item) {
        const old = document.getElementById('memory-card');
        if (old) old.remove();

        const msg = item.msg;
        const daysAgo = item.daysAgo;
        const d = new Date(msg.timestamp);
        const dateLabel = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
        const daysLabel = (function () {
            if (daysAgo >= 360 && daysAgo <= 370) return '一年前的今天';
            if (daysAgo >= 25 && daysAgo <= 35) return '一个月前的今天';
            if (daysAgo === 100) return '百日纪念';
            if (daysAgo === 365) return '一年前的今天';
            if (daysAgo === 730) return '两年前的今天';
            return daysAgo + ' 天前的今天';
        })();

        const senderName = msg.sender === 'user'
            ? ((typeof settings !== 'undefined' && settings.myName) || '我')
            : ((typeof settings !== 'undefined' && settings.partnerName) || '对方');

        const contentHTML = msg.image
            ? '<img src="' + msg.image + '" style="max-width:100%;max-height:200px;border-radius:12px;display:block;margin-top:8px;">'
            : '<div style="font-size:14px;line-height:1.8;color:var(--text-primary);white-space:pre-wrap;word-break:break-word;margin-top:6px;">' + String(msg.text || '').replace(/</g, '&lt;') + '</div>';

        const el = document.createElement('div');
        el.id = 'memory-card';
        el.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.6);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;animation:memFadeIn 0.5s ease;';

        el.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px 22px;width:88%;max-width:360px;box-shadow:0 24px 80px rgba(0,0,0,0.5);animation:memPop 0.7s cubic-bezier(0.34,1.56,0.64,1);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--accent-color);font-weight:700;">MEMORY</span>'
            +     '<button id="mem-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:0;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">' + daysLabel + '</div>'
            +   '<div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:14px;letter-spacing:0.5px;">' + dateLabel + '</div>'
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px 16px;border-left:3px solid var(--accent-color);">'
            +     '<div style="font-size:11px;color:var(--accent-color);font-weight:600;letter-spacing:1px;margin-bottom:6px;">' + senderName + '</div>'
            +     contentHTML
            +   '</div>'
            +   '<div style="font-size:11.5px;color:var(--text-secondary);opacity:0.7;text-align:center;margin-top:16px;line-height:1.6;font-style:italic;">还记得这一天吗？</div>'
            + '</div>';

        if (!document.getElementById('mem-style')) {
            const s = document.createElement('style');
            s.id = 'mem-style';
            s.textContent =
                '@keyframes memFadeIn{from{opacity:0}to{opacity:1}}' +
                '@keyframes memPop{0%{opacity:0;transform:scale(0.85) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}';
            document.head.appendChild(s);
        }

        document.body.appendChild(el);

        const close = () => el.remove();
        el.querySelector('#mem-close').onclick = close;
        el.addEventListener('click', (e) => { if (e.target === el) close(); });

        if (typeof playSound === 'function') {
            try { playSound('favorite'); } catch (e) {}
        }
        setTimeout(function () { if (document.body.contains(el)) close(); }, 20000);
    }

    // ========== 每天自动弹一次 ==========
    function checkToday() {
        const today = todayStr();
        if (data.lastShownDate === today) return;
        const item = pickMemoryMessage();
        if (!item) return;
        data.lastShownDate = today;
        save();
        showMemoryCard(item);
    }

    // ========== 手动打开 ==========
    window.openMemoryCard = function () {
        const item = pickMemoryMessage();
        if (!item) {
            if (typeof showNotification === 'function') {
                showNotification('暂时还没有值得回忆的旧消息', 'info', 2500);
            }
            return;
        }
        showMemoryCard(item);
    };

    // ========== 初始化 ==========
    window.initMemory = function () {
        load().then(function () {
            // 页面加载 12 秒后再检查（等聊天数据都准备好）
            setTimeout(checkToday, 12000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initMemory, 1500); });
    } else {
        setTimeout(window.initMemory, 1500);
    }

    console.log('[memory] 那年今日已加载 ✓');
})();