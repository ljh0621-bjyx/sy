/**
 * bubble-styles.js
 * 新增三种气泡样式：微信风 / iOS 风 / 少女风
 */

(function () {
    'use strict';

    const STYLES = [
        { id: 'wechat', icon: 'fab fa-weixin', label: '微信风' },
        { id: 'ios',    icon: 'fab fa-apple',  label: 'iOS 风' },
        { id: 'girl',   icon: 'fas fa-heart',  label: '少女风' }
    ];

    function injectCSS() {
        if (document.getElementById('bubble-styles-extra')) return;
        const s = document.createElement('style');
        s.id = 'bubble-styles-extra';
        s.textContent = `
        /* ===== A 微信风 ===== */
        .message.wechat {
            border-radius: 8px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
            border: 1px solid rgba(0,0,0,0.04) !important;
            position: relative;
        }
        html[data-theme="dark"] .message.wechat {
            border-color: rgba(255,255,255,0.08) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4) !important;
        }
        .message-sent.wechat::after {
            content: '';
            position: absolute;
            right: -6px;
            top: 12px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 5px 0 5px 6px;
            border-color: transparent transparent transparent var(--accent-color);
        }
        .message-received.wechat::after {
            content: '';
            position: absolute;
            left: -6px;
            top: 12px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 5px 6px 5px 0;
            border-color: transparent var(--message-received-bg) transparent transparent;
        }

        /* ===== B iOS 风 ===== */
        .message.ios {
            border-radius: 22px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04) !important;
            backdrop-filter: blur(20px) saturate(1.4);
            -webkit-backdrop-filter: blur(20px) saturate(1.4);
            padding: 11px 16px !important;
            letter-spacing: 0.2px;
        }
        html[data-theme="dark"] .message.ios {
            box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3) !important;
        }
        .message-sent.ios {
            background: linear-gradient(135deg,
                rgba(var(--accent-color-rgb), 0.98) 0%,
                rgba(var(--accent-color-rgb), 0.82) 100%) !important;
            border: 1px solid rgba(255,255,255,0.18) !important;
        }
        .message-received.ios {
            background: rgba(255,255,255,0.72) !important;
            border: 1px solid rgba(var(--accent-color-rgb), 0.12) !important;
        }
        html[data-theme="dark"] .message-received.ios {
            background: rgba(255,255,255,0.08) !important;
            border-color: rgba(255,255,255,0.1) !important;
        }

        /* ===== C 少女风 ===== */
        .message.girl {
            border-radius: 24px !important;
            box-shadow:
                0 6px 22px rgba(var(--accent-color-rgb), 0.18),
                0 2px 8px rgba(0,0,0,0.04),
                inset 0 1px 0 rgba(255,255,255,0.4) !important;
            position: relative;
            padding: 11px 16px !important;
        }
        .message-sent.girl {
            background: linear-gradient(135deg,
                rgba(var(--accent-color-rgb), 0.95) 0%,
                rgba(var(--accent-color-rgb), 0.7) 100%) !important;
            color: #fff !important;
        }
        .message-received.girl {
            background: linear-gradient(135deg,
                rgba(var(--accent-color-rgb), 0.06) 0%,
                rgba(var(--accent-color-rgb), 0.12) 100%) !important;
        }
        html[data-theme="dark"] .message-received.girl {
            background: linear-gradient(135deg,
                rgba(var(--accent-color-rgb), 0.15) 0%,
                rgba(var(--accent-color-rgb), 0.06) 100%) !important;
        }
        .message-sent.girl::before {
            content: '♡';
            position: absolute;
            right: -14px;
            bottom: -2px;
            font-size: 12px;
            color: rgba(var(--accent-color-rgb), 0.6);
            animation: girlHeartBeat 1.6s ease-in-out infinite;
        }
        @keyframes girlHeartBeat {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.3); opacity: 1; }
        }
        `;
        document.head.appendChild(s);
    }

    function refreshActive() {
        if (typeof settings === 'undefined') return;
        document.querySelectorAll('[data-bubble-style]').forEach(function (el) {
            el.classList.toggle('active', el.dataset.bubbleStyle === settings.bubbleStyle);
        });
    }

    function injectButtons() {
        const list = document.querySelector('#appearance-panel-bubble .settings-item-list');
        if (!list) return false;
        if (list.querySelector('[data-bubble-style="wechat"]')) {
            refreshActive();
            return true;
        }

        STYLES.forEach(function (style) {
            const btn = document.createElement('div');
            btn.className = 'settings-item';
            btn.dataset.bubbleStyle = style.id;
            btn.style.cssText = 'justify-content:center;';
            btn.innerHTML = '<i class="' + style.icon + '"></i><span>' + style.label + '</span>';
            btn.addEventListener('click', function () {
                if (typeof settings === 'undefined') return;
                settings.bubbleStyle = style.id;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                refreshActive();
                if (typeof renderMessages === 'function') renderMessages(true);
                if (typeof showNotification === 'function') {
                    showNotification('气泡已切换为「' + style.label + '」', 'success', 1500);
                }
            });
            list.appendChild(btn);
        });
        refreshActive();
        return true;
    }

    function init() {
        injectCSS();
        if (!injectButtons()) {
            setTimeout(init, 500);
            return;
        }
        document.addEventListener('click', function (e) {
            if (e.target.closest('#appearance-settings')) {
                setTimeout(injectButtons, 200);
                setTimeout(injectButtons, 700);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 800); });
    } else {
        setTimeout(init, 800);
    }
})();