/**
 * novel.js
 * 一起看小说
 */

(function () {
    'use strict';

    const KEY = 'novelData_v1';

    let data = {
        novels: [],       // [{ id, name, chapters: [{title, content}] }]
        currentNovelId: null,
        currentChapter: 0,
        chatHistory: []
    };

    let panelEl = null;

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) {
                data.novels = saved.novels || [];
                data.chatHistory = saved.chatHistory || [];
                data.currentNovelId = null;
                data.currentChapter = 0;
            }
        } catch (e) { console.warn('[novel] load fail', e); }
    }
    async function save() {
        try {
            await localforage.setItem(KEY, {
                novels: data.novels,
                chatHistory: data.chatHistory.slice(-200)
            });
        } catch (e) { console.warn('[novel] save fail', e); }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- 批量导入小说 ----------
    window.batchImportNovels = async function (files) {
        if (!files || files.length === 0) return;
        let totalAdded = 0;
        for (const file of files) {
            try {
               const buffer = await file.arrayBuffer();
let text = '';
try {
    // 1. 优先尝试 UTF-8 严格模式
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
} catch (e) {
    // 2. 失败则尝试 GBK 编码（解决 Windows 默认 txt 乱码）
    try {
        text = new TextDecoder('gbk').decode(buffer);
    } catch (e2) {
        // 3. 兜底：非严格 UTF-8
        text = new TextDecoder('utf-8').decode(buffer);
    }
}
                const name = file.name.replace(/\.[^.]+$/, '');

                // 用 "第X章" 分割章节
                const parts = text.split(/(第[一二三四五六七八九十百千万零\d]+[章节回])/);
                const chapters = [];

                // 若没有"第X章"格式，就整篇作为一章
                if (parts.length <= 1) {
                    chapters.push({ title: '全文', content: text.trim() });
                } else {
                    // parts[0] 是第一个标题前的内容（可能是序章）
                    if (parts[0].trim()) {
                        chapters.push({ title: '序章', content: parts[0].trim() });
                    }
                    for (let i = 1; i < parts.length; i += 2) {
                        const title = parts[i] ? parts[i].trim() : '章节';
                        const content = parts[i + 1] ? parts[i + 1].trim() : '';
                        if (title && content) chapters.push({ title, content });
                    }
                }

                if (chapters.length === 0) continue;

                data.novels.push({
                    id: 'novel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    name,
                    chapters
                });
                totalAdded++;
            } catch (e) { console.warn('导入小说失败', e); }
        }
        await save();
        renderPanel();
        showNotification('已导入 ' + totalAdded + ' 本小说', 'success');
    };

    window.openNovel = function (id) {
        data.currentNovelId = id;
        data.currentChapter = 0;
        renderPanel();
    };

    window.prevNovelChapter = function () {
        if (data.currentChapter > 0) {
            data.currentChapter--;
            renderPanel();
        }
    };

    window.nextNovelChapter = function () {
        const n = data.novels.find(x => x.id === data.currentNovelId);
        if (!n) return;
        if (data.currentChapter < n.chapters.length - 1) {
            data.currentChapter++;
            renderPanel();
        }
    };

    window.jumpToChapter = function (idx) {
        data.currentChapter = idx;
        renderPanel();
    };

    window.deleteNovel = async function (id) {
        if (!confirm('删除这本小说？')) return;
        data.novels = data.novels.filter(n => n.id !== id);
        if (data.currentNovelId === id) {
            data.currentNovelId = null;
            data.currentChapter = 0;
        }
        await save();
        renderPanel();
    };

    // ---------- 聊天 ----------
    window.sendNovelChat = async function (type, content) {
        data.chatHistory.push({ sender: 'me', type, content, time: Date.now() });
        if (data.chatHistory.length > 200) data.chatHistory = data.chatHistory.slice(-200);
        await save();
        renderPanel();
        scrollChatToBottom();

        setTimeout(async () => {
            const reply = generatePartnerReply();
            if (reply.type === 'text' && typeof window.simulatePartnerTypingProcess === 'function') {
    try { await window.simulatePartnerTypingProcess(reply.content); } catch (e) { console.warn('浮窗失败', e); }
}
            data.chatHistory.push({ sender: 'partner', type: reply.type, content: reply.content, time: Date.now() });
            await save();
            renderPanel();
            scrollChatToBottom();
        }, 1500 + Math.random() * 2000);
    };

   function generatePartnerReply() {
    const rand = Math.random();

    const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
        ? customReplies.filter(t => t && String(t).trim())
        : [];

    // 60% 字卡库文字
    if (rand < 0.6 && pool.length > 0) {
        return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
    }
    // 20% emoji
    if (rand < 0.8) {
        const emojis = ['📖','📚','✨','💕','🥺','😊','😍','🤔','📕','📗'];
        return { type: 'emoji', content: emojis[Math.floor(Math.random() * emojis.length)] };
    }
    // 15% 对方表情包
    if (rand < 0.95 && typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) {
        return { type: 'sticker', content: stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)] };
    }
    // 5% 对方图片库
    if (typeof window.getRandomPartnerImage === 'function') {
        const img = window.getRandomPartnerImage();
        if (img) return { type: 'image', content: img.url };
    }
    // 兜底
    if (pool.length > 0) return { type: 'text', content: pool[Math.floor(Math.random() * pool.length)] };
    return { type: 'text', content: '...' };
}

    function scrollChatToBottom() {
        const el = document.getElementById('novel-chat-scroll');
        if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }

    // ---------- 渲染 ----------
    function renderPanel() {
        const card = document.getElementById('novel-card');
        if (!card) return;

        const current = data.novels.find(n => n.id === data.currentNovelId);
        const chapter = current ? current.chapters[data.currentChapter] : null;

        // 小说列表
        const listHTML = data.novels.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">暂无小说，点击上方按钮添加</div>'
            : data.novels.map(n => {
                const active = n.id === data.currentNovelId;
                return '<div data-nv-id="' + n.id + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<div style="width:26px;height:26px;border-radius:8px;background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-book" style="font-size:10px;color:' + (active ? '#fff' : 'var(--text-secondary)') + ';"></i></div>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:12px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(n.name) + '</div>'
                    + '<div style="font-size:10px;color:var(--text-secondary);">' + n.chapters.length + ' 章</div>'
                    + '</div>'
                    + '<button data-del-nv="' + n.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;">✕</button>'
                    + '</div>';
            }).join('');

        // 章节列表（折叠时用）
        let chapterListHTML = '';
        if (current) {
            chapterListHTML = current.chapters.map((ch, i) => {
                const active = i === data.currentChapter;
                return '<div data-ch-idx="' + i + '" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:2px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<span style="font-size:11px;color:' + (active ? 'var(--accent-color)' : 'var(--text-secondary)') + ';font-weight:' + (active ? '700' : '400') + ';min-width:40px;">' + (i + 1) + '.</span>'
                    + '<span style="flex:1;font-size:12px;color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';font-weight:' + (active ? '600' : '400') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(ch.title) + '</span>'
                    + '</div>';
            }).join('');
        }

        // 聊天
        const chatHTML = data.chatHistory.length === 0
            ? '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:11px;">还没有对话</div>'
            : data.chatHistory.map(msg => {
                const isMe = msg.sender === 'me';
                let inner = '';
                if (msg.type === 'text') inner = '<span style="font-size:12px;">' + escapeHtml(msg.content) + '</span>';
                else if (msg.type === 'emoji') inner = '<span style="font-size:20px;">' + msg.content + '</span>';
                else if (msg.type === 'sticker') inner = '<img src="' + msg.content + '" style="max-width:90px;max-height:90px;border-radius:8px;display:block;">';
                else if (msg.type === 'image') inner = '<img src="' + msg.content + '" style="max-width:140px;max-height:140px;border-radius:8px;display:block;">';
                return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end;' : '') + ';margin-bottom:6px;">'
                    + '<div style="background:' + (isMe ? 'var(--accent-color)' : 'var(--secondary-bg)') + ';color:' + (isMe ? '#fff' : 'var(--text-primary)') + ';padding:6px 10px;border-radius:12px;max-width:72%;word-break:break-word;">'
                    + inner + '</div></div>';
            }).join('');

        card.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<div style="width:36px;height:36px;border-radius:12px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">'
            + '<i class="fas fa-book-open" style="color:var(--accent-color);"></i></div>'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">一起看小说</span></div>'
            + '<button id="nv-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'

            // 当前章节
            + '<div style="padding:14px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            + (current && chapter
                ? '<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">' + escapeHtml(chapter.title) + '</div>'
                    + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;max-height:140px;overflow-y:auto;padding-right:4px;">' + escapeHtml(chapter.content) + '</div>'
                    + '<div style="display:flex;gap:8px;margin-top:10px;align-items:center;justify-content:center;">'
                    + '<button id="nv-prev" style="padding:6px 14px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);' + (data.currentChapter === 0 ? 'opacity:0.4;' : '') + '">上一章</button>'
                    + '<span style="font-size:11px;color:var(--text-secondary);">' + (data.currentChapter + 1) + ' / ' + current.chapters.length + '</span>'
                    + '<button id="nv-next" style="padding:6px 14px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;font-family:var(--font-family);' + (data.currentChapter >= current.chapters.length - 1 ? 'opacity:0.4;' : '') + '">下一章</button>'
                    + '</div>'
                : '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">请从下方列表选择小说</div>')
            + '</div>'

            // 聊天
            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div id="novel-chat-scroll" style="flex:1;overflow-y:auto;padding:14px 20px;">' + chatHTML + '</div>'
            + '<div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<button id="nv-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            + '<button id="nv-sticker" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-image"></i></button>'
            + '<button id="nv-image" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-camera"></i></button>'
            + '<input id="nv-input" type="text" placeholder="边看边聊…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid var(--border-color);border-radius:20px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);">'
            + '<button id="nv-send" style="padding:8px 14px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;">发送</button>'
            + '</div></div>'

            // 底部：小说列表 + 章节列表（两个标签）
            + '<div style="border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<div id="nv-list-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;cursor:pointer;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-list" style="margin-right:6px;"></i>' + (current ? '章节列表 (' + current.chapters.length + ')' : '小说列表 (' + data.novels.length + ')') + '</span>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + (current ? '<button id="nv-back" style="padding:4px 10px;border:1px solid var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;">← 书库</button>' : '')
            + '<button id="nv-import" style="padding:4px 10px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:11px;cursor:pointer;">+ 添加</button>'
            + '<i id="nv-list-arrow" class="fas fa-chevron-up" style="font-size:11px;color:var(--text-secondary);transition:transform 0.2s;"></i>'
            + '</div></div>'
            + '<div id="nv-list-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s;border-top:1px solid var(--border-color);">'
            + '<div style="padding:8px 12px;max-height:200px;overflow-y:auto;">' + (current ? chapterListHTML : listHTML) + '</div>'
            + '</div></div>'

            + '</div>';

        bindPanelEvents();
    }

    function bindPanelEvents() {
        const card = document.getElementById('novel-card');
        if (!card) return;

        document.getElementById('nv-close-btn').onclick = () => window.closeNovelPanel();

        document.getElementById('nv-list-toggle').onclick = (e) => {
            if (e.target.closest('#nv-import') || e.target.closest('#nv-back')) return;
            const body = document.getElementById('nv-list-body');
            const arrow = document.getElementById('nv-list-arrow');
            if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
                body.style.maxHeight = '220px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0)';
            }
        };

        document.getElementById('nv-import').onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,text/plain';
            input.multiple = true;
            input.onchange = (ev) => window.batchImportNovels(Array.from(ev.target.files));
            input.click();
        };

        const backBtn = document.getElementById('nv-back');
        if (backBtn) backBtn.onclick = (e) => {
            e.stopPropagation();
            data.currentNovelId = null;
            data.currentChapter = 0;
            renderPanel();
        };

        // 小说列表点击
        card.querySelectorAll('[data-nv-id]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.closest('[data-del-nv]')) return;
                window.openNovel(el.dataset.nvId);
            };
        });
        card.querySelectorAll('[data-del-nv]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                window.deleteNovel(btn.dataset.delNv);
            };
        });

        // 章节点击
        card.querySelectorAll('[data-ch-idx]').forEach(el => {
            el.onclick = () => {
                window.jumpToChapter(parseInt(el.dataset.chIdx));
            };
        });

        // 上一章/下一章
        const prevBtn = document.getElementById('nv-prev');
        if (prevBtn) prevBtn.onclick = () => window.prevNovelChapter();
        const nextBtn = document.getElementById('nv-next');
        if (nextBtn) nextBtn.onclick = () => window.nextNovelChapter();

        // 聊天
        const input = document.getElementById('nv-input');
        const sendBtn = document.getElementById('nv-send');
        const doSend = () => {
            const v = input.value.trim();
            if (!v) return;
            input.value = '';
            window.sendNovelChat('text', v);
        };
        sendBtn.onclick = doSend;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doSend(); }
        });

        document.getElementById('nv-emoji').onclick = () => {
            const emojis = ['📖','📚','✨','💕','🥺','😊','😍','🤔','📕','📗','📘','💭'];
            openNovelQuickPicker('选择表情', emojis.map(e => ({ type: 'emoji', content: e })));
        };
        document.getElementById('nv-sticker').onclick = () => {
            const stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? stickerLibrary : [];
            if (stickers.length === 0) { showNotification('对方表情库为空', 'warning'); return; }
            openNovelQuickPicker('选择表情包', stickers.map(s => ({ type: 'sticker', content: s })));
        };
        document.getElementById('nv-image').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { showNotification('图片不能超过 2MB', 'error'); return; }
                try {
                    const base64 = await optimizeImage(file, 600, 0.8);
                    window.sendNovelChat('image', base64);
                } catch (err) { showNotification('图片处理失败', 'error'); }
            };
            input.click();
        };
    }

    function openNovelQuickPicker(title, items) {
        const old = document.getElementById('nv-quick-picker');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'nv-quick-picker';
        modal.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;';
        let gridHTML = items.map((it, i) => {
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
            + '<button id="nv-picker-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:14px 20px 20px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + gridHTML + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('nv-picker-close').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelectorAll('[data-pi]').forEach(el => {
            el.onclick = () => {
                const it = items[parseInt(el.dataset.pi)];
                modal.remove();
                window.sendNovelChat(it.type, it.content);
            };
        });
    }

    // ---------- 打开 / 关闭 ----------
    window.openNovelPanel = function () {
        if (panelEl) return;
        panelEl = document.createElement('div');
        panelEl.id = 'novel-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        const card = document.createElement('div');
        card.id = 'novel-card';
        card.style.cssText = 'background:var(--secondary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:720px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);';
        panelEl.appendChild(card);
        panelEl.addEventListener('click', (e) => { if (e.target === panelEl) window.closeNovelPanel(); });
        document.body.appendChild(panelEl);
        renderPanel();
    };

    window.closeNovelPanel = function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

})();
// === novel.js 新增入口 ===
window.initNovelPanel = function() {
    var btn = document.getElementById('novel-function'); // 注意：这里的 ID 必须和 HTML 里的一致
    if (btn && !btn.dataset.initialized) {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', function() {
            // 如果是从高级菜单点进来的，先关掉高级菜单
            var advancedModal = document.getElementById('advanced-modal');
            if (advancedModal && typeof hideModal === 'function') hideModal(advancedModal);
            
            // 打开你的小说面板
            if (typeof window.openNovelPanel === 'function') {
                window.openNovelPanel();
            }
        });
    }
};
// novel.js 底部
window.initNovelPanel = function() {
    // 因为 HTML 里有 onclick，所以这里什么都不用做
    console.log('小说面板初始化完成');
};