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
    const oldLevel = getLevel(data.points);
    data.points = Math.max(0, data.points + n);
    data.todayPoints = Math.max(0, data.todayPoints + n);
    const newLevel = getLevel(data.points);
    save();
    updateUI();

    // 等级提升 → 庆祝
    if (newLevel.min > oldLevel.min) {
        showLevelUpCelebration(newLevel);
    }
}

function showLevelUpCelebration(level) {
    const old = document.getElementById('intimacy-levelup');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'intimacy-levelup';
    el.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.55);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;animation:intimacyFadeIn 0.4s ease;';

    el.innerHTML =
        '<div style="position:relative;text-align:center;padding:40px 30px;max-width:340px;animation:intimacyPop 0.7s cubic-bezier(0.34,1.56,0.64,1);">'
        +   '<div style="position:absolute;top:50%;left:50%;width:260px;height:260px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle, rgba(' + hexToRgb(level.color) + ',0.35) 0%, transparent 70%);animation:intimacyGlow 2.5s ease-in-out infinite;pointer-events:none;"></div>'
        +   '<div style="position:relative;font-size:76px;line-height:1;margin-bottom:20px;filter:drop-shadow(0 0 20px ' + level.color + ');animation:intimacyIcon 1s cubic-bezier(0.34,1.56,0.64,1);">' + level.icon + '</div>'
        +   '<div style="position:relative;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:10px;">LEVEL UP</div>'
        +   '<div style="position:relative;font-size:26px;font-weight:800;color:#fff;margin-bottom:12px;text-shadow:0 2px 16px rgba(0,0,0,0.5);">' + level.name + '</div>'
        +   '<div style="position:relative;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.8;">你们又靠近了一点<br>亲密度 <span style="color:' + level.color + ';font-weight:700;">' + data.points + '</span> 点</div>'
        +   '<button id="intimacy-lv-close" style="position:relative;margin-top:26px;padding:10px 36px;border:1.5px solid rgba(255,255,255,0.25);border-radius:24px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);backdrop-filter:blur(8px);">继续 ✦</button>'
        + '</div>';

    if (!document.getElementById('intimacy-anim-style')) {
        const s = document.createElement('style');
        s.id = 'intimacy-anim-style';
        s.textContent =
            '@keyframes intimacyFadeIn{from{opacity:0}to{opacity:1}}' +
            '@keyframes intimacyPop{0%{opacity:0;transform:scale(0.6)}100%{opacity:1;transform:scale(1)}}' +
            '@keyframes intimacyIcon{0%{opacity:0;transform:scale(0.3) rotate(-20deg)}60%{opacity:1;transform:scale(1.15) rotate(8deg)}100%{transform:scale(1) rotate(0)}}' +
            '@keyframes intimacyGlow{0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}}';
        document.head.appendChild(s);
    }

    document.body.appendChild(el);

    const close = () => el.remove();
    el.querySelector('#intimacy-lv-close').onclick = close;
    el.addEventListener('click', (e) => { if (e.target === el) close(); });

    if (typeof playSound === 'function') {
        try { playSound('favorite'); } catch (e) {}
    }

    // 15 秒后自动关闭
    setTimeout(function () {
        if (document.body.contains(el)) close();
    }, 15000);
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    const n = parseInt(hex, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

    function checkDailyLogin() {
        const today = new Date().toDateString();
        if (data.lastLoginDate !== today) {
            data.lastLoginDate = today;
            addPoints(5);
        }
    }

    function installMsgHook() {
    let _lastCount = -1;

    function check() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) {
                return;
            }
            if (_lastCount === -1) {
                _lastCount = messages.length;
                console.log('[intimacy] 初始化完成，当前消息数：', _lastCount, '，点数：', data.points);
                return;
            }
            if (messages.length > _lastCount) {
                const diff = messages.length - _lastCount;
                _lastCount = messages.length;
                console.log('[intimacy] 新增 ' + diff + ' 条消息，点数 →', data.points + diff);
                addPoints(diff);
            }
        } catch (e) {
            console.warn('[intimacy] check err', e);
        }
    }

    check();
    setInterval(check, 1500);
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

            +   '<button id="ip-test" style="margin-top:12px;padding:9px;font-size:11px;border:1px dashed var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);cursor:pointer;width:100%;font-family:var(--font-family);">🧪 测试：+50 点</button>'
+   '<div style="font-size:11px;color:var(--text-secondary);opacity:0.65;line-height:1.7;text-align:left;padding:10px 4px;">'
+     '· 每发一条消息 +1<br>'
+     '· 每天首次打开 +5<br>'
+     '· 积少成多，慢慢走近'
+   '</div>'

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#ip-close').onclick = close;
        
modal.querySelector('#ip-test').onclick = function () {
    addPoints(50);
    modal.remove();
    setTimeout(window.openIntimacyPanel, 200);
};
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