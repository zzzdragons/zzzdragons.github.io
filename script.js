const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');
const gameTabs = document.querySelectorAll('[data-game-tab]');
const gamePanels = document.querySelectorAll('[data-game-panel]');
const canvas = document.querySelector('#snake-canvas');
const tetrisCanvas = document.querySelector('#tetris-canvas');
const startButton = document.querySelector('#start-btn');
const pauseButton = document.querySelector('#pause-btn');
const restartButton = document.querySelector('#restart-btn');
const tetrisStartButton = document.querySelector('#tetris-start-btn');
const tetrisPauseButton = document.querySelector('#tetris-pause-btn');
const tetrisRestartButton = document.querySelector('#tetris-restart-btn');
const scoreEl = document.querySelector('#score');
const highScoreEl = document.querySelector('#high-score');
const statusEl = document.querySelector('#game-status');
const tetrisScoreEl = document.querySelector('#tetris-score');
const tetrisLinesEl = document.querySelector('#tetris-lines');
const tetrisLevelEl = document.querySelector('#tetris-level');
const tetrisHighScoreEl = document.querySelector('#tetris-high-score');
const padButtons = document.querySelectorAll('[data-snake-dir]');
const tetrisPadButtons = document.querySelectorAll('[data-tetris-action]');
const gamesSection = document.querySelector('#games');
let activeGame = 'snake';
const COLORS = {
  board: '#0f1724',
  snake: '#76d07f',
  head: '#d8f7db',
  food: '#ff7c7c'
};

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const next = nav.dataset.open !== 'true';
    nav.dataset.open = String(next);
    navToggle.setAttribute('aria-expanded', String(next));
  });
}

function updateGameTabs() {
  gameTabs.forEach(tab => {
    const isActive = tab.dataset.gameTab === activeGame;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  gamePanels.forEach(panel => {
    const isActive = panel.dataset.gamePanel === activeGame;
    panel.hidden = !isActive;
    panel.classList.toggle('is-active', isActive);
  });

  if (gamesSection) {
    gamesSection.dataset.activeGame = activeGame;
  }
}

function setActiveGame(name) {
  if (name !== 'snake' && name !== 'tetris') return;
  if (activeGame === name) {
    updateGameTabs();
    return;
  }

  if (activeGame === 'snake') {
    pauseGame(true);
  } else if (activeGame === 'tetris') {
    pauseTetris(true);
  }

  activeGame = name;
  updateGameTabs();

  window.requestAnimationFrame(() => {
    if (activeGame === 'snake') {
      resizeCanvas();
      canvas?.focus();
    } else {
      resizeTetrisCanvas();
      tetrisCanvas?.focus();
    }
  });
}

const game = {
  cols: 20,
  rows: 20,
  intervalMs: 120,
  timerId: null,
  resizeHandle: null,
  boardSize: 480,
  cellSize: 24,
  ready: true,
  running: false,
  paused: false,
  gameOver: false,
  score: 0,
  highScore: 0,
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  snake: [],
  food: { x: 10, y: 10 }
};

function loadHighScore() {
  try {
    const saved = Number(window.localStorage.getItem('snake-high-score'));
    if (Number.isFinite(saved) && saved > 0) {
      game.highScore = saved;
    }
  } catch {
    game.highScore = 0;
  }
}

function saveHighScore() {
  try {
    window.localStorage.setItem('snake-high-score', String(game.highScore));
  } catch {
    // localStorage unavailable, ignore
  }
}

function updateScoreboard() {
  if (scoreEl) scoreEl.textContent = String(game.score);
  if (highScoreEl) highScoreEl.textContent = String(game.highScore);
  if (gamesSection) {
    gamesSection.dataset.running = String(game.running);
    gamesSection.dataset.paused = String(game.paused);
    gamesSection.dataset.gameOver = String(game.gameOver);
    gamesSection.dataset.direction = `${game.direction.x},${game.direction.y}`;
    gamesSection.dataset.nextDirection = `${game.nextDirection.x},${game.nextDirection.y}`;
    gamesSection.dataset.score = String(game.score);
    gamesSection.dataset.highScore = String(game.highScore);
    gamesSection.dataset.snakeLength = String(game.snake.length);
    gamesSection.dataset.head = `${game.snake[0]?.x ?? -1},${game.snake[0]?.y ?? -1}`;
    gamesSection.dataset.food = `${game.food.x},${game.food.y}`;
    gamesSection.dataset.state = game.gameOver ? 'gameover' : game.paused ? 'paused' : game.running ? 'running' : 'ready';
  }
  if (statusEl) {
    if (game.gameOver) {
      statusEl.textContent = '게임 오버';
    } else if (game.paused) {
      statusEl.textContent = '일시정지';
    } else if (game.running) {
      statusEl.textContent = '진행 중';
    } else {
      statusEl.textContent = '준비';
    }
  }
}

function resizeCanvas() {
  if (!canvas) return;
  const size = canvas.clientWidth || 480;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.boardSize = size;
  game.cellSize = size / game.cols;
  render();
}

function makeFood() {
  let food;
  do {
    food = {
      x: Math.floor(Math.random() * game.cols),
      y: Math.floor(Math.random() * game.rows)
    };
  } while (game.snake.some(segment => segment.x === food.x && segment.y === food.y));
  return food;
}

function resetGame() {
  game.score = 0;
  game.ready = true;
  game.running = false;
  game.paused = false;
  game.gameOver = false;
  game.direction = { x: 1, y: 0 };
  game.nextDirection = { x: 1, y: 0 };
  game.snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  game.food = makeFood();
  updateScoreboard();
  render();
}

function stopTimer() {
  if (game.timerId !== null) {
    window.clearInterval(game.timerId);
    game.timerId = null;
  }
}

function ensureTimer() {
  stopTimer();
  game.timerId = window.setInterval(tick, game.intervalMs);
}

function startGame() {
  if (game.gameOver || game.ready) {
    resetGame();
  }
  if (!game.running) {
    game.running = true;
    game.paused = false;
    updateScoreboard();
    ensureTimer();
    return;
  }
  if (game.paused) {
    game.paused = false;
    updateScoreboard();
    ensureTimer();
  }
}

function pauseGame(nextPaused) {
  if (!game.running || game.gameOver) return;
  if (typeof nextPaused === 'boolean') {
    game.paused = nextPaused;
  } else {
    game.paused = !game.paused;
  }
  if (game.paused) {
    stopTimer();
  } else {
    ensureTimer();
  }
  updateScoreboard();
}

function finishGame() {
  game.running = false;
  game.paused = false;
  game.gameOver = true;
  stopTimer();
  if (game.score > game.highScore) {
    game.highScore = game.score;
    saveHighScore();
  }
  updateScoreboard();
  render();
}

function setDirection(next) {
  const opposite = game.direction.x + next.x === 0 && game.direction.y + next.y === 0;
  if (opposite && game.snake.length > 1) {
    return;
  }
  game.nextDirection = next;
}

function moveSnake() {
  game.direction = { ...game.nextDirection };
  const head = game.snake[0];
  const nextHead = {
    x: head.x + game.direction.x,
    y: head.y + game.direction.y
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= game.cols ||
    nextHead.y >= game.rows;

  const hitSelf = game.snake.some(segment => segment.x === nextHead.x && segment.y === nextHead.y);
  if (hitWall || hitSelf) {
    finishGame();
    return;
  }

  game.snake.unshift(nextHead);
  if (nextHead.x === game.food.x && nextHead.y === game.food.y) {
    game.score += 10;
    if (game.score > game.highScore) {
      game.highScore = game.score;
      saveHighScore();
    }
    game.food = makeFood();
  } else {
    game.snake.pop();
  }

  updateScoreboard();
  render();
}

function tick() {
  if (!game.running || game.paused || game.gameOver) return;
  moveSnake();
}

function drawCell(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x * game.cellSize),
    Math.round(y * game.cellSize),
    Math.ceil(game.cellSize),
    Math.ceil(game.cellSize)
  );
}

function renderGrid(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= game.cols; i += 1) {
    const pos = Math.round(i * game.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, game.boardSize);
    ctx.stroke();
  }
  for (let i = 0; i <= game.rows; i += 1) {
    const pos = Math.round(i * game.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(game.boardSize, pos);
    ctx.stroke();
  }
}

function render() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, game.boardSize, game.boardSize);
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(0, 0, game.boardSize, game.boardSize);
  renderGrid(ctx);

  game.snake.forEach((segment, index) => {
    const color = index === 0 ? COLORS.head : COLORS.snake;
    drawCell(ctx, segment.x, segment.y, color);
  });
  drawCell(ctx, game.food.x, game.food.y, COLORS.food);

  if (game.paused) {
    overlayMessage('일시정지');
  } else if (game.gameOver) {
    overlayMessage('게임 오버 - 재시작을 누르세요');
  }
}

function overlayMessage(message) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(7, 12, 20, 0.72)';
  ctx.fillRect(game.boardSize * 0.15, game.boardSize * 0.42, game.boardSize * 0.7, game.boardSize * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 18px Arial, sans-serif';
  ctx.fillText(message, game.boardSize / 2, game.boardSize / 2);
}

function bindKeyboard() {
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (activeGame === 'snake') {
      const map = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 }
      };
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        pauseGame();
        return;
      }
      if (key in map) {
        event.preventDefault();
        if (!game.running && !game.gameOver) {
          startGame();
        }
        setDirection(map[key]);
        return;
      }
      if (key === 'enter') {
        event.preventDefault();
        if (game.gameOver || game.ready) {
          startGame();
        }
      }
      return;
    }

    handleTetrisKeydown(event);
  });
}

function bindGameTabs() {
  gameTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveGame(tab.dataset.gameTab);
    });
  });
}

function bindTouchButtons() {
  padButtons.forEach(button => {
    button.addEventListener('click', () => {
      const dir = button.dataset.snakeDir;
      const map = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      };
      if (!game.running && !game.gameOver) {
        startGame();
      }
      if (map[dir]) {
        setDirection(map[dir]);
      }
    });
  });
}

function bindTetrisTouchButtons() {
  tetrisPadButtons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.tetrisAction;
      if (!tetris.running && !tetris.gameOver) {
        startTetris();
      }
      if (action === 'left') {
        moveTetris(-1, 0);
      } else if (action === 'right') {
        moveTetris(1, 0);
      } else if (action === 'down') {
        softDropTetris();
      } else if (action === 'rotate') {
        rotateTetrisPiece();
      } else if (action === 'drop') {
        hardDropTetris();
      }
    }
    );
  });
}

function bindButtons() {
  if (startButton) startButton.addEventListener('click', startGame);
  if (pauseButton) pauseButton.addEventListener('click', pauseGame);
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      stopTimer();
      resetGame();
      startGame();
    });
  }
  if (tetrisStartButton) tetrisStartButton.addEventListener('click', startTetris);
  if (tetrisPauseButton) tetrisPauseButton.addEventListener('click', pauseTetris);
  if (tetrisRestartButton) {
    tetrisRestartButton.addEventListener('click', () => {
      stopTetrisTimer();
      resetTetris();
      startTetris();
    });
  }
}

function bindResize() {
  const handler = () => {
    window.clearTimeout(game.resizeHandle);
    game.resizeHandle = window.setTimeout(() => {
      if (activeGame === 'snake') {
        resizeCanvas();
      } else {
        resizeTetrisCanvas();
      }
    }, 50);
  };
  window.addEventListener('resize', handler);
  if (window.ResizeObserver && canvas) {
    const observer = new ResizeObserver(handler);
    observer.observe(canvas);
  }
  if (window.ResizeObserver && tetrisCanvas) {
    const observer = new ResizeObserver(handler);
    observer.observe(tetrisCanvas);
  }
}

const TETROMINOES = [
  { id: 'I', color: '#57d0ff', matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'O', color: '#ffd84d', matrix: [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'T', color: '#b78cff', matrix: [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'S', color: '#7be17b', matrix: [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'Z', color: '#ff7f7f', matrix: [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'J', color: '#78a8ff', matrix: [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] },
  { id: 'L', color: '#ffae5f', matrix: [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]] }
];

const tetris = {
  cols: 10,
  rows: 20,
  intervalMs: 650,
  timerId: null,
  resizeHandle: null,
  width: 320,
  height: 640,
  cellSize: 32,
  offsetX: 0,
  offsetY: 0,
  ready: true,
  running: false,
  paused: false,
  gameOver: false,
  score: 0,
  lines: 0,
  level: 1,
  highScore: 0,
  board: [],
  current: null
};

function createEmptyTetrisBoard() {
  return Array.from({ length: tetris.rows }, () => Array.from({ length: tetris.cols }, () => null));
}

function cloneMatrix(matrix) {
  return matrix.map(row => row.slice());
}

function rotateClockwise(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      rotated[x][size - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function rotateCounterClockwise(matrix) {
  return rotateClockwise(rotateClockwise(rotateClockwise(matrix)));
}

function loadTetrisHighScore() {
  try {
    const saved = Number(window.localStorage.getItem('tetris-high-score'));
    if (Number.isFinite(saved) && saved > 0) {
      tetris.highScore = saved;
    }
  } catch {
    tetris.highScore = 0;
  }
}

function saveTetrisHighScore() {
  try {
    window.localStorage.setItem('tetris-high-score', String(tetris.highScore));
  } catch {
    // localStorage unavailable, ignore
  }
}

function updateTetrisScoreboard() {
  if (tetrisScoreEl) tetrisScoreEl.textContent = String(tetris.score);
  if (tetrisLinesEl) tetrisLinesEl.textContent = String(tetris.lines);
  if (tetrisLevelEl) tetrisLevelEl.textContent = String(tetris.level);
  if (tetrisHighScoreEl) tetrisHighScoreEl.textContent = String(tetris.highScore);
  if (gamesSection) {
    gamesSection.dataset.tetrisRunning = String(tetris.running);
    gamesSection.dataset.tetrisPaused = String(tetris.paused);
    gamesSection.dataset.tetrisGameOver = String(tetris.gameOver);
    gamesSection.dataset.tetrisScore = String(tetris.score);
    gamesSection.dataset.tetrisLines = String(tetris.lines);
    gamesSection.dataset.tetrisLevel = String(tetris.level);
    gamesSection.dataset.tetrisHighScore = String(tetris.highScore);
    gamesSection.dataset.tetrisState = tetris.gameOver ? 'gameover' : tetris.paused ? 'paused' : tetris.running ? 'running' : 'ready';
  }
}

function updateTetrisSpeed() {
  tetris.intervalMs = Math.max(100, 650 - (tetris.level - 1) * 50);
}

function stopTetrisTimer() {
  if (tetris.timerId !== null) {
    window.clearInterval(tetris.timerId);
    tetris.timerId = null;
  }
}

function ensureTetrisTimer() {
  stopTetrisTimer();
  tetris.timerId = window.setInterval(tickTetris, tetris.intervalMs);
}

function canPlaceTetris(matrix, originX, originY) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;
      const boardX = originX + x;
      const boardY = originY + y;
      if (boardX < 0 || boardX >= tetris.cols || boardY < 0 || boardY >= tetris.rows) {
        return false;
      }
      if (tetris.board[boardY][boardX]) {
        return false;
      }
    }
  }
  return true;
}

function randomTetromino() {
  const template = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    id: template.id,
    color: template.color,
    matrix: cloneMatrix(template.matrix),
    x: 3,
    y: 0
  };
}

function spawnTetrisPiece() {
  tetris.current = randomTetromino();
  if (!canPlaceTetris(tetris.current.matrix, tetris.current.x, tetris.current.y)) {
    finishTetris();
  }
}

function resetTetris() {
  tetris.ready = true;
  tetris.running = false;
  tetris.paused = false;
  tetris.gameOver = false;
  tetris.score = 0;
  tetris.lines = 0;
  tetris.level = 1;
  tetris.intervalMs = 650;
  tetris.board = createEmptyTetrisBoard();
  tetris.current = null;
  updateTetrisScoreboard();
  renderTetris();
}

function startTetris() {
  if (tetris.gameOver || tetris.ready) {
    resetTetris();
    tetris.ready = false;
    spawnTetrisPiece();
  }
  if (!tetris.running) {
    tetris.running = true;
    tetris.paused = false;
    ensureTetrisTimer();
    updateTetrisScoreboard();
    renderTetris();
    return;
  }
  if (tetris.paused) {
    tetris.paused = false;
    ensureTetrisTimer();
    updateTetrisScoreboard();
    renderTetris();
  }
}

function pauseTetris(nextPaused) {
  if (!tetris.running || tetris.gameOver) return;
  if (typeof nextPaused === 'boolean') {
    tetris.paused = nextPaused;
  } else {
    tetris.paused = !tetris.paused;
  }
  if (tetris.paused) {
    stopTetrisTimer();
  } else {
    ensureTetrisTimer();
  }
  updateTetrisScoreboard();
  renderTetris();
}

function finishTetris() {
  tetris.running = false;
  tetris.paused = false;
  tetris.gameOver = true;
  stopTetrisTimer();
  if (tetris.score > tetris.highScore) {
    tetris.highScore = tetris.score;
    saveTetrisHighScore();
  }
  updateTetrisScoreboard();
  renderTetris();
}

function mergeTetrisPiece() {
  if (!tetris.current) return;
  tetris.current.matrix.forEach((row, rowY) => {
    row.forEach((cell, rowX) => {
      if (!cell) return;
      const boardX = tetris.current.x + rowX;
      const boardY = tetris.current.y + rowY;
      if (boardY >= 0 && boardY < tetris.rows && boardX >= 0 && boardX < tetris.cols) {
        tetris.board[boardY][boardX] = tetris.current.color;
      }
    });
  });
}

function clearTetrisLines() {
  let cleared = 0;
  const nextBoard = [];
  for (let rowIndex = tetris.rows - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = tetris.board[rowIndex];
    const full = row.every(Boolean);
    if (full) {
      cleared += 1;
    } else {
      nextBoard.unshift(row);
    }
  }
  while (nextBoard.length < tetris.rows) {
    nextBoard.unshift(Array.from({ length: tetris.cols }, () => null));
  }
  tetris.board = nextBoard;
  return cleared;
}

function lockTetrisPiece() {
  mergeTetrisPiece();
  const cleared = clearTetrisLines();
  if (cleared > 0) {
    tetris.lines += cleared;
    const lineScores = [0, 100, 300, 500, 800];
    tetris.score += lineScores[cleared] * tetris.level;
    tetris.level = 1 + Math.floor(tetris.lines / 10);
    updateTetrisSpeed();
    if (tetris.running && !tetris.paused) {
      ensureTetrisTimer();
    }
  }
  spawnTetrisPiece();
  if (tetris.running) {
    updateTetrisScoreboard();
    renderTetris();
  }
}

function moveTetris(dx, dy) {
  if (!tetris.running || tetris.paused || tetris.gameOver || !tetris.current) return false;
  const nextX = tetris.current.x + dx;
  const nextY = tetris.current.y + dy;
  if (!canPlaceTetris(tetris.current.matrix, nextX, nextY)) {
    return false;
  }
  tetris.current.x = nextX;
  tetris.current.y = nextY;
  updateTetrisScoreboard();
  renderTetris();
  return true;
}

function advanceTetrisPiece(awardSoftDropPoints = false) {
  if (moveTetris(0, 1)) {
    if (awardSoftDropPoints) {
      tetris.score += 1;
      updateTetrisScoreboard();
    }
    return true;
  }
  lockTetrisPiece();
  return false;
}

function softDropTetris() {
  if (!tetris.running || tetris.paused || tetris.gameOver) return;
  advanceTetrisPiece(true);
}

function hardDropTetris() {
  if (!tetris.running || tetris.paused || tetris.gameOver || !tetris.current) return;
  let dropped = 0;
  while (moveTetris(0, 1)) {
    dropped += 1;
  }
  tetris.score += dropped * 2;
  updateTetrisScoreboard();
  lockTetrisPiece();
}

function rotateTetrisPiece(clockwise = true) {
  if (!tetris.running || tetris.paused || tetris.gameOver || !tetris.current) return false;
  const rotated = clockwise ? rotateClockwise(tetris.current.matrix) : rotateCounterClockwise(tetris.current.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (const kickX of kicks) {
    for (const kickY of [0, -1, 1]) {
      const nextX = tetris.current.x + kickX;
      const nextY = tetris.current.y + kickY;
      if (canPlaceTetris(rotated, nextX, nextY)) {
        tetris.current.matrix = rotated;
        tetris.current.x = nextX;
        tetris.current.y = nextY;
        updateTetrisScoreboard();
        renderTetris();
        return true;
      }
    }
  }
  return false;
}

function tickTetris() {
  if (!tetris.running || tetris.paused || tetris.gameOver) return;
  advanceTetrisPiece(false);
}

function resizeTetrisCanvas() {
  if (!tetrisCanvas) return;
  const width = tetrisCanvas.clientWidth || 320;
  const height = tetrisCanvas.clientHeight || 640;
  const dpr = window.devicePixelRatio || 1;
  tetrisCanvas.width = Math.round(width * dpr);
  tetrisCanvas.height = Math.round(height * dpr);
  const ctx = tetrisCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tetris.width = width;
  tetris.height = height;
  tetris.cellSize = Math.min(width / tetris.cols, height / tetris.rows);
  tetris.offsetX = Math.round((width - tetris.cellSize * tetris.cols) / 2);
  tetris.offsetY = Math.round((height - tetris.cellSize * tetris.rows) / 2);
  renderTetris();
}

function drawTetrisCell(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(tetris.offsetX + x * tetris.cellSize),
    Math.round(tetris.offsetY + y * tetris.cellSize),
    Math.ceil(tetris.cellSize),
    Math.ceil(tetris.cellSize)
  );
}

function drawTetrisGrid(ctx) {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= tetris.cols; i += 1) {
    const pos = Math.round(tetris.offsetX + i * tetris.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pos, tetris.offsetY);
    ctx.lineTo(pos, tetris.offsetY + tetris.rows * tetris.cellSize);
    ctx.stroke();
  }
  for (let i = 0; i <= tetris.rows; i += 1) {
    const pos = Math.round(tetris.offsetY + i * tetris.cellSize) + 0.5;
    ctx.beginPath();
    ctx.moveTo(tetris.offsetX, pos);
    ctx.lineTo(tetris.offsetX + tetris.cols * tetris.cellSize, pos);
    ctx.stroke();
  }
}

function overlayTetrisMessage(message) {
  if (!tetrisCanvas) return;
  const ctx = tetrisCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(7, 12, 20, 0.72)';
  ctx.fillRect(tetris.width * 0.12, tetris.height * 0.42, tetris.width * 0.76, tetris.height * 0.16);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 16px Arial, sans-serif';
  ctx.fillText(message, tetris.width / 2, tetris.height / 2);
}

function renderTetris() {
  if (!tetrisCanvas) return;
  const ctx = tetrisCanvas.getContext('2d');
  ctx.clearRect(0, 0, tetris.width, tetris.height);
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(0, 0, tetris.width, tetris.height);
  drawTetrisGrid(ctx);

  tetris.board.forEach((row, rowY) => {
    row.forEach((cell, rowX) => {
      if (cell) {
        drawTetrisCell(ctx, rowX, rowY, cell);
      }
    });
  });

  if (tetris.current) {
    tetris.current.matrix.forEach((row, rowY) => {
      row.forEach((cell, rowX) => {
        if (cell) {
          drawTetrisCell(ctx, tetris.current.x + rowX, tetris.current.y + rowY, tetris.current.color);
        }
      });
    });
  }

  if (tetris.paused) {
    overlayTetrisMessage('일시정지');
  } else if (tetris.gameOver) {
    overlayTetrisMessage('게임 오버 - 재시작을 누르세요');
  }
}

function handleTetrisKeydown(event) {
  const key = event.key.toLowerCase();
  const controls = {
    arrowleft: () => moveTetris(-1, 0),
    a: () => moveTetris(-1, 0),
    arrowright: () => moveTetris(1, 0),
    d: () => moveTetris(1, 0),
    arrowdown: () => softDropTetris(),
    s: () => softDropTetris(),
    arrowup: () => rotateTetrisPiece(true),
    w: () => rotateTetrisPiece(true)
  };

  if (key === ' ' || key === 'spacebar') {
    event.preventDefault();
    if (!tetris.running && !tetris.gameOver) {
      startTetris();
    }
    hardDropTetris();
    return;
  }

  if (key === 'p' || key === 'escape') {
    event.preventDefault();
    pauseTetris();
    return;
  }

  if (key === 'enter') {
    event.preventDefault();
    if (tetris.gameOver || tetris.ready) {
      startTetris();
    }
    return;
  }

  if (controls[key]) {
    event.preventDefault();
    if (!tetris.running && !tetris.gameOver) {
      startTetris();
    }
    controls[key]();
  }
}

window.__snakeGame = {
  getState() {
    return {
      score: game.score,
      highScore: game.highScore,
      running: game.running,
      paused: game.paused,
      gameOver: game.gameOver,
      ready: game.ready,
      direction: { ...game.direction },
      nextDirection: { ...game.nextDirection },
      snake: game.snake.map(segment => ({ ...segment })),
      food: { ...game.food }
    };
  },
  start: startGame,
  pause: pauseGame,
  restart() {
    stopTimer();
    resetGame();
    startGame();
  },
  setDirection
};

window.__tetrisGame = {
  getState() {
    return {
      score: tetris.score,
      lines: tetris.lines,
      level: tetris.level,
      highScore: tetris.highScore,
      running: tetris.running,
      paused: tetris.paused,
      gameOver: tetris.gameOver,
      ready: tetris.ready
    };
  },
  start: startTetris,
  pause: pauseTetris,
  restart() {
    stopTetrisTimer();
    resetTetris();
    startTetris();
  }
};

loadHighScore();
loadTetrisHighScore();
resetTetris();
resetGame();
updateScoreboard();
updateTetrisScoreboard();
updateGameTabs();
bindGameTabs();
bindKeyboard();
bindTouchButtons();
bindTetrisTouchButtons();
bindButtons();
bindResize();
resizeCanvas();
