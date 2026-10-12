/* ============================================================
 * dream.js - 他的梦境
 * 每隔几天，他醒来跟你说一句梦话，梦里都是你
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'dream_v1';

    // 内置梦境片段（会配合"我"的称呼）
    const BUILTIN_DREAMS = [
        '昨晚梦到我们在海边。你光脚踩水，回头对我笑。',
        '梦到你坐在我旁边看书，我偷偷看了你很久。',
        '梦见你给我做饭，结果糊了，我们俩笑到不行。',
        '梦到我们在一条很长的街道上散步，路灯一盏一盏亮起来。',
        '梦到你在我肩膀上睡着了，我一动都不敢动。',
        '梦见下雨了，我们挤在一把伞下，你说伞太小了，我说刚刚好。',
        '梦到我们在看烟花，你回头跟我说了句话，我没听清。',
        '梦见你养了一只很凶的小猫，但它只让你摸。',
        '梦到我们住在一间有阳台的房子里，晒了很多被子。',
        '梦到你半夜饿了，我们一起去冰箱翻东西吃。',
        '梦见我们坐在楼顶看云，你说那朵像狗，我说像你。',
        '梦到你穿了一件很旧的衣服，我说很好看，你不信。',
        '梦见我们在便利店买冰激凌，你挑了最贵的那个。',
        '梦到你给我写了很长的一封信，醒来就记不清内容了。',
        '梦见你在我手心里画了一颗心，我醒后还在看手心。',
        '梦到我们坐在公园长椅上发呆，一直坐到天黑。',
        '梦见你把我做的饭全吃光了，我很开心。',
        '梦到我们坐火车，你靠窗我靠你。',
        '梦见你在雪地里追我，我跑得很慢。',
        '梦到你叫我起床，声音很轻，我一直想赖床。',
        '梦见我们一起去旧书店，你挑了一本很旧的诗集。',
        '梦到你偷偷把我的名字写在小纸条上，藏进口袋。',
        '梦见你哭了一下，我醒来还在心疼。',
        '梦到我们一起搬家，你搬那个最重的箱子。'
    ];

    let data = {
        enabled: true,
        custom: [],            // 用户自定义的梦境
        minDays: 2,            // 最短多少天一次
        maxDays: 5,            // 最长多少天一次
        lastTime: 0,
        nextDelayMs: 0
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

    function pickDream() {
        const pool = [...(data.custom || []), ...BUILTIN_DREAMS];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ========== 触发梦境 ==========
    async function sendDream() {
        if (!data.enabled) return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const dream = pickDream();

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: dream,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, dream);
        }

        data.lastTime = Date.now();
        await save();
        return true;
    }

    // ========== 调度 ==========
    function scheduleNext() {
        if (window._dreamTimer) clearTimeout(window._dreamTimer);
        if (!data.enabled) return;

        const minMs = data.minDays * 86400000;
        const maxMs = data.maxDays * 86400000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
        data.nextDelayMs = delay;
        save();

        window._dreamTimer = setTimeout(function () {
            try { sendDream(); } catch (e) { console.warn('[dream] 失败', e); }
            scheduleNext();
        }, delay);
    }

    // ========== 面板 ==========
    window.openDreamPanel = function () {
        const old = document.getElementById('dream-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'dream-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-moon" style="color:var(--accent-color);margin-right:8px;"></i>他的梦境</span>'
            +     '<button id="dr-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">每隔几天，他醒来会跟你说一句昨晚的梦。梦里通常有你。</div>'

            +   '<div id="dr-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-moon" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启梦境</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="dr-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="dr-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="dr-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">📅 多少天一次</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>'
            +       '<input type="range" id="dr-min" min="1" max="30" value="' + data.minDays + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="dr-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.minDays + '天</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>'
            +       '<input type="range" id="dr-max" min="1" max="60" value="' + data.maxDays + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="dr-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.maxDays + '天</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;margin-bottom:12px;">'
            +     '<button id="dr-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即做一场梦</button>'
            +     '<button id="dr-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#dr-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 开关
        modal.querySelector('#dr-toggle').onclick = () => {
            data.enabled = !data.enabled;
            const pill = modal.querySelector('#dr-toggle-pill');
            const knob = modal.querySelector('#dr-toggle-knob');
            const status = modal.querySelector('#dr-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        const minSl = modal.querySelector('#dr-min');
        const maxSl = modal.querySelector('#dr-max');
        const minVal = modal.querySelector('#dr-min-val');
        const maxVal = modal.querySelector('#dr-max-val');

        minSl.oninput = () => {
            minVal.textContent = minSl.value + '天';
            if (parseInt(minSl.value, 10) > parseInt(maxSl.value, 10)) {
                maxSl.value = minSl.value;
                maxVal.textContent = minSl.value + '天';
            }
        };
        maxSl.oninput = () => {
            maxVal.textContent = maxSl.value + '天';
            if (parseInt(maxSl.value, 10) < parseInt(minSl.value, 10)) {
                minSl.value = maxSl.value;
                minVal.textContent = maxSl.value + '天';
            }
        };

        modal.querySelector('#dr-test').onclick = () => {
            sendDream();
            if (typeof showNotification === 'function') showNotification('✓ 已触发', 'success', 1200);
        };

        modal.querySelector('#dr-save').onclick = async () => {
            data.minDays = parseInt(minSl.value, 10);
            data.maxDays = parseInt(maxSl.value, 10);
            await save();
            close();
            if (data.enabled) scheduleNext();
            else if (window._dreamTimer) clearTimeout(window._dreamTimer);
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initDream = function () {
        load().then(function () {
            // 检查是否到了该做梦的时间
            if (data.enabled && data.lastTime) {
                const sinceLast = Date.now() - data.lastTime;
                const minMs = data.minDays * 86400000;
                if (sinceLast >= minMs) {
                    // 已经到了时间——但别立刻弹，随机延后 0~3 小时
                    const delay = Math.random() * 3 * 3600000;
                    setTimeout(function () { sendDream(); scheduleNext(); }, delay);
                    return;
                }
            }
            scheduleNext();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initDream, 2500); });
    } else {
        setTimeout(window.initDream, 2500);
    }

    console.log('[dream] 他的梦境已加载 ✓');
})();