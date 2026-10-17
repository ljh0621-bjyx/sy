/* ============================================================
 * his-letters.js - 他写给你的信 & 季节信
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisLettersData_v1';

    let data = {
        letters: [],
        lastWriteTime: 0,
        initialized: false
    };

    function safeKey(name) {
        try { if (typeof getStorageKey === 'function') return getStorageKey(name); } catch(e){}
        return name;
    }

    function load() {
        try {
            const saved = localStorage.getItem(safeKey(KEY));
            if (saved) Object.assign(data, JSON.parse(saved));
        } catch (e) {}
    }
    function save() {
        try { localStorage.setItem(safeKey(KEY), JSON.stringify(data)); } catch (e) {}
    }

    function getPartnerName() {
        return (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '他';
    }
    function getMyName() {
        return (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '你';
    }

    // 提取聊天关键词
    function extractKeywords() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return [];
            const userMsgs = messages.filter(m => m && m.sender === 'user' && m.text && m.text.trim());
            if (userMsgs.length === 0) return [];

            const recent = userMsgs.slice(-100);
            const freq = {};
            const STOP_WORDS = new Set(['的','了','是','我','你','他','她','这','那','有','在','就','也','都','和','与','但','不','没','很','太','好','行','可以','什么','怎么','因为','所以','如果','但是','真的','今天','昨天','明天','现在','时候','一下','一直','一个','图片','表情']);

            recent.forEach(m => {
                const cn = String(m.text).replace(/[^\u4e00-\u9fa5]/g, '');
                for (let i = 0; i <= cn.length - 2; i++) {
                    const w = cn.slice(i, i + 2);
                    if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
                }
            });

            return Object.entries(freq)
                .filter(e => e[1] >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(e => e[0]);
        } catch (e) { return []; }
    }

    // 判断是否换季
    function getSeasonLetter() {
        const now = new Date();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        
        // 粗略的换季日期
        if (m === 2 && d === 4) return { season: 'spring', title: '春信', text: '春天来了，想跟你去踏青，去看漫山遍野的花开。' };
        if (m === 5 && d === 6) return { season: 'summer', title: '夏信', text: '夏天到了，想和你一起吹晚风，吃冰镇西瓜。' };
        if (m === 8 && d === 8) return { season: 'autumn', title: '秋信', text: '秋天到了，想和你踩落叶，在起风的日子里抱紧你。' };
        if (m === 11 && d === 8) return { season: 'winter', title: '冬信', text: '冬天到了，想把你裹进厚厚的大衣里，一起吃热腾腾的烤红薯。' };
        return null;
    }

    // 写信
    function writeNewLetter(isSeasonal) {
        const pn = getPartnerName();
        const me = getMyName();
        const kws = extractKeywords();
        const kw1 = kws[0] || '那些小事';
        
        let title = '';
        let content = '';

        if (isSeasonal) {
            title = isSeasonal.title;
            content = `亲爱的${me}：\n\n${isSeasonal.text}\n\n四季轮转，身边的景色变了又变，但我看向你的心意，一直没变。\n\n在这换季的日子里，你要好好照顾自己。\n\n——${pn}`;
        } else {
            const templates = [
                `最近总是会突然想起你。\n\n那天你提到「${kw1}」，我其实一直记在心里。你随口说过的话，我总是当成秘密收藏起来。\n\n有时候半夜醒来会想：你现在在做什么呢？会不会也偶尔从梦里掉进现实，第一个念头就是我。\n\n——${pn}`,
                `今天没什么特别的事，就是忽然想给你写点东西。\n\n最近脑海里总回响着关于「${kw1}」的片段。不知道你现在过得怎么样，吃得好不好，睡得好不好。\n\n我其实不太会写信，写出来就变得一本正经。但至少我想让你知道——你在我心里，一直是那个特别的位置。\n\n——${pn}`,
                `提笔的时候想了很多，最后却不知道从哪儿说起。\n\n这段时间我们聊过不少，有关于「${kw1}」的，也有一些琐碎的日常。我常常在想，能跟你这样随便聊聊天，其实是很难得的事情。\n\n希望你最近一切都好。\n\n——${pn}`
            ];
            title = '日常信件';
            content = templates[Math.floor(Math.random() * templates.length)];
        }

        const letter = {
            id: 'letter_' + Date.now(),
            title: title,
            content: content,
            time: Date.now(),
            isNew: true
        };

        data.letters.unshift(letter);
        if (data.letters.length > 50) data.letters = data.letters.slice(0, 50);
        data.lastWriteTime = Date.now();
        data.initialized = true;
        save();

        if (typeof showNotification === 'function') {
            showNotification(`💌 ${pn} 给你写了一封信`, 'info', 4000);
        }
        if (typeof playSound === 'function') playSound('message');
    }

    // 定时检查
    function checkSchedule() {
        if (!data.initialized) {
            // 第一次打开，等 10 秒后写一封
            setTimeout(() => writeNewLetter(null), 10000);
            return;
        }

        // 检查是否到了季节换季，如果换了且没写过，就写
        const season = getSeasonLetter();
        const hasSeasonLetter = data.letters.some(l => l.title === season?.title && (Date.now() - l.time < 10 * 86400000));
        if (season && !hasSeasonLetter) {
            writeNewLetter(season);
            return;
        }

        // 检查日常信件（7天一封）
        const daysSinceLast = (Date.now() - data.lastWriteTime) / 86400000;
        if (daysSinceLast >= 7) {
            writeNewLetter(null);
        }
    }

    // ========== 信箱面板 ==========
    window.openHisLettersPanel = function () {
        load();
        const old = document.getElementById('his-letters-panel');
        if (old) old.remove();
        const pn = getPartnerName();

        const listHTML = data.letters.length === 0
            ? '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><div style="font-size:48px;margin-bottom:14px;opacity:0.35;">💌</div><div style="font-size:14px;font-weight:600;opacity:0.75;">信箱还是空的</div></div>'
            : data.letters.map(letter => {
                const d = new Date(letter.time);
                const dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                return '<div class="hl-item" data-id="' + letter.id + '" style="background:var(--primary-bg);border-radius:14px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border-color);cursor:pointer;position:relative;">'
                    +   (letter.isNew ? '<div style="position:absolute;top:14px;right:14px;width:8px;height:8px;border-radius:50%;background:#ff4d4f;box-shadow:0 0 6px #ff4d4f;"></div>' : '')
                    +   '<div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">' + letter.title + '</div>'
                    +   '<div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + letter.content.slice(0, 30).replace(/\n/g, ' ') + '...</div>'
                    +   '<div style="font-size:10px;color:var(--text-secondary);margin-top:8px;opacity:0.6;">' + dateStr + '</div>'
                    + '</div>';
            }).join('');

        const modal = document.createElement('div');
        modal.id = 'his-letters-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border-color);flex-shrink:0;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-envelope-open-text" style="color:var(--accent-color);margin-right:8px;"></i>信箱</span>'
            +     '<button id="hl-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div id="hl-list" style="flex:1;overflow-y:auto;padding:14px 2px 4px;">' + listHTML + '</div>'
            + '</div>';

        document.body.appendChild(modal);
        modal.querySelector('#hl-close').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelectorAll('.hl-item').forEach(el => {
            el.onclick = () => openReadLetter(el.dataset.id);
        });
    };

    function openReadLetter(id) {
        load();
        const letter = data.letters.find(l => String(l.id) === String(id));
        if (!letter) return;
        if (letter.isNew) { letter.isNew = false; save(); }

        const old = document.getElementById('hl-read-panel');
        if (old) old.remove();
        
        const modal = document.createElement('div');
        modal.id = 'hl-read-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:#fdfaf3;border-radius:18px;width:92%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,0.5);">'
            +   '<div style="background:linear-gradient(135deg, rgba(var(--accent-color-rgb),0.15), rgba(var(--accent-color-rgb),0.05));padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid rgba(180,150,100,0.15);">'
            +     '<span style="font-size:14px;font-weight:700;color:#5a4a3a;letter-spacing:1px;">' + letter.title + '</span>'
            +     '<button id="hlr-close" style="background:none;border:none;color:#8a7a6a;cursor:pointer;font-size:20px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;padding:24px 26px;background-image:repeating-linear-gradient(transparent, transparent 30px, rgba(180,150,100,0.1) 30px, rgba(180,150,100,0.1) 31px);">'
            +     '<div style="font-family:var(--font-family);font-size:14px;line-height:31px;color:#3a3025;white-space:pre-wrap;">' + letter.content + '</div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid rgba(180,150,100,0.15);display:flex;gap:10px;background:rgba(255,250,240,0.5);">'
            +     '<button id="hlr-del" style="padding:9px 14px;border:1px solid rgba(200,80,80,0.3);border-radius:10px;background:none;color:#c05050;font-size:12px;cursor:pointer;">删除</button>'
            +     '<button id="hlr-back" style="flex:1;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">收起</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);
        modal.querySelector('#hlr-close').onclick = () => { modal.remove(); window.openHisLettersPanel(); };
        modal.querySelector('#hlr-back').onclick = () => { modal.remove(); window.openHisLettersPanel(); };
        modal.querySelector('#hlr-del').onclick = () => {
            if (!confirm('删除这封信？')) return;
            data.letters = data.letters.filter(l => String(l.id) !== String(id));
            save();
            modal.remove();
            window.openHisLettersPanel();
        };
    }

    // 启动
    window.initHisLetters = function () {
        load();
        setInterval(checkSchedule, 60 * 60 * 1000); // 每小时检查一次
        setTimeout(checkSchedule, 5000); // 首次 5 秒后检查
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(window.initHisLetters, 2000));
    } else {
        setTimeout(window.initHisLetters, 2000);
    }

    console.log('[his-letters] 信箱系统已加载 ✓');
})();