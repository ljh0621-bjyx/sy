document.addEventListener('DOMContentLoaded', async () => {
    const loaderBar = document.getElementById('loader-tech-bar');
    const welcomeSubtitle = document.querySelector('.welcome-subtitle-scramble');
    const welcomeScreen = document.getElementById('welcome-animation');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const acceptDisclaimerBtn = document.getElementById('accept-disclaimer');

    const updateLoader = (text, width) => {
        if (welcomeSubtitle) welcomeSubtitle.textContent = text;
        if (loaderBar) loaderBar.style.width = width;
    };

    const hideWelcomeScreen = () => {
        if (!welcomeScreen) return;
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
        }, 800);
    };

    const safeAwait = async (promise, fallback = null) => {
        try {
            return await promise;
        } catch (error) {
            console.error('操作失败:', error);
            return fallback;
        }
    };

    try {
        try { setupEventListeners?.(); } catch(e) { console.error('setupEventListeners:', e); }

        if (typeof localforage === 'undefined') {
            console.warn('LocalForage 未加载，将使用 localStorage 降级方案');
        }

        try {
            const emergencyBackupRaw = localStorage.getItem('BACKUP_V1_critical');
            if (emergencyBackupRaw) {
                const emergencyBackup = JSON.parse(emergencyBackupRaw);
                if (emergencyBackup && Array.isArray(emergencyBackup.messages) && emergencyBackup.messages.length > 0) {
                    console.warn('[boot] 检测到紧急备份，可用于异常恢复');
                }
            }
        } catch (e) {
            console.warn('[boot] 紧急备份检查失败:', e);
        }

        updateLoader('正在建立安全连接...', '10%');
        await safeAwait(initializeSession());

        updateLoader('正在读取记忆存档...', '40%');
        await safeAwait(loadData());

        updateLoader('正在渲染我们的世界...', '70%');
        
        await Promise.allSettled([
            safeAwait(initializeRandomUI?.()),
            safeAwait(initMusicPlayer?.())
        ]);

        setInterval(checkStatusChange, 60000);

        if (disclaimerModal) {
            const tourSeen = await safeAwait(localforage?.getItem(APP_PREFIX + 'tour_seen'), false);
            
            if (!tourSeen) {
                showModal(disclaimerModal);
                
                if (acceptDisclaimerBtn && !acceptDisclaimerBtn._bound) {
                    acceptDisclaimerBtn._bound = true;
                    acceptDisclaimerBtn.addEventListener('click', () => {
                        hideModal(disclaimerModal);
                        localforage?.setItem(APP_PREFIX + 'tour_seen', true).catch(() => {});
                        startTour?.();
                    }, { once: true });
                }
            }
        }

        updateLoader('连接成功，欢迎回来。', '100%');
        setTimeout(hideWelcomeScreen, 3500);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                try {
                    if (typeof saveTimeout !== 'undefined') clearTimeout(saveTimeout);
                } catch (e) {}
                try { _backupCriticalData(); } catch (e) { console.warn('[visibilitychange] 紧急备份失败:', e); }
                try {
                    const p = saveData();
                    if (p && typeof p.catch === 'function') {
                        p.catch(e => console.error('[visibilitychange] 保存失败:', e));
                    }
                } catch (e) {
                    console.error('[visibilitychange] 保存失败:', e);
                }
            } else if (document.visibilityState === 'visible') {
                try {
                    const backup = typeof _tryRecoverFromBackup === 'function' ? _tryRecoverFromBackup() : null;
                    if (backup && Array.isArray(backup.messages) && backup.messages.length > 0 && Array.isArray(messages) && backup.messages.length > messages.length) {
                        console.warn('[visibilitychange] 检测到备份消息比当前更多，自动尝试恢复');
                        try {
                            messages = backup.messages.map(m => ({
                                ...m,
                                timestamp: new Date(m.timestamp)
                            }));
                            if (backup.settings) Object.assign(settings, backup.settings);
                            if (typeof updateUI === 'function') updateUI();
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            showNotification('已自动恢复本地临时备份内容', 'warning', 3500);
                        } catch (restoreErr) {
                            console.warn('[visibilitychange] 自动恢复失败，保留当前页面内容:', restoreErr);
                        }
                    }
                } catch (e) {
                    console.warn('[visibilitychange] 恢复备份失败:', e);
                }
            }
        });

        window.addEventListener('pagehide', () => {
            try { _backupCriticalData(); } catch (e) {}
        });

        window.addEventListener('beforeunload', () => {
            try { _backupCriticalData(); } catch (e) {}
        });

        setInterval(() => {
            saveData().catch(e => console.warn('[autoBackup] 定时保存失败:', e));
        }, 3 * 60 * 1000);

        (() => {
            const REMIND_KEY = 'exportReminderLastShown';
            const last = parseInt(localStorage.getItem(REMIND_KEY) || '0', 10);
            const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
            if (daysSince >= 7) {
                setTimeout(() => {
                    showNotification('建议定期导出备份，防止数据意外丢失', 'info', 7000);
                    localStorage.setItem(REMIND_KEY, String(Date.now()));
                }, 8000);
            }
        })();

        setTimeout(async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        showNotification('已开启系统通知，收到消息时会提醒你', 'success', 3000);
                    }
                } catch(e) {
                    console.warn('通知权限请求失败:', e);
                }
            }
        }, 3000);

    } catch (err) {
        console.error('严重初始化错误:', err);
        try {
            const backup = typeof _tryRecoverFromBackup === 'function' ? _tryRecoverFromBackup() : null;
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                messages = backup.messages.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (typeof updateUI === 'function') updateUI();
                showNotification('初始化异常，已使用本地紧急备份恢复', 'warning', 5000);
            }
        } catch (recoverErr) {
            console.warn('[boot] 初始化失败后的恢复也失败:', recoverErr);
        }
        updateLoader('加载遇到问题，已强制进入...', '100%');
        setTimeout(hideWelcomeScreen, 3500);
    }
});
const stickerInput = document.getElementById('sticker-file-input');
            if (stickerInput) {
                stickerInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;

                    const oversized = files.filter(f => f.size > 2 * 1024 * 1024);
                    if (oversized.length > 0) {
                        showNotification(oversized.length + ' 张图片超过 2MB 限制，已跳过', 'warning');
                    }

                    const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024);
                    if (!validFiles.length) return;

                    showNotification('正在批量处理 ' + validFiles.length + ' 张图片...', 'info');

                    let successCount = 0;
                    let failCount = 0;

                    for (const file of validFiles) {
                        try {
                            const base64 = await optimizeImage(file, 300, 0.8);
                            stickerLibrary.push(base64);
                            successCount++;
                        } catch (err) {
                            console.error(err);
                            failCount++;
                        }
                    }

                    throttledSaveData();
                    renderReplyLibrary();

                    if (failCount > 0) {
                        showNotification('上传完成：' + successCount + ' 张成功，' + failCount + ' 张失败', 'warning');
                    } else {
                        showNotification('上传成功，共 ' + successCount + ' 张', 'success');
                    }

                    e.target.value = '';
                });
            }
const myStickerQuickUpload = document.getElementById('my-sticker-quick-upload');
if (myStickerQuickUpload) {
    myStickerQuickUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const oversized = files.filter(f => f.size > 2 * 1024 * 1024);
        if (oversized.length > 0) showNotification(oversized.length + ' 张图片超过 2MB，已跳过', 'warning');
        const validFiles = files.filter(f => f.size <= 2 * 1024 * 1024);
        if (!validFiles.length) return;
        showNotification('正在处理 ' + validFiles.length + ' 张...', 'info');
        let ok = 0, fail = 0;
        for (const file of validFiles) {
            try {
                const base64 = await optimizeImage(file, 300, 0.8);
                myStickerLibrary.push(base64);
                ok++;
            } catch(err) { fail++; }
        }
        throttledSaveData();
        if (typeof renderComboContent === 'function') renderComboContent('my-sticker');
        showNotification(fail > 0 ? `上传完成：${ok} 成功 ${fail} 失败` : `✓ 已添加 ${ok} 张到我的表情库`, fail > 0 ? 'warning' : 'success');
        e.target.value = '';
    });
}

window.addEventListener('load', function() {
    setTimeout(function() {
        try {
            if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;
            try { if (typeof checkPartnerDailyMood === 'function') checkPartnerDailyMood(); } catch(e2) { console.warn('checkPartnerDailyMood error:', e2); }
            if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
            if (window.localforage && window.APP_PREFIX) {
                localforage.getItem(window.APP_PREFIX + 'tour_seen').then(function(seen) {
                    if (seen) {
                        var modal = document.getElementById('daily-greeting-modal');
                        if (modal) modal.classList.remove('hidden');
                        localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                    }
                }).catch(function() {
                    var modal = document.getElementById('daily-greeting-modal');
                    if (modal) modal.classList.remove('hidden');
                    localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                });
            } else {
                var modal = document.getElementById('daily-greeting-modal');
                if (modal) modal.classList.remove('hidden');
                localStorage.setItem('dailyGreetingShown', new Date().toDateString());
            }
        } catch(e) { console.warn('Daily greeting timing error:', e); }
    }, 4500);
}, { once: true });
/* ===== 对方实时打字演示 ===== */
(function initPartnerTypingFloat() {
    const floatEl = document.getElementById('partner-typing-float');
    const partnerNameEl = document.getElementById('ptf-partner-name');
    const pinyinTextEl = document.getElementById('ptf-pinyin-text');
    const candidatesEl = document.getElementById('ptf-candidates');
    const closeBtn = document.getElementById('ptf-close-btn');
    const replayBtn = document.getElementById('ptf-replay-btn');
    const cancelBtn = document.getElementById('ptf-cancel-btn');
    const speedSlider = document.getElementById('ptf-speed-slider');

    if (!floatEl) return;

    const pinyinMap = {
        'ren': ['人', '忍', '认', '任'],
        'jia': ['家', '佳', '加', '嘉'],
        'ye': ['也', '业', '夜', '叶'],
        'bu': ['不', '部', '步', '布'],
        'rong': ['容', '荣', '融', '绒'],
        'yi': ['易', '意', '义', '衣'],
        'wo': ['我', '窝', '握', '沃'],
        'ni': ['你', '呢', '泥', '尼'],
        'ta': ['他', '她', '它', '踏'],
        'de': ['的', '得', '地', '德'],
        'shi': ['是', '事', '时', '世'],
        'le': ['了', '乐', '勒'],
        'zai': ['在', '再', '载', '灾'],
        'you': ['有', '又', '友', '右'],
        'mei': ['没', '美', '每', '妹'],
        'hao': ['好', '号', '浩', '豪'],
        'xiang': ['想', '像', '相', '向'],
        'ai': ['爱', '哎', '唉', '艾'],
        'hui': ['会', '回', '汇', '惠'],
        'yong': ['用', '永', '勇', '涌'],
        'yuan': ['远', '愿', '原', '圆'],
        'li': ['离', '里', '力', '立'],
        'ju': ['距', '局', '句', '举'],
        'neng': ['能', '嫩'],
        'ke': ['可', '克', '客', '刻'],
        'fu': ['服', '父', '负', '富'],
        'xie': ['谢', '些', '写', '协'],
        'jian': ['见', '间', '件', '建'],
        'mian': ['面', '免', '棉', '眠'],
        'shuo': ['说', '硕', '朔'],
        'hua': ['话', '花', '华', '化'],
        'ting': ['听', '停', '厅', '庭'],
        'kan': ['看', '刊', '堪', '砍'],
        'zou': ['走', '奏', '揍'],
        'lai': ['来', '赖', '莱'],
        'qu': ['去', '取', '区', '曲'],
        'zhi': ['知', '只', '直', '之'],
        'dao': ['到', '道', '倒', '刀'],
        'hen': ['很', '狠', '恨', '痕'],
        'duo': ['多', '朵', '躲', '夺'],
        'shao': ['少', '绍', '哨'],
        'shen': ['什', '深', '身', '神'],
        'me': ['么', '麽'],
        'zen': ['怎'],
        'yang': ['样', '阳', '养', '洋'],
        'wei': ['为', '未', '位', '味'],
        'sui': ['虽', '随', '岁', '碎'],
        'ran': ['然', '染', '燃', '冉'],
        'dan': ['但', '单', '担', '淡'],
        'guo': ['过', '国', '果', '锅'],
        'ming': ['明', '名', '命', '鸣'],
        'tian': ['天', '甜', '填', '田'],
        'qi': ['起', '期', '其', '气'],
        'xi': ['喜', '系', '西', '细'],
        'huan': ['欢', '环', '换', '缓']
    };

    function textToPinyin(text) {
        const result = [];
        for (const ch of text) {
            let found = null;
            for (const [py, chars] of Object.entries(pinyinMap)) {
                if (chars.includes(ch)) { found = py; break; }
            }
            result.push(found || ch);
        }
        return result;
    }

    function buildCandidates(pinyinArr) {
        return pinyinArr.map(py => {
            const chars = pinyinMap[py];
            if (chars) return chars;
            return [py];
        });
    }

    let currentTimer = null;
    let currentText = '';
    let cancelled = false;

    function stopAnimation() {
        cancelled = true;
        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }
        floatEl.style.display = 'none';
    }

    async function playTypingAnimation(text) {
        cancelled = false;
        currentText = text;

// === 新版：调用实时动作悬浮窗（拼音组句 + 选表情包） ===
if (typeof window.simulatePartnerTypingProcess === 'function') {
    // 随机决定是否要模拟挑选表情包（35% 概率）
    const shouldPickSticker = Math.random() < 0.35;
    let stickerSrc = null;
    if (shouldPickSticker && typeof stickerLibrary !== 'undefined' && stickerLibrary.length > 0) {
        stickerSrc = stickerLibrary[Math.floor(Math.random() * stickerLibrary.length)];
    }


    // 真正等待浮窗里的拼音组句动画播放完毕
await window.simulatePartnerTypingProcess(text, stickerSrc);

    // 发送消息（保持原有逻辑）
    addMessage({
        id: Date.now(),
        sender: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方',
        text: text,
        timestamp: new Date(),
        status: 'received',
        type: 'normal'
    });

    if (typeof playSound === 'function') playSound('message');
    if (typeof window._sendPartnerNotification === 'function') {
        window._sendPartnerNotification((typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方', text);
    }
    return;
}

// === 降级备用（如果浮窗模块没加载成功，走原来的逻辑） ===
const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
const partnerNameEl = document.getElementById('ptf-partner-name');
if (partnerNameEl) partnerNameEl.textContent = partnerName;

const pinyinArr = textToPinyin(text);
const candidatesList = buildCandidates(pinyinArr);
const pinyinTextEl = document.getElementById('ptf-pinyin-text');
const candidatesEl = document.getElementById('ptf-candidates');
const floatEl = document.getElementById('partner-typing-float');

if (!floatEl) {
    // 如果旧版容器已被删除，直接发送消息
    addMessage({ id: Date.now(), sender: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方', text: text, timestamp: new Date(), status: 'received', type: 'normal' });
    return;
}

pinyinTextEl.textContent = '';
candidatesEl.innerHTML = '';
floatEl.style.display = 'block';

const speedSlider = document.getElementById('ptf-speed-slider');
const speedVal = speedSlider ? parseInt(speedSlider.value, 10) : 50;
const perCharDelay = Math.max(60, 500 - (speedVal / 100) * 440);

for (let i = 0; i < pinyinArr.length; i++) {
    if (cancelled) return;
    const py = pinyinArr[i];

    for (let j = 0; j < py.length; j++) {
        if (cancelled) return;
        pinyinTextEl.textContent += py[j];
        await sleep(perCharDelay * 0.4);
    }

    await sleep(perCharDelay * 0.5);
    if (i < pinyinArr.length - 1) {
        pinyinTextEl.textContent += ' ';
    }

    if (candidatesList[i]) {
        candidatesEl.innerHTML = candidatesList[i].map((ch, k) =>
            `<span class="ptf-candidate" style="animation-delay:${k * 50}ms">${ch}</span>`
        ).join('');
    }

    await sleep(perCharDelay * 0.8);

    if (candidatesList[i] && candidatesList[i].length > 0) {
        const first = candidatesEl.querySelector('.ptf-candidate');
        if (first) first.classList.add('ptf-picked');
        await sleep(perCharDelay * 0.6);
    }
}

if (cancelled) return;
await sleep(500);
if (cancelled) return;

floatEl.style.display = 'none';

        addMessage({
            id: Date.now(),
            sender: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方',
            text: text,
            timestamp: new Date(),
            status: 'received',
            type: 'normal'
        });

        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification((typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方', text);
        }
    }

    function sleep(ms) {
        return new Promise(resolve => {
            currentTimer = setTimeout(resolve, ms);
        });
    }


    if (closeBtn) closeBtn.addEventListener('click', stopAnimation);
    if (cancelBtn) cancelBtn.addEventListener('click', stopAnimation);
    if (replayBtn) replayBtn.addEventListener('click', () => {
        if (currentText) playTypingAnimation(currentText);
    });
})();