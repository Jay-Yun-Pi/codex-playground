"use strict";

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const frame = document.querySelector("#canvas-frame");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best-score");
const message = document.querySelector("#game-message");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageDetail = document.querySelector("#message-detail");
const restartButton = document.querySelector("#restart-button");

const GRID_SIZE = 24;
const START_SPEED = 150;
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

let snake;
let food;
let direction;
let queuedDirection;
let score;
let bestScore = Number.parseInt(localStorage.getItem("neonSnakeBest") || "0", 10);
let state = "ready";
let lastTick = 0;
let touchStart = null;

const formatScore = (value) => String(value).padStart(3, "0");

function updateScore() {
  scoreElement.textContent = formatScore(score);
  bestElement.textContent = formatScore(bestScore);
}

function randomFood() {
  const available = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) available.push({ x, y });
    }
  }
  return available[Math.floor(Math.random() * available.length)];
}

function resetGame(showReady = true) {
  snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }, { x: 9, y: 12 }];
  direction = { x: 1, y: 0 };
  queuedDirection = { ...direction };
  score = 0;
  food = randomFood();
  state = showReady ? "ready" : "playing";
  lastTick = performance.now();
  updateScore();
  if (showReady) {
    messageKicker.textContent = "READY?";
    messageTitle.textContent = "SWIPE TO START";
    messageDetail.textContent = "키보드 방향키도 사용할 수 있어요";
    message.classList.remove("hidden");
  } else {
    message.classList.add("hidden");
  }
  draw();
}

function setDirection(nextDirection) {
  if (nextDirection.x + direction.x === 0 && nextDirection.y + direction.y === 0) return;
  if (state !== "playing") {
    if (state === "gameover") {
      resetGame(false);
      direction = { ...nextDirection };
    }
    else {
      state = "playing";
      message.classList.add("hidden");
      lastTick = performance.now();
    }
  }
  queuedDirection = nextDirection;
}

function endGame() {
  state = "gameover";
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("neonSnakeBest", String(bestScore));
  }
  updateScore();
  messageKicker.textContent = score === bestScore && score > 0 ? "NEW BEST" : "SIGNAL LOST";
  messageTitle.textContent = "GAME OVER";
  messageDetail.textContent = "방향키 또는 스와이프로 다시 시작하세요";
  message.classList.remove("hidden");
}

function update() {
  direction = queuedDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) return endGame();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    food = randomFood();
    updateScore();
  } else {
    snake.pop();
  }
}

function roundedCell(x, y, size, radius = 4) {
  const inset = Math.max(1.5, size * 0.1);
  context.beginPath();
  context.roundRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2, radius);
}

function draw() {
  const size = canvas.width / GRID_SIZE;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#070b12";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(126, 249, 255, 0.055)";
  context.lineWidth = 1;
  for (let line = 0; line <= GRID_SIZE; line += 1) {
    const point = line * size;
    context.beginPath(); context.moveTo(point, 0); context.lineTo(point, canvas.height); context.stroke();
    context.beginPath(); context.moveTo(0, point); context.lineTo(canvas.width, point); context.stroke();
  }

  context.save();
  context.shadowColor = "#ff4fd8";
  context.shadowBlur = size * 0.7;
  context.fillStyle = "#ff4fd8";
  roundedCell(food.x, food.y, size, size * 0.2);
  context.fill();
  context.restore();

  snake.forEach((part, index) => {
    context.save();
    context.shadowColor = index === 0 ? "#d8ffff" : "#7ef9ff";
    context.shadowBlur = index === 0 ? size * 0.8 : size * 0.35;
    context.fillStyle = index === 0 ? "#d8ffff" : `rgba(126, 249, 255, ${Math.max(.35, 1 - index * .045)})`;
    roundedCell(part.x, part.y, size, size * 0.17);
    context.fill();
    context.restore();
  });
}

function gameLoop(timestamp) {
  if (state === "playing") {
    const interval = Math.max(72, START_SPEED - score * 1.2);
    if (timestamp - lastTick >= interval) {
      update();
      lastTick = timestamp;
    }
  }
  draw();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  const displaySize = frame.clientWidth;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(displaySize * pixelRatio);
  canvas.height = Math.round(displaySize * pixelRatio);
  draw();
}

window.addEventListener("keydown", (event) => {
  if (!DIRECTIONS[event.key]) return;
  event.preventDefault();
  setDirection(DIRECTIONS[event.key]);
}, { passive: false });

frame.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
  frame.setPointerCapture(event.pointerId);
});

frame.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const deltaX = event.clientX - touchStart.x;
  const deltaY = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 18) return;
  setDirection(Math.abs(deltaX) > Math.abs(deltaY)
    ? (deltaX > 0 ? DIRECTIONS.ArrowRight : DIRECTIONS.ArrowLeft)
    : (deltaY > 0 ? DIRECTIONS.ArrowDown : DIRECTIONS.ArrowUp));
});

restartButton.addEventListener("click", () => resetGame(true));
window.addEventListener("resize", resizeCanvas);

bestElement.textContent = formatScore(bestScore);
resetGame(true);
resizeCanvas();
requestAnimationFrame(gameLoop);
