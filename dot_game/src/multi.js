Already done!: <!DOCTYPE html>
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
    <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js" defer></script>
    
    <!-- Load your Game Logic (Make sure the path is correct!) -->
    <script src="src/multi.js" defer></script>
</head>
<body>

    <h1>Inspired minds Multiplayer</h1>

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

    
<!-- JOYSTICK -->
<div id="joystickContainer">
    <div id="joystickBase">
        <div id="joystickStick"></div>
    </div>
</div>

</body>
</html>window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('status');
    const myIdDiv = document.getElementById('myIdDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const remoteIdInput = document.getElementById('remoteIdInput');
    const startBtn = document.getElementById('startBtn');

    // --- GAME STATE ---
    let isHost = false;
    let gameRunning = false;
    let keys = {};
    const lerpAmount = 0.15;

    // The Host (Square)
    let hostPlayer = { x: 600, y: 300, width: 20, height: 20, speed: 6, color: '#45ff01', targetX: 600, targetY: 300 };
    
    // All other players (Circles)
    let remotePlayers = {}; 
    let connections = []; // ARRAY to fix the "Connection Closed" issue
    let myConn;           // Client's single link to host

    const colors = ['#ff0000', '#0099ff', '#ff00ff', '#ffff00', '#ff9900', '#00ffff', '#ffffff'];

    // --- NETWORKING ---
    function generateShortId(l = 5) {
        const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let r = ''; for (let i = 0; i < l; i++) r += c.charAt(Math.floor(Math.random() * c.length));
        return r;
    }

    const peer = new Peer(generateShortId(5), { host: '0.peerjs.com', port: 443, secure: true });

    peer.on('open', (id) => {
        myIdDiv.innerText = "My ID: " + id;
        statusDiv.innerText = "Status: Ready to Host/Join";
    });

    // HOST SIDE: Handling multiple incoming connections
    peer.on('connection', (newConn) => {
        if (connections.length >= 7) { 
            newConn.on('open', () => { 
                newConn.send({ type: 'LOBBY_FULL' }); 
                setTimeout(() => newConn.close(), 500); 
            });
            return;
        }

        isHost = true;
        connections.push(newConn);
        
        // Add this specific player to our tracking object
        remotePlayers[newConn.peer] = { 
            x: 50, y: 50, radius: 10, 
            color: colors[connections.length - 1],
            targetX: 50, targetY: 50 
        };

        statusDiv.innerText = `Players: ${connections.length + 1}/8`;
        
        // Listen for this specific player's movements
        newConn.on('data', (data) => {
            if (data.type === 'POS' && remotePlayers[newConn.peer]) {
                remotePlayers[newConn.peer].targetX = data.x;
                remotePlayers[newConn.peer].targetY = data.y;
            }
        });

        newConn.on('close', () => {
            connections = connections.filter(c => c.peer !== newConn.peer);
            delete remotePlayers[newConn.peer];
            statusDiv.innerText = `Players: ${connections.length + 1}/8`;
        });
    });

    // CLIENT SIDE: Joining the host
    joinBtn.addEventListener('click', () => {
        myConn = peer.connect(remoteIdInput.value);
        isHost = false;
        
        myConn.on('open', () => {
            statusDiv.innerText = "Status: Joined Lobby!";
            gameRunning = true;
            startBtn.style.display = 'none';
        });

        myConn.on('data', (data) => {
            if (data.type === 'LOBBY_FULL') alert("Lobby is full!");
            if (data.type === 'SYNC') {
                // Sync Host Square
                hostPlayer.targetX = data.host.x;
                hostPlayer.targetY = data.host.y;
                
                // Sync all other Circle Chasers
                for (let id in data.remotes) {
                    if (!remotePlayers[id]) {
                        remotePlayers[id] = data.remotes[id];
                    }
                    remotePlayers[id].targetX = data.remotes[id].x;
                    remotePlayers[id].targetY = data.remotes[id].y;
                    remotePlayers[id].color = data.remotes[id].color;
                }
            }
        });
    });

    // --- CONTROLS ---
    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);

    startBtn.addEventListener('click', () => {
        isHost = true;
        gameRunning = true;
        startBtn.style.display = 'none';
        statusDiv.innerText = "Status: Hosting Game";
    });

    function update() {
        if (!gameRunning) return;

        if (isHost) {
            // Host moves Square
            if (keys['ArrowUp']) hostPlayer.targetY -= hostPlayer.speed;
            if (keys['ArrowDown']) hostPlayer.targetY += hostPlayer.speed;
            if (keys['ArrowLeft']) hostPlayer.targetX -= hostPlayer.speed;
            if (keys['ArrowRight']) hostPlayer.targetX += hostPlayer.speed;
            
            // Host broadcasts EVERYONE'S position to EVERYONE
            connections.forEach(c => {
                if (c.open) c.send({ type: 'SYNC', host: hostPlayer, remotes: remotePlayers });
            });
            checkAllCollisions();
        } else {
            // Client moves THEIR specific circle
            let me = remotePlayers[peer.id];
            if (me) {
                if (keys['ArrowUp']) me.targetY -= 5;
                if (keys['ArrowDown']) me.targetY += 5;
                if (keys['ArrowLeft']) me.targetX -= 5;
                if (keys['ArrowRight']) me.targetX += 5;
                myConn.send({ type: 'POS', x: me.targetX, y: me.targetY });
            }
        }

        // Interpolation (Smoothing all players)
        hostPlayer.x += (hostPlayer.targetX - hostPlayer.x) * lerpAmount;
        hostPlayer.y += (hostPlayer.targetY - hostPlayer.y) * lerpAmount;

        for (let id in remotePlayers) {
            let p = remotePlayers[id];
            p.x += (p.targetX - p.x) * lerpAmount;
            p.y += (p.targetY - p.y) * lerpAmount;
        }
    }

    function checkAllCollisions() {
        for (let id in remotePlayers) {
            let p = remotePlayers[id];
            let dx = p.x - (hostPlayer.x + 10);
            let dy = p.y - (hostPlayer.y + 10);
            if (Math.sqrt(dx*dx + dy*dy) < 20) {
                gameRunning = false;
                startBtn.style.display = 'block';
                startBtn.innerText = "Square Caught! Restart?";
            }
        }
    }

    function draw() {
        // Trail Effect
        ctx.fillStyle = 'rgba(34, 34, 34, 0.3)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Square
        ctx.fillStyle = hostPlayer.color;
        ctx.fillRect(hostPlayer.x, hostPlayer.y, hostPlayer.width, hostPlayer.height);

        // Draw all Circles
        for (let id in remotePlayers) {
            let p = remotePlayers[id];
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
};
