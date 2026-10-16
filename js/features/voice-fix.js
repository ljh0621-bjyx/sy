/* ============================================================
 * voice-fix.js - MiniMax 语音修复
 * 双域名兼容 + 后加载覆盖原 playPartnerVoice
 * ============================================================ */
(function () {
    'use strict';

    function K(name) {
        try { if (typeof getStorageKey === 'function') return getStorageKey(name); } catch (e) {}
        return 'CHAT_APP_V3_default_' + name;
    }

    function getVoiceConfig() {
        return {
            groupId: localStorage.getItem(K('minimax_group_id')) || '',
            apiKey: localStorage.getItem(K('minimax_api_key')) || '',
            voiceId: localStorage.getItem(K('minimax_voice_id')) || 'male-qn-qingse',
            model: localStorage.getItem(K('minimax_model')) || 'speech-02-turbo'
        };
    }

    const VOICE_MAP = {
        '祁煜': 'male-qn-badao',
        '陆景和': 'male-qn-qingse',
        '秦彻': 'male-qn-jingying',
        '沈星回': 'male-qn-daxuesheng',
        '刘辩': 'male-qn-yanshu',
        '袁基': 'male-qn-qingse',
        '孙策': 'male-qn-badao',
        '左慈': 'male-qn-jingying',
        '傅融': 'male-qn-daxuesheng'
    };

    function hexToBase64(hexStr) {
        let binary = '';
        for (let i = 0; i < hexStr.length; i += 2) {
            binary += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        return window.btoa(binary);
    }

    function cleanText(t) {
        var clean = String(t || '').trim();
        if (clean.length > 1 && clean.length % 2 === 0) {
            var half = clean.substring(0, clean.length / 2);
            if (clean === half + half) clean = half;
        }
        return clean;
    }

    async function tryDomain(domain, cfg, text) {
        const url = domain + '/v1/t2a_v2?GroupId=' + encodeURIComponent(cfg.groupId);
        console.log('[voice-fix] 尝试 ' + domain);
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + cfg.apiKey
            },
            body: JSON.stringify({
                model: cfg.model,
                text: cleanText(text),
                stream: false,
                voice_setting: { voice_id: cfg.voiceId, speed: 1.0, vol: 1.0, pitch: 0 },
                audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' }
            })
        });
        if (!resp.ok) {
            console.warn('[voice-fix] ' + domain + ' HTTP ' + resp.status);
            return null;
        }
        const res = await resp.json();
        console.log('[voice-fix] ' + domain + ' 响应:', res);
        if (res && res.data && res.data.audio) {
            return 'data:audio/mp3;base64,' + hexToBase64(res.data.audio);
        }
        // 打印服务端返回的错误
        if (res && res.base_resp && res.base_resp.status_msg) {
            console.warn('[voice-fix] 服务端错误：', res.base_resp.status_msg);
        }
        return null;
    }

    // ========== 覆盖原函数 ==========
    window.playPartnerVoice = async function (text, senderName) {
        const cfg = getVoiceConfig();
        console.log('[voice-fix] 配置：', { groupId: cfg.groupId ? '有' : '空', apiKey: cfg.apiKey ? '有' : '空', model: cfg.model, voiceId: cfg.voiceId });

        if (senderName && VOICE_MAP[senderName]) {
            cfg.voiceId = VOICE_MAP[senderName];
        }

        if (!cfg.groupId || !cfg.apiKey) {
            if (typeof showNotification === 'function') showNotification('请先配置 MiniMax 语音 API（GroupId + API Key）', 'warning', 3000);
            return null;
        }

        try {
            // 先试新域名
            let url = await tryDomain('https://api.minimaxi.com', cfg, text);
            if (url) return url;

            // 再试旧域名
            url = await tryDomain('https://api.minimax.chat', cfg, text);
            if (url) return url;

            if (typeof showNotification === 'function') showNotification('❌ 语音合成失败，请看控制台报错', 'error', 4000);
            return null;
        } catch (e) {
            console.error('[voice-fix] 请求异常', e);
            if (typeof showNotification === 'function') showNotification('❌ 网络错误：' + e.message, 'error', 4000);
            return null;
        }
    };

    // ========== 覆盖设置面板（带"测试一下"按钮） ==========
    window.openVoiceSettingsPanel = function () {
        const old = document.getElementById('voice-settings-panel');
        if (old) old.remove();

        const cfg = getVoiceConfig();
        const modal = document.createElement('div');
        modal.id = 'voice-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML =
            '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +     '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-microphone-alt" style="color:var(--accent-color);margin-right:8px;"></i>MiniMax 语音设置</span>'
            +     '<button id="vs-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            +   '</div>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">模型</div>'
            +   '<select id="vs-model" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;font-size:14px;font-family:var(--font-family);">'
            +     '<option value="speech-02-turbo"' + (cfg.model === 'speech-02-turbo' ? ' selected' : '') + '>speech-02-turbo（推荐）</option>'
            +     '<option value="speech-01"' + (cfg.model === 'speech-01' ? ' selected' : '') + '>speech-01（旧版）</option>'
            +   '</select>'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Group ID</div>'
            +   '<input id="vs-groupid" placeholder="GroupId" value="' + cfg.groupId + '" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">API Key</div>'
            +   '<input id="vs-apikey" placeholder="ApiKey" type="password" value="' + cfg.apiKey + '" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">'
            +   '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">默认音色 ID</div>'
            +   '<input id="vs-voiceid" placeholder="如 male-qn-qingse" value="' + cfg.voiceId + '" style="width:100%;padding:10px;margin-bottom:16px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">'
            +   '<button id="vs-test" style="width:100%;padding:12px;border:1.5px solid var(--accent-color);border-radius:10px;background:none;color:var(--accent-color);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);margin-bottom:10px;">'
            +     '<i class="fas fa-play"></i> 测试一下'
            +   '</button>'
            +   '<div style="display:flex;gap:10px;">'
            +     '<button id="vs-cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>'
            +     '<button id="vs-save" style="flex:1.5;padding:11px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);">保存</button>'
            +   '</div>'
            +   '<div style="font-size:11px;color:var(--text-secondary);margin-top:10px;text-align:center;opacity:0.7;">'
            +     '提示：去 platform.minimaxi.com 注册，充值后拿 Key'
            +   '</div>'
            + '</div>';

        document.body.appendChild(modal);

        document.getElementById('vs-close').onclick = () => modal.remove();
        document.getElementById('vs-cancel').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        function save() {
            localStorage.setItem(K('minimax_group_id'), document.getElementById('vs-groupid').value.trim());
            localStorage.setItem(K('minimax_api_key'), document.getElementById('vs-apikey').value.trim());
            localStorage.setItem(K('minimax_voice_id'), document.getElementById('vs-voiceid').value.trim());
            localStorage.setItem(K('minimax_model'), document.getElementById('vs-model').value);
        }

        document.getElementById('vs-save').onclick = () => {
            save();
            if (typeof showNotification === 'function') showNotification('✓ 已保存', 'success');
            modal.remove();
        };

        document.getElementById('vs-test').onclick = async () => {
            save();
            if (typeof showNotification === 'function') showNotification('正在合成，请稍等…', 'info', 3000);
            const url = await window.playPartnerVoice('这是测试语音，听到就成功了', '');
            if (url) {
                try {
                    const audio = new Audio(url);
                    audio.play();
                    if (typeof showNotification === 'function') showNotification('✓ 成功，应该能听到声音了', 'success', 3000);
                } catch (e) {
                    if (typeof showNotification === 'function') showNotification('语音生成成功但播放失败', 'warning', 3000);
                }
            }
        };
    };

    console.log('[voice-fix] 已加载，覆盖了 playPartnerVoice ✓');
})();