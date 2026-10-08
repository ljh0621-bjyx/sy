/* ==========================================================================
   partner-image.js (专属照片库 + 图生图配置界面，完美避开括号和拼接错误)
   ========================================================================== */
(function () {
    'use strict';

    const KEY = 'partnerImageLibrary_v1';

    let data = {
        library: [],       // 普通图库
        selfPhotos: [],    // 专属图库
        aiConfig: {
            apiBase: '',
            apiKey: '',
            model: 'cogview-3-flash',
            size: '1024x1024',
            img2imgApiBase: '',
            img2imgApiKey: '',
            img2imgModel: 'sd-webui'
        }
    };

    async function load() {
        try { const saved = await localforage.getItem(KEY); if (saved) data = Object.assign(data, saved); } catch (e) {}
    }
    async function save() {
        try { await localforage.setItem(KEY, data); } catch (e) {}
    }

    window.getRandomPartnerImage = function () {
        if (!data.library || data.library.length === 0) return null;
        return data.library[Math.floor(Math.random() * data.library.length)];
    };
    window.getRandomSelfPhoto = function () {
        if (!data.selfPhotos || data.selfPhotos.length === 0) return null;
        return data.selfPhotos[Math.floor(Math.random() * data.selfPhotos.length)];
    };
    window.uploadSelfPhoto = function (file) {
        return new Promise((resolve, reject) => {
            if (!file || file.size > 5 * 1024 * 1024) return reject('文件无效或过大');
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (!data.selfPhotos) data.selfPhotos = [];
                data.selfPhotos.push({ id: 'self_' + Date.now(), url: ev.target.result, addedAt: Date.now() });
                save(); resolve(ev.target.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    window.generateAIImage = async function (promptText) {
        const { apiBase, apiKey, model } = data.aiConfig;
        if (!apiBase || !apiKey || !promptText) return null;
        try {
            const resp = await fetch(apiBase + '/images/generations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: model || 'cogview-3-flash', prompt: promptText, n: 1, size: '1024x1024' })
            });
            if (!resp.ok) return null;
            const json = await resp.json();
            return json.data[0].b64_json ? 'data:image/png;base64,' + json.data[0].b64_json : json.data[0].url;
        } catch (err) { return null; }
    };

    window.generateAIImageWithReference = async function (promptText, referenceImageBase64) {
        const { img2imgApiBase, img2imgApiKey, img2imgModel } = data.aiConfig;
        if (!img2imgApiBase || !img2imgApiKey || !promptText || !referenceImageBase64) return null;
        try {
            const formData = new FormData();
            formData.append('model', img2imgModel || 'sd-webui');
            formData.append('prompt', promptText);
            formData.append('image', referenceImageBase64);
            formData.append('n', '1');
            formData.append('size', '1024x1024');

            const resp = await fetch(img2imgApiBase + '/images/generations', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + img2imgApiKey },
                body: formData
            });
            if (!resp.ok) return null;
            const json = await resp.json();
            return json.data[0].b64_json ? 'data:image/png;base64,' + json.data[0].b64_json : json.data[0].url;
        } catch (err) { return null; }
    };

    window.openPartnerImagePanel = function () {
        const old = document.getElementById('partner-image-panel');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'partner-image-panel';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';

        modal.innerHTML = '<div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:92%;max-width:440px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.4);">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
            +   '<span style="font-size:16px;font-weight:700;color:var(--text-primary);"><i class="fas fa-images" style="color:var(--accent-color);margin-right:8px;"></i>对方图片库</span>'
            +   '<button id="pi-close" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:18px;"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div style="margin-bottom:14px;padding:12px;background:rgba(var(--accent-color-rgb),0.05);border-radius:12px;border:1px dashed rgba(var(--accent-color-rgb),0.3);">'
            +   '<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:8px;"><i class="fas fa-user-circle" style="color:var(--accent-color);"></i> 他的专属照片（自拍/他拍）</div>'
            +   '<button id="pi-upload-self" style="width:100%;padding:10px;border:1.5px solid var(--accent-color);border-radius:12px;background:var(--accent-color);color:#fff;font-size:12px;cursor:pointer;font-family:var(--font-family);"><i class="fas fa-upload"></i> 上传他的照片</button>'
            +   '<div id="pi-self-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;"></div>'
            + '</div>'
            + '<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">普通图片库 (<span id="pi-count">0</span>)</div>'
            + '<button id="pi-upload" style="width:100%;padding:10px;border:1.5px dashed var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:12px;cursor:pointer;font-family:var(--font-family);margin-bottom:12px;"><i class="fas fa-upload"></i> 上传本地图片</button>'
            + '<div id="pi-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;"></div>'
            + '<div style="background:var(--primary-bg);border-radius:12px;padding:14px;border:1px solid var(--border-color);">'
            +   '<div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:10px;">AI 生图配置</div>'
            +   '<input id="pi-api-base" placeholder="API 地址（例如 https://open.bigmodel.cn/api/paas/v4）" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            +   '<input id="pi-api-key" placeholder="API Key" type="password" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            +   '<input id="pi-model" placeholder="模型（例如 cogview-3-flash）" value="cogview-3-flash" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            + '</div>'
            + '</div>';
        document.body.appendChild(modal);

        // ★ 动态注入图生图配置（解决因为手机端复制导致的格式错乱）
        if (document.getElementById('pi-api-key') && !document.getElementById('pi-img2img-api-base')) {
            document.getElementById('pi-api-key').insertAdjacentHTML('afterend', `
                <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:10px;margin-top:14px;">图生图配置（保留同一张脸换姿势）</div>
                <input id="pi-img2img-api-base" placeholder="图生图 API 地址（例如 http://127.0.0.1:7860/sdapi/v1）" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
                <input id="pi-img2img-api-key" placeholder="图生图 API Key" type="password" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
                <input id="pi-img2img-model" placeholder="模型（例如 sd-webui）" value="sd-webui" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
            `);
        }

        const apiBaseInput = document.getElementById('pi-api-base');
        const apiKeyInput = document.getElementById('pi-api-key');
        const modelInput = document.getElementById('pi-model');
        const img2imgBaseInput = document.getElementById('pi-img2img-api-base');
        const img2imgKeyInput = document.getElementById('pi-img2img-api-key');
        const img2imgModelInput = document.getElementById('pi-img2img-model');

        if (apiBaseInput) apiBaseInput.value = data.aiConfig.apiBase || '';
        if (apiKeyInput) apiKeyInput.value = data.aiConfig.apiKey || '';
        if (modelInput) modelInput.value = data.aiConfig.model || 'cogview-3-flash';
        if (img2imgBaseInput) img2imgBaseInput.value = data.aiConfig.img2imgApiBase || '';
        if (img2imgKeyInput) img2imgKeyInput.value = data.aiConfig.img2imgApiKey || '';
        if (img2imgModelInput) img2imgModelInput.value = data.aiConfig.img2imgModel || 'sd-webui';

        const saveAllConfig = () => {
            data.aiConfig = {
                ...data.aiConfig,
                apiBase: apiBaseInput ? apiBaseInput.value.trim() : '',
                apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
                model: modelInput ? modelInput.value.trim() || 'cogview-3-flash' : 'cogview-3-flash',
                img2imgApiBase: img2imgBaseInput ? img2imgBaseInput.value.trim() : '',
                img2imgApiKey: img2imgKeyInput ? img2imgKeyInput.value.trim() : '',
                img2imgModel: img2imgModelInput ? img2imgModelInput.value.trim() || 'sd-webui' : 'sd-webui'
            };
            save();
        };

        if (apiBaseInput) apiBaseInput.addEventListener('change', saveAllConfig);
        if (apiKeyInput) apiKeyInput.addEventListener('change', saveAllConfig);
        if (modelInput) modelInput.addEventListener('change', saveAllConfig);
        if (img2imgBaseInput) img2imgBaseInput.addEventListener('change', saveAllConfig);
        if (img2imgKeyInput) img2imgKeyInput.addEventListener('change', saveAllConfig);
        if (img2imgModelInput) img2imgModelInput.addEventListener('change', saveAllConfig);

        function renderSelfGrid() {
            const grid = document.getElementById('pi-self-grid');
            if (!grid) return;
            if (!data.selfPhotos || data.selfPhotos.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--text-secondary);font-size:11px;">暂无专属照片，请上传</div>';
                return;
            }
            grid.innerHTML = data.selfPhotos.map((item, i) => `
                <div style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:1px solid var(--border-color);">
                    <img src="${item.url}" style="width:100%;height:100%;object-fit:cover;">
                    <button data-del-self="${i}" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>
            `).join('');
            grid.querySelectorAll('[data-del-self]').forEach(btn => {
                btn.onclick = () => { data.selfPhotos.splice(parseInt(btn.dataset.delSelf), 1); save(); renderSelfGrid(); };
            });
        }

        function renderGrid() {
            const grid = document.getElementById('pi-grid');
            const countEl = document.getElementById('pi-count');
            if (!grid || !countEl) return;
            countEl.textContent = data.library.length;
            if (data.library.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--text-secondary);font-size:11px;">图库为空</div>';
                return;
            }
            grid.innerHTML = data.library.map((item, i) => `
                <div style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:1px solid var(--border-color);background:var(--primary-bg);">
                    <img src="${item.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                    <button data-del="${i}" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>
            `).join('');
            grid.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = () => { data.library.splice(parseInt(btn.dataset.del, 10), 1); save(); renderGrid(); };
            });
        }

        document.getElementById('pi-upload-self').onclick = function() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
            input.onchange = async function(e) {
                for (const file of Array.from(e.target.files)) { try { await window.uploadSelfPhoto(file); } catch (err) {} }
                renderSelfGrid();
                if (typeof showNotification === 'function') showNotification('✓ 专属照片已添加', 'success');
            };
            input.click();
        };

        document.getElementById('pi-upload').onclick = function() {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
            input.onchange = async function(e) {
                for (const file of Array.from(e.target.files)) {
                    if (file.size > 5 * 1024 * 1024) { continue; }
                    try {
                        const base64 = await optimizeImage(file, 800, 0.85);
                        data.library.push({ id: 'pi_' + Date.now(), url: base64, source: 'upload', addedAt: Date.now() });
                    } catch (err) {}
                }
                await save(); renderGrid();
                if (typeof showNotification === 'function') showNotification('已添加图片', 'success');
            };
            input.click();
        };

        document.getElementById('pi-close').onclick = function() { modal.remove(); };
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

        renderGrid(); renderSelfGrid();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else { load(); }
})();
