// ========== 锁屏 ==========
function renderLockScreen(screen, modal) {
    // 被锁状态
    if (isPhoneLockedNow()) {
        const remainMs = data.lockedUntil - Date.now();
        const remainMin = Math.ceil(remainMs / 60000);
        screen.innerHTML =
            '<div style="min-height:440px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;text-align:center;">'
            +   '<div style="font-size:56px;margin-bottom:20px;filter:grayscale(0.5);">🔒</div>'
            +   '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:10px;">他发现了</div>'
            +   '<div style="font-size:12.5px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:20px;">'
            +     '他好像察觉到有人在看他的手机。<br>暂时打不开了。'
            +   '</div>'
            +   '<div style="font-size:13px;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);padding:10px 18px;border-radius:12px;">'
            +     '还需 ' + remainMin + ' 分钟'
            +   '</div>'
            + '</div>';
        return;
    }

    // 30% 直接进
    if (Math.random() < 0.30) {
        renderHome(screen, modal);
        return;
    }

    // 生成 4 位密码（每次都不一样）
    const secret = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    // ===== 阶段 1：他快速输入密码 =====
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const dateStr = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

    // 拨号盘键盘（仿真实手机）
    function buildDialPad(placeholderLabel) {
        return ''
        + '<div style="text-align:center;margin-top:14px;">'
        +   '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
        +   '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr + '</div>'
        + '</div>'

        + '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:18px;letter-spacing:0.5px;">' + placeholderLabel + '</div>'

        // 4 个圆点
        + '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:16px;">'
        +   [0,1,2,3].map(function (i) {
                return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
            }).join('')
        + '</div>'

        // ====== 拨号盘 ======
        + '<div id="hp-dialpad" style="margin-top:12px;display:flex;flex-direction:column;align-items:center;">'

        // 3×4 圆形按键网格
        +   '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
        +     [
                { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                { n:'✱', l:'﹡' }, { n:'0', l:'﹢' }, { n:'#', l:'﹟' }
            ].map(function (k) {
                var isSpecial = (k.n === '✱' || k.n === '#');
                return '<div class="hp-key" data-k="' + k.n + '" style="'
                    + 'width:64px;height:64px;border-radius:50%;background:#2c2c2e;'
                    + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                    + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                    + 'color:#fff;'
                + '">'
                +   '<span style="font-size:' + (isSpecial ? '24px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;">' + k.n + '</span>'
                +   '<span style="font-size:7.5px;font-weight:500;color:rgba(255,255,255,0.55);letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                + '</div>';
            }).join('')
        +   '</div>'

        // 底部双卡 + 退格
        +   '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;width:100%;max-width:280px;">'
        +     '<div class="hp-sim-btn" data-sim="1" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:#3a7bd5;border:none;border-radius:40px;padding:11px 8px;color:#fff;font-size:12px;font-weight:500;cursor:pointer;user-select:none;min-height:48px;transition:all 0.1s ease;">'
        +       '<span style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.25);border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;">1</span>'
        +       '<i class="fas fa-phone-alt" style="font-size:13px;"></i>'
        +       '<span style="font-size:11px;">中国联通1</span>'
        +     '</div>'
        +     '<div class="hp-sim-btn" data-sim="2" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:#3a7bd5;border:none;border-radius:40px;padding:11px 8px;color:#fff;font-size:12px;font-weight:500;cursor:pointer;user-select:none;min-height:48px;transition:all 0.1s ease;">'
        +       '<span style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.25);border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;">2</span>'
        +       '<i class="fas fa-phone-alt" style="font-size:13px;"></i>'
        +       '<span style="font-size:11px;">中国广电2</span>'
        +     '</div>'
        +     '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
        +   '</div>'

        + '</div>'

        + '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:14px;height:14px;letter-spacing:0.5px;">' + (placeholderLabel === '他正在输入…' ? '看仔细了' : '凭记忆输入') + '</div>';
    }

    screen.innerHTML = '<div style="min-height:440px;display:flex;flex-direction:column;padding:8px 8px 0;">'
        + buildDialPad('他正在输入…')
        + '</div>';

    const dots = screen.querySelectorAll('.hp-pwd-circle');
    const keys = screen.querySelectorAll('.hp-key');
    const simBtns = screen.querySelectorAll('.hp-sim-btn');

    function setDotsFilled(n) {
        dots.forEach(function (d, i) {
            if (i < n) {
                d.style.background = '#fff';
                d.style.borderColor = '#fff';
                d.style.transform = 'scale(1.15)';
                setTimeout(function () { d.style.transform = 'scale(1)'; }, 120);
            } else {
                d.style.background = 'transparent';
                d.style.borderColor = 'rgba(255,255,255,0.35)';
            }
        });
    }

    function flashKey(k) {
        const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
        if (!el) return;
        var isBack = (k === '⌫');
        el.style.background = isBack ? 'rgba(255,255,255,0.15)' : '#3a3a3c';
        el.style.transform = 'scale(0.92)';
        setTimeout(function () {
            el.style.background = isBack ? 'transparent' : '#2c2c2e';
            el.style.transform = 'scale(1)';
        }, 100);
    }

    // 他一个数字一个数字地按
    let i = 0;
    function partnerPress() {
        if (!document.body.contains(screen)) return;
        if (i >= 4) {
            // 4 个都按完了，停留 1 秒然后清空
            setTimeout(function () {
                if (!document.body.contains(screen)) return;
                setDotsFilled(0);
                // 进入你自己的输入阶段
                showInputScreen(screen, modal, secret, hh, mm, dateStr);
            }, 1000);
            return;
        }
        const k = secret[i];
        flashKey(k);
        setDotsFilled(i + 1);
        i++;
        // 350ms 一下（中）
        setTimeout(partnerPress, 350);
    }
    setTimeout(partnerPress, 500);
}

// ===== 阶段 2：你来输入 =====
function showInputScreen(screen, modal, secret, hh, mm, dateStr) {
    const now = new Date();
    const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
    const dateStr2 = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + weekdays[now.getDay()];

    screen.innerHTML =
        '<div style="min-height:440px;display:flex;flex-direction:column;padding:8px 8px 0;">'

        +   '<div style="text-align:center;margin-top:14px;">'
        +     '<div style="font-size:58px;font-weight:200;color:#fff;letter-spacing:-2px;line-height:1;font-family:-apple-system,sans-serif;">' + hh + ':' + mm + '</div>'
        +     '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:10px;letter-spacing:1px;">' + dateStr2 + '</div>'
        +   '</div>'

        +   '<div style="text-align:center;font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:18px;letter-spacing:0.5px;">该你了</div>'

        +   '<div id="hp-pwd-dots" style="display:flex;justify-content:center;gap:16px;margin-top:16px;">'
        +     [0,1,2,3].map(function (i) {
                return '<div class="hp-pwd-circle" data-i="' + i + '" style="width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid rgba(255,255,255,0.35);transition:all 0.15s ease;"></div>';
            }).join('')
        +   '</div>'

        // ====== 拨号盘 ======
        +   '<div id="hp-dialpad" style="margin-top:12px;display:flex;flex-direction:column;align-items:center;">'

        +     '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:280px;">'
        +       [
                { n:'1', l:'' }, { n:'2', l:'ABC' }, { n:'3', l:'DEF' },
                { n:'4', l:'GHI' }, { n:'5', l:'JKL' }, { n:'6', l:'MNO' },
                { n:'7', l:'PQRS' }, { n:'8', l:'TUV' }, { n:'9', l:'WXYZ' },
                { n:'✱', l:'﹡' }, { n:'0', l:'﹢' }, { n:'#', l:'﹟' }
            ].map(function (k) {
                var isSpecial = (k.n === '✱' || k.n === '#');
                return '<div class="hp-key" data-k="' + k.n + '" style="'
                    + 'width:64px;height:64px;border-radius:50%;background:#2c2c2e;'
                    + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
                    + 'margin:0 auto;cursor:pointer;transition:all 0.1s ease;user-select:none;'
                    + 'color:#fff;'
                + '">'
                +   '<span style="font-size:' + (isSpecial ? '24px' : '28px') + ';font-weight:400;line-height:1;margin-bottom:1px;">' + k.n + '</span>'
                +   '<span style="font-size:7.5px;font-weight:500;color:rgba(255,255,255,0.55);letter-spacing:1.2px;text-transform:uppercase;line-height:1;">' + k.l + '</span>'
                + '</div>';
            }).join('')
        +     '</div>'

        +     '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;width:100%;max-width:280px;">'
        +       '<div class="hp-sim-btn" data-sim="1" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:#3a7bd5;border:none;border-radius:40px;padding:11px 8px;color:#fff;font-size:12px;font-weight:500;cursor:pointer;user-select:none;min-height:48px;transition:all 0.1s ease;">'
        +         '<span style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.25);border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;">1</span>'
        +         '<i class="fas fa-phone-alt" style="font-size:13px;"></i>'
        +         '<span style="font-size:11px;">中国联通1</span>'
        +       '</div>'
        +       '<div class="hp-sim-btn" data-sim="2" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:#3a7bd5;border:none;border-radius:40px;padding:11px 8px;color:#fff;font-size:12px;font-weight:500;cursor:pointer;user-select:none;min-height:48px;transition:all 0.1s ease;">'
        +         '<span style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.25);border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;">2</span>'
        +         '<i class="fas fa-phone-alt" style="font-size:13px;"></i>'
        +         '<span style="font-size:11px;">中国广电2</span>'
        +       '</div>'
        +       '<div class="hp-key" data-k="⌫" style="width:44px;height:44px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.1s ease;user-select:none;color:#fff;font-size:20px;">⌫</div>'
        +     '</div>'

        +   '</div>'

        +   '<div id="hp-hint-msg" style="text-align:center;font-size:11px;color:rgba(255,255,255,0.35);margin-top:14px;height:14px;letter-spacing:0.5px;">'
        +     '输错就直接被发现'
        +   '</div>'

        + '</div>';

    let input = '';
    const dots = screen.querySelectorAll('.hp-pwd-circle');
    const keys = screen.querySelectorAll('.hp-key');
    const simBtns = screen.querySelectorAll('.hp-sim-btn');
    const msgEl = screen.querySelector('#hp-hint-msg');

    function refreshDots() {
        dots.forEach(function (d, i) {
            if (i < input.length) {
                d.style.background = '#fff';
                d.style.borderColor = '#fff';
            } else {
                d.style.background = 'transparent';
                d.style.borderColor = 'rgba(255,255,255,0.35)';
            }
        });
    }

    function flashKey(k) {
        const el = Array.from(keys).find(function (x) { return x.dataset.k === k; });
        if (!el) return;
        var isBack = (k === '⌫');
        el.style.background = isBack ? 'rgba(255,255,255,0.15)' : '#3a3a3c';
        el.style.transform = 'scale(0.92)';
        setTimeout(function () {
            el.style.background = isBack ? 'transparent' : '#2c2c2e';
            el.style.transform = 'scale(1)';
        }, 100);
    }

    function tryUnlock() {
        if (input.length !== 4) return;
        if (input === secret) {
            msgEl.style.color = '#7BC8A4';
            msgEl.textContent = '✓ 解锁成功';
            setTimeout(function () {
                screen.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                screen.style.opacity = '0';
                screen.style.transform = 'translateY(-30px)';
                setTimeout(function () {
                    screen.style.transition = '';
                    screen.style.opacity = '';
                    screen.style.transform = '';
                    renderHome(screen, modal);
                }, 350);
            }, 400);
        } else {
            // 直接锁
            msgEl.style.color = '#FF6B6B';
            msgEl.textContent = '……被发现了';
            data.lockedUntil = Date.now() + 60 * 60 * 1000;
            save();

            // 屏幕闪红一下
            screen.style.transition = 'background 0.15s';
            screen.style.background = 'rgba(180,40,40,0.4)';
            setTimeout(function () {
                screen.style.background = '';
                screen.style.transition = 'opacity 0.5s ease';
                screen.style.opacity = '0';
                setTimeout(function () {
                    screen.style.opacity = '';
                    screen.style.transition = '';
                    renderLockScreen(screen, modal);
                }, 500);
            }, 200);
        }
    }

    keys.forEach(function (el) {
        el.addEventListener('mousedown', function () {
            var k = el.dataset.k;
            var isBack = (k === '⌫');
            el.style.transform = 'scale(0.94)';
            el.style.background = isBack ? 'rgba(255,255,255,0.2)' : '#3a3a3c';
        });
        el.addEventListener('mouseup', function () {
            var k = el.dataset.k;
            var isBack = (k === '⌫');
            el.style.transform = 'scale(1)';
            el.style.background = isBack ? 'transparent' : '#2c2c2e';
        });
        el.addEventListener('mouseleave', function () {
            var k = el.dataset.k;
            var isBack = (k === '⌫');
            el.style.transform = 'scale(1)';
            el.style.background = isBack ? 'transparent' : '#2c2c2e';
        });
        el.addEventListener('click', function () {
            const k = el.dataset.k;
            flashKey(k);
            if (k === '⌫') {
                input = input.slice(0, -1);
            } else if (/^[0-9✱#]$/.test(k)) {
                if (input.length < 4) input += k;
            }
            refreshDots();
            if (input.length === 4) {
                setTimeout(tryUnlock, 150);
            }
        });
    });

    // 双卡按钮（纯装饰）
    simBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var sim = btn.dataset.sim;
            msgEl.style.color = 'rgba(255,255,255,0.5)';
            msgEl.textContent = '📞 拨号中…（' + (sim === '1' ? '中国联通1' : '中国广电2') + '）';
            setTimeout(function () {
                if (msgEl.textContent.indexOf('拨号中') !== -1) {
                    msgEl.style.color = 'rgba(255,255,255,0.35)';
                    msgEl.textContent = '输错就直接被发现';
                }
            }, 1200);
        });
    });
}