window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const statusDiv = document.getElementById('status');
    const myIdDiv = document.getElementById('myIdDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const remoteIdInput = document.getElementById('remoteIdInput');
    const startBtn = document.getElementById('startBtn');

    const menu = document.querySelector(".menu");

    // ---------- FULLSCREEN ----------
    function enterFullscreen() {
        const elem = canvas;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    }

    function exitFullscreen() {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    document.addEventListener("fullscreenchange", resize);
    document.addEventListener("webkitfullscreenchange", resize);
    document.addEventListener("msfullscreenchange", resize);

    resize();

    // ---------- GAME STATE ----------
    let isHost = false;
    let gameRunning = false;

    let keys = {};
    const lerpAmount = 0.12;

    const MAX_SPEED = 6;
    const ACCEL = 0.6;
    const FRICTION = 0.92;

    let hostPlayer = {
        x: 200, y: 200,
        vx: 0, vy: 0,
        size: 20,
        color: '#45ff01',
        targetX: 200,
        targetY: 200
    };

    let me = {
        x: 400, y: 300,
        vx: 0, vy: 0,
        radius: 10,
        color: '#ffffff',
        targetX: 400,
        targetY: 300
    };

    let remotePlayers = {};
    let connections = [];
    let myConn;

    const colors = ['#ff0000', '#0099ff', '#ff00ff', '#ffff00', '#ff9900', '#00ffff'];

    // ---------- PEER ----------
    const peer = new Peer(Math.random().toString(36).substring(2,7).toUpperCase(), {
        host: '0.peerjs.com',
        port: 443,
        secure: true
    });

    peer.on('open', id => {
        myIdDiv.innerText = "My ID: " + id;
        statusDiv.innerText = "Ready";
    });

    // ---------- HOST ----------
    peer.on('connection', conn => {
        if (connections.length >= 1) {
            conn.close();
            return;
        }

        isHost = true;
        connections.push(conn);

        remotePlayers[conn.peer] = {
            x: 100, y: 100,
            vx: 0, vy: 0,
            radius: 10,
            color: colors[0],
            targetX: 100,
            targetY: 100
        };

        conn.on('data', data => {
            if (data.type === 'POS') {
                let p = remotePlayers[conn.peer];
                if (p) {
                    p.targetX = data.x;
                    p.targetY = data.y;
                }
            }
        });

        conn.on('close', () => {
            connections = connections.filter(c => c.peer !== conn.peer);
            delete remotePlayers[conn.peer];
        });

        statusDiv.innerText = "Client connected";
    });

    // ---------- JOIN ----------
    joinBtn.onclick = () => {
        myConn = peer.connect(remoteIdInput.value);

        myConn.on('open', () => {
            statusDiv.innerText = "Connected";
            gameRunning = true;

            // UI transition
            menu.style.display = "none";
            canvas.style.display = "block";

            enterFullscreen();
        });

        myConn.on('data', data => {
            if (data.type === 'SYNC') {
                hostPlayer.targetX = data.host.x;
                hostPlayer.targetY = data.host.y;

                if (data.me) {
                    me.targetX = data.me.x;
                    me.targetY = data.me.y;
                }
            }
        });
    };

    // ---------- START HOST ----------
    startBtn.onclick = () => {
        isHost = true;
        gameRunning = true;

        startBtn.style.display = 'none';
        statusDiv.innerText = "Hosting";

        menu.style.display = "none";
        canvas.style.display = "block";

        enterFullscreen();
    };

    // ---------- INPUT ----------
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    // ---------- PHYSICS ----------
    function applyPhysics(p, isSquare = false) {
        if (keys['ArrowUp']) p.vy -= ACCEL;
        if (keys['ArrowDown']) p.vy += ACCEL;
        if (keys['ArrowLeft']) p.vx -= ACCEL;
        if (keys['ArrowRight']) p.vx += ACCEL;

        p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));
        p.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vy));

        p.vx *= FRICTION;
        p.vy *= FRICTION;

        p.x += p.vx;
        p.y += p.vy;

        const size = isSquare ? p.size : p.radius * 2;

        // Wall bounce
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.x > canvas.width - size) { p.x = canvas.width - size; p.vx *= -1; }
        if (p.y > canvas.height - size) { p.y = canvas.height - size; p.vy *= -1; }
    }

    // ---------- UPDATE ----------
    function update() {
        if (!gameRunning) return;

        if (isHost) {
            applyPhysics(hostPlayer, true);

            for (let id in remotePlayers) {
                let p = remotePlayers[id];

                p.vx *= FRICTION;
                p.vy *= FRICTION;

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.x > canvas.width - p.radius * 2) { p.x = canvas.width - p.radius * 2; p.vx *= -1; }
                if (p.y > canvas.height - p.radius * 2) { p.y = canvas.height - p.radius * 2; p.vy *= -1; }
            }

            // collision
            for (let id in remotePlayers) {
                let p = remotePlayers[id];
                let dx = p.x - hostPlayer.x;
                let dy = p.y - hostPlayer.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 20) {
                    statusDiv.innerText = "Caught!";
                    gameRunning = false;
                    exitFullscreen();
                }
            }

            connections.forEach(c => {
                c.send({
                    type: 'SYNC',
                    host: hostPlayer,
                    remotes: remotePlayers
                });
            });

        } else {
            if (keys['ArrowUp']) me.vy -= ACCEL;
            if (keys['ArrowDown']) me.vy += ACCEL;
            if (keys['ArrowLeft']) me.vx -= ACCEL;
            if (keys['ArrowRight']) me.vx += ACCEL;

            me.vx *= FRICTION;
            me.vy *= FRICTION;

            me.x += me.vx;
            me.y += me.vy;

            // bounce
            if (me.x < 0) { me.x = 0; me.vx *= -1; }
            if (me.y < 0) { me.y = 0; me.vy *= -1; }
            if (me.x > canvas.width - me.radius * 2) { me.x = canvas.width - me.radius * 2; me.vx *= -1; }
            if (me.y > canvas.height - me.radius * 2) { me.y = canvas.height - me.radius * 2; me.vy *= -1; }

            if (myConn && myConn.open) {
                myConn.send({ type: 'POS', x: me.x, y: me.y });
            }
        }

        // interpolation
        hostPlayer.x += (hostPlayer.targetX - hostPlayer.x) * lerpAmount;
        hostPlayer.y += (hostPlayer.targetY - hostPlayer.y) * lerpAmount;

        me.x += (me.targetX - me.x) * lerpAmount;
        me.y += (me.targetY - me.y) * lerpAmount;
    }

    // ---------- DRAW ----------
    function draw() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // host square
        ctx.fillStyle = hostPlayer.color;
        ctx.fillRect(hostPlayer.x, hostPlayer.y, hostPlayer.size, hostPlayer.size);

        // client self
        ctx.beginPath();
        ctx.fillStyle = me.color;
        ctx.arc(me.x, me.y, me.radius, 0, Math.PI * 2);
        ctx.fill();

        // remote players
        for (let id in remotePlayers) {
            let p = remotePlayers[id];
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    loop();
};
