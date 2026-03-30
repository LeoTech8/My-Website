window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('status');
    const myIdDiv = document.getElementById('myIdDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const remoteIdInput = document.getElementById('remoteIdInput');
    const startBtn = document.getElementById('startBtn');

    const socket = io("https://multiplayer-dot-server.onrender.com");

    let roomCode = null;
    let isHost = false;

    let player = { x: 200, y: 200, width: 20, height: 20, vx: 6, vy: 6 };
    let enemy = { x: 50, y: 50, radius: 10, vx: 7, vy: 7 };

    let keys = {};
    let gameRunning = false;

    // --- CREATE ROOM (HOST) ---
    socket.emit('createRoom');

    socket.on('roomCreated', (code) => {
        roomCode = code;
        isHost = true;

        myIdDiv.innerText = "Room Code: " + code;
        statusDiv.innerText = "Share this code with your friend";
    });

    // --- JOIN ROOM ---
    joinBtn.addEventListener('click', () => {
        const code = remoteIdInput.value.trim();
        if (!code) return alert("Enter room code");

        socket.emit('joinRoom', code);
    });

    socket.on('joinedRoom', (code) => {
        roomCode = code;
        statusDiv.innerText = "Joined room: " + code;
    });

    socket.on('errorMsg', (msg) => {
        alert(msg);
    });

    socket.on('playerCount', (count) => {
        console.log("Players in room:", count);
        if (count === 2) {
            gameRunning = true;
            startBtn.style.display = 'none';
        }
    });

    // --- SYNC ---
    socket.on('playerMoved', (data) => {
        enemy.x = data.x;
        enemy.y = data.y;
    });

    socket.on('restart', () => {
        player.x = 200;
        player.y = 200;
        enemy.x = 50;
        enemy.y = 50;
        gameRunning = true;
        startBtn.style.display = 'none';
    });

    // --- INPUT ---
    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);

    startBtn.addEventListener('click', () => {
        if (roomCode) {
            socket.emit('restart', roomCode);
        }
    });

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

    function update() {
        if (!gameRunning || !roomCode) return;

        if (keys['ArrowUp']) player.y -= player.vy;
        if (keys['ArrowDown']) player.y += player.vy;
        if (keys['ArrowLeft']) player.x -= player.vx;
        if (keys['ArrowRight']) player.x += player.vx;

        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        // Send movement
        socket.emit('move', {
            room: roomCode,
            x: player.x,
            y: player.y
        });

        // Optional local enemy control
        if (keys['w']) enemy.y -= enemy.vy;
        if (keys['s']) enemy.y += enemy.vy;
        if (keys['a']) enemy.x -= enemy.vx;
        if (keys['d']) enemy.x += enemy.vx;

        enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));

        checkCollision();
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

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    loop();
};
