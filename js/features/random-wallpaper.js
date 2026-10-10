/* ============================================================
 * random-wallpaper.js - 随机壁纸（完整版）
 * 每次打开随机换 + 对方按概率帮你换
 * ============================================================ */
(function () {
    'use strict';

    const KEY = getStorageKey('randomWallpaperSettings_v1');
    let settingsRW = {
        onOpenEnabled: true,        // 每次打开随机换
        partnerEnabled: true,        // 对方换
        partnerChance: 20,           // 对方换的概率 %
        partnerIntervalMin: 30,      // 最短间隔（分钟）
        partnerIntervalMax: 90       // 最长间隔（分钟）
    };

    let _partnerSwapStarted = false;

    async function load() {
        try {
            const s = await localforage.getItem(KEY);
            if (s && typeof s === 'object') Object.assign(settingsRW, s);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, settingsRW); } catch (e) {}
    }
    load();

    // ========== 获取所有背景图（只取图片类型的） ==========
    function getImageBackgrounds() {
        try {
            if (typeof savedBackgrounds === 'undefined' || !Array.isArray(savedBackgrounds)) return [];
            return savedBackgrounds.filter(function (bg) {
                return bg && bg.type === 'image' && bg.value;
            });
        } catch (e) { return []; }
    }

    // ========== 随机应用一张背景 ==========
    function applyRandomBackground(silent) {
        const list = getImageBackgrounds();
        if (list.length === 0) {
            if (!silent && typeof showNotification === 'function') {
                showNotification('还没有背景图，先去外观设置里上传几张', 'warning', 3000);
            }
            return null;
        }

        // 避免连续重复
        let cur = null;
        try {
            cur = (typeof safeGetItem === 'function') ? safeGetItem(getStorageKey('chatBackground')) : null;
        } catch (e) {}
        let candidates = list;
        if (list.length > 1 && cur) {
            candidates = list.filter(function (bg) { return bg.value !== cur; });
            if (candidates.length === 0) candidates = list;
        }

        const picked = candidates[Math.floor(Math.random() * candidates.length)];

        // 应用背景
        if (typeof applyBackground === 'function') {
            applyBackground(picked.value);
        }
        if (typeof safeSetItem === 'function') {
            safeSetItem(getStorageKey('chatBackground'), picked.value);
        }
        try {
            localforage.setItem(getStorageKey('chatBackground'), picked.value);
        } catch (e) {}

        // 刷新背景图库面板（如果开着）
        if (typeof renderBackgroundGallery === 'function') {
            try { renderBackgroundGallery(); } catch (e) {}
        }

        return picked;
    }

    // 手动换一张
    window.applyRandomWallpaperNow = function () {
        const picked = applyRandomBackground(false);
        if (picked && typeof showNotification === 'function') {
            showNotification('🎲 已随机切换壁纸', 'success', 1800);
        }
    };

    // ========== 每次打开随机换 ==========
    function onOpenRandomSwap() {
        if (!settingsRW.onOpenEnabled) return;
        setTimeout(function () {
            applyRandomBackground(true);
        }, 800);
    }

    // ========== 对方帮换 ==========
    function partnerSwap() {
        if (_partnerSwapStarted) return;
        _partnerSwapStarted = true;
        loopPartnerSwap();
    }

    function loopPartnerSwap() {
        if (!settingsRW.partnerEnabled) {
            // 关闭时，60 秒后再检查一次
            setTimeout(loopPartnerSwap, 60 * 1000);
            return;
        }

        const minMs = settingsRW.partnerIntervalMin * 60 * 1000;
        const maxMs = settingsRW.partnerIntervalMax * 60 * 1000;
        const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);

        setTimeout(function () {
            try {
                if (settingsRW.partnerEnabled && Math.random() * 100 < settingsRW.partnerChance) {
                    const picked = applyRandomBackground(true);
                    if (picked) {
                        const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

                        // ✅ 灰字系统消息
                        if (typeof addMessage === 'function') {
                            addMessage({
                                id: Date.now() + Math.random(),
                                sender: null,
                                text: pn + ' 帮你换了张新壁纸',
                                timestamp: new Date(),
                                type: 'system'
                            });
                        }

                        // 音效
                        if (typeof playSound === 'function') playSound('favorite');
                    }
                }
            } catch (e) {
                console.warn('[random-wallpaper] partner swap fail', e);
            }
            loopPartnerSwap();
        }, delay);
    }

    // ========== 设置面板 ==========
    window.openRandomWallpaperSettings = function () {
        const old = document.getElementById('random-wallpaper-panel');
        if (old) old.remove();

        const list = getImageBackgrounds();

        const modal = document.createElement('div');
        modal.id = 'random-wallpaper-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:22px;padding:24px;width:92%;max-width:400px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.12);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-image" style="color:var(--accent-color);font-size:15px;"></i>
                        </div>
                        <span style="font-size:16px;font-weight:700;color:var(--text-primary);">随机壁纸设置</span>
                    </div>
                    <button id="rw-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>

                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
                    图库取用 <b style="color:var(--accent-color);">聊天背景</b> 里上传的图片（共 ${list.length} 张）
                </div>

                <!-- 每次打开随机换 -->
                <div id="rw-onopen-row" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;cursor:pointer;">
                    <div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fas fa-sync-alt" style="font-size:15px;color:var(--accent-color);"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:600;color:var(--text-primary);">每次打开随机换</div>
                        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="rw-onopen-status">${settingsRW.onOpenEnabled ? '已开启 — 每次打开随机一张' : '已关闭'}</div>
                    </div>
                    <div id="rw-onopen-pill" style="width:44px;height:24px;border-radius:24px;background:${settingsRW.onOpenEnabled ? 'var(--accent-color)' : 'var(--border-color)'};position:relative;transition:background 0.3s;flex-shrink:0;">
                        <div id="rw-onopen-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;${settingsRW.onOpenEnabled ? 'right:3px' : 'left:3px'};transition:all 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
                    </div>
                </div>

                <!-- 对方帮换 -->
                <div id="rw-partner-row" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;cursor:pointer;">
                    <div style="width:36px;height:36px;border-radius:11px;background:rgba(var(--accent-color-rgb),0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fas fa-heart" style="font-size:15px;color:#ff6b6b;"></i>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:13px;font-weight:600;color:var(--text-primary);">对方帮我换</div>
                        <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;" id="rw-partner-status">${settingsRW.partnerEnabled ? '已开启 — 偶尔会帮你换一张' : '已关闭'}</div>
                    </div>
                    <div id="rw-partner-pill" style="width:44px;height:24px;border-radius:24px;background:${settingsRW.partnerEnabled ? 'var(--accent-color)' : 'var(--border-color)'};position:relative;transition:background 0.3s;flex-shrink:0;">
                        <div id="rw-partner-knob" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;${settingsRW.partnerEnabled ? 'right:3px' : 'left:3px'};transition:all 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
                    </div>
                </div>

                <!-- 概率 -->
                <div id="rw-chance-section" style="padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;${settingsRW.partnerEnabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                    <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">🎯 对方换壁纸的概率</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <input type="range" id="rw-chance-slider" min="0" max="100" step="1" value="${settingsRW.partnerChance}" style="flex:1;accent-color:var(--accent-color);">
                        <span id="rw-chance-val" style="font-size:14px;font-weight:700;color:var(--accent-color);width:48px;text-align:right;">${settingsRW.partnerChance}%</span>
                    </div>
                </div>

                <!-- 间隔 -->
                <div id="rw-interval-section" style="padding:14px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:14px;margin-bottom:10px;${settingsRW.partnerEnabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                    <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:10px;">⏱ 检查间隔（分钟）</div>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <span style="font-size:12px;color:var(--text-secondary);width:44px;">最短</span>
                        <input type="range" id="rw-min-slider" min="1" max="240" step="1" value="${settingsRW.partnerIntervalMin}" style="flex:1;accent-color:var(--accent-color);">
                        <span id="rw-min-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:64px;text-align:right;">${settingsRW.partnerIntervalMin}分钟</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:12px;color:var(--text-secondary);width:44px;">最长</span>
                        <input type="range" id="rw-max-slider" min="1" max="480" step="1" value="${settingsRW.partnerIntervalMax}" style="flex:1;accent-color:var(--accent-color);">
                        <span id="rw-max-val" style="font-size:13px;font-weight:700;color:var(--accent-color);width:64px;text-align:right;">${settingsRW.partnerIntervalMax}分钟</span>
                    </div>
                </div>

                <!-- 立即换一张 -->
                <button id="rw-swap-now" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);margin-bottom:10px;">
                    <i class="fas fa-random"></i> 立即随机换一张
                </button>

                <div style="display:flex;gap:10px;">
                    <button id="rw-cancel" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">关闭</button>
                    <button id="rw-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存设置</button>
                </div>
            </div>`;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#rw-close').onclick = close;
        modal.querySelector('#rw-cancel').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // 开关：每次打开
        let onOpenState = settingsRW.onOpenEnabled;
        modal.querySelector('#rw-onopen-row').onclick = () => {
            onOpenState = !onOpenState;
            const pill = modal.querySelector('#rw-onopen-pill');
            const knob = modal.querySelector('#rw-onopen-knob');
            const status = modal.querySelector('#rw-onopen-status');
            pill.style.background = onOpenState ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = onOpenState ? '3px' : 'auto';
            knob.style.left = onOpenState ? 'auto' : '3px';
            status.textContent = onOpenState ? '已开启 — 每次打开随机一张' : '已关闭';
        };

        // 开关：对方换
        let partnerState = settingsRW.partnerEnabled;
        const updateChanceSectionState = () => {
            const chanceSec = modal.querySelector('#rw-chance-section');
            const intSec = modal.querySelector('#rw-interval-section');
            chanceSec.style.opacity = partnerState ? '1' : '0.45';
            chanceSec.style.pointerEvents = partnerState ? 'auto' : 'none';
            intSec.style.opacity = partnerState ? '1' : '0.45';
            intSec.style.pointerEvents = partnerState ? 'auto' : 'none';
        };
        modal.querySelector('#rw-partner-row').onclick = () => {
            partnerState = !partnerState;
            const pill = modal.querySelector('#rw-partner-pill');
            const knob = modal.querySelector('#rw-partner-knob');
            const status = modal.querySelector('#rw-partner-status');
            pill.style.background = partnerState ? 'var(--accent-color)' : 'var(--border-color)';
            knob.style.right = partnerState ? '3px' : 'auto';
            knob.style.left = partnerState ? 'auto' : '3px';
            status.textContent = partnerState ? '已开启 — 偶尔会帮你换一张' : '已关闭';
            updateChanceSectionState();
        };

        // 滑块联动
        const chanceSlider = modal.querySelector('#rw-chance-slider');
        const chanceVal = modal.querySelector('#rw-chance-val');
        chanceSlider.oninput = () => { chanceVal.textContent = chanceSlider.value + '%'; };

        const minSlider = modal.querySelector('#rw-min-slider');
        const minVal = modal.querySelector('#rw-min-val');
        const maxSlider = modal.querySelector('#rw-max-slider');
        const maxVal = modal.querySelector('#rw-max-val');
        minSlider.oninput = () => {
            minVal.textContent = minSlider.value + '分钟';
            if (parseInt(minSlider.value) > parseInt(maxSlider.value)) {
                maxSlider.value = minSlider.value;
                maxVal.textContent = minSlider.value + '分钟';
            }
        };
        maxSlider.oninput = () => {
            maxVal.textContent = maxSlider.value + '分钟';
            if (parseInt(maxSlider.value) < parseInt(minSlider.value)) {
                minSlider.value = maxSlider.value;
                minVal.textContent = maxSlider.value + '分钟';
            }
        };

        // 立即换一张
        modal.querySelector('#rw-swap-now').onclick = () => {
            window.applyRandomWallpaperNow();
        };

        // 保存
        modal.querySelector('#rw-save').onclick = async () => {
            settingsRW.onOpenEnabled = onOpenState;
            settingsRW.partnerEnabled = partnerState;
            settingsRW.partnerChance = parseInt(chanceSlider.value, 10);
            settingsRW.partnerIntervalMin = parseInt(minSlider.value, 10);
            settingsRW.partnerIntervalMax = parseInt(maxSlider.value, 10);
            await save();
            close();
            if (typeof showNotification === 'function') {
                showNotification('✓ 随机壁纸设置已保存', 'success', 1800);
            }
        };
    };

    // ========== 初始化 ==========
    window.initRandomWallpaper = function () {
        // 每次打开随机换
        setTimeout(onOpenRandomSwap, 2000);

        // 启动对方换的循环
        partnerSwap();

        // 挂入口按钮
        const btn = document.getElementById('random-wallpaper-function');
        if (btn && !btn.dataset.initialized) {
            btn.dataset.initialized = 'true';
            btn.addEventListener('click', () => {
                const adv = document.getElementById('advanced-modal');
                if (adv && typeof hideModal === 'function') hideModal(adv);
                window.openRandomWallpaperSettings();
            });
        }
    };

})();