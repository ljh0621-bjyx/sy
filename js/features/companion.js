/**
 * companion.js
 * 陪伴功能（一起学习 / 工作 / 睡觉 / 运动）
 */

(function () {
    'use strict';

    const LOG_KEY = getStorageKey('companionLog_v1');

    const ACTIVITIES = {
        study:  { name: '一起学习', icon: 'fa-book-open',   emoji: '📖',
                  bg: 'linear-gradient(160deg, #e8f2ff 0%, #c5dcff 50%, #a8c9f0 100%)',
                  darkBg: 'linear-gradient(160deg, #1a2540 0%, #253052 50%, #3a4a70 100%)',
                  textColor: '#2a4a6b',
                  lines: ['我陪着你，专心做你的事', '加油，我就在旁边', '认真学习的你最好看', '别急，慢慢来'] },
        work:   { name: '一起工作', icon: 'fa-briefcase',   emoji: '💼',
                  bg: 'linear-gradient(160deg, #f0f0f0 0%, #d8d8d8 50%, #b8b8b8 100%)',
                  darkBg: 'linear-gradient(160deg, #202020 0%, #2a2a2a 50%, #383838 100%)',
                  textColor: '#3a3a3a',
                  lines: ['工作顺利，我在这里', '忙完记得喝口水', '陪你一起努力', '一件件来，不着急'] },
        sleep:  { name: '一起睡觉', icon: 'fa-moon',        emoji: '🌙',
                  bg: 'linear-gradient(160deg, #1a1a3e 0%, #0d0d28 50%, #050515 100%)',
                  darkBg: 'linear-gradient(160deg, #1a1a3e 0%, #0d0d28 50%, #050515 100%)',
                  textColor: '#e8e0ff',
                  lines: ['晚安，做个好梦', '我陪你入睡', '闭上眼睛，我在', '梦里见'] },
        sport:  { name: '一起运动', icon: 'fa-running',     emoji: '🏃',
                  bg: 'linear-gradient(160deg, #ffe8d0 0%, #ffcfa8 50%, #f0b080 100%)',
                  darkBg: 'linear-gradient(160deg, #3a2010 0%, #502a15 50%, #6a3a20 100%)',
                  textColor: '#6b3a15',
                  lines: ['加油，你超棒！', '动起来，我陪你', '坚持住，快到了', '汗水最美'] }
    };

    let activeSession = null;   // { activity, totalSec, remainSec, startTime, timer }
    let miniIndicator = null;

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

    function fmtTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function getPartnerAvatarHTML() {
        try {
            const el = document.getElementById('partner-avatar');
            if (el) return el.innerHTML;
        } catch (e) {}
        return '<i class="fas fa-user"></i>';
    }

    // ---------- 入口面板 ----------
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
            +   '<button id="cp-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;"><i class="fas fa-times"></i></button>'
            + '</div>'

            + '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:10px;">选择活动</div>'
            + '<div id="cp-activities" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">'
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
            + '<div id="cp-durations" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px;">'
            +   [10, 25, 35, 60].map(m => {
                    const isSel = m === selectedMin;
                    return '<button data-min="' + m + '" style="'
                        + 'padding:12px 6px;border-radius:12px;'
                        + 'border:2px solid ' + (isSel ? 'var(--accent-color)' : 'var(--border-color)') + ';'
                        + 'background:' + (isSel ? 'var(--accent-color)' : 'var(--primary-bg)') + ';'
                        + 'color:' + (isSel ? '#fff' : 'var(--text-primary)') + ';'
                        + 'font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);'
                        + '">' + m + '<span style="font-size:10px;opacity:0.8;">分钟</span></button>';
                }).join('')
            + '</div>'

            + '<button id="cp-start" style="width:100%;padding:14px;border:none;border-radius:14px;background:var(--accent-color);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-family);letter-spacing:1px;box-shadow:0 6px 20px rgba(var(--accent-color-rgb),0.35);">'
            +   '<i class="fas fa-play"></i> 开始陪伴'
            + '</button>'

            + '</div>';

        document.body.appendChild(panel);

        // 选择活动
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

        // 选择时长
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

        panel.querySelector('#cp-start').onclick = () => {
            close();
            startCompanion(selectedActivity, selectedMin);
        };
    };

    // ---------- 开始陪伴 ----------
    function startCompanion(activityKey, minutes) {
        const act = ACTIVITIES[activityKey];
        if (!act) return;

        const totalSec = minutes * 60;

        activeSession = {
            activity: activityKey,
            totalSec: totalSec,
            remainSec: totalSec,
            startTime: Date.now(),
            paused: false,
            timer: null,
            lastTick: Date.now()
        };

        showFullscreen(act);

        activeSession.timer = setInterval(function () {
            const now = Date.now();
            const elapsed = Math.floor((now - activeSession.lastTick) / 1000);
            if (elapsed > 0) {
                activeSession.lastTick = now;
                activeSession.remainSec = Math.max(0, activeSession.remainSec - elapsed);
                updateFullscreenTime();

                if (activeSession.remainSec <= 0) {
                    endCompanion(false);
                }
            }
        }, 1000);
    }

    // ---------- 全屏界面 ----------
    function showFullscreen(act) {
        const old = document.getElementById('companion-fullscreen');
        if (old) old.remove();

        const isDarkMode = (typeof settings !== 'undefined' && settings.isDarkMode);
        const bg = isDarkMode ? (act.darkBg || act.bg) : act.bg;
        const textColor = isDarkMode ? '#f0eaff' : act.textColor;

        const el = document.createElement('div');
        el.id = 'companion-fullscreen';
        el.style.cssText = 'position:fixed;inset:0;z-index:999999;'
            + 'background:' + bg + ';'
            + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
            + 'transition:opacity 0.4s ease;'
            + 'font-family:var(--font-family);overflow:hidden;';

        const avatarHTML = getPartnerAvatarHTML();

        // 随机鼓励语
        const line = act.lines[Math.floor(Math.random() * act.lines.length)];

        el.innerHTML =
            // 光晕粒子
            '<style>'
            + '@keyframes cpFloat { 0%,100%{ transform: translate(0,0); opacity:0.25; } 50%{ transform: translate(20px,-30px); opacity:0.5; } }'
            + '@keyframes cpBreath { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.06); } }'
            + '@keyframes cpPulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(255,255,255,0.4); } 50%{ box-shadow: 0 0 0 20px rgba(255,255,255,0); } }'
            + '@keyframes cpGlowEnd { 0%{ opacity:0; transform:scale(0.6); } 60%{ opacity:1; transform:scale(1.2); } 100%{ opacity:0; transform:scale(2); } }'
            + '.cp-particle { position:absolute; border-radius:50%; background:rgba(255,255,255,0.6); filter:blur(8px); pointer-events:none; }'
            + '</style>'
            + '<div class="cp-bg-particles" id="cp-particles"></div>'

            + '<div style="position:relative;z-index:2;text-align:center;padding:20px;">'
            +   '<div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;color:' + textColor + ';margin-bottom:16px;">' + act.emoji + ' ' + act.name + '</div>'
            +   '<div id="cp-time" style="font-size:88px;font-weight:800;font-family:Georgia,monospace;letter-spacing:2px;color:' + textColor + ';line-height:1;margin-bottom:8px;text-shadow:0 4px 24px rgba(0,0,0,0.15);">' + fmtTime(activeSession.remainSec) + '</div>'
            +   '<div style="font-size:12px;opacity:0.6;color:' + textColor + ';margin-bottom:48px;letter-spacing:2px;">剩余时间</div>'

            +   '<div style="width:88px;height:88px;border-radius:50%;overflow:hidden;margin:0 auto 18px;border:3px solid rgba(255,255,255,0.5);box-shadow:0 8px 32px rgba(0,0,0,0.2);animation:cpBreath 4s ease-in-out infinite;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);">'
            +     avatarHTML
            +   '</div>'

            +   '<div style="font-size:15px;opacity:0.9;color:' + textColor + ';max-width:280px;line-height:1.7;font-weight:500;">「' + line + '」</div>'
            + '</div>'

            + '<div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);z-index:2;">'
            +   '<button id="cp-end-btn" style="padding:14px 42px;border:2px solid rgba(255,255,255,0.45);background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);color:' + textColor + ';font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-family);border-radius:50px;letter-spacing:2px;transition:all 0.25s;">'
            +     '结束陪伴'
            +   '</button>'
            + '</div>'

            + '<div style="position:absolute;top:24px;right:24px;z-index:3;">'
            +   '<button id="cp-min-btn" title="最小化" style="width:38px;height:38px;border-radius:50%;border:none;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);color:' + textColor + ';font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">'
            +     '<i class="fas fa-minus"></i>'
            +   '</button>'
            + '</div>';

        document.body.appendChild(el);

        // 粒子
        const pWrap = el.querySelector('#cp-particles');
        for (let i = 0; i < 20; i++) {
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

        // 结束按钮
        el.querySelector('#cp-end-btn').onclick = function () {
            if (confirm('确定结束陪伴吗？')) endCompanion(true);
        };

        // 最小化按钮
        el.querySelector('#cp-min-btn').onclick = function () {
            minimizeToIndicator();
        };
    }

    function updateFullscreenTime() {
        const timeEl = document.getElementById('cp-time');
        if (timeEl && activeSession) {
            timeEl.textContent = fmtTime(activeSession.remainSec);
        }
        if (miniIndicator && activeSession) {
            const t = miniIndicator.querySelector('.cp-mini-time');
            if (t) t.textContent = fmtTime(activeSession.remainSec);
        }
    }

    // ---------- 最小化到悬浮指示器 ----------
    function minimizeToIndicator() {
        const fs = document.getElementById('companion-fullscreen');
        if (fs) {
            fs.style.opacity = '0';
            setTimeout(function () { fs.remove(); }, 400);
        }

        if (miniIndicator) miniIndicator.remove();
        miniIndicator = document.createElement('div');
        miniIndicator.className = 'cp-mini-indicator';
        const act = ACTIVITIES[activeSession.activity];
        miniIndicator.innerHTML =
            '<span style="font-size:18px;">' + act.emoji + '</span>'
            + '<span class="cp-mini-time" style="font-size:14px;font-weight:700;letter-spacing:1px;color:#fff;font-family:Georgia,monospace;">' + fmtTime(activeSession.remainSec) + '</span>';
        miniIndicator.style.cssText = 'position:fixed;top:90px;right:16px;z-index:99999;'
            + 'display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:30px;'
            + 'background:linear-gradient(135deg, rgba(0,0,0,0.75), rgba(30,30,50,0.75));'
            + 'backdrop-filter:blur(20px);cursor:pointer;'
            + 'box-shadow:0 6px 24px rgba(0,0,0,0.3);'
            + 'animation:companionIn 0.3s ease;';
        miniIndicator.onclick = function () {
            // 恢复全屏
            if (miniIndicator) { miniIndicator.remove(); miniIndicator = null; }
            if (activeSession) showFullscreen(ACTIVITIES[activeSession.activity]);
        };
        document.body.appendChild(miniIndicator);
    }

    // ---------- 结束陪伴 ----------
    function endCompanion(userEnded) {
        if (!activeSession) return;

        if (activeSession.timer) clearInterval(activeSession.timer);
        activeSession.timer = null;

        const act = ACTIVITIES[activeSession.activity];
        const totalMin = Math.round(activeSession.totalSec / 60);
        const doneSec = activeSession.totalSec - activeSession.remainSec;
        const doneMin = Math.max(1, Math.round(doneSec / 60));

        // 结束动画（光芒扩散）
        const fs = document.getElementById('companion-fullscreen');
        if (fs) {
            const glow = document.createElement('div');
            glow.style.cssText = 'position:absolute;top:50%;left:50%;width:200px;height:200px;'
                + 'transform:translate(-50%,-50%);border-radius:50%;'
                + 'background:radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 40%, transparent 70%);'
                + 'animation:cpGlowEnd 1.2s ease-out forwards;pointer-events:none;';
            fs.appendChild(glow);
        }

        setTimeout(function () {
            if (fs) fs.remove();
            if (miniIndicator) { miniIndicator.remove(); miniIndicator = null; }
            finalizeEnd(act, totalMin, doneMin, userEnded);
        }, 700);
    }

    function finalizeEnd(act, totalMin, doneMin, userEnded) {
        // 播放结束音
        try {
            if (typeof settings !== 'undefined' && settings.soundEnabled && typeof playSound === 'function') {
                playSound('favorite');
            }
        } catch (e) {}

        // 保存日志
        saveLogEntry({
            activity: act.name,
            activityKey: activeSession ? activeSession.activity : '',
            totalMin: totalMin,
            doneMin: doneMin,
            endTime: Date.now(),
            userEnded: !!userEnded
        });

        // 梦角发消息
        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        let text = '';
        if (activeSession && activeSession.activity === 'sleep') {
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

    // ---------- 陪伴日志 ----------
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
                    +   '<div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + item.activity + '</div>'
                    +   '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' + time + '</div>'
                    + '</div>'
                    + '<div style="font-size:14px;font-weight:700;color:var(--accent-color);">' + item.doneMin + ' 分钟</div>'
                    + '</div>';
            }).join('');

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.45);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-book" style="color:var(--accent-color);margin-right:8px;"></i>陪伴日志</span>'
            +   '<button id="cl-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.12), rgba(var(--accent-color-rgb),0.04));border-radius:14px;padding:16px;margin-bottom:14px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.2);">'
            +   '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:2px;">累计陪伴</div>'
            +   '<div style="font-size:32px;font-weight:800;color:var(--accent-color);font-family:Georgia,serif;margin-top:4px;">' + totalMin + '<span style="font-size:14px;font-weight:500;margin-left:4px;">分钟</span></div>'
            +   '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">共 ' + log.length + ' 次</div>'
            + '</div>'
            + '<div style="flex:1;overflow-y:auto;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        modal.querySelector('#cl-close').onclick = function () { modal.remove(); };
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    };

    // ---------- 初始化 ----------
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
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initCompanion, 1200); });
    } else {
        setTimeout(window.initCompanion, 1200);
    }

    console.log('[companion] 陪伴功能已就绪 ✓');
})();