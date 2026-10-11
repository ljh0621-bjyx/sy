/* ============================================================
 * sleep-together.js - 共枕眠
 * 到点对方说晚安 + "睡着"，早上说早安
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'sleepTogether_v1';

    let data = {
        enabled: true,
        sleepTime: '23:00',    // 就寝时间
        wakeTime: '07:00',     // 起床时间
        sleeping: false,        // 当前是否在"睡着"
        lastGoodnightDate: null,
        lastGoodmorningDate: null
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

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function nowHM() {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }

    // ========== 晚安 ==========
    async function sendGoodnight() {
        const pn = getPartnerName();
        const today = todayStr();
        if (data.lastGoodnightDate === today) return;

        data.lastGoodnightDate = today;
        data.sleeping = true;
        await save();
        window._isPartnerSleeping = true;

        // 随机晚安语
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(t => t && String(t).trim())
            : [];
        const lines = [
            '晚安，早点睡。',
            '睡吧，我在。',
            '闭上眼睛，明天见。',
            '好梦，梦里也陪我。',
            '晚安，做个甜甜的梦。'
        ];
        const text = pool.length > 0 && Math.random() < 0.5
            ? pool[Math.floor(Math.random() * pool.length)]
            : lines[Math.floor(Math.random() * lines.length)];

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

        // 3 秒后追加一条"我睡了"
        setTimeout(function () {
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: null,
                    text: pn + ' 睡着了 💤',
                    timestamp: new Date(),
                    type: 'system'
                });
            }
        }, 3000);
    }

    // ========== 早安 ==========
    async function sendGoodmorning() {
        const pn = getPartnerName();
        const today = todayStr();
        if (data.lastGoodmorningDate === today) return;

        data.lastGoodmorningDate = today;
        data.sleeping = false;
        await save();
        window._isPartnerSleeping = false;

        const lines = [
            '早，睡得好吗？',
            '醒了没？该起来啦。',
            '早上好，今天也要好好的。',
            '早安，有没有梦到我？',
            '醒了吗？太阳晒屁股了。'
        ];
        const text = lines[Math.floor(Math.random() * lines.length)];

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
    }

    // ========== 每分钟检查 ==========
    function tick() {
        if (!data.enabled) return;
        const now = nowHM();
        const today = todayStr();

        // 就寝时间到
        if (!data.sleeping && now >= data.sleepTime && data.lastGoodnightDate !== today) {
            sendGoodnight();
        }

        // 起床时间到（必须已经睡着了才发早安，避免刚打开页面没到点也发）
        if (data.sleeping && now >= data.wakeTime && data.lastGoodmorningDate !== today) {
            // 跨过午夜了
            sendGoodmorning();
        }
    }

    // ========== 拦截对方回复 ==========
    function installReplyHook() {
        if (typeof window.simulateReply !== 'function') {
            setTimeout(installReplyHook, 500);
            return;
        }
        if (window._sleepReplyHook) return;
        window._sleepReplyHook = true;

        const orig = window.simulateReply;
        window.simulateReply = function () {
            // 对方睡着时，偶尔回一句"梦话"
            if (window._isPartnerSleeping) {
                if (Math.random() < 0.25) {
                    const pn = getPartnerName();
                    const murmurs = [
                        '嗯……',
                        '……别走',
                        '（翻了个身）',
                        '梦到你了……',
                        '唔……再睡一会'
                    ];
                    if (typeof addMessage === 'function') {
                        addMessage({
                            id: Date.now() + Math.floor(Math.random() * 1000),
                            sender: pn,
                            text: murmurs[Math.floor(Math.random() * murmurs.length)],
                            timestamp: new Date(),
                            status: 'received',
                            type: 'normal'
                        });
                    }
                }
                return;
            }
            return orig.apply(this, arguments);
        };
    }

    // ========== 面板 ==========
    window.openSleepTogetherPanel = function () {
        const old = document.getElementById('sleep-together-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'sleep-together-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-moon" style="color:var(--accent-color);margin-right:8px;"></i>共枕眠</span>'
            +     '<button id="st-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">到点他会主动说晚安，然后"睡着"不再回复；早上他会跟你说早安。</div>'

            // 开关
            +   '<div id="st-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-bed" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启共枕眠</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="st-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="st-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="st-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            // 就寝时间
            +   '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;">'
            +     '<div style="flex:1;font-size:13px;color:var(--text-primary);font-weight:600;"><i class="fas fa-moon" style="color:var(--accent-color);margin-right:6px;"></i>就寝时间</div>'
            +     '<input id="st-sleep" type="time" value="' + data.sleepTime + '" style="padding:8px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;box-sizing:border-box;">'
            +   '</div>'

            // 起床时间
            +   '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:18px;">'
            +     '<div style="flex:1;font-size:13px;color:var(--text-primary);font-weight:600;"><i class="fas fa-sun" style="color:#FFB84D;margin-right:6px;"></i>起床时间</div>'
            +     '<input id="st-wake" type="time" value="' + data.wakeTime + '" style="padding:8px 12px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:14px;font-family:var(--font-family);outline:none;box-sizing:border-box;">'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="st-test-night" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">🧪 测试晚安</button>'
            +     '<button id="st-test-morning" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);">🧪 测试早安</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#st-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#st-toggle').onclick = async () => {
            data.enabled = !data.enabled;
            await save();
            const pill = modal.querySelector('#st-toggle-pill');
            const knob = modal.querySelector('#st-toggle-knob');
            const status = modal.querySelector('#st-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        modal.querySelector('#st-sleep').onchange = async (e) => {
            data.sleepTime = e.target.value || '23:00';
            await save();
        };
        modal.querySelector('#st-wake').onchange = async (e) => {
            data.wakeTime = e.target.value || '07:00';
            await save();
        };

        // 测试按钮
        modal.querySelector('#st-test-night').onclick = async () => {
            data.lastGoodnightDate = null;
            await save();
            close();
            sendGoodnight();
        };
        modal.querySelector('#st-test-morning').onclick = async () => {
            data.lastGoodmorningDate = null;
            await save();
            close();
            sendGoodmorning();
        };
    };

    // ========== 初始化 ==========
    window.initSleepTogether = function () {
        load().then(function () {
            // 恢复"睡着"状态
            if (data.sleeping) window._isPartnerSleeping = true;
            installReplyHook();
            // 每 60 秒检查一次
            setInterval(tick, 60000);
            // 页面加载 3 秒后先检查一次
            setTimeout(tick, 3000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initSleepTogether, 1500); });
    } else {
        setTimeout(window.initSleepTogether, 1500);
    }

    console.log('[sleep-together] 共枕眠已加载 ✓');
})();