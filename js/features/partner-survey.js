/**
 * partner-survey.js
 * 对方主动出题（我答）— 自启动版
 */

(function () {
    'use strict';

    const TRIGGER_KEY = getStorageKey('partnerSurveyTrigger_v1');

    // ---------- 让对方出题 ----------
    function askPartnerSurvey() {
        let bank = [];
        if (window._surveyBankData && Array.isArray(window._surveyBankData)) {
            bank = window._surveyBankData;
        }

        if (!bank || bank.length === 0) {
            const fallbackQuestions = [
                '如果有一天我消失了，你会怎么办？',
                '今天想我了吗？',
                '如果可以许一个愿望，你想要什么？',
                '你最喜欢我什么？',
                '你最想和我去哪里？'
            ];
            const q = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
            bank = [{ q: q, opts: [] }];
        }

        const item = bank[Math.floor(Math.random() * bank.length)];
        const q = item.q;
        if (!q) return false;

        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';

        if (typeof addMessage === 'function') {
            addMessage({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sender: partnerName,
                text: q,
                timestamp: new Date(),
                status: 'received',
                type: 'survey',
                survey: {
                    question: q,
                    options: [],
                    isPartnerAsk: true,
                    answered: false,
                    answer: [],
                    deadline: Date.now() + 10 * 60 * 1000
                }
            });
        }
        if (typeof playSound === 'function') playSound('message');
        if (typeof window._sendPartnerNotification === 'function') {
            window._sendPartnerNotification(partnerName, q);
        }

        // 10 分钟未回答 → 提示
        setTimeout(function () {
            const msgs = (typeof messages !== 'undefined') ? messages : [];
            for (let i = msgs.length - 1; i >= 0; i--) {
                const m = msgs[i];
                if (m.type === 'survey' && m.survey && m.survey.isPartnerAsk && !m.survey.answered && !m.survey.expired) {
                    if (m.survey.deadline && Date.now() >= m.survey.deadline) {
                        m.survey.expired = true;
                        if (typeof throttledSaveData === 'function') throttledSaveData();
                        if (typeof renderMessages === 'function') renderMessages(true);

                        const tips = [
                            '不想回答也没关系。',
                            '我猜你会选…算了，不猜了。',
                            '等你想说的时候再说吧。',
                            '这个问题先放着吧。'
                        ];
                        const tip = tips[Math.floor(Math.random() * tips.length)];
                        if (typeof addMessage === 'function') {
                            addMessage({
                                id: Date.now() + Math.random(),
                                sender: partnerName,
                                text: tip,
                                timestamp: new Date(),
                                status: 'received',
                                type: 'normal'
                            });
                        }
                        if (typeof playSound === 'function') playSound('message');
                    }
                    break;
                }
            }
        }, 10 * 60 * 1000);

        return true;
    }
    window._partnerAskSurvey = askPartnerSurvey;

    // ---------- 随机触发 ----------
    function checkDailyData() {
        const today = new Date().toDateString();
        let data = {};
        try { data = JSON.parse(localStorage.getItem(TRIGGER_KEY) || '{}'); } catch (e) {}
        if (data.date !== today) {
            data = { date: today, count: 0, max: 1 + Math.floor(Math.random() * 3) };
            try { localStorage.setItem(TRIGGER_KEY, JSON.stringify(data)); } catch (e) {}
        }
        return data;
    }

    function tryTrigger() {
        const data = checkDailyData();
        if (data.count >= data.max) return;
        if (Math.random() < 0.35) {
            if (askPartnerSurvey()) {
                data.count++;
                try { localStorage.setItem(TRIGGER_KEY, JSON.stringify(data)); } catch (e) {}
            }
        }
    }

    function scheduleRandom() {
        setTimeout(tryTrigger, 3 * 60 * 1000);
        setInterval(tryTrigger, 45 * 60 * 1000);
    }

    // ---------- 用户主动请求（用 input 事件，更稳） ----------
    function hookUserInput() {
        let _lastTrigger = '';
        document.addEventListener('input', function (e) {
            const input = e.target;
            if (!input || input.id !== 'message-input') return;
            const text = input.value.trim();
            if (!text) { _lastTrigger = ''; return; }
            if (_lastTrigger === text) return;

            if (/^(你问我一个问题|问我一个问题|出个题|出题)$/.test(text)
                || /你问我一个(选择题|问题)/.test(text)
                || /^(问问我|考考我)$/.test(text)) {
                _lastTrigger = text;
                input.value = '';
                input.style.height = '46px';
                setTimeout(function () {
                    if (askPartnerSurvey()) {
                        if (typeof showNotification === 'function') showNotification('✦ 对方正在出题…', 'info', 1500);
                    } else {
                        if (typeof showNotification === 'function') showNotification('题库是空的', 'warning', 2000);
                    }
                }, 100);
            }
        });
    }

    // ---------- 自启动（不再依赖 listeners.js） ----------
    function boot() {
        scheduleRandom();
        hookUserInput();
        console.log('[partner-survey] 已启动 ✓');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 1500));
    } else {
        setTimeout(boot, 1500);
    }

    window.initPartnerSurvey = boot;
})();