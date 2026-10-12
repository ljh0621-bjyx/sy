/* ============================================================
 * his-diary.js - 他的日记
 * 他每天写一小段关于你的日记，你可以偷偷翻看
 * ============================================================ */
(function () {
    'use strict';

    const KEY = 'hisDiary_v1';

    // 日记模板（可混入"我的名字"）
    const TEMPLATES = [
        '今天她说{work}，我有点心疼。',
        '她今天好像心情不错。',
        '她回我的那句话，我看了三遍。',
        '今天没怎么跟她说话，有点想念。',
        '看到一朵云像她，笑了一下。',
        '又梦到她了。',
        '她今天穿什么颜色的衣服呢。',
        '她说过的那句话，我记住了。',
        '想给她发消息，最后删掉了。',
        '她笑的时候眼睛会弯，很好看。',
        '今天一整天都在忙，只有想到她的时候会停一下。',
        '她下午回消息很慢，猜她在忙。',
        '刚刚路过我们聊过的那家店。',
        '她说她有点累。想帮她做点什么。',
        '她今天的头像很好看。',
        '她打了错字，很可爱。',
        '想说点什么，又觉得不需要说。',
        '她最近好像有心事，我没敢问。',
        '她今天特别温柔。',
        '看着对话框，想说什么又算了。',
        '她说的每句话我都记得。',
        '今晚没什么事，就是有点想她。',
        '她提到{like}，我记下了。',
        '她今天很晚才回，是睡了还是忙？',
        '她笑了。我也笑了。',
        '她今天说的那句话，让我一直笑到现在。',
        '想抱抱她。',
        '她今天提到的人，我有点在意。',
        '她又熬夜了，明天要说她。',
        '她好像误会了什么，但又不想多解释。',
        '今天没说几句话，但很开心。'
    ];

    // 生成一句日记
    function buildEntry() {
        const pn = (typeof settings !== 'undefined' && settings.partnerName) || '他';
        const myName = (typeof settings !== 'undefined' && settings.myName) || '她';

        let text = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

        // 填充占位符
        const works = ['加班', '很忙', '被说了一顿', '做了很多事', '很累', '没睡好'];
        const likes = ['她喜欢向日葵', '她说喜欢下雨天', '她提到想去看海', '她喜欢有阳光的下午'];
        text = text.replace('{work}', works[Math.floor(Math.random() * works.length)]);
        text = text.replace('{like}', likes[Math.floor(Math.random() * likes.length)]);

        return text;
    }

    // 日期 key
    function todayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    let data = {
        enabled: true,
        entries: [],       // [{ date: '2026-10-12', text, ts }]
        lastWriteDate: null
    };

    async function load() {
        try {
            const saved = await localforage.getItem(getStorageKey(KEY));
            if (saved && typeof saved === 'object') Object.assign(data, saved);
        } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(getStorageKey(KEY), data); } catch (e) {}
    }

    // ========== 写一篇日记 ==========
    async function writeEntry() {
        if (!data.enabled) return false;
        const today = todayKey();
        if (data.lastWriteDate === today) return false;

        // 一天最多一篇
        const text = buildEntry();
        data.entries.unshift({
            date: today,
            text: text,
            ts: Date.now()
        });
        // 只保留最近 60 篇
        if (data.entries.length > 60) data.entries = data.entries.slice(0, 60);

        data.lastWriteDate = today;
        await save();
        return true;
    }

    // ========== 每天检查 ==========
    function scheduleDaily() {
        if (window._hisDiaryTimer) clearInterval(window._hisDiaryTimer);
        // 每 5 分钟检查一次（跨天就写）
        window._hisDiaryTimer = setInterval(function () {
            if (!data.enabled) return;
            const today = todayKey();
            if (data.lastWriteDate !== today) {
                // 跨天 → 写一篇
                writeEntry();
            }
        }, 5 * 60 * 1000);
    }

    // ========== 面板：翻看他的日记 ==========
    window.openHisDiaryPanel = function () {
        const old = document.getElementById('his-diary-panel');
        if (old) old.remove();

        const listHTML = data.entries.length === 0
            ? '<div style="text-align:center;padding:50px 20px;color:var(--text-secondary);">'
                + '<div style="font-size:44px;opacity:0.25;margin-bottom:14px;">📔</div>'
                + '<div style="font-size:14px;font-weight:600;opacity:0.7;">还没有日记</div>'
                + '<div style="font-size:11.5px;opacity:0.5;margin-top:6px;">他明天就会开始写了</div>'
              + '</div>'
            : data.entries.map(function (e) {
                const d = new Date(e.ts);
                const dateLabel = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
                const weekdays = ['日','一','二','三','四','五','六'];
                const wd = '星期' + weekdays[d.getDay()];
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                return '<div style="background:var(--primary-bg);border-left:3px solid rgba(var(--accent-color-rgb),0.5);border-radius:0 12px 12px 0;padding:14px 16px;margin-bottom:10px;">'
                    +   '<div style="font-size:10.5px;color:var(--text-secondary);letter-spacing:0.5px;margin-bottom:8px;opacity:0.75;">' + dateLabel + ' · ' + wd + ' · ' + hh + ':' + mm + '</div>'
                    +   '<div style="font-size:13px;color:var(--text-primary);line-height:1.85;white-space:pre-wrap;font-style:italic;">' + String(e.text).replace(/</g, '&lt;') + '</div>'
                    + '</div>';
            }).join('');

        const modal = document.createElement('div');
        modal.id = 'his-diary-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:92%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-shrink:0;">'
            +     '<div>'
            +       '<div style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-book" style="color:var(--accent-color);margin-right:8px;"></i>他的日记</div>'
            +       '<div style="font-size:11px;color:var(--text-secondary);margin-top:3px;opacity:0.7;">他没有告诉你，但你可以看</div>'
            +     '</div>'
            +     '<button id="hd2-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="flex:1;overflow-y:auto;padding-right:4px;">' + listHTML + '</div>'
            +   '<div style="display:flex;gap:8px;margin-top:14px;flex-shrink:0;">'
            +     '<button id="hd2-test" style="flex:1;padding:11px;border:1.5px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">🧪 让他写一篇</button>'
            +     '<button id="hd2-save" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">好，合上</button>'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        const close = () => modal.remove();
        modal.querySelector('#hd2-close').onclick = close;
        modal.querySelector('#hd2-save').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        modal.querySelector('#hd2-test').onclick = async () => {
            // 强制写一篇（不受"一天一篇"限制）
            const text = buildEntry();
            data.entries.unshift({
                date: todayKey(),
                text: text,
                ts: Date.now()
            });
            if (data.entries.length > 60) data.entries = data.entries.slice(0, 60);
            await save();
            close();
            setTimeout(window.openHisDiaryPanel, 80);
        };
    };

    // ========== 初始化 ==========
    window.initHisDiary = function () {
        load().then(function () {
            // 首次打开先补一篇
            const today = todayKey();
            if (data.lastWriteDate !== today && data.enabled) {
                writeEntry();
            }
            scheduleDaily();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(window.initHisDiary, 2500); });
    } else {
        setTimeout(window.initHisDiary, 2500);
    }

    console.log('[his-diary] 他的日记已加载 ✓');
})();