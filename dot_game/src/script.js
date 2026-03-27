const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function easteregg() { window.location.href = 'src/job.png'; }

let dots = [];
let score = 0;
// UPDATED: Added vx and vy to player for bouncing physics
let player = { 
    x: 200, 
    y: 200, 
    width: 20, 
    height: 20, 
    radius: 10, 
    speed: 6,
    vx: 0,
    vy: 0
};
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
        dots.forEach(d => d.speed = 1);
        player.speed = 1;
    } else {
        dots.forEach(d => d.speed = 5);
        player.speed = 6;
    }
}

function togglePause() {
    pause = !pause;
    if (pause) {
        dots.forEach(d => d.speed = 0);
        player.speed = 0;
    } else {
        dots.forEach(d => d.speed = 5);
        player.speed = 6;
    }
}

function hardMode() {
    hard = !hard;
    if (hard) {
        dots.forEach(d => d.speed = 5);
        player.speed = 6;
    } else {
        dots.forEach(d => d.speed = 10);
        player.speed = 11;
    }
}

function spawnDot() {
    if (!gameRunning) return;
    score = score + 1;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 : canvas.width;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 : canvas.height;
    }
    dots.push({ 
        x: x, 
        y: y, 
        radius: 10, 
        speed: isSlowMode ? 1 : 5,
        vx: 0, 
        vy: 0 
    });
}

function resetGame() {
    score = 0;
    player.x = 200;
    player.y = 200;
    player.vx = 0;
    player.vy = 0;
    dots = [];
    spawnDot();
    keys = {};
}

async function fetchData(url) {
    try {
        await fetch(url, { mode: 'no-cors' });
        console.log("Score submitted successfully!");
    } catch (error) {
        console.error("Leaderboard Error:", error);
    }
}

function onPlayerTouched() {
    gameRunning = false;
    startBtn.innerText = "Restart Game";
    startBtn.style.display = 'block';
    alert('You have been eaten - Score: ' + score);
    //username = prompt("Username for leaderboard: ");
}

function resolveDotCollisions() {
    const flingStrength = 20; 
    for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
            let d1 = dots[i];
            let d2 = dots[j];
            const dx = d2.x - d1.x;
            const dy = d2.y - d1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = d1.radius + d2.radius;
            if (distance < minDistance) {
                const angle = Math.atan2(dy, dx);
                d1.vx -= Math.cos(angle) * flingStrength;
                d1.vy -= Math.sin(angle) * flingStrength;
                d2.vx += Math.cos(angle) * flingStrength;
                d2.vy += Math.sin(angle) * flingStrength;
                const overlap = minDistance - distance;
                d1.x -= Math.cos(angle) * (overlap / 2);
                d1.y -= Math.sin(angle) * (overlap / 2);
                d2.x += Math.cos(angle) * (overlap / 2);
                d2.y += Math.sin(angle) * (overlap / 2);
            }
        }
    }
}

function updateDots() {
    dots.forEach(dot => {
        const dx = (player.x + player.width/2) - dot.x;
        const dy = (player.y + player.height/2) - dot.y;
        const angle = Math.atan2(dy, dx);
        dot.vx += Math.cos(angle) * (dot.speed * 0.05);
        dot.vy += Math.sin(angle) * (dot.speed * 0.05);
        dot.vx *= 0.98;
        dot.vy *= 0.98;
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1.2;
        if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1.2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (player.radius + dot.radius)) {
            onPlayerTouched();
        }
    });
    resolveDotCollisions();
}

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function update() {
    // Player acceleration based on keys
    const accel = 0.8;
    if (keys['ArrowUp'] || keys['w']) player.vy -= accel;
    if (keys['ArrowDown'] || keys['s']) player.vy += accel;
    if (keys['ArrowLeft'] || keys['a']) player.vx -= accel;
    if (keys['ArrowRight'] || keys['d']) player.vx += accel;
    
    if (keys['p']) togglePause();
    if (keys[' ']) toggleSlowMode();
    if (keys['h']) hardMode();

    // Apply player velocity and friction
    player.vx *= 0.95;
    player.vy *= 0.95;
    player.x += player.vx;
    player.y += player.vy;

    // NEW: Player wall bounce logic
    if (player.x < 0) {
        player.x = 0;
        player.vx *= -1.5; // Bounce back with extra force
    } else if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
        player.vx *= -1.5;
    }

    if (player.y < 0) {
        player.y = 0;
        player.vy *= -1.5;
    } else if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.vy *= -1.5;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#45ff01';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#ff0000';
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function gameLoop() {
    if (gameRunning && !pause) {
        update();
        updateDots();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

setInterval(spawnDot, 15000);
gameLoop();
