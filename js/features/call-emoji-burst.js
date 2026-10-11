/**
 * call-emoji-burst.js
 * 通话进行中，对方偶尔弹表情包（数量随机）
 */

(function () {
    'use strict';

    let emojiTimer = null;
    let lastCallState = false;
    let loopTimer = null;

    function isCallActive() {
        const win = document.getElementById('call-window');
        if (!win) return false;
        if (!win.classList.contains('visible')) return false;
        const body = document.getElementById('call-window-body');
        if (!body) return false;
        if (body.style.display === 'none') return false;
        return true;
    }

    function injectStyle() {
        if (document.getElementById('call-emoji-burst-style')) return;
        const s = document.createElement('style');
        s.id = 'call-emoji-burst-style';
        s.textContent = `
            @keyframes callEmojiRise {
                0%   { opacity: 0; transform: translateY(30px) scale(0.5) rotate(-10deg); }
                15%  { opacity: 1; transform: translateY(0) scale(1.15) rotate(5deg); }
                30%  { transform: translateY(-10px) scale(1) rotate(-3deg); }
                70%  { opacity: 1; transform: translateY(-80px) scale(1) rotate(3deg); }
                100% { opacity: 0; transform: translateY(-130px) scale(0.85) rotate(0deg); }
            }
            .call-emoji-pop {
                position: absolute;
                width: 56px;
                height: 56px;
                object-fit: cover;
                border-radius: 12px;
                pointer-events: none;
                z-index: 20;
                box-shadow: 0 4px 16px rgba(0,0,0,0.35);
                animation: callEmojiRise 3.2s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
            }
        `;
        document.head.appendChild(s);
    }

    function spawnEmoji(container, url) {
        const el = document.createElement('img');
        el.src = url;
        el.className = 'call-emoji-pop';

        const w = container.offsetWidth || 280;
        const startX = 8 + Math.random() * Math.max(10, w - 72);
        el.style.left = startX + 'px';
        el.style.bottom = (60 + Math.random() * 40) + 'px';

        container.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 3400);
    }

    function burstEmoji() {
        const win = document.getElementById('call-window-inner');
        if (!win) return;

        const pool = (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary))
            ? stickerLibrary.filter(Boolean)
            : [];

        if (pool.length === 0) return;

        // 1~5 个随机
        const count = 1;
        for (let i = 0; i < count; i++) {
            setTimeout(function () {
                if (!isCallActive()) return;
                spawnEmoji(win, pool[Math.floor(Math.random() * pool.length)]);
            }, i * 140 + Math.random() * 80);
        }

        if (typeof playSound === 'function') {
            try { playSound('favorite'); } catch (e) {}
        }
    }

    function scheduleNextBurst() {
        if (emojiTimer) { clearTimeout(emojiTimer); emojiTimer = null; }
        const delay = 4000 + Math.random() * 6000; // 2.5~7 秒
        emojiTimer = setTimeout(function () {
            if (!isCallActive()) return;
            burstEmoji();
            scheduleNextBurst();
        }, delay);
    }

    function stopBurst() {
        if (emojiTimer) { clearTimeout(emojiTimer); emojiTimer = null; }
    }

    function loop() {
        const active = isCallActive();
        if (active && !lastCallState) {
            // 通话刚接通
            scheduleNextBurst();
        } else if (!active && lastCallState) {
            // 通话结束
            stopBurst();
        }
        lastCallState = active;
        loopTimer = setTimeout(loop, 800);
    }

    function init() {
        injectStyle();
        setTimeout(loop, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 手动测试
    window._testCallEmoji = function () {
        if (!isCallActive()) {
            if (typeof showNotification === 'function') {
                showNotification('请先开始通话', 'warning', 2000);
            }
            return;
        }
        burstEmoji();
    };
})();