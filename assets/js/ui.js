/**
 * ui.js — Interface Controller
 * Boot sequence, waveform visualizer, log, sliders, clock, buttons
 */

(function () {

    /* ── DOM refs ────────────────────────────────────────────── */
    const bootScreen    = document.getElementById('bootScreen');
    const bootLines     = document.getElementById('bootLines');
    const bootProgress  = document.getElementById('bootProgress');
    const bootStatusEl  = document.getElementById('bootStatus');
    const app           = document.getElementById('app');

    const clockEl       = document.getElementById('clock');
    const statusDisplay = document.getElementById('statusDisplay');
    const updatesPerSec = document.getElementById('updatesPerSec');
    const totalUpdatesEl= document.getElementById('totalUpdates');
    const sessionTimeEl = document.getElementById('sessionTime');
    const statusBlink   = document.getElementById('statusBlink');

    const burstSlider   = document.getElementById('burstSlider');
    const intervalSlider= document.getElementById('intervalSlider');
    const burstValueEl  = document.getElementById('burstValue');
    const intervalValueEl=document.getElementById('intervalValue');

    const startBtn      = document.getElementById('startBtn');
    const stopBtn       = document.getElementById('stopBtn');

    const logBody       = document.getElementById('logBody');
    const clearLogBtn   = document.getElementById('clearLog');

    const waveCanvas    = document.getElementById('waveCanvas');
    const waveCtx       = waveCanvas.getContext('2d');

    const threatBar     = document.getElementById('threatBar');

    /* ── Waveform ────────────────────────────────────────────── */
    let waveData  = new Array(80).fill(0);
    let waveAnim  = null;
    let attacking = false;

    function resizeWave() {
        waveCanvas.width = waveCanvas.parentElement.clientWidth - 32;
    }

    function drawWave() {
        const W = waveCanvas.width;
        const H = waveCanvas.height;
        waveCtx.clearRect(0, 0, W, H);

        // Shift wave left
        waveData.shift();
        if (attacking) {
            waveData.push(Math.random() * (H * 0.85) + H * 0.05);
        } else {
            // Flat-line with small noise
            waveData.push(H / 2 + (Math.random() - 0.5) * 4);
        }

        // Draw
        waveCtx.beginPath();
        const step = W / (waveData.length - 1);
        waveCtx.moveTo(0, waveData[0]);
        for (let i = 1; i < waveData.length; i++) {
            waveCtx.lineTo(i * step, waveData[i]);
        }

        waveCtx.strokeStyle = attacking ? '#ff0a0a' : '#440000';
        waveCtx.lineWidth   = attacking ? 1.5 : 1;
        waveCtx.shadowColor = attacking ? '#ff0000' : 'transparent';
        waveCtx.shadowBlur  = attacking ? 6 : 0;
        waveCtx.stroke();

        // Horizontal center line
        waveCtx.beginPath();
        waveCtx.moveTo(0, H / 2);
        waveCtx.lineTo(W, H / 2);
        waveCtx.strokeStyle = 'rgba(100,0,0,0.2)';
        waveCtx.lineWidth   = 0.5;
        waveCtx.shadowBlur  = 0;
        waveCtx.stroke();

        waveAnim = requestAnimationFrame(drawWave);
    }

    /* ── Log ──────────────────────────────────────────────────── */
    let logCount = 0;
    const MAX_LOG = 120;

    const LOG_TEMPLATES_ATTACK = [
        '[ATK] Injecting payload burst — {n} requests',
        '[ATK] DOM title mutation cycle #{c}',
        '[ATK] Flooding render pipeline...',
        '[ATK] Browser thread saturation: {p}%',
        '[ATK] Memory spike detected — {m}MB pressure',
        '[ATK] Event loop stall induced',
        '[ATK] Crash vector active — monitoring...',
        '[ATK] Throttle bypass attempted',
    ];

    function addLog(text, type = 'log-sys') {
        if (logCount > MAX_LOG) {
            // Remove oldest lines
            while (logBody.children.length > MAX_LOG) {
                logBody.removeChild(logBody.firstChild);
            }
        }
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `[${timestamp()}] ${text}`;
        logBody.appendChild(line);
        logBody.scrollTop = logBody.scrollHeight;
        logCount++;
    }

    function timestamp() {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    let logInterval = null;

    function startLogStream() {
        let cycle = 0;
        logInterval = setInterval(() => {
            cycle++;
            const tpl = LOG_TEMPLATES_ATTACK[Math.floor(Math.random() * LOG_TEMPLATES_ATTACK.length)];
            const msg = tpl
                .replace('{n}', (parseInt(burstSlider.value)).toLocaleString())
                .replace('{c}', cycle)
                .replace('{p}', Math.floor(Math.random() * 30 + 70))
                .replace('{m}', Math.floor(Math.random() * 200 + 50));
            addLog(msg, 'log-atk');
        }, 800 + Math.random() * 600);
    }

    function stopLogStream() {
        clearInterval(logInterval);
        logInterval = null;
    }

    clearLogBtn.addEventListener('click', () => {
        logBody.innerHTML = '';
        logCount = 0;
        addLog('Log cleared.', 'log-sys');
    });

    /* ── Clock ───────────────────────────────────────────────── */
    function updateClock() {
        clockEl.textContent = new Date().toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
    setInterval(updateClock, 1000);
    updateClock();

    /* ── Session Timer ───────────────────────────────────────── */
    function formatSession(s) {
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${h}:${m}:${sec}`;
    }

    /* ── Sliders ──────────────────────────────────────────────── */
    function formatBurst(v) {
        return parseInt(v) >= 1000
            ? (parseInt(v) / 1000).toFixed(1) + 'K'
            : v;
    }

    burstSlider.addEventListener('input', () => {
        burstValueEl.textContent = formatBurst(burstSlider.value);
        updateThreat();
    });

    intervalSlider.addEventListener('input', () => {
        intervalValueEl.textContent = intervalSlider.value;
        updateThreat();
    });

    function updateThreat() {
        const level = ExploitEngine.getThreatLevel();
        threatBar.style.width = Math.max(5, level) + '%';

        if (level < 30) {
            threatBar.style.background = 'linear-gradient(to right, #440000, #880000)';
        } else if (level < 65) {
            threatBar.style.background = 'linear-gradient(to right, #660000, #cc2200)';
        } else {
            threatBar.style.background = 'linear-gradient(to right, #880000, #ff0000)';
            threatBar.style.boxShadow  = '0 0 16px rgba(255,0,0,0.7)';
        }
    }

    /* ── Presets ──────────────────────────────────────────────── */
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const p = ExploitEngine.PRESETS[btn.dataset.preset];
            burstSlider.value    = p.burst;
            intervalSlider.value = p.interval;
            burstValueEl.textContent    = formatBurst(p.burst);
            intervalValueEl.textContent = p.interval;
            updateThreat();

            addLog(`Preset loaded: ${btn.dataset.preset.toUpperCase()} — burst=${p.burst} interval=${p.interval}ms`, 'log-warn');
        });
    });

    /* ── Attack Callback ─────────────────────────────────────── */
    function onEngineEvent(ev) {
        switch (ev.type) {

            case 'start':
                addLog(`Attack started — burst=${ev.burst} interval=${ev.interval}ms`, 'log-atk');
                addLog('Exploit engine armed. Payload delivery active.', 'log-atk');
                statusDisplay.textContent = 'ATTACKING';
                statusDisplay.className   = 'stat-value attacking';
                startBtn.textContent = '⚡ RUNNING...';
                startBtn.classList.add('running');
                startBtn.disabled = true;
                stopBtn.disabled  = false;
                statusBlink.classList.add('active');
                attacking = true;
                startLogStream();
                break;

            case 'stats':
                updatesPerSec.textContent = ev.updatesPerSec.toLocaleString();
                break;

            case 'tick':
                totalUpdatesEl.textContent = ev.totalUpdates.toLocaleString();
                break;

            case 'session':
                sessionTimeEl.textContent = formatSession(ev.sessionSeconds);
                break;

            case 'stop':
                addLog(`Attack terminated. Total: ${ev.totalUpdates.toLocaleString()} updates.`, 'log-ok');
                statusDisplay.textContent = 'IDLE';
                statusDisplay.className   = 'stat-value idle';
                startBtn.innerHTML = '<span class="btn-fire-inner"><span class="btn-fire-icon">⚡</span><span class="btn-fire-text">EXECUTE ATTACK</span></span>';
                startBtn.classList.remove('running');
                startBtn.disabled = false;
                stopBtn.disabled  = true;
                statusBlink.classList.remove('active');
                updatesPerSec.textContent = '0';
                attacking = false;
                stopLogStream();
                break;
        }
    }

    /* ── Buttons ─────────────────────────────────────────────── */
    startBtn.addEventListener('click', () => ExploitEngine.start(onEngineEvent));
    stopBtn.addEventListener('click',  () => ExploitEngine.stop(onEngineEvent));

    /* ═══════════════════════════════════════════════════════════
       BOOT SEQUENCE
    ═══════════════════════════════════════════════════════════ */
    const BOOT_MESSAGES = [
        '[BIOS] CrashVault firmware v3.7.1 loading...',
        '[MEM]  Allocating exploit buffers............... OK',
        '[NET]  Tor bridge handshake.................... SKIP',
        '[FS]   Mounting volatile payload storage........ OK',
        '[ENG]  Browser fingerprint scanner.............. OK',
        '[ENG]  DOM mutation engine...................... OK',
        '[ENG]  Render pipeline exploit loaded........... OK',
        '[SEC]  Anti-forensics module.................... OK',
        '[WARN] Unauthorized access is prohibited',
        '[SYS]  All systems nominal. Awaiting operator.',
    ];

    let bootIdx = 0;
    let progress = 0;

    function bootStep() {
        if (bootIdx >= BOOT_MESSAGES.length) {
            bootStatusEl.textContent = 'READY';
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                app.classList.add('visible');
                addLog('Session started. Operator online.', 'log-ok');
            }, 500);
            return;
        }

        // Add log line
        const line = document.createElement('div');
        line.className = 'boot-line-item';
        line.textContent = BOOT_MESSAGES[bootIdx];
        bootLines.appendChild(line);
        bootLines.scrollTop = bootLines.scrollHeight;

        // Progress
        progress = Math.round(((bootIdx + 1) / BOOT_MESSAGES.length) * 100);
        bootProgress.style.width = progress + '%';

        const statuses = ['INITIALIZING...', 'LOADING...', 'VERIFYING...', 'ARMING...', 'READY...'];
        bootStatusEl.textContent = statuses[Math.floor(bootIdx / 2)] || 'LOADING...';

        bootIdx++;
        const delay = bootIdx < 4 ? 180 : bootIdx < 7 ? 130 : 100;
        setTimeout(bootStep, delay + Math.random() * 80);
    }

    /* ── Init ────────────────────────────────────────────────── */
    window.addEventListener('resize', () => {
        resizeWave();
    });
    resizeWave();
    drawWave();
    updateThreat();

    // Start boot after short pause
    setTimeout(bootStep, 400);

})();
