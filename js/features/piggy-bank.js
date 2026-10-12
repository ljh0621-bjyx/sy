/* ============================================================
 * piggy-bank.js - 恋爱存钱罐
 * 按聊天频率累积"爱意值"，攒够可以兑换奖励
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'piggyBank_v1';

    // ========== 奖励清单 ============
    const REWARDS = [
        { id: 'r1', cost: 30,  icon: '💌', title: '让他写一句情话',   desc: '他会从字卡库挑一句最合适的发给你' },
        { id: 'r2', cost: 60,  icon: '🫶', title: '让他主动抱抱你',   desc: '他会发一条"抱抱"的动作消息' },
        { id: 'r3', cost: 100, icon: '🍬', title: '让他答应你一个要求', desc: '他会答应你一件小事（截图留着）' },
        { id: 'r4', cost: 200, icon: '🎁', title: '让他送你一个小礼物', desc: '他会从购物车里送你一件' },
        { id: 'r5', cost: 500, icon: '🌙', title: '让他陪你说晚安',   desc: '他会跟你道一声专属晚安' },
        { id: 'r6', cost: 999, icon: '♾️', title: '让他说一句"我爱你"', desc: '他会用最认真的一句话回应' }
    ];

    // ========== 数据 ==========
    let data = {
        total: 0,             // 累计爱意值
        todayEarned: 0,       // 今天攒了多少
        todayDate: null,      // 今天日期
        lastMsgCount: 0,      // 上次检查时的消息总数
        redeemed: []          // 已兑换记录
    };

    let _loaded = false;

    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
        _loaded = true;
    }
    async function persist() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function resetTodayIfNeeded() {
        const today = todayStr();
        if (data.todayDate !== today) {
            data.todayDate = today;
            data.todayEarned = 0;
        }
    }

    // ========== 自动累积 ==========
    // 每 15 秒扫一次聊天记录，看有没有新消息
    // 你今天发/对方发，每 5 条算 1 点爱意值
    // 每天上限 30 点
    function tick() {
        resetTodayIfNeeded();
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            const total = messages.length;
            if (total > data.lastMsgCount) {
                const diff = total - data.lastMsgCount;
                data.lastMsgCount = total;
                // 每 5 条 +1 点（取整）
                const earn = Math.floor(diff / 5);
                if (earn > 0) {
                    // 今天上限 30
                    const canEarn = Math.max(0, 30 - data.todayEarned);
                    const realEarn = Math.min(earn, canEarn);
                    if (realEarn > 0) {
                        data.total += realEarn;
                        data.todayEarned += realEarn;
                        updateBadge();
                        persist();
                    }
                }
            } else if (total < data.lastMsgCount) {
                // 消息被清空过，重置
                data.lastMsgCount = total;
            }
        } catch (e) {}
    }

    function updateBadge() {
        const icon = document.getElementById('piggy-bank-icon');
        if (!icon) return;
        // 有小钱（>=30）时高亮
        if (data.total >= 30) {
            icon.style.filter = 'drop-shadow(0 0 4px #ffd93d)';
        } else {
            icon.style.filter = 'none';
        }
    }

    // ========== 打开面板 ==========
    window.openPiggyBankPanel = async function () {
        await load();
        resetTodayIfNeeded();

        const old = document.getElementById('piggy-bank-panel');
        if (old) old.remove();

        const rewardsHTML = REWARDS.map(function (r) {
            const canAfford = data.total >= r.cost;
            const progress = Math.min(100, data.total / r.cost * 100);
            return '<div class="pb-reward" data-id="' + r.id + '" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--primary-bg);border:1.5px solid var(--border-color);border-radius:14px;margin-bottom:8px;cursor:' + (canAfford ? 'pointer' : 'not-allowed') + ';opacity:' + (canAfford ? '1' : '0.6') + ';transition:all 0.2s;">'
                +   '<div style="width:42px;height:42px;border-radius:12px;background:' + (canAfford ? 'rgba(var(--accent-color-rgb),0.15)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' + r.icon + '</div>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13.5px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">' + r.title + '</div>'
                +     '<div style="font-size:11px;color:var(--text-secondary);line-height:1.4;margin-bottom:6px;">' + r.desc + '</div>'
                +     '<div style="height:4px;background:var(--border-color);border-radius:2px;overflow:hidden;">'
                +       '<div style="width:' + progress + '%;height:100%;background:' + (canAfford ? 'var(--accent-color)' : 'rgba(var(--accent-color-rgb),0.4)') + ';border-radius:2px;transition:width 0.6s ease;"></div>'
                +     '</div>'
                +   '</div>'
                +   '<div style="flex-shrink:0;text-align:right;">'
                +     '<div style="font-size:15px;font-weight:800;color:' + (canAfford ? 'var(--accent-color)' : 'var(--text-secondary)') + ';">' + r.cost + '</div>'
                +     '<div style="font-size:9.5px;color:var(--text-secondary);">爱意值</div>'
                +   '</div>'
                + '</div>';
        }).join('');

        const modal = document.createElement('div');
        modal.id = 'piggy-bank-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:pbFadeIn 0.25s ease;';

        modal.innerHTML =
            '<style>@keyframes pbFadeIn{from{opacity:0}to{opacity:1}}@keyframes pbPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px 20px 18px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:pbPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:18px;">🐷</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">恋爱存钱罐</span>'
            +     '</div>'
            +     '<button id="pb-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            // 存钱罐大卡片
            +   '<div style="background:linear-gradient(135deg,rgba(255,217,61,0.15),rgba(var(--accent-color-rgb),0.08));border-radius:16px;padding:20px 18px;margin-bottom:16px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.2);flex-shrink:0;">'
            +     '<div style="font-size:44px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 4px 12px rgba(255,217,61,0.4));">🐷</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:2px;margin-bottom:4px;">累计爱意值</div>'
            +     '<div style="font-size:36px;font-weight:900;color:var(--accent-color);font-family:Georgia,serif;line-height:1;">' + data.total + '</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">今天攒了 <b style="color:var(--accent-color);">' + data.todayEarned + '</b> / 30</div>'
            +     '<div style="height:5px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;margin-top:10px;max-width:200px;margin-left:auto;margin-right:auto;">'
            +       '<div style="width:' + (data.todayEarned / 30 * 100) + '%;height:100%;background:var(--accent-color);border-radius:3px;transition:width 0.6s ease;"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;font-weight:700;letter-spacing:1px;flex-shrink:0;">可兑换 · 每 5 条消息 +1 点（每日上限 30）</div>'

            // 奖励列表
            +   '<div style="flex:1;overflow-y:auto;padding-right:2px;" id="pb-rewards-list">' + rewardsHTML + '</div>'

            +   '<button id="pb-close-btn" style="width:100%;margin-top:12px;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);flex-shrink:0;">好的</button>'
            + '</div>';

        document.body.appendChild(modal);

        const close = function () { modal.remove(); };
        modal.querySelector('#pb-close').onclick = close;
        modal.querySelector('#pb-close-btn').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        // 兑换按钮
        modal.querySelectorAll('.pb-reward').forEach(function (el) {
            el.onclick = function () {
                const id = el.dataset.id;
                const r = REWARDS.find(function (x) { return x.id === id; });
                if (!r) return;
                if (data.total < r.cost) {
                    if (typeof showNotification === 'function') {
                        showNotification('还差 ' + (r.cost - data.total) + ' 点爱意值', 'warning', 2000);
                    }
                    return;
                }
                if (!confirm('确定花费 ' + r.cost + ' 爱意值兑换「' + r.title + '」吗？')) return;
                data.total -= r.cost;
                data.redeemed.unshift({ id: r.id, title: r.title, cost: r.cost, ts: Date.now() });
                if (data.redeemed.length > 30) data.redeemed = data.redeemed.slice(0, 30);
                persist();
                close();
                redeem(r);
            };
        });
    };

    // ========== 兑换后触发的效果 ==========
    function redeem(r) {
        const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];

        const rand = function () { return pool.length ? pool[Math.floor(Math.random() * pool.length)] : ''; };

        const addMsg = function (text, type) {
            if (typeof addMessage !== 'function') return;
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pName,
                text: text,
                timestamp: new Date(),
                status: 'received',
                type: type || 'normal'
            });
            if (typeof playSound === 'function') playSound('message');
        };

        if (typeof showNotification === 'function') {
            showNotification('✓ 已兑换「' + r.title + '」', 'success', 2000);
        }

        setTimeout(function () {
            if (r.id === 'r1') {
                addMsg(rand() || '有些话我平时不敢说，现在想说给你听。');
            } else if (r.id === 'r2') {
                if (typeof addMessage === 'function') {
                    addMessage({
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        sender: null,
                        text: '（' + pName + ' 抱住了你，没说话）',
                        timestamp: new Date(),
                        type: 'system'
                    });
                }
            } else if (r.id === 'r3') {
                addMsg('好，我答应你。你说什么都行。');
            } else if (r.id === 'r4') {
                addMsg('我看到你购物车里有个东西，我买了，等会给你。');
            } else if (r.id === 'r5') {
                addMsg('晚安。今天也想你。');
            } else if (r.id === 'r6') {
                addMsg('我爱你。不是说说而已。');
            }
        }, 1000);
    }

    // ========== 绑定入口 ==========
    function bindEntry() {
        const el = document.getElementById('piggy-bank');
        if (!el || el._pbBound) return;
        el._pbBound = true;
        el.addEventListener('click', function (e) {
            e.stopPropagation();
            window.openPiggyBankPanel();
        });
    }

    // ========== 初始化 ==========
    async function init() {
        await load();
        resetTodayIfNeeded();
        // 首次打开时，把当前消息数当作基线，避免一次性加一堆
        try {
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                if (data.lastMsgCount === 0) data.lastMsgCount = messages.length;
            }
        } catch (e) {}
        bindEntry();
        updateBadge();
        setInterval(tick, 15000);
        setInterval(function () { bindEntry(); updateBadge(); }, 5000);
    }

    window.initPiggyBank = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[piggy-bank] 恋爱存钱罐已加载 ✓');
})();