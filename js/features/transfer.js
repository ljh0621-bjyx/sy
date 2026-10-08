/* ============================================================
 * transfer.js - 转账功能（Canvas 画卡片版 + 可调参数）
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'transferData_v1';
    const SETTINGS_KEY = 'transferSettings_v1';

    let data = {
        myBalance: 1000,
        partnerBalance: 1000
    };

    // 可调参数
    let settingsT = {
        autoChance: 30,     // 对方主动转账概率 0~100
        autoMinMin: 20,     // 最短间隔（分钟）
        autoMaxMin: 60      // 最长间隔（分钟）
    };

    // ========== 加载/保存 ==========
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

    // ========== 画转账卡片 ==========
    function drawTransferCard(amount, note, status) {
        const W = 480, H = 260;
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#FA9D3B');
        bg.addColorStop(1, '#F58220');
        ctx.fillStyle = bg;
        ctx.beginPath();
        const r = 24;
        ctx.moveTo(r, 0);
        ctx.lineTo(W - r, 0);
        ctx.quadraticCurveTo(W, 0, W, r);
        ctx.lineTo(W, H - r);
        ctx.quadraticCurveTo(W, H, W - r, H);
        ctx.lineTo(r, H);
        ctx.quadraticCurveTo(0, H, 0, H - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(48, 48, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F58220';
        ctx.font = 'bold 26px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', 48, 50);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 44px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(fmtMoney(amount), 90, 52);

        if (note) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '18px -apple-system, "PingFang SC", sans-serif';
            ctx.fillText(note, 36, 120);
        }

        const statusText = status === 'received' ? '已收款 ✓' : '待对方收款…';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '15px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(statusText, 36, H - 40);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '13px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText('微信转账', W - 28, H - 40);

        return canvas.toDataURL('image/png');
    }

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

        // 齿轮：打开设置
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

    // ========== 发送转账消息 ==========
    function sendTransferMessage(sender, amount, note) {
        const cardUrl = drawTransferCard(amount, note, sender === 'user' ? 'pending' : 'received');
        const id = Date.now() + Math.floor(Math.random() * 1000);

        addMessage({
            id: id,
            sender: sender,
            text: '',
            image: cardUrl,
            timestamp: new Date(),
            status: sender === 'user' ? 'sent' : 'received',
            type: 'normal',
            _transfer: { amount: amount, note: note, status: sender === 'user' ? 'pending' : 'received' }
        });

        if (sender === 'user') {
            const delay = 3000 + Math.random() * 4000;
            setTimeout(async () => {
                const target = messages.find(m => String(m.id) === String(id));
                if (!target) return;
                if (target._transfer && target._transfer.status === 'pending') {
                    target._transfer.status = 'received';
                    target.image = drawTransferCard(amount, note, 'received');
                    data.partnerBalance += amount;
                    await save();
                    if (typeof renderMessages === 'function') renderMessages(true);
                    if (typeof playSound === 'function') playSound('favorite');
                    if (typeof showNotification === 'function') {
                        showNotification('对方已收款 ' + fmtMoney(amount), 'success', 2500);
                    }
                }
            }, delay);
        }
    }
    window.sendTransferMessage = sendTransferMessage;

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

    // ========== 随机调度（按设置里的间隔） ==========
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

    // 参数改了之后，重新调度一次
    window._rescheduleTransfer = function () {
        scheduleRandomTransfer();
    };

    // ========== 设置面板（余额 + 概率 + 间隔） ==========
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

            // 余额
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px;margin-bottom:16px;border:1px solid var(--border-color);">'
            +     '<div style="font-size:12px;font-weight:700;color:#F58220;margin-bottom:10px;letter-spacing:0.5px;">💰 余额</div>'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">我的余额</div>'
            +     '<input id="ts-my" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:10px;">'
            +     '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">对方余额</div>'
            +     '<input id="ts-partner" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;">'
            +   '</div>'

            // 概率
            +   '<div style="background:var(--primary-bg);border-radius:14px;padding:14px;margin-bottom:16px;border:1px solid var(--border-color);">'
            +     '<div style="font-size:12px;font-weight:700;color:#F58220;margin-bottom:10px;letter-spacing:0.5px;">📊 对方主动转账</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);flex-shrink:0;width:44px;">概率</span>'
            +       '<input id="ts-chance" type="range" min="0" max="100" step="1" style="flex:1;accent-color:#F58220;">'
            +       '<span id="ts-chance-val" style="font-size:13px;font-weight:700;color:#F58220;width:44px;text-align:right;">30%</span>'
            +     '</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);opacity:0.75;">每次到间隔时间后，有该概率给你转账</div>'
            +   '</div>'

            // 间隔
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

        const $ = (id) => modal.querySelector(id);
        $ ('#ts-my').value = data.myBalance;
        $('#ts-partner').value = data.partnerBalance;
        $('#ts-chance').value = settingsT.autoChance;
        $('#ts-chance-val').textContent = settingsT.autoChance + '%';
        $('#ts-minmin').value = settingsT.autoMinMin;
        $('#ts-minmin-val').textContent = settingsT.autoMinMin + '分钟';
        $('#ts-maxmin').value = settingsT.autoMaxMin;
        $('#ts-maxmin-val').textContent = settingsT.autoMaxMin + '分钟';

        // 滑块实时显示
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
            const chance = parseInt($('#ts-chance').value);
            const minMin = parseInt($('#ts-minmin').value);
            const maxMin = parseInt($('#ts-maxmin').value);

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

            // 按新间隔重新调度
            if (typeof window._rescheduleTransfer === 'function') window._rescheduleTransfer();

            showNotification('✓ 转账设置已保存', 'success');
        };
    };

    // ========== 备份导入导出 ==========
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