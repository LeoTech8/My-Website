window.onload = () => {

// ================= DEBUG SYSTEM =================
const DEBUG = true;

function log(...args) {
    if (DEBUG) console.log("[DEBUG]", ...args);
}
function logNet(...args) {
    if (DEBUG) console.log("[NET]", ...args);
}
function logInput(...args) {
    if (DEBUG) console.log("[INPUT]", ...args);
}
function logGame(...args) {
    if (DEBUG) console.log("[GAME]", ...args);
}
function logWarn(...args) {
    if (DEBUG) console.warn("[WARN]", ...args);
}
function logError(...args) {
    console.error("[ERROR]", ...args);
}

// ================= CANVAS =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    log("Canvas resized:", canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ================= UI =================
const statusDiv = document.getElementById('status');
const myIdDiv = document.getElementById('myIdDisplay');
const joinBtn = document.getElementById('joinBtn');
const remoteIdInput = document.getElementById('remoteIdInput');
const startBtn = document.getElementById('startBtn');

// ================= DEVICE =================
function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
const isMobile = isTouchDevice();
log("Device type:", isMobile ? "Mobile" : "PC");

// ================= JOYSTICK =================
const joystick = document.getElementById('joystickContainer');
const stick = document.getElementById('joystickStick');

if (joystick) {
    joystick.style.display = isMobile ? 'block' : 'none';
    log("Joystick visibility:", joystick.style.display);
}

// ================= GAME STATE =================
let player = { x: 200, y: 200, width: 20, height: 20, speed: 6 };
let enemy = { x: 50, y: 50, radius: 10, speed: 7 };

let keys = {};
let remoteKeys = { up: false, down: false, left: false, right: false };

let gameRunning = false;
let isHost = false;
let conn;

// ================= NETWORK =================
let lastSend = 0;
const SEND_RATE = 1000 / 30;

// ================= ID =================
function generateShortId(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const peer = new Peer(generateShortId(), {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 2
});

peer.on('open', (id) => {
    logNet("Peer opened:", id);
    myIdDiv.innerText = "My ID: " + id;
    statusDiv.innerText = "Status: Ready";
});

peer.on('connection', (connection) => {
    logNet("Incoming connection");

    conn = connection;
    isHost = true;

    logNet("Role set: HOST");

    statusDiv.innerText = "Status: Connected (HOST)";
    setupDataListener();
});

peer.on('error', (err) => {
    logError("Peer error:", err);

    if (err.type === 'unavailable-id') {
        alert("ID already taken. Reloading...");
        location.reload();
    }
});

// ================= JOIN =================
joinBtn.addEventListener('click', () => {
    const remoteId = remoteIdInput.value;

    if (!remoteId) {
        logWarn("No remote ID entered");
        return alert("Enter an ID!");
    }

    logNet("Connecting to:", remoteId);

    conn = peer.connect(remoteId);
    isHost = false;

    logNet("Role set: CLIENT");

    statusDiv.innerText = "Status: Connecting...";
    setupDataListener();
});

// ================= CONNECTION =================
function setupDataListener() {
    conn.on('open', () => {
        logNet("Connection established");

        statusDiv.innerText = "Status: Connected!";
        gameRunning = true;
        startBtn.style.display = 'none';

        const initPacket = { type: 'INIT', player };
        conn.send(initPacket);

        logNet("Sent INIT:", initPacket);
    });

    conn.on('data', (data) => {
        logNet("Received:", data);

        if (!data) return;

        if (!data.type) {
            remoteKeys = data;
            logInput("Remote keys:", remoteKeys);
            return;
        }

        logNet("Packet type:", data.type);

        if (data.type === 'INIT') {
            if (isHost) {
                enemy.x = data.player.x;
                enemy.y = data.player.y;
            } else {
                player.x = data.player.x;
                player.y = data.player.y;
            }
        }
    });

    conn.on('close', () => {
        logWarn("Connection closed");
        statusDiv.innerText = "Status: Disconnected";
        gameRunning = false;
    });
}

// ================= INPUT =================
if (!isMobile) {
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        logInput("Key down:", e.key);
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        logInput("Key up:", e.key);
    });
}

// ================= JOYSTICK INPUT =================
let joystickActive = false;
let center = { x: 60, y: 60 };

if (stick) {
    stick.addEventListener('touchstart', () => {
        joystickActive = true;
        logInput("Joystick touch start");
    });

    document.addEventListener('touchend', () => {
        joystickActive = false;

        stick.style.left = "35px";
        stick.style.top = "35px";

        keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };

        logInput("Joystick released");
    });

    document.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;

        let touch = e.touches[0];
        let rect = joystick.getBoundingClientRect();

        let dx = touch.clientX - rect.left - center.x;
        let dy = touch.clientY - rect.top - center.y;

        let distance = Math.min(40, Math.hypot(dx, dy));
        let angle = Math.atan2(dy, dx);

        let x = Math.cos(angle) * distance;
        let y = Math.sin(angle) * distance;

        stick.style.left = (center.x + x - 25) + "px";
        stick.style.top = (center.y + y - 25) + "px";

        keys['ArrowUp'] = y < -10;
        keys['ArrowDown'] = y > 10;
        keys['ArrowLeft'] = x < -10;
        keys['ArrowRight'] = x > 10;

        logInput("Joystick moved:", { x, y });
    });
}

// ================= START =================
startBtn.addEventListener('click', () => {
    logGame("Start button clicked");

    player.x = 200;
    player.y = 200;
    enemy.x = 50;
    enemy.y = 50;

    gameRunning = true;

    if (conn && conn.open) {
        conn.send({ type: 'RESTART' });
        logNet("Sent RESTART");
    }
});

// ================= COLLISION =================
function checkCollision() {
    let closestX = Math.max(player.x, Math.min(enemy.x, player.x + player.width));
    let closestY = Math.max(player.y, Math.min(enemy.y, player.y + player.height));
    let dx = enemy.x - closestX;
    let dy = enemy.y - closestY;

    if ((dx * dx + dy * dy) < (enemy.radius * enemy.radius)) {
        logGame("Collision detected");

        gameRunning = false;
        startBtn.style.display = 'block';
        startBtn.innerText = "Collision! Restart?";
    }
}

// ================= UPDATE =================
function update() {
    if (!gameRunning) return;

    if (isHost) {
        if (keys['ArrowUp']) player.y -= player.speed;
        if (keys['ArrowDown']) player.y += player.speed;
        if (keys['ArrowLeft']) player.x -= player.speed;
        if (keys['ArrowRight']) player.x += player.speed;
    } else {
        if (keys['ArrowUp']) enemy.y -= enemy.speed;
        if (keys['ArrowDown']) enemy.y += enemy.speed;
        if (keys['ArrowLeft']) enemy.x -= enemy.speed;
        if (keys['ArrowRight']) enemy.x += enemy.speed;
    }

    if (conn && conn.open) {
        const packet = {
            up: keys['ArrowUp'],
            down: keys['ArrowDown'],
            left: keys['ArrowLeft'],
            right: keys['ArrowRight']
        };

        conn.send(packet);
        logNet("Sent input:", packet);
    }

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

    if (conn && conn.open) checkCollision();
}

// ================= DRAW =================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'lime';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
}

// ================= LOOP =================
function loop() {
    update();
    draw();

    requestAnimationFrame(loop);
}

logGame("Game loop started");
loop();

};const canvas = document.getElementById('gameCanvas');
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
