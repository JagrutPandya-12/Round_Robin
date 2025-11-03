/* ======= Round Robin Scheduler + Animator (single-file app) =======
       Structure:
       - UI handlers: add / remove processes, run controls
       - Scheduler: computeTimeline(processes, quantum) => trace of segments
       - Animator: play segments on canvas, update UI stats and trace box
    */

    // Utilities
    const $ = id => document.getElementById(id);
    const randColor = (i) => ["#60a5fa", "#f472b6", "#f59e0b", "#34d399", "#a78bfa", "#fb7185"][i % 6];

    // Model: process = {id, name, burst, remaining, color}
    let processes = [];
    let trace = []; // array of segments: {pid, name, start, duration}
    let timelineComputed = false;

    // UI elements
    const plist = $('plist');
    const quantumInput = $('quantum');
    const addBtn = $('addBtn');
    const pname = $('pname');
    const pburst = $('pburst');
    const randomBtn = $('random');
    const clearBtn = $('clear');
    const playBtn = $('play');
    const pauseBtn = $('pause');
    const stepF = $('stepF');
    const stepB = $('stepB');
    const speed = $('speed');
    const canvas = $('canvas');
    const ctx = canvas.getContext('2d');
    const avgWaiting = $('avgWaiting');
    const avgTurn = $('avgTurn');
    const totalTimeBox = $('totalTime');
    const traceBox = $('traceBox');
    const exportPNG = $('exportPNG');
    const exportTrace = $('exportTrace');
    const downloadAll = $('downloadAll');

    // Animation state
    let playing = false;
    let currentIndex = 0; // index in trace
    let animStart = null;
    let speedFactor = 1;

    // Generate Process list view
    function renderProcessList() {
      plist.innerHTML = '';
      processes.forEach((p, i) => {
        const div = document.createElement('div'); div.className = 'process-item';
        div.innerHTML = `
        <div style='display:flex;gap:8px;align-items:center;flex:1'>
          <div class='color-dot' style='background:${p.color}'></div>
          <div style='min-width:68px'>${p.name}</div>
          <div class='muted small'>Burst: <strong>${p.burst}</strong></div>
        </div>
        <div style='display:flex;gap:6px'>
          <button class='ghost' data-i='${i}' onclick='editProc(event)'>Edit</button>
          <button class='ghost' data-i='${i}' onclick='removeProc(event)'>Del</button>
        </div>`;
        plist.appendChild(div);
      });
    }
    window.removeProc = (e) => {
      const i = +e.currentTarget.dataset.i; processes.splice(i, 1); renderProcessList(); timelineComputed = false; resetAnimator();
    }
    window.editProc = (e) => {
      const i = +e.currentTarget.dataset.i; const p = processes[i];
      const newBurst = prompt('Set new burst for ' + p.name, p.burst);
      if (newBurst !== null) { p.burst = +newBurst; p.remaining = +newBurst; renderProcessList(); timelineComputed = false; resetAnimator(); }
    }

    addBtn.addEventListener('click', () => {
      const name = pname.value.trim() || `P${processes.length + 1}`;
      const burst = Math.max(1, Number(pburst.value) || 1);
      const id = Date.now() + Math.random();
      const color = randColor(processes.length);
      processes.push({ id, name, burst, remaining: burst, color });
      pname.value = ''; pburst.value = ''; renderProcessList(); timelineComputed = false; resetAnimator();
    });

    randomBtn.addEventListener('click', () => {
      processes = [];
      for (let i = 0; i < 4; i++) { const b = [4, 8, 2, 6, 3, 5][i % 6]; processes.push({ id: i, name: 'P' + (i + 1), burst: b, remaining: b, color: randColor(i) }); }
      renderProcessList(); timelineComputed = false; resetAnimator();
    });

    clearBtn.addEventListener('click', () => { processes = []; renderProcessList(); timelineComputed = false; resetAnimator(); });

    // Scheduler: compute timeline for Round Robin (arrival = 0)
    function computeTimeline() {
      trace = [];
      if (processes.length === 0) return;
      // clone processes
      const q = processes.map(p => ({ id: p.id, name: p.name, remaining: p.burst, color: p.color, burst: p.burst }));
      const quantum = Math.max(1, Number(quantumInput.value) || 1);
      let time = 0;
      const queue = q.slice(); // initial queue
      while (queue.length > 0) {
        const proc = queue.shift();
        const exec = Math.min(proc.remaining, quantum);
        trace.push({ pid: proc.id, name: proc.name, start: time, duration: exec, color: proc.color });
        proc.remaining -= exec; time += exec;
        if (proc.remaining > 0) queue.push(proc);
      }
      // compute metrics
      const completion = {}; // pid->completion
      trace.forEach(seg => { completion[seg.pid] = (completion[seg.pid] || 0) < (seg.start + seg.duration) ? (seg.start + seg.duration) : completion[seg.pid]; });
      const turnaround = {}; const waiting = {};
      processes.forEach(p => {
        const c = completion[p.id];
        turnaround[p.id] = c; // arrival 0
        // waiting = turnaround - burst
        waiting[p.id] = turnaround[p.id] - p.burst;
      });
      const n = processes.length;
      const avgW = (Object.values(waiting).reduce((a, b) => a + b, 0) / n).toFixed(2);
      const avgT = (Object.values(turnaround).reduce((a, b) => a + b, 0) / n).toFixed(2);
      $('avgWaiting').textContent = avgW;
      $('avgTurn').textContent = avgT;
      $('totalTime').textContent = time;

      // prepare execution trace text
      let txt = '';
      trace.forEach((s, i) => { txt += `${i + 1}. ${s.name} — start: ${s.start}, dur: ${s.duration}\n`; });
      traceBox.textContent = txt || 'No trace.';
      timelineComputed = true;
      return trace;
    }

    // Animator: draw queue, highlight active, draw timeline
    function resetAnimator() { playing = false; currentIndex = 0; animStart = null; draw(); }

    function draw() {
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw queue circles
      const cx = 120; const cy = 70; const gap = 60;
      ctx.save(); ctx.font = '14px monospace';
      processes.forEach((p, i) => {
        const x = cx + i * gap;
        // box
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.14; roundRect(ctx, x - 28, cy - 20, 56, 40, 8, true, false); ctx.globalAlpha = 1;
        // text
        ctx.fillStyle = '#eaf6ff'; ctx.fillText(p.name, x - 10, cy + 4);
        ctx.fillStyle = '#d0e9ff'; ctx.fillText('R:' + p.remaining, x - 14, cy + 22);
      });
      ctx.restore();

      // draw timeline (Gantt) background
      const gx = 40; const gy = 150; const gw = canvas.width - 80; const gh = 120;
      // border
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.strokeRect(gx, gy, gw, gh);
      if (!timelineComputed) { ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(gx, gy, gw, gh); return; }

      // compute pixels per time
      const total = trace.reduce((s, t) => s + t.duration, 0);
      const pxPer = total === 0 ? 1 : gw / total;
      let tx = gx;
      trace.forEach((seg, i) => {
        const w = Math.max(1, seg.duration * pxPer);
        ctx.fillStyle = seg.color;
        ctx.globalAlpha = 0.25;
        roundRect(ctx, tx, gy + 6, w - 2, 48, 6, true, false);
        ctx.globalAlpha = 1;

        // Inner rectangle for depth effect
        ctx.fillStyle = '#021725';
        ctx.fillRect(tx + 3, gy + 9, Math.max(2, w - 8), 42);

        // Add bold border for each segment
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx, gy + 6, w - 2, 48);

        // Label text
        ctx.fillStyle = '#e9fbff';
        ctx.font = '12px monospace';
        ctx.fillText(seg.name, tx + 6, gy + 34);

        // Highlight currently active process
        if (i === currentIndex) {
          const glow = Math.sin(Date.now() / 200) * 0.4 + 0.6; // soft pulsing glow
          ctx.shadowColor = seg.color;
          ctx.shadowBlur = 20 * glow;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx - 1, gy + 4, w, 52);
          ctx.shadowBlur = 0; // reset after drawing
        }

        tx += w;
      });


      // time ticks
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px monospace';
      let t = 0; tx = gx; trace.forEach((seg, i) => { ctx.fillText(t, tx, gy + 72); t += seg.duration; tx += Math.max(1, seg.duration * pxPer); });
      ctx.fillText(t, tx, gy + 72);

      // highlight active segment box above
      if (trace[currentIndex]) {
        const seg = trace[currentIndex];

        // Draw a background box for the active process label (below queue, above Gantt)
        const labelY = gy - 10; // move lower to prevent overlap
        const labelH = 26;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // semi-transparent dark background
        roundRect(ctx, gx, labelY - labelH, 140, labelH, 8, true, false);
        ctx.restore();

        // Label text
        ctx.fillStyle = seg.color;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`Active: ${seg.name}`, gx + 10, labelY - 8);
      }
    }


    // helper: rounded rect
    function roundRect(ctx, x, y, w, h, r, fill, stroke) { if (typeof r === 'undefined') r = 5; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); if (fill) ctx.fill(); if (stroke) ctx.stroke(); }

    // Playback logic
    function play() { if (!timelineComputed) computeTimeline(); if (!trace || trace.length === 0) return; playing = true; animStart = performance.now(); requestAnimationFrame(tick); }
    function pause() { playing = false; animStart = null; }
    function tick(now) {
      if (!playing) return;
      if (!animStart) animStart = now;

      const seg = trace[currentIndex];
      if (!seg) {
        playing = false;
        return;
      }

      // One time unit = 200 ms at normal speed (adjustable)
      const baseSpeed = 300;
      const durationMs = seg.duration * baseSpeed / speedFactor;
      const elapsed = now - animStart;

      if (elapsed >= durationMs) {
        // segment finished
        const proc = processes.find(p => p.id === seg.pid);
        if (proc) {
          proc.remaining -= seg.duration;
          if (proc.remaining < 0) proc.remaining = 0;
        }

        currentIndex++;
        animStart = now;
        renderProcessList();
        draw();

        if (currentIndex < trace.length) {
          requestAnimationFrame(tick); // continue automatically
        } else {
          playing = false;
          currentIndex = trace.length - 1;
          draw();
        }
      } else {
        draw();
        requestAnimationFrame(tick);
      }
    }


    // Step forward/back
    stepF.addEventListener('click', () => {
      if (!timelineComputed) computeTimeline(); if (currentIndex < trace.length - 1) currentIndex++; draw();
    });
    stepB.addEventListener('click', () => { if (!timelineComputed) computeTimeline(); if (currentIndex > 0) currentIndex--; draw(); });
    playBtn.addEventListener('click', () => { if (!timelineComputed) computeTimeline(); play(); });
    pauseBtn.addEventListener('click', () => pause());

    // recompute timeline when quantum changes
    quantumInput.addEventListener('change', () => { timelineComputed = false; computeTimeline(); resetAnimator(); });

    // compute on demand
    canvas.addEventListener('click', () => { if (!timelineComputed) computeTimeline(); draw(); });

    // recompute trace from processes
    function ensureTimeline() { if (!timelineComputed) computeTimeline(); }

    // Export functions
    exportPNG.addEventListener('click', () => {
      ensureTimeline(); // draw final
      // crop the canvas and download
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = 'rr-scheduler-screenshot.png'; a.click();
    });
    exportTrace.addEventListener('click', () => {
      ensureTimeline(); const data = { processes: processes.map(p => ({ name: p.name, burst: p.burst })), quantum: Number(quantumInput.value), trace };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'rr-execution-trace.json'; a.click();
    });

    // Download entire HTML file (single-file) - uses current document HTML
    downloadAll.addEventListener('click', () => {
      const html = '<!doctype html>\n' + document.documentElement.outerHTML;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = 'roundrobin_visualizer.html'; a.click();
    });

    // keep speed reflected
    speed.addEventListener('input', () => { speedFactor = speed.value; });

    // initial state
    renderProcessList(); draw();

    // compute metrics when pressing keyboard 'c'
    document.addEventListener('keydown', (ev) => { if (ev.key === 'c') { computeTimeline(); draw(); } });

    // small helper: recalc trace whenever user tries to play
    playBtn.addEventListener('click', () => { computeTimeline(); draw(); });

    // ========== End of script ==========