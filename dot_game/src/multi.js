window.onload = () => {
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const myIdDiv = document.getElementById('myIdDisplay');
const joinBtn = document.getElementById('joinBtn');
const remoteIdInput = document.getElementById('remoteIdInput');
const startBtn = document.getElementById('startBtn');

// --- DEVICE DETECTION (NEW) ---
function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
const isMobile = isTouchDevice();

// --- JOYSTICK AUTO TOGGLE (NEW) ---
const joystick = document.getElementById('joystickContainer');
if (joystick) {
    joystick.style.display = isMobile ? 'block' : 'none';
}

// --- GAME STATE ---
let player = { x: 200, y: 200, width: 20, height: 20, speed: 6 };
let enemy = { x: 50, y: 50, radius: 10, speed: 7 };

let keys = {};
let remoteKeys = { up: false, down: false, left: false, right: false };

let gameRunning = false;
let isHost = false;
let conn;

// --- NETWORK TIMING ---
let lastSend = 0;
const SEND_RATE = 1000 / 30;

// --- ID ---
function generateShortId(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const myShortId = generateShortId();

const peer = new Peer(myShortId, {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 2
});

peer.on('open', (id) => {
    myIdDiv.innerText = "My ID: " + id;
    statusDiv.innerText = "Status: Ready to Host or Join";
});

peer.on('connection', (connection) => {
    if (conn && conn.open) {
        connection.on('open', () => {
            connection.send({ type: 'LOBBY_FULL' });
            setTimeout(() => connection.close(), 500);
        });
        return;
    }

    conn = connection;
    isHost = true;

    statusDiv.innerText = "Status: Connected! (You are HOST)";
    setupDataListener();
});

peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'unavailable-id') {
        alert("ID already taken. Refreshing...");
        location.reload();
    }
});

// --- JOIN ---
joinBtn.addEventListener('click', () => {
    const remoteId = remoteIdInput.value;
    if (!remoteId) return alert("Enter an ID!");

    conn = peer.connect(remoteId);
    isHost = false;

    statusDiv.innerText = "Status: Connecting...";
    setupDataListener();
});

// --- CONNECTION HANDLER ---
function setupDataListener() {
    conn.on('open', () => {
        statusDiv.innerText = "Status: Connected!";
        gameRunning = true;
        startBtn.style.display = 'none';

        // INIT SYNC
        conn.send({
            type: 'INIT',
            player: player
        });
    });

    conn.on('data', (data) => {
        if (!data || !data.type) {
            remoteKeys = data || remoteKeys;
            return;
        }

        if (data.type === 'LOBBY_FULL') {
            statusDiv.innerText = "Status: Lobby Full!";
            conn.close();
            return;
        }

        if (data.type === 'RESTART') {
            resetPositions();
            return;
        }

        if (data.type === 'INIT') {
            if (isHost) {
                enemy.x = data.player.x;
                enemy.y = data.player.y;
            } else {
                player.x = data.player.x;
                player.y = data.player.y;
            }
            return;
        }
    });

    conn.on('close', () => {
        statusDiv.innerText = "Status: Connection Closed";
        gameRunning = false;
    });
}

// --- RESET ---
function resetPositions() {
    player.x = 200; player.y = 200;
    enemy.x = 50; enemy.y = 50;
    gameRunning = true;
    startBtn.style.display = 'none';
}

// --- INPUT (UPDATED: mobile-safe) ---
if (!isMobile) {
    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);
}

// --- START BUTTON ---
startBtn.addEventListener('click', () => {
    resetPositions();

    if (conn && conn.open) {
        conn.send({ type: 'RESTART' });
    } else {
        isHost = true;
        statusDiv.innerText = "Status: Hosting...";
    }
});

// --- COLLISION ---
function checkCollision() {
    let closestX = Math.max(player.x, Math.min(enemy.x, player.x + player.width));
    let closestY = Math.max(player.y, Math.min(enemy.y, player.y + player.height));
    let dx = enemy.x - closestX;
    let dy = enemy.y - closestY;

    if ((dx * dx + dy * dy) < (enemy.radius * enemy.radius)) {
        gameRunning = false;
        startBtn.style.display = 'block';
        startBtn.innerText = "Collision! Restart?";
    }
}

// --- UPDATE ---
function update() {
    if (!gameRunning) return;

    // LOCAL CONTROL
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

    // REMOTE CONTROL
    if (isHost) {
        if (remoteKeys.up) enemy.y -= enemy.speed;
        if (remoteKeys.down) enemy.y += enemy.speed;
        if (remoteKeys.left) enemy.x -= enemy.speed;
        if (remoteKeys.right) enemy.x += enemy.speed;
    } else {
        if (remoteKeys.up) player.y -= player.speed;
        if (remoteKeys.down) player.y += player.speed;
        if (remoteKeys.left) player.x -= player.speed;
        if (remoteKeys.right) player.x += player.speed;
    }

    // SEND INPUT
    const now = Date.now();
    if (conn && conn.open && now - lastSend > SEND_RATE) {
        lastSend = now;

        conn.send({
            up: keys['ArrowUp'],
            down: keys['ArrowDown'],
            left: keys['ArrowLeft'],
            right: keys['ArrowRight']
        });
    }

    // BOUNDS
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

    if (conn && conn.open) checkCollision();
}

// --- DRAW ---
function draw() {
    ctx.fillStyle = 'rgba(34, 34, 34, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#45ff01';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
}

// --- LOOP ---
function gameLoop() {
    if (gameRunning) update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
};
