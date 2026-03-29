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

};
