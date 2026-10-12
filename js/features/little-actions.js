/* ============================================================
 * little-actions.js - 小动作
 * 他不说话，直接碰你一下
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'littleActions_v1';

    // 动作片段（用括号包起来，是动作不是说话）
    const ACTIONS = [
        '（他从背后轻轻抱住了你）',
        '（他摸了摸你的头）',
        '（他牵住了你的手）',
        '（他把下巴搁在你肩上）',
        '（他捏了捏你的脸）',
        '（他揉了揉你的头发）',
        '（他把外套披在了你肩上）',
        '（他从旁边靠了过来）',
        '（他用额头轻轻碰了碰你的额头）',
        '（他把你的手揣进了他的口袋）',
        '（他拉了拉你的袖子）',
        '（他握了握你的指尖）',
        '（他给你倒了杯温水）',
        '（他把你的碎发别到耳后）',
        '（他靠在你肩上打了个哈欠）',
        '（他把毯子往你这边拉了拉）',
        '（他在你手背上轻轻画了画）',
        '（他撑着头看你）',
        '（他勾了勾你的小指）',
        '（他给你递了一颗糖）',
        '（他站在你身后看你在做什么）',
        '（他忽然把脸凑到你的脸旁边）',
        '（他抬手挡住了刺眼的阳光）',
        '（他把你往他那边带了一步）',
        '（他笑了笑，没说话）',
        '（他歪了歪头看你）',
        '（他帮你看了一眼时钟）',
        '（他往你手心里放了什么东西）',
        '（他拍了拍你的肩）',
        '（他忽然把脑袋靠在你肩上）'
    ];

    // 你点开小动作时他的反应
    const REACTIONS = [
        '嗯。',
        '别动。',
        '就一会儿。',
        '……',
        '（没说话，但抱得更紧了）',
        '（笑了一下）',
        '（看着你，什么都没说）',
        '嗯，我在。'
    ];

    let data = {
        enabled: true,
        minMin: 60,       // 最短 60 分钟
        maxMin: 180       // 最长 180 分钟
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    // ========== 触发一次 ==========
    async function sendAction() {
        if (!data.enabled) return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const text = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: null,          // 系统消息
                text: text,
                timestamp: new Date(),
                type: 'system'
            });
        }
        if (typeof playSound === 'function') playSound('favorite');
        return true;
    }

    // 你点开这条系统消息时，他会补一句
    window._littleActionReply = function () {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const text = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: text,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
    };

    // ========== 调度 ==========
    function scheduleNext() {
        if (window._littleActionsTimer) clearTimeout(window._littleActionsTimer);
        if (!data.enabled) return;
        const minMs = data.minMin * 60 * 1000;
        const maxMs = data.maxMin * 60 * 1000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
        window._littleActionsTimer = setTimeout(function () {
            try {
                // 概率触发
                if (Math.random() < 0.55) sendAction();
            } catch (e) { console.warn('[little-actions] 失败', e); }
            scheduleNext();
        }, delay);
    }

    // ========== 面板 ==========
    window.openLittleActionsPanel = function () {
        const old = document.getElementById('little-actions-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'little-actions-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-hand-holding-heart" style="color:var(--accent-color);margin-right:8px;"></i>小动作</span>'
            +     '<button id="la-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">他不说话，直接碰你一下——摸头、牵手、从背后抱住你。每隔 1~3 小时随机一次。</div>'

            +   '<div id="la-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-hand-holding-heart" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启小动作</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="la-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="la-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="la-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 间隔（分钟）</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>'
            +       '<input type="range" id="la-min" min="10" max="180" value="' + data.minMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="la-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.minMin + '分钟</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>'
            +       '<input type="range" id="la-max" min="10" max="360" value="' + data.maxMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="la-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.maxMin + '分钟</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="la-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即来一次</button>'
            +     '<button id="la-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#la-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#la-toggle').onclick = () => {
            data.enabled = !data.enabled;
            const pill = modal.querySelector('#la-toggle-pill');
            const knob = modal.querySelector('#la-toggle-knob');
            const status = modal.querySelector('#la-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        const minSl = modal.querySelector('#la-min');
        const maxSl = modal.querySelector('#la-max');
        const minVal = modal.querySelector('#la-min-val');
        const maxVal = modal.querySelector('#la-max-val');

        minSl.oninput = () => {
            minVal.textContent = minSl.value + '分钟';
            if (parseInt(minSl.value, 10) > parseInt(maxSl.value, 10)) {
                maxSl.value = minSl.value;
                maxVal.textContent = minSl.value + '分钟';
            }
        };
        maxSl.oninput = () => {
            maxVal.textContent = maxSl.value + '分钟';
            if (parseInt(maxSl.value, 10) < parseInt(minSl.value, 10)) {
                minSl.value = maxSl.value;
                minVal.textContent = maxSl.value + '分钟';
            }
        };

        modal.querySelector('#la-test').onclick = () => {
            sendAction();
            if (typeof showNotification === 'function') showNotification('✓ 已触发', 'success', 1200);
        };

        modal.querySelector('#la-save').onclick = async () => {
            data.minMin = parseInt(minSl.value, 10);
            data.maxMin = parseInt(maxSl.value, 10);
            await save();
            close();
            if (data.enabled) scheduleNext();
            else if (window._littleActionsTimer) clearTimeout(window._littleActionsTimer);
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initLittleActions = function () {
        load().then(function () {
            scheduleNext();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initLittleActions, 2500); });
    } else {
        setTimeout(window.initLittleActions, 2500);
    }

    console.log('[little-actions] 小动作已加载 ✓');
})();