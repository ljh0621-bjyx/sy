/**
 * avatar-exchange.js
 */
 // ★ 必须放在最前面，解决 updateAvatar 未定义报错
window.updateAvatar = window.updateAvatar || function(element, src) {
    if (!element) return;
    if (src) {
        element.innerHTML = '<img src="' + src + '" alt="avatar">';
    } else {
        element.innerHTML = '<i class="fas fa-user"></i>';
    }
};
(function () {
    'use strict';

    const KEY = 'avatarExchangeData_v1';
    let exchangeData = { myAvatar: null, partnerAvatar: null, pendingRequest: null, history: [] };

    async function loadData() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) exchangeData = Object.assign(exchangeData, saved);
        } catch (e) { console.warn('[avatar-exchange] load fail', e); }
    }

    async function saveData() {
        try { await localforage.setItem(KEY, exchangeData); }
        catch (e) { console.warn('[avatar-exchange] save fail', e); }
    }

    window.simulatePartnerAvatarRequest = async function () {
        if (exchangeData.pendingRequest && exchangeData.pendingRequest.from === 'partner') {
            showNotification('已有待处理的请求', 'warning'); return;
        }
        let avatarData = null;
        if (typeof myStickerLibrary !== 'undefined' && myStickerLibrary.length > 0) {
            avatarData = myStickerLibrary[Math.floor(Math.random() * myStickerLibrary.length)];
        } else {
            avatarData = generateFallbackAvatar();
        }
        exchangeData.pendingRequest = { from: 'partner', avatar: avatarData, timestamp: Date.now() };
        await saveData();
        showPartnerRequestModal(avatarData);
    };

    function generateFallbackAvatar() {
        const colors = ['#F4A6B3', '#7FA6CD', '#BB9EC7', '#7BC8A4', '#FF9A8B'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = c; ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 90px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((settings.partnerName || 'M')[0], 100, 110);
        return canvas.toDataURL('image/jpeg', 0.85);
    }

    function showPartnerRequestModal(avatarData) {
        const old = document.getElementById('avatar-exchange-request-modal');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'avatar-exchange-request-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);">'
            + '<div style="width:60px;height:60px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">'
            + '<i class="fas fa-exchange-alt" style="font-size:24px;color:var(--accent-color);"></i></div>'
            + '<div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">头像交换请求</div>'
            + '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">' + settings.partnerName + ' 想要更换你的头像</div>'
            + (avatarData ? '<div style="margin-bottom:16px;"><img src="' + avatarData + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-color);"></div>' : '')
            + '<div style="display:flex;gap:10px;">'
            + '<button id="reject-avatar-exchange" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:14px;cursor:pointer;font-family:var(--font-family);">拒绝</button>'
            + '<button id="accept-avatar-exchange" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-family);">接受</button>'
            + '</div></div>';
        document.body.appendChild(modal);

        document.getElementById('reject-avatar-exchange').onclick = async () => {
            modal.remove();
            exchangeData.pendingRequest = null;
            exchangeData.history.unshift({ type: 'partner_to_me', avatar: avatarData, accepted: false, time: Date.now() });
            await saveData();
            showNotification('已拒绝头像更换请求', 'info');
            addMessage({ id: Date.now(), text: '你拒绝了 ' + settings.partnerName + ' 的头像更换请求', timestamp: new Date(), type: 'system' });
        };

        document.getElementById('accept-avatar-exchange').onclick = async () => {
            modal.remove();
            if (avatarData) {
                updateAvatar(DOMElements.me.avatar, avatarData);
                exchangeData.myAvatar = avatarData;
                try { await localforage.setItem(getStorageKey('myAvatar'), avatarData); } catch (e) {}
            }
            exchangeData.pendingRequest = null;
            exchangeData.history.unshift({ type: 'partner_to_me', avatar: avatarData, accepted: true, time: Date.now() });
            await saveData();
            throttledSaveData();
            showNotification('已接受头像更换', 'success');
            addMessage({ id: Date.now(), text: '你接受了 ' + settings.partnerName + ' 的头像更换请求', timestamp: new Date(), type: 'system' });
        };
    }

    /* ========================================================
     * 互换头像面板（头像池独立 + 单删 / 批删 / 清空 + 持久化）
     * ======================================================== */
    window.openAvatarExchangePanel = function () {
        const old = document.getElementById('avatar-exchange-panel');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'avatar-exchange-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:22px;width:92%;max-width:440px;max-height:92vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-exchange-alt" style="color:var(--accent-color);"></i>
                    </div>
                    <span style="font-size:16px;font-weight:700;color:var(--text-primary);">互换头像</span>
                </div>
                <button id="close-avatar-exchange" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
            </div>

            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;background:var(--primary-bg);border-radius:14px;padding:12px 8px;border:1px solid var(--border-color);">
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">TA 的头像</div>
                    <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--border-color);display:flex;align-items:center;justify-content:center;" id="avatar-panel-partner">
                        <i class="fas fa-user" style="font-size:26px;color:var(--text-secondary);"></i>
                    </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:center;color:var(--text-secondary);">
                    <i class="fas fa-arrow-right-arrow-left" style="font-size:15px;"></i>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;background:var(--primary-bg);border-radius:14px;padding:12px 8px;border:1px solid var(--border-color);">
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">我的头像</div>
                    <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--border-color);display:flex;align-items:center;justify-content:center;" id="avatar-panel-me">
                        <i class="fas fa-user" style="font-size:26px;color:var(--text-secondary);"></i>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="font-size:12px;font-weight:600;color:var(--text-primary);">TA 的头像池 <span id="partner-batch-count" style="opacity:0.6;font-weight:400;">(0)</span></div>
                    <div style="display:flex;gap:6px;">
                        <button id="btn-upload-partner-avatar" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:14px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-plus"></i> 上传</button>
                        <button id="btn-batch-partner" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:14px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">批量</button>
                        <button id="btn-clear-partner" style="padding:4px 10px;border:1px solid rgba(255,71,87,0.3);border-radius:14px;background:none;color:#ff4757;font-size:11px;cursor:pointer;font-family:var(--font-family);">清空</button>
                    </div>
                </div>
                <div id="partner-batch-list" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;min-height:52px;padding:8px;background:var(--primary-bg);border-radius:10px;border:1px dashed var(--border-color);"></div>
                <input type="file" id="file-partner-avatar" accept="image/*" multiple style="display:none;">
            </div>

            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="font-size:12px;font-weight:600;color:var(--text-primary);">我的头像池 <span id="my-batch-count" style="opacity:0.6;font-weight:400;">(0)</span></div>
                    <div style="display:flex;gap:6px;">
                        <button id="btn-upload-my-avatar" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:14px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-plus"></i> 上传</button>
                        <button id="btn-batch-my" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:14px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">批量</button>
                        <button id="btn-clear-my" style="padding:4px 10px;border:1px solid rgba(255,71,87,0.3);border-radius:14px;background:none;color:#ff4757;font-size:11px;cursor:pointer;font-family:var(--font-family);">清空</button>
                    </div>
                </div>
                <div id="my-batch-list" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;min-height:52px;padding:8px;background:var(--primary-bg);border-radius:10px;border:1px dashed var(--border-color);"></div>
                <input type="file" id="file-my-avatar" accept="image/*" multiple style="display:none;">
            </div>

            <div id="batch-actions-bar" style="display:none;margin-bottom:12px;padding:8px 12px;background:rgba(255,71,87,0.08);border-radius:10px;align-items:center;gap:10px;">
                <span style="font-size:12px;color:var(--text-primary);flex:1;">批量模式：<span id="batch-selected-count">0</span> 张已选</span>
                <button id="btn-cancel-batch" style="padding:5px 12px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">取消</button>
                <button id="btn-confirm-batch-del" style="padding:5px 12px;border:none;border-radius:10px;background:#ff4757;color:#fff;font-size:12px;cursor:pointer;font-family:var(--font-family);">删除所选</button>
            </div>

            <div style="font-size:11px;color:var(--text-secondary);text-align:center;margin-bottom:12px;opacity:0.75;line-height:1.5;">TA 池的图只用于换 TA 的头像；我的池的图只用于换我的头像。<br>点击任意头像即可直接更换</div>

            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="close-avatar-exchange-2" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--primary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">关闭</button>
            </div>
        </div>`;
        document.body.appendChild(modal);

        const updateAvatars = () => {
            const partnerImg = DOMElements.partner.avatar.querySelector('img');
            const myImg = DOMElements.me.avatar.querySelector('img');
            const pp = document.getElementById('avatar-panel-partner');
            const pm = document.getElementById('avatar-panel-me');
            if (partnerImg) pp.innerHTML = '<img src="' + partnerImg.src + '" style="width:100%;height:100%;object-fit:cover;">';
            else pp.innerHTML = '<i class="fas fa-user" style="font-size:26px;color:var(--text-secondary);"></i>';
            if (myImg) pm.innerHTML = '<img src="' + myImg.src + '" style="width:100%;height:100%;object-fit:cover;">';
            else pm.innerHTML = '<i class="fas fa-user" style="font-size:26px;color:var(--text-secondary);"></i>';
        };
        updateAvatars();

        let batchPartnerAvatars = [];
        let batchMyAvatars = [];
        let partnerBatchMode = false;
        let myBatchMode = false;
        let partnerSelected = new Set();
        let mySelected = new Set();

        const persistPools = () => {
            try {
                localforage.setItem('partnerAvatarPool_v1', batchPartnerAvatars).catch(function () {});
                localforage.setItem('myAvatarPool_v1', batchMyAvatars).catch(function () {});
            } catch (e) {}
        };

        const close = () => {
            persistPools();
            modal.remove();
        };
        document.getElementById('close-avatar-exchange').onclick = close;
        document.getElementById('close-avatar-exchange-2').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        const updateBatchBar = () => {
            const total = partnerSelected.size + mySelected.size;
            const bar = document.getElementById('batch-actions-bar');
            document.getElementById('batch-selected-count').textContent = total;
            bar.style.display = (partnerBatchMode || myBatchMode) ? 'flex' : 'none';
        };

        const renderBatchList = (list, containerId, countId, which) => {
            const container = document.getElementById(containerId);
            const countEl = document.getElementById(countId);
            if (countEl) countEl.textContent = '(' + list.length + ')';

            if (list.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;font-size:10px;color:var(--text-secondary);opacity:0.5;padding:8px 0;">暂无头像</div>';
                return;
            }

            const isBatch = (which === 'partner') ? partnerBatchMode : myBatchMode;
            const selected = (which === 'partner') ? partnerSelected : mySelected;

            container.innerHTML = list.map((src, i) => {
                const isSel = isBatch && selected.has(i);
                return '<div data-idx="' + i + '" data-which="' + which + '" style="position:relative;width:100%;aspect-ratio:1/1;border-radius:8px;overflow:hidden;background:var(--border-color);cursor:pointer;' + (isSel ? 'outline:3px solid var(--accent-color);outline-offset:-3px;' : '') + '">'
                    + '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;">'
                    + (isBatch
                        ? '<div style="position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:' + (isSel ? 'var(--accent-color)' : 'rgba(0,0,0,0.4)') + ';color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;">' + (isSel ? '✓' : '') + '</div>'
                        : '<button class="batch-del-btn" data-idx="' + i + '" data-which="' + which + '" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(255,71,87,0.95);color:#fff;font-size:12px;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;">×</button>')
                    + '</div>';
            }).join('');

            container.querySelectorAll('[data-idx]').forEach(el => {
                el.onclick = async (e) => {
                    if (e.target.closest('.batch-del-btn')) return;

                    const idx = parseInt(el.dataset.idx, 10);
                    const w = el.dataset.which;

                    if (w === 'partner' && partnerBatchMode) {
                        if (partnerSelected.has(idx)) partnerSelected.delete(idx); else partnerSelected.add(idx);
                        renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
                        updateBatchBar();
                        return;
                    }
                    if (w === 'my' && myBatchMode) {
                        if (mySelected.has(idx)) mySelected.delete(idx); else mySelected.add(idx);
                        renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
                        updateBatchBar();
                        return;
                    }

                    if (w === 'partner' && !partnerBatchMode) {
                        const src = batchPartnerAvatars[idx];
                        if (!src) return;
                        updateAvatar(DOMElements.partner.avatar, src);
                        try { await localforage.setItem(getStorageKey('partnerAvatar'), src); } catch(err) {}
                        if (typeof showNotification === 'function') showNotification('已更换 ' + settings.partnerName + ' 的头像', 'success');
                        if (typeof updateAvatars === 'function') updateAvatars();
                        if (typeof throttledSaveData === 'function') throttledSaveData();
                        return;
                    }
                    if (w === 'my' && !myBatchMode) {
                        const src = batchMyAvatars[idx];
                        if (!src) return;
                        updateAvatar(DOMElements.me.avatar, src);
                        try { await localforage.setItem(getStorageKey('myAvatar'), src); } catch(err) {}
                        if (typeof showNotification === 'function') showNotification('已更换你的头像', 'success');
                        if (typeof updateAvatars === 'function') updateAvatars();
                        if (typeof throttledSaveData === 'function') throttledSaveData();
                        return;
                    }
                };
            });

            container.querySelectorAll('.batch-del-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.idx, 10);
                    const w = btn.dataset.which;
                    if (w === 'partner') {
                        batchPartnerAvatars.splice(idx, 1);
                        partnerSelected.clear();
                        renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
                    } else {
                        batchMyAvatars.splice(idx, 1);
                        mySelected.clear();
                        renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
                    }
                    persistPools();
                };
            });
        };

        renderBatchList([], 'partner-batch-list', 'partner-batch-count', 'partner');
        renderBatchList([], 'my-batch-list', 'my-batch-count', 'my');

        (async () => {
            try {
                const sp = await localforage.getItem('partnerAvatarPool_v1');
                const sm = await localforage.getItem('myAvatarPool_v1');
                if (Array.isArray(sp) && sp.length > 0) {
                    batchPartnerAvatars = sp;
                    renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
                    const pp = document.getElementById('avatar-panel-partner');
                    if (pp) pp.innerHTML = '<img src="' + batchPartnerAvatars[0] + '" style="width:100%;height:100%;object-fit:cover;">';
                }
                if (Array.isArray(sm) && sm.length > 0) {
                    batchMyAvatars = sm;
                    renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
                    const pm = document.getElementById('avatar-panel-me');
                    if (pm) pm.innerHTML = '<img src="' + batchMyAvatars[0] + '" style="width:100%;height:100%;object-fit:cover;">';
                }
            } catch (e) {}
        })();

        document.getElementById('btn-clear-partner').onclick = () => {
            if (batchPartnerAvatars.length === 0) { showNotification('TA 的头像池已经是空的', 'info'); return; }
            if (!confirm('清空 TA 头像池中的 ' + batchPartnerAvatars.length + ' 张头像？')) return;
            batchPartnerAvatars = [];
            partnerSelected.clear();
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            persistPools();
            showNotification('✓ 已清空 TA 的头像池', 'success');
        };
        document.getElementById('btn-clear-my').onclick = () => {
            if (batchMyAvatars.length === 0) { showNotification('我的头像池已经是空的', 'info'); return; }
            if (!confirm('清空我的头像池中的 ' + batchMyAvatars.length + ' 张头像？')) return;
            batchMyAvatars = [];
            mySelected.clear();
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            persistPools();
            showNotification('✓ 已清空我的头像池', 'success');
        };

        document.getElementById('btn-batch-partner').onclick = () => {
            if (batchPartnerAvatars.length === 0) { showNotification('TA 的头像池为空', 'info'); return; }
            partnerBatchMode = !partnerBatchMode;
            partnerSelected.clear();
            if (myBatchMode) { myBatchMode = false; mySelected.clear(); }
            document.getElementById('btn-batch-partner').textContent = partnerBatchMode ? '完成' : '批量';
            document.getElementById('btn-batch-partner').style.borderColor = partnerBatchMode ? 'var(--accent-color)' : 'var(--border-color)';
            document.getElementById('btn-batch-partner').style.color = partnerBatchMode ? 'var(--accent-color)' : 'var(--text-secondary)';
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            updateBatchBar();
        };
        document.getElementById('btn-batch-my').onclick = () => {
            if (batchMyAvatars.length === 0) { showNotification('我的头像池为空', 'info'); return; }
            myBatchMode = !myBatchMode;
            mySelected.clear();
            if (partnerBatchMode) { partnerBatchMode = false; partnerSelected.clear(); }
            document.getElementById('btn-batch-my').textContent = myBatchMode ? '完成' : '批量';
            document.getElementById('btn-batch-my').style.borderColor = myBatchMode ? 'var(--accent-color)' : 'var(--border-color)';
            document.getElementById('btn-batch-my').style.color = myBatchMode ? 'var(--accent-color)' : 'var(--text-secondary)';
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            updateBatchBar();
        };

        document.getElementById('btn-cancel-batch').onclick = () => {
            partnerBatchMode = false; myBatchMode = false;
            partnerSelected.clear(); mySelected.clear();
            document.getElementById('btn-batch-partner').textContent = '批量';
            document.getElementById('btn-batch-partner').style.borderColor = 'var(--border-color)';
            document.getElementById('btn-batch-partner').style.color = 'var(--text-secondary)';
            document.getElementById('btn-batch-my').textContent = '批量';
            document.getElementById('btn-batch-my').style.borderColor = 'var(--border-color)';
            document.getElementById('btn-batch-my').style.color = 'var(--text-secondary)';
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            updateBatchBar();
        };

        document.getElementById('btn-confirm-batch-del').onclick = () => {
            const total = partnerSelected.size + mySelected.size;
            if (total === 0) { showNotification('请先选择要删除的图', 'warning'); return; }
            if (!confirm('删除所选 ' + total + ' 张头像？')) return;
            const pIdx = Array.from(partnerSelected).sort((a,b) => b-a);
            pIdx.forEach(i => batchPartnerAvatars.splice(i, 1));
            const mIdx = Array.from(mySelected).sort((a,b) => b-a);
            mIdx.forEach(i => batchMyAvatars.splice(i, 1));
            partnerSelected.clear(); mySelected.clear();
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            updateBatchBar();
            persistPools();
            showNotification('✓ 已删除 ' + total + ' 张', 'success');
        };

        document.getElementById('btn-upload-partner-avatar').onclick = () => document.getElementById('file-partner-avatar').click();
        document.getElementById('file-partner-avatar').onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            showNotification('正在处理 ' + files.length + ' 张...', 'info');
            for (const file of files) {
                if (file.size > 2 * 1024 * 1024) { showNotification(file.name + ' 超过2MB，已跳过', 'warning'); continue; }
                try { batchPartnerAvatars.push(await cropImageToSquare(file, 300)); } catch (err) { console.error(err); }
            }
            renderBatchList(batchPartnerAvatars, 'partner-batch-list', 'partner-batch-count', 'partner');
            if (batchPartnerAvatars.length > 0) {
                document.getElementById('avatar-panel-partner').innerHTML = '<img src="' + batchPartnerAvatars[0] + '" style="width:100%;height:100%;object-fit:cover;">';
            }
            persistPools();
            e.target.value = '';
        };

        document.getElementById('btn-upload-my-avatar').onclick = () => document.getElementById('file-my-avatar').click();
        document.getElementById('file-my-avatar').onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            showNotification('正在处理 ' + files.length + ' 张...', 'info');
            for (const file of files) {
                if (file.size > 2 * 1024 * 1024) { showNotification(file.name + ' 超过2MB，已跳过', 'warning'); continue; }
                try { batchMyAvatars.push(await cropImageToSquare(file, 300)); } catch (err) { console.error(err); }
            }
            renderBatchList(batchMyAvatars, 'my-batch-list', 'my-batch-count', 'my');
            if (batchMyAvatars.length > 0) {
                document.getElementById('avatar-panel-me').innerHTML = '<img src="' + batchMyAvatars[0] + '" style="width:100%;height:100%;object-fit:cover;">';
            }
            persistPools();
            e.target.value = '';
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadData);
    } else {
        loadData();
    }

})();
