/* ============================================================
 * couple-clock.js - 情侣时钟
 * 顶栏挂一个会跳动的心，心跳速度反映今天你跟他的聊天热度
 * ============================================================ */
(function () {
    'use strict';

    // 心跳速度等级（每分钟跳多少次）
    // 聊天越多，跳得越快
    const LEVELS = [
        { min: 0,    speed: 90,  color: '#b8b8b8', name: '安静',    desc: '今天还没怎么聊' },
        { min: 1,    speed: 60,  color: '#e8a0b0', name: '轻轻',    desc: '偶尔说几句' },
        { min: 10,   speed: 40,  color: '#ff9eb5', name: '温热',    desc: '聊得还不错' },
        { min: 30,   speed: 26,  color: '#ff6b95', name: '心跳',    desc: '今天聊得挺多' },
        { min: 80,   speed: 16,  color: '#ff3d6e', name: '热恋',    desc: '今天说了好多话' },
        { min: 200,  speed: 10,  color: '#ff1a4d', name: '灼热',    desc: '一整天都在聊' }
    ];

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // 计算今天聊了多少条（用户+对方都算）
    function getTodayCount() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return 0;
            const today = new Date().toDateString();
            return messages.filter(function (m) {
                if (!m || !m.timestamp) return false;
                if (m.type === 'system' || m.type === 'call-event') return false;
                return new Date(m.timestamp).toDateString() === today;
            }).length;
        } catch (e) { return 0; }
    }

    function getYesterdayCount() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return 0;
            const y = new Date(Date.now() - 86400000).toDateString();
            return messages.filter(function (m) {
                if (!m || !m.timestamp) return false;
                if (m.type === 'system' || m.type === 'call-event') return false;
                return new Date(m.timestamp).toDateString() === y;
            }).length;
        } catch (e) { return 0; }
    }

    // 根据条数拿等级
    function getLevel(count) {
        let cur = LEVELS[0];
        for (let i = 0; i < LEVELS.length; i++) {
            if (count >= LEVELS[i].min) cur = LEVELS[i];
            else break;
        }
        return cur;
    }

    // 应用动画
    let _timer = null;
    function applyHeartbeat() {
        const icon = document.getElementById('couple-heartbeat-icon');
        if (!icon) return;

        const count = getTodayCount();
        const lv = getLevel(count);

        // 设置颜色
        icon.style.color = lv.color;
        // 加光晕
        icon.style.textShadow = '0 0 6px ' + lv.color + '80';

        // 清除旧 timer
        if (_timer) { clearInterval(_timer); _timer = null; }

        // 用 setInterval 模拟跳动：
        // speed 是"每分钟跳多少次"，但视觉上太快了，用 speed 反过来做"间隔秒数"
        // 举例：speed=90 → 90 次/分 → 0.67 秒一次，但视觉上看不出
        // 所以用"每 N 秒快速跳一下"的方式做
        // speed 越"大"（聊天越少）→ 间隔越久、跳动越弱
        // speed 越"小"（聊天越多）→ 间隔越短、跳动越强
        let intervalMs, scalePeak;
        if (count === 0) {
            intervalMs = 3000;  // 3 秒跳一下
            scalePeak = 1.1;
        } else if (count < 10) {
            intervalMs = 2200;
            scalePeak = 1.15;
        } else if (count < 30) {
            intervalMs = 1500;
            scalePeak = 1.25;
        } else if (count < 80) {
            intervalMs = 1000;
            scalePeak = 1.35;
        } else if (count < 200) {
            intervalMs = 700;
            scalePeak = 1.45;
        } else {
            intervalMs = 500;
            scalePeak = 1.55;
        }

        // 双跳（心形"咚-咚"节奏）
        function beat() {
            icon.style.transition = 'transform 0.15s ease-out';
            icon.style.transform = 'scale(' + scalePeak + ')';
            setTimeout(function () {
                icon.style.transform = 'scale(1)';
                setTimeout(function () {
                    icon.style.transition = 'transform 0.12s ease-out';
                    icon.style.transform = 'scale(' + (scalePeak * 0.9) + ')';
                    setTimeout(function () {
                        icon.style.transform = 'scale(1)';
                    }, 130);
                }, 180);
            }, 160);
        }

        beat();
        _timer = setInterval(beat, intervalMs);
    }

    // ========== 点击弹卡片 ==========
    window.openCoupleClockPanel = function () {
        const old = document.getElementById('couple-clock-panel');
        if (old) old.remove();

        const todayCount = getTodayCount();
        const yestCount = getYesterdayCount();
        const lv = getLevel(todayCount);

        let compareText;
        if (todayCount > yestCount) compareText = '比昨天更热 🔥';
        else if (todayCount < yestCount) compareText = '比昨天冷清一点';
        else if (todayCount === 0 && yestCount === 0) compareText = '这两天都没怎么聊';
        else compareText = '跟昨天差不多';

        // 心跳速度（每分钟）
        // 把"间隔"换算成每分钟次数，做展示用
        let bpmText;
        if (todayCount === 0) bpmText = '~20';
        else if (todayCount < 10) bpmText = '~40';
        else if (todayCount < 30) bpmText = '~60';
        else if (todayCount < 80) bpmText = '~80';
        else if (todayCount < 200) bpmText = '~100';
        else bpmText = '~120';

        const modal = document.createElement('div');
        modal.id = 'couple-clock-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:ccFadeIn 0.25s ease;';
        modal.innerHTML =
            '<style>@keyframes ccFadeIn{from{opacity:0}to{opacity:1}}@keyframes ccPop{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}' +
            '@keyframes ccHeartPulse{0%,100%{transform:scale(1)}25%{transform:scale(1.15)}40%{transform:scale(1)}60%{transform:scale(1.1)}}' +
            '</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;padding:26px 24px 22px;width:88%;max-width:340px;box-shadow:0 24px 80px rgba(0,0,0,0.35);text-align:center;animation:ccPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'
            +   '<div style="font-size:11px;letter-spacing:4px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">COUPLE CLOCK</div>'
            +   '<div style="font-size:56px;line-height:1;color:' + lv.color + ';text-shadow:0 0 24px ' + lv.color + '66;margin-bottom:6px;animation:ccHeartPulse 1.4s ease-in-out infinite;">♥</div>'
            +   '<div style="font-size:20px;font-weight:800;color:' + lv.color + ';margin-bottom:6px;">' + lv.name + '</div>'
            +   '<div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:20px;">' + lv.desc + '</div>'

            +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;">'
            +       '<div style="font-size:10.5px;color:var(--text-secondary);margin-bottom:4px;">今天聊了</div>'
            +       '<div style="font-size:22px;font-weight:800;color:var(--accent-color);">' + todayCount + '</div>'
            +       '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">条</div>'
            +     '</div>'
            +     '<div style="background:var(--primary-bg);border-radius:12px;padding:12px;">'
            +       '<div style="font-size:10.5px;color:var(--text-secondary);margin-bottom:4px;">心跳速度</div>'
            +       '<div style="font-size:22px;font-weight:800;color:' + lv.color + ';">' + bpmText + '</div>'
            +       '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">次/分</div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:rgba(var(--accent-color-rgb),0.06);border-radius:12px;padding:10px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:18px;">'
            +     compareText
            +   '</div>'

            +   '<button id="cc-close" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        const close = function () { modal.remove(); };
        modal.querySelector('#cc-close').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    };

    // ========== 绑定点击 ==========
    function bindClick() {
        const el = document.getElementById('couple-heartbeat');
        if (!el || el._ccBound) return;
        el._ccBound = true;
        el.addEventListener('click', function (e) {
            e.stopPropagation();
            window.openCoupleClockPanel();
        });
    }

    // ========== 初始化 ==========
    function init() {
        applyHeartbeat();
        bindClick();
        // 每 30 秒重新计算一次（可能你刚聊了天）
        setInterval(function () {
            applyHeartbeat();
            bindClick();
        }, 30000);
    }

    window.initCoupleClock = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[couple-clock] 情侣时钟已加载 ✓');
})();