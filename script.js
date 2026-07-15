const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#site-nav');
const canvas = document.querySelector('#game-canvas');
const startButton = document.querySelector('#start-btn');
const pauseButton = document.querySelector('#pause-btn');
const restartButton = document.querySelector('#restart-btn');
const scoreEl = document.querySelector('#score');
const highScoreEl = document.querySelector('#high-score');
const statusEl = document.querySelector('#game-status');
const padButtons = document.querySelectorAll('.pad-btn');
const gamesSection = document.querySelector('#games');
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

function pauseGame() {
  if (!game.running || game.gameOver) return;
  game.paused = !game.paused;
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

  if (game.ready) {
    overlayMessage('시작 버튼을 눌러 게임을 시작하세요');
  } else if (game.paused) {
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
  });
}

function bindTouchButtons() {
  padButtons.forEach(button => {
    button.addEventListener('click', () => {
      const dir = button.dataset.dir;
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
}

function bindResize() {
  const handler = () => {
    window.clearTimeout(game.resizeHandle);
    game.resizeHandle = window.setTimeout(resizeCanvas, 50);
  };
  window.addEventListener('resize', handler);
  if (window.ResizeObserver && canvas) {
    const observer = new ResizeObserver(handler);
    observer.observe(canvas);
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

loadHighScore();
resetGame();
updateScoreboard();
bindKeyboard();
bindTouchButtons();
bindButtons();
bindResize();
resizeCanvas();
