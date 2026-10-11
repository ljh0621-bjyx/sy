/**
 * transfer-card-renderer.js
 * 转账卡片渲染器 - 不改 core.js，用 Observer 自动把 transfer 消息渲染成卡片
 */
(function () {
    'use strict';

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildCardHTML(msg) {
        const t = msg.transfer;
        if (!t) return '';
        const isMe = msg.sender === 'user';
        const amount = Number(t.amount).toFixed(2);
        const note = t.note ? esc(t.note) : '';

        let statusText = '';
        if (t.status === 'received') statusText = '已收款 ✓';
        else if (isMe) statusText = '待对方收款';
        else statusText = '点击收款 →';

        const cardBg = isMe
            ? 'background:linear-gradient(135deg,#FA9D3B 0%,#F58220 100%);color:#fff;box-shadow:0 4px 16px rgba(245,130,32,0.35);'
            : 'background:#FFF5EB;color:#F58220;border:1px solid rgba(245,130,32,0.3);box-shadow:0 2px 10px rgba(245,130,32,0.12);';

        const subColor = isMe ? 'rgba(255,255,255,0.75)' : 'rgba(245,130,32,0.65)';
        const noteColor = isMe ? 'rgba(255,255,255,0.85)' : 'rgba(120,80,40,0.7)';

        return '<div class="transfer-card" data-msg-id="' + msg.id + '" onclick="window._handleTransferClick(' + msg.id + ')" style="'
            + 'display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:14px;'
            + 'min-width:190px;max-width:240px;cursor:pointer;user-select:none;'
            + '-webkit-tap-highlight-color:transparent;transition:transform 0.15s ease;'
            + cardBg + '">'
            + '<div style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.85;letter-spacing:1px;">'
            + '<i class="fas fa-exchange-alt" style="font-size:10px;"></i><span>转账</span></div>'
            + '<div style="font-size:24px;font-weight:800;font-family:Georgia,serif;letter-spacing:0.5px;">¥' + amount + '</div>'
            + (note ? '<div style="font-size:11.5px;line-height:1.5;color:' + noteColor + ';">' + note + '</div>' : '')
            + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-top:6px;padding-top:6px;border-top:1px dashed ' + (isMe ? 'rgba(255,255,255,0.25)' : 'rgba(245,130,32,0.2)') + ';">'
            + '<span style="color:' + subColor + ';font-weight:600;">' + statusText + '</span>'
            + '<span style="opacity:0.55;color:' + subColor + ';">微信转账</span>'
            + '</div></div>';
    }

    function replaceTransferMessage(msgEl) {
        if (msgEl.dataset._transferRendered === '1') return;
        const msgId = msgEl.dataset.id || msgEl.dataset.msgId;
        if (!msgId) return;

        const msgs = (typeof messages !== 'undefined') ? messages : (window.messages || []);
        const msg = msgs.find(m => String(m.id) === String(msgId));
        if (!msg || msg.type !== 'transfer' || !msg.transfer) return;

        const messageBody = msgEl.querySelector('.message');
        if (!messageBody) return;

        messageBody.className = 'transfer-card-wrapper';
        messageBody.style.background = 'transparent';
        messageBody.style.padding = '0';
        messageBody.style.boxShadow = 'none';
        messageBody.style.maxWidth = 'none';
        messageBody.innerHTML = buildCardHTML(msg);

        msgEl.dataset._transferRendered = '1';
    }

    function scan() {
        const container = document.getElementById('chat-container');
        if (!container) return;
        container.querySelectorAll('.message-wrapper[data-id]').forEach(el => {
            try { replaceTransferMessage(el); } catch (e) {}
        });
    }

    function setupObserver() {
        const container = document.getElementById('chat-container');
        if (!container) {
            setTimeout(setupObserver, 800);
            return;
        }
        if (container._transferObs) return;
        container._transferObs = true;

        const obs = new MutationObserver(function () {
            requestAnimationFrame(scan);
        });
        obs.observe(container, { childList: true, subtree: true });

        setTimeout(scan, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(setupObserver, 1000));
    } else {
        setTimeout(setupObserver, 1000);
    }
})();