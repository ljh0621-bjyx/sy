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

    console.log('[pet] 宠物模块已加载 ✓');
})();