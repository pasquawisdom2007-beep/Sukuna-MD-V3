/* ==========================================================
   SUKUNA MD Panel — shared behaviour
   - "HUD" interface click tone on every button (Web Audio API,
     no audio file needed, so it works anywhere it's deployed).
     Smooth sine sweep + a soft harmonic shimmer + a short delay
     tail, aiming for a JARVIS-style holographic-console feel
     rather than an old-school robotic beep.
   - Active-nav highlighting.
   ========================================================== */

(function () {
  let ctx;
  function audioCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // A soft, layered HUD confirmation tone:
  //  - core sine sweep (low -> high) for the "power engaging" feel
  //  - a quiet upper harmonic layer for shimmer
  //  - a touch of short slap-delay so it feels like it's ringing
  //    inside a small holographic interface, not a flat beep
  function playChim() {
    try {
      const c   = audioCtx();
      const now = c.currentTime;

      // shared soft-spring delay for a subtle "interface" tail
      const delay     = c.createDelay();
      delay.delayTime.value = 0.09;
      const feedback  = c.createGain();
      feedback.gain.value = 0.18;
      const delayMix  = c.createGain();
      delayMix.gain.value = 0.25;
      delay.connect(feedback).connect(delay);
      delay.connect(delayMix).connect(c.destination);

      // --- core tone: sine sweep, warm and rounded ---
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.10);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.22);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

      osc.connect(gain);
      gain.connect(c.destination);
      gain.connect(delay);
      osc.start(now);
      osc.stop(now + 0.28);

      // --- shimmer layer: quiet upper harmonic, triangle wave ---
      const osc2  = c.createOscillator();
      const gain2 = c.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1680, now + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.12);

      gain2.gain.setValueAtTime(0.0001, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

      osc2.connect(gain2);
      gain2.connect(c.destination);
      gain2.connect(delay);
      osc2.start(now + 0.02);
      osc2.stop(now + 0.22);
    } catch (e) { /* audio not available — fail silently */ }
  }
  window.SUKUNA_CHIM = playChim;

  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .btn, a.nav-links-item, .linkcard, .nav-links a');
    if (target) playChim();
  }, true);

  // Highlight current nav link
  document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
  });

  /* ------------------------------------------------------------
     Animated particle background — slow-drifting glowing nodes
     with faint connecting lines, red/cyan, sits behind everything.
     ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-particles';
    document.body.prepend(canvas);
    const gfx = canvas.getContext('2d');

    let w, h, particles;
    const COUNT = 46;
    const COLORS = ['rgba(255,20,64,', 'rgba(16,224,255,'];

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function makeParticles() {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        c: COLORS[Math.random() < 0.75 ? 0 : 1],
        a: Math.random() * 0.5 + 0.3
      }));
    }
    resize();
    makeParticles();
    window.addEventListener('resize', () => { resize(); });

    function step() {
      gfx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }

      // faint connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            gfx.strokeStyle = `rgba(255,20,64,${0.08 * (1 - dist / 130)})`;
            gfx.lineWidth = 1;
            gfx.beginPath();
            gfx.moveTo(a.x, a.y);
            gfx.lineTo(b.x, b.y);
            gfx.stroke();
          }
        }
      }

      // glowing nodes
      for (const p of particles) {
        gfx.beginPath();
        gfx.fillStyle = p.c + p.a + ')';
        gfx.shadowColor = p.c + '1)';
        gfx.shadowBlur = 6;
        gfx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        gfx.fill();
      }
      gfx.shadowBlur = 0;

      requestAnimationFrame(step);
    }
    step();
  });

  /* ------------------------------------------------------------
     Floating action button — bottom-right quick-access menu:
     WhatsApp channel, Support group, Telegram, jump to Deploy.
     ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.createElement('div');
    wrap.className = 'fab-wrap';
    wrap.innerHTML = `
      <div class="fab-menu" id="fabMenu">
        <a class="fab-item" href="https://whatsapp.com/channel/0029VbCJho147XeEEuR1LA3s" target="_blank" rel="noopener">
          <span class="fab-ico">📣</span><span class="fab-label">Channel</span>
        </a>
        <a class="fab-item" href="https://chat.whatsapp.com/Gl0eX9DxmoMJm7jAThlNV3" target="_blank" rel="noopener">
          <span class="fab-ico">💬</span><span class="fab-label">Support</span>
        </a>
        <a class="fab-item" href="https://t.me/pasquamdsukuna" target="_blank" rel="noopener">
          <span class="fab-ico">📡</span><span class="fab-label">Telegram</span>
        </a>
        <a class="fab-item" href="deploy.html">
          <span class="fab-ico">🚀</span><span class="fab-label">Deploy</span>
        </a>
      </div>
      <button class="fab-main" id="fabMain" aria-label="Quick links">
        <span class="fab-main-ico">✆</span>
      </button>
    `;
    document.body.appendChild(wrap);

    const main = wrap.querySelector('#fabMain');
    const menu = wrap.querySelector('#fabMenu');
    main.addEventListener('click', () => {
      wrap.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
  });
})();
