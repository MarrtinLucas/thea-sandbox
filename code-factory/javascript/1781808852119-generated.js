// === FILE: index.html ===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bubble Blast '84</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="ui-overlay">
            <div id="score-display">SCORE: <span id="score">0</span></div>
            <div id="combo-display">COMBO: <span id="combo">x1</span></div>
            <div id="level-display">LEVEL: <span id="level">1</span></div>
            <div id="game-over-screen" class="hidden">
                <h1>GAME OVER</h1>
                <p>FINAL SCORE: <span id="final-score">0</span></p>
                <button id="restart-btn">PRESS START</button>
            </div>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>

// === FILE: style.css ===
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #1a1a2e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: 'Courier New', monospace;
    image-rendering: pixelated;
}

#game-container {
    position: relative;
    width: 480px;
    height: 540px;
    background: #0f0f23;
    border: 4px solid #e94560;
    box-shadow: 0 0 20px rgba(233, 69, 96, 0.5), inset 0 0 20px rgba(233, 69, 96, 0.1);
}

#gameCanvas {
    display: block;
    width: 480px;
    height: 480px;
    background: #16213e;
    image-rendering: pixelated;
    cursor: crosshair;
}

#ui-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
}

#score-display, #combo-display, #level-display {
    position: absolute;
    font-size: 14px;
    color: #e94560;
    text-shadow: 2px 2px 0 #0f0f23, 0 0 10px rgba(233, 69, 96, 0.5);
    letter-spacing: 2px;
    pointer-events: none;
}

#score-display {
    top: 490px;
    left: 10px;
}

#combo-display {
    top: 490px;
    left: 200px;
}

#level-display {
    top: 490px;
    left: 350px;
}

#game-over-screen {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 15, 35, 0.95);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    pointer-events: all;
}

#game-over-screen h1 {
    font-size: 36px;
    color: #e94560;
    text-shadow: 4px 4px 0 #0f0f23, 0 0 20px rgba(233, 69, 96, 0.8);
    margin-bottom: 20px;
    animation: blink 1s infinite;
}

#game-over-screen p {
    font-size: 18px;
    color: #fff;
    margin-bottom: 30px;
    text-shadow: 2px 2px 0 #0f0f23;
}

#restart-btn {
    font-family: 'Courier New', monospace;
    font-size: 16px;
    padding: 12px 32px;
    background: #e94560;
    color: #0f0f23;
    border: 2px solid #fff;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 3px;
    transition: all 0.1s;
    pointer-events: all;
}

#restart-btn:hover {
    background: #ff6b81;
    transform: scale(1.05);
}

.hidden {
    display: none !important;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

// === FILE: game.js ===
"use strict";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 480;

const scoreSpan = document.getElementById('score');
const comboSpan = document.getElementById('combo');
const levelSpan = document.getElementById('level');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreSpan = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// --- NES-inspired palette ---
const PALETTE = {
    bg: '#16213e',
    bubble1: '#e94560',
    bubble2: '#0f3460',
    bubble3: '#533483',
    bubble4: '#e94560',
    bubble5: '#f5a623',
    text: '#e94560',
    white: '#ffffff',
    shadow: '#0f0f23',
};

// --- Game state ---
let game = {
    score: 0,
    combo: 0,
    maxCombo: 1,
    level: 1,
    bubbles: [],
    explosions: [],
    particles: [],
    spawnTimer: 0,
    spawnInterval: 60,
    gameOver: false,
    frameCount: 0,
};

// --- Bubble class ---
class Bubble {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.targetRadius = radius;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.growing = true;
        this.growSpeed = 0.3 + Math.random() * 0.4;
        this.maxRadius = radius * (2 + Math.random() * 3);
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.02 + Math.random() * 0.03;
        this.pulseAmount = 0.1 + Math.random() * 0.2;
        this.opacity = 1;
        this.alive = true;
        this.id = Math.random().toString(36).substr(2, 9);
        this.shimmer = Math.random() * Math.PI * 2;
    }

    update() {
        if (!this.alive) return;

        // Movement
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }

        // Growth
        if (this.growing) {
            this.radius += this.growSpeed * (this.radius < 10 ? 1.5 : 1);
            if (this.radius >= this.maxRadius) {
                this.growing = false;
                this.explode();
            }
        }

        // Pulse effect
        this.pulsePhase += this.pulseSpeed;
        this.shimmer += 0.05;
    }

    explode() {
        this.alive = false;
        
        // Create explosion effect
        const numParticles = Math.floor(this.radius * 1.5);
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 / numParticles) * i + Math.random() * 0.3;
            const speed = 1 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            game.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: size,
                color: this.color,
                life: 1,
                decay: 0.01 + Math.random() * 0.02,
                type: 'explosion',
            });
        }

        // Score calculation
        let points = Math.floor(this.radius * 2);
        game.combo++;
        if (game.combo > game.maxCombo) game.maxCombo = game.combo;
        points *= game.combo;
        game.score += points;
        
        updateUI();
        
        // Add screen shake effect via particles
        for (let i = 0; i < 5; i++) {
            game.particles.push({
                x: this.x + (Math.random() - 0.5) * 20,
                y: this.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 3,
                radius: 2 + Math.random() * 3,
                color: '#ffffff',
                life: 1,
                decay: 0.03 + Math.random() * 0.02,
                type: 'spark',
            });
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        const pulse = Math.sin(this.pulsePhase) * this.pulseAmount * this.radius;
        const r = this.radius + pulse;

        // Shadow
        ctx.fillStyle = 'rgba(15, 15, 35, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y + 3, r, 0, Math.PI * 2);
        ctx.fill();

        // Main bubble
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();

        // 8-bit highlight (top-left)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 8-bit shimmer
        const shimmerX = this.x + Math.cos(this.shimmer) * r * 0.5;
        const shimmerY = this.y + Math.sin(this.shimmer) * r * 0.5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(shimmerX, shimmerY, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Border (pixelated look)
        ctx.strokeStyle = 'rgba(15, 15, 35, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    isClicked(mx, my) {
        if (!this.alive) return false;
        const dx = this.x - mx;
        const dy = this.y - my;
        return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }
}

// --- Spawn a new bubble ---
function spawnBubble() {
    const colors = [PALETTE.bubble1, PALETTE.bubble2, PALETTE.bubble3, PALETTE.bubble4, PALETTE.bubble5];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const radius = 8 + Math.random() * 15;
    const x = radius + Math.random() * (canvas.width - radius * 2);
    const y = radius + Math.random() * (canvas.height - radius * 2);
    
    // Ensure no overlap with existing bubbles
    let overlap = false;
    for (const b of game.bubbles) {
        if (!b.alive) continue;
        const dx = b.x - x;
        const dy = b.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.radius + radius + 10) {
            overlap = true;
            break;
        }
    }
    
    if (!overlap) {
        game.bubbles.push(new Bubble(x, y, radius, color));
    }
}

// --- Update UI ---
function updateUI() {
    scoreSpan.textContent = game.score;
    comboSpan.textContent = `x${game.combo}`;
    levelSpan.textContent = game.level;
}

// --- Level progression ---
function checkLevelUp() {
    const newLevel = Math.floor(game.score / 500) + 1;
    if (newLevel > game.level) {
        game.level = newLevel;
        game.spawnInterval = Math.max(15, 60 - (game.level - 1) * 5);
        updateUI();
        
        // Level up effect
        for (let i = 0; i < 20; i++) {
            game.particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2 + (Math.random() - 0.5) * 200,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                radius: 3 + Math.random() * 4,
                color: '#f5a623',
                life: 1,
                decay: 0.015,
                type: 'levelup',
            });
        }
    }
}

// --- Game over ---
function endGame() {
    game.gameOver = true;
    finalScoreSpan.textContent = game.score;
    gameOverScreen.classList.remove('hidden');
}

// --- Update game state ---
function update() {
    if (game.gameOver) return;

    game.frameCount++;

    // Spawn bubbles
    game.spawnTimer++;
    if (game.spawnTimer >= game.spawnInterval) {
        game.spawnTimer = 0;
        const count = 1 + Math.floor(game.level / 3);
        for (let i = 0; i < count; i++) {
            spawnBubble();
        }
    }

    // Update bubbles
    for (const bubble of game.bubbles) {
        bubble.update();
    }

    // Remove exploded bubbles
    game.bubbles = game.bubbles.filter(b => b.alive);

    // Update particles
    for (const p of game.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.life -= p.decay;
        p.radius *= 0.98;
    }
    game.particles = game.particles.filter(p => p.life > 0 && p.radius > 0.5);

    // Check for game over (too many bubbles)
    const aliveCount = game.bubbles.filter(b => b.alive).length;
    if (aliveCount > 50) {
        endGame();
    }

    // Combo decay
    if (game.frameCount % 120 === 0 && game.combo > 1) {
        game.combo = Math.max(1, game.combo - 1);
        updateUI();
    }

    checkLevelUp();
}

// --- Draw everything ---
function draw() {
    // Clear canvas with pixel grid effect
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw particles (behind bubbles)
    for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw bubbles
    for (const bubble of game.bubbles) {
        bubble.draw(ctx);
    }

    // Draw scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 2);
    }

    // Vignette
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 100,
        canvas.width / 2, canvas.height / 2, 350
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// --- Game loop ---
function gameLoop() {
    if (!game.gameOver) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Click handler ---
canvas.addEventListener('click', (e) => {
    if (game.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Find clicked bubble (back to front for proper z-ordering)
    let clicked = false;
    for (let i = game.bubbles.length - 1; i >= 0; i--) {
        const bubble = game.bubbles[i];
        if (bubble.isClicked(mx, my)) {
            bubble.explode();
            clicked = true;
            break;
        }
    }

    if (!clicked) {
        // Miss penalty - reset combo
        game.combo = 1;
        updateUI();
        
        // Miss effect
        for (let i = 0; i < 5; i++) {
            game.particles.push({
                x: mx,
                y: my,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                radius: 2 + Math.random() * 3,
                color: '#ff0000',
                life: 1,
                decay: 0.04,
                type: 'miss',
            });
        }
    }
});

// --- Restart ---
function restartGame() {
    game = {
        score: 0,
        combo: 0,
        maxCombo: 1,
        level: 1,
        bubbles: [],
        explosions: [],
        particles: [],
        spawnTimer: 0,
        spawnInterval: 60,
        gameOver: false,
        frameCount: 0,
    };
    gameOverScreen.classList.add('hidden');
    updateUI();
}

restartBtn.addEventListener('click', restartGame);

// --- Keyboard shortcut ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && game.gameOver) {
        restartGame();
    }
});

// --- Start the game ---
updateUI();
gameLoop();