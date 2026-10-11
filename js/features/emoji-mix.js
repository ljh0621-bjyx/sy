/**
 * emoji-mix.js
 * 对方拼字卡 + 表情混合
 * 作用：对方发文字时，自动拼上 emoji，比如 "我想你了 ☺️"
 * 覆盖：所有面板（小说/漫画/电影/音乐/菜谱 + 主聊天）
 */

(function () {
    'use strict';

    const KEY = getStorageKey('emojiMixSettings_v1');

    let settingsMix = {
        enabled: true,
        chance: 30,           // 混入概率 %
        emojiSource: 'both',  // 'custom' / 'builtin' / 'both'
        position: 'random',   // 'before' / 'after' / 'random'
        maxPerMsg: 1          // 每条最多几个
    };

    // 内置表情池（温和、日常）
    const BUILTIN_EMOJIS = [
        '☺️','🥺','💕','✨','😊','😍','🤔','💭','🌸','🐱','🍓','☕',
        '🌈','🌙','⭐','💖','😳','😌','🤗','🥰','💗','💝','🌷','🐰',
        '🍰','🫶','💞','🥹','😘','🫰','💫','🌺','🍀','🦋','🧸','🎀'
    ];

    async function load() {
        try {
            const s = await localforage.getItem(KEY);
            if (s && typeof s === 'object') Object.assign(settingsMix, s);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, settingsMix); } catch (e) {}
    }
    load();

    // 检测字符串里有没有 emoji（避免重复叠加）
    function hasEmoji(text) {
        if (!text) return false;
        try {
            return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u.test(text);
        } catch (e) {
            return false;
        }
    }

    function pickEmoji() {
        let pool = [];
        if (settingsMix.emojiSource === 'custom' || settingsMix.emojiSource === 'both') {
            if (typeof customEmojis !== 'undefined' && Array.isArray(customEmojis)) {
                pool = pool.concat(customEmojis.filter(Boolean));
            }
        }
        if (settingsMix.emojiSource === 'builtin' || settingsMix.emojiSource === 'both') {
            pool = pool.concat(BUILTIN_EMOJIS);
        }
        if (pool.length === 0) pool = BUILTIN_EMOJIS;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 对外：混入 emoji
    window.mixEmojiIntoText = function (text) {
        if (!settingsMix.enabled) return text;
        if (!text || typeof text !== 'string') return text;
        if (hasEmoji(text)) return text;  // 已经有 emoji 就不重复加
        if (Math.random() * 100 >= settingsMix.chance) return text;

        const count = Math.max(1, parseInt(settingsMix.maxPerMsg, 10) || 1);
        let result = text;
        for (let i = 0; i < count; i++) {
            const emoji = pickEmoji();
            if (settingsMix.position === 'before') {
                result = emoji + ' ' + result;
            } else if (settingsMix.position === 'after') {
                result = result + ' ' + emoji;
            } else {
                if (Math.random() < 0.5) result = emoji + ' ' + result;
                else result = result + ' ' + emoji;
            }
        }
        return result;
    };

    // ★ 钩住 addMessage：对方发的文字消息，自动混入 emoji
    function installHook() {
        if (typeof window.addMessage !== 'function') {
            setTimeout(installHook, 400);
            return;
        }
        if (window._emojiMixHookInstalled) return;
        window._emojiMixHookInstalled = true;

        const originalAddMessage = window.addMessage;
        window.addMessage = function (message) {
            try {
                if (message &&
                    message.sender &&
                    message.sender !== 'user' &&
                    message.sender !== null &&
                    message.type === 'normal' &&
                    message.text &&
                    !message.image &&
                    !message._video &&
                    !message._music &&
                    !message._emojiMixed
                ) {
                    message.text = window.mixEmojiIntoText(message.text);
                    message._emojiMixed = true;
                }
            } catch (e) {}
            return originalAddMessage.apply(this, arguments);
        };

        console.log('[emoji-mix] 钩子已安装 ✓');
    }
    installHook();

    // ---------- 设置面板 ----------
    window.openEmojiMixSettings = function () {
        const old = document.getElementById('emoji-mix-settings');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'emoji-mix-settings';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:400px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'

            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-magic" style="color:var(--accent-color);margin-right:8px;"></i>字卡表情混合</span>'
            +     '<button id="em-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'

            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;line-height:1.6;">开启后，对方发文字时会自动拼上 emoji，比如「我想你了 ☺️」</div>'

            // 开关
            +   '<div id="em-toggle" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:12px;cursor:pointer;">'
            +     '<div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-magic" style="color:var(--accent-color);font-size:15px;"></i></div>'
            +     '<div style="flex:1;">'
            +       '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">开启混入</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="em-toggle-status">' + (settingsMix.enabled ? '已开启' : '已关闭') + '</div>'
            +     '</div>'
            +     '<div id="em-toggle-pill" style="width:44px;height:24px;border-radius:24px;background:' + (settingsMix.enabled ? 'var(--accent-color)' : 'var(--border-color)') + ';position:relative;transition:background 0.2s;flex-shrink:0;">'
            +       '<div id="em-toggle-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;' + (settingsMix.enabled ? 'right:3px' : 'left:3px') + ';transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>'
            +     '</div>'
            +   '</div>'

            // 概率
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 混入概率</div>'
            +     '<div style="display:flex;align-items:center;gap:12px;">'
            +       '<input id="em-chance" type="range" min="0" max="100" value="' + settingsMix.chance + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="em-chance-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + settingsMix.chance + '%</span>'
            +     '</div>'
            +   '</div>'

            // 表情来源
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">😊 表情来源</div>'
            +     '<div style="display:flex;gap:6px;">'
            +       '<button class="em-src" data-src="custom" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.emojiSource === 'custom' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.emojiSource === 'custom' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.emojiSource === 'custom' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">我的</button>'
            +       '<button class="em-src" data-src="builtin" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.emojiSource === 'builtin' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.emojiSource === 'builtin' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.emojiSource === 'builtin' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">内置</button>'
            +       '<button class="em-src" data-src="both" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.emojiSource === 'both' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.emojiSource === 'both' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.emojiSource === 'both' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">都要</button>'
            +     '</div>'
            +   '</div>'

            // 位置
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">📌 表情位置</div>'
            +     '<div style="display:flex;gap:6px;">'
            +       '<button class="em-pos" data-pos="before" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.position === 'before' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.position === 'before' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.position === 'before' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">☺️ 前</button>'
            +       '<button class="em-pos" data-pos="after" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.position === 'after' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.position === 'after' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.position === 'after' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">后 ☺️</button>'
            +       '<button class="em-pos" data-pos="random" style="flex:1;padding:8px 6px;border:1.5px solid ' + (settingsMix.position === 'random' ? 'var(--accent-color)' : 'var(--border-color)') + ';border-radius:10px;background:' + (settingsMix.position === 'random' ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)') + ';color:' + (settingsMix.position === 'random' ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-size:12px;cursor:pointer;font-family:var(--font-family);">随机</button>'
            +     '</div>'
            +   '</div>'

            // 数量
            +   '<div style="background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;padding:14px;margin-bottom:12px;">'
            +     '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🔢 每条最多几个</div>'
            +     '<div style="display:flex;align-items:center;gap:12px;">'
            +       '<input id="em-max" type="range" min="1" max="5" value="' + settingsMix.maxPerMsg + '" style="flex:1;accent-color:var(--accent-color);">'
            +       '<span id="em-max-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">' + settingsMix.maxPerMsg + ' 个</span>'
            +     '</div>'
            +   '</div>'

            // 预览
            +   '<div style="background:rgba(var(--accent-color-rgb),0.06);border:1px dashed rgba(var(--accent-color-rgb),0.3);border-radius:14px;padding:14px;margin-bottom:16px;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">👁 效果预览</div>'
            +     '<div id="em-preview" style="font-size:14px;color:var(--text-primary);line-height:1.7;">我想你了 ☺️</div>'
            +     '<button id="em-preview-btn" style="margin-top:10px;padding:6px 12px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);">重新生成预览</button>'
            +   '</div>'

            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="em-cancel" style="flex:1;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="em-save" style="flex:2;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'

            + '</div>';

        document.body.appendChild(modal);

        const $ = (s) => modal.querySelector(s);

        // 开关
        $('#em-toggle').onclick = () => {
            settingsMix.enabled = !settingsMix.enabled;
            $('#em-toggle-status').textContent = settingsMix.enabled ? '已开启' : '已关闭';
            const pill = $('#em-toggle-pill');
            const knob = $('#em-toggle-knob');
            pill.style.background = settingsMix.enabled ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = settingsMix.enabled ? '3px' : 'auto';
            knob.style.left = settingsMix.enabled ? 'auto' : '3px';
        };

        // 概率
        $('#em-chance').oninput = (e) => { $('#em-chance-val').textContent = e.target.value + '%'; };
        // 数量
        $('#em-max').oninput = (e) => { $('#em-max-val').textContent = e.target.value + ' 个'; };

        // 来源切换
        modal.querySelectorAll('.em-src').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.em-src').forEach(b => {
                    const active = b.dataset.src === btn.dataset.src;
                    b.style.borderColor = active ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.background = active ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)';
                    b.style.color = active ? 'var(--accent-color)' : 'var(--text-secondary)';
                });
            };
        });
        // 位置切换
        modal.querySelectorAll('.em-pos').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.em-pos').forEach(b => {
                    const active = b.dataset.pos === btn.dataset.pos;
                    b.style.borderColor = active ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.background = active ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--secondary-bg)';
                    b.style.color = active ? 'var(--accent-color)' : 'var(--text-secondary)';
                });
            };
        });

        // 预览
        $('#em-preview-btn').onclick = () => {
            const text = '我想你了';
            const src = modal.querySelector('.em-src[style*="accent-color"]')?.dataset.src || settingsMix.emojiSource;
            const pos = modal.querySelector('.em-pos[style*="accent-color"]')?.dataset.pos || settingsMix.position;
            const maxN = parseInt($('#em-max').value, 10) || 1;
            // 临时应用配置渲染
            const oldSettings = Object.assign({}, settingsMix);
            settingsMix.emojiSource = src;
            settingsMix.position = pos;
            settingsMix.maxPerMsg = maxN;
            settingsMix.chance = 100;
            settingsMix.enabled = true;
            const preview = window.mixEmojiIntoText(text);
            Object.assign(settingsMix, oldSettings);
            $('#em-preview').textContent = preview;
        };

        // 关闭
        const close = () => modal.remove();
        $('#em-close').onclick = close;
        $('#em-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 保存
        $('#em-save').onclick = async () => {
            settingsMix.chance = parseInt($('#em-chance').value, 10);
            settingsMix.maxPerMsg = parseInt($('#em-max').value, 10);
            const srcEl = modal.querySelector('.em-src[style*="accent-color"]');
            const posEl = modal.querySelector('.em-pos[style*="accent-color"]');
            if (srcEl) settingsMix.emojiSource = srcEl.dataset.src;
            if (posEl) settingsMix.position = posEl.dataset.pos;

            await save();
            close();
            if (typeof showNotification === 'function') showNotification('✓ 字卡表情混合设置已保存', 'success');
        };

        // 首次生成预览
        setTimeout(() => $('#em-preview-btn').click(), 100);
    };

    // ---------- 手动测试 ----------
    window._testEmojiMix = function (text) {
        return window.mixEmojiIntoText(text || '我想你了');
    };

})();

window.initEmojiMix = function () {
    const btn = document.getElementById('emoji-mix-function');
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function () {
            const advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openEmojiMixSettings === 'function') window.openEmojiMixSettings();
        });
    }
};