/* ============================================================
 * pet.js - 一起养宠物
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('petData_v1');

    const STAGES = [
        { name: '蛋',     icon: '🥚', minGrowth: 0,   desc: '安静地躺着，里面好像有什么在动…' },
        { name: '幼体',   icon: '🐣', minGrowth: 30,  desc: '刚破壳，眼睛还睁不太开' },
        { name: '成长中', icon: '🐥', minGrowth: 120, desc: '活泼好动，喜欢跟在你们身后' },
        { name: '成年',   icon: '🐦', minGrowth: 300, desc: '羽翼丰满，会主动蹭你们的脚' }
    ];

    let data = {
        name: '小梦',
        hunger: 70,     // 0~100
        clean: 70,      // 0~100
        mood: 70,       // 0~100
        growth: 0,
        stageIndex: 0,
        lastTickDate: null,
        todayFeedCount: 0,
        bornAt: Date.now()
    };

    async function load() {
        try {
            const saved = await localforage.getItem(KEY);
            if (saved) Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }

    function getStage() {
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (data.growth >= STAGES[i].minGrowth) return STAGES[i];
        }
        return STAGES[0];
    }
    function getStageIndex() {
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (data.growth >= STAGES[i].minGrowth) return i;
        }
        return 0;
    }

    // 每天刷新状态（比如一天没照顾，会掉状态）
    function resetTodayIfNeeded() {
        const today = new Date().toDateString();
        if (data.lastTickDate !== today) {
            // 隔天状态衰减
            if (data.lastTickDate) {
                const days = Math.max(1, Math.round((Date.now() - new Date(data.lastTickDate).getTime()) / 86400000));
                if (days >= 2) {
                    data.hunger = Math.max(10, data.hunger - 20);
                    data.clean  = Math.max(10, data.clean  - 20);
                    data.mood   = Math.max(10, data.mood   - 20);
                }
            }
            data.lastTickDate = today;
            data.todayFeedCount = 0;
            save();
        }
    }

    // 根据当前状态算今天的成长值
    function tickGrowth() {
        const avg = (data.hunger + data.clean + data.mood) / 3;
        if (avg >= 60) {
            data.growth = Math.min(9999, data.growth + 1);
        }
    }

    function updateUI() {
        const el = document.getElementById('pet-btn-icon');
        if (!el) return;
        const stage = getStage();
        el.textContent = stage.icon;
    }

    window.initPet = function () {
        load().then(function () {
            resetTodayIfNeeded();
            // 每 30 秒 tick 一次
            setInterval(function () {
                resetTodayIfNeeded();
                tickGrowth();
                save();
                updateUI();
            }, 30000);
            updateUI();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initPet, 1500); });
    } else {
        setTimeout(window.initPet, 1500);
    }

// ========== 宠物面板 ==========
window.openPetPanel = function () {
    const old = document.getElementById('pet-panel');
    if (old) old.remove();

    resetTodayIfNeeded();
    const stage = getStage();
    const stageIdx = getStageIndex();

    const modal = document.createElement('div');
    modal.id = 'pet-panel';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

    modal.innerHTML =
        '<div style="background:var(--secondary-bg);border-radius:24px;padding:22px 20px;width:92%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'

        +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
        +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-paw" style="color:var(--accent-color);margin-right:8px;"></i>一起养的小家伙</span>'
        +     '<button id="pet-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
        +   '</div>'

        // 宠物展示区
        +   '<div style="position:relative;background:linear-gradient(160deg, rgba(var(--accent-color-rgb),0.1), rgba(var(--accent-color-rgb),0.02));border-radius:20px;padding:26px 16px 20px;text-align:center;margin-bottom:16px;overflow:hidden;">'
        +     '<div style="font-size:72px;line-height:1;margin-bottom:10px;animation:petFloat 3s ease-in-out infinite;">' + stage.icon + '</div>'
        +     '<div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:8px;">' + data.name + '<button id="pet-rename" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:12px;padding:2px 4px;opacity:0.6;"><i class="fas fa-pen"></i></button></div>'
        +     '<div style="font-size:11px;color:var(--text-secondary);letter-spacing:1px;margin-bottom:10px;">' + stage.name + ' · 成长值 ' + data.growth + '</div>'
        +     '<div style="font-size:12px;color:var(--text-secondary);opacity:0.8;line-height:1.7;padding:0 10px;">' + stage.desc + '</div>'
        +   '</div>'

        // 三个状态条
        +   '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">'
        +     buildStatBar('🍖', '饱食', data.hunger, '#FF9A8B')
        +     buildStatBar('🛁', '清洁', data.clean, '#7FA6CD')
        +     buildStatBar('💕', '心情', data.mood, '#F4A6B3')
        +   '</div>'

        // 操作按钮
        +   '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">'
        +     buildActionBtn('pet-feed',  '🍖', '喂食')
        +     buildActionBtn('pet-clean', '🛁', '洗澡')
        +     buildActionBtn('pet-play',  '🎾', '陪玩')
        +   '</div>'

        // 底部提示
        +   '<div style="font-size:11px;color:var(--text-secondary);opacity:0.65;line-height:1.7;text-align:center;padding:8px 4px;">'
        +     '每天照顾它，它就会慢慢长大<br>对方也会偷偷来帮你照顾哦'
        +   '</div>'

        + '</div>';

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#pet-close').onclick = close;
    
modal.querySelector('#pet-rename').onclick = function () {
    const newName = prompt('给它起个新名字：', data.name);
    if (!newName || !newName.trim()) return;
    data.name = newName.trim().slice(0, 12);
    save();
    modal.remove();
    setTimeout(window.openPetPanel, 100);
    if (typeof showNotification === 'function') {
        showNotification('✓ 已改名为「' + data.name + '」', 'success', 1500);
    }
};
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // 绑定操作按钮
    modal.querySelector('#pet-feed').onclick = () => doPetAction('feed');
    modal.querySelector('#pet-clean').onclick = () => doPetAction('clean');
    modal.querySelector('#pet-play').onclick = () => doPetAction('play');
};

function buildStatBar(icon, label, value, color) {
    const pct = Math.max(0, Math.min(100, value));
    return '<div style="display:flex;align-items:center;gap:10px;">'
        +   '<span style="font-size:16px;width:20px;text-align:center;">' + icon + '</span>'
        +   '<span style="font-size:11.5px;color:var(--text-secondary);width:34px;">' + label + '</span>'
        +   '<div style="flex:1;height:8px;background:var(--border-color);border-radius:4px;overflow:hidden;">'
        +     '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:4px;transition:width 0.5s ease;"></div>'
        +   '</div>'
        +   '<span style="font-size:11px;color:var(--text-secondary);width:30px;text-align:right;">' + Math.round(pct) + '</span>'
        + '</div>';
}

function buildActionBtn(id, icon, label) {
    return '<button id="' + id + '" style="padding:12px 4px;border:1.5px solid var(--border-color);border-radius:14px;background:var(--primary-bg);color:var(--text-primary);cursor:pointer;font-family:var(--font-family);display:flex;flex-direction:column;align-items:center;gap:4px;transition:all 0.2s;">'
        +   '<span style="font-size:20px;">' + icon + '</span>'
        +   '<span style="font-size:11px;font-weight:600;">' + label + '</span>'
        + '</button>';
}

// 执行动作（第 4 步会用到，现在先占位）
function doPetAction(type) {
    if (type === 'feed') {
        data.hunger = Math.min(100, data.hunger + 15);
    } else if (type === 'clean') {
        data.clean = Math.min(100, data.clean + 15);
    } else if (type === 'play') {
        data.mood = Math.min(100, data.mood + 15);
    }
    save();
    if (typeof showNotification === 'function') {
        const labels = { feed: '🍖 喂食成功', clean: '🛁 洗干净啦', play: '🎾 玩得好开心' };
        showNotification(labels[type] || '完成', 'success', 1200);
    }
    // 重开面板刷新
    document.getElementById('pet-panel')?.remove();
    setTimeout(window.openPetPanel, 100);
}

// 浮动动画
(function injectPetStyle() {
    if (document.getElementById('pet-anim-style')) return;
    const s = document.createElement('style');
    s.id = 'pet-anim-style';
    s.textContent = '@keyframes petFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}';
    document.head.appendChild(s);
})();
    console.log('[pet] 宠物模块已加载 ✓');
})();