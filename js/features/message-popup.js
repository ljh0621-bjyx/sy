/* ============================================================
 * message-popup.js - 对方发消息时底部弹出通知
 * 底部弹出，最多堆叠 3 条
 * ============================================================ */
(function () {
    'use strict';

    const ENABLE_KEY = 'msgPopupEnabled';
    const MAX_STACK = 3;
    let popupContainer = null;
    let lastMsgIds = new Set();
    let isInitialized = false;

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

    function getAvatarSrc(senderName) {
        try {
            const partnerAvatar = document.querySelector('#partner-avatar img, [id*="partner-avatar"] img');
            if (partnerAvatar) return partnerAvatar.src;
        } catch (e) {}
        return null;
    }

    function showPopup(msg) {
        if (!isEnabled()) return;
        ensureContainer();

        // 只处理对方发的消息（不是用户自己、不是系统消息）
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

        // 点击卡片 → 滚到聊天底部
        card.addEventListener('click', function (e) {
            if (e.target.closest('.msg-popup-close')) return;
            removeCard(card);
            const chat = document.getElementById('chat-container');
            if (chat) {
                chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
            }
        });

        // 点 × 关闭
        card.querySelector('.msg-popup-close').addEventListener('click', function (e) {
            e.stopPropagation();
            removeCard(card);
        });

        // 加到容器顶部（新的在上面）
        popupContainer.insertBefore(card, popupContainer.firstChild);

        // 超出 3 条就删掉最老的
        const all = popupContainer.querySelectorAll('.msg-popup-card');
        if (all.length > MAX_STACK) {
            for (let i = MAX_STACK; i < all.length; i++) {
                all[i].remove();
            }
        }

        // 3 秒后自动消失
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

    // 监听消息变化
    function scanMessages() {
        if (typeof messages === 'undefined' || !Array.isArray(messages)) return;

        if (!isInitialized) {
            // 首次加载，把现有消息全部记入，避免把历史消息全部弹出来
            messages.forEach(function (m) { lastMsgIds.add(m.id); });
            isInitialized = true;
            return;
        }

        const newMsgs = messages.filter(function (m) { return !lastMsgIds.has(m.id); });
        if (newMsgs.length === 0) return;

        newMsgs.forEach(function (m) {
            lastMsgIds.add(m.id);
            if (m.sender !== 'user' && m.sender !== null && m.type !== 'system' && m.type !== 'call-event') {
                showPopup(m);
            }
        });

        // 保持 set 大小，避免无限增长
        if (lastMsgIds.size > 500) {
            const arr = Array.from(lastMsgIds).slice(-200);
            lastMsgIds = new Set(arr);
        }
    }

    // 初始化
    window.initMessagePopup = function () {
        setInterval(scanMessages, 800);
        setTimeout(function () {
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                messages.forEach(function (m) { lastMsgIds.add(m.id); });
                isInitialized = true;
            }
        }, 2000);
    };

    // 开关 API
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
    // ========== 自启动（不依赖 listeners） ==========
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