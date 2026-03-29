window.onload = () => {
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
    const lerpAmount = 0.15; // Smoothness: 0.1 is slow/smooth, 0.3 is fast/snappy

    // The Host (Square)
    let hostPlayer = { x: 600, y: 300, width: 20, height: 20, speed: 6, color: '#45ff01', targetX: 600, targetY: 300 };
    
    // All other players (Circles)
    let remotePlayers = {}; 
    let connections = []; 
    let myConn;

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
        statusDiv.innerText = "Status: Ready";
    });

    // HOST SIDE: New player joins
    peer.on('connection', (conn) => {
        if (connections.length >= 7) { 
            conn.on('open', () => { conn.send({ type: 'LOBBY_FULL' }); setTimeout(() => conn.close(), 500); });
            return;
        }

        connections.push(conn);
        remotePlayers[conn.peer] = { 
            x: 50, y: 50, radius: 10, 
            color: colors[connections.length - 1],
            targetX: 50, targetY: 50 
        };

        statusDiv.innerText = `Players: ${connections.length + 1}/8`;
        
        conn.on('data', (data) => {
            if (data.type === 'POS') {
                // Store as target for interpolation
                remotePlayers[conn.peer].targetX = data.x;
                remotePlayers[conn.peer].targetY = data.y;
            }
        });
    });

    // CLIENT SIDE: Joining
    joinBtn.addEventListener('click', () => {
        myConn = peer.connect(remoteIdInput.value);
        isHost = false;
        myConn.on('data', (data) => {
            if (data.type === 'LOBBY_FULL') alert("Lobby full!");
            if (data.type === 'SYNC') {
                // Update targets for smooth sliding
                hostPlayer.targetX = data.host.x;
                hostPlayer.targetY = data.host.y;
                
                // Sync remote players targets
                for (let id in data.remotes) {
                    if (!remotePlayers[id]) remotePlayers[id] = data.remotes[id];
                    remotePlayers[id].targetX = data.remotes[id].x;
                    remotePlayers[id].targetY = data.remotes[id].y;
                    remotePlayers[id].color = data.remotes[id].color;
                }
                gameRunning = true;
                startBtn.style.display = 'none';
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
    });

    function update() {
        if (!gameRunning) return;

        // 1. INPUT HANDLING
        if (isHost) {
            if (keys['ArrowUp']) hostPlayer.y -= hostPlayer.speed;
            if (keys['ArrowDown']) hostPlayer.y += hostPlayer.speed;
            if (keys['ArrowLeft']) hostPlayer.x -= hostPlayer.speed;
            if (keys['ArrowRight']) hostPlayer.x += hostPlayer.speed;
            
            // Host sends their REAL position to everyone
            connections.forEach(c => {
                if (c.open) c.send({ type: 'SYNC', host: hostPlayer, remotes: remotePlayers });
            });
            checkAllCollisions();
        } else {
            let me = remotePlayers[peer.id];
            if (me) {
                // Use targetX/Y for local movement to keep it responsive
                if (keys['ArrowUp']) me.targetY -= 5;
                if (keys['ArrowDown']) me.targetY += 5;
                if (keys['ArrowLeft']) me.targetX -= 5;
                if (keys['ArrowRight']) me.targetX += 5;
                myConn.send({ type: 'POS', x: me.targetX, y: me.targetY });
            }
        }

        // 2. INTERPOLATION (The Smoothing)
        // Smooth the Host Square
        hostPlayer.x += (hostPlayer.targetX - hostPlayer.x) * lerpAmount;
        hostPlayer.y += (hostPlayer.targetY - hostPlayer.y) * lerpAmount;

        // Smooth all Circle Chasers
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
        // --- TRAIL EFFECT ---
        // Instead of clearRect, draw a semi-transparent rectangle over the whole screen
        ctx.fillStyle = 'rgba(34, 34, 34, 0.2)'; // Adjust 0.2 (alpha) for longer/shorter trails
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Square (Host)
        ctx.fillStyle = hostPlayer.color;
        ctx.fillRect(hostPlayer.x, hostPlayer.y, hostPlayer.width, hostPlayer.height);

        // Draw Circles (Remotes)
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
