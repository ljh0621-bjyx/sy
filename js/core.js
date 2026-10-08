/* ==========================================================================
   传讯 - 完整核心逻辑 (修复数据加载 + 语音自动播放 + 转文字 + 发送图片)
   ========================================================================== */

// ==================== 1. 全局工具与初始化 ====================
// 兼容配置项 (解决 reply-library.js 报错)
window.LIBRARY_CONFIG = {
    reply: { title: "回复库管理", tabs: [{ id: 'custom', name: '主字卡', mode: 'list' }, { id: 'emojis', name: 'Emoji', mode: 'grid' }, { id: 'stickers', name: '表情库', mode: 'grid' }] },
    atmosphere: { title: "氛围感配置", tabs: [{ id: 'pokes', name: '拍一拍', mode: 'list' }, { id: 'statuses', name: '对方状态', mode: 'list' }, { id: 'mottos', name: '顶部格言', mode: 'list' }, { id: 'intros', name: '开场动画', mode: 'list' }] }
};

function getStorageKey(baseKey) {
    if (!SESSION_ID) {
        console.error('[getStorageKey] SESSION_ID 尚未初始化，拒绝生成存储键:', baseKey);
        throw new Error('SESSION_ID 未初始化，存储操作已中止');
    }
    return `${APP_PREFIX}${SESSION_ID}_${baseKey}`;
}

async function migrateData() {
    const isMigrated = await localforage.getItem(APP_PREFIX + 'MIGRATION_V2_DONE');
    if (isMigrated) return;
    try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key.startsWith(APP_PREFIX)) {
                try {
                    const val = localStorage.getItem(key);
                    if (val) {
                        let dataToStore = val;
                        try { if (val.startsWith('{') || val.startsWith('[')) dataToStore = JSON.parse(val); } catch (e) {}
                        await localforage.setItem(key, dataToStore);
                    }
                } catch (e) { console.error(`迁移键值 ${key} 时发生错误`, e); }
            }
        }
        await localforage.setItem(APP_PREFIX + 'MIGRATION_V2_DONE', 'true');
    } catch (e) { console.error("数据迁移过程中发生严重错误:", e); }
}

async function createNewSession(switchToIt = true) {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newSession = { id: newId, name: `会话 ${new Date().toLocaleDateString()}`, createdAt: Date.now() };
    sessionList.push(newSession);
    await localforage.setItem(`${APP_PREFIX}sessionList`, sessionList);
    return newId;
}

window.initializeSession = async function() {
    await migrateData();
    const sessionsData = await localforage.getItem(`${APP_PREFIX}sessionList`);
    sessionList = sessionsData || [];
    const hash = window.location.hash.substring(1);
    if (hash && sessionList.some(s => s.id === hash)) {
        SESSION_ID = hash;
    } else if (sessionList.length > 0) {
        const lastId = await localforage.getItem(`${APP_PREFIX}lastSessionId`);
        SESSION_ID = lastId && sessionList.some(s => s.id === lastId) ? lastId : sessionList[0].id;
    } else {
        SESSION_ID = await createNewSession(false);
    }
    await localforage.setItem(`${APP_PREFIX}lastSessionId`, SESSION_ID);
}

function getDefaultSettings() {
    return {
        partnerName: "梦角", myName: "我", myStatus: "在线", partnerStatus: "在线",
        isDarkMode: false, colorTheme: "gold", soundEnabled: true, typingIndicatorEnabled: true,
        readReceiptsEnabled: true, replyEnabled: true, lastStatusChange: Date.now(),
        fontSize: 16, bubbleStyle: 'standard', messageFontFamily: "'Noto Serif SC', serif",
        messageFontWeight: 400, messageLineHeight: 1.5, customSoundUrl: '',
        soundVolume: 0.15, bottomCollapseMode: false, emojiMixEnabled: true
    };
}

// ==================== 2. 数据加载与保存 (恢复丢失的头像和回复库) ====================
const loadData = async () => {
    try {
        settings = getDefaultSettings();
        const results = await Promise.allSettled([
            localforage.getItem(getStorageKey('chatSettings')),
            localforage.getItem(getStorageKey('chatMessages')),
            localforage.getItem(getStorageKey('customReplies')),
            localforage.getItem(getStorageKey('customPokes')),
            localforage.getItem(getStorageKey('customStatuses')),
            localforage.getItem(getStorageKey('stickerLibrary')),
            localforage.getItem(getStorageKey('myStickerLibrary')),
            localforage.getItem(getStorageKey('partnerAvatar')),
            localforage.getItem(getStorageKey('myAvatar')),
            localforage.getItem(getStorageKey('customReplyGroups')),
            localforage.getItem(getStorageKey('customPokeGroups')),
            localforage.getItem(getStorageKey('customStatusGroups'))
        ]);
        const getVal = (i) => results[i].status === 'fulfilled' ? results[i].value : null;

        const savedSettings = getVal(0);
        const savedMessages = getVal(1);
        const savedReplies = getVal(2);
        const savedPokes = getVal(3);
        const savedStatuses = getVal(4);
        const savedStickers = getVal(5);
        const savedMyStickers = getVal(6);
        const partnerAvatarSrc = getVal(7);
        const myAvatarSrc = getVal(8);
        const savedReplyGroups = getVal(9);
        const savedPokeGroups = getVal(10);
        const savedStatusGroups = getVal(11);

        if (savedSettings) Object.assign(settings, savedSettings);
        if (savedMessages && Array.isArray(savedMessages)) {
            messages = savedMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
            window.messages = messages;
        }
        
        // 恢复头像
        if (savedReplies) customReplies = savedReplies;
        if (savedPokes) customPokes = savedPokes;
        if (savedStatuses) customStatuses = savedStatuses;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedPokeGroups) window.customPokeGroups = savedPokeGroups;
        if (savedStatusGroups) window.customStatusGroups = savedStatusGroups;

        if (DOMElements && DOMElements.partner && DOMElements.me) {
            if (typeof updateAvatar === 'function') {
                updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
                updateAvatar(DOMElements.me.avatar, myAvatarSrc);
            } else {
                if (partnerAvatarSrc && DOMElements.partner.avatar) DOMElements.partner.avatar.innerHTML = `<img src="${partnerAvatarSrc}">`;
                if (myAvatarSrc && DOMElements.me.avatar) DOMElements.me.avatar.innerHTML = `<img src="${myAvatarSrc}">`;
            }
        }

        displayedMessageCount = typeof HISTORY_BATCH_SIZE !== 'undefined' ? HISTORY_BATCH_SIZE : 20;

        setTimeout(() => {
            if (typeof updateUI === 'function') updateUI();
            if (typeof renderMessages === 'function') renderMessages();
            if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        if (typeof updateUI === 'function') updateUI();
    }
};

const saveData = async () => {
    if (!SESSION_ID) return;
    const promises = [
        localforage.setItem(getStorageKey('chatSettings'), settings),
        localforage.setItem(getStorageKey('chatMessages'), messages),
        localforage.setItem(getStorageKey('customReplies'), customReplies),
        localforage.setItem(getStorageKey('customPokes'), customPokes),
        localforage.setItem(getStorageKey('customStatuses'), customStatuses),
        localforage.setItem(getStorageKey('stickerLibrary'), stickerLibrary),
        localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary),
        localforage.setItem(getStorageKey('customReplyGroups'), window.customReplyGroups || []),
        localforage.setItem(getStorageKey('customPokeGroups'), window.customPokeGroups || []),
        localforage.setItem(getStorageKey('customStatusGroups'), window.customStatusGroups || [])
    ];

    if (DOMElements && DOMElements.partner && DOMElements.partner.avatar) {
        const partnerImg = DOMElements.partner.avatar.querySelector('img');
        if (partnerImg) promises.push(localforage.setItem(getStorageKey('partnerAvatar'), partnerImg.src));
    }
    if (DOMElements && DOMElements.me && DOMElements.me.avatar) {
        const myImg = DOMElements.me.avatar.querySelector('img');
        if (myImg) promises.push(localforage.setItem(getStorageKey('myAvatar'), myImg.src));
    }
    await Promise.allSettled(promises);
};

// ==================== 3. 消息渲染 (含语音转文字) ====================
function createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef) {
    const fragment = new DocumentFragment();
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.sender === 'user' ? 'sent' : 'received'}`;
    wrapper.dataset.id = msg.id;

    const messageDate = new Date(msg.timestamp).toDateString();
    const prevDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;
    if (messageDate !== prevDate) {
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const displayDate = (messageDate === today) ? '今天' : (messageDate === yesterday) ? '昨天' : new Date(msg.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        dateDivider.innerHTML = `<span>${displayDate}</span>`;
        fragment.appendChild(dateDivider);
        lastSenderRef.current = null;
    }

    if (msg.type === 'system' || msg.type === 'call-event') {
        const sysDiv = document.createElement('div');
        sysDiv.className = 'system-message';
        sysDiv.innerHTML = msg.text;
        fragment.appendChild(sysDiv);
        return fragment;
    }

    let messageHTML = '';

    if (msg.replyTo) {
        const repliedText = msg.replyTo.text || (msg.replyTo.image ? '🖼 图片' : '[消息]');
        const repliedSender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
        messageHTML += `<div class="reply-indicator" style="cursor:pointer;"><span class="reply-indicator-sender">${repliedSender}</span><span class="reply-indicator-text">${repliedText}</span></div>`;
    }

    // ★ 语音转文字：文字颜色修改为黑色/灰色，背景也调淡
    if (msg.type === 'voice') {
        const dur = msg.duration || Math.floor(Math.random() * 8) + 3;
        const voiceText = msg.text || '';
        const uniqueId = 'voice-text-' + msg.id;
        const existingVoiceUrl = msg.voiceUrl || '';

        messageHTML += `
            <div class="voice-message-wrapper" style="display:flex;flex-direction:column;gap:6px;">
                <div class="voice-bubble" data-voice-id="${msg.id}" data-duration="${dur}" data-voice-text="${voiceText.replace(/"/g, '&quot;')}" data-voice-url="${existingVoiceUrl}" 
                     onclick="if(window._playVoiceMessage) window._playVoiceMessage(this)" style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:100px;max-width:220px;padding:2px 0;">
                    <i class="fas fa-volume-up" style="font-size:14px;opacity:0.85;flex-shrink:0;"></i>
                    <div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.35);position:relative;overflow:hidden;">
                        <div class="voice-progress-bar" style="position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.9);transition:width 0.15s linear;"></div>
                    </div>
                    <span style="font-size:11px;opacity:0.85;flex-shrink:0;">${dur}"</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px;">
                    <button onclick="(function(btn){var box=document.getElementById('${uniqueId}'); if(box.style.display==='none'||box.style.display===''){box.style.display='block';btn.innerHTML='<i class=\\'fas fa-eye-slash\\'></i> 收起文字';}else{box.style.display='none';btn.innerHTML='<i class=\\'fas fa-language\\'></i> 转文字';}})(this)" 
                            style="background:none;border:none;font-size:11px;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;width:fit-content;font-family:var(--font-family);opacity:0.85;">
                        <i class="fas fa-language"></i> 转文字
                    </button>
                    <div id="${uniqueId}" style="display:none;background:rgba(128,128,128,0.15);border-radius:6px;padding:6px 10px;font-size:12px;line-height:1.4;color:var(--text-primary);word-break:break-all;max-width:100%;">
                        ${voiceText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </div>
                </div>
            </div>
        `;
    } else {
        const isImageOnly = !msg.text && !!msg.image;
        messageHTML += (msg.text ? `<div>${msg.text.replace(/\n/g, '<br>')}</div>` : '');
        if (msg.image) {
            messageHTML += `<img src="${msg.image}" class="message-image${isImageOnly ? ' message-image-only' : ''}" alt="图片" style="max-width:${isImageOnly ? '150px' : '150px'}; border-radius: 12px;${!isImageOnly ? ' margin-top: 6px;' : ''} cursor: pointer;" onclick="if(window.viewImage) window.viewImage('${msg.image}')">`;
        }
    }

    const messageDiv = document.createElement('div');
    const isImageOnly = !msg.text && !!msg.image;
    if (isImageOnly) {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} message-image-bubble-none`;
    } else {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} ${settings.bubbleStyle || 'standard'}`;
    }
    messageDiv.innerHTML = messageHTML;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';
    contentWrapper.appendChild(messageDiv);

    let actionsHTML = '';
    if (settings.replyEnabled) actionsHTML += `<button class="meta-action-btn reply-btn" title="回复"><i class="fas fa-reply"></i></button>`;
    const starIcon = msg.favorited ? 'fas fa-star' : 'far fa-star';
    actionsHTML += `<button class="meta-action-btn favorite-action-btn ${msg.favorited ? 'favorited' : ''}"><i class="${starIcon}"></i></button>`;
    if (msg.sender === 'user') actionsHTML += `<button class="meta-action-btn recall-btn" title="撤回"><i class="fas fa-undo-alt"></i></button>`;
    actionsHTML += `<button class="meta-action-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-meta-actions';
    actionsDiv.innerHTML = actionsHTML;
    contentWrapper.appendChild(actionsDiv);

    let metaHTML = '';
    if (settings.timeFormat !== 'off') {
        const ts = new Date(msg.timestamp);
        metaHTML += `<div class="timestamp">${ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>`;
    }
    if (metaHTML !== '') {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        metaDiv.innerHTML = metaHTML;
        contentWrapper.appendChild(metaDiv);
    }

    wrapper.appendChild(contentWrapper);
    fragment.appendChild(wrapper);
    lastSenderRef.current = msg.sender;
    return fragment;
}

// ==================== 4. 消息添加与语音自动播放 ====================
const addMessage = (message) => {
    if (!(message.timestamp instanceof Date)) message.timestamp = new Date(message.timestamp);

    const container = DOMElements.chatContainer;
    const wasEmpty = messages.length === 0;
    const prevMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    
    messages.push(message); 

    // ★ 语音自动播放逻辑
    if (message.type === 'voice' && message.voiceUrl) {
        if (!message._autoPlayed) {
            message._autoPlayed = true;
            setTimeout(function() {
                if (typeof window._playVoiceMessage === 'function') {
                    var fakeEl = document.createElement('div');
                    fakeEl.setAttribute('data-duration', message.voiceDuration || 5);
                    fakeEl.setAttribute('data-voice-text', message.text || '');
                    fakeEl.setAttribute('data-voice-url', message.voiceUrl);

                    var playPromise = window._playVoiceMessage(fakeEl);

                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(function() {
                            var unlockOnce = function() {
                                document.removeEventListener('click', unlockOnce);
                                document.removeEventListener('touchstart', unlockOnce);
                                window._playVoiceMessage(fakeEl); 
                            };
                            document.addEventListener('click', unlockOnce);
                            document.addEventListener('touchstart', unlockOnce);
                        });
                    }
                }
            }, 600);
        }
    }

    if (wasEmpty && DOMElements.emptyState) DOMElements.emptyState.style.display = 'none';

    if (typeof renderMessages === 'function') renderMessages();

    requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight;
    });

    if (typeof throttledSaveData === 'function') throttledSaveData();
};

function renderMessages(preserveScroll = false) {
    const container = DOMElements.chatContainer;
    if (!container) return;
    const totalMessages = messages.length;
    const startIndex = Math.max(0, totalMessages - (typeof displayedMessageCount !== 'undefined' ? displayedMessageCount : 20));
    const msgsToRender = messages.slice(startIndex);

    container.innerHTML = '';
    const fragment = new DocumentFragment();
    
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    fragment.appendChild(spacer);

    let lastSenderRef = { current: null };
    msgsToRender.forEach((msg, i) => {
        const prevMsg = i > 0 ? msgsToRender[i - 1] : (startIndex > 0 ? messages[startIndex - 1] : null);
        const nextMsg = i < msgsToRender.length - 1 ? msgsToRender[i + 1] : null;
        const msgFragment = createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef);
        fragment.appendChild(msgFragment);
    });

    container.appendChild(fragment);

    if (!preserveScroll) {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

// ==================== 5. 辅助工具与发送消息 ====================
window.updateAvatar = window.updateAvatar || function(element, src) {
    if (!element) return;
    if (src) {
        element.innerHTML = '<img src="' + src + '" alt="avatar">';
    } else {
        element.innerHTML = '<i class="fas fa-user"></i>';
    }
};

window.updateReplyPreview = function() {
    const container = DOMElements.replyPreviewContainer;
    if (!container) return;
    if (!window.currentReplyTo) {
        container.innerHTML = ''; container.style.display = 'none'; return;
    }
    const senderName = window.currentReplyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
    const previewText = window.currentReplyTo.text ? window.currentReplyTo.text.slice(0, 40) : '🖼 图片';
    container.style.display = 'flex';
    container.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--accent-color-rgb),0.07);border-left:3px solid var(--accent-color);border-radius:0 8px 8px 0;width:100%;">
            <div style="flex:1;min-width:0;">
                <span style="font-size:11px;color:var(--accent-color);font-weight:600;">回复 ${senderName}</span>
                <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previewText}</div>
            </div>
            <button onclick="window.currentReplyTo=null;window.updateReplyPreview();" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:2px 4px;font-size:14px;">✕</button>
        </div>`;
};

window.sendMessage = function(textOverride = null, type = 'normal') {
    const text = textOverride || (DOMElements.messageInput ? DOMElements.messageInput.value.trim() : '');
    const imageFile = DOMElements.imageInput ? DOMElements.imageInput.files[0] : null;
    if (!text && !imageFile && type === 'normal') return;

    if (DOMElements.messageInput) {
        DOMElements.messageInput.value = '';
        DOMElements.messageInput.style.height = '46px';
    }

    const createMessage = (imgSrc = null) => {
        const messageData = {
            id: Date.now(), sender: 'user', text: text || '', timestamp: new Date(),
            image: imgSrc, status: 'sent', favorited: false, replyTo: window.currentReplyTo || null, type: type
        };
        if (type === 'system') messageData.sender = null;
        addMessage(messageData);
        if (type !== 'system' && typeof playSound === 'function') playSound('send');
        
        window.currentReplyTo = null;
        window.updateReplyPreview();

        if (!isBatchMode && type === 'normal') {
            const delayRange = (settings.replyDelayMax || 7000) - (settings.replyDelayMin || 3000);
            const randomDelay = (settings.replyDelayMin || 3000) + Math.random() * delayRange;
            clearTimeout(window._pendingReplyTimer);
            window._pendingReplyTimer = setTimeout(() => { 
                window._pendingReplyTimer = null; 
                if (typeof window.simulateReply === 'function') window.simulateReply(); 
            }, randomDelay);
        }
    };

    if (imageFile && typeof optimizeImage === 'function') {
        optimizeImage(imageFile).then(createMessage).catch(() => {});
    } else { createMessage(); }
    if (DOMElements.imageInput) DOMElements.imageInput.value = '';
};

window.simulateReply = function() {
    const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) ? customReplies.filter(t => t && String(t).trim()) : [];
    if (pool.length === 0) {
        if (typeof showNotification === 'function') showNotification('回复库为空，请先到「自定义回复」中添加内容', 'info', 3500);
        return;
    }

    const replyText = pool[Math.floor(Math.random() * pool.length)];
    const partnerName = settings.partnerName || '对方';

    if (Math.random() < 0.15 && typeof window.playPartnerVoice === 'function') {
        window.playPartnerVoice(replyText, partnerName).then(audioUrl => {
            if (audioUrl) {
                addMessage({ id: Date.now(), sender: partnerName, text: replyText, timestamp: new Date(), status: 'received', type: 'voice', voiceDuration: Math.max(2, Math.ceil(replyText.length / 4)), voiceUrl: audioUrl, favorited: false });
                if (typeof playSound === 'function') playSound('message');
            }
        });
        return;
    }

    addMessage({ id: Date.now(), sender: partnerName, text: replyText, timestamp: new Date(), status: 'received', type: 'normal' });
    if (typeof playSound === 'function') playSound('message');
};
// ==================== ★ 万能钩子：修复功能面板无法点开的问题 ====================
(function initUIBindings() {
    // 1. 设置按钮 -> 打开设置弹窗
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn && !settingsBtn._hooked) {
        settingsBtn._hooked = true;
        settingsBtn.addEventListener('click', function() {
            const modal = document.getElementById('settings-modal');
            if (modal && typeof showModal === 'function') showModal(modal);
        });
    }

    // 2. 会话管理 -> 打开会话列表
    const sessionBtn = document.getElementById('session-manager-btn');
    if (sessionBtn && !sessionBtn._hooked) {
        sessionBtn._hooked = true;
        sessionBtn.addEventListener('click', function() {
            const modal = document.getElementById('session-modal');
            if (modal && typeof showModal === 'function') {
                showModal(modal);
                if (typeof renderSessionList === 'function') renderSessionList();
            }
        });
    }

    // 3. 群聊设置 -> 打开群聊弹窗
    const groupBtn = document.getElementById('group-chat-btn');
    if (groupBtn && !groupBtn._hooked) {
        groupBtn._hooked = true;
        groupBtn.addEventListener('click', function() {
            const modal = document.getElementById('group-chat-modal');
            if (modal && typeof showModal === 'function') showModal(modal);
            if (typeof updateGroupModeUI === 'function') updateGroupModeUI();
        });
    }

    // 4. 今日公告 -> 打开每日公告
    const dgBtn = document.getElementById('daily-greeting-btn');
    if (dgBtn && !dgBtn._hooked) {
        dgBtn._hooked = true;
        dgBtn.addEventListener('click', function() {
            if (typeof reopenDailyGreeting === 'function') reopenDailyGreeting();
        });
    }

    // 5. 主题切换
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && !themeBtn._hooked) {
        themeBtn._hooked = true;
        themeBtn.addEventListener('click', function() {
            if (typeof settings !== 'undefined') {
                settings.isDarkMode = !settings.isDarkMode;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                if (typeof updateUI === 'function') updateUI();
            }
        });
    }

    // 6. 附件/图片按钮
    const attachBtn = document.getElementById('attachment-btn');
    if (attachBtn && !attachBtn._hooked) {
        attachBtn._hooked = true;
        attachBtn.addEventListener('click', function() {
            const input = document.getElementById('image-input');
            if (input) input.click();
        });
    }
})();

// 延迟重复调用一次，确保在页面完全加载后绑定（因为有些元素可能是动态生成的）
setTimeout(function() {
    const buttons = ['settings-btn', 'session-manager-btn', 'group-chat-btn', 'daily-greeting-btn', 'theme-toggle', 'attachment-btn'];
    buttons.forEach(function(id) {
        const btn = document.getElementById(id);
        if (btn && !btn._hooked) {
            btn._hooked = true;
            btn.addEventListener('click', function() {
                if (id === 'settings-btn') {
                    const m = document.getElementById('settings-modal'); if (m && window.showModal) window.showModal(m);
                } else if (id === 'session-manager-btn') {
                    const m = document.getElementById('session-modal'); if (m && window.showModal) window.showModal(m);
                    if (typeof renderSessionList === 'function') renderSessionList();
                } else if (id === 'group-chat-btn') {
                    const m = document.getElementById('group-chat-modal'); if (m && window.showModal) window.showModal(m);
                    if (typeof updateGroupModeUI === 'function') updateGroupModeUI();
                } else if (id === 'daily-greeting-btn') {
                    if (typeof reopenDailyGreeting === 'function') reopenDailyGreeting();
                } else if (id === 'theme-toggle') {
                    if (typeof settings !== 'undefined') { settings.isDarkMode = !settings.isDarkMode; if (typeof throttledSaveData === 'function') throttledSaveData(); if (typeof updateUI === 'function') updateUI(); }
                } else if (id === 'attachment-btn') {
                    const inp = document.getElementById('image-input'); if (inp) inp.click();
                }
            });
        }
    });
}, 1500);