import SoundManager from './js/SoundManager.js';
import SkinManager from './js/SkinManager.js';
import GameEngine from './js/GameEngine.js';
import AIBuddyManager from './js/AIBuddyManager.js';
import StrikerMode from './js/modes/StrikerMode.js';
import BlitzMode from './js/modes/BlitzMode.js';
import ZenMode from './js/modes/ZenMode.js';
import HardcoreMode from './js/modes/HardcoreMode.js';
import { HAND_RADIUS } from './js/Constants.js';

// DOM Elements
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");

const scoreEl = document.getElementById("rep-count");
const stateEl = document.getElementById("state");
const faultsEl = document.getElementById("issues");
const stopBtn = document.getElementById("stopBtn");
const missionSelect = document.getElementById("missionSelect");
const skinSelect = document.getElementById("skinSelect");
const activeControls = document.getElementById("activeControls");
const timerBox = document.getElementById("timerBox");
const timerEl = document.getElementById("timer");
const faultsLabel = document.getElementById("faultsLabel");
const modal = document.getElementById("gameOverModal");
const finalScoreEl = document.getElementById("finalScore");
const initialsInput = document.getElementById("initials");
const submitScoreBtn = document.getElementById("submitScoreBtn");
const leaderboardList = document.getElementById("leaderboardList");

// Info Modal
const infoBtn = document.getElementById("infoBtn");
const infoModal = document.getElementById("infoModal");
const modeDescription = document.getElementById("modeDescription");

// Systems
const skinManager = new SkinManager();
const soundManager = new SoundManager(skinManager);
const aiBuddyManager = new AIBuddyManager();
const gameEngine = new GameEngine(canvasElement, soundManager, skinManager, aiBuddyManager);

let camera = null;

// Mode Factory
const MODES = {
  STRIKER: StrikerMode,
  BLITZ: BlitzMode,
  ZEN: ZenMode,
  HARDCORE: HardcoreMode
};

// ----------------------------------------------------
// UI Logic
// ----------------------------------------------------

function updateUI() {
  if (!gameEngine.isRunning) return;

  if (gameEngine.gameState.lives !== undefined) {
    if (gameEngine.gameState.lives === Infinity) {
      faultsEl.textContent = "∞";
    } else {
      let hearts = "";
      for (let i = 0; i < gameEngine.gameState.lives; i++) hearts += "❤️";
      faultsEl.textContent = hearts;
    }
  }

  scoreEl.textContent = Math.floor(gameEngine.gameState.score);

  // Time logic
  if (gameEngine.gameState.timeLeft !== undefined && gameEngine.gameState.timeLeft > 0) {
    timerEl.textContent = Math.ceil(gameEngine.gameState.timeLeft);
  } else if (gameEngine.gameState.timeLimit === 0) {
    timerEl.textContent = "--";
  }

  // Check Game Over via Engine State (or we can poll here)
  if (gameEngine.gameState.lives <= 0 || (gameEngine.gameState.timeLimit > 0 && gameEngine.gameState.timeLeft <= 0)) {
    stopGame();
  }
}

function stopGame() {
  gameEngine.stop();
  soundManager.gameOver();

  activeControls.style.display = "none";
  missionSelect.style.display = "block";
  skinSelect.style.display = "block";
  stopBtn.disabled = true;

  stateEl.textContent = "MISSION END";
  finalScoreEl.textContent = Math.floor(gameEngine.gameState.score);

  modal.style.display = "flex";
  updateLeaderboardUI();
}

function startGame(ModeClass) {
  if (gameEngine.isRunning) return;

  // UI Setup
  missionSelect.style.display = "none";
  skinSelect.style.display = "none";

  activeControls.style.display = "flex";
  stopBtn.disabled = false;
  modal.style.display = "none";
  submitScoreBtn.disabled = false;
  submitScoreBtn.textContent = "SUBMIT SCORE";

  // Engine Start
  const mode = new ModeClass();
  stateEl.textContent = mode.name;
  gameEngine.start(mode);

  // Voice Intro
  soundManager.speak('start');

  // Timer UI Vis
  if (gameEngine.gameState.timeLimit > 0) {
    timerBox.style.display = "block";
  } else {
    timerBox.style.display = "none";
  }

  if (gameEngine.gameState.lives === Infinity) {
    faultsEl.parentElement.style.display = 'none';
  } else {
    faultsEl.parentElement.style.display = 'block';
  }
}

// ----------------------------------------------------
// Leaderboard
// ----------------------------------------------------
function getHighScores() {
  const stored = localStorage.getItem("lunarisScores");
  return stored ? JSON.parse(stored) : [];
}

function saveHighScore(initials, score) {
  const scores = getHighScores();
  scores.push({ initials, score });
  scores.sort((a, b) => b.score - a.score);
  const top5 = scores.slice(0, 5);
  localStorage.setItem("lunarisScores", JSON.stringify(top5));
}

function updateLeaderboardUI() {
  const scores = getHighScores();
  leaderboardList.innerHTML = scores.map((s, i) => `
    <li><span>${i + 1}. ${s.initials}</span> <span>${s.score}</span></li>
  `).join('');
}


// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modeKey = btn.dataset.mode; // CLASSIC is Striker in HTML?
    // Map HTML data-mode to Keys
    // HTML: STRIKER -> CLASSIC (old), BLITZ, ZEN, HARDCORE
    // We should enable "STRIKER" in HTML or map "CLASSIC" to STRIKER
    let key = modeKey;
    if (key === "CLASSIC") key = "STRIKER";

    if (MODES[key]) {
      startGame(MODES[key]);
    } else {
      console.error("Unknown Mode:", key);
    }
  });
});

document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.skin;
    skinManager.save(id);
    // Highlight active skin?
    // provide voice feedback when equipping
    soundManager.equip();
  });
});

stopBtn.addEventListener("click", () => {
  stopGame();
});

infoBtn.addEventListener("click", () => {
  if (gameEngine.mode) {
    modeDescription.textContent = gameEngine.mode.description;
    infoModal.style.display = "flex";
  }
});


submitScoreBtn.addEventListener("click", () => {
  const initials = initialsInput.value.toUpperCase() || "UNK";
  saveHighScore(initials, Math.floor(gameEngine.gameState.score));
  updateLeaderboardUI();
  initialsInput.value = "";
  submitScoreBtn.disabled = true;
  submitScoreBtn.textContent = "SAVED";
});

// Audio Test
document.getElementById('testAudioBtn')?.addEventListener('click', () => {
  aiBuddyManager.speak("System Online. Audio systems functional.");
});

// ----------------------------------------------------
// MediaPipe & Loop
// ----------------------------------------------------

// Smoothing State
let previousLandmarks = null;
const SMOOTHING_FACTOR = 0.5;

function onResults(results) {
  // Clear canvas managed by Engine roughly, but we can do a full clear here to be safe
  // actually Engine.draw clears it.

  const now = Date.now();
  // voice intro removed from loop
  let leftHand = null;
  let rightHand = null;

  if (results.poseLandmarks) {
    // Apply Smoothing (EMA)
    if (previousLandmarks) {
      results.poseLandmarks = results.poseLandmarks.map((lm, i) => {
        const prev = previousLandmarks[i];
        return {
          x: prev.x * SMOOTHING_FACTOR + lm.x * (1 - SMOOTHING_FACTOR),
          y: prev.y * SMOOTHING_FACTOR + lm.y * (1 - SMOOTHING_FACTOR),
          z: (prev.z || 0) * SMOOTHING_FACTOR + (lm.z || 0) * (1 - SMOOTHING_FACTOR),
          visibility: (prev.visibility || 0) * SMOOTHING_FACTOR + (lm.visibility || 0) * (1 - SMOOTHING_FACTOR)
        };
      });
    }
    previousLandmarks = results.poseLandmarks;

    const lm = results.poseLandmarks;
    const getCoords = (idx) => {
      if (!lm[idx] || lm[idx].visibility < 0.5) return null;
      return {
        // Mirror x
        x: (1 - lm[idx].x) * canvasElement.width,
        y: lm[idx].y * canvasElement.height
      };
    };
    leftHand = getCoords(19);
    rightHand = getCoords(20);
  }

  // Engine Update
  if (gameEngine.isRunning) {
    gameEngine.update(now, leftHand, rightHand);

    // AI Buddy Update
    aiBuddyManager.updateMovement(leftHand, rightHand);
    aiBuddyManager.checkStall();

    updateUI();
  }

  // Engine Draw (Background + Targets + Particles + Juice)
  // Pass null to keep background black (skeleton only)
  gameEngine.draw(null);

  // Draw Skeleton (Avatar)
  canvasCtx.save();
  // We need to mirror/transform if we want it to match the video exactly?
  // The original code did:
  // canvasCtx.translate(canvasElement.width, 0);
  // canvasCtx.scale(-1, 1);
  // But wait, our 'leftHand'/'rightHand' coords are already flipped in 'getCoords'.
  // However, drawConnectors takes normalized landmarks (0-1) and draws them.
  // We need to ensure the transformation matches the video background (which is flipped).

  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);

  if (window.drawConnectors && window.POSE_CONNECTIONS) {
    // Filter connections for upper body only (Landmarks 0-24)
    const upperBodyConnections = window.POSE_CONNECTIONS.filter(([start, end]) => start <= 24 && end <= 24);
    window.drawConnectors(canvasCtx, results.poseLandmarks, upperBodyConnections, { color: '#00FF00', lineWidth: 2 });
  }
  if (window.drawLandmarks) {
    // Filter landmarks for upper body only (Indices 0-24)
    const upperBodyLandmarks = results.poseLandmarks.slice(0, 25);
    window.drawLandmarks(canvasCtx, upperBodyLandmarks, { color: '#FF0000', lineWidth: 1 });
  }
  canvasCtx.restore();

  // Draw Hands (Overlay) - Custom Skins
  const skin = skinManager.getSkin();
  canvasCtx.save();
  canvasCtx.lineWidth = 3;
  canvasCtx.strokeStyle = "#fff";
  canvasCtx.shadowColor = skin.glow;
  canvasCtx.shadowBlur = 20;
  canvasCtx.fillStyle = skin.color; // Hand interior color

  if (leftHand) {
    canvasCtx.beginPath();
    canvasCtx.arc(leftHand.x, leftHand.y, HAND_RADIUS, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.stroke();
  }
  if (rightHand) {
    canvasCtx.beginPath();
    canvasCtx.arc(rightHand.x, rightHand.y, HAND_RADIUS, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.stroke();
  }
  canvasCtx.restore();
}

const pose = new window.Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

async function startCamera() {
  console.log("Initializing Camera...");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
  videoElement.srcObject = stream;
  await videoElement.play();

  camera = new window.Camera(videoElement, {
    onFrame: async () => { await pose.send({ image: videoElement }); },
    width: 640,
    height: 480
  });
  camera.start();

  console.log("Camera Ready.");
}

// Auto-start
window.addEventListener('load', () => {
  startCamera();
});

// Auto-Greeting on first interaction
window.addEventListener('click', () => {
  // Resume audio context if needed (handled by browser usually but good practice)
  soundManager.resume();
  soundManager.speak('welcome');
  setTimeout(() => aiBuddyManager.greetUser(), 1500); // Delay AI greeting slightly so they don't overlap
}, { once: true });
