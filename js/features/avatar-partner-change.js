/* ============================================================
 * avatar-partner-change.js - 他换我头像（从头像池）
 * 接管原 simulatePartnerAvatarRequest，改成从"我的头像池"里挑
 * ============================================================ */
(function () {
    'use strict';

    const APPROVAL_KEY = () => getStorageKey('avatarExchangeNeedApproval');

    function needApproval() {
        return localStorage.getItem(APPROVAL_KEY()) !== '0';   // 默认需要
    }

    async function getMyAvatarPool() {
        try {
            const pool = await localforage.getItem('myAvatarPool_v1');
            if (Array.isArray(pool)) return pool.filter(Boolean);
        } catch (e) {}
        return [];
    }

    async function applyAvatar(avatarData) {
        if (!avatarData) return;

        // 换我自己的头像
        if (typeof updateAvatar === 'function' &&
            typeof DOMElements !== 'undefined' &&
            DOMElements.me && DOMElements.me.avatar) {
            updateAvatar(DOMElements.me.avatar, avatarData);
        }
        try { await localforage.setItem(getStorageKey('myAvatar'), avatarData); } catch (e) {}

        // 更新历史
        try {
            const key = getStorageKey('avatarExchangeData_v1');
            const d = (await localforage.getItem(key)) || {};
            d.myAvatar = avatarData;
            d.history = d.history || [];
            d.history.unshift({ type: 'partner_to_me', avatar: avatarData, accepted: true, time: Date.now() });
            d.history = d.history.slice(0, 50);
            await localforage.setItem(key, d);
        } catch (e) {}

        if (typeof throttledSaveData === 'function') throttledSaveData();
        if (typeof renderMessages === 'function') renderMessages(true);

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                text: pn + ' 帮你换了张新头像',
                timestamp: new Date(),
                type: 'system'
            });
        }
        if (typeof showNotification === 'function') {
            showNotification('🎨 ' + pn + ' 帮你换了张头像', 'info', 3000);
        }
        if (typeof playSound === 'function') playSound('favorite');
    }

    // ========== 覆盖原函数 ==========
    function installOverride() {
        if (typeof window.simulatePartnerAvatarRequest !== 'function') {
            setTimeout(installOverride, 500);
            return;
        }
        if (window._partnerAvatarOverrideInstalled) return;
        window._partnerAvatarOverrideInstalled = true;

        window.simulatePartnerAvatarRequest = async function () {
            const pool = await getMyAvatarPool();
            if (pool.length === 0) {
                if (typeof showNotification === 'function') {
                    showNotification('你的头像池是空的，先去"互换头像"上传几张', 'warning', 3000);
                }
                return;
            }

            const avatarData = pool[Math.floor(Math.random() * pool.length)];

            // 不需要同意 → 直接换
            if (!needApproval()) {
                await applyAvatar(avatarData);
                return;
            }

            // 需要同意 → 弹窗
            const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            const old = document.getElementById('partner-avatar-request-modal');
            if (old) old.remove();

            const modal = document.createElement('div');
            modal.id = 'partner-avatar-request-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
            modal.innerHTML =
                '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:88%;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);">'
                + '<div style="width:60px;height:60px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
                +   '<i class="fas fa-portrait" style="font-size:24px;color:var(--accent-color);"></i>'
                + '</div>'
                + '<div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">换头像请求</div>'
                + '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">' + pn + ' 想帮你换一张头像</div>'
                + '<div style="margin-bottom:18px;">'
                +   '<img src="' + avatarData + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-color);">'
                + '</div>'
                + '<div style="display:flex;gap:10px;">'
                +   '<button id="pac-reject" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:14px;cursor:pointer;font-family:var(--font-family);">拒绝</button>'
                +   '<button id="pac-accept" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-family);">接受</button>'
                + '</div>'
                + '</div>';

            document.body.appendChild(modal);

            modal.querySelector('#pac-reject').onclick = async () => {
                modal.remove();
                try {
                    const key = getStorageKey('avatarExchangeData_v1');
                    const d = (await localforage.getItem(key)) || {};
                    d.history = d.history || [];
                    d.history.unshift({ type: 'partner_to_me', avatar: avatarData, accepted: false, time: Date.now() });
                    await localforage.setItem(key, d);
                } catch (e) {}
                if (typeof showNotification === 'function') showNotification('已拒绝', 'info', 1500);
            };
            modal.querySelector('#pac-accept').onclick = async () => {
                modal.remove();
                await applyAvatar(avatarData);
            };
        };

        console.log('[avatar-partner-change] 已接管"他换我头像"逻辑 ✓');
    }

    // ========== 设置面板 ==========
    window.openPartnerAvatarChangeSettings = function () {
        const old = document.getElementById('pac-settings-panel');
        if (old) old.remove();

        const cur = needApproval();

        const modal = document.createElement('div');
        modal.id = 'pac-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-portrait" style="color:var(--accent-color);margin-right:8px;"></i>他换我头像</span>'
            +     '<button id="pac-set-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">'
            +     '他每隔一段时间，会从 <b style="color:var(--accent-color);">「我的头像池」</b> 里挑一张，替换你的头像。'
            +   '</div>'
            +   '<div id="pac-approval-row" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:14px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
            +       '<i class="fas fa-check-circle" style="color:var(--accent-color);font-size:15px;"></i>'
            +     '</div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">换头像前先问我</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="pac-approval-status">' + (cur ? '已开启 — 弹窗确认' : '已关闭 — 直接换') + '</div>'
            +     '</div>'
            +     '<div id="pac-approval-pill" style="width:44px;height:24px;border-radius:24px;background:' + (cur ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="pac-approval-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (cur ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'
            +   '<button id="pac-test" style="width:100%;padding:12px;border:1.5px solid var(--accent-color);border-radius:12px;background:none;color:var(--accent-color);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);margin-bottom:12px;">'
            +     '<i class="fas fa-play"></i> 让他现在换一次'
            +   '</button>'
            +   '<button id="pac-set-save" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        let tempApproval = cur;
        const row = modal.querySelector('#pac-approval-row');
        row.onclick = () => {
            tempApproval = !tempApproval;
            const pill = modal.querySelector('#pac-approval-pill');
            const knob = modal.querySelector('#pac-approval-knob');
            const status = modal.querySelector('#pac-approval-status');
            pill.style.background = tempApproval ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = tempApproval ? '3px' : 'auto';
            knob.style.left = tempApproval ? 'auto' : '3px';
            status.textContent = tempApproval ? '已开启 — 弹窗确认' : '已关闭 — 直接换';
        };

        const close = () => modal.remove();
        modal.querySelector('#pac-set-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#pac-test').onclick = () => {
            localStorage.setItem(APPROVAL_KEY(), tempApproval ? '1' : '0');
            window.simulatePartnerAvatarRequest();
            close();
        };
        modal.querySelector('#pac-set-save').onclick = () => {
            localStorage.setItem(APPROVAL_KEY(), tempApproval ? '1' : '0');
            close();
            if (typeof showNotification === 'function') showNotification('✓ 设置已保存', 'success', 1500);
        };
    };

    // 启动
    function boot() {
        installOverride();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 1500));
    } else {
        setTimeout(boot, 1500);
    }

    console.log('[avatar-partner-change] 模块已加载 ✓');
})();