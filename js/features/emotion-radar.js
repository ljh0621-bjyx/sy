/* ============================================================
 * emotion-radar.js - 情绪雷达
 * 把最近 7 天你和对方的心情画成曲线
 * ============================================================ */
(function () {
    'use strict';

    // 心情 → 数值映射（-3 到 +3）
    // 依据 mood.js 里的 MOOD_OPTIONS key
    const MOOD_VALUE = {
        'happy':   3,
        'excited': 3,
        'love':    3,
        'cool':    2,
        'peace':   1,
        'cute':    2,
        'busy':    0,
        'sleepy':  0,
        'lonely': -1,
        'tired':  -1,
        'sad':    -2,
        'angry':  -2
    };

    // 支持的 key 里如果有 custom_ 开头的，就当 0
    function moodValue(key) {
        if (!key) return null;
        if (key.indexOf('custom_') === 0) return 0;
        return (key in MOOD_VALUE) ? MOOD_VALUE[key] : null;
    }

    // 拿最近 7 天的数据
    function getLast7Days() {
        const out = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = y + '-' + m + '-' + day;
            out.push({
                key: key,
                label: (d.getMonth() + 1) + '/' + d.getDate(),
                weekday: ['日','一','二','三','四','五','六'][d.getDay()],
                me: null,
                partner: null
            });
        }
        return out;
    }

    function fillData(days) {
        let mood = {};
        try { mood = (typeof window !== 'undefined' && window.moodData) || {}; } catch (e) {}
        if (!mood || typeof mood !== 'object') return;

        days.forEach(function (d) {
            const dayData = mood[d.key];
            if (!dayData) return;
            // mood.js 里：user = 我的心情，partner = 对方的心情
            if (dayData.user) d.me = moodValue(dayData.user);
            if (dayData.partner) d.partner = moodValue(dayData.partner);
        });
    }

    // 把 -3 ~ +3 映射到画布 y 坐标
    function valueToY(v, h, padTop, padBottom) {
        const range = 3 - (-3); // 6
        const innerH = h - padTop - padBottom;
        // v=3 → padTop, v=-3 → h-padBottom
        return padTop + (3 - v) / range * innerH;
    }

    // 画折线图
    function drawChart(canvas, days) {
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cs = getComputedStyle(document.documentElement);
        const accent = cs.getPropertyValue('--accent-color').trim() || '#c5a47e';
        const textSec = cs.getPropertyValue('--text-secondary').trim() || '#888';
        const border = cs.getPropertyValue('--border-color').trim() || '#ddd';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const padTop = 24, padBottom = 34, padLeft = 30, padRight = 12;
        const innerW = W - padLeft - padRight;
        const innerH = H - padTop - padBottom;

        // 背景
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
        ctx.fillRect(padLeft, padTop, innerW, innerH);

        // 水平参考线（+3, 0, -3）
        ctx.strokeStyle = border;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        [3, 0, -3].forEach(function (v) {
            const y = valueToY(v, H, padTop, padBottom);
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(W - padRight, y);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // y 轴文字
        ctx.fillStyle = textSec;
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('开心', padLeft - 5, valueToY(3, H, padTop, padBottom));
        ctx.fillText('平静', padLeft - 5, valueToY(0, H, padTop, padBottom));
        ctx.fillText('低落', padLeft - 5, valueToY(-3, H, padTop, padBottom));

        // x 坐标
        const stepX = innerW / (days.length - 1 || 1);
        function xOf(i) { return padLeft + i * stepX; }

        // x 轴标签
        ctx.fillStyle = textSec;
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        days.forEach(function (d, i) {
            ctx.fillText(d.label, xOf(i), padTop + innerH + 8);
        });

        // 画一条折线 + 圆点
        function drawLine(key, color, fillAlpha) {
            const pts = days.map(function (d, i) {
                const v = d[key];
                if (v === null || v === undefined) return null;
                return { x: xOf(i), y: valueToY(v, H, padTop, padBottom), v: v };
            });
            const valid = pts.filter(function (p) { return p; });
            if (valid.length === 0) return;

            // 折线（只在相邻有效点之间画）
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            let started = false;
            pts.forEach(function (p) {
                if (!p) { started = false; return; }
                if (!started) { ctx.moveTo(p.x, p.y); started = true; }
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // 圆点
            valid.forEach(function (p) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = isDark ? '#1a1a1a' : '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        }

        // 先画对方（浅色），再画我（深色），避免遮住
        const partnerColor = '#ff8fab';
        const meColor = accent;

        drawLine('partner', partnerColor, 0.6);
        drawLine('me', meColor, 1.0);
    }

    // ========== 打开面板 ==========
    window.openEmotionRadarPanel = function () {
        const old = document.getElementById('emotion-radar-panel');
        if (old) old.remove();

        const days = getLast7Days();
        fillData(days);

        const myVals = days.filter(function (d) { return d.me !== null; }).map(function (d) { return d.me; });
        const ptVals = days.filter(function (d) { return d.partner !== null; }).map(function (d) { return d.partner; });

        const myAvg = myVals.length ? (myVals.reduce(function (a, b) { return a + b; }, 0) / myVals.length) : null;
        const ptAvg = ptVals.length ? (ptVals.reduce(function (a, b) { return a + b; }, 0) / ptVals.length) : null;

        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';

        function avgLabel(v) {
            if (v === null) return '无记录';
            if (v >= 2) return '开心';
            if (v >= 0.5) return '还不错';
            if (v >= -0.5) return '平静';
            if (v >= -2) return '有点低落';
            return '低落';
        }

        let compareText = '';
        if (myAvg !== null && ptAvg !== null) {
            const diff = myAvg - ptAvg;
            if (Math.abs(diff) < 0.3) compareText = '你们最近的心情差不多 ✦';
            else if (diff > 0) compareText = '你最近比 ' + pName + ' 开心一点';
            else compareText = pName + ' 最近比你开心一点';
        } else {
            compareText = '多记录几天心情，就能看出趋势了';
        }

        const modal = document.createElement('div');
        modal.id = 'emotion-radar-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:erFadeIn 0.25s ease;';

        modal.innerHTML =
            '<style>@keyframes erFadeIn{from{opacity:0}to{opacity:1}}@keyframes erPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px 20px 18px;width:92%;max-width:420px;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:erPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            +         '<span style="font-size:16px;">📊</span>'
            +       '</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">情绪雷达</span>'
            +     '</div>'
            +     '<button id="er-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;text-align:center;">最近 7 天的心情</div>'

            +   '<div style="position:relative;width:100%;height:220px;margin-bottom:14px;">'
            +     '<canvas id="emotion-canvas" style="width:100%;height:100%;display:block;"></canvas>'
            +   '</div>'

            // 图例
            +   '<div style="display:flex;justify-content:center;gap:18px;margin-bottom:14px;font-size:11.5px;color:var(--text-secondary);">'
            +     '<span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;border-radius:2px;background:var(--accent-color);"></span>' + mName + '</span>'
            +     '<span style="display:flex;align-items:center;gap:5px;"><span style="width:14px;height:3px;border-radius:2px;background:#ff8fab;"></span>' + pName + '</span>'
            +   '</div>'

            // 两个平均值卡片
            +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;text-align:center;">'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">' + mName + ' 平均</div>'
            +       '<div style="font-size:14px;font-weight:700;color:var(--accent-color);">' + avgLabel(myAvg) + '</div>'
            +     '</div>'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;text-align:center;">'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">' + pName + ' 平均</div>'
            +       '<div style="font-size:14px;font-weight:700;color:#ff8fab;">' + avgLabel(ptAvg) + '</div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:rgba(var(--accent-color-rgb),0.06);border-radius:12px;padding:10px 14px;font-size:12px;color:var(--text-secondary);text-align:center;margin-bottom:14px;">'
            +     compareText
            +   '</div>'

            +   '<button id="er-close-btn" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        // 等 DOM 挂好后再画图（需要拿到 clientWidth）
        setTimeout(function () {
            const canvas = modal.querySelector('#emotion-canvas');
            if (canvas) drawChart(canvas, days);
        }, 30);

        const close = function () { modal.remove(); };
        modal.querySelector('#er-close').onclick = close;
        modal.querySelector('#er-close-btn').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    };

    // ========== 入口按钮绑定 ==========
    function bindEntry() {
        // 挂在"高级功能"列表里
        const container = document.querySelector('#advanced-modal .settings-item-list');
        if (!container) { setTimeout(bindEntry, 500); return; }
        if (container.querySelector('#emotion-radar-function')) return;

        const item = document.createElement('div');
        item.className = 'settings-item';
        item.id = 'emotion-radar-function';
        item.style.position = 'relative';
        item.innerHTML = '<i class="fas fa-chart-line"></i><span>情绪雷达</span>';
        item.onclick = function () {
            const adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            window.openEmotionRadarPanel();
        };
        container.appendChild(item);
    }

    window.initEmotionRadar = function () {
        bindEntry();
        setTimeout(bindEntry, 1500);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initEmotionRadar, 1500); });
    } else {
        setTimeout(window.initEmotionRadar, 1500);
    }

    console.log('[emotion-radar] 情绪雷达已加载 ✓');
})();