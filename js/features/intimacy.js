/* ============================================================
 * intimacy.js - 亲密度系统
 * 根据聊天频率、发消息、每日登录累计，分等级
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('intimacyData_v1');

    const LEVELS = [
        { min: 0,    name: '初识',     icon: '🌱', color: '#9BB89D' },
        { min: 100,  name: '熟悉',     icon: '🌿', color: '#7BA05B' },
        { min: 300,  name: '亲近',     icon: '🌸', color: '#F4A6B3' },
        { min: 700,  name: '亲密',     icon: '💗', color: '#FF6B9D' },
        { min: 1500, name: '心有灵犀', icon: '✨', color: '#C5A47E' },
        { min: 3000, name: '灵魂伴侣', icon: '♾️', color: '#BB9EC7' }
    ];

    let data = {
        points: 0,
        lastLoginDate: null,
        lastMsgTs: 0,
        todayPoints: 0,
        todayDate: null
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }

    function getLevel(points) {
        let cur = LEVELS[0];
        for (const lv of LEVELS) {
            if (points >= lv.min) cur = lv;
            else break;
        }
        return cur;
    }
    function getNextLevel(points) {
        for (const lv of LEVELS) {
            if (points < lv.min) return lv;
        }
        return null;
    }

    function resetTodayIfNeeded() {
        const today = new Date().toDateString();
        if (data.todayDate !== today) {
            data.todayDate = today;
            data.todayPoints = 0;
        }
    }

    function updateUI() {
        const iconEl = document.querySelector('#intimacy-btn .intimacy-icon');
        const pointsEl = document.querySelector('#intimacy-btn .intimacy-points');
        if (!iconEl || !pointsEl) return;
        const lv = getLevel(data.points);
        iconEl.textContent = lv.icon;
        iconEl.style.fontSize = '14px';
        pointsEl.textContent = data.points;
        const btn = document.getElementById('intimacy-btn');
        if (btn) {
            btn.title = lv.name + ' · ' + data.points + ' 点';
            btn.style.color = lv.color;
        }
    }

    function addPoints(n) {
        resetTodayIfNeeded();
        data.points = Math.max(0, data.points + n);
        data.todayPoints = Math.max(0, data.todayPoints + n);
        save();
        updateUI();
    }

    function checkDailyLogin() {
        const today = new Date().toDateString();
        if (data.lastLoginDate !== today) {
            data.lastLoginDate = today;
            addPoints(5);
        }
    }

    function installMsgHook() {
    // 改用轮询：每隔 1.5 秒检查 messages 数组有没有新增
    let _lastCount = 0;
    let _ready = false;

    setInterval(function () {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (!_ready) {
                _lastCount = messages.length;
                _ready = true;
                return;
            }
            if (messages.length > _lastCount) {
                const diff = messages.length - _lastCount;
                _lastCount = messages.length;
                addPoints(diff);
            }
        } catch (e) {}
    }, 1500);
}

    // ========== 面板 ==========
    window.openIntimacyPanel = function () {
        const old = document.getElementById('intimacy-panel');
        if (old) old.remove();

        resetTodayIfNeeded();

        const lv = getLevel(data.points);
        const next = getNextLevel(data.points);
        const progress = next
            ? Math.min(100, ((data.points - lv.min) / (next.min - lv.min)) * 100)
            : 100;

        const modal = document.createElement('div');
        modal.id = 'intimacy-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:26px 22px;width:92%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);text-align:center;">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-heart" style="color:' + lv.color + ';margin-right:8px;"></i>亲密度</span>'
            +     '<button id="ip-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:64px;line-height:1;margin-bottom:10px;">' + lv.icon + '</div>'
            +   '<div style="font-size:22px;font-weight:800;color:' + lv.color + ';margin-bottom:6px;">' + lv.name + '</div>'
            +   '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:22px;">' + data.points + ' 点</div>'

            +   '<div style="background:var(--primary-bg);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:left;">'
            +     '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-secondary);margin-bottom:8px;">'
            +       '<span>' + (next ? '距 ' + next.icon + ' ' + next.name : '已达最高等级') + '</span>'
            +       '<span>' + (next ? (next.min - data.points) + ' 点' : '') + '</span>'
            +     '</div>'
            +     '<div style="height:6px;background:var(--border-color);border-radius:3px;overflow:hidden;">'
            +       '<div style="width:' + progress.toFixed(1) + '%;height:100%;background:' + lv.color + ';border-radius:3px;transition:width 0.6s ease;"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;">'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">今日累计</div>'
            +       '<div style="font-size:18px;font-weight:700;color:var(--accent-color);">+' + data.todayPoints + '</div>'
            +     '</div>'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;">'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">下一级还需</div>'
            +       '<div style="font-size:18px;font-weight:700;color:var(--accent-color);">' + (next ? (next.min - data.points) : '—') + '</div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="font-size:11px;color:var(--text-secondary);opacity:0.65;line-height:1.7;text-align:left;padding:10px 4px;">'
            +     '· 每发一条消息 +1<br>'
            +     '· 每天首次打开 +5<br>'
            +     '· 积少成多，慢慢走近'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#ip-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    };

    // ========== 初始化 ==========
    window.initIntimacy = function () {
        load().then(function () {
            checkDailyLogin();
            installMsgHook();
            updateUI();
        });
    };

    // 自启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initIntimacy, 1200); });
    } else {
        setTimeout(window.initIntimacy, 1200);
    }

})();