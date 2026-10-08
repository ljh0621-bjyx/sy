/* ==========================================================================
   partner-image.js (图库、专属照片、AI生图、图生图)
   ========================================================================== */
(function () {
    'use strict';

    const KEY = 'partnerImageLibrary_v1';
    let data = {
        library: [],
        selfPhotos: [],
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

    async function load() { try { const s = await localforage.getItem(KEY); if (s) data = Object.assign(data, s); } catch (e) {} }
    async function save() { try { await localforage.setItem(KEY, data); } catch (e) {} }

    window.getRandomPartnerImage = function () { return (data.library && data.library.length > 0) ? data.library[Math.floor(Math.random() * data.library.length)] : null; };
    window.getRandomSelfPhoto = function () { return (data.selfPhotos && data.selfPhotos.length > 0) ? data.selfPhotos[Math.floor(Math.random() * data.selfPhotos.length)] : null; };

    window.uploadSelfPhoto = function (file) {
        return new Promise((resolve, reject) => {
            if (!file || file.size > 5 * 1024 * 1024) return reject('无效文件');
            const r = new FileReader();
            r.onload = (ev) => {
                if (!data.selfPhotos) data.selfPhotos = [];
                data.selfPhotos.push({ id: 'self_' + Date.now(), url: ev.target.result, addedAt: Date.now() });
                save(); resolve(ev.target.result);
            };
            r.onerror = reject;
            r.readAsDataURL(file);
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
            const j = await resp.json();
            return j.data[0].b64_json ? 'data:image/png;base64,' + j.data[0].b64_json : j.data[0].url;
        } catch (e) { return null; }
    };

    window.generateAIImageWithReference = async function (promptText, refImage) {
    const { apiBase, apiKey } = data.aiConfig;
    if (!apiBase || !apiKey || !promptText) return null;

    try {
        const body = {
            model: 'cogview-4',
            prompt: promptText,
            size: '1024x1024'
        };
        if (refImage) {
            body.image = refImage;
        }

        const resp = await fetch(apiBase + '/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error('[图生图] 错误：', resp.status, errText);
            return null;
        }

        const j = await resp.json();
        if (!j.data || !j.data[0]) return null;
        return j.data[0].b64_json
            ? 'data:image/png;base64,' + j.data[0].b64_json
            : j.data[0].url;
    } catch (e) {
        console.error('[图生图] 失败', e);
        return null;
    }
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
            +   '<input id="pi-api-base" placeholder="API 地址" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            +   '<input id="pi-api-key" placeholder="API Key" type="password" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            +   '<input id="pi-model" placeholder="模型" value="cogview-3-flash" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">'
            + '</div>'
            + '</div>';
        document.body.appendChild(modal);

        // 动态注入图生图配置
        if (document.getElementById('pi-api-key') && !document.getElementById('pi-img2img-api-base')) {
            document.getElementById('pi-api-key').insertAdjacentHTML('afterend', `
                <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:10px;margin-top:14px;">图生图配置（保留同一张脸换姿势）</div>
                <input id="pi-img2img-api-base" placeholder="图生图 API 地址" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
                <input id="pi-img2img-api-key" placeholder="图生图 API Key" type="password" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
                <input id="pi-img2img-model" placeholder="模型" value="sd-webui" style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;">
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

        const saveAll = () => {
            data.aiConfig.apiBase = apiBaseInput ? apiBaseInput.value.trim() : '';
            data.aiConfig.apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
            data.aiConfig.model = modelInput ? modelInput.value.trim() : 'cogview-3-flash';
            data.aiConfig.img2imgApiBase = img2imgBaseInput ? img2imgBaseInput.value.trim() : '';
            data.aiConfig.img2imgApiKey = img2imgKeyInput ? img2imgKeyInput.value.trim() : '';
            data.aiConfig.img2imgModel = img2imgModelInput ? img2imgModelInput.value.trim() : 'sd-webui';
            save();
        };
        if (apiBaseInput) apiBaseInput.addEventListener('change', saveAll);
        if (apiKeyInput) apiKeyInput.addEventListener('change', saveAll);
        if (modelInput) modelInput.addEventListener('change', saveAll);
        if (img2imgBaseInput) img2imgBaseInput.addEventListener('change', saveAll);
        if (img2imgKeyInput) img2imgKeyInput.addEventListener('change', saveAll);
        if (img2imgModelInput) img2imgModelInput.addEventListener('change', saveAll);

        function renderSelfGrid() {
            const g = document.getElementById('pi-self-grid');
            if (!g) return;
            if (!data.selfPhotos || data.selfPhotos.length === 0) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--text-secondary);font-size:11px;">暂无专属照片</div>'; return; }
            g.innerHTML = data.selfPhotos.map((item, i) => `
                <div style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:1px solid var(--border-color);">
                    <img src="${item.url}" style="width:100%;height:100%;object-fit:cover;">
                    <button data-del-self="${i}" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>`).join('');
            g.querySelectorAll('[data-del-self]').forEach(b => { b.onclick = () => { data.selfPhotos.splice(parseInt(b.dataset.delSelf), 1); save(); renderSelfGrid(); }; });
        }

        function renderGrid() {
            const g = document.getElementById('pi-grid');
            const c = document.getElementById('pi-count');
            if (!g || !c) return;
            c.textContent = data.library.length;
            if (data.library.length === 0) { g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--text-secondary);font-size:11px;">图库为空</div>'; return; }
            g.innerHTML = data.library.map((item, i) => `
                <div style="position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:1px solid var(--border-color);">
                    <img src="${item.url}" style="width:100%;height:100%;object-fit:cover;">
                    <button data-del="${i}" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>`).join('');
            g.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { data.library.splice(parseInt(b.dataset.del, 10), 1); save(); renderGrid(); }; });
        }

        document.getElementById('pi-upload-self').onclick = function() {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
            inp.onchange = async (e) => { for (const f of Array.from(e.target.files)) { try { await window.uploadSelfPhoto(f); } catch (err) {} } renderSelfGrid(); if (typeof showNotification === 'function') showNotification('✓ 已添加', 'success'); };
            inp.click();
        };
        document.getElementById('pi-upload').onclick = function() {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
            inp.onchange = async (e) => {
                for (const f of Array.from(e.target.files)) {
                    if (f.size > 5 * 1024 * 1024) continue;
                    try { const b64 = await optimizeImage(f, 800, 0.85); data.library.push({ id: 'pi_' + Date.now(), url: b64, source: 'upload', addedAt: Date.now() }); } catch (err) {}
                }
                await save(); renderGrid(); if (typeof showNotification === 'function') showNotification('已添加', 'success');
            };
            inp.click();
        };

        document.getElementById('pi-close').onclick = function() { modal.remove(); };
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        renderGrid(); renderSelfGrid();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
})();