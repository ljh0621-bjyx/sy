/* ==========================================================================
   enhanced-features.js (语音播放防重叠、AI回复设置、专属照片发图逻辑)
   ========================================================================== */
(function () {
    'use strict';

    var AI_KEY = getStorageKey('aiReplySettings_v1');
    var aiSettings = { voiceChance: 10, imageChance: 15 };

    async function loadAI() {
        try { var s = await localforage.getItem(AI_KEY); if (s) Object.assign(aiSettings, s); } catch (e) {}
    }
    window.getAIReplyChance = function (key, fallback) {
        var v = aiSettings && aiSettings[key];
        return (typeof v === 'number') ? v : fallback;
    };
    loadAI();

    // ==================== 语音播放核心逻辑（防重叠 + 返回Promise） ====================
    let _currentlyPlayingVoiceAudio = null;

    window._playVoiceMessage = function (el) {
        var dur = parseInt(el.getAttribute('data-duration'), 10) || 5;
        var text = el.getAttribute('data-voice-text') || '';
        var existingUrl = el.getAttribute('data-voice-url');
        var bar = el.querySelector('.voice-progress-bar');

        if (_currentlyPlayingVoiceAudio) {
            try { _currentlyPlayingVoiceAudio.pause(); _currentlyPlayingVoiceAudio.currentTime = 0; } catch (e) {}
            _currentlyPlayingVoiceAudio = null;
        }

        var playBar = function () {
            if (bar) {
                bar.style.transition = 'width ' + dur + 's linear';
                bar.style.width = '0%';
                requestAnimationFrame(function () { bar.style.width = '100%'; });
                setTimeout(function () { bar.style.transition = 'width 0.2s'; bar.style.width = '0%'; }, dur * 1000);
            }
        };

        var playAudioUrl = function (url) {
            var audio = new Audio(url);
            _currentlyPlayingVoiceAudio = audio;
            var playPromise = audio.play();
            playPromise.catch(function(e) { console.warn('浏览器限制自动播放', e); });
            audio.addEventListener('ended', function () {
                if (_currentlyPlayingVoiceAudio === audio) _currentlyPlayingVoiceAudio = null;
                if (bar) { bar.style.transition = 'width 0.2s'; bar.style.width = '0%'; }
            });
            playBar();
            return playPromise; // ★ 核心：返回给 core.js 捕获拦截错误
        };

        if (existingUrl) { playAudioUrl(existingUrl); return; }

        var fallbackTTS = function () {
            if (text && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
                try {
                    window.speechSynthesis.cancel();
                    var u = new SpeechSynthesisUtterance(text);
                    u.lang = 'zh-CN'; u.rate = 1.05; u.pitch = 1.05; u.volume = 0.9;
                    window.speechSynthesis.speak(u);
                } catch (e) {}
            }
            playBar();
        };

        var voiceConfig = (typeof window.getVoiceConfig === 'function') ? window.getVoiceConfig() : null;
        if (text && voiceConfig && voiceConfig.apiKey && voiceConfig.groupId) {
            try {
                var url = 'https://api.minimax.chat/v1/t2a_v2?GroupId=' + encodeURIComponent(voiceConfig.groupId);
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + voiceConfig.apiKey },
                    body: JSON.stringify({ model: voiceConfig.model, text: text, stream: false, voice_setting: { voice_id: voiceConfig.voiceId, speed: 1.0, vol: 1.0, pitch: 0 }, audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' } })
                }).then(function (r) { return r.json(); }).then(function (json) {
                    if (json && json.data && json.data.audio) {
                        var hex = json.data.audio;
                        var bytes = new Uint8Array(hex.length / 2);
                        for (var i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
                        var blob = new Blob([bytes], { type: 'audio/mp3' });
                        var audioUrl = URL.createObjectURL(blob);
                        el.setAttribute('data-voice-url', audioUrl);
                        playAudioUrl(audioUrl);
                    } else { fallbackTTS(); }
                }).catch(function () { fallbackTTS(); });
                return;
            } catch (e) {}
        }
        fallbackTTS();
    };

    // ==================== AI发图触发逻辑 ====================
    var _lastId = null;
    setInterval(function () {
        if (typeof messages === 'undefined' || !Array.isArray(messages) || messages.length === 0) return;
        var last = messages[messages.length - 1];
        if (!last || last.sender === 'user' || last.sender === null || last.type !== 'normal' || !last.text) return;
        if (last.id === _lastId) return;
        if (_lastId === null) { _lastId = last.id; return; }
        _lastId = last.id;

        var partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
        var _addMsg = (typeof addMessage === 'function') ? addMessage : window.addMessage;
        if (!_addMsg) return;

        try {
            var iChance = (typeof window.getAIReplyChance === 'function') ? window.getAIReplyChance('imageChance', 15) : 15;
            if ((Math.random() * 100) < iChance) {
                setTimeout(function () {
                    var wantToSendSelf = Math.random() < 0.5; 

                    if (wantToSendSelf) {
                        var selfImg = typeof window.getRandomSelfPhoto === 'function' ? window.getRandomSelfPhoto() : null;
                        
                        // 如果有专属照片，优先尝试图生图（换姿势）
                        if (selfImg && typeof window.generateAIImageWithReference === 'function') {
                            var selfPrompt = "same face, purple hair, black hoop earrings, pearl necklace, high nose bridge, pale skin, greyish-white shirt, " 
                                           + "sitting in a cafe, standing by the window, taking a mirror selfie, looking at the camera, realistic style, high quality";
                            
                            window.generateAIImageWithReference(selfPrompt, selfImg.url).then(function(imgUrl) {
                                if (imgUrl) {
                                    _addMsg({ id: Date.now() + Math.random(), sender: partnerName, text: '', timestamp: new Date(), status: 'received', image: imgUrl, type: 'normal' });
                                    if (typeof playSound === 'function') playSound('message');
                                } else {
                                    // 图生图失败，直接发原图
                                    _addMsg({ id: Date.now() + Math.random(), sender: partnerName, text: '', timestamp: new Date(), status: 'received', image: selfImg.url, type: 'normal' });
                                    if (typeof playSound === 'function') playSound('message');
                                }
                            }).catch(function() {
                                _addMsg({ id: Date.now() + Math.random(), sender: partnerName, text: '', timestamp: new Date(), status: 'received', image: selfImg.url, type: 'normal' });
                                if (typeof playSound === 'function') playSound('message');
                            });
                            return;
                        }
                        
                        // 无专属图库，则调用普通 AI 生图（如果有配置 API）
                        if (typeof window.generateAIImage === 'function') {
                            var selfPromptFallback = "一个紫发男生，戴着黑色耳环和珍珠项链，高鼻梁，冷白皮，穿着灰白衬衫，自拍或他拍视角，高清写实";
                            window.generateAIImage(selfPromptFallback).then(function(url) {
                                if (url) {
                                    _addMsg({ id: Date.now() + Math.random(), sender: partnerName, text: '', timestamp: new Date(), status: 'received', image: url, type: 'normal' });
                                    if (typeof playSound === 'function') playSound('message');
                                }
                            });
                        }
                        return;
                    }

                    // 想发其他类型的图
                    var prompt = (last.text || '').trim() || 'sweet moment, cute style, soft lighting';
                    var doPost = function (imgUrl) {
                        if (!imgUrl) return;
                        _addMsg({ id: Date.now() + Math.random(), sender: partnerName, text: '', timestamp: new Date(), status: 'received', image: imgUrl, type: 'normal' });
                        if (typeof playSound === 'function') playSound('message');
                    };
                    if (typeof window.generateAIImage === 'function') {
                        window.generateAIImage(prompt).then(function (url) {
                            if (url) doPost(url);
                            else if (typeof window.getRandomPartnerImage === 'function') { var img = window.getRandomPartnerImage(); if (img) doPost(img.url); }
                        }).catch(function () {
                            if (typeof window.getRandomPartnerImage === 'function') { var img = window.getRandomPartnerImage(); if (img) doPost(img.url); }
                        });
                    } else if (typeof window.getRandomPartnerImage === 'function') {
                        var img = window.getRandomPartnerImage();
                        if (img) doPost(img.url);
                    }
                }, 1500 + Math.random() * 1500);
            }
        } catch (e) {}
    }, 1500);

    // ==================== 自动撤回、语音转文字清理等 ====================
    var _lastPartnerMsgId = null;
    setInterval(function () {
        if (typeof messages === 'undefined' || !Array.isArray(messages)) return;
        for (var i = messages.length - 1; i >= 0; i--) {
            var m = messages[i];
            if (m.sender && m.sender !== 'user' && m.type === 'normal' && !m.recalled) {
                if (_lastPartnerMsgId === m.id) return;
                _lastPartnerMsgId = m.id;
                if (Math.random() < 0.2) {
                    (function (id) {
                        var delay = 5000 + Math.random() * 25000;
                        setTimeout(function () {
                            var idx = messages.findIndex(function (x) { return String(x.id) === String(id); });
                            if (idx === -1 || messages[idx].recalled) return;
                            messages[idx].recalled = true;
messages[idx].recallTime = Date.now();
if (typeof throttledSaveData === 'function') throttledSaveData();
if (typeof renderMessages === 'function') renderMessages(true);

// ★ 加一条系统提示（像微信那样）
try {
    const pn = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '对方';
    if (typeof addMessage === 'function') {
        addMessage({
            id: Date.now() + Math.random(),
            sender: null,
            text: pn + ' 撤回了一条消息',
            timestamp: new Date(),
            status: 'received',
            type: 'system'
        });
    }
} catch (e) {
    console.warn('[enhanced-features] 撤回提示失败', e);
}
                        }, delay);
                    })(m.id);
                }
                return;
            }
        }
    }, 3000);

    // 语音文字重复时，替换上面的普通消息
    var _lastCleanId = null;
    setInterval(function () {
        if (typeof messages === 'undefined' || !Array.isArray(messages) || messages.length < 2) return;
        for (var i = messages.length - 1; i >= 1; i--) {
            var cur = messages[i];
            var prev = messages[i - 1];
            if (cur && prev && cur.type === 'voice' && prev.type === 'normal' && cur.sender === prev.sender && cur.sender !== 'user' && cur.text && prev.text && cur.text.trim() === prev.text.trim()) {
                var key = String(prev.id) + '|' + String(cur.id);
                if (_lastCleanId === key) return;
                _lastCleanId = key;
                messages.splice(i - 1, 1);
                if (typeof throttledSaveData === 'function') throttledSaveData();
                renderMessages(true);
                return;
            }
        }
    }, 600);
})();