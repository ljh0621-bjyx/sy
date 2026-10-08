/* ==========================================================================
   传讯 - core.js (终极完整版)
   包含：数据加载、消息渲染、语音转文字、自动播放、所有按钮强制绑定
   ========================================================================== */

// ==================== 1. 全局配置与工具函数 ====================
window.LIBRARY_CONFIG = window.LIBRARY_CONFIG || {
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
                } catch (e) {}
            }
        }
        await localforage.setItem(APP_PREFIX + 'MIGRATION_V2_DONE', 'true');
    } catch (e) {}
}

async function createNewSession(switchToIt = true) {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newSession = { id: newId, name: `会话 ${new Date().toLocaleDateString()}`, createdAt: Date.now() };
    if (typeof sessionList !== 'undefined') sessionList.push(newSession);
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

// ==================== 2. 数据加载与保存（恢复缺失的头像和回复库） ====================
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
        if (savedReplies) customReplies = savedReplies;
        if (savedPokes) customPokes = savedPokes;
        if (savedStatuses) customStatuses = savedStatuses;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedPokeGroups) window.customPokeGroups = savedPokeGroups;
        if (savedStatusGroups) window.customStatusGroups = savedStatusGroups;

        // ★ 强制恢复头像
        if (DOMElements && DOMElements.partner && DOMElements.me) {
            if (typeof updateAvatar === 'function') {
                updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
                updateAvatar(DOMElements.me.avatar, myAvatarSrc);
            } else {
                if (partnerAvatarSrc && DOMElements.partner.avatar) DOMElements.partner.avatar.innerHTML = '<img src="' + partnerAvatarSrc + '">';
                if (myAvatarSrc && DOMElements.me.avatar) DOMElements.me.avatar.innerHTML = '<img src="' + myAvatarSrc + '">';
            }
        }

        displayedMessageCount = typeof HISTORY_BATCH_SIZE !== 'undefined' ? HISTORY_BATCH_SIZE : 20;
        setTimeout(() => {
            if (typeof updateUI === 'function') updateUI();
            if (typeof renderMessages === 'function') renderMessages();
            if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
            if (typeof updateDynamicNames === 'function') updateDynamicNames();
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

// ==================== 3. 消息渲染（含语音转文字） ====================
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

    // ★ 语音转文字（文字改为黑色/灰色，背景调淡）
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

    // ★ 语音自动播放
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
    requestAnimationFrame(() => { if (container) container.scrollTop = container.scrollHeight; });
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
        fragment.appendChild(createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef));
    });
    container.appendChild(fragment);
    if (!preserveScroll) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

// ==================== 5. 辅助工具与发送消息 ====================
window.updateAvatar = window.updateAvatar || function(element, src) {
    if (!element) return;
    if (src) element.innerHTML = '<img src="' + src + '" alt="avatar">';
    else element.innerHTML = '<i class="fas fa-user"></i>';
};

window.updateReplyPreview = function() {
    const container = DOMElements.replyPreviewContainer;
    if (!container) return;
    if (!window.currentReplyTo) { container.innerHTML = ''; container.style.display = 'none'; return; }
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
        const messageData = { id: Date.now(), sender: 'user', text: text || '', timestamp: new Date(), image: imgSrc, status: 'sent', favorited: false, replyTo: window.currentReplyTo || null, type: type };
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

    if (imageFile && typeof optimizeImage === 'function') optimizeImage(imageFile).then(createMessage).catch(() => {});
    else createMessage();
    if (DOMElements.imageInput) DOMElements.imageInput.value = '';
};

window.simulateReply = function() {
    const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies)) ? customReplies.filter(t => t && String(t).trim()) : [];
    if (pool.length === 0) { if (typeof showNotification === 'function') showNotification('回复库为空，请先到「自定义回复」中添加内容', 'info', 3500); return; }

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

// ==================== 6. 按钮强绑定（修好所有点不开的图标） ====================
(function forceBindAllButtons() {
    document.addEventListener('click', function(e) {
        var t = e.target.closest('button, .settings-card, .settings-item, .action-btn');
        if (!t) return;
        var id = t.id;

        var tryOpen = function(modalId, extraFn) {
            var m = document.getElementById(modalId);
            if (m && typeof window.showModal === 'function') window.showModal(m);
            if (typeof extraFn === 'function') extraFn();
        };
        var tryHide = function(modalId) {
            var m = document.getElementById(modalId);
            if (m && typeof window.hideModal === 'function') window.hideModal(m);
        };

        // 顶部图标
        if (id === 'settings-btn') return tryOpen('settings-modal');
        if (id === 'session-manager-btn') return tryOpen('session-modal', () => { if (typeof renderSessionList === 'function') renderSessionList(); });
        if (id === 'group-chat-btn') return tryOpen('group-chat-modal', () => { if (typeof updateGroupModeUI === 'function') updateGroupModeUI(); });
        if (id === 'moments-btn') return (typeof window.openMomentsPanel === 'function') && window.openMomentsPanel();
        if (id === 'daily-greeting-btn') return (typeof window.reopenDailyGreeting === 'function') && window.reopenDailyGreeting();
        if (id === 'theme-toggle') {
            if (typeof settings !== 'undefined') {
                settings.isDarkMode = !settings.isDarkMode;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                if (typeof updateUI === 'function') updateUI();
            }
            return;
        }
        if (id === 'attachment-btn') { var inp = document.getElementById('image-input'); if (inp) inp.click(); return; }

        // 设置弹窗卡片
        if (id === 'appearance-settings') return (tryHide('settings-modal'), tryOpen('appearance-modal', () => { if (typeof renderBackgroundGallery === 'function') renderBackgroundGallery(); }));
        if (id === 'chat-settings') return (tryHide('settings-modal'), tryOpen('chat-modal'));
        if (id === 'advanced-settings') return (tryHide('settings-modal'), tryOpen('advanced-modal'));
        if (id === 'data-settings') return (tryHide('settings-modal'), tryOpen('data-modal', () => { if (typeof updateStorageUsageBar === 'function') updateStorageUsageBar(); }));

        // 高级功能入口
        if (id === 'custom-replies-function') return (tryHide('advanced-modal'), tryOpen('custom-replies-modal'));
        if (id === 'stats-function') return (tryHide('advanced-modal'), tryOpen('stats-modal', () => { if (typeof renderStatsContent === 'function') renderStatsContent(); }));
        if (id === 'anniversary-function') return (tryHide('advanced-modal'), tryOpen('anniversary-modal', () => { if (typeof renderAnniversariesList === 'function') renderAnniversariesList(); }));
        if (id === 'mood-function') return (tryHide('advanced-modal'), tryOpen('mood-modal', () => { if (typeof renderMoodCalendar === 'function') renderMoodCalendar(); }));
        if (id === 'envelope-function') return (tryHide('advanced-modal'), tryOpen('envelope-modal', () => { if (typeof loadEnvelopeData === 'function') loadEnvelopeData(); }));
        if (id === 'fortune-lenormand-function') return (tryHide('advanced-modal'), tryOpen('fortune-lenormand-modal', () => { if (typeof generateFortune === 'function') generateFortune(); }));
        if (id === 'decision-function') return (tryHide('advanced-modal'), tryOpen('decision-menu-modal'));
    });
})();
// ==================== ★ 最终修复：App 总启动器 ====================
(function launchApp() {
    // 1. 强行补全基础弹窗函数（防止报错 showModal is not defined）
    window.showModal = window.showModal || function(el) {
        if (!el) return;
        if (el._hideTimeout) { clearTimeout(el._hideTimeout); el._hideTimeout = null; }
        el.style.display = 'flex';
        requestAnimationFrame(function() {
            var c = el.querySelector('.modal-content');
            if (c) { c.style.opacity = '1'; c.style.transform = 'translateY(0) scale(1)'; }
        });
    };
    window.hideModal = window.hideModal || function(el) {
        if (!el) return;
        var c = el.querySelector('.modal-content');
        if (c) { c.style.opacity = '0'; c.style.transform = 'translateY(20px) scale(0.95)'; }
        if (el._hideTimeout) clearTimeout(el._hideTimeout);
        el._hideTimeout = setTimeout(function() { el.style.display = 'none'; }, 300);
    };

    // 2. 强行绑定所有按钮点击事件（事件代理，绝不会漏）
    document.addEventListener('click', function(e) {
        var target = e.target.closest('button, .settings-card, .settings-item, .action-btn, .input-btn');
        if (!target) return;
        var id = target.id;

        var openModal = function(modalId) {
            var m = document.getElementById(modalId);
            if (m) window.showModal(m);
        };
        var hideModal = function(modalId) {
            var m = document.getElementById(modalId);
            if (m) window.hideModal(m);
        };

        // 顶部图标
        if (id === 'settings-btn') { e.preventDefault(); openModal('settings-modal'); return; }
        if (id === 'session-manager-btn') { e.preventDefault(); openModal('session-modal'); if (typeof renderSessionList === 'function') renderSessionList(); return; }
        if (id === 'group-chat-btn') { e.preventDefault(); openModal('group-chat-modal'); if (typeof updateGroupModeUI === 'function') updateGroupModeUI(); return; }
        if (id === 'moments-btn') { e.preventDefault(); if (typeof window.openMomentsPanel === 'function') window.openMomentsPanel(); return; }
        if (id === 'daily-greeting-btn') { e.preventDefault(); if (typeof window.reopenDailyGreeting === 'function') window.reopenDailyGreeting(); return; }
        if (id === 'theme-toggle') { e.preventDefault(); if (typeof settings !== 'undefined') { settings.isDarkMode = !settings.isDarkMode; if (typeof throttledSaveData === 'function') throttledSaveData(); if (typeof updateUI === 'function') updateUI(); } return; }
        if (id === 'attachment-btn') { e.preventDefault(); var inp = document.getElementById('image-input'); if (inp) inp.click(); return; }
        if (id === 'combo-btn') { e.preventDefault(); var picker = document.getElementById('user-sticker-picker'); if (picker) picker.classList.toggle('active'); return; }

        // 设置弹窗卡片
        if (id === 'appearance-settings') { e.preventDefault(); hideModal('settings-modal'); openModal('appearance-modal'); if (typeof renderBackgroundGallery === 'function') renderBackgroundGallery(); return; }
        if (id === 'chat-settings') { e.preventDefault(); hideModal('settings-modal'); openModal('chat-modal'); return; }
        if (id === 'advanced-settings') { e.preventDefault(); hideModal('settings-modal'); openModal('advanced-modal'); return; }
        if (id === 'data-settings') { e.preventDefault(); hideModal('settings-modal'); openModal('data-modal'); if (typeof updateStorageUsageBar === 'function') updateStorageUsageBar(); return; }

        // 高级功能入口
        if (id === 'custom-replies-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('custom-replies-modal'); return; }
        if (id === 'stats-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('stats-modal'); if (typeof renderStatsContent === 'function') renderStatsContent(); return; }
        if (id === 'anniversary-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('anniversary-modal'); if (typeof renderAnniversariesList === 'function') renderAnniversariesList(); return; }
        if (id === 'mood-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('mood-modal'); if (typeof renderMoodCalendar === 'function') renderMoodCalendar(); return; }
        if (id === 'envelope-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('envelope-modal'); if (typeof loadEnvelopeData === 'function') loadEnvelopeData(); return; }
        if (id === 'fortune-lenormand-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('fortune-lenormand-modal'); if (typeof generateFortune === 'function') generateFortune(); return; }
        if (id === 'decision-function') { e.preventDefault(); hideModal('advanced-modal'); openModal('decision-menu-modal'); return; }
        if (id === 'avatar-exchange-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openAvatarExchangePanel === 'function') window.openAvatarExchangePanel(); return; }
        if (id === 'partner-image-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openPartnerImagePanel === 'function') window.openPartnerImagePanel(); return; }
        if (id === 'shop-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openShopPanel === 'function') window.openShopPanel(); return; }
        if (id === 'listen-music-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openListenMusicPanel === 'function') window.openListenMusicPanel(); return; }
        if (id === 'watch-movie-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openWatchMoviePanel === 'function') window.openWatchMoviePanel(); return; }
        if (id === 'recipe-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openRecipePanel === 'function') window.openRecipePanel(); return; }
        if (id === 'novel-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openNovelPanel === 'function') window.openNovelPanel(); return; }
        if (id === 'word-cards-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openWordCardComposePanel === 'function') window.openWordCardComposePanel(); return; }
        if (id === 'word-cards-manager-function') { e.preventDefault(); hideModal('advanced-modal'); if (typeof window.openWordCardsPanel === 'function') window.openWordCardsPanel(); return; }

        // 弹窗关闭
        if (id === 'cancel-settings' || id === 'close-settings') { hideModal('settings-modal'); return; }
        if (id === 'close-appearance') { hideModal('appearance-modal'); return; }
        if (id === 'close-chat') { hideModal('chat-modal'); return; }
        if (id === 'close-advanced') { hideModal('advanced-modal'); return; }
        if (id === 'close-data') { hideModal('data-modal'); return; }
        if (id === 'close-shop-panel') { hideModal('shop-panel'); return; }
    }, true); // 使用捕获阶段，确保优先响应

    // 3. 启动数据加载（延时一点，等所有依赖脚本加载完毕）
    setTimeout(function() {
        if (typeof window.initializeSession === 'function') {
            window.initializeSession().then(function() {
                if (typeof loadData === 'function') loadData();
            }).catch(function(e) { console.error('初始化失败:', e); });
        } else {
            if (typeof loadData === 'function') loadData();
        }
    }, 300);
})();
// ==================== ★ 终极暴力补丁：修复设置和表情按钮 ====================
(function finalFixButtons() {
    // 1. 强制重写 showModal 函数，解决弹窗打不开
    window.showModal = function(modalElement, focusElement) {
        if (!modalElement) return;
        if (modalElement._hideTimeout) {
            clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = null;
        }
        modalElement.style.display = 'flex';
        requestAnimationFrame(function() {
            var content = modalElement.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0) scale(1)';
            }
            if (focusElement) setTimeout(function() { focusElement.focus(); }, 100);
        });
    };

    // 2. 强制重写 hideModal 函数
    window.hideModal = function(modalElement) {
        if (!modalElement) return;
        var content = modalElement.querySelector('.modal-content');
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px) scale(0.95)';
        }
        if (modalElement._hideTimeout) clearTimeout(modalElement._hideTimeout);
        modalElement._hideTimeout = setTimeout(function() {
            modalElement.style.display = 'none';
        }, 300);
    };

    // 3. 绑定“设置”按钮
    document.addEventListener('click', function(e) {
        // 设置按钮
        var settingsBtn = e.target.closest('#settings-btn');
        if (settingsBtn) {
            e.preventDefault();
            e.stopPropagation();
            var m = document.getElementById('settings-modal');
            if (m) window.showModal(m);
            return;
        }

        // 表情（笑脸）按钮
        var comboBtn = e.target.closest('#combo-btn');
        if (comboBtn) {
            e.preventDefault();
            e.stopPropagation();
            var picker = document.getElementById('user-sticker-picker');
            if (picker) {
                picker.classList.toggle('active');
            }
            return;
        }

        // 每日公告按钮
        var dgBtn = e.target.closest('#daily-greeting-btn');
        if (dgBtn) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.reopenDailyGreeting === 'function') window.reopenDailyGreeting();
            return;
        }
    }, true); // ★ 捕获阶段，确保所有点击都会被拦截并处理
})();
// ==================== ★ 终极补丁：强制数据加载 + 强制绑定表情按钮 ====================
(function finalRescueApp() {

    // 1. 强制重新绑定“表情”和“设置”按钮（修复打不开的问题）
    document.addEventListener('click', function(e) {
        // 绑定设置按钮
        var settingsBtn = e.target.closest('#settings-btn');
        if (settingsBtn) {
            e.preventDefault(); e.stopPropagation();
            var m = document.getElementById('settings-modal');
            if (m && window.showModal) window.showModal(m);
            return;
        }

        // 绑定表情（笑脸）按钮
        var comboBtn = e.target.closest('#combo-btn');
        if (comboBtn) {
            e.preventDefault(); e.stopPropagation();
            var picker = document.getElementById('user-sticker-picker');
            if (picker) picker.classList.toggle('active');
            return;
        }
    }, true);

    // 2. 强制重新执行一次数据加载（修复头像、回复库丢失）
    // 必须延迟 1.5 秒，等所有依赖文件加载完毕
    setTimeout(function() {
        console.log("【系统提示】正在尝试恢复本地数据...");
        if (typeof loadData === 'function') {
            loadData().then(function() {
                console.log("【系统提示】数据恢复完成");
                if (typeof renderMessages === 'function') renderMessages();
                if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
            }).catch(function(e) {
                console.error("数据恢复失败:", e);
            });
        } else {
            console.error("【严重错误】找不到 loadData 函数，数据无法恢复！");
        }
    }, 1500);

})();