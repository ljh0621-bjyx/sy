/* ============================================================
 * transfer.js - 转账（微信式可点击卡片）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('transferData_v1');
    const SETTINGS_KEY = getStorageKey('transferSettings_v1');

    let data = {
        myBalance: 1000,
        partnerBalance: 1000
    };

    let settingsT = {
        autoChance: 30,
        autoMinMin: 20,
        autoMaxMin: 60
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved && typeof saved === 'object') {
                if (typeof saved.myBalance === 'number') data.myBalance = saved.myBalance;
                if (typeof saved.partnerBalance === 'number') data.partnerBalance = saved.partnerBalance;
            }
            const savedS = await localforage.getItem(SETTINGS_KEY);
            if (savedS && typeof savedS === 'object') {
                if (typeof savedS.autoChance === 'number') settingsT.autoChance = savedS.autoChance;
                if (typeof savedS.autoMinMin === 'number') settingsT.autoMinMin = savedS.autoMinMin;
                if (typeof savedS.autoMaxMin === 'number') settingsT.autoMaxMin = savedS.autoMaxMin;
            }
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }
    async function saveSettings() {
        try { await localforage.setItem(SETTINGS_KEY, settingsT); } catch (e) {}
    }
    load();

    function fmtMoney(n) { return '¥' + Number(n).toFixed(2); }

    // ========== 渲染转账卡片（HTML） ==========
    window.renderTransferCardHTML = function (msg) {
        const t = msg.transfer;
        if (!t) return '';
        const isMe = msg.sender === 'user';
        const amount = Number(t.amount).toFixed(2);
        const note = t.note ? String(t.note).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

        // 状态文案
        let statusText = '';
        if (t.status === 'received') {
            statusText = isMe ? '已收款 ✓' : '已收款 ✓';
        } else if (isMe) {
            statusText = '待对方收款';
        } else {
            statusText = '点击收款 →';
        }

        // 我发的：橙色渐变；对方发的：白色卡片 + 橙色文字
        const cardBg = isMe
            ? 'background:linear-gradient(135deg,#FA9D3B 0%,#F58220 100%);color:#fff;box-shadow:0 4px 16px rgba(245,130,32,0.35);'
            : 'background:#FFF5EB;color:#F58220;border:1px solid rgba(245,130,32,0.3);box-shadow:0 2px 10px rgba(245,130,32,0.12);';

        const subColor = isMe ? 'rgba(255,255,255,0.75)' : 'rgba(245,130,32,0.65)';
        const noteColor = isMe ? 'rgba(255,255,255,0.85)' : 'rgba(120,80,40,0.7)';

        return '<div class="transfer-card" '
            + 'data-msg-id="' + msg.id + '" '
            + 'onclick="window._handleTransferClick(' + msg.id + ')" '
            + 'style="'
            +   'display:flex;flex-direction:column;gap:6px;'
            +   'padding:14px 16px;border-radius:14px;'
            +   'min-width:190px;max-width:240px;cursor:pointer;'
            +   'user-select:none;-webkit-tap-highlight-color:transparent;'
            +   'transition:transform 0.15s ease;'
            +   cardBg
            + '">'
            +   '<div style="display:flex;align-items:center;gap:6px;font-size:11px;opacity:0.85;letter-spacing:1px;">'
            +     '<i class="fas fa-exchange-alt" style="font-size:10px;"></i>'
            +     '<span>转账</span>'
            +   '</div>'
            +   '<div style="font-size:24px;font-weight:800;font-family:Georgia,serif;letter-spacing:0.5px;">¥' + amount + '</div>'
            +   (note ? '<div style="font-size:11.5px;line-height:1.5;color:' + noteColor + ';">' + note + '</div>' : '')
            +   '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-top:6px;padding-top:6px;border-top:1px dashed ' + (isMe ? 'rgba(255,255,255,0.25)' : 'rgba(245,130,32,0.2)') + ';">'
            +     '<span style="color:' + subColor + ';font-weight:600;">' + statusText + '</span>'
            +     '<span style="opacity:0.55;color:' + subColor + ';">微信转账</span>'
            +   '</div>'
            + '</div>';
    };

    // ========== 点击转账卡片 ==========
    window._handleTransferClick = async function (msgId) {
        const msg = (typeof messages !== 'undefined' ? messages : []).find(m => String(m.id) === String(msgId));
        if (!msg || !msg.transfer) return;

        const isMe = msg.sender === 'user';
        const t = msg.transfer;

        // 已收款 → 提示
        if (t.status === 'received') {
            if (typeof showNotification === 'function') showNotification('这笔转账已完成', 'info', 1500);
            return;
        }

        // 我发出的 → 等对方收
        if (isMe) {
            if (typeof showNotification === 'function') showNotification('等待对方收款中…', 'info', 1500);
            return;
        }

        // 对方发来的 → 我收款
        if (!confirm('确认收款 ' + fmtMoney(t.amount) + ' ？\n备注：' + (t.note || '无'))) return;

        t.status = 'received';

        // 增加我的余额
        data.myBalance = (data.myBalance || 0) + Number(t.amount);
        await save();

        if (typeof throttledSaveData === 'function') throttledSaveData();
        else if (typeof saveData === 'function') { try { await saveData(); } catch (e) {} }

        if (typeof renderMessages === 'function') renderMessages(true);
        if (typeof playSound === 'function') playSound('favorite');
        if (typeof showNotification === 'function') showNotification('✓ 已收款 ' + fmtMoney(t.amount), 'success', 2000);

        // 对方说一句话
        setTimeout(function () {
            const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(function (x) { return x && String(x).trim(); })
                : [];
            if (pool.length === 0) return;
            const reply = pool[Math.floor(Math.random() * pool.length)];
            const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: pn,
                    text: reply,
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal'
                });
            }
            if (typeof playSound === 'function') playSound('message');
        }, 1500 + Math.random() * 1500);
    };

    // ========== 发送转账消息 ==========
    function sendTransferMessage(sender, amount, note) {
        const id = Date.now() + Math.floor(Math.random() * 1000);

        addMessage({
            id: id,
            sender: sender,
            text: '',
            timestamp: new Date(),
            status: sender === 'user' ? 'sent' : 'received',
            type: 'transfer',
            transfer: {
                amount: Number(amount),
                note: note || '',
                status: 'pending'
            }
        });

        // 我发出的转账：几秒后对方自动收款
        if (sender === 'user') {
            const delay = 3000 + Math.random() * 4000;
            setTimeout(async () => {
                const target = (typeof messages !== 'undefined' ? messages : []).find(m => String(m.id) === String(id));
                if (!target || !target.transfer) return;
                if (target.transfer.status !== 'pending') return;

                target.transfer.status = 'received';
                data.partnerBalance = (data.partnerBalance || 0) + Number(amount);
                await save();

                if (typeof throttledSaveData === 'function') throttledSaveData();
                else if (typeof saveData === 'function') { try { await saveData(); } catch (e) {} }

                if (typeof renderMessages === 'function') renderMessages(true);
                if (typeof playSound === 'function') playSound('favorite');
                if (typeof showNotification === 'function') showNotification('对方已收款 ' + fmtMoney(amount), 'success', 2500);
            }, delay);
        }
    }
    window.sendTransferMessage = sendTransferMessage;

    // ========== 转账窗口 ==========
    window.openTransferPanel = function () {
        const old = document.getElementById('transfer-panel');
        if (old) old.remove();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        const modal = document.createElement('div');
        modal.id = 'transfer-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">'
            +       '<i class="fas fa-money-bill-wave" style="color:#F58220;margin-right:8px;"></i>转账给 ' + partnerName
            +     '</span>'
            +     '<div style="display:flex;gap:6px;align-items:center;">'
            +       '<button id="tp-settings" title="转账设置" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:4px 8px;"><i class="fas fa-cog"></i></button>'
            +       '<button id="tp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="fas fa-times"></i></button>'
            +     '</div>'
            +   '</div>'
            +   '<div style="background:linear-gradient(135deg,rgba(245,130,32,0.12),rgba(245,130,32,0.04));border-radius:14px;padding:14px 16px;margin-bottom:16px;border:1px solid rgba(245,130,32,0.2);">'
            +     '<div style="font-size:11px;color:var(--text-secondary);">我的余额</div>'
            +     '<div id="tp-my-balance" style="font-size:24px;font-weight:800;color:#F58220;margin-top:2px;">' + fmtMoney(data.myBalance) + '</div>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">金额</div>'
            +   '<div style="position:relative;margin-bottom:14px;">'
            +     '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:18px;font-weight:700;color:#F58220;">¥</span>'
            +     '<input id="tp-amount" type="number" step="0.01" min="0.01" placeholder="0.00" style="width:100%;box-sizing:border-box;padding:12px 14px 12px 34px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:16px;font-family:var(--font-family);outline:none;">'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">备注（可选）</div>'
            +   '<input id="tp-note" type="text" maxlength="30" placeholder="写点什么…" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:18px;">'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="tp-cancel" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="tp-confirm" style="flex:2;padding:12px;border:none;border-radius:12px;background:#F58220;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);">'
            +       '<i class="fas fa-paper-plane"></i> 转账'
            +     '</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#tp-close').onclick = close;
        modal.querySelector('#tp-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('#tp-amount').focus();

        modal.querySelector('#tp-settings').onclick = () => {
            close();
            window.openTransferSettings();
        };

        modal.querySelector('#tp-confirm').onclick = async () => {
            const amount = parseFloat(modal.querySelector('#tp-amount').value);
            const note = modal.querySelector('#tp-note').value.trim();

            if (!amount || amount <= 0) { showNotification('请输入有效的金额', 'warning'); return; }
            if (amount > data.myBalance) { showNotification('余额不足，还差 ' + fmtMoney(amount - data.myBalance), 'warning'); return; }

            data.myBalance -= amount;
            await save();
            close();
            sendTransferMessage('user', amount, note);
        };
    };

    // ========== 对方主动转账 ==========
    window._partnerRandomTransfer = async function () {
        await load();
        if (data.partnerBalance < 10) return false;
        const amount = Math.round((5 + Math.random() * 195) * 100) / 100;
        if (amount > data.partnerBalance) return false;

        const notes = [
            '请你喝奶茶 🧋', '给你买零食 🍬', '看到这个想起你',
            '拿去买喜欢的东西 💕', '今天也想对你好一点',
            '小小心意，别拒绝', '你收下我就开心了',
            '攒了好久，给你'
        ];
        const note = notes[Math.floor(Math.random() * notes.length)];
        data.partnerBalance -= amount;
        await save();

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        sendTransferMessage(partnerName, amount, note);
        return true;
    };

    // ========== 随机调度 ==========
    function scheduleRandomTransfer() {
        if (window._transferTimer) clearTimeout(window._transferTimer);
        const minMs = settingsT.autoMinMin * 60 * 1000;
        const maxMs = settingsT.autoMaxMin * 60 * 1000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
        window._transferTimer = setTimeout(async () => {
            try {
                if (Math.random() * 100 < settingsT.autoChance) {
                    const ok = await window._partnerRandomTransfer();
                    if (ok && typeof showNotification === 'function') {
                        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                        showNotification(pn + ' 给你转了一笔钱 💰', 'info', 3000);
                    }
                }
            } catch (e) {}
            scheduleRandomTransfer();
        }, delay);
    }
    setTimeout(scheduleRandomTransfer, 30000);

    window._rescheduleTransfer = function () {
        scheduleRandomTransfer();
    };

    // ========== 设置面板 ==========
    window.openTransferSettings = function () {
        const old = document.getElementById('transfer-settings-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'transfer-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:380px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-cog" style="color:#F58220;margin-right:8px;"></i>转账设置</span>'
            +     '<button id="ts-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px;margin-bottom:16px;border:1px solid var(--border-color);">'
            +     '<div style="font-size:12px;font-weight:700;color:#F58220;margin-bottom:10px;letter-spacing:0.5px;">💰 余额</div>'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">我的余额</div>'
            +     '<input id="ts-my" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:10px;">'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">对方余额</div>'
            +     '<input id="ts-partner" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;">'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px;margin-bottom:16px;border:1px solid var(--border-color);">'
            +     '<div style="font-size:12px;font-weight:700;color:#F58220;margin-bottom:10px;letter-spacing:0.5px;">📊 对方主动转账</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);flex-shrink:0;width:44px;">概率</span>'
            +       '<input id="ts-chance" type="range" min="0" max="100" step="1" style="flex:1;accent-color:#F58220;">'
            +       '<span id="ts-chance-val" style="font-size:13px;font-weight:700;color:#F58220;width:44px;text-align:right;">30%</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px;margin-bottom:18px;border:1px solid var(--border-color);">'
            +     '<div style="font-size:12px;font-weight:700;color:#F58220;margin-bottom:10px;letter-spacing:0.5px;">⏱ 转账间隔</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);flex-shrink:0;width:44px;">最短</span>'
            +       '<input id="ts-minmin" type="range" min="1" max="240" step="1" style="flex:1;accent-color:#F58220;">'
            +       '<span id="ts-minmin-val" style="font-size:13px;font-weight:700;color:#F58220;width:64px;text-align:right;">20分钟</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);flex-shrink:0;width:44px;">最长</span>'
            +       '<input id="ts-maxmin" type="range" min="1" max="480" step="1" style="flex:1;accent-color:#F58220;">'
            +       '<span id="ts-maxmin-val" style="font-size:13px;font-weight:700;color:#F58220;width:64px;text-align:right;">60分钟</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="ts-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="ts-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:#F58220;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const $ = (s) => modal.querySelector(s);
        $('#ts-my').value = data.myBalance;
        $('#ts-partner').value = data.partnerBalance;
        $('#ts-chance').value = settingsT.autoChance;
        $('#ts-chance-val').textContent = settingsT.autoChance + '%';
        $('#ts-minmin').value = settingsT.autoMinMin;
        $('#ts-minmin-val').textContent = settingsT.autoMinMin + '分钟';
        $('#ts-maxmin').value = settingsT.autoMaxMin;
        $('#ts-maxmin-val').textContent = settingsT.autoMaxMin + '分钟';

        $('#ts-chance').oninput = (e) => { $('#ts-chance-val').textContent = e.target.value + '%'; };
        $('#ts-minmin').oninput = (e) => { $('#ts-minmin-val').textContent = e.target.value + '分钟'; };
        $('#ts-maxmin').oninput = (e) => { $('#ts-maxmin-val').textContent = e.target.value + '分钟'; };

        const close = () => modal.remove();
        $('#ts-close').onclick = close;
        $('#ts-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        $('#ts-save').onclick = async () => {
            const my = parseFloat($('#ts-my').value);
            const partner = parseFloat($('#ts-partner').value);
            const chance = parseInt($('#ts-chance').value, 10);
            const minMin = parseInt($('#ts-minmin').value, 10);
            const maxMin = parseInt($('#ts-maxmin').value, 10);

            if (isNaN(my) || isNaN(partner) || my < 0 || partner < 0) {
                showNotification('请输入有效余额', 'warning');
                return;
            }
            if (minMin > maxMin) {
                showNotification('最短间隔不能大于最长间隔', 'warning');
                return;
            }

            data.myBalance = my;
            data.partnerBalance = partner;
            settingsT.autoChance = chance;
            settingsT.autoMinMin = minMin;
            settingsT.autoMaxMin = maxMin;

            await save();
            await saveSettings();
            close();
            if (typeof window._rescheduleTransfer === 'function') window._rescheduleTransfer();
            showNotification('✓ 转账设置已保存', 'success');
        };
    };

    // ========== 数据接口 ==========
    window.getTransferData = function () {
        return { myBalance: data.myBalance, partnerBalance: data.partnerBalance, settings: settingsT };
    };
    window.setTransferData = async function (d) {
        if (!d || typeof d !== 'object') return;
        if (typeof d.myBalance === 'number') data.myBalance = d.myBalance;
        if (typeof d.partnerBalance === 'number') data.partnerBalance = d.partnerBalance;
        if (d.settings && typeof d.settings === 'object') {
            if (typeof d.settings.autoChance === 'number') settingsT.autoChance = d.settings.autoChance;
            if (typeof d.settings.autoMinMin === 'number') settingsT.autoMinMin = d.settings.autoMinMin;
            if (typeof d.settings.autoMaxMin === 'number') settingsT.autoMaxMin = d.settings.autoMaxMin;
            await saveSettings();
        }
        await save();
    };
})();