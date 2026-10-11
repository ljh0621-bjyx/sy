/* ============================================================
 * achievements.js - 恋爱成就系统
 * ============================================================ */
(function () {
    'use strict';

    // 所有成就定义
    const ACHIEVEMENTS = [
        { id: 'first_msg',    icon: '💬', name: '第一次开口',     desc: '发出第一条消息',                     check: (s) => s.msgCount >= 1 },
        { id: 'msg_100',      icon: '📨', name: '聊到停不下来',   desc: '累计发送 100 条消息',                check: (s) => s.msgCount >= 100 },
        { id: 'msg_500',      icon: '💌', name: '无话不谈',       desc: '累计发送 500 条消息',                check: (s) => s.msgCount >= 500 },
        { id: 'msg_1000',     icon: '📮', name: '字句成书',       desc: '累计发送 1000 条消息',               check: (s) => s.msgCount >= 1000 },

        { id: 'day_3',        icon: '🌱', name: '三天之约',       desc: '连续 3 天都有聊天',                  check: (s) => s.streakDays >= 3 },
        { id: 'day_7',        icon: '🌿', name: '一周伴侣',       desc: '连续 7 天都有聊天',                  check: (s) => s.streakDays >= 7 },
        { id: 'day_30',       icon: '🌸', name: '一个月',         desc: '连续 30 天都有聊天',                 check: (s) => s.streakDays >= 30 },
        { id: 'day_100',      icon: '💗', name: '百日纪念',       desc: '连续 100 天都有聊天',                check: (s) => s.streakDays >= 100 },

        { id: 'night_owl',    icon: '🦉', name: '凌晨三点',       desc: '在凌晨 3~5 点还在聊天',              check: (s) => s.hasLateNight },

        { id: 'intimacy_2',   icon: '🌿', name: '渐渐熟悉',       desc: '亲密度达到「熟悉」',                 check: (s) => s.intimacyPoints >= 100 },
        { id: 'intimacy_4',   icon: '💗', name: '亲密无间',       desc: '亲密度达到「亲密」',                 check: (s) => s.intimacyPoints >= 700 },
        { id: 'intimacy_6',   icon: '♾️', name: '灵魂伴侣',       desc: '亲密度达到「灵魂伴侣」',             check: (s) => s.intimacyPoints >= 3000 },

        { id: 'pet_hatch',    icon: '🐣', name: '新生命',         desc: '一起养的宠物破壳',                   check: (s) => s.petGrowth >= 30 },
        { id: 'pet_grown',    icon: '🐦', name: '羽翼丰满',       desc: '一起养的宠物成年',                   check: (s) => s.petGrowth >= 300 },

        { id: 'first_sticker', icon: '🖼️', name: '斗图开始',      desc: '第一次发图片或表情',                 check: (s) => s.hasImage },
        { id: 'first_voice',  icon: '🎤', name: '第一次语音',     desc: '第一次收到或发送语音',               check: (s) => s.hasVoice },
        { id: 'first_gift',   icon: '🎁', name: '第一次送礼',     desc: '第一次送礼物',                       check: (s) => s.hasGift },

        { id: 'anniversary',  icon: '📅', name: '纪念日',         desc: '添加第一个纪念日',                   check: (s) => s.hasAnniversary },
        { id: 'mood_record',  icon: '📖', name: '心晴手账',       desc: '第一次记录心情',                     check: (s) => s.hasMood },
        { id: 'letter_sent',  icon: '✉️', name: '寄出第一封信',   desc: '通过信封投递寄出一封信',             check: (s) => s.hasEnvelope },
        { id: 'divination',   icon: '🔮', name: '第一次占卜',     desc: '使用过塔罗或雷诺曼占卜',             check: (s) => s.hasDivination },

        { id: 'call_3',       icon: '📞', name: '煲电话粥',       desc: '累计通话超过 3 次',                  check: (s) => s.callCount >= 3 },
        { id: 'moment_post',  icon: '📷', name: '生活碎片',       desc: '在朋友圈发过动态',                   check: (s) => s.hasMoment }
    ];

    const KEY = 'achievements_v1';
    let unlocked = {};    // { id: timestamp }

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') unlocked = saved;
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), unlocked); } catch (e) {}
    }

    // 计算当前状态快照（用来判定成就）
    function gatherStats() {
        const s = {
            msgCount: 0,
            streakDays: 0,
            hasLateNight: false,
            intimacyPoints: 0,
            petGrowth: 0,
            hasImage: false,
            hasVoice: false,
            hasGift: false,
            hasAnniversary: false,
            hasMood: false,
            hasEnvelope: false,
            hasDivination: false,
            callCount: 0,
            hasMoment: false
        };

        try {
            // 消息数 + 图片/语音
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                s.msgCount = messages.length;
                messages.forEach(function (m) {
                    if (m.image) s.hasImage = true;
                    if (m.type === 'voice') s.hasVoice = true;
                    if (m.type === 'call-event') s.callCount++;
                    if (m.timestamp) {
                        const h = new Date(m.timestamp).getHours();
                        if (h >= 3 && h < 5) s.hasLateNight = true;
                    }
                });
            }

            // 连续天数（按每天至少一条消息算）
            if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                const days = new Set();
                messages.forEach(function (m) {
                    if (m.timestamp) {
                        const d = new Date(m.timestamp);
                        days.add(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
                    }
                });
                const today = new Date();
                let streak = 0;
                let cur = new Date(today);
                while (true) {
                    const key = cur.getFullYear() + '-' + (cur.getMonth() + 1) + '-' + cur.getDate();
                    if (days.has(key)) {
                        streak++;
                        cur.setDate(cur.getDate() - 1);
                    } else break;
                }
                s.streakDays = streak;
            }

            // 亲密度
            try {
                const el = document.querySelector('#intimacy-btn .intimacy-points');
                if (el) s.intimacyPoints = parseInt(el.textContent, 10) || 0;
            } catch (e) {}

            // 宠物成长值
            try {
                const petBtn = document.getElementById('pet-btn-icon');
                // 从 pet 的存储直接读
                localforage.getItem(getStorageKey('petData_v1')).then(function (d) {
                    if (d && typeof d.growth === 'number') s.petGrowth = d.growth;
                });
            } catch (e) {}

            // 礼物 / 纪念日 / 心情 / 信封 / 占卜 / 朋友圈
            try { s.hasGift = (JSON.parse(localStorage.getItem('shopPurchaseHistory') || '[]')).length > 0; } catch (e) {}
            try { if (typeof anniversaries !== 'undefined' && anniversaries.length > 0) s.hasAnniversary = true; } catch (e) {}
            try { if (Object.keys(window.moodData || {}).length > 0) s.hasMood = true; } catch (e) {}
            try { s.hasEnvelope = (JSON.parse(localStorage.getItem(getStorageKey('envelopeData')) || '{}').outbox || []).length > 0; } catch (e) {}
            try { s.hasDivination = (JSON.parse(localStorage.getItem('diviHistory_v1') || '[]')).length > 0; } catch (e) {}
            try { s.hasMoment = (JSON.parse(localStorage.getItem(getStorageKey('momentsData_v1')) || '{}').posts || []).length > 0; } catch (e) {}
        } catch (e) {
            console.warn('[achievements] gatherStats fail', e);
        }
        return s;
    }

    // 检查有没有新解锁的
    function checkUnlocks() {
        const stats = gatherStats();
        const newly = [];
        ACHIEVEMENTS.forEach(function (a) {
            if (unlocked[a.id]) return;
            try {
                if (a.check(stats)) {
                    unlocked[a.id] = Date.now();
                    newly.push(a);
                }
            } catch (e) {}
        });
        if (newly.length > 0) {
            save();
            // 依次弹卡片（错开 1.2 秒）
            newly.forEach(function (a, i) {
                setTimeout(function () { showUnlockCard(a); }, i * 1200);
            });
        }
    }

    // ========== 解锁卡片 ==================================================
    function showUnlockCard(a) {
        const old = document.getElementById('achievement-popup');
        if (old) old.remove();

        const el = document.createElement('div');
        el.id = 'achievement-popup';
        el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;animation:achFadeIn 0.4s ease;';

        el.innerHTML =
            '<div style="position:relative;text-align:center;padding:40px 30px;max-width:340px;">'
            +   '<div style="position:absolute;top:50%;left:50%;width:280px;height:280px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle, rgba(var(--accent-color-rgb),0.35) 0%, transparent 70%);animation:achGlow 2.5s ease-in-out infinite;pointer-events:none;"></div>'
            +   '<div style="position:relative;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:14px;">ACHIEVEMENT</div>'
            +   '<div style="position:relative;width:96px;height:96px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));border:2px solid rgba(var(--accent-color-rgb),0.5);display:flex;align-items:center;justify-content:center;font-size:48px;animation:achPop 1s cubic-bezier(0.34,1.56,0.64,1);">' + a.icon + '</div>'
            +   '<div style="position:relative;font-size:22px;font-weight:800;color:#fff;margin-bottom:8px;">' + a.name + '</div>'
            +   '<div style="position:relative;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.7;">' + a.desc + '</div>'
            +   '<button id="ach-close" style="position:relative;margin-top:26px;padding:10px 36px;border:1.5px solid rgba(255,255,255,0.25);border-radius:24px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);backdrop-filter:blur(8px);">好耶 ✦</button>'
            + '</div>';

        if (!document.getElementById('ach-anim-style')) {
            const s = document.createElement('style');
            s.id = 'ach-anim-style';
            s.textContent =
                '@keyframes achFadeIn{from{opacity:0}to{opacity:1}}' +
                '@keyframes achPop{0%{opacity:0;transform:scale(0.4)}60%{opacity:1;transform:scale(1.15)}100%{transform:scale(1)}}' +
                '@keyframes achGlow{0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}}';
            document.head.appendChild(s);
        }

        document.body.appendChild(el);
        const close = () => el.remove();
        el.querySelector('#ach-close').onclick = close;
        el.addEventListener('click', (e) => { if (e.target === el) close(); });

        if (typeof playSound === 'function') {
            try { playSound('favorite'); } catch (e) {}
        }
        setTimeout(function () { if (document.body.contains(el)) close(); }, 12000);
    }

    // ========== 总览面板 ==================================================
    window.openAchievementsPanel = function () {
        const old = document.getElementById('achievements-panel');
        if (old) old.remove();

        const total = ACHIEVEMENTS.length;
        const done = Object.keys(unlocked).length;

        const modal = document.createElement('div');
        modal.id = 'achievements-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        const listHTML = ACHIEVEMENTS.map(function (a) {
            const isDone = !!unlocked[a.id];
            return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:12px;margin-bottom:8px;' + (isDone ? '' : 'opacity:0.45;') + '">'
                +   '<div style="width:42px;height:42px;border-radius:12px;background:' + (isDone ? 'rgba(var(--accent-color-rgb),0.15)' : 'var(--border-color)') + ';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">' + (isDone ? a.icon : '🔒') + '</div>'
                +   '<div style="flex:1;min-width:0;">'
                +     '<div style="font-size:13.5px;font-weight:700;color:var(--text-primary);">' + a.name + '</div>'
                +     '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">' + a.desc + '</div>'
                +   '</div>'
                +   (isDone ? '<i class="fas fa-check-circle" style="color:var(--accent-color);font-size:14px;flex-shrink:0;"></i>' : '')
                + '</div>';
        }).join('');

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-trophy" style="color:var(--accent-color);margin-right:8px;"></i>恋爱成就</span>'
            +     '<button id="ach-panel-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.1), rgba(var(--accent-color-rgb),0.02));border-radius:14px;padding:14px;margin-bottom:14px;text-align:center;border:1px solid rgba(var(--accent-color-rgb),0.18);flex-shrink:0;">'
            +     '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:2px;">已解锁</div>'
            +     '<div style="font-size:28px;font-weight:800;color:var(--accent-color);font-family:Georgia,serif;margin-top:4px;">' + done + ' <span style="font-size:14px;opacity:0.6;">/ ' + total + '</span></div>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('#ach-panel-close').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    };

    // ========== 初始化 ==================================================
    window.initAchievements = function () {
        load().then(function () {
            // 首次检查延后 8 秒，等主数据都加载完
            setTimeout(checkUnlocks, 8000);
            // 之后每 60 秒检查一次
            setInterval(checkUnlocks, 60000);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initAchievements, 1500); });
    } else {
        setTimeout(window.initAchievements, 1500);
    }

    console.log('[achievements] 成就模块已加载 ✓');
})();