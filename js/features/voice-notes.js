/* ============================================================
 * voice-notes.js - 语音便签
 * 兼容版：localforage 不可用时自动降级到 localStorage
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'voiceNotes_v1';
    const SETTINGS_KEY = 'voiceNotesSettings_v1';

    // ========== 安全存储层（兼容 localforage / localStorage） ==========
    const _storage = {
        async get(key) {
            try {
                if (typeof localforage !== 'undefined' && localforage && localforage.getItem) {
                    const v = await localforage.getItem(key);
                    if (v !== undefined && v !== null) return v;
                }
            } catch (e) {}
            try {
                const raw = localStorage.getItem(key);
                if (raw === null) return null;
                try { return JSON.parse(raw); } catch (e) { return raw; }
            } catch (e) { return null; }
        },
        async set(key, val) {
            try {
                if (typeof localforage !== 'undefined' && localforage && localforage.setItem) {
                    await localforage.setItem(key, val);
                }
            } catch (e) {}
            try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
        }
    };

    function safeKey(name) {
        try {
            if (typeof getStorageKey === 'function') return getStorageKey(name);
        } catch (e) {}
        return name;
    }

    let settingsVN = {
        enabled: true,
        minHours: 2,
        maxHours: 5,
        chance: 35
    };

    let data = {
        notes: [],
        lastWriteTime: 0,
        initialized: false
    };

    let _loaded = false;
    let _schedulerTimer = null;

    const FALLBACK_TEXTS = [
        '我在想你', '今天过得好吗', '晚安', '早点睡', '想你了',
        '刚醒，想到你', '吃饭了吗', '注意保暖', '我在', '等我回来',
        '好梦', '别太累了', '突然想跟你说句话', '嗯…就是想你了'
    ];

    async function load() {
        if (_loaded) return;
        try {
            const s = await _storage.get(safeKey(SETTINGS_KEY));
            if (s && typeof s === 'object') Object.assign(settingsVN, s);
            const d = await _storage.get(safeKey(KEY));
            if (d && typeof d === 'object') Object.assign(data, d);
        } catch (e) { console.warn('[voice-notes] load fail', e); }
        _loaded = true;
    }
    async function persist() {
        try { await _storage.set(safeKey(KEY), data); } catch (e) {}
    }
    async function persistSettings() {
        try { await _storage.set(safeKey(SETTINGS_KEY), settingsVN); } catch (e) {}
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    }

    function pickText() {
        try {
            const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                ? customReplies.filter(t => t && String(t).trim() && String(t).length <= 20)
                : [];
            if (pool.length > 0 && Math.random() < 0.7) {
                return String(pool[Math.floor(Math.random() * pool.length)]).slice(0, 20);
            }
        } catch (e) {}
        return FALLBACK_TEXTS[Math.floor(Math.random() * FALLBACK_TEXTS.length)];
    }

    function estimateDuration(text) {
        const n = String(text || '').length;
        return Math.max(3, Math.min(10, Math.round(n / 4)));
    }

    function fmtTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const yesterday = new Date(now.getTime() - 86400000);
        const isYesterday = d.toDateString() === yesterday.toDateString();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        if (isToday) return '今天 ' + hh + ':' + mm;
        if (isYesterday) return '昨天 ' + hh + ':' + mm;
        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    async function writeNewNote(silent) {
        if (!settingsVN.enabled) return false;
        const text = pickText();
        if (!text) return false;

        const dur = estimateDuration(text);
        let voiceUrl = null;

        try {
            if (typeof window.playPartnerVoice === 'function') {
                voiceUrl = await window.playPartnerVoice(text, getPartnerName());
            }
        } catch (e) { console.warn('[voice-notes] tts fail', e); }

        const note = {
            id: 'vn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            text: text,
            duration: dur,
            voiceUrl: voiceUrl,
            createdAt: Date.now()
        };

        data.notes.unshift(note);
        if (data.notes.length > 30) data.notes = data.notes.slice(0, 30);
        data.lastWriteTime = Date.now();
        await persist();

        if (!silent) {
            const pn = getPartnerName();
            if (typeof showNotification === 'function') {
                showNotification('🎙 ' + pn + ' 留了一条语音便签', 'info', 3000);
            }
            if (typeof playSound === 'function') playSound('message');
        }
        return true;
    }
    window._voiceNoteWriteNow = writeNewNote;

    function scheduleNext() {
        if (_schedulerTimer) clearTimeout(_schedulerTimer);
        if (!settingsVN.enabled) return;

        let delayMs;
        if (!data.initialized) {
            delayMs = 30 * 1000;
        } else {
            const minMs = settingsVN.minHours * 3600000;
            const maxMs = settingsVN.maxHours * 3600000;
            delayMs = minMs + Math.random() * (maxMs - minMs);
        }

        _schedulerTimer = setTimeout(async function () {
            await load();
            try {
                if (!data.initialized) {
                    data.initialized = true;
                    await persist();
                    await writeNewNote(false);
                } else {
                    if (Math.random() * 100 < settingsVN.chance) {
                        await writeNewNote(false);
                    }
                }
            } catch (e) { console.warn('[voice-notes] schedule fail', e); }
            scheduleNext();
        }, delayMs);
    }

    let _playingAudio = null;

    function playNote(note, cardEl) {
    if (_playingAudio) {
        try { _playingAudio.pause(); } catch (e) {}
        _playingAudio = null;
    }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}

    document.querySelectorAll('.vn-card.playing').forEach(el => el.classList.remove('playing'));

    // 1) 有 MiniMax 语音 → 直接播
    if (note.voiceUrl) {
        const audio = new Audio(note.voiceUrl);
        _playingAudio = audio;
        if (cardEl) cardEl.classList.add('playing');
        audio.play().catch(function () {
            if (typeof showNotification === 'function') showNotification('播放失败', 'error');
        });
        audio.addEventListener('ended', function () {
            if (cardEl) cardEl.classList.remove('playing');
            if (_playingAudio === audio) _playingAudio = null;
        });
        return;
    }

    // 2) 没配 API → 用浏览器自带语音朗读
    if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
        try {
            const u = new SpeechSynthesisUtterance(String(note.text || ''));
            u.lang = 'zh-CN';
            u.rate = 1.0;
            u.pitch = 1.0;
            u.volume = 1.0;
            if (cardEl) cardEl.classList.add('playing');
            u.onend = function () {
                if (cardEl) cardEl.classList.remove('playing');
            };
            u.onerror = function () {
                if (cardEl) cardEl.classList.remove('playing');
            };
            window.speechSynthesis.speak(u);
            return;
        } catch (e) {
            console.warn('[voice-notes] speechSynthesis fail', e);
        }
    }

    // 3) 都不支持 → 弹个提示
    if (typeof showNotification === 'function') {
        showNotification('当前设备不支持语音播放', 'warning', 2500);
    }
}
    // ========== 便签墙 ==========
    window.openVoiceNotesPanel = async function () {
        await load();
        const old = document.getElementById('voice-notes-panel');
        if (old) old.remove();

        const pn = getPartnerName();

        const modal = document.createElement('div');
        modal.id = 'voice-notes-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        function buildCards() {
            if (data.notes.length === 0) {
                return '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary);">'
                    + '<div style="font-size:48px;margin-bottom:14px;opacity:0.35;">🎙</div>'
                    + '<div style="font-size:14px;font-weight:600;opacity:0.75;margin-bottom:6px;">便签墙还是空的</div>'
                    + '<div style="font-size:12px;opacity:0.55;line-height:1.7;">' + pn + ' 会在某个瞬间<br>留一条语音给你</div>'
                    + '</div>';
            }
            return data.notes.map(function (note) {
                return '<div class="vn-card" data-id="' + note.id + '">'
                    +   '<div class="vn-card-head">'
                    +     '<i class="fas fa-play-circle vn-play-icon"></i>'
                    +     '<span class="vn-dur">' + note.duration + '"</span>'
                    +   '</div>'
                    +   '<div class="vn-card-text">' + String(note.text).replace(/</g, '&lt;') + '</div>'
                    +   '<div class="vn-card-time">' + fmtTime(note.createdAt) + '</div>'
                    + '</div>';
            }).join('');
        }

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:94%;max-width:440px;height:88vh;max-height:720px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            +         '<i class="fas fa-microphone-alt" style="color:var(--accent-color);font-size:15px;"></i>'
            +       '</div>'
            +       '<div>'
            +         '<div style="font-size:16px;font-weight:700;color:var(--text-primary);">语音便签</div>'
            +         '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">共 ' + data.notes.length + ' 条</div>'
            +       '</div>'
            +     '</div>'
            +     '<div style="display:flex;gap:4px;">'
            +       '<button id="vn-settings" title="设置" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:4px 8px;"><i class="fas fa-cog"></i></button>'
            +       '<button id="vn-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="fas fa-times"></i></button>'
            +     '</div>'
            +   '</div>'
            +   '<div id="vn-grid" style="flex:1;overflow-y:auto;padding:14px 2px 4px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;align-content:start;">'
            +     buildCards()
            +   '</div>'
            + '</div>';

        if (!document.getElementById('vn-style')) {
            const s = document.createElement('style');
            s.id = 'vn-style';
            s.textContent = `
                .vn-card {
                    background: linear-gradient(160deg, rgba(var(--accent-color-rgb),0.14), rgba(var(--accent-color-rgb),0.04));
                    border: 1px solid rgba(var(--accent-color-rgb),0.2);
                    border-radius: 14px;
                    padding: 12px 12px 10px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
                    min-height: 110px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .vn-card:hover {
                    transform: translateY(-2px);
                    border-color: rgba(var(--accent-color-rgb),0.4);
                    box-shadow: 0 6px 18px rgba(var(--accent-color-rgb),0.15);
                }
                .vn-card:active { transform: scale(0.97); }
                .vn-card.playing {
                    background: linear-gradient(160deg, var(--accent-color), rgba(var(--accent-color-rgb),0.7));
                    border-color: var(--accent-color);
                }
                .vn-card.playing .vn-card-text,
                .vn-card.playing .vn-card-time,
                .vn-card.playing .vn-play-icon,
                .vn-card.playing .vn-dur { color: #fff !important; }
                .vn-card.playing::after {
                    content: '';
                    position: absolute;
                    left: 0; right: 0; bottom: 0;
                    height: 2px;
                    background: #fff;
                    animation: vnProgress 5s linear forwards;
                }
                @keyframes vnProgress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
                .vn-card-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .vn-play-icon {
                    font-size: 20px;
                    color: var(--accent-color);
                    transition: transform 0.2s;
                }
                .vn-card.playing .vn-play-icon {
                    animation: vnPulse 1s ease-in-out infinite;
                }
                @keyframes vnPulse {
                    0%,100% { transform: scale(1); }
                    50%     { transform: scale(1.15); }
                }
                .vn-dur {
                    font-size: 10px;
                    color: var(--accent-color);
                    font-weight: 700;
                    font-family: monospace;
                    background: rgba(255,255,255,0.4);
                    padding: 1px 6px;
                    border-radius: 8px;
                }
                html[data-theme="dark"] .vn-dur { background: rgba(0,0,0,0.3); }
                .vn-card-text {
                    font-size: 12.5px;
                    color: var(--text-primary);
                    line-height: 1.5;
                    font-weight: 500;
                    flex: 1;
                    word-break: break-word;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .vn-card-time {
                    font-size: 10px;
                    color: var(--text-secondary);
                    margin-top: 8px;
                    opacity: 0.85;
                }
            `;
            document.head.appendChild(s);
        }

        document.body.appendChild(modal);

        const close = function () { modal.remove(); };
        modal.querySelector('#vn-close').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        modal.querySelector('#vn-settings').onclick = function () {
            close();
            window.openVoiceNotesSettings();
        };

        modal.querySelectorAll('.vn-card').forEach(function (el) {
            el.onclick = function () {
                const id = el.dataset.id;
                const note = data.notes.find(function (n) { return n.id === id; });
                if (note) playNote(note, el);
            };
        });
    };

    // ========== 设置面板 ==========
    window.openVoiceNotesSettings = async function () {
        await load();
        const old = document.getElementById('voice-notes-settings');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'voice-notes-settings';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-cog" style="color:var(--accent-color);margin-right:8px;"></i>语音便签设置</span>'
            +     '<button id="vns-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div id="vns-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启语音便签</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="vns-toggle-status">' + (settingsVN.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="vns-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (settingsVN.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="vns-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (settingsVN.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 间隔（小时）</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>'
            +       '<input type="range" id="vns-min" min="1" max="12" value="' + settingsVN.minHours + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="vns-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + settingsVN.minHours + '小时</span>'
            +     '</div>'
            +     '<div style="display:flex;align-items:center;gap:10px;">'
            +       '<span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>'
            +       '<input type="range" id="vns-max" min="1" max="24" value="' + settingsVN.maxHours + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="vns-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:56px;text-align:right;">' + settingsVN.maxHours + '小时</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 每次触发的概率</div>'
            +     '<div style="display:flex;align-items:center;gap:12px;">'
            +       '<input type="range" id="vns-chance" min="0" max="100" value="' + settingsVN.chance + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="vns-chance-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + settingsVN.chance + '%</span>'
            +     '</div>'
            +   '</div>'
            +   '<button id="vns-write-now" style="width:100%;padding:12px;border:1.5px solid var(--accent-color);border-radius:12px;background:none;color:var(--accent-color);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);margin-bottom:12px;">'
            +     '<i class="fas fa-microphone-alt"></i> 让他现在留一条'
            +   '</button>'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="vns-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="vns-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = function () { modal.remove(); };
        modal.querySelector('#vns-close').onclick = close;
        modal.querySelector('#vns-cancel').onclick = close;
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        modal.querySelector('#vns-toggle').onclick = function () {
            settingsVN.enabled = !settingsVN.enabled;
            const pill = modal.querySelector('#vns-toggle-pill');
            const knob = modal.querySelector('#vns-toggle-knob');
            const status = modal.querySelector('#vns-toggle-status');
            pill.style.background = settingsVN.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = settingsVN.enabled ? '3px' : 'auto';
            knob.style.left = settingsVN.enabled ? 'auto' : '3px';
            status.textContent = settingsVN.enabled ? '已开启' : '已关闭';
        };

        const minSl = modal.querySelector('#vns-min');
        const maxSl = modal.querySelector('#vns-max');
        const minVal = modal.querySelector('#vns-min-val');
        const maxVal = modal.querySelector('#vns-max-val');
        const chSl = modal.querySelector('#vns-chance');
        const chVal = modal.querySelector('#vns-chance-val');

        minSl.oninput = function () {
            minVal.textContent = minSl.value + '小时';
            if (parseInt(minSl.value, 10) > parseInt(maxSl.value, 10)) {
                maxSl.value = minSl.value;
                maxVal.textContent = minSl.value + '小时';
            }
        };
        maxSl.oninput = function () {
            maxVal.textContent = maxSl.value + '小时';
            if (parseInt(maxSl.value, 10) < parseInt(minSl.value, 10)) {
                minSl.value = maxSl.value;
                minVal.textContent = maxSl.value + '小时';
            }
        };
        chSl.oninput = function () { chVal.textContent = chSl.value + '%'; };

        modal.querySelector('#vns-write-now').onclick = async function () {
            const ok = await writeNewNote(false);
            if (ok) {
                close();
                setTimeout(function () { window.openVoiceNotesPanel(); }, 100);
            } else {
                if (typeof showNotification === 'function') showNotification('生成失败', 'error', 1500);
            }
        };

        modal.querySelector('#vns-save').onclick = async function () {
            settingsVN.minHours = parseInt(minSl.value, 10);
            settingsVN.maxHours = parseInt(maxSl.value, 10);
            settingsVN.chance = parseInt(chSl.value, 10);
            await persistSettings();
            close();
            scheduleNext();
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success', 1500);
        };
    };

    window.initVoiceNotes = function () {
        load().then(function () { scheduleNext(); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initVoiceNotes, 2000); });
    } else {
        setTimeout(window.initVoiceNotes, 2000);
    }

    console.log('[voice-notes] 语音便签已加载 ✓');
})();