/* ============================================================
 * voice-message.js - 对方发语音
 * 监听你的消息，按 voiceChance 概率，让对方发一段语音
 * ============================================================ */
(function () {
    'use strict';

    let _lastMsgCount = 0;
    let _lastMsgId = null;
    let _busy = false;

    // 从设置里读语音概率
    function getVoiceChance() {
        if (typeof window.getAIReplyChance === 'function') {
            return window.getAIReplyChance('voiceChance', 10);
        }
        return 10;
    }

    // 从字卡库随机抽一句作为"语音内容"
    function pickVoiceText() {
        const pool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(t => t && String(t).trim())
            : [];
        if (pool.length === 0) return null;
        let t = pool[Math.floor(Math.random() * pool.length)];
        // 语音太长会慢，截断到 50 字以内
        if (t.length > 50) t = t.slice(0, 50);
        return t;
    }

    // 扫消息
    function scan() {
        try {
            if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
            if (_busy) return;
            if (messages.length === _lastMsgCount) return;

            const newMsgs = messages.slice(_lastMsgCount);
            _lastMsgCount = messages.length;

            // 找最后一条"你发的文字消息"
            let myText = null;
            let myMsgId = null;
            for (let i = newMsgs.length - 1; i >= 0; i--) {
                const m = newMsgs[i];
                if (!m) continue;
                if (m.sender !== 'user') continue;
                if (!m.text || !String(m.text).trim()) continue;
                if (m.type === 'system' || m.type === 'call-event' || m.type === 'survey') continue;
                myText = String(m.text).trim();
                myMsgId = m.id;
                break;
            }
            if (!myText || !myMsgId) return;
            if (_lastMsgId === myMsgId) return;
            _lastMsgId = myMsgId;

            // 按概率决定
            const chance = getVoiceChance();
            if (Math.random() * 100 >= chance) return;

            // 稍微延迟一下，避免和"打字动画"冲突
            const delay = 1500 + Math.random() * 2000;
            setTimeout(() => {
                _busy = true;
                try {
                    // 选语音内容（优先用对方刚回复的字卡，否则从库随机抽）
                    const voiceText = pickVoiceText();
                    if (!voiceText) {
                        _busy = false;
                        return;
                    }

                    // 调语音合成
                    if (typeof window.playPartnerVoice !== 'function') {
                        console.warn('[voice-message] playPartnerVoice 不存在');
                        _busy = false;
                        return;
                    }

                    const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

                    window.playPartnerVoice(voiceText, partnerName).then((audioUrl) => {
                        if (!audioUrl) {
                            _busy = false;
                            return;
                        }

                        // 估算时长（按 4 字/秒）
                        const dur = Math.max(3, Math.round(voiceText.length / 4));

                        // 发语音消息
                        if (typeof addMessage === 'function') {
                            addMessage({
                                id: Date.now() + Math.floor(Math.random() * 1000),
                                sender: partnerName,
                                text: voiceText,
                                timestamp: new Date(),
                                status: 'received',
                                type: 'voice',
                                duration: dur,
                                voiceUrl: audioUrl
                            });
                        }

                        if (typeof playSound === 'function') playSound('message');
                        if (typeof window._sendPartnerNotification === 'function') {
                            window._sendPartnerNotification(partnerName, '[语音] ' + voiceText);
                        }

                        _busy = false;
                    }).catch((e) => {
                        console.warn('[voice-message] 合成失败', e);
                        _busy = false;
                    });
                } catch (e) {
                    console.warn('[voice-message] 异常', e);
                    _busy = false;
                }
            }, delay);
        } catch (e) {
            console.warn('[voice-message] 扫描失败', e);
        }
    }

    setInterval(scan, 1000);

    // 初始同步
    setTimeout(() => {
        if (typeof messages !== 'undefined' && Array.isArray(messages)) {
            _lastMsgCount = messages.length;
        }
    }, 1500);

    console.log('[voice-message] 对方发语音 已启动 ✓');
})();