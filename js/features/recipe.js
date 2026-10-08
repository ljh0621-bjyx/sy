/**
 * recipe.js
 * 菜谱功能
 */

(function () {
    'use strict';

    const KEY = 'recipeData_v1';

    let data = {
        recipes: [],       // [{ id, name, content }]
        chatHistory: []
    };

    let panelEl = null;

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) data = Object.assign(data, saved);
        } catch (e) { console.warn('[recipe] load fail', e); }
    }
    async function save() {
        try {
            await localforage.setItem(KEY, data);
        } catch (e) { console.warn('[recipe] save fail', e); }
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- 批量导入菜谱 ----------
    window.batchImportRecipes = async function (files) {
        if (!files || files.length === 0) return;
        let totalAdded = 0;
        for (const file of files) {
            try {
                const text = await file.text();
                // 按空行分段，每段是一道菜
                const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
                blocks.forEach(block => {
                    const lines = block.split('\n').filter(l => l.trim());
                    if (lines.length === 0) return;
                    const name = lines[0].trim();
                    const content = lines.slice(1).join('\n').trim();
                    if (!name) return;
                    data.recipes.push({
                        id: 'recipe_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
                        name,
                        content: content || '（无详细步骤）'
                    });
                    totalAdded++;
                });
            } catch (e) { console.warn('导入菜谱失败', e); }
        }
        await save();
        renderPanel();
        showNotification('已导入 ' + totalAdded + ' 道菜谱', 'success');
    };

    window.deleteRecipe = async function (id) {
        if (!confirm('删除这道菜谱？')) return;
        data.recipes = data.recipes.filter(r => r.id !== id);
        await save();
        renderPanel();
    };

    // ---------- 聊天 ----------
    window.sendRecipeChat = async function (type, content) {
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
        const emojis = ['🍳','🥘','🍜','😋','✨','🥺','😊','🤤','🍰','🍲'];
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
        const el = document.getElementById('recipe-chat-scroll');
        if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }

    // ---------- 渲染 ----------
    let currentRecipeId = null;

    function renderPanel() {
        const card = document.getElementById('recipe-card');
        if (!card) return;

        const current = data.recipes.find(r => r.id === currentRecipeId);

        const listHTML = data.recipes.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">暂无菜谱，点击上方按钮添加</div>'
            : data.recipes.map(r => {
                const active = r.id === currentRecipeId;
                return '<div data-rec-id="' + r.id + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:' + (active ? 'rgba(var(--accent-color-rgb),0.1)' : 'transparent') + ';">'
                    + '<div style="width:26px;height:26px;border-radius:8px;background:' + (active ? 'var(--accent-color)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
                    + '<i class="fas fa-utensils" style="font-size:10px;color:' + (active ? '#fff' : 'var(--text-secondary)') + ';"></i></div>'
                    + '<div style="flex:1;min-width:0;font-size:12px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--accent-color)' : 'var(--text-primary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(r.name) + '</div>'
                    + '<button data-del-rec="' + r.id + '" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:11px;padding:4px 6px;opacity:0.6;">✕</button>'
                    + '</div>';
            }).join('');

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
            + '<i class="fas fa-utensils" style="color:var(--accent-color);"></i></div>'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);">菜谱</span></div>'
            + '<button id="rec-close-btn" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'

            // 当前菜谱展示
            + '<div style="padding:14px 20px;border-bottom:1px solid var(--border-color);flex-shrink:0;max-height:180px;overflow-y:auto;">'
            + (current
                ? '<div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">🍳 ' + escapeHtml(current.name) + '</div>'
                    + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">' + escapeHtml(current.content) + '</div>'
                : '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px;background:var(--primary-bg);border-radius:12px;">请从下方列表选择菜谱</div>')
            + '</div>'

            // 聊天
            + '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">'
            + '<div id="recipe-chat-scroll" style="flex:1;overflow-y:auto;padding:14px 20px;">' + chatHTML + '</div>'
            + '<div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<button id="rec-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            + '<button id="rec-sticker" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-image"></i></button>'
            + '<button id="rec-image" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--secondary-bg);color:var(--text-secondary);cursor:pointer;flex-shrink:0;"><i class="fas fa-camera"></i></button>'
            + '<input id="rec-input" type="text" placeholder="聊聊这道菜…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid var(--border-color);border-radius:20px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);">'
            + '<button id="rec-send" style="padding:8px 14px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;flex-shrink:0;">发送</button>'
            + '</div></div>'

            // 列表折叠
            + '<div style="border-top:1px solid var(--border-color);background:var(--primary-bg);flex-shrink:0;">'
            + '<div id="rec-list-toggle" style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;cursor:pointer;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-list" style="margin-right:6px;"></i>菜谱列表 (' + data.recipes.length + ')</span>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<button id="rec-import" style="padding:4px 10px;border:none;border-radius:8px;background:var(--accent-color);color:#fff;font-size:11px;cursor:pointer;">+ 添加</button>'
            + '<i id="rec-list-arrow" class="fas fa-chevron-up" style="font-size:11px;color:var(--text-secondary);transition:transform 0.2s;"></i>'
            + '</div></div>'
            + '<div id="rec-list-body" style="max-height:0;overflow:hidden;transition:max-height 0.3s;border-top:1px solid var(--border-color);">'
            + '<div style="padding:8px 12px;max-height:200px;overflow-y:auto;">' + listHTML + '</div>'
            + '</div></div>'

            + '</div>';

        bindPanelEvents();
    }

    function bindPanelEvents() {
        const card = document.getElementById('recipe-card');
        if (!card) return;

        document.getElementById('rec-close-btn').onclick = () => window.closeRecipePanel();

        document.getElementById('rec-list-toggle').onclick = (e) => {
            if (e.target.closest('#rec-import')) return;
            const body = document.getElementById('rec-list-body');
            const arrow = document.getElementById('rec-list-arrow');
            if (body.style.maxHeight === '0px' || !body.style.maxHeight) {
                body.style.maxHeight = '220px';
                arrow.style.transform = 'rotate(180deg)';
            } else {
                body.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0)';
            }
        };

        document.getElementById('rec-import').onclick = (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.md,text/plain';
            input.multiple = true;
            input.onchange = (ev) => window.batchImportRecipes(Array.from(ev.target.files));
            input.click();
        };

        card.querySelectorAll('[data-rec-id]').forEach(el => {
            el.onclick = (e) => {
                if (e.target.closest('[data-del-rec]')) return;
                currentRecipeId = el.dataset.recId;
                renderPanel();
            };
        });
        card.querySelectorAll('[data-del-rec]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                window.deleteRecipe(btn.dataset.delRec);
            };
        });

        const input = document.getElementById('rec-input');
        const sendBtn = document.getElementById('rec-send');
        const doSend = () => {
            const v = input.value.trim();
            if (!v) return;
            input.value = '';
            window.sendRecipeChat('text', v);
        };
        sendBtn.onclick = doSend;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doSend(); }
        });

        document.getElementById('rec-emoji').onclick = () => {
            const emojis = ['🍳','🥘','🍜','😋','✨','🥺','😊','🤤','🍰','🍲','🥗','🍱'];
            openRecipeQuickPicker('选择表情', emojis.map(e => ({ type: 'emoji', content: e })));
        };
        document.getElementById('rec-sticker').onclick = () => {
            const stickers = (typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) ? stickerLibrary : [];
            if (stickers.length === 0) { showNotification('对方表情库为空', 'warning'); return; }
            openRecipeQuickPicker('选择表情包', stickers.map(s => ({ type: 'sticker', content: s })));
        };
        document.getElementById('rec-image').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { showNotification('图片不能超过 2MB', 'error'); return; }
                try {
                    const base64 = await optimizeImage(file, 600, 0.8);
                    window.sendRecipeChat('image', base64);
                } catch (err) { showNotification('图片处理失败', 'error'); }
            };
            input.click();
        };
    }

    function openRecipeQuickPicker(title, items) {
        const old = document.getElementById('rec-quick-picker');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'rec-quick-picker';
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
            + '<button id="rec-picker-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;padding:14px 20px 20px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">' + gridHTML + '</div>'
            + '</div>';
        document.body.appendChild(modal);
        document.getElementById('rec-picker-close').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelectorAll('[data-pi]').forEach(el => {
            el.onclick = () => {
                const it = items[parseInt(el.dataset.pi)];
                modal.remove();
                window.sendRecipeChat(it.type, it.content);
            };
        });
    }

    // ---------- 打开 / 关闭 ----------
    window.openRecipePanel = function () {
        if (panelEl) return;
        panelEl = document.createElement('div');
        panelEl.id = 'recipe-panel';
        panelEl.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        const card = document.createElement('div');
        card.id = 'recipe-card';
        card.style.cssText = 'background:var(--secondary-bg);border-radius:20px;width:94%;max-width:460px;height:88vh;max-height:720px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);';
        panelEl.appendChild(card);
        panelEl.addEventListener('click', (e) => { if (e.target === panelEl) window.closeRecipePanel(); });
        document.body.appendChild(panelEl);
        renderPanel();
    };

    window.closeRecipePanel = function () {
        if (panelEl) { panelEl.remove(); panelEl = null; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }

})();
