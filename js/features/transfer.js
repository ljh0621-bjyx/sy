/* ============================================================
 * transfer.js - 转账功能
 * 支持：双方转账、余额记录、待收款动画、随机主动转账、备份导入导出
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'transferData_v1';

    let data = {
        myBalance: 1000,       // 我的余额（可自定义）
        partnerBalance: 1000,  // 对方余额
        records: []            // 转账记录（备用）
    };

    // ========== 加载/保存 ==========
    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved && typeof saved === 'object') {
                data.myBalance = typeof saved.myBalance === 'number' ? saved.myBalance : 1000;
                data.partnerBalance = typeof saved.partnerBalance === 'number' ? saved.partnerBalance : 1000;
                data.records = Array.isArray(saved.records) ? saved.records : [];
            }
        } catch (e) { console.warn('[transfer] load fail', e); }
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) { console.warn('[transfer] save fail', e); }
    }
    load();

    // ========== 余额格式化 ==========
    function fmtMoney(n) {
        return '¥' + Number(n).toFixed(2);
    }

    // ========== 弹出转账窗口 ==========
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
            +       '<i class="fas fa-money-bill-wave" style="color:var(--accent-color);margin-right:8px;"></i>转账给 ' + partnerName
            +     '</span>'
            +     '<button id="tp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.12),rgba(var(--accent-color-rgb),0.04));border-radius:14px;padding:14px 16px;margin-bottom:16px;border:1px solid rgba(var(--accent-color-rgb),0.2);">'
            +     '<div style="font-size:11px;color:var(--text-secondary);">我的余额</div>'
            +     '<div id="tp-my-balance" style="font-size:24px;font-weight:800;color:var(--accent-color);margin-top:2px;">' + fmtMoney(data.myBalance) + '</div>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">金额</div>'
            +   '<div style="position:relative;margin-bottom:14px;">'
            +     '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:18px;font-weight:700;color:var(--accent-color);">¥</span>'
            +     '<input id="tp-amount" type="number" step="0.01" min="0.01" placeholder="0.00" style="width:100%;box-sizing:border-box;padding:12px 14px 12px 34px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:16px;font-family:var(--font-family);outline:none;">'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">备注（可选）</div>'
            +   '<input id="tp-note" type="text" maxlength="30" placeholder="写点什么…" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:18px;">'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="tp-cancel" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="tp-confirm" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-family);">'
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

        modal.querySelector('#tp-confirm').onclick = async () => {
            const amount = parseFloat(modal.querySelector('#tp-amount').value);
            const note = modal.querySelector('#tp-note').value.trim();

            if (!amount || amount <= 0) {
                showNotification('请输入有效的金额', 'warning');
                return;
            }
            if (amount > data.myBalance) {
                showNotification('余额不足，还差 ' + fmtMoney(amount - data.myBalance), 'warning');
                return;
            }

            // 扣款
            data.myBalance -= amount;
            await save();
            close();

            // 发消息
            sendTransferMessage('user', amount, note, partnerName);
        };
    };

    // ========== 发送转账消息 ==========
    function sendTransferMessage(sender, amount, note, partnerName) {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const msg = {
            id: id,
            sender: sender,                       // 'user' 或 对方名字
            type: 'transfer',
            text: '',
            transferAmount: amount,
            transferNote: note || '',
            transferStatus: sender === 'user' ? 'pending' : 'received',  // 我发的：待收款；对方发的：已收款
            timestamp: new Date(),
            status: 'sent'
        };
        addMessage(msg);

        if (sender === 'user') {
            // 模拟对方过几秒后收款
            const delay = 3000 + Math.random() * 4000;
            setTimeout(async () => {
                const target = messages.find(m => String(m.id) === String(id));
                if (!target) return;
                if (target.transferStatus === 'pending') {
                    target.transferStatus = 'received';
                    data.partnerBalance += amount;
                    await save();
                    renderMessages(true);
                    if (typeof playSound === 'function') playSound('favorite');
                    if (typeof showNotification === 'function') {
                        showNotification('对方已收款 ' + fmtMoney(amount), 'success', 2500);
                    }
                }
            }, delay);
        }
    }
    window.sendTransferMessage = sendTransferMessage;

    // ========== 对方主动转账（随机触发） ==========
    window._partnerRandomTransfer = async function () {
        await load();
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        if (data.partnerBalance < 10) return false;  // 对方余额太少，不转

        // 随机金额：5~200 之间，保留 2 位小数
        const amount = Math.round((5 + Math.random() * 195) * 100) / 100;
        if (amount > data.partnerBalance) return false;

        // 随机备注
        const notes = [
            '请你喝奶茶 🧋', '给你买零食 🍬', '看到这个想起你',
            '拿去买喜欢的东西 💕', '今天也想对你好一点',
            '小小心意，别拒绝', '你收下我就开心了',
            '攒了好久，给你'
        ];
        const note = notes[Math.floor(Math.random() * notes.length)];

        data.partnerBalance -= amount;
        await save();

        sendTransferMessage(partnerName, amount, note, partnerName);
        return true;
    };

    // ========== 启动随机转账（每 20~60 分钟一次，30% 概率） ==========
    function scheduleRandomTransfer() {
        if (window._transferTimer) clearTimeout(window._transferTimer);
        const delay = (20 + Math.random() * 40) * 60 * 1000;
        window._transferTimer = setTimeout(async () => {
            try {
                if (Math.random() < 0.3) {
                    const ok = await window._partnerRandomTransfer();
                    if (ok && typeof showNotification === 'function') {
                        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
                        showNotification(pn + ' 给你转了一笔钱 💰', 'info', 3000);
                    }
                }
            } catch (e) { console.warn('[transfer] random fail', e); }
            scheduleRandomTransfer();
        }, delay);
    }
    setTimeout(scheduleRandomTransfer, 60000);  // 1 分钟后开始第一次调度

    // ========== 设置初始余额面板 ==========
    window.openTransferSettings = function () {
        const old = document.getElementById('transfer-settings-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'transfer-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:90%;max-width:360px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-cog" style="color:var(--accent-color);margin-right:8px;"></i>转账设置</span>'
            +     '<button id="ts-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">我的余额</div>'
            +   '<input id="ts-my" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:14px;">'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">对方余额</div>'
            +   '<input id="ts-partner" type="number" step="0.01" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;margin-bottom:18px;">'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="ts-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="ts-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        modal.querySelector('#ts-my').value = data.myBalance;
        modal.querySelector('#ts-partner').value = data.partnerBalance;

        const close = () => modal.remove();
        modal.querySelector('#ts-close').onclick = close;
        modal.querySelector('#ts-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#ts-save').onclick = async () => {
            const my = parseFloat(modal.querySelector('#ts-my').value);
            const partner = parseFloat(modal.querySelector('#ts-partner').value);
            if (isNaN(my) || isNaN(partner) || my < 0 || partner < 0) {
                showNotification('请输入有效金额', 'warning');
                return;
            }
            data.myBalance = my;
            data.partnerBalance = partner;
            await save();
            close();
            showNotification('✓ 余额已保存', 'success');
        };
    };

    // ========== 供备份导入导出使用 ==========
    window.getTransferData = function () { return data; };
    window.setTransferData = async function (d) {
        if (!d || typeof d !== 'object') return;
        if (typeof d.myBalance === 'number') data.myBalance = d.myBalance;
        if (typeof d.partnerBalance === 'number') data.partnerBalance = d.partnerBalance;
        if (Array.isArray(d.records)) data.records = d.records;
        await save();
    };
})();