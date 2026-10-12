/* ============================================================
 * his-day.js - 他的一天
 * 他主动分享自己此刻在干嘛
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisDay_v1';

    // 按时间段的片段库
    const MORNING = [
        '早上的空气很干净，我出去走了一圈。',
        '刚泡了杯茶。今天想慢一点。',
        '楼下早餐铺的豆浆又涨价了。',
        '今天起得比闹钟早。',
        '刚拉开窗帘，外面雾蒙蒙的。',
        '路过公园，有人在打太极。',
        '刚洗完脸，清醒了一点。',
        '早餐煮了个蛋，蛋黄有点生。'
    ];

    const FORENOON = [
        '刚开完会，有点累。',
        '在写东西，写一半卡住了。',
        '窗外有只鸟一直在叫。',
        '路过一家书店，进去翻了会儿。',
        '刚去楼下买了杯咖啡。',
        '今天太阳挺好的。',
        '刚看完一份文件，眼睛疼。',
        '工作间隙起来接水，想到你了。'
    ];

    const NOON = [
        '中午吃了碗面，味道一般。',
        '刚吃完饭，有点困。',
        '今天点的外卖送得挺快。',
        '午休趴了一会儿，脖子有点酸。',
        '下楼吃饭，看到一棵开花的树。',
        '中午吃太饱了，坐都坐不直。',
        '今天食堂的菜有点咸。',
        '刚从便利店出来，买了个饭团。'
    ];

    const AFTERNOON = [
        '下午时间过得好慢。',
        '刚跟人讨论了半天，终于有结论了。',
        '今天的工作做完了。',
        '刚泡了杯咖啡，加了两块糖。',
        '坐在窗边发了会呆。',
        '地铁上看到一个小孩，一直盯着我看。',
        '刚整理完桌子，看着舒服多了。',
        '手边的水已经凉了。'
    ];

    const EVENING = [
        '下班路上天已经黑了。',
        '刚到家，脱了鞋就瘫在沙发上。',
        '今天在楼下看到一只橘猫。',
        '路过夜市，闻到烤串的香味。',
        '晚饭煮了碗粥，简单吃点。',
        '刚洗完澡，头发还在滴水。',
        '在阳台上站了会儿，风很舒服。',
        '刚看完一部老电影，有点感慨。'
    ];

    const NIGHT = [
        '已经很晚了，还没睡。',
        '刚关灯，但还是睁着眼。',
        '窗外没什么声音。',
        '今晚月亮挺亮的。',
        '刚放下书，眼睛有点酸。',
        '有点安静。',
        '被子有点冷。',
        '在翻相册，翻到很旧的照片。'
    ];

    function pickFromPool(pool) {
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function pickByHour() {
        const h = new Date().getHours();
        if (h >= 5 && h < 9)  return pickFromPool(MORNING);
        if (h >= 9 && h < 12) return pickFromPool(FORENOON);
        if (h >= 12 && h < 14) return pickFromPool(NOON);
        if (h >= 14 && h < 18) return pickFromPool(AFTERNOON);
        if (h >= 18 && h < 22) return pickFromPool(EVENING);
        return pickFromPool(NIGHT);
    }

    let data = {
        enabled: true,
        minMin: 30,
        maxMin: 90
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

    // ========== 触发 ==========
    async function sendOne() {
        if (!data.enabled) return false;
        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const text = pickByHour();

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
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, text);
        }
        return true;
    }

    // ========== 调度 ==========
    function scheduleNext() {
        if (window._hisDayTimer) clearTimeout(window._hisDayTimer);
        if (!data.enabled) return;
        const minMs = data.minMin * 60 * 1000;
        const maxMs = data.maxMin * 60 * 1000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
        window._hisDayTimer = setTimeout(function () {
            try {
                // 概率触发，不是每次都发
                if (Math.random() < 0.6) sendOne();
            } catch (e) { console.warn('[his-day] 失败', e); }
            scheduleNext();
        }, delay);
    }

    // ========== 面板 ==========
    window.openHisDayPanel = function () {
        const old = document.getElementById('his-day-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'his-day-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-sun" style="color:var(--accent-color);margin-right:8px;"></i>他的一天</span>'
            +     '<button id="hd-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">他会时不时主动跟你说他"此刻在干嘛"，像在过自己的生活。内容按早/中/晚自动变化。</div>'

            +   '<div id="hd-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-sun" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启他的一天</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="hd-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="hd-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="hd-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 分享间隔（分钟）</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>'
            +       '<input type="range" id="hd-min" min="5" max="180" value="' + data.minMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="hd-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.minMin + '分钟</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>'
            +       '<input type="range" id="hd-max" min="5" max="360" value="' + data.maxMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="hd-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.maxMin + '分钟</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="hd-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即分享</button>'
            +     '<button id="hd-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#hd-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#hd-toggle').onclick = () => {
            data.enabled = !data.enabled;
            const pill = modal.querySelector('#hd-toggle-pill');
            const knob = modal.querySelector('#hd-toggle-knob');
            const status = modal.querySelector('#hd-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        const minSl = modal.querySelector('#hd-min');
        const maxSl = modal.querySelector('#hd-max');
        const minVal = modal.querySelector('#hd-min-val');
        const maxVal = modal.querySelector('#hd-max-val');

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

        modal.querySelector('#hd-test').onclick = () => {
            sendOne();
            if (typeof showNotification === 'function') showNotification('✓ 已分享', 'success', 1200);
        };

        modal.querySelector('#hd-save').onclick = async () => {
            data.minMin = parseInt(minSl.value, 10);
            data.maxMin = parseInt(maxSl.value, 10);
            await save();
            close();
            if (data.enabled) scheduleNext();
            else if (window._hisDayTimer) clearTimeout(window._hisDayTimer);
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initHisDay = function () {
        load().then(function () {
            scheduleNext();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initHisDay, 2200); });
    } else {
        setTimeout(window.initHisDay, 2200);
    }

    console.log('[his-day] 他的一天已加载 ✓');
})();