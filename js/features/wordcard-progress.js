/* ============================================================
 * wordcard-progress.js - 他的字卡学习进度（自主版）
 * 他会自己每天学几张，不需要你参与
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisWordcardProgress_v1';

    let data = {
        learned: [],
        lastMsgCount: 0,
        history: [],
        lastAutoLearnDate: null,
        lastAutoLearnTs: 0
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

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }
    function getAllReplies() {
        try {
            return (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(function (t) { return t && String(t).trim(); })
                : [];
        } catch (e) { return []; }
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ========== 标记一张已学 ==========
    function markLearned(text, silent) {
        if (!text) return false;
        const trimmed = String(text).trim();
        if (!trimmed) return false;
        if (data.learned.indexOf(trimmed) !== -1) return false;
        data.learned.push(trimmed);
        data.history.unshift({ text: trimmed, ts: Date.now() });
        data.history = data.history.slice(0, 100);
        persist();
        if (!silent && typeof showNotification === 'function') {
            showNotification('📚 ' + getPartnerName() + ' 学会了新字卡', 'success', 1800);
        }
        return true;
    }

    // ========== 他自主学习 ==========
    // 从还没学的字卡里随机抽一张，学
    function autoLearnOne(silent) {
        const allReplies = getAllReplies();
        if (!allReplies.length) return false;
        const unlearned = allReplies.filter(function (t) { return data.learned.indexOf(t) === -1; });
        if (!unlearned.length) return false;
        const pick = unlearned[Math.floor(Math.random() * unlearned.length)];
        return markLearned(pick, silent);
    }

    // 每天学 1~3 张
    async function autoLearnDaily() {
        const today = todayStr();
        if (data.lastAutoLearnDate === today) return;

        const count = 1 + Math.floor(Math.random() * 3); // 1~3
        const allReplies = getAllReplies();
        if (!allReplies.length) return;
        let learnedToday = 0;
        for (let i = 0; i < count; i++) {
            if (autoLearnOne(true)) learnedToday++;
        }
        data.lastAutoLearnDate = today;
        data.lastAutoLearnTs = Date.now();
        persist();

        if (learnedToday > 0 && typeof showNotification === 'function') {
            const pn = getPartnerName();
            setTimeout(function () {
                showNotification('📚 ' + pn + ' 今天又学了 ' + learnedToday + ' 张字卡', 'info', 2500);
            }, 3000 + Math.random() * 4000);
        }
    }

    // 平时每 2 小时 20% 概率学 1 张（不影响每天保底）
    function autoLearnHourly() {
        const now = Date.now();
        if (now - data.lastAutoLearnTs < 1.5 * 3600000) return; // 至少隔 1.5 小时
        if (Math.random() > 0.20) return;
        if (autoLearnOne(true)) {
            data.lastAutoLearnTs = now;
            persist();
        }
    }

    // ========== 扫消息（你用过 = 他强化一遍） ==========
    function scanMessages() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            const total = messages.length;
            if (total <= data.lastMsgCount) {
                if (total < data.lastMsgCount) data.lastMsgCount = total;
                return;
            }
            const newMsgs = messages.slice(Math.max(0, total - 5));
            data.lastMsgCount = total;

            const allReplies = getAllReplies();
            if (allReplies.length === 0) return;

            newMsgs.forEach(function (m) {
                if (!m || m.sender !== 'user' || !m.text) return;
                const text = String(m.text).trim();
                const hit = allReplies.find(function (r) {
                    const rt = String(r).trim();
                    return rt === text || text.indexOf(rt) !== -1 || rt.indexOf(text) !== -1;
                });
                if (hit) markLearned(hit, true);
            });
        } catch (e) {}
    }

    // ========== 打开面板 ==========
    window.openWordcardProgressPanel = async function () {
        await load();

        const old = document.getElementById('wcp-panel');
        if (old) old.remove();

        const pName = getPartnerName();
        const allReplies = getAllReplies();
        const total = allReplies.length;
        const learnedCount = data.learned.filter(function (t) {
            return allReplies.indexOf(t) !== -1;
        }).length;
        const percent = total > 0 ? Math.round(learnedCount / total * 100) : 0;

        const recent = data.history.slice(0, 6);

        const unlearnedPool = allReplies.filter(function (t) { return data.learned.indexOf(t) === -1; });
        const suggestPool = unlearnedPool.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 5);

        let feedback = '';
        if (total === 0) feedback = '字卡库还是空的，先去「自定义回复」里加几张吧';
        else if (percent === 0) feedback = pName + ' 刚开始学，明天就会看到进度';
        else if (percent < 30) feedback = '他在慢慢记，每天都会学几张';
        else if (percent < 60) feedback = '他学得还行，一半多了';
        else if (percent < 90) feedback = '他已经掌握大部分字卡了';
        else if (percent < 100) feedback = '快学完了，就差最后几张';
        else feedback = '他全部学会了 ✦ 你说什么他都能接';

        // 今天是否已学
        const today = todayStr();
        const learnedTodayText = data.lastAutoLearnDate === today
            ? '今天已经学过了 ✓'
            : '今天还会自己学';

        const modal = document.createElement('div');
        modal.id = 'wcp-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:wcpFade 0.25s ease;';

        modal.innerHTML =
            '<style>@keyframes wcpFade{from{opacity:0}to{opacity:1}}@keyframes wcpPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}</style>'
            + '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px 20px 18px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.35);animation:wcpPop 0.35s cubic-bezier(0.34,1.56,0.64,1);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:34px;height:34px;border-radius:10px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:16px;">📚</div>'
            +       '<span style="font-size:15px;font-weight:700;color:var(--text-primary);">' + esc(pName) + ' 的学习进度</span>'
            +     '</div>'
            +     '<button id="wcp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.12),rgba(var(--accent-color-rgb),0.03));border-radius:16px;padding:18px;margin-bottom:14px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.2);flex-shrink:0;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:2px;margin-bottom:6px;">已学会</div>'
            +     '<div style="font-size:36px;font-weight:900;color:var(--accent-color);font-family:Georgia,serif;line-height:1;">' + learnedCount + ' <span style="font-size:16px;opacity:0.7;">/ ' + total + '</span></div>'
            +     '<div style="height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden;margin-top:12px;max-width:220px;margin-left:auto;margin-right:auto;">'
            +       '<div style="width:' + percent + '%;height:100%;background:var(--accent-color);border-radius:3px;transition:width 0.6s ease;"></div>'
            +     '</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">' + percent + '% · ' + learnedTodayText + '</div>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);text-align:center;line-height:1.6;margin-bottom:16px;padding:10px 12px;background:rgba(var(--accent-color-rgb),0.05);border-radius:10px;flex-shrink:0;">' + esc(feedback) + '</div>'

            +   '<div style="flex:1;overflow-y:auto;padding-right:2px;">'

            +     (recent.length > 0
                    ? '<div style="font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:1px;margin-bottom:8px;">最近学会的</div>'
                        + recent.map(function (h) {
                            const d = new Date(h.ts);
                            const label = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                            return '<div style="padding:10px 12px;background:var(--primary-bg);border-radius:10px;margin-bottom:6px;border-left:3px solid var(--accent-color);">'
                                + '<div style="font-size:12.5px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + esc(h.text) + '</div>'
                                + '<div style="font-size:10px;color:var(--text-secondary);margin-top:3px;">' + label + '</div>'
                                + '</div>';
                        }).join('')
                    : '<div style="text-align:center;padding:24px 0;color:var(--text-secondary);font-size:12px;opacity:0.6;">还没学会任何字卡<br><span style="font-size:10px;opacity:0.7;">他每天会自己学 1~3 张</span></div>')

            +     (suggestPool.length > 0
                    ? '<div style="font-size:11px;font-weight:700;color:var(--text-secondary);letter-spacing:1px;margin:14px 0 8px;">他还没学的（你也可以教他）</div>'
                        + suggestPool.map(function (t) {
                            const attrText = esc(t).replace(/"/g, '&quot;');
                            return '<div class="wcp-teach" data-text="' + attrText + '" style="padding:10px 12px;background:var(--primary-bg);border:1px dashed var(--border-color);border-radius:10px;margin-bottom:6px;cursor:pointer;display:flex;align-items:center;gap:8px;">'
                                + '<span style="flex:1;font-size:12.5px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + esc(t) + '</span>'
                                + '<i class="fas fa-plus" style="font-size:10px;color:var(--accent-color);"></i>'
                                + '</div>';
                        }).join('')
                    : '')

            +   '</div>'

            +   '<div style="display:flex;gap:8px;margin-top:12px;flex-shrink:0;">'
            +     '<button id="wcp-random" style="flex:1;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12.5px;cursor:pointer;font-family:var(--font-family);">🎲 逼他多学一张</button>'
            +     '<button id="wcp-close-btn" style="flex:2;padding:10px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-family);">好的</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = function () { modal.remove(); };
        modal.querySelector('#wcp-close').onclick = close;
        modal.querySelector('#wcp-close-btn').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        modal.querySelectorAll('.wcp-teach').forEach(function (el) {
            el.onclick = function () {
                const t = el.dataset.text;
                if (markLearned(t)) {
                    close();
                    setTimeout(window.openWordcardProgressPanel, 100);
                }
            };
        });

        modal.querySelector('#wcp-random').onclick = function () {
            if (unlearnedPool.length === 0) {
                if (typeof showNotification === 'function') showNotification('他全都学会了 ✦', 'info', 1800);
                return;
            }
            const pick = unlearnedPool[Math.floor(Math.random() * unlearnedPool.length)];
            if (markLearned(pick)) {
                close();
                setTimeout(window.openWordcardProgressPanel, 100);
            }
        };
    };

    // ========== 入口 ==========
    function bindEntry() {
        const container = document.querySelector('#advanced-modal .settings-item-list');
        if (!container) { setTimeout(bindEntry, 500); return; }
        if (container.querySelector('#wcp-function')) return;

        const item = document.createElement('div');
        item.className = 'settings-item';
        item.id = 'wcp-function';
        item.style.position = 'relative';
        item.innerHTML = '<i class="fas fa-book-open-reader"></i><span>学习进度</span>';
        item.onclick = function () {
            const adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            window.openWordcardProgressPanel();
        };
        container.appendChild(item);
    }

    // 顶栏按钮（防止高级功能入口挂不上）
    function bindTopBtn() {
        const bar = document.querySelector('.header-actions');
        if (!bar) { setTimeout(bindTopBtn, 800); return; }
        if (document.getElementById('wcp-top-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'wcp-top-btn';
        btn.className = 'action-btn';
        btn.title = '学习进度';
        btn.innerHTML = '<i class="fas fa-book-open-reader"></i>';
        btn.onclick = function () { window.openWordcardProgressPanel(); };
        bar.appendChild(btn);
    }

    // ========== 初始化 ==========
    async function init() {
        await load();
        try {
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                if (data.lastMsgCount === 0) data.lastMsgCount = messages.length;
            }
        } catch (e) {}
        bindEntry();
        bindTopBtn();
        setTimeout(bindEntry, 1500);
        setTimeout(bindTopBtn, 2000);

        // 每天首次打开：学 1~3 张（延迟 8 秒执行，避免和初始化撞）
        setTimeout(autoLearnDaily, 8000);

        // 每 15 分钟：检查要不要额外学一张
        setInterval(autoLearnHourly, 15 * 60 * 1000);

        // 每 10 秒扫消息
        setInterval(scanMessages, 10000);

        // 每次页面变成可见时也检查一下每日学习
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') autoLearnDaily();
        });
    }

    window.initWordcardProgress = init;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

    console.log('[wordcard-progress] 他的字卡学习进度（自主版）已加载 ✓');
})();