/* ============================================================
 * haptics.js - 触觉消息
 * 他发特定内容时，手机震动
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hapticsSettings_v1';

    let settingsH = {
        enabled: true,
        onHug: true,
        onLove: true,
        onRecall: true,
        lightMs: 200,
        heavyMs: 500
    };

    let _loaded = false;
    let _lastMsgCount = 0;
    let _lastRecallId = null;

    // ========== 检测设备支持 ==========
    function canVibrate() {
        return typeof navigator !== 'undefined'
            && typeof navigator.vibrate === 'function';
    }

    // ========== 震动 ==========
    function vibrate(pattern) {
        if (!settingsH.enabled) return;
        if (!canVibrate()) return;
        try { navigator.vibrate(pattern); } catch (e) {}
    }

    function vibrateShort() {
        vibrate(settingsH.lightMs);
    }

    function vibrateLong() {
        vibrate(settingsH.heavyMs);
    }

    function vibrateDouble() {
        // 震 150 → 停 100 → 震 150
        vibrate([150, 100, 150]);
    }

    // ========== 关键词表 ==========
    const HUG_WORDS = [
        '抱抱', '抱抱你', '亲亲', '亲亲你', '摸摸头', '摸摸',
        '抱一个', '亲一口', '捏捏脸', '搂住', '抱住', '蹭蹭',
        '摸摸头', '拍拍你', '拍拍头', '牵牵手', '牵手'
    ];

    const LOVE_WORDS = [
        '我爱你', '爱你', '想你', '好想你', '超级想你', '一直想你',
        '很喜欢你', '喜欢你', '想见你', '想见你', '好想见你',
        '爱你哦', '很想你', '天天想你', '心里都是你'
    ];

    function matchAny(text, list) {
        if (!text) return false;
        const t = String(text);
        return list.some(function (w) { return t.indexOf(w) !== -1; });
    }

    // ========== 处理一条消息 ==========
    function handleMessage(msg) {
        if (!msg) return;
        // 只处理对方发的
        if (msg.sender === 'user') return;
        if (msg.sender === null) return;
        if (msg.type === 'system' || msg.type === 'call-event') return;
        if (!msg.text) return;

        const text = String(msg.text);

        // 先检查"我爱你/想你"（长震，优先级更高）
        if (settingsH.onLove && matchAny(text, LOVE_WORDS)) {
            vibrateLong();
            return;
        }

        // 再检查"抱抱/亲亲"（短震）
        if (settingsH.onHug && matchAny(text, HUG_WORDS)) {
            vibrateShort();
            return;
        }
    }

    // ========== 检测撤回消息 ==========
    function checkRecall() {
        if (!settingsH.onRecall) return;
        if (typeof messages === 'undefined' || !Array.isArray(messages)) return;

        // 从后往前找最后一条撤回消息
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (!m) continue;
            if (m.recalled && String(m.id) !== String(_lastRecallId)) {
                _lastRecallId = m.id;
                vibrateDouble();
                return;
            }
            // 扫到未撤回的消息就停（避免每次全扫）
            if (!m.recalled && i < messages.length - 3) break;
        }
    }

    // ========== 扫新消息 ==========
    function scanMessages() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (messages.length <= _lastMsgCount) {
                if (messages.length < _lastMsgCount) _lastMsgCount = messages.length;
                checkRecall();
                return;
            }

            const newMsgs = messages.slice(_lastMsgCount);
            _lastMsgCount = messages.length;

            newMsgs.forEach(handleMessage);
            checkRecall();
        } catch (e) {}
    }

    // ========== 设置面板 ==========
    window.openHapticsSettings = function () {
        const old = document.getElementById('haptics-settings-panel');
        if (old) old.remove();

        const supported = canVibrate();

        const modal = document.createElement('div');
        modal.id = 'haptics-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        function toggleRow(id, label, sub, active) {
            return '<div class="hp-toggle" data-key="' + id + '" style="'
                + 'display:flex;align-items:center;gap:12px;padding:14px;'
                + 'background:var(--primary-bg);border:1px solid var(--border-color);'
                + 'border-radius:14px;margin-bottom:10px;cursor:pointer;'
                + '">'
                +   '<div style="flex:1;">'
                +     '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + label + '</div>'
                +     (sub ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + sub + '</div>' : '')
                +   '</div>'
                +   '<div class="hp-pill" style="width:44px;height:24px;border-radius:24px;'
                +     'background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';'
                +     'position:relative;transition:background 0.2s;flex-shrink:0;">'
                +     '<div class="hp-knob" style="position:absolute;width:18px;height:18px;'
                +       'border-radius:50%;background:#fff;top:3px;'
                +       (active ? 'right:3px;' : 'left:3px;')
                +       'transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
                +   '</div>'
                + '</div>';
        }

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">'
            +       '<i class="fas fa-mobile-alt" style="color:var(--accent-color);margin-right:8px;"></i>触觉消息'
            +     '</span>'
            +     '<button id="hp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   (supported ? '' :
                    '<div style="background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.25);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#ff5050;line-height:1.6;">'
                    + '⚠️ 当前设备/浏览器不支持震动 API<br>（iPhone Safari 不支持，安卓 Chrome 支持）'
                    + '</div>')

            +   toggleRow('enabled', '总开关', '关闭后所有震动都不触发', settingsH.enabled)
            +   toggleRow('onHug', '抱抱 / 亲亲', '收到这类消息 → 短震一下', settingsH.onHug)
            +   toggleRow('onLove', '我爱你 / 想你', '收到这类消息 → 长震一下', settingsH.onLove)
            +   toggleRow('onRecall', '撤回消息', '他撤回一条 → 震两下', settingsH.onRecall)

            +   '<div style="display:flex;gap:10px;margin-top:16px;">'
            +     '<button id="hp-test" style="flex:1;padding:12px;border:1.5px solid var(--accent-color);border-radius:12px;background:none;color:var(--accent-color);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">'
            +       '<i class="fas fa-play"></i> 测试震动'
            +     '</button>'
            +     '<button id="hp-save" style="flex:1.5;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        // 绑定开关
        modal.querySelectorAll('.hp-toggle').forEach(function (row) {
            row.onclick = function () {
                const key = row.dataset.key;
                settingsH[key] = !settingsH[key];
                const pill = row.querySelector('.hp-pill');
                const knob = row.querySelector('.hp-knob');
                pill.style.background = settingsH[key] ? 'var(--accent-color)' : 'var(--border-color)';
                knob.style.right = settingsH[key] ? '3px' : 'auto';
                knob.style.left = settingsH[key] ? 'auto' : '3px';
            };
        });

        const close = function () { modal.remove(); };
        modal.querySelector('#hp-close').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        modal.querySelector('#hp-test').onclick = function () {
            if (!canVibrate()) {
                if (typeof showNotification === 'function') showNotification('当前设备不支持震动', 'warning', 2000);
                return;
            }
            vibrate([100, 80, 100, 80, 300]);
        };

        modal.querySelector('#hp-save').onclick = function () {
            try { localStorage.setItem(KEY, JSON.stringify(settingsH)); } catch (e) {}
            try { localforage.setItem(getStorageKey(KEY), settingsH); } catch (e) {}
            close();
            if (typeof showNotification === 'function') showNotification('✓ 触觉设置已保存', 'success', 1500);
        };
    };

    // ========== 手动测试 ==========
    window.testHaptic = function (type) {
        if (type === 'short') vibrateShort();
        else if (type === 'long') vibrateLong();
        else if (type === 'double') vibrateDouble();
        else vibrate([100, 80, 100, 80, 300]);
    };

    // ========== 加载设置 ==========
    async function load() {
        if (_loaded) return;
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(settingsH, saved);
        } catch (e) {}
        _loaded = true;
    }

    // ========== 初始化 ==========
    window.initHaptics = function () {
        load().then(function () {
            // 每 800ms 扫一次消息
            setInterval(scanMessages, 800);

            // 初始同步
            setTimeout(function () {
                if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                    _lastMsgCount = messages.length;
                }
            }, 2000);

            console.log('[haptics] 触觉消息已加载 ✓  支持=' + canVibrate());
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initHaptics, 1500); });
    } else {
        setTimeout(window.initHaptics, 1500);
    }
})();