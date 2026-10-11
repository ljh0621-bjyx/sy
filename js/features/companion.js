/**
 * companion.js
 * 陪伴功能（一起学习 / 工作 / 睡觉 / 运动）+ 聊天
 */

(function () {
    'use strict';

    const LOG_KEY = getStorageKey('companionLog_v1');
    const CHAT_KEY = getStorageKey('companionChat_v1');

    const ACTIVITIES = {
        study:  { name: '一起学习', emoji: '📖',
                  bg: 'linear-gradient(160deg, #e8f2ff 0%, #c5dcff 50%, #a8c9f0 100%)',
                  bgCard: 'linear-gradient(160deg, rgba(200,220,255,0.35), rgba(168,201,240,0.15))',
                  color: '#2a4a6b',
                  lines: ['我陪着你，专心做你的事', '加油，我就在旁边', '认真学习的你最好看', '别急，慢慢来'] },
        work:   { name: '一起工作', emoji: '💼',
                  bg: 'linear-gradient(160deg, #f0f0f0 0%, #d8d8d8 50%, #b8b8b8 100%)',
                  bgCard: 'linear-gradient(160deg, rgba(220,220,220,0.4), rgba(180,180,180,0.15))',
                  color: '#3a3a3a',
                  lines: ['工作顺利，我在这里', '忙完记得喝口水', '陪你一起努力', '一件件来，不着急'] },
        sleep:  { name: '一起睡觉', emoji: '🌙',
                  bg: 'linear-gradient(160deg, #1a1a3e 0%, #0d0d28 50%, #050515 100%)',
                  bgCard: 'linear-gradient(160deg, rgba(80,80,140,0.3), rgba(40,40,90,0.15))',
                  color: '#e8e0ff',
                  lines: ['晚安，做个好梦', '我陪你入睡', '闭上眼睛，我在', '梦里见'] },
        sport:  { name: '一起运动', emoji: '🏃',
                  bg: 'linear-gradient(160deg, #ffe8d0 0%, #ffcfa8 50%, #f0b080 100%)',
                  bgCard: 'linear-gradient(160deg, rgba(255,220,180,0.4), rgba(240,176,128,0.15))',
                  color: '#6b3a15',
                  lines: ['加油，你超棒！', '动起来，我陪你', '坚持住，快到了', '汗水最美'] }
    };

    let activeSession = null;   // { activity, totalSec, remainSec, lastTick, timer }
    let chatHistory = [];
    let panelEl = null;
    let fsEl = null;
    let miniEl = null;

    async function loadLog() {
        try {
            const s = await localforage.getItem(LOG_KEY);
            return Array.isArray(s) ? s : [];
        } catch (e) { return []; }
    }
    async function saveLogEntry(entry) {
        try {
            const list = await loadLog();
            list.unshift(entry);
            await localforage.setItem(LOG_KEY, list.slice(0, 200));
        } catch (e) {}
    }

    async function loadChat() {
        try {
            const s = await localforage.getItem(CHAT_KEY);
            if (Array.isArray(s)) chatHistory = s;
        } catch (e) {}
    }
    async function saveChat() {
        try { await localforage.setItem(CHAT_KEY, chatHistory.slice(-200)); } catch (e) {}
    }

    function fmtTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getAvatarHTML(which) {
        try {
            const el = document.getElementById(which === 'me' ? 'my-avatar' : 'partner-avatar');
            if (el && el.innerHTML.trim()) return el.innerHTML;
        } catch (e) {}
        return '<i class="fas fa-user"></i>';
    }

    function getPartnerReply() {
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function (t) { return t && String(t).trim(); })
            : [];
        if (pool.length === 0) return '嗯…';
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ================= 入口面板 =================
    window.openCompanionPanel = function () {
        const old = document.getElementById('companion-panel');
        if (old) old.remove();

        let selectedActivity = 'study';
        let selectedMin = 25;

        const panel = document.createElement('div');
        panel.id = 'companion-panel';
        panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;';

        panel.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:24px;padding:24px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.45);animation:companionIn 0.35s cubic-bezier(0.34,1.4,0.64,1);">'
            + '<style>@keyframes companionIn { from { opacity:0; transform:translateY(30px) scale(0.94); } to { opacity:1; transform:none; } }</style>'

            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">'
            +   '<span style="font-size:17px;font-weight:700;color:var(--text-primary);">'
            +     '<i class="fas fa-heart" style="color:var(--accent-color);margin-right:8px;"></i>陪伴'
            +   '</span>'
            +   '<div style="display:flex;gap:6px;">'
            +     '<button id="cp-log" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:15px;padding:4px 8px;" title="陪伴日志"><i class="fas fa-book"></i></button>'
            +     '<button id="cp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:4px 8px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            + '</div>'

            + '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;">选择活动</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">'
            +   Object.keys(ACTIVITIES).map(k => {
                    const a = ACTIVITIES[k];
                    const isSel = k === selectedActivity;
                    return '<button data-act="' + k + '" style="'
                        + 'padding:16px 12px;border-radius:16px;'
                        + 'border:2px solid ' + (isSel ? 'var(--accent-color)' : 'var(--border-color)') + ';'
                        + 'background:' + (isSel ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--primary-bg)') + ';'
                        + 'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;'
                        + 'font-family:var(--font-family);transition:all 0.2s;'
                        + '">'
                        + '<span style="font-size:26px;">' + a.emoji + '</span>'
                        + '<span style="font-size:13px;font-weight:600;color:' + (isSel ? 'var(--accent-color)' : 'var(--text-primary)') + ';">' + a.name + '</span>'
                        + '</button>';
                }).join('')
            + '</div>'

            + '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;">选择时长</div>'
            + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px;">'
            +   [10, 25, 35, 60].map(m => {
                    const isSel = m === selectedMin;
                    return '<button data-min="' + m + '" style="'
                        + 'padding:12px 6px;border-radius:12px;'
                        + 'border:2px solid ' + (isSel ? 'var(--accent-color)' : 'var(--border-color)') + ';'
                        + 'background:' + (isSel ? 'var(--accent-color)' : 'var(--primary-bg)') + ';'
                        + 'color:' + (isSel ? '#fff' : 'var(--text-primary)') + ';'
                        + 'font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);'
                        + '">' + m + '<span style="font-size:10px;opacity:0.8;">分</span></button>';
                }).join('')
            + '</div>'

            + '<button id="cp-start" style="width:100%;padding:14px;border:none;border-radius:14px;background:var(--accent-color);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-family);letter-spacing:1px;box-shadow:0 6px 20px rgba(var(--accent-color-rgb),0.35);">'
            +   '<i class="fas fa-play"></i> 开始陪伴'
            + '</button>'

            + '</div>';

        document.body.appendChild(panel);

        panel.querySelectorAll('[data-act]').forEach(btn => {
            btn.onclick = () => {
                selectedActivity = btn.dataset.act;
                panel.querySelectorAll('[data-act]').forEach(b => {
                    const sel = b.dataset.act === selectedActivity;
                    b.style.borderColor = sel ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.background = sel ? 'rgba(var(--accent-color-rgb),0.08)' : 'var(--primary-bg)';
                    b.querySelector('span:last-child').style.color = sel ? 'var(--accent-color)' : 'var(--text-primary)';
                });
            };
        });

        panel.querySelectorAll('[data-min]').forEach(btn => {
            btn.onclick = () => {
                selectedMin = parseInt(btn.dataset.min, 10);
                panel.querySelectorAll('[data-min]').forEach(b => {
                    const sel = parseInt(b.dataset.min, 10) === selectedMin;
                    b.style.borderColor = sel ? 'var(--accent-color)' : 'var(--border-color)';
                    b.style.background = sel ? 'var(--accent-color)' : 'var(--primary-bg)';
                    b.style.color = sel ? '#fff' : 'var(--text-primary)';
                });
            };
        });

        const close = () => panel.remove();
        panel.querySelector('#cp-close').onclick = close;
        panel.addEventListener('click', e => { if (e.target === panel) close(); });

        panel.querySelector('#cp-log').onclick = () => {
            close();
            window.openCompanionLog();
        };

        panel.querySelector('#cp-start').onclick = () => {
            close();
            startCompanion(selectedActivity, selectedMin);
        };
    };

    // ================= 开始陪伴 =================
    function startCompanion(activityKey, minutes) {
        const act = ACTIVITIES[activityKey];
        if (!act) return;

        const totalSec = minutes * 60;

        activeSession = {
            activity: activityKey,
            totalSec: totalSec,
            remainSec: totalSec,
            lastTick: Date.now(),
            timer: null
        };

        showFullscreen(act);

        activeSession.timer = setInterval(function () {
            const now = Date.now();
            const elapsed = Math.floor((now - activeSession.lastTick) / 1000);
            if (elapsed > 0) {
                activeSession.lastTick = now;
                activeSession.remainSec = Math.max(0, activeSession.remainSec - elapsed);
                updateTime();
                if (activeSession.remainSec <= 0) {
                    endCompanion(false);
                }
            }
        }, 1000);
    }

    // ================= 全屏界面 =================
    function showFullscreen(act) {
        const old = document.getElementById('companion-fullscreen');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'companion-fullscreen';
        el.style.cssText = 'position:fixed;inset:0;z-index:999999;'
            + 'background:' + act.bg + ';'
            + 'display:flex;flex-direction:column;font-family:var(--font-family);overflow:hidden;'
            + 'transition:opacity 0.4s ease;';

        const isDark = (activeSession.activity === 'sleep');

        el.innerHTML =
            '<style>'
            + '@keyframes cpFloat { 0%,100%{ transform: translate(0,0); opacity:0.25; } 50%{ transform: translate(20px,-30px); opacity:0.5; } }'
            + '@keyframes cpBreath { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.06); } }'
            + '@keyframes cpGlowEnd { 0%{ opacity:0; transform:scale(0.6); } 60%{ opacity:1; transform:scale(1.2); } 100%{ opacity:0; transform:scale(2); } }'
            + '@keyframes cpChatIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }'
            + '.cp-particle { position:absolute; border-radius:50%; background:rgba(255,255,255,0.6); filter:blur(8px); pointer-events:none; }'
            + '.cp-avatar-box { width:56px;height:56px;border-radius:50%;overflow:hidden;border:2.5px solid rgba(255,255,255,0.5);box-shadow:0 4px 16px rgba(0,0,0,0.15);background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;animation:cpBreath 4s ease-in-out infinite;flex-shrink:0; }'
+ '.cp-avatar-box img { width:100% !important; height:100% !important; object-fit:cover !important; border-radius:50% !important; display:block !important; }'
+ '.cp-avatar-box i { font-size:24px; color:rgba(255,255,255,0.85); }'
            + '</style>'
            + '<div id="cp-particles" style="position:absolute;inset:0;overflow:hidden;"></div>'

            // 顶部：头像 + 倒计时
            + '<div style="position:relative;z-index:2;padding:24px 20px 16px;text-align:center;flex-shrink:0;">'
            +   '<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;color:' + act.color + ';margin-bottom:16px;">' + act.emoji + ' ' + act.name + '</div>'

            // 双方头像
            +   '<div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:18px;">'
            +     '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'
            + '<div class="cp-avatar-box">'
            +         getAvatarHTML('me')
            +       '</div>'
            +       '<span style="font-size:10px;opacity:0.7;color:' + act.color + ';font-weight:600;">我</span>'
            +     '</div>'

            +     '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:' + act.color + ';">'
            +       '<div style="font-size:20px;">💞</div>'
            +       '<div id="cp-time" style="font-size:36px;font-weight:800;font-family:Georgia,monospace;letter-spacing:1px;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,0.1);">' + fmtTime(activeSession.remainSec) + '</div>'
            +       '<span style="font-size:10px;opacity:0.55;letter-spacing:1.5px;">剩余</span>'
            +     '</div>'

            +     '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'
            + '<div class="cp-avatar-box" style="animation-delay:0.5s;">'
            +         getAvatarHTML('partner')
            +       '</div>'
            +       '<span style="font-size:10px;opacity:0.7;color:' + act.color + ';font-weight:600;" id="cp-partner-name">' + (typeof settings !== 'undefined' && settings.partnerName ? settings.partnerName : '对方') + '</span>'
            +     '</div>'
            +   '</div>'

            +   '<div id="cp-encourage" style="font-size:14px;opacity:0.85;color:' + act.color + ';max-width:280px;margin:0 auto;line-height:1.6;font-weight:500;">「' + act.lines[Math.floor(Math.random() * act.lines.length)] + '」</div>'
            + '</div>'

            // 聊天区
            + '<div style="flex:1;min-height:0;position:relative;z-index:2;padding:0 16px;display:flex;flex-direction:column;">'
            +   '<div id="cp-chat-scroll" style="flex:1;overflow-y:auto;padding:12px 8px;background:' + act.bgCard + ';backdrop-filter:blur(20px);border-radius:18px 18px 0 0;border:1px solid rgba(255,255,255,0.3);border-bottom:none;"></div>'
            +   '<div style="display:flex;gap:8px;padding:10px 10px 14px;background:' + act.bgCard + ';backdrop-filter:blur(20px);border-radius:0 0 18px 18px;border:1px solid rgba(255,255,255,0.3);border-top:none;flex-shrink:0;">'
            +     '<button id="cp-emoji" style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.25);color:' + act.color + ';cursor:pointer;flex-shrink:0;"><i class="fas fa-smile"></i></button>'
            +     '<button id="cp-voice" style="width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.25);color:' + act.color + ';cursor:pointer;flex-shrink:0;"><i class="fas fa-microphone"></i></button>'
            +     '<input id="cp-input" type="text" placeholder="陪你说说话…" style="flex:1;min-width:0;padding:8px 14px;border:1px solid rgba(255,255,255,0.4);border-radius:20px;background:rgba(255,255,255,0.7);color:#333;font-size:13px;outline:none;font-family:var(--font-family);">'
            +     '<button id="cp-send" style="padding:8px 16px;border:none;border-radius:20px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:var(--font-family);">发送</button>'
            +   '</div>'
            + '</div>'

            // 底部按钮
            + '<div style="position:relative;z-index:2;padding:12px 20px 20px;display:flex;justify-content:center;gap:12px;flex-shrink:0;">'
            +   '<button id="cp-min-btn" style="padding:10px 22px;border:1.5px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);color:' + act.color + ';font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);border-radius:50px;letter-spacing:1px;transition:all 0.25s;">最小化</button>'
            +   '<button id="cp-end-btn" style="padding:10px 26px;border:1.5px solid rgba(255,255,255,0.5);background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);color:' + act.color + ';font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);border-radius:50px;letter-spacing:1px;transition:all 0.25s;">结束陪伴</button>'
            + '</div>';

        document.body.appendChild(el);

        // 粒子
        const pWrap = el.querySelector('#cp-particles');
        for (let i = 0; i < 18; i++) {
            const p = document.createElement('div');
            p.className = 'cp-particle';
            const sz = 4 + Math.random() * 20;
            p.style.width = sz + 'px';
            p.style.height = sz + 'px';
            p.style.left = (Math.random() * 100) + '%';
            p.style.top = (Math.random() * 100) + '%';
            p.style.animation = 'cpFloat ' + (6 + Math.random() * 8) + 's ease-in-out infinite';
            p.style.animationDelay = (-Math.random() * 8) + 's';
            pWrap.appendChild(p);
        }

        // 绑定事件
        el.querySelector('#cp-end-btn').onclick = function () {
            if (confirm('确定结束陪伴吗？')) endCompanion(true);
        };
        el.querySelector('#cp-min-btn').onclick = function () {
            minimizeToIndicator();
        };

        const input = el.querySelector('#cp-input');
        const sendBtn = el.querySelector('#cp-send');
        const doSend = function () {
            const v = input.value.trim();
            if (!v) return;
            input.value = '';
            sendChat('text', v);
        };
        sendBtn.onclick = doSend;
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); doSend(); }
        });

        el.querySelector('#cp-emoji').onclick = function () {
            const emojis = ['☺️','💕','✨','🥺','😊','😌','🤗','💗','🌙','⭐','🍀','🌸'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            sendChat('text', emoji);
        };

        el.querySelector('#cp-voice').onclick = function () {
            if (!window.PanelVoiceRecorder || !window.PanelVoiceRecorder.isSupported()) {
                showNotification('当前浏览器不支持录音', 'warning');
                return;
            }
            window.PanelVoiceRecorder.record(function (audioUrl, duration) {
                if (!audioUrl) return;
                chatHistory.push({
                    sender: 'me', type: 'voice', content: '',
                    duration: duration, voiceUrl: audioUrl, time: Date.now()
                });
                if (chatHistory.length > 200) chatHistory = chatHistory.slice(-200);
                saveChat();
                renderChat();
                setTimeout(partnerReply, 1500 + Math.random() * 1500);
            });
        };

        renderChat();
        scrollChatToBottom();
    }

    function updateTime() {
        const timeEl = document.getElementById('cp-time');
        if (timeEl && activeSession) {
            timeEl.textContent = fmtTime(activeSession.remainSec);
        }
        if (miniEl && activeSession) {
            const t = miniEl.querySelector('.cp-mini-time');
            if (t) t.textContent = fmtTime(activeSession.remainSec);
        }
    }

    // ================= 聊天 =================
    function renderChat() {
        const el = document.getElementById('cp-chat-scroll');
        if (!el) return;
        if (chatHistory.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:16px;color:rgba(0,0,0,0.35);font-size:11px;">陪你说说话…</div>';
            return;
        }
        const act = ACTIVITIES[activeSession.activity];
        const isDark = activeSession.activity === 'sleep';
        el.innerHTML = chatHistory.map(function (msg) {
            const isMe = msg.sender === 'me';
            let inner = '';
            if (msg.type === 'text') inner = '<span style="font-size:13px;">' + esc(msg.content) + '</span>';
            else if (msg.type === 'voice') {
                const dur = msg.duration || 3;
                inner = '<div class="panel-voice-bubble" data-url="' + (msg.voiceUrl || '') + '" data-duration="' + dur + '" onclick="window.playPanelVoice(this)" style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:80px;padding:2px 0;">'
                    + '<i class="fas fa-volume-up" style="font-size:13px;opacity:0.9;"></i>'
                    + '<div style="flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.3);min-width:24px;position:relative;overflow:hidden;">'
                    + '<div class="voice-bar" style="position:absolute;left:0;top:0;bottom:0;width:0%;background:rgba(255,255,255,0.9);transition:width 0.15s linear;"></div>'
                    + '</div>'
                    + '<span style="font-size:11px;opacity:0.85;">' + dur + '"</span>'
                    + '</div>';
            }
            const bubbleBg = isMe
                ? 'var(--accent-color)'
                : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)');
            const bubbleColor = isMe
                ? '#fff'
                : (isDark ? '#f0eaff' : '#333');
            return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end;' : '') + ';margin-bottom:6px;">'
                + '<div style="background:' + bubbleBg + ';color:' + bubbleColor + ';padding:7px 12px;border-radius:14px;max-width:72%;word-break:break-word;backdrop-filter:blur(10px);box-shadow:0 2px 8px rgba(0,0,0,0.08);">'
                + inner + '</div></div>';
        }).join('');
    }

    function scrollChatToBottom() {
        const el = document.getElementById('cp-chat-scroll');
        if (el) setTimeout(function () { el.scrollTop = el.scrollHeight; }, 30);
    }

    function sendChat(type, content) {
        chatHistory.push({ sender: 'me', type: type, content: content, time: Date.now() });
        if (chatHistory.length > 200) chatHistory = chatHistory.slice(-200);
        saveChat();
        renderChat();
        scrollChatToBottom();
        setTimeout(partnerReply, 1200 + Math.random() * 1500);
    }

    async function partnerReply() {
        const reply = getPartnerReply();
        // 先弹拼音
        if (typeof window.simulatePartnerTypingProcess === 'function') {
            try { await window.simulatePartnerTypingProcess(reply); } catch (e) {}
        }
        chatHistory.push({ sender: 'partner', type: 'text', content: reply, time: Date.now() });
        if (chatHistory.length > 200) chatHistory = chatHistory.slice(-200);
        saveChat();
        renderChat();
        scrollChatToBottom();
        if (typeof playSound === 'function') playSound('message');
    }

    // ================= 最小化 =================
    function minimizeToIndicator() {
        const fs = document.getElementById('companion-fullscreen');
        if (fs) {
            fs.style.opacity = '0';
            setTimeout(function () { fs.remove(); }, 400);
        }

        if (miniEl) miniEl.remove();
        const act = ACTIVITIES[activeSession.activity];
        miniEl = document.createElement('div');
        miniEl.className = 'cp-mini-indicator';
        miniEl.innerHTML =
            '<span style="font-size:18px;">' + act.emoji + '</span>'
            + '<span class="cp-mini-time" style="font-size:14px;font-weight:700;letter-spacing:1px;color:#fff;font-family:Georgia,monospace;">' + fmtTime(activeSession.remainSec) + '</span>';
        miniEl.style.cssText = 'position:fixed;top:90px;right:16px;z-index:99999;'
            + 'display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:30px;'
            + 'background:linear-gradient(135deg, rgba(0,0,0,0.75), rgba(30,30,50,0.75));'
            + 'backdrop-filter:blur(20px);cursor:pointer;'
            + 'box-shadow:0 6px 24px rgba(0,0,0,0.3);'
            + 'animation:companionIn 0.3s ease;';
        miniEl.onclick = function () {
            if (miniEl) { miniEl.remove(); miniEl = null; }
            if (activeSession) showFullscreen(ACTIVITIES[activeSession.activity]);
        };
        document.body.appendChild(miniEl);
    }

    // ================= 结束 =================
    function endCompanion(userEnded) {
        if (!activeSession) return;
        if (activeSession.timer) clearInterval(activeSession.timer);
        activeSession.timer = null;

        const act = ACTIVITIES[activeSession.activity];
        const totalMin = Math.round(activeSession.totalSec / 60);
        const doneSec = activeSession.totalSec - activeSession.remainSec;
        const doneMin = Math.max(1, Math.round(doneSec / 60));

        const fs = document.getElementById('companion-fullscreen');
        if (fs) {
            const glow = document.createElement('div');
            glow.style.cssText = 'position:absolute;top:50%;left:50%;width:200px;height:200px;'
                + 'transform:translate(-50%,-50%);border-radius:50%;'
                + 'background:radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 40%, transparent 70%);'
                + 'animation:cpGlowEnd 1.2s ease-out forwards;pointer-events:none;z-index:5;';
            fs.appendChild(glow);
        }

        setTimeout(function () {
            if (fs) fs.remove();
            if (miniEl) { miniEl.remove(); miniEl = null; }
            finalizeEnd(act, totalMin, doneMin, userEnded);
        }, 700);
    }

    function finalizeEnd(act, totalMin, doneMin, userEnded) {
        try {
            if (typeof settings !== 'undefined' && settings.soundEnabled && typeof playSound === 'function') {
                playSound('favorite');
            }
        } catch (e) {}

        const activityKey = activeSession ? activeSession.activity : '';

        saveLogEntry({
            activity: act.name,
            activityKey: activityKey,
            totalMin: totalMin,
            doneMin: doneMin,
            endTime: Date.now(),
            userEnded: !!userEnded
        });

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        let text = '';
        if (activityKey === 'sleep') {
            text = '晚安，做个好梦。';
        } else if (userEnded) {
            text = '这次就到这吧，休息一下～';
        } else {
            text = '我们一起' + act.name.replace('一起', '') + '了 ' + totalMin + ' 分钟，真棒！';
        }

        setTimeout(function () {
            if (typeof addMessage === 'function') {
                addMessage({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    sender: partnerName,
                    text: text,
                    timestamp: new Date(),
                    status: 'received',
                    type: 'normal'
                });
            }
            if (typeof playSound === 'function') playSound('message');
        }, 800);

        activeSession = null;
        if (typeof showNotification === 'function') {
            showNotification('✓ 已记录：' + act.name + ' · ' + doneMin + ' 分钟', 'success', 2500);
        }
    }

    // ================= 日志 =================
    window.openCompanionLog = async function () {
        const old = document.getElementById('companion-log-panel');
        if (old) old.remove();

        const log = await loadLog();
        const totalMin = log.reduce(function (s, x) { return s + (x.doneMin || 0); }, 0);

        const modal = document.createElement('div');
        modal.id = 'companion-log-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        const listHTML = log.length === 0
            ? '<div style="text-align:center;padding:40px;color:var(--text-secondary);font-size:13px;">还没有陪伴记录</div>'
            : log.map(function (item) {
                const d = new Date(item.endTime);
                const time = d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                return '<div style="padding:12px 14px;background:var(--primary-bg);border-radius:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">'
                    + '<span style="font-size:20px;">' + (ACTIVITIES[item.activityKey] ? ACTIVITIES[item.activityKey].emoji : '✨') + '</span>'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + item.activity + '</div>'
                    + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + time + '</div>'
                    + '</div>'
                    + '<div style="font-size:14px;font-weight:700;color:var(--accent-color);">' + item.doneMin + ' 分钟</div>'
                    + '</div>';
            }).join('');

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            + '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-book" style="color:var(--accent-color);margin-right:8px;"></i>陪伴日志</span>'
            + '<button id="cl-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.04));border-radius:14px;padding:16px;margin-bottom:14px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.2);">'
            + '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:2px;">累计陪伴</div>'
            + '<div style="font-size:32px;font-weight:800;color:var(--accent-color);font-family:Georgia,serif;margin-top:4px;">' + totalMin + '<span style="font-size:14px;font-weight:500;margin-left:4px;">分钟</span></div>'
            + '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">共 ' + log.length + ' 次</div>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        modal.querySelector('#cl-close').onclick = function () { modal.remove(); };
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    };

    // ================= 初始化 =================
    window.initCompanion = function () {
        const btn = document.getElementById('companion-function');
        if (btn && !btn.dataset.initialized) {
            btn.dataset.initialized = 'true';
            btn.addEventListener('click', function () {
                const adv = document.getElementById('advanced-modal');
                if (adv && typeof hideModal === 'function') hideModal(adv);
                window.openCompanionPanel();
            });
        }
        loadChat();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initCompanion, 1200); });
    } else {
        setTimeout(window.initCompanion, 1200);
    }

    console.log('[companion] 陪伴功能已就绪 ✓');
})();