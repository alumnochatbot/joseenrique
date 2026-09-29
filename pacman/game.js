/**
 * PAC-MAN Clásico en HTML5 Canvas
 * Motor completo de juego con Web Audio API, IA de fantasmas y controles táctiles/teclado.
 */

// --- CONFIGURACIÓN Y CONSTANTES ---
const TILE = 20;
const COLS = 19;
const ROWS = 22;

// Mapa base:
// 0: Vacío / Pasillo
// 1: Muro
// 2: Bolita pequeña (10 pts)
// 3: Bolita grande / Energizer (50 pts)
// 4: Casa de los fantasmas (interior)
// 5: Puerta de la casa de fantasmas
const INITIAL_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 5, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 0, 2, 0, 0, 1, 4, 4, 4, 1, 0, 0, 2, 0, 0, 0, 0], // Túnel en col 0 y col 18
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 3, 2, 1, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1, 2, 3, 1],
  [1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Direcciones
const DIRS = {
  STOP: { x: 0, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// --- CONTROLADOR DE SONIDO (Web Audio API) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.wakaAlt = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playWaka() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      this.wakaAlt = !this.wakaAlt;
      const startFreq = this.wakaAlt ? 320 : 460;
      const endFreq = this.wakaAlt ? 460 : 260;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  }

  playPower() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(550, now + 0.3);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (_) {}
  }

  playEatGhost() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [350, 520, 700, 950].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.08, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.001, now + (idx + 1) * 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + (idx + 1) * 0.05);
      });
    } catch (_) {}
  }

  playDeath() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 9; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const f = 550 - i * 50;
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.09, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.001, now + (i + 1) * 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + (i + 1) * 0.07);
      }
    } catch (_) {}
  }

  playStart() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [
        { f: 261.6, d: 0.1 }, { f: 523.2, d: 0.1 }, { f: 392.0, d: 0.1 },
        { f: 329.6, d: 0.1 }, { f: 523.2, d: 0.1 }, { f: 392.0, d: 0.1 }, { f: 329.6, d: 0.2 }
      ];
      let t = this.ctx.currentTime;
      notes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.linearRampToValueAtTime(0.001, t + n.d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.d);
        t += n.d;
      });
    } catch (_) {}
  }
}

// --- CLASE PACMAN ---
class Pacman {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.tileX = 9;
    this.tileY = 16;
    this.x = this.tileX * TILE + TILE / 2;
    this.y = this.tileY * TILE + TILE / 2;
    this.dir = DIRS.LEFT;
    this.nextDir = DIRS.LEFT;
    this.speed = 2.0;
    this.mouthAngle = 0.2;
    this.mouthSpeed = 0.035;
    this.mouthMax = 0.65;
    this.mouthOpening = true;
    this.deathProgress = 0;
  }

  update() {
    // Si cambia a dirección contraria, permitir giro inmediato
    if (
      (this.nextDir.x !== 0 && this.nextDir.x === -this.dir.x) ||
      (this.nextDir.y !== 0 && this.nextDir.y === -this.dir.y)
    ) {
      this.dir = this.nextDir;
    }

    // Comprobar si puede girar a la dirección solicitada (nextDir)
    if (this.canTurn(this.nextDir)) {
      this.dir = this.nextDir;
    }

    // Intentar avanzar en la dirección actual
    if (this.canMove(this.dir)) {
      this.x += this.dir.x * this.speed;
      this.y += this.dir.y * this.speed;

      // Animar boca
      if (this.mouthOpening) {
        this.mouthAngle += this.mouthSpeed;
        if (this.mouthAngle >= this.mouthMax) this.mouthOpening = false;
      } else {
        this.mouthAngle -= this.mouthSpeed;
        if (this.mouthAngle <= 0.05) this.mouthOpening = true;
      }
    } else {
      // Ajustar exactamente al centro de la casilla para evitar solapamientos
      const center = this.getTileCenter(this.tileX, this.tileY);
      if (this.dir.x !== 0) this.x = center.x;
      if (this.dir.y !== 0) this.y = center.y;
    }

    // Soporte para túnel (fila 10)
    const totalWidth = COLS * TILE;
    if (this.x < -TILE / 2) {
      this.x = totalWidth + TILE / 2;
    } else if (this.x > totalWidth + TILE / 2) {
      this.x = -TILE / 2;
    }

    // Actualizar coordenadas de casilla
    this.tileX = Math.floor(this.x / TILE);
    this.tileY = Math.floor(this.y / TILE);

    // Comer bolitas
    this.checkPellet();
  }

  getTileCenter(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  canTurn(dir) {
    if (dir.x === 0 && dir.y === 0) return false;

    const currCenter = this.getTileCenter(this.tileX, this.tileY);
    const dist = Math.hypot(this.x - currCenter.x, this.y - currCenter.y);

    // Debe estar suficientemente cerca del centro de la casilla para poder doblar
    if (dist <= this.speed * 1.5) {
      const targetX = this.tileX + dir.x;
      const targetY = this.tileY + dir.y;

      // Manejar túnel
      if (targetY === 10 && (targetX < 0 || targetX >= COLS)) return true;

      const tileType = this.game.getTile(targetX, targetY);
      if (tileType !== 1 && tileType !== 4 && tileType !== 5) {
        // Alinear eje perpendicular
        if (dir.x !== 0) this.y = currCenter.y;
        if (dir.y !== 0) this.x = currCenter.x;
        return true;
      }
    }
    return false;
  }

  canMove(dir) {
    if (dir.x === 0 && dir.y === 0) return false;

    // Verificar túnel
    if (this.tileY === 10 && (this.tileX <= 0 || this.tileX >= COLS - 1)) {
      return true;
    }

    const currCenter = this.getTileCenter(this.tileX, this.tileY);

    // Si nos alejamos del centro hacia una casilla bloqueada
    if (dir.x > 0 && this.x >= currCenter.x) {
      return this.isWalkable(this.tileX + 1, this.tileY);
    }
    if (dir.x < 0 && this.x <= currCenter.x) {
      return this.isWalkable(this.tileX - 1, this.tileY);
    }
    if (dir.y > 0 && this.y >= currCenter.y) {
      return this.isWalkable(this.tileX, this.tileY + 1);
    }
    if (dir.y < 0 && this.y <= currCenter.y) {
      return this.isWalkable(this.tileX, this.tileY - 1);
    }

    return true;
  }

  isWalkable(tx, ty) {
    const tile = this.game.getTile(tx, ty);
    return tile !== 1 && tile !== 4 && tile !== 5;
  }

  checkPellet() {
    if (this.tileX < 0 || this.tileX >= COLS || this.tileY < 0 || this.tileY >= ROWS) return;
    const tile = this.game.getTile(this.tileX, this.tileY);

    if (tile === 2) {
      this.game.setTile(this.tileX, this.tileY, 0);
      this.game.addScore(10);
      this.game.sound.playWaka();
      this.game.pelletsLeft--;
      this.game.checkWin();
    } else if (tile === 3) {
      this.game.setTile(this.tileX, this.tileY, 0);
      this.game.addScore(50);
      this.game.sound.playPower();
      this.game.pelletsLeft--;
      this.game.triggerFrightened();
      this.game.checkWin();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.game.state === 'DYING') {
      // Animación de muerte
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      const startAngle = this.deathProgress * Math.PI;
      const endAngle = (2 - this.deathProgress) * Math.PI;
      ctx.arc(0, 0, TILE / 2 - 2, startAngle, endAngle);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Orientación de la boca
    let rotation = 0;
    if (this.dir === DIRS.RIGHT) rotation = 0;
    else if (this.dir === DIRS.DOWN) rotation = Math.PI / 2;
    else if (this.dir === DIRS.LEFT) rotation = Math.PI;
    else if (this.dir === DIRS.UP) rotation = -Math.PI / 2;

    ctx.rotate(rotation);

    // Dibujar cuerpo amarillo
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.arc(0, 0, TILE / 2 - 2, this.mouthAngle, Math.PI * 2 - this.mouthAngle);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();
  }
}

// --- CLASE FANTASMA ---
class Ghost {
  constructor(game, name, color, spawnCol, spawnRow, releaseDelay) {
    this.game = game;
    this.name = name;
    this.color = color;
    this.spawnCol = spawnCol;
    this.spawnRow = spawnRow;
    this.releaseDelay = releaseDelay; // segundos antes de salir de la casa
    this.reset();
  }

  reset() {
    this.tileX = this.spawnCol;
    this.tileY = this.spawnRow;
    this.x = this.tileX * TILE + TILE / 2;
    this.y = this.tileY * TILE + TILE / 2;
    this.dir = DIRS.UP;
    this.speed = 1.7;
    this.state = 'INSIDE'; // INSIDE, CHASE, FRIGHTENED, EATEN
    this.releaseTimer = this.releaseDelay * 60; // frames
    this.frightenedTimer = 0;
  }

  update() {
    if (this.state === 'INSIDE') {
      // Rebotar verticalmente en la casa hasta que termine su temporizador
      this.releaseTimer--;
      if (this.releaseTimer <= 0) {
        // Mover hacia la puerta (col 9, row 9)
        const doorCenter = { x: 9 * TILE + TILE / 2, y: 9 * TILE + TILE / 2 };
        if (Math.abs(this.x - doorCenter.x) > 1) {
          this.x += Math.sign(doorCenter.x - this.x) * 1.5;
        } else {
          this.x = doorCenter.x;
          this.y -= 1.5;
          if (this.y <= 8 * TILE + TILE / 2) {
            this.state = 'CHASE';
            this.dir = DIRS.LEFT;
          }
        }
      } else {
        // Pequeño vaivén arriba/abajo en la casa
        this.y += Math.sin(Date.now() / 200) * 0.4;
      }
      this.tileX = Math.floor(this.x / TILE);
      this.tileY = Math.floor(this.y / TILE);
      return;
    }

    if (this.state === 'FRIGHTENED') {
      this.frightenedTimer--;
      if (this.frightenedTimer <= 0) {
        this.state = 'CHASE';
      }
    }

    // Velocidad según estado
    let currentSpeed = this.speed;
    if (this.state === 'FRIGHTENED') currentSpeed = 1.1;
    if (this.state === 'EATEN') currentSpeed = 3.2;

    // Detectar llegada al centro de la casilla para tomar decisiones
    const center = { x: this.tileX * TILE + TILE / 2, y: this.tileY * TILE + TILE / 2 };
    const distToCenter = Math.hypot(this.x - center.x, this.y - center.y);

    if (distToCenter <= currentSpeed) {
      this.x = center.x;
      this.y = center.y;

      // Si eran ojos (EATEN) y han vuelto a la puerta de la casa, regenerar
      if (this.state === 'EATEN' && (this.tileX === 9 && (this.tileY === 9 || this.tileY === 8))) {
        this.state = 'CHASE';
      }

      this.chooseNextDirection();
    }

    // Avanzar en la dirección elegida
    this.x += this.dir.x * currentSpeed;
    this.y += this.dir.y * currentSpeed;

    // Túnel
    const totalWidth = COLS * TILE;
    if (this.x < -TILE / 2) {
      this.x = totalWidth + TILE / 2;
    } else if (this.x > totalWidth + TILE / 2) {
      this.x = -TILE / 2;
    }

    this.tileX = Math.floor(this.x / TILE);
    this.tileY = Math.floor(this.y / TILE);
  }

  chooseNextDirection() {
    const validDirs = [];
    const possible = [DIRS.UP, DIRS.LEFT, DIRS.DOWN, DIRS.RIGHT];

    for (const d of possible) {
      // No regresar inmediatamente a la dirección opuesta (a menos que no haya otra salida)
      if (d.x === -this.dir.x && d.y === -this.dir.y) continue;

      const nextX = this.tileX + d.x;
      const nextY = this.tileY + d.y;

      // Túnel horizontal
      if (nextY === 10 && (nextX < 0 || nextX >= COLS)) {
        validDirs.push(d);
        continue;
      }

      const tile = this.game.getTile(nextX, nextY);
      // Los fantasmas no pueden entrar a muros. Solo entran a la puerta (5) si son ojos (EATEN)
      if (tile !== 1 && tile !== 4 && (tile !== 5 || this.state === 'EATEN')) {
        validDirs.push(d);
      }
    }

    if (validDirs.length === 0) {
      this.dir = { x: -this.dir.x, y: -this.dir.y };
      return;
    }

    if (this.state === 'FRIGHTENED') {
      // Modo asustado: movimientos aleatorios
      const randomIdx = Math.floor(Math.random() * validDirs.length);
      this.dir = validDirs[randomIdx];
      return;
    }

    // Determinar casilla objetivo (Target)
    let target = { x: this.game.pacman.tileX, y: this.game.pacman.tileY };

    if (this.state === 'EATEN') {
      // Regresar a la puerta de la base
      target = { x: 9, y: 8 };
    } else if (this.name === 'Pinky') {
      // 4 casillas por delante de Pacman
      target = {
        x: this.game.pacman.tileX + this.game.pacman.dir.x * 4,
        y: this.game.pacman.tileY + this.game.pacman.dir.y * 4
      };
    } else if (this.name === 'Inky') {
      // Emboscada / offset
      target = {
        x: this.game.pacman.tileX - this.game.pacman.dir.x * 2,
        y: this.game.pacman.tileY - this.game.pacman.dir.y * 2
      };
    } else if (this.name === 'Clyde') {
      // Si está lejos persigue, si está cerca se aleja a la esquina inferior izquierda
      const dist = Math.hypot(this.tileX - this.game.pacman.tileX, this.tileY - this.game.pacman.tileY);
      if (dist < 6) {
        target = { x: 1, y: 20 };
      }
    }

    // Elegir la dirección que minimice la distancia euclidiana al objetivo
    let bestDir = validDirs[0];
    let minDistance = Infinity;

    for (const d of validDirs) {
      const futureX = this.tileX + d.x;
      const futureY = this.tileY + d.y;
      const dist = Math.hypot(futureX - target.x, futureY - target.y);
      if (dist < minDistance) {
        minDistance = dist;
        bestDir = d;
      }
    }

    this.dir = bestDir;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const r = TILE / 2 - 2;

    if (this.state === 'EATEN') {
      // Solo dibujar ojos
      this.drawEyes(ctx, r);
      ctx.restore();
      return;
    }

    // Color del cuerpo
    let bodyColor = this.color;
    if (this.state === 'FRIGHTENED') {
      // Parpadeo blanco/azul en los últimos 2 segundos
      if (this.frightenedTimer < 120 && Math.floor(this.frightenedTimer / 15) % 2 === 0) {
        bodyColor = '#ffffff';
      } else {
        bodyColor = '#2121de';
      }
    }

    // Dibujar cuerpo clásico con faldón ondulado
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(0, -2, r, Math.PI, 0, false);
    ctx.lineTo(r, r);

    // Ondulaciones inferiores
    const waves = 3;
    const step = (r * 2) / waves;
    for (let i = waves; i >= 1; i--) {
      const cx = r - (i - 0.5) * step;
      const ex = r - i * step;
      ctx.quadraticCurveTo(cx, r - 3, ex, r);
    }
    ctx.closePath();
    ctx.fill();

    // Si está asustado, cara asustada
    if (this.state === 'FRIGHTENED') {
      ctx.fillStyle = bodyColor === '#ffffff' ? '#ff0000' : '#ffa5a5';
      ctx.fillRect(-4, -3, 2, 2);
      ctx.fillRect(2, -3, 2, 2);

      // Boca en zigzag
      ctx.strokeStyle = bodyColor === '#ffffff' ? '#ff0000' : '#ffa5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(-3, 2);
      ctx.lineTo(-1, 4);
      ctx.lineTo(1, 2);
      ctx.lineTo(3, 4);
      ctx.lineTo(5, 2);
      ctx.stroke();
    } else {
      // Ojos normales
      this.drawEyes(ctx, r);
    }

    ctx.restore();
  }

  drawEyes(ctx, r) {
    const eyeOffsetX = 4;
    const eyeOffsetY = -2;
    const eyeR = 3.5;
    const pupilR = 1.8;

    // Blanco de los ojos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupilas orientadas a la dirección del fantasma
    const lookX = this.dir.x * 1.5;
    const lookY = this.dir.y * 1.5;

    ctx.fillStyle = '#0022cc';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX + lookX, eyeOffsetY + lookY, pupilR, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + lookX, eyeOffsetY + lookY, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- CLASE PRINCIPAL DEL JUEGO ---
class PacmanGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundController();

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman_highscore') || '0', 10);
    this.lives = 3;
    this.level = 1;
    this.state = 'START'; // START, PLAYING, PAUSED, DYING, LEVEL_CLEAR, GAME_OVER

    this.map = [];
    this.pelletsLeft = 0;
    this.ghostKillCombo = 0;

    // Inicializar elementos de UI
    this.scoreDisplay = document.getElementById('score-display');
    this.highScoreDisplay = document.getElementById('high-score-display');
    this.livesIconsContainer = document.getElementById('lives-icons');
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.winOverlay = document.getElementById('win-overlay');
    this.finalScoreMsg = document.getElementById('final-score-msg');
    this.winScoreMsg = document.getElementById('win-score-msg');

    this.updateHUD();

    // Entidades
    this.pacman = new Pacman(this);
    this.ghosts = [
      new Ghost(this, 'Blinky', '#ff0000', 9, 8, 0),     // Rojo (inicia afuera)
      new Ghost(this, 'Pinky', '#ffb8ff', 9, 10, 1.5),  // Rosa
      new Ghost(this, 'Inky', '#00ffff', 8, 10, 3.5),   // Cian
      new Ghost(this, 'Clyde', '#ffb852', 10, 10, 6.0)   // Naranja
    ];

    this.initMap();
    this.initListeners();

    // Loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  initMap() {
    this.map = INITIAL_MAP.map(row => [...row]);
    this.pelletsLeft = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.map[r][c] === 2 || this.map[r][c] === 3) {
          this.pelletsLeft++;
        }
      }
    }
  }

  getTile(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 1;
    return this.map[r][c];
  }

  setTile(c, r, val) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      this.map[r][c] = val;
    }
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman_highscore', this.highScore.toString());
    }
    this.updateHUD();
  }

  updateHUD() {
    this.scoreDisplay.textContent = this.score;
    this.highScoreDisplay.textContent = this.highScore;

    // Renderizar iconos de vidas
    this.livesIconsContainer.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const icon = document.createElement('span');
      icon.className = 'life-icon';
      this.livesIconsContainer.appendChild(icon);
    }
  }

  triggerFrightened() {
    this.ghostKillCombo = 0;
    this.ghosts.forEach(g => {
      if (g.state !== 'EATEN' && g.state !== 'INSIDE') {
        g.state = 'FRIGHTENED';
        g.frightenedTimer = 420; // 7 segundos a 60 FPS
        g.dir = { x: -g.dir.x, y: -g.dir.y }; // Media vuelta
      }
    });
  }

  checkGhostCollisions() {
    for (const ghost of this.ghosts) {
      const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);

      if (dist < TILE * 0.75) {
        if (ghost.state === 'FRIGHTENED') {
          // Pac-man se come al fantasma
          ghost.state = 'EATEN';
          this.ghostKillCombo++;
          const points = Math.pow(2, this.ghostKillCombo) * 100;
          this.addScore(points);
          this.sound.playEatGhost();
        } else if (ghost.state === 'CHASE') {
          // Pac-man es atrapado
          this.pacmanDeath();
          break;
        }
      }
    }
  }

  pacmanDeath() {
    this.state = 'DYING';
    this.sound.playDeath();
    this.pacman.deathProgress = 0;

    let deathFrames = 0;
    const deathAnim = () => {
      deathFrames++;
      this.pacman.deathProgress = deathFrames / 50;

      if (deathFrames < 50) {
        requestAnimationFrame(deathAnim);
      } else {
        this.lives--;
        this.updateHUD();

        if (this.lives <= 0) {
          this.gameOver();
        } else {
          // Reubicar posiciones y reanudar
          this.pacman.reset();
          this.ghosts.forEach(g => g.reset());
          setTimeout(() => {
            this.state = 'PLAYING';
          }, 800);
        }
      }
    };
    requestAnimationFrame(deathAnim);
  }

  checkWin() {
    if (this.pelletsLeft <= 0) {
      this.state = 'LEVEL_CLEAR';
      this.addScore(1000);
      this.winScoreMsg.innerHTML = `¡Has limpiado el laberinto!<br>Puntuación: <strong>${this.score}</strong>`;
      this.winOverlay.classList.remove('hidden');
    }
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.finalScoreMsg.innerHTML = `Puntuación final: <strong>${this.score}</strong><br>Récord: <strong>${this.highScore}</strong>`;
    this.gameOverOverlay.classList.remove('hidden');
  }

  nextLevel() {
    this.level++;
    this.winOverlay.classList.add('hidden');
    this.initMap();
    this.pacman.reset();
    this.ghosts.forEach(g => {
      g.reset();
      g.speed = Math.min(2.5, 1.7 + this.level * 0.1);
    });
    this.state = 'PLAYING';
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.updateHUD();
    this.initMap();
    this.pacman.reset();
    this.ghosts.forEach(g => {
      g.reset();
      g.speed = 1.7;
    });

    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.winOverlay.classList.add('hidden');

    this.sound.playStart();
    this.state = 'PLAYING';
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseOverlay.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.pauseOverlay.classList.add('hidden');
    }
  }

  // --- ENTRADA Y CONTROLES ---
  initListeners() {
    // Teclado
    window.addEventListener('keydown', e => {
      this.sound.init();

      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        this.pacman.nextDir = DIRS.UP;
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.pacman.nextDir = DIRS.DOWN;
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        this.pacman.nextDir = DIRS.LEFT;
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        this.pacman.nextDir = DIRS.RIGHT;
        e.preventDefault();
      } else if (e.code === 'Space') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.togglePause();
        }
        e.preventDefault();
      }
    });

    // Botones de pantalla / Overlays
    document.getElementById('start-btn').addEventListener('click', () => this.resetGame());
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('restart-game-over-btn').addEventListener('click', () => this.resetGame());
    document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());

    // Botones de la barra de estado
    document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());

    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      this.sound.muted = !this.sound.muted;
      soundBtn.textContent = this.sound.muted ? '🔇 SILENCIO' : '🔊 SONIDO';
    });

    // D-Pad Táctil
    const bindDpad = (id, dir) => {
      const el = document.getElementById(id);
      const handleInput = e => {
        e.preventDefault();
        this.sound.init();
        this.pacman.nextDir = dir;
      };
      el.addEventListener('pointerdown', handleInput);
      el.addEventListener('touchstart', handleInput, { passive: false });
    };

    bindDpad('btn-up', DIRS.UP);
    bindDpad('btn-down', DIRS.DOWN);
    bindDpad('btn-left', DIRS.LEFT);
    bindDpad('btn-right', DIRS.RIGHT);

    // Soporte táctil por deslizamiento (Swipe) en Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.sound.init();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', e => {
      if (e.changedTouches.length > 0) {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (Math.max(absX, absY) > 20) {
          if (absX > absY) {
            this.pacman.nextDir = diffX > 0 ? DIRS.RIGHT : DIRS.LEFT;
          } else {
            this.pacman.nextDir = diffY > 0 ? DIRS.DOWN : DIRS.UP;
          }
        }
      }
    }, { passive: true });
  }

  // --- RENDERIZADO DEL MAPA ---
  drawMap() {
    const time = Date.now() / 250;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.map[r][c];
        const x = c * TILE;
        const y = r * TILE;

        if (tile === 1) {
          // Muro con borde de neón azul
          this.ctx.fillStyle = '#0b102b';
          this.ctx.fillRect(x, y, TILE, TILE);
          this.ctx.strokeStyle = '#2837ff';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else if (tile === 2) {
          // Bolita normal
          this.ctx.fillStyle = '#ffb8ae';
          this.ctx.beginPath();
          this.ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (tile === 3) {
          // Bolita de poder (parpadeante)
          const radius = 5 + Math.sin(time * 2) * 1.5;
          this.ctx.fillStyle = '#ffe600';
          this.ctx.beginPath();
          this.ctx.arc(x + TILE / 2, y + TILE / 2, radius, 0, Math.PI * 2);
          this.ctx.fill();

          // Resplandor exterior
          this.ctx.strokeStyle = 'rgba(255, 230, 0, 0.4)';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        } else if (tile === 5) {
          // Puerta de la casa de fantasmas
          this.ctx.fillStyle = '#ffb8ff';
          this.ctx.fillRect(x, y + TILE / 2 - 2, TILE, 4);
        }
      }
    }
  }

  // --- BUCLE PRINCIPAL (Game Loop) ---
  loop() {
    // Limpiar canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dibujar laberinto
    this.drawMap();

    if (this.state === 'PLAYING') {
      this.pacman.update();
      for (const ghost of this.ghosts) {
        ghost.update();
      }
      this.checkGhostCollisions();
    }

    // Dibujar personajes
    this.pacman.draw(this.ctx);
    for (const ghost of this.ghosts) {
      ghost.draw(this.ctx);
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}

// Inicializar el juego al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  new PacmanGame();
});
