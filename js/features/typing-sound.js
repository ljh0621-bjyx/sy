/* ============================================================
 * typing-sound.js - 聊天打字音效
 * 我打字 + 对方正在输入 都能响
 * ============================================================ */
(function () {
    'use strict';

    const MY_KEY = 'typingSoundEnabled';
    const PARTNER_KEY = 'partnerTypingSoundEnabled';
    const PRESET_KEY = 'typingSoundPreset';
    const THROTTLE_MS = 38;

    let _sharedCtx = null;
    let lastPlayTime = 0;
    let partnerTypingTimer = null;

    function isMyEnabled() {
        const v = localStorage.getItem(MY_KEY);
        return v === null ? true : v === '1';
    }
    function isPartnerEnabled() {
        const v = localStorage.getItem(PARTNER_KEY);
        return v === null ? true : v === '1';
    }
    function getPreset() {
        return localStorage.getItem(PRESET_KEY) || 'soft';
    }

    function getCtx() {
        if (!_sharedCtx) {
            try {
                _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { return null; }
        }
        if (_sharedCtx.state === 'suspended') {
            _sharedCtx.resume().catch(() => {});
        }
        return _sharedCtx;
    }

    function playTypingSound(volumeScale) {
        if (typeof settings !== 'undefined' && settings.soundEnabled === false) return;
        const now = Date.now();
        if (now - lastPlayTime < THROTTLE_MS) return;
        lastPlayTime = now;

        try {
            const baseVol = (typeof settings !== 'undefined' && settings.soundVolume) ? settings.soundVolume : 0.15;
            const vol = Math.min(0.5, Math.max(0.005, baseVol * (volumeScale || 1) * 0.5));
            const preset = getPreset();
            const ctx = getCtx();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            let freq = 1200, dur = 0.035, type = 'sine';
            if (preset === 'soft') { freq = 1200; dur = 0.035; type = 'sine'; }
            else if (preset === 'mechanical') { freq = 1900; dur = 0.028; type = 'square'; }
            else if (preset === 'wooden') { freq = 880; dur = 0.055; type = 'triangle'; }

            const now2 = ctx.currentTime;
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now2);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now2 + dur);

            gain.gain.setValueAtTime(0.001, now2);
            gain.gain.exponentialRampToValueAtTime(vol, now2 + 0.004);
            gain.gain.exponentialRampToValueAtTime(0.0001, now2 + dur);

            osc.start(now2);
            osc.stop(now2 + dur + 0.01);
        } catch (e) {}
    }

    // ========== 我打字时 ==========
    function bindMyTyping() {
        const input = document.getElementById('message-input');
        if (!input || input._typingBound) return;
        input._typingBound = true;
        input.addEventListener('input', function (e) {
            if (!isMyEnabled()) return;
            if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteByCut') return;
            playTypingSound(1.0);
        });
    }

    // ========== 对方正在输入 ==========
    function bindPartnerTyping() {
        const wrapper = document.getElementById('typing-indicator-wrapper');
        if (!wrapper || wrapper._partnerTypingBound) return;
        wrapper._partnerTypingBound = true;
        const obs = new MutationObserver(function () {
            const visible = wrapper.style.display !== 'none' && wrapper.style.display !== '';
            if (visible && isPartnerEnabled()) {
                startPartnerTypingSound();
            } else {
                stopPartnerTypingSound();
            }
        });
        obs.observe(wrapper, { attributes: true, attributeFilter: ['style'] });
    }

    function startPartnerTypingSound() {
        if (partnerTypingTimer) return;
        playTypingSound(0.8);
        partnerTypingTimer = setInterval(function () {
            if (!isPartnerEnabled()) { stopPartnerTypingSound(); return; }
            playTypingSound(0.8);
        }, 140 + Math.random() * 160);
    }

    function stopPartnerTypingSound() {
        if (partnerTypingTimer) {
            clearInterval(partnerTypingTimer);
            partnerTypingTimer = null;
        }
    }

    // ========== 初始化 ==========
    window.initTypingSound = function () {
        bindMyTyping();
        bindPartnerTyping();
        setTimeout(bindMyTyping, 2000);
        setTimeout(bindPartnerTyping, 2000);
    };

    // ========== 供设置面板调用 ==========
    window.toggleMyTypingSound = function () {
        const cur = isMyEnabled();
        localStorage.setItem(MY_KEY, cur ? '0' : '1');
        return !cur;
    };
    window.togglePartnerTypingSound = function () {
        const cur = isPartnerEnabled();
        localStorage.setItem(PARTNER_KEY, cur ? '0' : '1');
        return !cur;
    };
    window.setTypingSoundPreset = function (preset) {
        localStorage.setItem(PRESET_KEY, preset);
    };
    window.isMyTypingSoundEnabled = isMyEnabled;
    window.isPartnerTypingSoundEnabled = isPartnerEnabled;
    window.getTypingSoundPreset = getPreset;
    window.previewTypingSound = function () { playTypingSound(1.0); };

})();