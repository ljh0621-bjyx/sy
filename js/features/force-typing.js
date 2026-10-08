/* ============================================================
 * force-typing.js - 强制显示拼音弹窗（补丁版）
 * 监听 messages 变化，发现对方发新消息就弹拼音窗
 * ============================================================ */
(function () {
    'use strict';

    let _lastMsgCount = 0;
    let _lastMsgId = null;
    let _busy = false;

    // 简易拼音映射（取常用的）
    const PINYIN_MAP = {
        '你': 'ni', '好': 'hao', '我': 'wo', '想': 'xiang', '了': 'le',
        '是': 'shi', '的': 'de', '不': 'bu', '在': 'zai', '有': 'you',
        '人': 'ren', '家': 'jia', '也': 'ye', '容': 'rong', '易': 'yi',
        '爱': 'ai', '会': 'hui', '用': 'yong', '远': 'yuan', '离': 'li',
        '距': 'ju', '能': 'neng', '可': 'ke', '服': 'fu', '谢': 'xie',
        '见': 'jian', '面': 'mian', '说': 'shuo', '话': 'hua', '听': 'ting',
        '看': 'kan', '走': 'zou', '来': 'lai', '去': 'qu', '知': 'zhi',
        '到': 'dao', '很': 'hen', '多': 'duo', '少': 'shao', '什': 'shen',
        '么': 'me', '怎': 'zen', '样': 'yang', '为': 'wei', '虽': 'sui',
        '然': 'ran', '但': 'dan', '过': 'guo', '明': 'ming', '天': 'tian',
        '起': 'qi', '喜': 'xi', '欢': 'huan', '今': 'jin', '晚': 'wan',
        '睡': 'shui', '梦': 'meng', '朋': 'peng', '友': 'you', '一': 'yi',
        '二': 'er', '三': 'san', '四': 'si', '五': 'wu', '六': 'liu',
        '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi'
    };

    function charToPinyin(ch) {
        if (PINYIN_MAP[ch]) return PINYIN_MAP[ch];
        if (/^[a-zA-Z0-9]$/.test(ch)) return ch;
        return null;
    }

    // 显示拼音弹窗
    async function showTypingFloat(text) {
        if (_busy) return;
        _busy = true;

        // 创建弹窗
        let popup = document.getElementById('force-typing-float');
        if (popup) popup.remove();
        popup = document.createElement('div');
        popup.id = 'force-typing-float';
        popup.style.cssText = `
            position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
            width:88%;max-width:360px;z-index:99999;
            background:var(--secondary-bg);border-radius:16px;
            box-shadow:0 10px 30px rgba(0,0,0,0.18),0 0 0 1px var(--border-color);
            padding:14px 16px;font-family:var(--font-family);
            animation:ftIn 0.3s cubic-bezier(0.34,1.3,0.64,1);
        `;
        popup.innerHTML = `
            <style>
                @keyframes ftIn { from{opacity:0;transform:translate(-50%,20px) scale(0.95);} to{opacity:1;transform:translate(-50%,0) scale(1);} }
                @keyframes ftBlink { 0%,100%{opacity:1;} 50%{opacity:0;} }
            </style>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);">
                    <i class="fas fa-keyboard" style="color:var(--accent-color);margin-right:6px;"></i>正在打字
                </div>
            </div>
            <div style="background:var(--primary-bg);border-radius:10px;padding:10px 12px;min-height:44px;border:1px solid var(--border-color);">
                <div id="ft-pinyin" style="font-size:14px;color:var(--accent-color);font-family:monospace;letter-spacing:1px;min-height:20px;word-break:break-all;">
                    <span style="animation:ftBlink 0.9s step-end infinite;">|</span>
                </div>
            </div>
            <div id="ft-candidates" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;min-height:28px;"></div>
        `;
        document.body.appendChild(popup);

        const pinyinEl = popup.querySelector('#ft-pinyin');
        const candEl = popup.querySelector('#ft-candidates');

        const chars = Array.from(String(text));

        // 逐字打字
        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            const py = charToPinyin(ch);

            if (py) {
                // 逐字母打字
                let partial = '';
                for (let j = 0; j < py.length; j++) {
                    partial += py[j];
                    pinyinEl.innerHTML = partial + '<span style="animation:ftBlink 0.9s step-end infinite;">|</span>';
                    await sleep(80);
                }
                pinyinEl.innerHTML = partial + '<span style="animation:ftBlink 0.9s step-end infinite;">|</span>';
                await sleep(200);

                // 显示候选字
                candEl.innerHTML = `<span style="padding:4px 10px;background:var(--accent-color);color:#fff;border-radius:12px;font-size:13px;">${ch}</span>`;
                await sleep(150);
                candEl.innerHTML = '';
            } else {
                // 标点或英文，直接显示
                pinyinEl.innerHTML = ch + '<span style="animation:ftBlink 0.9s step-end infinite;">|</span>';
                await sleep(200);
            }
        }

        // 停留一会
        await sleep(400);

        // 淡出
        popup.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(20px)';
        await sleep(400);
        popup.remove();

        _busy = false;
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // 扫消息
    function scan() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (_busy) return;

            if (messages.length === _lastMsgCount) return;

            // 有新消息
            const newMsgs = messages.slice(_lastMsgCount);
            _lastMsgCount = messages.length;

            // 找最后一条"对方发的文字消息"
            for (let i = newMsgs.length - 1; i >= 0; i--) {
                const m = newMsgs[i];
                if (!m) continue;
                if (m.sender === 'user') continue;
                if (!m.text || !String(m.text).trim()) continue;
                if (m.type === 'system' || m.type === 'call-event') continue;

                const t = String(m.text).trim();
                if (t.length > 30) continue; // 太长的文字跳过
                if (t.startsWith('【') || t.includes('[图片]')) continue;

                // 弹窗
                showTypingFloat(t);
                break;
            }
        } catch (e) {
            console.warn('[force-typing] 扫描失败', e);
        }
    }

    // 每 800ms 扫一次
    setInterval(scan, 800);

    // 初始同步
    setTimeout(() => {
        if (typeof messages !== 'undefined' && Array.isArray(messages)) {
            _lastMsgCount = messages.length;
        }
    }, 1500);

    console.log('[force-typing] 拼音弹窗补丁已启动 ✓');
})();