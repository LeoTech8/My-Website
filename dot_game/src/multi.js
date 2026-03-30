window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('status');
    const myIdDiv = document.getElementById('myIdDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const remoteIdInput = document.getElementById('remoteIdInput');
    const startBtn = document.getElementById('startBtn');

    // --- GAME STATE ---
    let player = { x: 200, y: 200, width: 20, height: 20, vx: 6, vy: 6 };
    let enemy = { x: 50, y: 50, radius: 10, vx: 7, vy: 7 };
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
        debug: 2,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                {
                    urls: [
                        'turn:openrelay.metered.ca:80',
                        'turn:openrelay.metered.ca:443',
                        'turns:openrelay.metered.ca:443?transport=tcp'
                    ],
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10
        }
    });

    // --- PEER DEBUG ---
    peer.on('open', (id) => {
        console.log("🟢 Peer open:", id);
        myIdDiv.innerText = "My ID: " + id;
        statusDiv.innerText = "Status: Ready to Host or Join";
    });

    peer.on('error', (err) => {
        console.error("🔥 Peer error:", err);
        if (err.type === 'unavailable-id') {
            alert("ID taken, refreshing...");
            location.reload();
        }
    });

    peer.on('disconnected', () => {
        console.warn("⚠️ Peer disconnected");
    });

    peer.on('close', () => {
        console.warn("❌ Peer closed");
    });

    // --- HOST ACCEPT ---
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

        conn.on('open', () => {
            console.log("✅ Incoming connection open");
            statusDiv.innerText = "Status: Connected! (HOST)";
            setupDataListener();
        });
    });

    // --- JOIN ---
    joinBtn.addEventListener('click', () => {
        const remoteId = remoteIdInput.value;
        if (!remoteId) return alert("Enter an ID!");

        statusDiv.innerText = "Status: Connecting...";
        console.log("🔌 Attempting connection to:", remoteId);

        conn = peer.connect(remoteId, {
            reliable: true
        });

        isHost = false;

        conn.on('open', () => {
            console.log("✅ Outgoing connection open");
            statusDiv.innerText = "Status: Connected!";
            setupDataListener();
        });

        // Timeout detection
        setTimeout(() => {
            if (!conn || !conn.open) {
                statusDiv.innerText = "Blocked ❌ (Try hotspot)";
                console.warn("⛔ Likely network blocking WebRTC");
            }
        }, 8000);
    });

    function setupDataListener() {
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
            console.log("❌ Connection closed");
            statusDiv.innerText = "Status: Connection Closed";
            gameRunning = false;
        });

        conn.on('error', (err) => {
            console.error("🔥 Connection error:", err);
            statusDiv.innerText = "Connection Error";
        });

        // ICE debugging (advanced)
        if (conn.peerConnection) {
            conn.peerConnection.addEventListener('iceconnectionstatechange', () => {
                console.log("ICE state:", conn.peerConnection.iceConnectionState);
            });
        }

        gameRunning = true;
        startBtn.style.display = 'none';
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

        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
        enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

        if (conn && conn.open) checkCollision();
    }

    function draw() {
        ctx.fillStyle = 'rgba(34, 34, 34, 0.3)';
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
};
