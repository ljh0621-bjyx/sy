/* ============================================================
 * avatar-partner-self-change.js - 他换自己的头像
 * 从"TA 的头像池"（partnerAvatarPool_v1）里挑，换他自己的头像
 * ============================================================ */
(function () {
    'use strict';

    const LAST_KEY = () => getStorageKey('partnerSelfAvatarLastTime');

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }

    // ========== 拿 TA 的头像池 ==========
    async function getPartnerAvatarPool() {
        try {
            const pool = await localforage.getItem('partnerAvatarPool_v1');
            if (Array.isArray(pool)) return pool.filter(Boolean);
        } catch (e) {}
        return [];
    }

    // ========== 应用 TA 的头像 ==========
    async function applyPartnerAvatar(avatarData) {
        if (!avatarData) return;

        // 换 TA 自己的头像
        try {
            if (typeof updateAvatar === 'function' &&
                typeof DOMElements !== 'undefined' &&
                DOMElements.partner && DOMElements.partner.avatar) {
                updateAvatar(DOMElements.partner.avatar, avatarData);
            }
        } catch (e) {}

        try {
            await localforage.setItem(getStorageKey('partnerAvatar'), avatarData);
        } catch (e) {}

        // 更新历史
        try {
            const key = getStorageKey('avatarExchangeData_v1');
            const d = (await localforage.getItem(key)) || {};
            d.partnerAvatar = avatarData;
            d.history = d.history || [];
            d.history.unshift({
                type: 'partner_self',
                avatar: avatarData,
                accepted: true,
                time: Date.now()
            });
            d.history = d.history.slice(0, 50);
            await localforage.setItem(key, d);
        } catch (e) {}

        if (typeof throttledSaveData === 'function') throttledSaveData();
        if (typeof renderMessages === 'function') renderMessages(true);

        // 灰字系统提示
        const pn = getPartnerName();
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                text: pn + ' 换了张新头像',
                timestamp: new Date(),
                type: 'system'
            });
        }
        if (typeof showNotification === 'function') {
            showNotification('🖼 ' + pn + ' 换了张新头像', 'info', 2500);
        }
    }

    // ========== 执行一次换头像 ==========
    async function doChange(silent) {
        const pool = await getPartnerAvatarPool();
        if (pool.length === 0) {
            if (!silent && typeof showNotification === 'function') {
                showNotification('TA 的头像池是空的，先去"互换头像"上传几张', 'warning', 3000);
            }
            return false;
        }

        // 避免连续重复用同一张
        let cur = null;
        try {
            cur = await localforage.getItem(getStorageKey('partnerAvatar'));
        } catch (e) {}
        let candidates = pool;
        if (pool.length > 1 && cur) {
            candidates = pool.filter(function (p) { return p !== cur; });
            if (candidates.length === 0) candidates = pool;
        }

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        await applyPartnerAvatar(picked);
        try { localStorage.setItem(LAST_KEY(), String(Date.now())); } catch (e) {}
        return true;
    }
    window._partnerChangeOwnAvatar = doChange;

    // ========== 自动调度 ==========
    // 默认 40~90 分钟一次，概率触发
    function scheduleNext() {
        if (window._partnerSelfAvatarTimer) clearTimeout(window._partnerSelfAvatarTimer);
        const delay = (40 + Math.random() * 50) * 60 * 1000;  // 40~90 分钟
        window._partnerSelfAvatarTimer = setTimeout(async function () {
            try {
                if (Math.random() < 0.35) {
                    await doChange(true);
                }
            } catch (e) {
                console.warn('[partner-self-avatar] fail', e);
            }
            scheduleNext();
        }, delay);
    }

    // ========== 设置面板 ==========
    window.openPartnerSelfAvatarSettings = function () {
        const old = document.getElementById('psa-settings-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'psa-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-portrait" style="color:var(--accent-color);margin-right:8px;"></i>TA 换自己的头像</span>'
            +     '<button id="psa-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">'
            +     'TA 每隔一段时间，会从 <b style="color:var(--accent-color);">「TA 的头像池」</b> 里挑一张，换成自己的新头像。'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:12px 14px;margin-bottom:14px;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">当前 TA 的头像</div>'
            +     '<div id="psa-cur-avatar" style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--border-color);display:flex;align-items:center;justify-content:center;margin:0 auto;">'
            +       '<i class="fas fa-user" style="font-size:26px;color:var(--text-secondary);"></i>'
            +     '</div>'
            +   '</div>'
            +   '<button id="psa-test" style="width:100%;padding:12px;border:1.5px solid var(--accent-color);border-radius:12px;background:none;color:var(--accent-color);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);margin-bottom:10px;">'
            +     '<i class="fas fa-play"></i> 让他现在换一次'
            +   '</button>'
            +   '<button id="psa-save" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        // 显示当前头像
        try {
            const cur = document.querySelector('#partner-avatar img, [id*="partner-avatar"] img');
            const wrap = modal.querySelector('#psa-cur-avatar');
            if (cur && wrap) {
                wrap.innerHTML = '<img src="' + cur.src + '" style="width:100%;height:100%;object-fit:cover;">';
            }
        } catch (e) {}

        const close = () => modal.remove();
        modal.querySelector('#psa-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#psa-test').onclick = async () => {
            const ok = await doChange(false);
            if (ok) {
                close();
                if (typeof showNotification === 'function') showNotification('✓ 已更换', 'success', 1500);
            }
        };

        modal.querySelector('#psa-save').onclick = () => {
            close();
            if (typeof showNotification === 'function') showNotification('✓ 设置已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initPartnerSelfAvatar = function () {
        // 页面加载后 60 秒开始调度
        setTimeout(scheduleNext, 60000);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initPartnerSelfAvatar, 2000); });
    } else {
        setTimeout(window.initPartnerSelfAvatar, 2000);
    }

    console.log('[partner-self-avatar] TA 换自己头像已加载 ✓');
})();