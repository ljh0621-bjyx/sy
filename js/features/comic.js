/**
 * comic.js
 * 一起看漫画（支持文字 / 表情 / 表情包 / 图片 / 语音）
 */

(function () {
    'use strict';

    const KEY = getStorageKey('comicData_v1');

    let data = {
        comics: [],       // [{ id, name, chapters: [{ title, images: [url] }] }]
        currentComicId: null,
        currentChapter: 0,
        chatHistory: []
    };

    let panelEl = null;

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) {
                data.comics = saved.comics || [];
                data.chatHistory = saved.chatHistory || [];
                data.currentComicId = null;
                data.currentChapter = 0;
            }
        } catch (e) { console.warn('[comic] load fail', e); }
    }
    async function save() {
        try {
            await localforage.setItem(KEY, {
                comics: data.comics,
                chatHistory: data.chatHistory.slice(-200)
            });
        } catch (e) { console.warn('[comic] save fail', e); }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- 拿"发语音概率"：从聊天设置的滑块里读 ----------
    function getVoiceChance() {
        if (typeof window.getAIReplyChance === 'function') {
            return window.getAIReplyChance('voiceChance', 15);
        }
        return 15;
    }

    // ---------- 批量添加漫画 ----------
    window.addComicImages = async function (files) {
        if (!files || files.length === 0) return;
        const name = prompt('给这部漫画起个名字：', '未命名漫画');
        if (!name || !name.trim()) return;

        const images = [];
        for (const file of files) {
            try {
                if (file.size > 5 * 1024 * 1024) continue;
                const base64 = await optimizeImage(file, 1000, 0.85);
                images.push(base64);
            } catch (e) { console.warn('图片处理失败', e); }
        }
        if (images.length === 0) {
            showNotification('没有有效图片', 'warning');
            return;
        }

        data.comics.push({
            id: 'comic_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: name.trim(),
            chapters: [{ title: '全一话', images }]
        });
        await save();
        renderPanel();
        showNotification('已添加 ' + images.length + ' 页', 'success');
    };

    window.openComic = function (id) {
        data.currentComicId = id;
        data.currentChapter = 0;
        renderPanel();
    };

    window.deleteComic = async function (id) {
        if (!confirm('删除这部漫画？')) return;
        data.comics = data.comics.filter(c => c.id !== id);
        if (data.currentComicId === id) {
            data.currentComicId = null;
            data.currentChapter = 0;
        }
        await save();
        renderPanel();
    };

    window.jumpToComicChapter = function (idx) {
        data.currentChapter = idx;
        renderPanel();
    };

    window.prevComicChapter = function () {
        if (data.currentChapter > 0) {
            data.currentChapter--;
            renderPanel();
        }
    };

    window.nextComicChapter = function () {
        const c = data.comics.find(x => x.id === data.currentComicId);
        if (!c) return;
        if (data.currentChapter < c.chapters.length - 1) {
            data.currentChapter++;
            renderPanel();
        }
    };

    // ---------- 聊天发送（含语音） ----------
    window.sendComicChat = async function (type, content, voiceUrl, duration) {
        // ★ 我发语音：先推占位，后台合成回填
       if (type === 'voice') {
    // A：我录音发语音（voiceUrl 已存在）
    if (voiceUrl) {
        const dur = duration || Math.max(2, Math.ceil(String(content || '').length / 4));
        data.chatHistory.push({
            sender: 'me', type: 'voice', content: content || '',
            duration: dur, voiceUrl: voiceUrl, time: Date.now()
        });
        if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
        await save();
        renderPanel();
        scrollChatToBottom();
    }
    // B：兜底 —— 没传 voiceUrl 时从字卡合成
    else {
        const dur = Math.max(2, Math.ceil(String(content || '').length / 4));
        data.chatHistory.push({
            sender: 'me', type: 'voice', content: content,
            duration: dur, voiceUrl: null, time: Date.now()
        });
        if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
        await save();
        renderPanel();
        scrollChatToBottom();
        (async () => {
            try {
                if (typeof window.playPartnerVoice === 'function') {
                    const speaker = (typeof settings !== 'undefined' && settings.myName) || '我';
                    const url = await window.playPartnerVoice(content, speaker);
                    if (url) {
                        for (let i = data.chatHistory.length - 1; i >= 0; i--) {
                            const h = data.chatHistory[i];
                            if (h.sender === 'me' && h.type === 'voice' && !h.voiceUrl && h.content === content) {
                                h.voiceUrl = url; break;
                            }
                        }
                        await save(); renderPanel();
                    }
                }
            } catch (e) { console.warn('[comic] my voice fail', e); }
        })();
    }
        } else {
            data.chatHistory.push({ sender: 'me', type, content, time: Date.now() });
            if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
            await save();
            renderPanel();
            scrollChatToBottom();
        }

        // 对方回复
        setTimeout(async () => {
            const reply = generatePartnerReply();
            if (reply.type === 'text' && typeof window.simulatePartnerTypingProcess === 'function') {
                try { await window.simulatePartnerTypingProcess(reply.content); } catch (e) {}
            }
            if (reply.type === 'voice') {
                const dur = Math.max(2, Math.ceil(String(reply.content || '').length / 4));
                let voiceUrl = null;
                try {
                    if (typeof window.playPartnerVoice === 'function') {
                        const speaker = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
                        voiceUrl = await window.playPartnerVoice(reply.content, speaker);
                    }
                } catch (e) { console.warn('[comic] partner voice fail', e); }
                data.chatHistory.push({
                    sender: 'partner', type: 'voice', content: reply.content,
                    duration: dur, voiceUrl: voiceUrl, time: Date.now()
                });
            } else {
                data.chatHistory.push({ sender: 'partner', type: reply.type, content: reply.content, time: Date.now() });
            }
            if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
            await save();
            renderPanel();
            scrollChatToBottom();
        }, 1500 + Math.random() * 2000);
    };

    // ---------- 对方回复：按 chat 设置里的语音概率决定要不要发语音 ----------
    function generatePartnerReply() {
        const rand = Math.random();
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(t => t && String(t).trim())
            : [];

        // 读聊天设置里"发语音"滑块 → 决定是否发语音
        const voiceChance = getVoiceChance();      // 0~100
        const voiceRoll = Math.random() * 100;

        if (voiceRoll < voiceChance && pool.length > 0 && typeof window.playPartnerVoice === 'function') {
            return { type: 'voice', content: pool[Math.floor(Math.random() * pool.length)] };
        }

        // 其余照旧
        if (rand < 0.6 && pool.length > 0) {
            return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
        }
        if (rand < 0.8) {
            const emojis = ['📖','📚','✨','💕','🥺','😊','😍','🤔','🎨','💭'];
            return { type: 'emoji', content: emojis[Math.floor(Math.random() * emojis.length)] };
        }
        if (rand < 0.95 && typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) {
            return { type: 'sticker', content: stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)] };
        }
        if (typeof window.getRandomPartnerImage === 'function') {
            const img = window.getRandomPartnerImage();
            if (img) return { type: 'image', content: img.url };
        }
        if (pool.length > 0) return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
        return { type: 'text', content: '...' };
    }

    function scrollChatToBottom() {
        const el = document.getElementById('comic-chat-scroll');
        if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }

    // ---------- 语音播放 ----------
    window.playComicVoice = function (el) {
        const url = el.getAttribute('data-url');
        const dur = parseInt(el.getAttribute('data-duration'), 10) || 3;
        const bar = el.querySelector('.voice-bar');
        if (!url) {
            if (typeof showNotification === 'function') showNotification('语音正在合成…请稍等', 'info', 1500);
            return;
        }
        try {
            const audio = new Audio(url);
            audio.play().catch(function () {});
            if (bar) {
                bar.style.transition = 'width ' + dur + 's linear';
                bar.style.width = '100%';
                setTimeout(function () {
                    bar.style.transition = 'width 0.2s';
                    bar.style.width = '0%';
                }, dur * 1000);
            }
        } catch (e) {}
    };

    // ---------- 渲染面板 ----------
    function renderPanel() {
        const card = document.getElementById('comic-card');
        if (!card) return;

        const current = data.comics.find(c => c.id === data.currentComicId);
        const chapter = current ? current.chapters[data.currentChapter] : null;

        const listHTML = data.comics.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">暂无漫画，点击上方按钮添加</div>'
            : data.comics.map(c => {
                const active = c.id === data.currentComicId;
                return '<div data-comic-id="' + c.id + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<div style="width:26px;height:26px;border-radius:8px;background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-book" style="font-size:10px;color:' + (active ? '#fff' : 'var(--text-secondary)') + ';"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:12px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(c.name) + '</div>'
                    + '<div style="font-size:10px;color:var(--text-secondary);">' + c.chapters.length + ' 话</div>'
                    + '</div>'
                    + '<button data-del-comic="' + c.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;">✕</button>'
                    + '</div>';
            }).join('');

        let comicViewHTML = '';
        if (current && chapter) {
            const pagesHTML = chapter.images.map((img) =>
                '<img src="' + img + '" loading="lazy" style="width:100%;display:block;border-radius:8px;margin-bottom:8px;">'
            ).join('');
            comicViewHTML =
                '<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">' + escapeHtml(chapter.title) + ' · ' + chapter.images.length + ' 页</div>'
                + '<div style="max-height:220px;overflow-y:auto;padding-right:4px;border-radius:10px;">' + pagesHTML + '</div>'
                + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;justify-content:center;">'
                + '<button id="comic-prev" style="padding:6px 14px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);' + (data.currentChapter === 0 ? 'opacity:0.4;' : '') + '">上一话</button>'
                + '<span style="font-size:11px;color:var(--text-secondary);">' + (data.currentChapter + 1) + ' / ' + current.chapters.length + '</span>'
                + '<button id="comic-next" style="padding:6px 14px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);' + (data.currentChapter >= current.chapters.length - 1 ? 'opacity:0.4;' : '') + '">下一话</button>'
                + '</div>';
        } else {
            comicViewHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">请从下方列表选择漫画</div>';
        }

        // ★ 聊天记录渲染（含语音气泡）
        const chatHTML = data.chatHistory.length === 0
            ? '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:11px;">还没有对话</div>'
            : data.chatHistory.map(msg => {
                const isMe = msg.sender === 'me';
                let inner = '';
                if (msg.type === 'text') {
                    inner = '<span style="font-size:12px;">' + escapeHtml(msg.content) + '</span>';
                } else if (msg.type === 'emoji') {
                    inner = '<span style="font-size:20px;">' + msg.content + '</span>';
                } else if (msg.type === 'sticker') {
                    inner = '<img src="' + msg.content + '" style="max-width:90px;max-height:90px;border-radius:8px;display:block;">';
                } else if (msg.type === 'image') {
                    inner = '<img src="' + msg.content + '" style="max-width:140px;max-height:140px;border-radius:8px;display:block;">';
                } else if (msg.type === 'voice') {
                    const dur = msg.duration || Math.max(2, Math.ceil(String(msg.content || '').length / 4));
                    inner = '<div class="comic-voice-bubble" data-url="' + (msg.voiceUrl || '') + '" data-duration="' + dur + '" onclick="playComicVoice(this)" '
                        + 'style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:90px;padding:2px 0;">'
                        + '<i class="fas fa-volume-up" style="font-size:14px;opacity:0.9;"></i>'
                        + '<div style="flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.3);min-width:30px;position:relative;overflow:hidden;">'
                        +   '<div class="voice-bar" style="position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.9);transition:width 0.15s linear;"></div>'
                        + '</div>'
                        + '<span style="font-size:11px;opacity:0.85;">' + dur + '"</span>'
                        + '</div>';
                }
                return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end;' : '') + ';margin-bottom:6px;">'
                    + '<div style="background:' + (isMe ? 'var(--accent-color)' : 'var(--secondary-bg)') + ';color:' + (isMe ? '#fff' : 'var(--text-primary)') + ';padding:6px 10px;border-radius:12px;max-width:72%;word-break:break-word;">'
                    + inner + '</div></div>';
            }).join('');

        card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<div style="width:36px;height:36px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-book" style="color:var(--accent-color);"></i></div>'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">一起看漫画</span></div>'
            + '<button id="comic-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div style="padding:14px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;max-height:340px;overflow-y:auto;">' + comicViewHTML + '</div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div id="comic-chat-scroll" style="flex:1;overflow-y:auto;padding:14px 20px;">' + chatHTML + '</div>'
            + '<div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<button id="comic-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            + '<button id="comic-sticker" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-image"></i></button>'
            + '<button id="comic-voice" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-microphone"></i></button>'
            + '<button id="comic-image" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-camera"></i></button>'
            + '<input id="comic-input" type="text" placeholder="边看边聊…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid var(--border-color);border-radius:20px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);">'
            + '<button id="comic-send" style="padding:8px 14px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;">发送</button>'
            + '</div></div>'

            + '<div style="border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<div id="comic-list-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;cursor:pointer;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-list" style="margin-right:6px;"></i>漫画列表 (' + data.comics.length + ')</span>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<button id="comic-import" style="padding:4px 10px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:11px;cursor:pointer;">+ 添加</button>'
            + '<i id="comic-list-arrow" class="fas fa-chevron-up" style="font-size:11px;color:var(--text-secondary);transition:transform 0.2s;"></i>'
            + '</div></div>'
            + '<div id="comic-list-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s;border-top:1px solid var(--border-color);">'
            + '<div style="padding:8px 12px;max-height:200px;overflow-y:auto;">' + listHTML + '</div>'
            + '</div></div>'

            + '</div>';

        bindPanelEvents();
    }

    function bindPanelEvents() {
        const card = document.getElementById('comic-card');
        if (!card) return;

        document.getElementById('comic-close-btn').onclick = () => window.closeComicPanel();

        document.getElementById('comic-list-toggle').onclick = (e) => {
            if (e.target.closest('#comic-import')) return;
            const body = document.getElementById('comic-list-body');
            const arrow = document.getElementById('comic-list-arrow');
            if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
                body.style.maxHeight = '220px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0)';
            }
        };

        document.getElementById('comic-import').onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (ev) => window.addComicImages(Array.from(ev.target.files));
            input.click();
        };

        card.querySelectorAll('[data-comic-id]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.closest('[data-del-comic]')) return;
                window.openComic(el.dataset.comicId);
            };
        });
        card.querySelectorAll('[data-del-comic]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                window.deleteComic(btn.dataset.delComic);
            };
        });

        const prevBtn = document.getElementById('comic-prev');
        if (prevBtn) prevBtn.onclick = () => window.prevComicChapter();
        const nextBtn = document.getElementById('comic-next');
        if (nextBtn) nextBtn.onclick = () => window.nextComicChapter();

        const input = document.getElementById('comic-input');
        const sendBtn = document.getElementById('comic-send');
        if (sendBtn && input) {
            const doSend = () => {
                const v = input.value.trim();
                if (!v) return;
                input.value = '';
                window.sendComicChat('text', v);
            };
            sendBtn.onclick = doSend;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); doSend(); }
            });
        }

        const emojiBtn = document.getElementById('comic-emoji');
        if (emojiBtn) emojiBtn.onclick = () => {
            const emojis = ['📖','📚','✨','💕','🥺','😊','😍','🤔','🎨','💭'];
            openComicQuickPicker('选择表情', emojis.map(e => ({ type: 'emoji', content: e })));
        };
        const stickerBtn = document.getElementById('comic-sticker');
        if (stickerBtn) stickerBtn.onclick = () => {
            const stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? stickerLibrary : [];
            if (stickers.length === 0) { showNotification('对方表情库为空', 'warning'); return; }
            openComicQuickPicker('选择表情包', stickers.map(s => ({ type: 'sticker', content: s })));
        };
        // ★ 麦克风按钮
        // ★ 麦克风按钮 → 真录音
const voiceBtn = document.getElementById('comic-voice');
if (voiceBtn) voiceBtn.onclick = () => {
    if (!window.PanelVoiceRecorder || !window.PanelVoiceRecorder.isSupported()) {
        if (typeof showNotification === 'function') showNotification('当前浏览器不支持录音', 'warning');
        return;
    }
    window.PanelVoiceRecorder.record((audioUrl, duration) => {
        if (!audioUrl) return;   // 用户取消
        window.sendComicChat('voice', '', audioUrl, duration);
    });
};
// ★ 发图片
const imageBtn = document.getElementById('comic-image');
if (imageBtn) imageBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            if (typeof showNotification === 'function') showNotification('图片不能超过 5MB', 'error');
            return;
        }
        try {
            const base64 = await optimizeImage(file, 800, 0.85);
            window.sendComicChat('image', base64);
        } catch (err) {
            if (typeof showNotification === 'function') showNotification('图片处理失败', 'error');
        }
    };
    input.click();
};
    }

    function openComicQuickPicker(title, items) {
        const old = document.getElementById('comic-quick-picker');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'comic-quick-picker';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;';
        const gridHTML = items.map((it, i) => {
            if (it.type === 'emoji') {
                return '<div data-pi="' + i + '" style="display:flex;align-items:center;justify-content:center;font-size:26px;aspect-ratio:1/1;background:var(--primary-bg);border-radius:10px;cursor:pointer;padding:6px;box-sizing:border-box;">' + it.content + '</div>';
            } else {
                return '<div data-pi="' + i + '" style="aspect-ratio:1/1;background:var(--primary-bg);border-radius:10px;cursor:pointer;overflow:hidden;"><img src="' + it.content + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>';
            }
        }).join('');
        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px 20px 0 0;width:100%;max-width:500px;max-height:60vh;display:flex;flex-direction:column;box-shadow:0 -10px 60px rgba(0,0,0,0.3);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border-color);">'
            + '<span style="font-size:14px;font-weight:600;color:var(--text-primary);">' + title + '</span>'
            + '<button id="comic-picker-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:14px 20px 20px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + gridHTML + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('comic-picker-close').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelectorAll('[data-pi]').forEach(el => {
            el.onclick = () => {
                const it = items[parseInt(el.dataset.pi)];
                modal.remove();
                window.sendComicChat(it.type, it.content);
            };
        });
    }

    window.openComicPanel = function () {
        if (panelEl) return;
        panelEl = document.createElement('div');
        panelEl.id = 'comic-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        const card = document.createElement('div');
        card.id = 'comic-card';
        card.style.cssText = 'background:var(--secondary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:760px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);';
        panelEl.appendChild(card);
        panelEl.addEventListener('click', (e) => { if (e.target === panelEl) window.closeComicPanel(); });
        document.body.appendChild(panelEl);
        renderPanel();
    };

    window.closeComicPanel = function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();

window.initComicPanel = function() {
    var btn = document.getElementById('comic-function');
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function() {
            var advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            if (typeof window.openComicPanel === 'function') window.openComicPanel();
        });
    }
};