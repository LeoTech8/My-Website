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

    // The Host (Square)
    let hostPlayer = { x: 600, y: 300, width: 20, height: 20, speed: 6, color: '#45ff01' };
    
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
        statusDiv.innerText = "Status: Ready to Host/Join";
    });

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
        
        // Add this specific player with direct X/Y (No targets)
        remotePlayers[newConn.peer] = { 
            x: 50, y: 50, radius: 10, 
            color: colors[connections.length - 1]
        };

        statusDiv.innerText = `Players: ${connections.length + 1}/8`;
        
        newConn.on('data', (data) => {
            if (data.type === 'POS' && remotePlayers[newConn.peer]) {
                // UPDATE DIRECTLY (No Interpolation)
                remotePlayers[newConn.peer].x = data.x;
                remotePlayers[newConn.peer].y = data.y;
            }
        });

        newConn.on('close', () => {
            connections = connections.filter(c => c.peer !== newConn.peer);
            delete remotePlayers[newConn.peer];
            statusDiv.innerText = `Players: ${connections.length + 1}/8`;
        });
    });

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
                // SYNC DIRECTLY (No Interpolation)
                hostPlayer.x = data.host.x;
                hostPlayer.y = data.host.y;
                
                for (let id in data.remotes) {
                    if (!remotePlayers[id]) {
                        remotePlayers[id] = data.remotes[id];
                    }
                    remotePlayers[id].x = data.remotes[id].x;
                    remotePlayers[id].y = data.remotes[id].y;
                    remotePlayers[id].color = data.remotes[id].color;
                }
            }
        });
    });

    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);

    startBtn.addEventListener('click', () => {
        isHost = true;
        gameRunning = true;
        startBtn.style.display = 'none';
    });

    function update() {
        if (!gameRunning) return;

        if (isHost) {
            // Host moves Square
            if (keys['ArrowUp']) hostPlayer.y -= hostPlayer.speed;
            if (keys['ArrowDown']) hostPlayer.y += hostPlayer.speed;
            if (keys['ArrowLeft']) hostPlayer.x -= hostPlayer.speed;
            if (keys['ArrowRight']) hostPlayer.x += hostPlayer.speed;
            
            // Broadcast positions
            connections.forEach(c => {
                if (c.open) c.send({ type: 'SYNC', host: hostPlayer, remotes: remotePlayers });
            });
            checkAllCollisions();
        } else {
            // Client moves THEIR circle
            let me = remotePlayers[peer.id];
            if (me) {
                let circleSpeed = 7; // Circles are slightly faster
                if (keys['ArrowUp']) me.y -= circleSpeed;
                if (keys['ArrowDown']) me.y += circleSpeed;
                if (keys['ArrowLeft']) me.x -= circleSpeed;
                if (keys['ArrowRight']) me.x += circleSpeed;
                myConn.send({ type: 'POS', x: me.x, y: me.y });
            }
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
        // TRAIL EFFECT (Kept)
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
