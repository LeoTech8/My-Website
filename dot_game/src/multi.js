const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function easteregg() {
    window.location.href = 'src/job.png';
}

// Changed from array to a single object
let enemy = { x: 50, y: 50, radius: 10, speed: 5 }; 
let score = 0;
let player = { x: 200, y: 200, width: 20, height: 20, radius: 10, speed: 6 };
let username = null;
let keys = {};
let isSlowMode = false;
let pause = false;
let hard = false;
let gameRunning = false;

const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', () => {
    gameRunning = true;
    startBtn.style.display = 'none';
    resetGame();
});

function toggleSlowMode() {
    isSlowMode = !isSlowMode;
    if (isSlowMode) {
        enemy.speed = 1;
        player.speed = 1;
    } else {
        enemy.speed = 5;
        player.speed = 6;
    }
}

function togglePause() {
    pause = !pause;
    // Movement logic is handled in the gameLoop conditional
}

function hardMode() {
    hard = !hard;
    if (hard) {
        enemy.speed = 10;
        player.speed = 11;
    } else {
        enemy.speed = 5;
        player.speed = 6;
    }
}

function resetGame() {
    score = 0;
    player.x = 200;
    player.y = 200;
    // Reset enemy position
    enemy.x = 50;
    enemy.y = 50;
    keys = {};
}

function onPlayerTouched() {
    gameRunning = false;
    startBtn.innerText = "Restart Game";
    startBtn.style.display = 'block';
    alert('The dot caught you! - Score: ' + score);
}

// Updated: Checks collision for just the one enemy
function updateDots() {
    const dx = (player.x + player.width / 2) - enemy.x;
    const dy = (player.y + player.height / 2) - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (player.radius + enemy.radius)) {
        onPlayerTouched();
    }
}

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function update() {
    // PLAYER CONTROLS (Arrows)
    if (keys['ArrowUp']) player.y -= player.speed;
    if (keys['ArrowDown']) player.y += player.speed;
    if (keys['ArrowLeft']) player.x -= player.speed;
    if (keys['ArrowRight']) player.x += player.speed;

    // ENEMY CONTROLS (WASD)
    if (keys['w']) enemy.y -= enemy.speed;
    if (keys['s']) enemy.y += enemy.speed;
    if (keys['a']) enemy.x -= enemy.speed;
    if (keys['d']) enemy.x += enemy.speed;

    if (keys['p']) togglePause();
    if (keys[' ']) toggleSlowMode();
    if (keys['h']) hardMode();

    // Bound Player
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    // Bound Enemy
    enemy.x = Math.max(0, Math.min(canvas.width, enemy.x));
    enemy.y = Math.max(0, Math.min(canvas.height, enemy.y));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Player
    ctx.fillStyle = '#45ff01';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw Single Enemy Dot
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function gameLoop() {
    if (gameRunning && !pause) {
        update();
        updateDots();
        // Optional: Increase score over time since spawning is gone
        score++; 
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Removed setInterval(spawnDot, 15000) to keep it to one dot only
gameLoop();
