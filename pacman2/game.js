/**
 * Pac-Man HTML5 - Motor de Juego Clásico
 * Implementación con Canvas, Audio sintetizado Web Audio API,
 * IA de Fantasmas, y controles táctiles/teclado.
 */

// =============================================================================
// 1. CONFIGURACIÓN Y CONSTANTES DEL JUEGO
// =============================================================================
const TILE_SIZE = 24;
const GRID_ROWS = 21;
const GRID_COLS = 21;

// Tipos de celdas en el mapa
const TILE_EMPTY = 0;
const TILE_WALL = 1;
const TILE_DOT = 2;
const TILE_POWER = 3;
const TILE_GATE = 5;
const TILE_HOUSE = 6;

// Matriz del Mapa (21 x 21 simétrico)
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
  [1,1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,1,5,1,1,0,1,2,1,1,1,1,1],
  [0,0,0,0,0,2,0,0,1,6,6,6,1,0,0,2,0,0,0,0,0], // Túnel fila 10
  [1,1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1,1],
  [0,0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0,0],
  [1,1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,3,2,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,2,3,1],
  [1,1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1,1],
  [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Direcciones
const DIR = {
  UP:    { x:  0, y: -1, angle: 1.5 * Math.PI },
  DOWN:  { x:  0, y:  1, angle: 0.5 * Math.PI },
  LEFT:  { x: -1, y:  0, angle: 1.0 * Math.PI },
  RIGHT: { x:  1, y:  0, angle: 0.0 * Math.PI },
  NONE:  { x:  0, y:  0, angle: 0.0 * Math.PI }
};

// Estados del juego
const STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  DYING: 'DYING',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER'
};

// =============================================================================
// 2. SISTEMA DE AUDIO (Sintetizador Web Audio API)
// =============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastChompTone = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio no soportado o bloqueado por el navegador
    }
  }

  playChomp() {
    if (this.muted) return;
    const freq = this.lastChompTone === 0 ? 320 : 480;
    this.lastChompTone = 1 - this.lastChompTone;
    this.playTone(freq, 'triangle', 0.07, 0.08);
  }

  playPowerPellet() {
    if (this.muted) return;
    this.playTone(600, 'square', 0.15, 0.09);
    setTimeout(() => this.playTone(850, 'square', 0.15, 0.09), 100);
  }

  playEatGhost() {
    if (this.muted) return;
    this.playTone(550, 'square', 0.08, 0.12);
    setTimeout(() => this.playTone(900, 'square', 0.12, 0.15), 70);
  }

  playDeath() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {}
  }

  playWin() {
    if (this.muted) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.18, 0.12), idx * 120);
    });
  }
}

// =============================================================================
// 3. CLASES DE ENTIDADES (Pac-Man & Fantasmas)
// =============================================================================
class Pacman {
  constructor(col, row) {
    this.spawnCol = col;
    this.spawnRow = row;
    this.reset();
  }

  reset() {
    this.x = (this.spawnCol + 0.5) * TILE_SIZE;
    this.y = (this.spawnRow + 0.5) * TILE_SIZE;
    this.dir = DIR.NONE;
    this.nextDir = DIR.NONE;
    this.speed = 2.4; // píxeles por fotograma
    this.radius = 10;
    this.mouthAngle = 0.2;
    this.mouthOpening = true;
    this.mouthSpeed = 0.02;
    this.dyingAngle = 0;
  }

  setDirection(direction) {
    this.nextDir = direction;
    // Si la nueva dirección es opuesta a la actual, girar inmediatamente
    if (
      this.dir !== DIR.NONE &&
      direction.x === -this.dir.x &&
      direction.y === -this.dir.y
    ) {
      this.dir = direction;
    }
  }

  update(map) {
    // 1. Intentar cambiar a nextDir si estamos alineados con la cuadrícula
    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);
    const centerX = (col + 0.5) * TILE_SIZE;
    const centerY = (row + 0.5) * TILE_SIZE;
    const distToCenter = Math.hypot(this.x - centerX, this.y - centerY);

    if (distToCenter <= this.speed && this.nextDir !== this.dir) {
      const nextCol = col + this.nextDir.x;
      const nextRow = row + this.nextDir.y;
      if (this.canMoveTo(nextCol, nextRow, map)) {
        this.x = centerX;
        this.y = centerY;
        this.dir = this.nextDir;
      }
    }

    // 2. Comprobar si puede seguir en la dirección actual
    if (this.dir !== DIR.NONE) {
      const nextCol = col + this.dir.x;
      const nextRow = row + this.dir.y;
      
      // Si nos acercamos a una pared en la dirección actual
      const movingTowardsWall = !this.canMoveTo(nextCol, nextRow, map);
      if (movingTowardsWall) {
        const passedCenter = 
          (this.dir.x > 0 && this.x >= centerX) ||
          (this.dir.x < 0 && this.x <= centerX) ||
          (this.dir.y > 0 && this.y >= centerY) ||
          (this.dir.y < 0 && this.y <= centerY);

        if (passedCenter) {
          this.x = centerX;
          this.y = centerY;
          this.dir = DIR.NONE;
        }
      }
    }

    // 3. Mover a Pac-Man
    this.x += this.dir.x * this.speed;
    this.y += this.dir.y * this.speed;

    // 4. Lógica de túnel (envolver pantalla en bordes izquierdo/derecho)
    const totalWidth = GRID_COLS * TILE_SIZE;
    if (this.x < -TILE_SIZE / 2) {
      this.x = totalWidth + TILE_SIZE / 2;
    } else if (this.x > totalWidth + TILE_SIZE / 2) {
      this.x = -TILE_SIZE / 2;
    }

    // 5. Animación de la boca
    if (this.dir !== DIR.NONE) {
      if (this.mouthOpening) {
        this.mouthAngle += this.mouthSpeed;
        if (this.mouthAngle >= 0.28) this.mouthOpening = false;
      } else {
        this.mouthAngle -= this.mouthSpeed;
        if (this.mouthAngle <= 0.04) this.mouthOpening = true;
      }
    }
  }

  canMoveTo(col, row, map) {
    if (row < 0 || row >= GRID_ROWS) return false;
    // Permitir túnel lateral
    if (col < 0 || col >= GRID_COLS) return true;
    const tile = map[row][col];
    return tile !== TILE_WALL && tile !== TILE_GATE && tile !== TILE_HOUSE;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    let angle = this.dir.angle;
    if (this.dir === DIR.NONE) angle = 0;
    ctx.rotate(angle);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      this.radius,
      this.mouthAngle * Math.PI,
      (2 - this.mouthAngle) * Math.PI
    );
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Sombra suave / brillo retro
    ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  drawDying(ctx, progress) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const startAngle = progress * Math.PI;
    const endAngle = (2 - progress) * Math.PI;

    if (startAngle < endAngle) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, startAngle, endAngle);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

class Ghost {
  constructor(name, color, spawnCol, spawnRow, targetCorner, releaseDelay) {
    this.name = name;
    this.color = color;
    this.spawnCol = spawnCol;
    this.spawnRow = spawnRow;
    this.targetCorner = targetCorner; // Col, Row de dispersión
    this.releaseDelay = releaseDelay; // milisegundos en la casa
    this.reset();
  }

  reset() {
    this.x = (this.spawnCol + 0.5) * TILE_SIZE;
    this.y = (this.spawnRow + 0.5) * TILE_SIZE;
    this.baseY = this.y;
    this.dir = DIR.UP;
    this.speed = 2.0;
    this.mode = 'HOUSE'; // 'HOUSE', 'CHASE', 'FRIGHTENED', 'EATEN'
    this.frightenedTimer = 0;
    this.houseTimer = this.releaseDelay;
    this.waveOffset = 0;
  }

  update(pacman, map, deltaTime) {
    this.waveOffset += 0.15;

    // Reducir temporizadores y animación de rebote en la casa
    if (this.mode === 'HOUSE') {
      this.houseTimer -= deltaTime;
      if (this.houseTimer > 0) {
        // Suave rebote vertical mientras espera en la casa
        this.y = this.baseY + Math.sin(this.waveOffset * 0.8) * 3;
        return;
      }

      // Mover hacia la puerta de salida (Col 10, Row 8)
      const exitX = 10.5 * TILE_SIZE;
      const exitY = 8.5 * TILE_SIZE;
      if (Math.abs(this.x - exitX) > 1.5) {
        this.x += (exitX > this.x ? 1 : -1) * 1.5;
      } else if (Math.abs(this.y - exitY) > 1.5) {
        this.y += (exitY > this.y ? 1 : -1) * 1.5;
      } else {
        this.x = exitX;
        this.y = exitY;
        this.mode = 'CHASE';
        this.dir = DIR.LEFT;
      }
      return;
    }

    // Comprobar si está en el túnel lateral (ralentizar fantasma)
    const currentCol = Math.floor(this.x / TILE_SIZE);
    const currentRow = Math.floor(this.y / TILE_SIZE);
    const inTunnel = currentRow === 10 && (currentCol <= 4 || currentCol >= 16);

    if (this.mode === 'FRIGHTENED') {
      this.frightenedTimer -= deltaTime;
      this.speed = inTunnel ? 0.9 : 1.3;
      if (this.frightenedTimer <= 0) {
        this.mode = 'CHASE';
        this.speed = 2.0;
      }
    } else if (this.mode === 'EATEN') {
      this.speed = 3.6;
      // Si llegó a la casa de fantasmas, revivir
      const houseX = 10.5 * TILE_SIZE;
      const houseY = 9.5 * TILE_SIZE;
      if (Math.hypot(this.x - houseX, this.y - houseY) < 8) {
        this.x = houseX;
        this.y = houseY;
        this.mode = 'HOUSE';
        this.houseTimer = 1200; // Espera 1.2 segundos y vuelve a salir
        this.speed = 2.0;
        return;
      }
    } else {
      this.speed = inTunnel ? 1.2 : 2.0;
    }

    // Comprobar si está en el centro de una celda
    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);
    const centerX = (col + 0.5) * TILE_SIZE;
    const centerY = (row + 0.5) * TILE_SIZE;
    const distToCenter = Math.hypot(this.x - centerX, this.y - centerY);

    if (distToCenter <= this.speed) {
      this.x = centerX;
      this.y = centerY;
      this.chooseNextDirection(pacman, map, col, row);
    }

    // Avanzar
    this.x += this.dir.x * this.speed;
    this.y += this.dir.y * this.speed;

    // Envoltura de túnel lateral
    const totalWidth = GRID_COLS * TILE_SIZE;
    if (this.x < -TILE_SIZE / 2) {
      this.x = totalWidth + TILE_SIZE / 2;
    } else if (this.x > totalWidth + TILE_SIZE / 2) {
      this.x = -TILE_SIZE / 2;
    }
  }

  chooseNextDirection(pacman, map, col, row) {
    const possibleDirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];
    const validMoves = [];

    for (const d of possibleDirs) {
      // Un fantasma no puede dar la vuelta 180° a menos que esté asustado
      if (d.x === -this.dir.x && d.y === -this.dir.y && this.mode !== 'FRIGHTENED') {
        continue;
      }

      const nextCol = col + d.x;
      const nextRow = row + d.y;

      if (this.canPass(nextCol, nextRow, map)) {
        validMoves.push(d);
      }
    }

    if (validMoves.length === 0) {
      // Giro forzado si quedó atrapado
      this.dir = { x: -this.dir.x, y: -this.dir.y, angle: this.dir.angle + Math.PI };
      return;
    }

    // Si está asustado: movimiento aleatorio
    if (this.mode === 'FRIGHTENED') {
      const randomIndex = Math.floor(Math.random() * validMoves.length);
      this.dir = validMoves[randomIndex];
      return;
    }

    // Determinar casilla objetivo
    let target = { col: 10, row: 16 };
    if (this.mode === 'EATEN') {
      target = { col: 10, row: 9 }; // Entrada de la casa de fantasmas
    } else {
      target = this.getTargetTile(pacman);
    }

    // Elegir el movimiento que minimiza la distancia euclidiana al objetivo
    let bestMove = validMoves[0];
    let bestDist = Infinity;

    for (const move of validMoves) {
      const nCol = col + move.x;
      const nRow = row + move.y;
      const dist = Math.hypot(nCol - target.col, nRow - target.row);
      if (dist < bestDist) {
        bestDist = dist;
        bestMove = move;
      }
    }

    this.dir = bestMove;
  }

  getTargetTile(pacman) {
    const pacCol = Math.floor(pacman.x / TILE_SIZE);
    const pacRow = Math.floor(pacman.y / TILE_SIZE);

    switch (this.name) {
      case 'Blinky': // Persecución directa
        return { col: pacCol, row: pacRow };
      case 'Pinky': // Emboscada: 3 casillas por delante de Pac-Man
        return {
          col: pacCol + pacman.dir.x * 3,
          row: pacRow + pacman.dir.y * 3
        };
      case 'Inky': // Patrulla / flanco
        return {
          col: pacCol - pacman.dir.x * 2,
          row: pacRow - pacman.dir.y * 2
        };
      case 'Clyde': // Tímido: si está cerca huye a su esquina, si está lejos persigue
        const dist = Math.hypot(
          Math.floor(this.x / TILE_SIZE) - pacCol,
          Math.floor(this.y / TILE_SIZE) - pacRow
        );
        return dist > 6 ? { col: pacCol, row: pacRow } : this.targetCorner;
      default:
        return { col: pacCol, row: pacRow };
    }
  }

  canPass(col, row, map) {
    if (row < 0 || row >= GRID_ROWS) return false;
    if (col < 0 || col >= GRID_COLS) return true; // túnel
    const tile = map[row][col];
    if (tile === TILE_WALL) return false;
    if (tile === TILE_GATE && this.mode !== 'EATEN') return false;
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const r = 10;

    // Solo ojos si está devorado
    if (this.mode === 'EATEN') {
      this.drawEyes(ctx);
      ctx.restore();
      return;
    }

    // Color del cuerpo
    let bodyColor = this.color;
    if (this.mode === 'FRIGHTENED') {
      // Parpadeo cuando le quedan menos de 2.5 segundos
      if (this.frightenedTimer < 2500 && Math.floor(this.frightenedTimer / 250) % 2 === 0) {
        bodyColor = '#ffffff';
      } else {
        bodyColor = '#2563eb';
      }
    }

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    // Cabeza redondeada
    ctx.arc(0, -2, r, Math.PI, 0, false);
    // Costado derecho
    ctx.lineTo(r, r - 2);

    // Falda ondulada inferior animada
    const wave = Math.sin(this.waveOffset) * 2;
    ctx.quadraticCurveTo(r * 0.6, r - 6 + wave, r * 0.3, r - 2);
    ctx.quadraticCurveTo(0, r + 2 - wave, -r * 0.3, r - 2);
    ctx.quadraticCurveTo(-r * 0.6, r - 6 + wave, -r, r - 2);

    ctx.lineTo(-r, -2);
    ctx.closePath();
    ctx.fill();

    // Dibujar ojos o expresión asustada
    if (this.mode === 'FRIGHTENED') {
      // Ojos pequeños blancos
      ctx.fillStyle = bodyColor === '#ffffff' ? '#ef4444' : '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Boca ondulada
      ctx.strokeStyle = bodyColor === '#ffffff' ? '#ef4444' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(-2, 2);
      ctx.lineTo(1, 4);
      ctx.lineTo(4, 2);
      ctx.stroke();
    } else {
      this.drawEyes(ctx);
    }

    ctx.restore();
  }

  drawEyes(ctx) {
    const eyeOffsetX = this.dir.x * 2.5;
    const eyeOffsetY = this.dir.y * 2.5;

    // Globos oculares blancos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-4 + eyeOffsetX * 0.4, -3 + eyeOffsetY * 0.4, 3.5, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(4 + eyeOffsetX * 0.4, -3 + eyeOffsetY * 0.4, 3.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupilas azules
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(-4 + eyeOffsetX, -3 + eyeOffsetY, 2, 0, Math.PI * 2);
    ctx.arc(4 + eyeOffsetX, -3 + eyeOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// =============================================================================
// 4. CONTROLADOR PRINCIPAL DEL JUEGO
// =============================================================================
class PacmanGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();

    // Elementos del DOM
    this.scoreEl = document.getElementById('score');
    this.highScoreEl = document.getElementById('high-score');
    this.levelEl = document.getElementById('level');
    this.livesIconsEl = document.getElementById('livesIcons');
    this.startOverlay = document.getElementById('startOverlay');
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.gameOverOverlay = document.getElementById('gameOverOverlay');
    this.levelClearOverlay = document.getElementById('levelClearOverlay');
    this.finalScoreText = document.getElementById('finalScoreText');

    // Botones
    this.startBtn = document.getElementById('startBtn');
    this.resumeBtn = document.getElementById('resumeBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.resetGameBtn = document.getElementById('resetGameBtn');
    this.soundBtn = document.getElementById('soundBtn');

    // Estado del juego
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman_high_score') || '0', 10);
    this.level = 1;
    this.lives = 3;
    this.gameState = STATE.START;
    this.totalPellets = 0;
    this.pelletsEaten = 0;
    this.floatingScores = []; // Para mostrar "+200", etc.

    // Fantasmas comidos sucesivamente durante una misma energización
    this.ghostScoreMultiplier = 1;

    // Temporizador de muerte
    this.dyingProgress = 0;

    // Inicializar mapa y entidades
    this.map = [];
    this.pacman = new Pacman(10, 16);
    this.ghosts = [
      new Ghost('Blinky', '#ef4444', 10, 8, { col: 19, row: 1 }, 0),
      new Ghost('Pinky',  '#f472b6', 9,  10, { col: 1,  row: 1 }, 2000),
      new Ghost('Inky',   '#38bdf8', 10, 10, { col: 19, row: 19 }, 5000),
      new Ghost('Clyde',  '#fb923c', 11, 10, { col: 1,  row: 19 }, 8000)
    ];

    // Fruta de bonificación (Cereza clásica)
    this.fruit = null;
    this.fruitSpawnCount = 0;

    this.lastTime = 0;
    this.setupListeners();
    this.resetMap();
    this.updateHUD();
    this.render();
  }

  resetMap() {
    this.map = INITIAL_MAP.map(row => [...row]);
    this.totalPellets = 0;
    this.pelletsEaten = 0;
    this.fruit = null;
    this.fruitSpawnCount = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.map[r][c] === TILE_DOT || this.map[r][c] === TILE_POWER) {
          this.totalPellets++;
        }
      }
    }
  }

  startNewGame() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.resetMap();
    this.resetPositions();
    this.gameState = STATE.PLAYING;
    this.hideAllOverlays();
    this.updateHUD();
    this.sound.init();
    this.sound.playWin();
  }

  nextLevel() {
    this.level++;
    this.resetMap();
    this.resetPositions();
    this.gameState = STATE.PLAYING;
    this.levelClearOverlay.classList.add('hidden');
    this.updateHUD();
    this.sound.playWin();
  }

  resetPositions() {
    this.pacman.reset();
    this.ghosts.forEach(ghost => ghost.reset());
    this.ghostScoreMultiplier = 1;
  }

  setupListeners() {
    // Teclado
    window.addEventListener('keydown', (e) => {
      // Activar audio en primer toque de usuario
      this.sound.init();

      if (e.code === 'KeyP') {
        this.togglePause();
        return;
      }

      if (this.gameState === STATE.START && (e.code === 'Space' || e.code === 'Enter')) {
        this.startNewGame();
        return;
      }

      if (this.gameState === STATE.GAME_OVER && (e.code === 'Space' || e.code === 'Enter')) {
        this.startNewGame();
        return;
      }

      let newDir = null;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          newDir = DIR.UP;
          break;
        case 'ArrowDown':
        case 'KeyS':
          newDir = DIR.DOWN;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          newDir = DIR.LEFT;
          break;
        case 'ArrowRight':
        case 'KeyD':
          newDir = DIR.RIGHT;
          break;
      }

      if (newDir) {
        e.preventDefault();
        this.pacman.setDirection(newDir);
        if (this.gameState === STATE.START) {
          this.startNewGame();
        }
      }
    });

    // Botones UI
    this.startBtn.addEventListener('click', () => this.startNewGame());
    this.resumeBtn.addEventListener('click', () => this.togglePause());
    this.restartBtn.addEventListener('click', () => this.startNewGame());
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.resetGameBtn.addEventListener('click', () => this.startNewGame());

    // Botón de sonido
    this.soundBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.soundBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    // Controles táctiles D-Pad
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      const handlePress = (e) => {
        e.preventDefault();
        this.sound.init();
        if (this.gameState === STATE.START) {
          this.startNewGame();
          return;
        }
        const dirName = btn.getAttribute('data-dir');
        if (DIR[dirName]) {
          this.pacman.setDirection(DIR[dirName]);
        }
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('mousedown', handlePress);
    });
  }

  togglePause() {
    if (this.gameState === STATE.PLAYING) {
      this.gameState = STATE.PAUSED;
      this.pauseOverlay.classList.remove('hidden');
    } else if (this.gameState === STATE.PAUSED) {
      this.gameState = STATE.PLAYING;
      this.pauseOverlay.classList.add('hidden');
    }
  }

  hideAllOverlays() {
    this.startOverlay.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.levelClearOverlay.classList.add('hidden');
  }

  updateHUD() {
    this.scoreEl.textContent = String(this.score).padStart(5, '0');
    this.highScoreEl.textContent = String(this.highScore).padStart(5, '0');
    this.levelEl.textContent = this.level;

    // Actualizar iconos de vidas
    this.livesIconsEl.innerHTML = '';
    for (let i = 0; i < Math.max(0, this.lives - 1); i++) {
      const life = document.createElement('div');
      life.className = 'life-icon';
      this.livesIconsEl.appendChild(life);
    }
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman_high_score', this.highScore.toString());
    }
    this.updateHUD();
  }

  // Bucle principal de actualización (60 FPS)
  update(deltaTime) {
    if (this.gameState === STATE.PLAYING) {
      // 1. Mover a Pacman
      this.pacman.update(this.map);

      // 2. Comer puntos o energizantes
      const col = Math.floor(this.pacman.x / TILE_SIZE);
      const row = Math.floor(this.pacman.y / TILE_SIZE);

      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const currentTile = this.map[row][col];
        if (currentTile === TILE_DOT) {
          this.map[row][col] = TILE_EMPTY;
          this.addScore(10);
          this.pelletsEaten++;
          this.sound.playChomp();
        } else if (currentTile === TILE_POWER) {
          this.map[row][col] = TILE_EMPTY;
          this.addScore(50);
          this.pelletsEaten++;
          this.sound.playPowerPellet();
          this.ghostScoreMultiplier = 1;

          // Poner a todos los fantasmas en modo asustado
          this.ghosts.forEach(ghost => {
            if (ghost.mode !== 'EATEN' && ghost.mode !== 'HOUSE') {
              ghost.mode = 'FRIGHTENED';
              ghost.frightenedTimer = 7500; // 7.5 segundos
            }
          });
        }
      }

      // 3. Generar y comprobar fruta de bonificación (cereza)
      if ((this.pelletsEaten >= 60 && this.fruitSpawnCount === 0) || 
          (this.pelletsEaten >= 130 && this.fruitSpawnCount === 1)) {
        this.fruitSpawnCount++;
        this.fruit = {
          x: 10.5 * TILE_SIZE,
          y: 12.5 * TILE_SIZE,
          life: 9000,
          points: 100
        };
      }

      if (this.fruit) {
        this.fruit.life -= deltaTime;
        const fruitDist = Math.hypot(this.pacman.x - this.fruit.x, this.pacman.y - this.fruit.y);
        if (fruitDist < TILE_SIZE * 0.75) {
          this.addScore(this.fruit.points);
          this.sound.playTone(700, 'triangle', 0.12, 0.15);
          setTimeout(() => this.sound.playTone(1050, 'triangle', 0.18, 0.15), 100);
          this.floatingScores.push({
            text: `+${this.fruit.points}`,
            x: this.fruit.x,
            y: this.fruit.y,
            life: 1200
          });
          this.fruit = null;
        } else if (this.fruit.life <= 0) {
          this.fruit = null;
        }
      }

      // 4. Comprobar si completó el nivel
      if (this.pelletsEaten >= this.totalPellets) {
        this.gameState = STATE.LEVEL_CLEAR;
        this.levelClearOverlay.classList.remove('hidden');
        this.sound.playWin();
        setTimeout(() => this.nextLevel(), 2200);
        return;
      }

      // 5. Actualizar fantasmas y colisiones
      this.ghosts.forEach(ghost => {
        ghost.update(this.pacman, this.map, deltaTime);

        // Comprobar colisión entre Pac-Man y fantasma
        const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);
        if (dist < TILE_SIZE * 0.75) {
          if (ghost.mode === 'FRIGHTENED') {
            // ¡Pac-Man come al fantasma!
            ghost.mode = 'EATEN';
            const bonus = 200 * this.ghostScoreMultiplier;
            this.addScore(bonus);
            this.sound.playEatGhost();

            // Texto flotante de puntuación
            this.floatingScores.push({
              text: `+${bonus}`,
              x: ghost.x,
              y: ghost.y,
              life: 1000
            });

            this.ghostScoreMultiplier *= 2;
          } else if (ghost.mode === 'CHASE') {
            // El fantasma atrapó a Pac-Man
            this.handlePacmanDeath();
          }
        }
      });
    } else if (this.gameState === STATE.DYING) {
      this.dyingProgress += deltaTime / 900;
      if (this.dyingProgress >= 1) {
        this.lives--;
        this.updateHUD();
        if (this.lives > 0) {
          this.resetPositions();
          this.gameState = STATE.PLAYING;
        } else {
          this.gameState = STATE.GAME_OVER;
          this.finalScoreText.textContent = `Puntuación final: ${this.score}`;
          this.gameOverOverlay.classList.remove('hidden');
        }
      }
    }

    // Actualizar textos de puntuación flotante
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.life -= deltaTime;
      fs.y -= 0.4;
      if (fs.life <= 0) {
        this.floatingScores.splice(i, 1);
      }
    }
  }

  handlePacmanDeath() {
    this.gameState = STATE.DYING;
    this.dyingProgress = 0;
    this.sound.playDeath();
  }

  // =============================================================================
  // 5. RENDERIZADO GRÁFICO (Canvas)
  // =============================================================================
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Dibujar el laberinto
    this.drawMaze(ctx);

    // 2. Dibujar entidades
    if (this.gameState === STATE.DYING) {
      this.pacman.drawDying(ctx, this.dyingProgress);
    } else {
      this.pacman.draw(ctx);
    }

    // Dibujar fruta de bonificación si está presente
    if (this.fruit) {
      this.drawFruit(ctx, this.fruit.x, this.fruit.y);
    }

    this.ghosts.forEach(ghost => ghost.draw(ctx));

    // 3. Dibujar puntuaciones flotantes
    ctx.save();
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    this.floatingScores.forEach(fs => {
      ctx.fillText(fs.text, fs.x, fs.y);
    });
    ctx.restore();
  }

  drawFruit(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Tallos verdes
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(3, -7);
    ctx.quadraticCurveTo(0, -3, -3, 2);
    ctx.moveTo(3, -7);
    ctx.quadraticCurveTo(4, -2, 3, 2);
    ctx.stroke();

    // Hoja
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(5, -6, 2.5, 1.5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Cerezas rojas
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-3, 3, 4, 0, Math.PI * 2);
    ctx.arc(3, 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Brillos
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(-4, 1.5, 1.2, 0, Math.PI * 2);
    ctx.arc(2, 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMaze(ctx) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = this.map[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        const cx = x + TILE_SIZE / 2;
        const cy = y + TILE_SIZE / 2;

        if (tile === TILE_WALL) {
          // Bloque de pared azul neón clásico
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === TILE_GATE) {
          // Puerta de la casa de fantasmas
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
        } else if (tile === TILE_DOT) {
          // Píldora normal
          ctx.fillStyle = '#ffde59';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TILE_POWER) {
          // Píldora de poder (parpadeante)
          const radius = 6 + pulse * 1.5;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  // Bucle de animación (Game Loop)
  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(time => this.loop(time));
  }
}

// Iniciar el juego al cargar el documento
window.addEventListener('DOMContentLoaded', () => {
  const game = new PacmanGame();
  requestAnimationFrame(time => game.loop(time));
});
