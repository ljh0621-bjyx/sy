/**
 * recall-enhance.js
 * 撤回内容可点击查看 + 撤回概率设置
 */

(function () {
    'use strict';

    const CHANCE_KEY = 'partnerRecallChance';

    function showRecallModal(text) {
        const old = document.getElementById('recall-view-modal');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'recall-view-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">'
            + '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;">'
            +   '<i class="fas fa-eye" style="color:var(--accent-color);"></i>撤回的内容'
            + '</div>'
            + '<div style="background:var(--primary-bg);border-radius:12px;padding:14px;font-size:13.5px;color:var(--text-primary);line-height:1.7;word-break:break-word;max-height:50vh;overflow-y:auto;white-space:pre-wrap;">'
            + String(text || '（内容为空）').replace(/</g, '&lt;')
            + '</div>'
            + '<button id="recall-modal-close" style="width:100%;margin-top:14px;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">知道了</button>'
            + '</div>';
        document.body.appendChild(modal);
        modal.querySelector('#recall-modal-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    function scan() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        const msgs = (typeof messages !== 'undefined') ? messages : (window.messages || []);
        const domSystems = Array.from(container.querySelectorAll('.system-message'));
        const sysMsgs = msgs.filter(m => m && m.type === 'system');
        const pairedSys = sysMsgs.slice(-domSystems.length);

        domSystems.forEach((el, i) => {
            if (el.dataset._recallBound === '1') return;
            const msg = pairedSys[i];
            if (!msg) return;

            const domText = (el.textContent || '').trim();
            const msgText = String(msg.text || '').trim();
            if (domText !== msgText) return;

            if (msgText.indexOf('撤回了一条消息') !== -1 && msg.recallText) {
                el.dataset._recallBound = '1';
                el.style.cursor = 'pointer';
                el.style.textDecoration = 'underline dotted';
                el.style.textDecorationColor = 'rgba(128,128,128,0.5)';
                el.style.textUnderlineOffset = '3px';
                el.title = '点击查看撤回的内容';
                el.onclick = (function(text) {
                    return function() { showRecallModal(text); };
                })(msg.recallText);
            }
        });
    }

    function setupObserver() {
        const container = document.getElementById('chat-container');
        if (!container) {
            setTimeout(setupObserver, 800);
            return;
        }
        if (container._recallEnhanceObs) return;
        container._recallEnhanceObs = true;

        const obs = new MutationObserver(function () {
            requestAnimationFrame(scan);
        });
        obs.observe(container, { childList: true, subtree: true });
        setTimeout(scan, 500);
    }

    window.openRecallSettings = function () {
        const old = document.getElementById('recall-settings-panel');
        if (old) old.remove();

        let curChance = 20;
        try { curChance = parseInt(localStorage.getItem(CHANCE_KEY) || '20', 10); } catch(e) {}

        const modal = document.createElement('div');
        modal.id = 'recall-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-undo" style="color:var(--accent-color);margin-right:8px;"></i>撤回设置</span>'
            +   '<button id="rs-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">对方发消息后，有概率撤回。撤回的消息可以点击查看原文。</div>'
            + '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 撤回概率</div>'
            +   '<div style="display:flex;align-items:center;gap:12px;">'
            +     '<input id="rs-chance" type="range" min="0" max="100" value="' + curChance + '" style="flex:1;accent-color:var(--accent-color);">'
            +     '<span id="rs-chance-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + curChance + '%</span>'
            +   '</div>'
            +   '<div style="font-size:11px;color:var(--text-secondary);margin-top:8px;opacity:0.75;line-height:1.6;">拖到 0% → 对方从不撤回；拖到 100% → 每条都撤</div>'
            + '</div>'
            + '<div style="display:flex;gap:10px;margin-top:16px;">'
            +   '<button id="rs-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +   '<button id="rs-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            + '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const chance = modal.querySelector('#rs-chance');
        const chanceVal = modal.querySelector('#rs-chance-val');
        chance.oninput = () => { chanceVal.textContent = chance.value + '%'; };

        const close = () => modal.remove();
        modal.querySelector('#rs-close').onclick = close;
        modal.querySelector('#rs-cancel').onclick = close;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });

        modal.querySelector('#rs-save').onclick = () => {
            try { localStorage.setItem(CHANCE_KEY, String(chance.value)); } catch(e) {}
            close();
            if (typeof window.refreshRecallChanceDesc === 'function') window.refreshRecallChanceDesc();
            if (typeof showNotification === 'function') showNotification('✓ 撤回概率已保存', 'success');
        };
    };

    window.refreshRecallChanceDesc = function () {
        const el = document.getElementById('recall-chance-desc');
        if (!el) return;
        let v = 20;
        try { v = parseInt(localStorage.getItem(CHANCE_KEY) || '20', 10); } catch(e) {}
        el.textContent = '当前 ' + v + '%（点击设置）';
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(setupObserver, 1000));
    } else {
        setTimeout(setupObserver, 1000);
    }
})();