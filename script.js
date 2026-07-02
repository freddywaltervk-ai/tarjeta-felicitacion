const canvas = document.getElementById("effectsCanvas");
const ctx = canvas.getContext("2d");
const musicToggle = document.getElementById("musicToggle");
const musicLabel = musicToggle.querySelector(".music-label");

let width = 0;
let height = 0;
let particles = [];
let fireworks = [];
let confetti = [];
let audioContext;
let masterGain;
let musicTimer;
let isPlaying = false;

const colors = ["#f43f5e", "#f5b942", "#2dd4bf", "#2563eb", "#8b5cf6", "#22c55e", "#ffffff"];

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle(x, y, options = {}) {
  const angle = options.angle ?? random(0, Math.PI * 2);
  const speed = options.speed ?? random(1, 5);

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: options.size ?? random(1.5, 4.5),
    gravity: options.gravity ?? 0.045,
    friction: options.friction ?? 0.986,
    alpha: 1,
    decay: options.decay ?? random(0.009, 0.018),
    color: options.color ?? colors[Math.floor(Math.random() * colors.length)],
    shape: options.shape ?? "circle",
    rotation: random(0, Math.PI * 2),
    spin: random(-0.14, 0.14)
  };
}

function launchFirework(x = random(width * 0.18, width * 0.82), y = random(height * 0.12, height * 0.42)) {
  const count = Math.floor(random(38, 62));
  for (let i = 0; i < count; i += 1) {
    fireworks.push(createParticle(x, y, {
      angle: (Math.PI * 2 * i) / count,
      speed: random(2.2, 7.5),
      gravity: 0.035,
      decay: random(0.011, 0.019),
      size: random(1.8, 4.2)
    }));
  }
}

function launchConfetti(amount = 120) {
  for (let i = 0; i < amount; i += 1) {
    confetti.push(createParticle(random(0, width), random(-height * 0.3, 0), {
      angle: random(Math.PI * 0.35, Math.PI * 0.65),
      speed: random(1, 4.5),
      gravity: random(0.035, 0.075),
      decay: random(0.003, 0.008),
      size: random(5, 9),
      shape: "rect"
    }));
  }
}

function seedParticles() {
  particles = Array.from({ length: Math.min(90, Math.floor(width / 14)) }, () => ({
    x: random(0, width),
    y: random(0, height),
    vx: random(-0.18, 0.18),
    vy: random(-0.16, 0.16),
    size: random(0.8, 2.4),
    alpha: random(0.2, 0.76),
    color: colors[Math.floor(random(0, colors.length))]
  }));
}

function drawShape(item) {
  ctx.save();
  ctx.globalAlpha = Math.max(item.alpha, 0);
  ctx.fillStyle = item.color;
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation || 0);

  if (item.shape === "rect") {
    ctx.fillRect(-item.size, -item.size * 0.55, item.size * 2.2, item.size * 1.1);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, item.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function updateBurst(list) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    item.vx *= item.friction;
    item.vy = item.vy * item.friction + item.gravity;
    item.x += item.vx;
    item.y += item.vy;
    item.rotation += item.spin;
    item.alpha -= item.decay;
    drawShape(item);

    if (item.alpha <= 0 || item.y > height + 80) {
      list.splice(i, 1);
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < -10) particle.x = width + 10;
    if (particle.x > width + 10) particle.x = -10;
    if (particle.y < -10) particle.y = height + 10;
    if (particle.y > height + 10) particle.y = -10;

    ctx.save();
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  updateBurst(fireworks);
  updateBurst(confetti);
  requestAnimationFrame(animate);
}

function playNote(frequency, startTime, duration, gain = 0.09) {
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  noteGain.gain.setValueAtTime(0.0001, startTime);
  noteGain.gain.exponentialRampToValueAtTime(gain, startTime + 0.04);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(noteGain);
  noteGain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function scheduleMusic() {
  const melody = [392, 440, 493.88, 587.33, 493.88, 440, 523.25, 659.25];
  const bass = [196, 220, 246.94, 293.66];
  let step = 0;

  musicTimer = window.setInterval(() => {
    if (!audioContext || !isPlaying) return;

    const now = audioContext.currentTime;
    playNote(melody[step % melody.length], now, 0.42, 0.055);
    playNote(bass[Math.floor(step / 2) % bass.length], now, 0.72, 0.035);
    step += 1;
  }, 440);
}

async function toggleMusic() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  isPlaying = !isPlaying;
  musicToggle.classList.toggle("is-playing", isPlaying);
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicLabel.textContent = isPlaying ? "Pausar música" : "Reproducir música";

  if (isPlaying && !musicTimer) {
    scheduleMusic();
  }
}

function openingCelebration() {
  launchConfetti(170);
  launchFirework(width * 0.24, height * 0.25);
  launchFirework(width * 0.5, height * 0.18);
  launchFirework(width * 0.76, height * 0.28);

  setTimeout(() => launchFirework(width * 0.38, height * 0.34), 520);
  setTimeout(() => launchFirework(width * 0.66, height * 0.22), 920);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  seedParticles();
});

musicToggle.addEventListener("click", toggleMusic);

resizeCanvas();
seedParticles();
animate();
window.addEventListener("load", openingCelebration);
