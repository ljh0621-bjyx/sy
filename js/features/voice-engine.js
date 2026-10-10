/**
 * voice-engine.js
 * 对方发语音（基于 MiniMax T2A 接口）
 */
(function () {
    'use strict';

    window.getVoiceConfig = function() {
        return {
    groupId: localStorage.getItem(getStorageKey('minimax_group_id')) || '',
    apiKey: localStorage.getItem(getStorageKey('minimax_api_key')) || '',
    voiceId: localStorage.getItem(getStorageKey('minimax_voice_id')) || 'male-qn-qingse',
    model: localStorage.getItem(getStorageKey('minimax_model')) || 'speech-02-turbo'
};
    };

    const VOICE_MAP = {
        '祁煜': 'male-qn-badao',
        '陆景和': 'male-qn-qingse',
        '秦彻': 'male-qn-jingying',
        '沈星回': 'male-qn-daxuesheng',
        '刘辩': 'male-qn-yanshu',
        '袁基': 'male-qn-qingse',
        '孙策': 'male-qn-badao',
        '左慈': 'male-qn-jingying',
        '傅融': 'male-qn-daxuesheng',
        '林衍': 'male-qn-qingse',
        '陆亦庭': 'male-qn-jingying',
        '何路': 'male-qn-daxuesheng'
    };

    function hexToBase64(hexStr) {
        let binary = '';
        for (let i = 0; i < hexStr.length; i += 2) {
            binary += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
        }
        return window.btoa(binary);
    }

    window.playPartnerVoice = async function(text, senderName) {
        const cfg = window.getVoiceConfig();

        // ★ 强制根据角色名绑定音色
        if (senderName && typeof VOICE_MAP !== 'undefined' && VOICE_MAP[senderName]) {
            cfg.voiceId = VOICE_MAP[senderName];
        }

        if (!cfg.groupId || !cfg.apiKey) {
            showNotification('请先配置 MiniMax 语音 API', 'warning');
            return null;
        }

        try {
            const resp = await fetch('https://api.minimax.chat/v1/t2a_v2?GroupId=' + cfg.groupId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.apiKey
                },
                body: JSON.stringify({
                    model: cfg.model,
                    text: (function(t) {
    var clean = String(t).trim();
    // 如果传进来的文本本身就是前后重复的（比如 "继续 继续" 或 "继续继续"）
    if (clean.length > 1 && clean.length % 2 === 0) {
        var half = clean.substring(0, clean.length / 2);
        if (clean === half + half) {
            clean = half; // 截断重复的后半部分
        }
    }
    return clean;
})(text),
                    stream: false,
                    voice_setting: { 
                        voice_id: cfg.voiceId, 
                        speed: 1.0, 
                        vol: 1.0, 
                        pitch: 0 
                    },
                    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' }
                })
            });

            if (!resp.ok) throw new Error('MiniMax API 请求失败');
            const res = await resp.json();
            if (res.data && res.data.audio) {
                return 'data:audio/mp3;base64,' + hexToBase64(res.data.audio);
            }
            return null;
        } catch (e) {
            console.error('[voice-engine] 语音生成失败', e);
            showNotification('语音生成失败，请检查配置', 'error');
            return null;
        }
    };

    window.openVoiceSettingsPanel = function() {
        const old = document.getElementById('voice-settings-panel');
        if (old) old.remove();
        
        const cfg = window.getVoiceConfig();
        const modal = document.createElement('div');
        modal.id = 'voice-settings-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
        
        modal.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.4);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                    <span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-microphone-alt" style="color:var(--accent-color);margin-right:8px;"></i>MiniMax 语音设置</span>
                    <button id="vs-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:14px;">配置后，对方有一定概率发语音消息。</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">模型选择</div>
                <select id="vs-model" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;font-size:14px;font-family:var(--font-family);">
                    <option value="speech-02-turbo" ${cfg.model === 'speech-02-turbo' ? 'selected' : ''}>speech-02-turbo（推荐，更快更自然）</option>
                    <option value="speech-01" ${cfg.model === 'speech-01' ? 'selected' : ''}>speech-01（旧版）</option>
                </select>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Group ID</div>
                <input id="vs-groupid" placeholder="GroupId" value="${cfg.groupId}" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">API Key</div>
                <input id="vs-apikey" placeholder="ApiKey" type="password" value="${cfg.apiKey}" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">默认音色 ID（未指定角色名时使用）</div>
                <input id="vs-voiceid" placeholder="音色ID（如 male-qn-qingse）" value="${cfg.voiceId}" style="width:100%;padding:10px;margin-bottom:16px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);box-sizing:border-box;outline:none;">
                <div style="display:flex;gap:10px;">
                    <button id="vs-cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:10px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;">取消</button>
                    <button id="vs-save" style="flex:2;padding:11px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">保存配置</button>
                </div>
            </div>`;
            
        document.body.appendChild(modal);
        
        document.getElementById('vs-close').onclick = () => modal.remove();
        document.getElementById('vs-cancel').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
        document.getElementById('vs-save').onclick = () => {
            localStorage.setItem('minimax_group_id', document.getElementById('vs-groupid').value.trim());
            localStorage.setItem('minimax_api_key', document.getElementById('vs-apikey').value.trim());
            localStorage.setItem('minimax_voice_id', document.getElementById('vs-voiceid').value.trim());
            localStorage.setItem('minimax_model', document.getElementById('vs-model').value);
            showNotification('✓ 语音配置已保存', 'success');
            modal.remove();
        };
    };
})();