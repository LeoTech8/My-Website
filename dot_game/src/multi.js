My game is hung on waiting for peerjs: <!DOCTYPE html>
<html lang="en-AU">
<head>
    <meta charset="UTF-8">
    <title>P2P Multiplayer Game</title>
    <style>
        body { 
            background: #222; 
            color: white; 
            font-family: sans-serif; 
            text-align: center; 
        }
        canvas { 
            background: #000; 
            border: 2px solid #444; 
            display: block; 
            margin: 10px auto; 
        }
        /* Menu box for connection settings */
        .menu { 
            background: #333; 
            padding: 15px; 
            border-radius: 8px; 
            display: inline-block; 
            margin-top: 10px; 
        }
        input { 
            padding: 8px; 
            border-radius: 4px; 
            border: none; 
            outline: none;
        }
        button { 
            padding: 8px 15px; 
            cursor: pointer; 
            background: #45ff01; 
            border: none; 
            border-radius: 4px; 
            font-weight: bold; 
            transition: background 0.2s;
        }
        button:hover {
            background: #32ba00;
        }
        #status { 
            color: #ffcc00; 
            margin: 5px; 
            font-weight: bold;
        }
        #myIdDisplay {
            font-size: 1.2rem;
            letter-spacing: 2px;
            color: #45ff01;
            margin-bottom: 10px;
        }
    </style>
    
    <!-- Load PeerJS Library first -->
    <script src="https://unpkg.com/@1.5.2/dist/peerjs.min.js" defer></script>
    
    <!-- Load your Game Logic (Make sure the path is correct!) -->
    <script src="src/multi.js" defer></script>
</head>
<body>

    <h1>Square Chaser Multiplayer</h1>

    <div class="menu">
        <div id="status">Status: Waiting for PeerJS...</div>
        <div id="myIdDisplay">My ID: ---</div>
        
        <input type="text" id="remoteIdInput" placeholder="Paste Friend's ID here">
        <button id="joinBtn">Join Lobby</button>
        <button id="startBtn">Start Game</button>
    </div>

    <!-- The Game Canvas -->
    <canvas id="gameCanvas" width="1350" height="650">
        Your browser is too old to play this game!
    </canvas>

</body>
</html> Javascript: window.onload = () => {
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const myIdDiv = document.getElementById('myIdDisplay');
const joinBtn = document.getElementById('joinBtn');
const remoteIdInput = document.getElementById('remoteIdInput');
const startBtn = document.getElementById('startBtn');

// --- GAME STATE ---
let player = { x: 200, y: 200, width: 20, height: 20, vx: 6, vy: 6 }; // Square (Host)
let enemy = { x: 50, y: 50, radius: 10, vx: 7, vy: 7 };               // Circle (Client)
let keys = {};
let gameRunning = false;
let isHost = false; 
let conn;

function generateShortId(length = 5) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// --- NETWORKING ---
const myShortId = generateShortId(5);

const peer = new Peer(myShortId, {
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    debug: 3 
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
    if (err.type === 'unavailable-id') {
        alert("ID already taken, refreshing...");
        location.reload(); 
    }
});

joinBtn.addEventListener('click', () => {
    const remoteId = remoteIdInput.value;
    if (!remoteId) return alert("Enter an ID!");
    conn = peer.connect(remoteId);
    isHost = false;
    statusDiv.innerText = "Status: Connecting...";
    setupDataListener();
});

function setupDataListener() {
    conn.on('open', () => {
        statusDiv.innerText = "Status: Connected!";
        gameRunning = true;
        startBtn.style.display = 'none';
    });

    conn.on('data', (data) => {
        if (data.type === 'LOBBY_FULL') {
            statusDiv.innerText = "Status: Lobby Full!";
            conn.close();
            return;
        }
        if (data.type === 'RESTART') {
            resetPositions();
            return;
        }

        if (isHost) {
            enemy.x = data.x;
            enemy.y = data.y;
        } else {
            player.x = data.x;
            player.y = data.y;
        }
    });

    conn.on('close', () => {
        statusDiv.innerText = "Status: Connection Closed";
        gameRunning = false;
    });
}

function resetPositions() {
    player.x = 200; player.y = 200;
    enemy.x = 50; enemy.y = 50;
    gameRunning = true;
    startBtn.style.display = 'none';
}

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

document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

startBtn.addEventListener('click', () => {
    resetPositions();
    if (!conn || !conn.open) {
        isHost = true;
        statusDiv.innerText = "Status: Hosting... Waiting for join.";
    } else {
        conn.send({ type: 'RESTART' });
    }
});

function update() {
    if (!gameRunning) return;

    if (isHost) {
        if (keys['ArrowUp']) player.y -= player.vy;
        if (keys['ArrowDown']) player.y += player.vy;
        if (keys['ArrowLeft']) player.x -= player.vx;
        if (keys['ArrowRight']) player.x += player.vx;
        if (conn && conn.open) conn.send({ x: player.x, y: player.y });
    } else {
        if (keys['ArrowUp']) enemy.y -= enemy.vy;
        if (keys['ArrowDown']) enemy.y += enemy.vy;
        if (keys['ArrowLeft']) enemy.x -= enemy.vx;
        if (keys['ArrowRight']) enemy.x += enemy.vx;
        if (conn && conn.open) conn.send({ x: enemy.x, y: enemy.y });
    }

    // Bounds
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

    if (conn && conn.open) checkCollision();
}

function draw() {
    // --- PLAYER TRAILS ---
    // Instead of clearRect, we paint a faint background every frame
    ctx.fillStyle = 'rgba(34, 34, 34, 0.3)'; // 0.3 controls trail length
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#45ff01';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
}

function gameLoop() {
    if (gameRunning) update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
}
