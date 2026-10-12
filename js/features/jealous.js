/* ============================================================
 * jealous.js - 他吃醋了
 * 你提到别人时，他轻轻吃一次醋
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'jealous_v1';

    // 触发词：这些词出现 → 有可能吃醋
    const TRIGGERS = [
        '同事', '我同事',
        '朋友', '我朋友', '好朋友',
        '同学', '我同学',
        '室友', '舍友',
        '老板', '上司', '领导',
        '学长', '学姐', '学弟', '学妹',
        '前男友', '前女友', '前任',
        '发小', '青梅竹马'
    ];

    // 吃醋的话（按"轻微→明显"分级）
    const LINES_LIGHT = [
        '嗯…他人挺好的吧。',
        '哦，是吗。',
        '这样啊。',
        '嗯。',
        '你们经常一起吗？',
        '他挺照顾你的？'
    ];

    const LINES_MID = [
        '哦，他经常找你啊？',
        '你对他也挺好的。',
        '那你跟他多聊吧。',
        '他那边什么都好？',
        '他是不是比我懂你。'
    ];

    const LINES_HEAVY = [
        '…那我呢。',
        '你是不是更喜欢跟他聊天。',
        '算了，不说了。',
        '你跟他聊的时候，会想到我吗。'
    ];

    let data = {
        enabled: true,
        chance: 30,           // 吃醋概率 %
        intensity: 'mid',     // 'light' / 'mid' / 'heavy'
        cooldownMin: 30,      // 冷却时间（分钟）
        lastJealousTime: 0
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

    function pickLine() {
        if (data.intensity === 'light') return LINES_LIGHT[Math.floor(Math.random() * LINES_LIGHT.length)];
        if (data.intensity === 'heavy') return LINES_HEAVY[Math.floor(Math.random() * LINES_HEAVY.length)];
        return LINES_MID[Math.floor(Math.random() * LINES_MID.length)];
    }

    // ========== 触发 ==========
    async function triggerJealous() {
        if (!data.enabled) return false;

        // 冷却
        const now = Date.now();
        if (now - data.lastJealousTime < data.cooldownMin * 60 * 1000) return false;

        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        const line = pickLine();

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: pn,
                text: line,
                timestamp: new Date(),
                status: 'received',
                type: 'normal'
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(pn, line);
        }

        data.lastJealousTime = now;
        await save();
        return true;
    }

    // ========== 扫描消息 ==========
    let _lastScannedId = null;
    let _scanLock = false;

    function scan() {
        if (_scanLock) return;
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (messages.length === 0) return;

            const last = messages[messages.length - 1];
            if (!last || last.sender !== 'user') return;
            if (!last.text || !last.text.trim()) return;
            if (String(last.id) === String(_lastScannedId)) return;
            _lastScannedId = last.id;

            // 检测触发词
            const text = String(last.text);
            let hit = false;
            for (let i = 0; i < TRIGGERS.length; i++) {
                if (text.indexOf(TRIGGERS[i]) !== -1) { hit = true; break; }
            }
            if (!hit) return;

            // 概率触发
            if (Math.random() * 100 >= data.chance) return;

            // 3~8 秒后回一句
            _scanLock = true;
            const delay = 3000 + Math.random() * 5000;
            setTimeout(function () {
                _scanLock = false;
                triggerJealous();
            }, delay);
        } catch (e) {
            console.warn('[jealous] scan fail', e);
            _scanLock = false;
        }
    }

    // ========== 面板 ==========
    window.openJealousPanel = function () {
        const old = document.getElementById('jealous-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'jealous-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-heart-broken" style="color:#FF6B6B;margin-right:8px;"></i>他吃醋了</span>'
            +     '<button id="jl-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.7;">你聊天里提到"同事""朋友"之类的词，他会有点小吃味。</div>'

            +   '<div id="jl-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(255,107,107,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-heart-broken" style="color:#FF6B6B;font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启吃醋</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="jl-toggle-status">' + (data.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="jl-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (data.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="jl-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (data.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 吃醋概率</div>'
            +     '<div style="display:flex;align-items:center;gap:12px;">'
            +       '<input type="range" id="jl-chance" min="0" max="100" value="' + data.chance + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="jl-chance-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + data.chance + '%</span>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">💔 吃醋程度</div>'
            +     '<div style="display:flex;gap:6px;">'
            +       '<button class="jl-int" data-int="light" style="flex:1;padding:9px 6px;border:1.5px solid ' + (data.intensity === 'light' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (data.intensity === 'light' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (data.intensity === 'light' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">轻微</button>'
            +       '<button class="jl-int" data-int="mid" style="flex:1;padding:9px 6px;border:1.5px solid ' + (data.intensity === 'mid' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (data.intensity === 'mid' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (data.intensity === 'mid' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">明显</button>'
            +       '<button class="jl-int" data-int="heavy" style="flex:1;padding:9px 6px;border:1.5px solid ' + (data.intensity === 'heavy' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (data.intensity === 'heavy' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (data.intensity === 'heavy' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">很酸</button>'
            +     '</div>'
            +   '</div>'

            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 冷却（分钟）</div>'
            +     '<div style="display:flex;align-items:center;gap:12px;">'
            +       '<input type="range" id="jl-cooldown" min="5" max="240" value="' + data.cooldownMin + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="jl-cooldown-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:64px;text-align:right;">' + data.cooldownMin + '分钟</span>'
            +     '</div>'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-top:8px;opacity:0.7;line-height:1.6;">两次吃醋至少隔这么久，避免连续刷屏。</div>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="jl-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 立即吃醋</button>'
            +     '<button id="jl-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#jl-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#jl-toggle').onclick = () => {
            data.enabled = !data.enabled;
            const pill = modal.querySelector('#jl-toggle-pill');
            const knob = modal.querySelector('#jl-toggle-knob');
            const status = modal.querySelector('#jl-toggle-status');
            pill.style.background = data.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = data.enabled ? '3px' : 'auto';
            knob.style.left = data.enabled ? 'auto' : '3px';
            status.textContent = data.enabled ? '已开启' : '已关闭';
        };

        const chanceSl = modal.querySelector('#jl-chance');
        const chanceVal = modal.querySelector('#jl-chance-val');
        const cooldownSl = modal.querySelector('#jl-cooldown');
        const cooldownVal = modal.querySelector('#jl-cooldown-val');

        chanceSl.oninput = () => { chanceVal.textContent = chanceSl.value + '%'; };
        cooldownSl.oninput = () => { cooldownVal.textContent = cooldownSl.value + '分钟'; };

        modal.querySelectorAll('.jl-int').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.jl-int').forEach(b => {
                    const active = b.dataset.int === btn.dataset.int;
                    b.style.borderColor = active ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.background = active ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)';
                    b.style.color = active ? 'var(--accent-color)' : 'var(--text-secondary)';
                });
            };
        });

        modal.querySelector('#jl-test').onclick = () => {
            data.lastJealousTime = 0;
            triggerJealous();
            if (typeof showNotification === 'function') showNotification('✓ 已触发', 'success', 1200);
        };

        modal.querySelector('#jl-save').onclick = async () => {
            data.chance = parseInt(chanceSl.value, 10);
            data.cooldownMin = parseInt(cooldownSl.value, 10);
            const intBtn = modal.querySelector('.jl-int[style*="accent-color"]');
            if (intBtn) data.intensity = intBtn.dataset.int;
            await save();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    // ========== 初始化 ==========
    window.initJealous = function () {
        load().then(function () {
            // 每 3 秒扫一次消息
            setInterval(scan, 3000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initJealous, 2500); });
    } else {
        setTimeout(window.initJealous, 2500);
    }

    console.log('[jealous] 他吃醋了 - 已加载 ✓');
})();