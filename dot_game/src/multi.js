        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const statusDiv = document.getElementById('status');
        const myIdDiv = document.getElementById('myIdDisplay');
        const joinBtn = document.getElementById('joinBtn');
        const remoteIdInput = document.getElementById('remoteIdInput');
        const startBtn = document.getElementById('startBtn');

        // --- GAME STATE ---
        let player = { x: 200, y: 200, width: 20, height: 20, vx: 5, vy: 5 }; // Square (Host)
        let enemy = { x: 50, y: 50, radius: 10, vx: 5, vy: 5 };               // Circle (Client)
        let keys = {};
        let gameRunning = false;
        let isHost = false; 
        let conn;

        function generateShortId(length = 5) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like O, 0, I, 1
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }


        // --- NETWORKING ---
        // Generate a 5-character ID first
        const myShortId = generateShortId(5);

        // Pass it to the Peer constructor
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
            conn = connection;
            isHost = true;
            statusDiv.innerText = "Status: Connected! (You are HOST)";
            setupDataListener();
        });

        peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            alert("ID already taken, refreshing...");
            location.reload(); // Simple way to try again with a new ID
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
            });
            conn.on('data', (data) => {
                if (isHost) {
                    enemy.x = data.x;
                    enemy.y = data.y;
                } else {
                    player.x = data.x;
                    player.y = data.y;
                }
            });
        }

        // --- COLLISION DETECTION ---
        function checkCollision() {
            // Find the closest point on the square to the circle
            let closestX = Math.max(player.x, Math.min(enemy.x, player.x + player.width));
            let closestY = Math.max(player.y, Math.min(enemy.y, player.y + player.height));

            // Calculate distance between closest point and circle center
            let distanceX = enemy.x - closestX;
            let distanceY = enemy.y - closestY;
            let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

            if (distanceSquared < (enemy.radius * enemy.radius)) {
                gameRunning = false;
                startBtn.style.display = 'block';
                startBtn.innerText = "Collision! Restart?";
            }
        }

        // --- CONTROLS ---
        document.addEventListener('keydown', (e) => keys[e.key] = true);
        document.addEventListener('keyup', (e) => keys[e.key] = false);

// --- CONTROLS & START ---
startBtn.addEventListener('click', () => {
    // When you click Start, you are the Host by default
    isHost = true; 
    gameRunning = true;
    startBtn.style.display = 'none';
    statusDiv.innerText = "Status: Hosting... Waiting for someone to join.";
});

function update() {
    if (!gameRunning) return;

    if (isHost) {
        // HOST moves Square (WASD)
        if (keys['ArrowUp']) player.y -= player.vy;
        if (keys['ArrowDown']) player.y += player.vy;
        if (keys['ArrowLeft']) player.x -= player.vx;
        if (keys['ArrowRight']) player.x += player.vx;
        
        // ONLY send data if someone is actually connected
        if (conn && conn.open) {
            conn.send({ x: player.x, y: player.y });
        }
    } else {
        // CLIENT moves Circle (Arrows)
        if (keys['ArrowUp']) enemy.y -= enemy.vy;
        if (keys['ArrowDown']) enemy.y += enemy.vy;
        if (keys['ArrowLeft']) enemy.x -= enemy.vx;
        if (keys['ArrowRight']) enemy.x += enemy.vx;
        
        // Send position to Host
        if (conn && conn.open) {
            conn.send({ x: enemy.x, y: enemy.y });
        }
    }

    // Keep players inside the box
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

    // Only check collision if both players are "real" (connected)
    if (conn && conn.open) {
        checkCollision();
    }
}


        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#45ff01';
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }

        function gameLoop() {
            if (gameRunning) {
                update();
            }
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
