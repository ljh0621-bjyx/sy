/* ============================================================
 * solar-terms.js - 节气提醒
 * 24 节气当天，他说一句，弹一次
 * ============================================================ */
(function () {
    'use strict';

    const TERMS = [
        { m: 1,  d: 5,  name: '小寒',   line: '今天是小寒，天冷了记得加衣服。' },
        { m: 1,  d: 20, name: '大寒',   line: '大寒到了，是一年里最冷的时候。' },
        { m: 2,  d: 4,  name: '立春',   line: '今天是立春，春天要来了。' },
        { m: 2,  d: 19, name: '雨水',   line: '今天是雨水，雨水开始多了。' },
        { m: 3,  d: 5,  name: '惊蛰',   line: '惊蛰到了，春雷响，万物生。' },
        { m: 3,  d: 20, name: '春分',   line: '今天是春分，白天和黑夜一样长。' },
        { m: 4,  d: 5,  name: '清明',   line: '清明时节，记得去看看想见的人。' },
        { m: 4,  d: 20, name: '谷雨',   line: '谷雨到了，春天最后一个节气。' },
        { m: 5,  d: 6,  name: '立夏',   line: '立夏了，夏天要开始了。' },
        { m: 5,  d: 21, name: '小满',   line: '今天是小满，麦子快熟了。' },
        { m: 6,  d: 6,  name: '芒种',   line: '芒种到了，是一年里最忙的时候。' },
        { m: 6,  d: 21, name: '夏至',   line: '今天是夏至，白天最长的一天。' },
        { m: 7,  d: 7,  name: '小暑',   line: '小暑了，天要热起来了。' },
        { m: 7,  d: 23, name: '大暑',   line: '大暑到了，一年里最热的时候。' },
        { m: 8,  d: 7,  name: '立秋',   line: '立秋了，秋天要来了。' },
        { m: 8,  d: 23, name: '处暑',   line: '处暑到了，暑气要消了。' },
        { m: 9,  d: 7,  name: '白露',   line: '白露了，早晚凉，记得添衣。' },
        { m: 9,  d: 23, name: '秋分',   line: '今天是秋分，昼夜等长。' },
        { m: 10, d: 8,  name: '寒露',   line: '寒露了，露水要变凉了。' },
        { m: 10, d: 23, name: '霜降',   line: '霜降到了，天要冷了。' },
        { m: 11, d: 7,  name: '立冬',   line: '今天立冬，冬天来了。' },
        { m: 11, d: 22, name: '小雪',   line: '小雪了，可能会下雪。' },
        { m: 12, d: 7,  name: '大雪',   line: '大雪到了，注意保暖。' },
        { m: 12, d: 22, name: '冬至',   line: '今天是冬至，记得吃饺子。' }
    ];

    const SHOWN_KEY = 'solarTermShownDate_v1';

    function todayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function getTodayTerm() {
        const now = new Date();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        return TERMS.find(function (x) { return x.m === m && x.d === d; }) || null;
    }

    function hasShownToday() {
        return localStorage.getItem(SHOWN_KEY) === todayKey();
    }
    function markShown() {
        try { localStorage.setItem(SHOWN_KEY, todayKey()); } catch (e) {}
    }

    function showTermCard(term) {
        const old = document.getElementById('solar-term-card');
        if (old) old.remove();

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        const el = document.createElement('div');
        el.id = 'solar-term-card';
        el.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.6);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;animation:stFadeIn 0.4s ease;';

        el.innerHTML =
            '<div style="position:relative;background:linear-gradient(160deg, rgba(var(--accent-color-rgb),0.15), rgba(var(--accent-color-rgb),0.02)), var(--secondary-bg);border-radius:24px;padding:36px 28px 28px;width:88%;max-width:340px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--accent-color-rgb),0.15);animation:stPop 0.55s cubic-bezier(0.34,1.56,0.64,1);">'
            +   '<div style="position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(var(--accent-color-rgb),0.5), 0 0 0 6px var(--secondary-bg);">'
            +     '<i class="fas fa-leaf" style="color:#fff;font-size:22px;"></i>'
            +   '</div>'
            +   '<div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--accent-color);font-weight:700;margin-top:16px;margin-bottom:6px;opacity:0.8;">SOLAR TERM</div>'
            +   '<div style="font-size:26px;font-weight:800;color:var(--text-primary);margin-bottom:16px;letter-spacing:4px;">' + term.name + '</div>'
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px 16px;margin-bottom:20px;border-left:3px solid var(--accent-color);">'
            +     '<div style="font-size:11px;color:var(--accent-color);font-weight:600;letter-spacing:1px;margin-bottom:6px;text-align:left;">' + pn + ' 说</div>'
            +     '<div style="font-size:13.5px;color:var(--text-primary);line-height:1.8;text-align:left;">' + term.line + '</div>'
            +   '</div>'
            +   '<button id="st-close" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);letter-spacing:2px;">好 的</button>'
            + '</div>';

        if (!document.getElementById('st-anim-style')) {
            const s = document.createElement('style');
            s.id = 'st-anim-style';
            s.textContent =
                '@keyframes stFadeIn{from{opacity:0}to{opacity:1}}' +
                '@keyframes stPop{0%{opacity:0;transform:scale(0.85) translateY(20px)}100%{opacity:1;transform:scale(1) translateY(0)}}';
            document.head.appendChild(s);
        }

        document.body.appendChild(el);

        const close = function () { el.remove(); };
        el.querySelector('#st-close').onclick = close;
        el.addEventListener('click', function (e) { if (e.target === el) close(); });

        if (typeof playSound === 'function') {
            try { playSound('favorite'); } catch (e) {}
        }

        setTimeout(function () { if (document.body.contains(el)) close(); }, 15000);
    }

    function sendTermMessage(term) {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: '今天是' + term.name + '。' + term.line,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, '今天是' + term.name);
        }
    }

    window.testSolarTerm = function (name) {
        const term = name
            ? TERMS.find(function (t) { return t.name === name; })
            : TERMS[Math.floor(Math.random() * TERMS.length)];
        if (term) showTermCard(term);
    };

    function check() {
        if (hasShownToday()) return;
        const term = getTodayTerm();
        if (!term) return;

        markShown();
        setTimeout(function () {
            showTermCard(term);
            setTimeout(function () { sendTermMessage(term); }, 3000);
        }, 8000);
    }

    window.initSolarTerms = function () {
        // 手机测试：URL 带 ?testterm=冬至 就立刻弹
        try {
            const params = new URLSearchParams(location.search);
            const testName = params.get('testterm');
            if (testName) {
                setTimeout(function () {
                    if (testName === '1') {
                        window.testSolarTerm();
                    } else {
                        window.testSolarTerm(testName);
                    }
                }, 2000);
                return;
            }
        } catch (e) {}

        check();
        setInterval(function () {
            if (!hasShownToday()) check();
        }, 60 * 60 * 1000);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(window.initSolarTerms, 3000);
        });
    } else {
        setTimeout(window.initSolarTerms, 3000);
    }

    console.log('[solar-terms] 节气提醒已加载 ✓');
})();