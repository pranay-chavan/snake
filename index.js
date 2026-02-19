(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');
  const startBtn = document.getElementById('startBtn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const levelEl = document.getElementById('level');

  const COLS = 20;
  const ROWS = 20;
  const CELL = canvas.width / COLS;

  const DIRS = {
    UP:    { x: 0,  y: -1 },
    DOWN:  { x: 0,  y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x: 1,  y:  0 },
  };

  const OPPOSITES = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' };

  let snake, dir, nextDir, food, score, best, level, speed, loopId, gameState, particles;

  function init() {
    snake = [
      { x: 10, y: 10 },
      { x: 9,  y: 10 },
      { x: 8,  y: 10 },
    ];
    dir = 'RIGHT';
    nextDir = 'RIGHT';
    score = 0;
    level = 1;
    speed = 130;
    particles = [];
    best = parseInt(localStorage.getItem('snake_best') || '0');
    updateHUD();
    placeFood();
  }

  function placeFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function fmt(n, pad = 3) { return String(n).padStart(pad, '0'); }

  function updateHUD() {
    scoreEl.textContent = fmt(score);
    bestEl.textContent  = fmt(best);
    levelEl.textContent = fmt(level, 2);
  }

  function popScore() {
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-pop');
    scoreEl.addEventListener('animationend', () => scoreEl.classList.remove('score-pop'), { once: true });
  }

  // Particle burst
  function burst(x, y) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 / 14) * i + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 2.5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.05 + Math.random() * 0.04,
        r: 2 + Math.random() * 2,
      });
    }
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + DIRS[dir].x, y: snake[0].y + DIRS[dir].y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return die();
    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) return die();

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      popScore();
      burst(food.x, food.y);
      if (score % 5 === 0) {
        level++;
        speed = Math.max(55, speed - 12);
        restartLoop();
      }
      if (score > best) { best = score; localStorage.setItem('snake_best', best); }
      updateHUD();
      placeFood();
    } else {
      snake.pop();
    }
  }

  function die() {
    gameState = 'dead';
    clearInterval(loopId);
    overlayTitle.textContent = 'GAME OVER';
    overlaySub.textContent = `Score: ${fmt(score)}  |  Best: ${fmt(best)}`;
    startBtn.textContent = 'RETRY';
    overlay.classList.remove('hidden');
  }

  function restartLoop() {
    clearInterval(loopId);
    loopId = setInterval(tick, speed);
  }

  function tick() {
    step();
    draw();
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawParticles();
    drawFood();
    drawSnake();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(0,255,140,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(canvas.width, y * CELL);
      ctx.stroke();
    }
  }

  function drawSnake() {
    snake.forEach((seg, i) => {
      const t = i / snake.length;
      const alpha = 1 - t * 0.55;
      const pad = i === 0 ? 1 : 2.5;
      const x = seg.x * CELL + pad;
      const y = seg.y * CELL + pad;
      const size = CELL - pad * 2;

      // Glow for head
      if (i === 0) {
        ctx.shadowColor = '#00ff8c';
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = i === 0
        ? `rgba(0,255,140,${alpha})`
        : `rgba(0,${Math.round(200 - t * 80)},${Math.round(100 - t*40)},${alpha})`;

      roundRect(ctx, x, y, size, size, 3);
      ctx.fill();

      // Eyes on head
      if (i === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#050a0e';
        const eyeSize = 3;
        const eyeOffset = 4;
        let e1, e2;
        if (dir === 'RIGHT') { e1 = [size-eyeOffset, 4]; e2 = [size-eyeOffset, size-4-eyeSize]; }
        else if (dir === 'LEFT') { e1 = [eyeOffset-eyeSize, 4]; e2 = [eyeOffset-eyeSize, size-4-eyeSize]; }
        else if (dir === 'UP')   { e1 = [4, eyeOffset-eyeSize]; e2 = [size-4-eyeSize, eyeOffset-eyeSize]; }
        else                     { e1 = [4, size-eyeOffset]; e2 = [size-4-eyeSize, size-eyeOffset]; }
        ctx.fillRect(x + e1[0], y + e1[1], eyeSize, eyeSize);
        ctx.fillRect(x + e2[0], y + e2[1], eyeSize, eyeSize);
      }
    });
    ctx.shadowBlur = 0;
  }

  function drawFood() {
    const cx = food.x * CELL + CELL / 2;
    const cy = food.y * CELL + CELL / 2;
    const r = CELL / 2 - 3;
    const t = Date.now() / 400;
    const pulse = Math.sin(t) * 2;

    ctx.shadowColor = '#ff3864';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(cx, cy, r + pulse, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3864';
    ctx.fill();

    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // Animate by redrawing on animFrame when idle (we handle this via interval)
  }

  function drawParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= p.decay;

      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = '#ff3864';
      ctx.shadowColor = '#ff3864';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Food pulse animation (separate rAF so food pulses even between steps)
  let foodAnimId;
  function foodLoop() {
    if (gameState === 'playing') {
      // Only redraw food + particles between game ticks
      ctx.clearRect(food.x * CELL - 2, food.y * CELL - 2, CELL + 4, CELL + 4);
      drawFood();
      if (particles.length) draw(); // full redraw if particles active
    }
    foodAnimId = requestAnimationFrame(foodLoop);
  }

  // ─── Game Start ──────────────────────────────────────────────────────────

  function startGame() {
    init();
    overlay.classList.add('hidden');
    gameState = 'playing';
    restartLoop();
    // Full draw immediately
    draw();
    if (!foodAnimId) foodLoop();
  }

  startBtn.addEventListener('click', startGame);

  // ─── Input ────────────────────────────────────────────────────────────────

  document.addEventListener('keydown', e => {
    const map = {
      ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
    };
    if (e.code === 'Space') {
      if (gameState !== 'playing') startGame();
      return;
    }
    const d = map[e.key];
    if (d && gameState === 'playing' && OPPOSITES[d] !== dir) {
      nextDir = d;
      e.preventDefault();
    }
  });

  // D-pad
  document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.dir;
      if (gameState !== 'playing') return;
      if (OPPOSITES[d] !== dir) nextDir = d;
    });
  });

  // Swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (gameState !== 'playing') startGame();
      return;
    }

    let d;
    if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? 'RIGHT' : 'LEFT';
    else d = dy > 0 ? 'DOWN' : 'UP';

    if (gameState === 'playing' && OPPOSITES[d] !== dir) nextDir = d;
  }, { passive: true });

  // Initial draw
  init();
  draw();
})();