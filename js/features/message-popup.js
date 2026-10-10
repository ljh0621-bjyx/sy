/* ============================================================
 * message-popup.js - 对方发消息时底部弹出通知（性能优化版）
 * 底部弹出，最多堆叠 3 条
 * 用 Message Hook 代替 setInterval 轮询
 * ============================================================ */
(function () {
    'use strict';

    const ENABLE_KEY = 'msgPopupEnabled';
    const MAX_STACK = 3;
    let popupContainer = null;
    let isInitialized = false;
    let lastMsgIds = new Set();

    function isEnabled() {
        const v = localStorage.getItem(ENABLE_KEY);
        return v === null ? true : v === '1';
    }

    function ensureContainer() {
        if (popupContainer && document.body.contains(popupContainer)) return popupContainer;
        popupContainer = document.createElement('div');
        popupContainer.id = 'msg-popup-container';
        popupContainer.style.cssText =
            'position:fixed;bottom:calc(env(safe-area-inset-bottom, 0px) + 80px);left:0;right:0;' +
            'z-index:99997;' +
            'display:flex;flex-direction:column;align-items:center;gap:8px;' +
            'pointer-events:none;' +
            'padding:0 12px;';
        document.body.appendChild(popupContainer);
        return popupContainer;
    }

    function getAvatarSrc() {
        try {
            const partnerAvatar = document.querySelector('#partner-avatar img, [id*="partner-avatar"] img');
            if (partnerAvatar) return partnerAvatar.src;
        } catch (e) {}
        return null;
    }

    function showPopup(msg) {
        if (!isEnabled()) return;
        ensureContainer();

        if (!msg || msg.sender === 'user' || msg.sender === null) return;
        if (msg.type === 'system' || msg.type === 'call-event') return;
        if (msg.type === 'survey') return;

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName)
            ? settings.partnerName
            : (msg.sender || '对方');

        let contentText = '';
        if (msg.text) contentText = msg.text.replace(/</g, '&lt;').replace(/\n/g, ' ');
        else if (msg.image) contentText = '[图片]';
        else if (msg.type === 'voice') contentText = '[语音] ' + (msg.text || '');
        else contentText = '[消息]';

        if (contentText.length > 60) contentText = contentText.slice(0, 60) + '…';

        const avatarSrc = getAvatarSrc();

        const card = document.createElement('div');
        card.className = 'msg-popup-card';
        card.style.cssText =
            'width:100%;max-width:380px;' +
            'background:rgba(var(--secondary-bg-rgb), 0.96);' +
            'backdrop-filter:blur(20px) saturate(1.4);' +
            '-webkit-backdrop-filter:blur(20px) saturate(1.4);' +
            'border:1px solid rgba(var(--accent-color-rgb),0.2);' +
            'border-radius:16px;' +
            'padding:12px 14px;' +
            'display:flex;align-items:center;gap:12px;' +
            'box-shadow:0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(var(--accent-color-rgb),0.08);' +
            'pointer-events:auto;cursor:pointer;' +
            'animation:msgPopupSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1);' +
            'transform-origin:bottom center;';

        card.innerHTML =
            '<div style="width:40px;height:40px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;border:2px solid rgba(var(--accent-color-rgb),0.25);">' +
                (avatarSrc
                    ? '<img src="' + avatarSrc + '" style="width:100%;height:100%;object-fit:cover;">'
                    : '<i class="fas fa-user" style="color:var(--accent-color);font-size:16px;"></i>') +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:12px;font-weight:700;color:var(--accent-color);margin-bottom:2px;">' + partnerName + '</div>' +
                '<div style="font-size:13px;color:var(--text-primary);line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + contentText + '</div>' +
            '</div>' +
            '<button class="msg-popup-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px 6px;flex-shrink:0;opacity:0.6;"><i class="fas fa-times"></i></button>';

        card.addEventListener('click', function (e) {
            if (e.target.closest('.msg-popup-close')) return;
            removeCard(card);
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
            }
        });

        card.querySelector('.msg-popup-close').addEventListener('click', function (e) {
            e.stopPropagation();
            removeCard(card);
        });

        popupContainer.insertBefore(card, popupContainer.firstChild);

        const all = popupContainer.querySelectorAll('.msg-popup-card');
        if (all.length > MAX_STACK) {
            for (let i = MAX_STACK; i < all.length; i++) all[i].remove();
        }

        setTimeout(function () { removeCard(card); }, 3000);

        if (!document.getElementById('msg-popup-style')) {
            const s = document.createElement('style');
            s.id = 'msg-popup-style';
            s.textContent =
                '@keyframes msgPopupSlideUp{from{opacity:0;transform:translateY(30px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}' +
                '@keyframes msgPopupFadeOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(20px) scale(0.9)}}';
            document.head.appendChild(s);
        }
    }

    function removeCard(card) {
        if (!card || !card.parentNode) return;
        card.style.animation = 'msgPopupFadeOut 0.3s ease forwards';
        setTimeout(function () {
            if (card.parentNode) card.parentNode.removeChild(card);
        }, 300);
    }

    // ========== 直接处理消息，不再轮询 ==========
    function handleIncomingMessage(msg) {
        if (!msg) return;
        if (msg.sender !== 'user' && msg.sender !== null && msg.type !== 'system' && msg.type !== 'call-event') {
            showPopup(msg);
        }
    }

    // 首次加载：把现有消息都记下，避免刷屏
    function snapshotExisting() {
        try {
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                messages.forEach(function (m) { lastMsgIds.add(m.id); });
            }
        } catch (e) {}
        isInitialized = true;
    }

    // ========== 初始化：Hook addMessage ==========
    window.initMessagePopup = function () {
        // 等 2 秒，让历史消息全部加载完
        setTimeout(snapshotExisting, 2000);

        // Hook addMessage：新消息立刻处理
        function installHook() {
            if (typeof window.addMessage !== 'function') {
                setTimeout(installHook, 300);
                return;
            }
            if (window._msgPopupHookInstalled) return;
            window._msgPopupHookInstalled = true;

            const originalAddMessage = window.addMessage;
            window.addMessage = function (message) {
                const result = originalAddMessage.apply(this, arguments);
                try {
                    // 等 100ms，让消息完全走完流程
                    setTimeout(function () {
                        try { handleIncomingMessage(message); } catch (e) {}
                    }, 100);
                } catch (e) {}
                return result;
            };
        }
        installHook();
    };

    // 开关
    window.toggleMessagePopup = function () {
        const cur = isEnabled();
        const nv = !cur;
        localStorage.setItem(ENABLE_KEY, nv ? '1' : '0');
        if (typeof showNotification === 'function') {
            showNotification(nv ? '已开启消息弹窗提醒' : '已关闭消息弹窗提醒', 'success', 1500);
        }
        return nv;
    };

    window.isMessagePopupEnabled = isEnabled;

    // ========== 自启动 ==========
    (function autoStart() {
        function start() {
            try { window.initMessagePopup(); } catch (e) { console.warn('[msg-popup] 启动失败', e); }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 800); });
        } else {
            setTimeout(start, 800);
        }
    })();

})();