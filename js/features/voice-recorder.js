/**
 * voice-recorder.js
 * 通用语音录制器（供所有聊天面板调用）
 */

(function () {
    'use strict';

    let _mediaRecorder = null;
    let _stream = null;
    let _chunks = [];
    let _startTime = 0;
    let _timer = null;
    let _recordingUI = null;
    let _callback = null;
    let _cancelled = false;

    function fmtTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    function pickMime() {
        if (typeof MediaRecorder === 'undefined') return '';
        const candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            'audio/ogg'
        ];
        for (const m of candidates) {
            try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
        }
        return '';
    }

    function blobToDataURL(blob) {
        return new Promise(function (resolve, reject) {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    function buildUI() {
        if (_recordingUI) return _recordingUI;

        const ui = document.createElement('div');
        ui.id = 'panel-voice-recording-ui';
        ui.style.cssText =
            'position:fixed;inset:0;z-index:999998;' +
            'background:rgba(0,0,0,0.72);backdrop-filter:blur(14px);' +
            'display:none;flex-direction:column;align-items:center;justify-content:center;' +
            'animation:pvFadeIn 0.2s ease;';

        ui.innerHTML =
            '<style>' +
            '@keyframes pvFadeIn{from{opacity:0}to{opacity:1}}' +
            '@keyframes pvPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:0.5}}' +
            '@keyframes pvBarPulse{0%,100%{height:12px}50%{height:36px}}' +
            '</style>'
            + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">'
            +   '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#ff4d4d;animation:pvPulse 1s ease-in-out infinite;"></span>'
            +   '<span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:1px;">正在录音</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:4px;height:48px;margin-bottom:18px;">'
            +   '<div style="width:4px;height:18px;background:#fff;border-radius:2px;animation:pvBarPulse 0.6s ease-in-out infinite;"></div>'
            +   '<div style="width:4px;height:26px;background:#fff;border-radius:2px;animation:pvBarPulse 0.6s ease-in-out infinite 0.1s;"></div>'
            +   '<div style="width:4px;height:36px;background:#fff;border-radius:2px;animation:pvBarPulse 0.6s ease-in-out infinite 0.2s;"></div>'
            +   '<div style="width:4px;height:26px;background:#fff;border-radius:2px;animation:pvBarPulse 0.6s ease-in-out infinite 0.1s;"></div>'
            +   '<div style="width:4px;height:18px;background:#fff;border-radius:2px;animation:pvBarPulse 0.6s ease-in-out infinite;"></div>'
            + '</div>'
            + '<div id="pv-rec-time" style="font-size:34px;font-weight:800;color:#fff;font-family:Georgia,monospace;letter-spacing:2px;margin-bottom:36px;">00:00</div>'
            + '<div style="display:flex;gap:16px;">'
            +   '<button id="pv-cancel" style="width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.08);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fas fa-times"></i></button>'
            +   '<button id="pv-send" style="width:80px;height:80px;border-radius:50%;border:none;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-size:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(76,175,80,0.5);"><i class="fas fa-paper-plane"></i></button>'
            + '</div>'
            + '<div style="margin-top:20px;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:1px;">点击 ✓ 发送 · 点击 ✕ 取消</div>';

        document.body.appendChild(ui);

        ui.querySelector('#pv-cancel').onclick = () => finishRecorder(true);
        ui.querySelector('#pv-send').onclick = () => finishRecorder(false);

        _recordingUI = ui;
        return ui;
    }

    function updateTime() {
        if (!_recordingUI) return;
        const el = _recordingUI.querySelector('#pv-rec-time');
        if (el) el.textContent = fmtTime((Date.now() - _startTime) / 1000);
    }

    function finishRecorder(cancelled) {
        _cancelled = !!cancelled;
        if (_timer) { clearInterval(_timer); _timer = null; }
        try {
            if (_mediaRecorder && _mediaRecorder.state === 'recording') {
                _mediaRecorder.stop();
            }
        } catch (e) {}
    }

    function cleanup() {
        try { if (_stream) _stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        _stream = null;
        _mediaRecorder = null;
        if (_timer) { clearInterval(_timer); _timer = null; }
        if (_recordingUI) _recordingUI.style.display = 'none';
    }

    window.PanelVoiceRecorder = {
        isSupported: function () {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
        },

        record: async function (callback) {
            if (!this.isSupported()) {
                if (typeof showNotification === 'function') showNotification('当前浏览器不支持录音', 'warning');
                return;
            }
            if (_mediaRecorder) {
                if (typeof showNotification === 'function') showNotification('正在录音中…', 'info', 1500);
                return;
            }

            _callback = callback;
            _cancelled = false;
            _chunks = [];

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
                if (typeof showNotification === 'function') showNotification('无法访问麦克风，请检查权限', 'error');
                _callback = null;
                return;
            }

            _stream = stream;
            const mime = pickMime();
            try {
                _mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
            } catch (e) {
                try { _mediaRecorder = new MediaRecorder(stream); }
                catch (e2) {
                    if (typeof showNotification === 'function') showNotification('录音初始化失败', 'error');
                    cleanup();
                    _callback = null;
                    return;
                }
            }

            _mediaRecorder.ondataavailable = function (e) {
                if (e.data && e.data.size > 0) _chunks.push(e.data);
            };

            _mediaRecorder.onstop = async function () {
                const duration = Math.max(1, Math.round((Date.now() - _startTime) / 1000));
                const cb = _callback;
                const wasCancelled = _cancelled;
                const mimeType = _mediaRecorder && _mediaRecorder.mimeType ? _mediaRecorder.mimeType : 'audio/webm';
                cleanup();
                _callback = null;

                if (wasCancelled || _chunks.length === 0) {
                    if (cb) cb(null, 0);
                    return;
                }

                try {
                    const blob = new Blob(_chunks, { type: mimeType });
                    if (blob.size < 800) {
                        if (typeof showNotification === 'function') showNotification('录音太短了', 'warning', 1500);
                        if (cb) cb(null, 0);
                        return;
                    }
                    const dataUrl = await blobToDataURL(blob);
                    if (cb) cb(dataUrl, duration);
                } catch (e) {
                    console.warn('[voice-recorder] 转换失败', e);
                    if (cb) cb(null, 0);
                }
            };

            _mediaRecorder.onerror = function () {
                if (typeof showNotification === 'function') showNotification('录音出错', 'error');
                const cb = _callback;
                cleanup();
                _callback = null;
                if (cb) cb(null, 0);
            };

            buildUI().style.display = 'flex';

            _startTime = Date.now();
            _timer = setInterval(updateTime, 200);
            updateTime();

            try { _mediaRecorder.start(); }
            catch (e) {
                if (typeof showNotification === 'function') showNotification('录音启动失败', 'error');
                cleanup();
                _callback = null;
                if (callback) callback(null, 0);
            }
        }
    };
})();