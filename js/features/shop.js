/**
 * shop.js
 * 商城功能
 */

(function () {
    'use strict';

    const KEY = getStorageKey('shopData_v1');

    const DEFAULT_ITEMS = [
        { id: 'g1',  name: '一束玫瑰',   price: 50,   icon: '🌹', category: 'flower' },
        { id: 'g2',  name: '一盒巧克力', price: 80,   icon: '🍫', category: 'food' },
        { id: 'g3',  name: '一杯奶茶',   price: 30,   icon: '🧋', category: 'drink' },
        { id: 'g4',  name: '一颗糖',     price: 10,   icon: '🍬', category: 'food' },
        { id: 'g5',  name: '一个拥抱',   price: 0,    icon: '🤗', category: 'love' },
        { id: 'g6',  name: '一句情话',   price: 0,    icon: '💌', category: 'love' },
        { id: 'g7',  name: '一整天陪伴', price: 200,  icon: '👫', category: 'time' },
        { id: 'g8',  name: '一个吻',     price: 0,    icon: '💋', category: 'love' },
        { id: 'g9',  name: '生日蛋糕',   price: 150,  icon: '🎂', category: 'food' },
        { id: 'g10', name: '星星',       price: 500,  icon: '⭐', category: 'special' },
        { id: 'g11', name: '月亮',       price: 999,  icon: '🌙', category: 'special' },
        { id: 'g12', name: '戒指',       price: 1314, icon: '💍', category: 'special' }
    ];

    let data = {
        items: [],
        myBalance: 1000,
        partnerBalance: 1000,
        history: []
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) {
                data = Object.assign(data, saved);
                if (!data.items || data.items.length === 0) data.items = [...DEFAULT_ITEMS];
            } else {
                data.items = [...DEFAULT_ITEMS];
                await save();
            }
        } catch (e) { console.warn('[shop] load fail', e); }
    }
    async function save() {
        try {
            await localforage.setItem(KEY, data);
        } catch (e) { console.warn('[shop] save fail', e); }
    }

    // ---------- 购买 ----------
    window.buyGift = async function (itemId, target) {
        const item = data.items.find(i => i.id === itemId);
        if (!item) return;

        if (data.myBalance < item.price) {
            showNotification('金币不足，还差 ' + (item.price - data.myBalance) + ' 金币', 'warning');
            return;
        }

        // 确认
        const confirmText = target === 'partner'
            ? '花 ' + item.price + ' 金币给 ' + settings.partnerName + ' 送「' + item.name + '」？'
            : '花 ' + item.price + ' 金币给自己买「' + item.name + '」？';
        if (!confirm(confirmText)) return;

        data.myBalance -= item.price;
        data.history.unshift({ itemId, itemName: item.name, itemIcon: item.icon, price: item.price, target, time: Date.now() });

        if (target === 'partner') {
            addMessage({
                id: Date.now(),
                sender: 'user',
                text: '🎁 我送了你一份礼物：' + item.icon + ' ' + item.name + '（花费 ' + item.price + ' 金币）',
                timestamp: new Date(),
                type: 'normal'
            });
            showNotification('已送出 ' + item.name, 'success');

            // TA 有概率回赠
            if (Math.random() < 0.4) {
                const delay = 3000 + Math.random() * 5000;
                setTimeout(async () => {
                    const partnerGift = data.items[Math.floor(Math.random() * data.items.length)];
                    addMessage({
                        id: Date.now(),
                        sender: settings.partnerName,
                        text: '🎁 我送了你一份礼物：' + partnerGift.icon + ' ' + partnerGift.name,
                        timestamp: new Date(),
                        type: 'normal'
                    });
                    playSound('message');
                    data.history.unshift({ itemId: partnerGift.id, itemName: partnerGift.name, itemIcon: partnerGift.icon, price: 0, target: 'me', time: Date.now() });
                    await save();
                }, delay);
            }
        } else {
            addMessage({
                id: Date.now(),
                text: '🛍️ 我给自己买了一份礼物：' + item.icon + ' ' + item.name + '（花费 ' + item.price + ' 金币）',
                timestamp: new Date(),
                type: 'system'
            });
            showNotification('已购买 ' + item.name, 'success');
        }

        await save();
        renderShopUI();
    };

    // ---------- 充值（测试用） ----------
    window.rechargeCoins = async function (amount) {
        data.myBalance += amount;
        await save();
        renderShopUI();
        showNotification('已充值 ' + amount + ' 金币', 'success');
    };

    // ---------- 渲染商城 UI ----------
    function renderShopUI() {
        const container = document.getElementById('shop-container');
        if (!container) return;

        const pName = (settings.partnerName) || 'TA';

        const itemsHTML = data.items.map(item => {
            const canAfford = data.myBalance >= item.price;
            return '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;text-align:center;transition:all 0.2s;">'
                + '<div style="font-size:36px;margin-bottom:8px;">' + item.icon + '</div>'
                + '<div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">' + item.name + '</div>'
                + '<div style="font-size:12px;color:var(--accent-color);font-weight:700;margin-bottom:10px;">' + (item.price > 0 ? item.price + ' 金币' : '免费') + '</div>'
                + '<div style="display:flex;gap:6px;">'
                + '<button data-buy="' + item.id + '" data-target="me" style="flex:1;padding:6px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:10px;cursor:pointer;font-family:var(--font-family);' + (canAfford ? '' : 'opacity:0.4;') + '">自用</button>'
                + '<button data-buy="' + item.id + '" data-target="partner" style="flex:1;padding:6px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:10px;cursor:pointer;font-family:var(--font-family);' + (canAfford ? '' : 'opacity:0.4;') + '">送TA</button>'
                + '</div></div>';
        }).join('');

        container.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.14),rgba(var(--accent-color-rgb),0.04));border-radius:14px;border:1px solid rgba(var(--accent-color-rgb),0.2);">'
            + '<div>'
            + '<div style="font-size:11px;color:var(--text-secondary);">我的余额</div>'
            + '<div style="font-size:22px;font-weight:800;color:var(--accent-color);">' + data.myBalance + ' <span style="font-size:12px;font-weight:500;">金币</span></div>'
            + '</div>'
            + '<div style="text-align:right;">'
            + '<div style="font-size:11px;color:var(--text-secondary);">' + pName + ' 的余额</div>'
            + '<div style="font-size:16px;font-weight:700;color:var(--text-primary);">' + data.partnerBalance + ' <span style="font-size:10px;">金币</span></div>'
            + '</div>'
            + '</div>'

            + '<div style="display:flex;gap:6px;margin-bottom:14px;">'
            + '<button id="recharge-100" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">+100</button>'
            + '<button id="recharge-500" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">+500</button>'
            + '<button id="recharge-1000" style="flex:1;padding:8px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">+1000</button>'
            + '</div>'

            + '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">'
            + itemsHTML
            + '</div>';

        // 绑定购买按钮
        container.querySelectorAll('[data-buy]').forEach(btn => {
            btn.onclick = () => {
                window.buyGift(btn.dataset.buy, btn.dataset.target);
            };
        });
        // 充值按钮
        const r100 = document.getElementById('recharge-100');
        if (r100) r100.onclick = () => window.rechargeCoins(100);
        const r500 = document.getElementById('recharge-500');
        if (r500) r500.onclick = () => window.rechargeCoins(500);
        const r1000 = document.getElementById('recharge-1000');
        if (r1000) r1000.onclick = () => window.rechargeCoins(1000);
    }

    // ---------- 打开商城面板 ----------
    window.openShopPanel = function () {
        const old = document.getElementById('shop-panel');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'shop-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:92%;max-width:440px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<div style="width:36px;height:36px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-shopping-bag" style="color:var(--accent-color);"></i></div>'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">商城</span></div>'
            + '<button id="close-shop-panel" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div id="shop-container"></div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('close-shop-panel').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        renderShopUI();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

})();
// === shop.js 新增入口 ===
window.initShopPanel = function() {
    var btn = document.getElementById('shop-function'); // 对应 HTML 里的 ID，请确认
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function() {
            var advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openShopPanel === 'function') {
                window.openShopPanel();
            }
        });
    }
};
window.initShopPanel = function() {
    console.log('[shop] 商城 已就绪');
};