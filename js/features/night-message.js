/* ============================================================
 * night-message.js - 夜间消息
 * 你晚上睡着（长时间不活跃）时，对方随机给你发消息
 * ============================================================ */
(function () {
    'use strict';

    const KEY = (typeof getStorageKey === 'function')
        ? getStorageKey('nightMessageData_v1')
        : 'nightMessageData_v1';

    let data = {
        enabled: true,
        startHour: 23,          // 夜间开始（小时）
        endHour: 7,             // 夜间结束（小时）
        idleMinutes: 10,        // 多久不活动算"睡着"
        hourlyChance: 35,       // 每小时触发概率 %
        maxPerNight: 3,         // 每晚最多几条
        stopOnUserReply: true,  // 你回复后当晚停止
        sentTonight: 0,
        lastNightResetDate: null,
        lastActivityTime: Date.now()
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }

    // ========== 消息池 ==========
    const MESSAGES = {
        lateNight: [   // 23:00 - 01:00
            '睡了吗？',
            '晚安。今天也辛苦了。',
            '刚才想跟你说句话，又怕吵到你。',
            '晚安，做个好梦。',
            '突然有点想你。',
            '你睡着了吗？',
            '把手机放在床头了，想到你。',
            '今天有你真好。',
            '早点睡吧，别熬太晚。',
            '不知道你现在睡着没有。',
            '睡个好觉，明天见。',
            '今天也想再听你说几句话。'
        ],
        midnight: [    // 01:00 - 05:00
            '睡不着。',
            '刚刚醒了一下。',
            '你那边安静吗？',
            '梦到你了，醒来发现是梦。',
            '你在做什么呢，应该睡着了吧。',
            '突然想到你说的那句话。',
            '翻了个身，又想到你。',
            '房间有点冷。',
            '今晚的月亮很好看。',
            '其实没什么事，就是想说一声。',
            '睡着了吗…',
            '希望你在梦里也能笑。'
        ],
        earlyMorning: [ // 05:00 - 07:00
            '早安，今天也要好好的。',
            '醒了，天还没全亮。',
            '今天天气不错。',
            '早安，今天也想你。',
            '醒了没？',
            '早，今天有点想你。',
            '起来了吗？记得吃早餐。'
        ]
    };

    function pickMessage() {
        const h = new Date().getHours();
        let pool;
        if (h >= 23 || h < 1) pool = MESSAGES.lateNight;
        else if (h >= 1 && h < 5) pool = MESSAGES.midnight;
        else if (h >= 5 && h < 8) pool = MESSAGES.earlyMorning;
        else pool = MESSAGES.lateNight;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ========== 时间判断 ==========
    function isNightTime() {
        const h = new Date().getHours();
        const s = data.startHour, e = data.endHour;
        if (s < e) return h >= s && h < e;
        return h >= s || h < e;   // 跨午夜
    }

    function isIdle() {
        return Date.now() - data.lastActivityTime >= data.idleMinutes * 60 * 1000;
    }

    function getNightKey() {
        const now = new Date();
        const h = now.getHours();
        const d = new Date(now);
        // 跨午夜情况下，凌晨属于"昨天开始的夜"
        if (data.startHour > data.endHour && h < data.endHour) {
            d.setDate(d.getDate() - 1);
        }
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function resetIfNewNight() {
        const key = getNightKey();
        if (data.lastNightResetDate !== key) {
            data.lastNightResetDate = key;
            data.sentTonight = 0;
            save();
        }
    }

    // ========== 用户最近是否发过消息 ==========
    function hasRecentUserMessage(minutes) {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return false;
            const cutoff = Date.now() - minutes * 60 * 1000;
            for (let i = messages.length - 1; i >= 0; i--) {
                const m = messages[i];
                if (!m) continue;
                if (m.sender === 'user' && m.timestamp) {
                    return new Date(m.timestamp).getTime() > cutoff;
                }
                if (i < messages.length - 30) break;
            }
        } catch (e) {}
        return false;
    }

    // ========== 发送消息 ==========
    async function sendNightMessage() {
        if (data.sentTonight >= data.maxPerNight) return false;

        const pn = (typeof settings !== 'undefined' && settings.partnerName)
            ? settings.partnerName : '对方';
        const text = pickMessage();

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

        // 只有页面可见时才播放声音（睡眠时间不打扰）
        if (typeof playSound === 'function' && document.visibilityState === 'visible') {
            try { playSound('message'); } catch (e) {}
        }

        // 后台通知
        if (typeof window._sendPartnerNotification === 'function') {
            try { window._sendPartnerNotification(pn, text); } catch (e) {}
        }

        data.sentTonight++;
        await save();
        return true;
    }

    // ========== 检查触发 ==========
    let _checking = false;
    async function check() {
        if (_checking) return;
        _checking = true;
        try {
            if (!data.enabled) return;
            resetIfNewNight();
            if (!isNightTime()) return;
            if (!isIdle()) return;
            if (data.sentTonight >= data.maxPerNight) return;

            // 用户刚发过消息 → 对方觉得你还醒着，今晚不再打扰
            if (data.stopOnUserReply && hasRecentUserMessage(45)) {
                data.sentTonight = data.maxPerNight;
                await save();
                return;
            }

            // 每 5 分钟检查一次，换算成每小时累计概率
            const perCheck = data.hourlyChance / 12;
            if (Math.random() * 100 >= perCheck) return;

            await sendNightMessage();
        } catch (e) {
            console.warn('[night-message] check fail', e);
        } finally {
            _checking = false;
        }
    }

    // ========== 用户活动监听 ==========
    function bindActivity() {
        const handler = function () {
            data.lastActivityTime = Date.now();
        };
        ['click', 'touchstart', 'keydown', 'mousemove', 'scroll'].forEach(function (evt) {
            document.addEventListener(evt, handler, { passive: true });
        });
    }

    // ========== 设置面板 ==========
    window.openNightMessageSettings = function () {
        const old = document.getElementById('night-message-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'night-message-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        function hourSelect(id, val) {
            let html = '<select id="' + id + '" style="padding:9px 12px;border:1px solid var(--border-color);border-radius:10px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-family:var(--font-family);outline:none;width:100%;box-sizing:border-box;">';
            for (let i = 0; i < 24; i++) {
                const label = String(i).padStart(2, '0') + ':00';
                html += '<option value="' + i + '"' + (i === val ? ' selected' : '') + '>' + label + '</option>';
            }
            html += '</select>';
            return html;
        }

        function statusHTML() {
            const night = isNightTime();
            const idle = isIdle();
            let icon = '☀️', text = '当前不是夜间';
            if (night && idle) { icon = '🌙'; text = '夜间 · 你已入睡，可能会收到消息'; }
            else if (night && !idle) { icon = '👀'; text = '夜间 · 你还在活跃，暂不打扰'; }
            return '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.1), rgba(var(--accent-color-rgb),0.03));border:1px solid rgba(var(--accent-color-rgb),0.2);border-radius:14px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">'
                + '<span style="font-size:22px;">' + icon + '</span>'
                + '<div style="flex:1;font-size:12px;color:var(--text-primary);line-height:1.5;">' + text + '</div>'
                + '<span style="font-size:11px;color:var(--accent-color);font-weight:700;white-space:nowrap;">今晚 ' + data.sentTonight + ' / ' + data.maxPerNight + '</span>'
                + '</div>';
        }

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'

            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-bed" style="color:var(--accent-color);margin-right:8px;"></i>夜间消息</span>'
            +   '<button id="nm-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + statusHTML()

            + '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.7;">'
            +   '你晚上睡着后，对方会"随机"给你发几条消息。可能一条都没有，也可能有好几条，第二天醒来就能看到。'
            + '</div>'

            // 总开关
            + '<div id="nm-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +   '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-bed" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +   '<div style="flex:1;">'
            +     '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启夜间消息</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="nm-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +   '</div>'
            +   '<div id="nm-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +     '<div id="nm-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +   '</div>'
            + '</div>'

            // 时间段
            + '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🕐 夜间时间段</div>'
            +   '<div style="display:flex;align-items:center;gap:10px;">'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:10.5px;color:var(--text-secondary);margin-bottom:4px;">开始</div>'
            +       hourSelect('nm-start-hour', data.startHour)
            +     '</div>'
            +     '<div style="font-size:13px;color:var(--text-secondary);padding-top:16px;">至</div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:10.5px;color:var(--text-secondary);margin-bottom:4px;">结束</div>'
            +       hourSelect('nm-end-hour', data.endHour)
            +     '</div>'
            +   '</div>'
            + '</div>'

            // 入睡判定
            + '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">😴 多久不活动算"入睡"</div>'
            +   '<div style="display:flex;align-items:center;gap:12px;">'
            +     '<input type="range" id="nm-idle" min="3" max="60" value="' + data.idleMinutes + '" style="flex:1;accent-color:var(--accent-color);">'
            +     '<span id="nm-idle-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.idleMinutes + '分钟</span>'
            +   '</div>'
            +   '<div style="font-size:10.5px;color:var(--text-secondary);margin-top:8px;opacity:0.75;line-height:1.5;">你超过这个时间没碰手机，就认为你睡着了</div>'
            + '</div>'

            // 每小时概率
            + '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎲 每小时触发概率</div>'
            +   '<div style="display:flex;align-items:center;gap:12px;">'
            +     '<input type="range" id="nm-chance" min="0" max="100" value="' + data.hourlyChance + '" style="flex:1;accent-color:var(--accent-color);">'
            +     '<span id="nm-chance-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.hourlyChance + '%</span>'
            +   '</div>'
            +   '<div style="font-size:10.5px;color:var(--text-secondary);margin-top:8px;opacity:0.75;line-height:1.5;">0% 一晚都不会发；100% 每小时都发</div>'
            + '</div>'

            // 每晚上限
            + '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +   '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">📮 每晚最多几条</div>'
            +   '<div style="display:flex;align-items:center;gap:12px;">'
            +     '<input type="range" id="nm-max" min="1" max="10" value="' + data.maxPerNight + '" style="flex:1;accent-color:var(--accent-color);">'
            +     '<span id="nm-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + data.maxPerNight + '条</span>'
            +   '</div>'
            + '</div>'

            // 用户回复后停止
            + '<div id="nm-stop-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:16px;cursor:pointer;">'
            +   '<div style="flex:1;">'
            +     '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">你回复后当晚停止</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">开启后，你只要发过消息，今晚就安静</div>'
            +   '</div>'
            +   '<div id="nm-stop-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.stopOnUserReply ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +     '<div id="nm-stop-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.stopOnUserReply ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +   '</div>'
            + '</div>'

            // 测试按钮
            + '<div style="display:flex;gap:10px;">'
            +   '<button id="nm-test" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即发一条</button>'
            +   '<button id="nm-save" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            + '</div>'

            + '</div>';

        document.body.appendChild(modal);

        // ★ 修正点：这里的 $ 只接受带 # 的 selector
        const $ = (selector) => modal.querySelector(selector);

        // 开关
        $('#nm-toggle').onclick = () => {
            data.enabled = !data.enabled;
            $('#nm-toggle-status').textContent = data.enabled ? '已开启' : '已关闭';
            const pill = $('#nm-toggle-pill'), knob = $('#nm-toggle-knob');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
        };

        // 停止开关
        $('#nm-stop-toggle').onclick = () => {
            data.stopOnUserReply = !data.stopOnUserReply;
            const pill = $('#nm-stop-pill'), knob = $('#nm-stop-knob');
            pill.style.background = data.stopOnUserReply ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.stopOnUserReply ? '3px' : 'auto';
            knob.style.left = data.stopOnUserReply ? 'auto' : '3px';
        };

        // 滑块实时
        $('#nm-idle').oninput = (e) => { $('#nm-idle-val').textContent = e.target.value + '分钟'; };
        $('#nm-chance').oninput = (e) => { $('#nm-chance-val').textContent = e.target.value + '%'; };
        $('#nm-max').oninput = (e) => { $('#nm-max-val').textContent = e.target.value + '条'; };

        const close = () => modal.remove();
        $('#nm-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        $('#nm-test').onclick = async () => {
            const old = data.sentTonight;
            data.sentTonight = 0;
            await sendNightMessage();
            data.sentTonight = Math.min(data.maxPerNight, old + 1);
            await save();
            if (typeof showNotification === 'function') showNotification('✓ 已发送一条夜间消息', 'success', 1500);
        };

        $('#nm-save').onclick = async () => {
            data.startHour = parseInt($('#nm-start-hour').value, 10);
            data.endHour = parseInt($('#nm-end-hour').value, 10);
            data.idleMinutes = parseInt($('#nm-idle').value, 10);
            data.hourlyChance = parseInt($('#nm-chance').value, 10);
            data.maxPerNight = parseInt($('#nm-max').value, 10);
            await save();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 夜间消息设置已保存', 'success');
        };
    };

    // ========== 设置入口（挂到"高级功能"列表）==========
    function bindEntry() {
        const container = document.querySelector('#advanced-modal .settings-item-list');
        if (!container) { setTimeout(bindEntry, 500); return; }
        if (container.querySelector('#night-message-function')) return;

        const item = document.createElement('div');
        item.className = 'settings-item';
        item.id = 'night-message-function';
        item.innerHTML = '<i class="fas fa-bed"></i><span>夜间消息</span>';
        item.onclick = function () {
            const adv = document.getElementById('advanced-modal');
            if (adv && typeof hideModal === 'function') hideModal(adv);
            window.openNightMessageSettings();
        };
        container.appendChild(item);
    }

    // ========== 初始化 ==========
    window.initNightMessage = function () {
        load().then(function () {
            bindActivity();
            bindEntry();
            setTimeout(bindEntry, 1500);
            setTimeout(bindEntry, 3000);

            // 每 5 分钟检查一次
            setInterval(check, 5 * 60 * 1000);
            // 启动 90 秒后先检查一次
            setTimeout(check, 90 * 1000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initNightMessage, 2000); });
    } else {
        setTimeout(window.initNightMessage, 2000);
    }

    console.log('[night-message] 夜间消息已加载 ✓');
})();