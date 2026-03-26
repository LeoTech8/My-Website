const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d'); 

function easteregg() {
    window.location.href = 'src/job.png'; 
}

let dots = [];
let score = 0;
let player = { x: 200, y: 200, width: 20, height: 20, radius: 10, speed: 6 };
let username = null;
let keys = {};
let isSlowMode = false; 
let pause = false;
let hard = false;
let gameRunning = false; // NEW: Track if game has started

// NEW: Start Button Logic
const startBtn = document.getElementById('startBtn');
startBtn.addEventListener('click', () => {
    gameRunning = true;
    startBtn.style.display = 'none'; // Hide button
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
    if (!gameRunning) return; // Only spawn if playing
    score = score + 1;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 : canvas.width;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 : canvas.height;
    }
    dots.push({ x: x, y: y, radius: 10, speed: isSlowMode ? 1 : 5 });
}

function resetGame() {
    score = 0;
    player.x = 200;
    player.y = 200;
    dots = []; 
    spawnDot(); 
    keys = {};
}

async function fetchData(url) {
    try {
        // 'no-cors' mode bypasses common browser blocks for simple submissions
        await fetch(url, { mode: 'no-cors' }); 
        console.log("Score submitted successfully!");
    } catch (error) {
        console.error("Leaderboard Error:", error);
    }
}

function onPlayerTouched() {
    gameRunning = false; // Stop the game
    startBtn.innerText = "Restart Game";
    startBtn.style.display = 'block'; // Show button again
    alert('You have been eaten - Score: ' + score); 
    username = prompt("Username for leaderboard: ");
    //fetchData("http://dreamlo.com/lb/MFDT9FibuEW1BV8M_gS7iA0R0Wenq200iWQLfVe3an3w"+username+"/"+score);
    
}

function updateDots() {
    dots.forEach(dot => {
        const dx = player.x - dot.x;
        const dy = player.y - dot.y;
        const angle = Math.atan2(dy, dx);
        dot.x += Math.cos(angle) * dot.speed;
        dot.y += Math.sin(angle) * dot.speed;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (player.radius + dot.radius)) {
            onPlayerTouched();
        }
    });
}

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

function update() {
    if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
    if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
    if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
    if (keys['p']) togglePause();    
    if (keys[' ']) toggleSlowMode();
    if (keys['h']) hardMode();
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
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
    if (gameRunning && !pause) { // Only update if game is active
        update();
        updateDots();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize
setInterval(spawnDot, 15000); 
gameLoop();
