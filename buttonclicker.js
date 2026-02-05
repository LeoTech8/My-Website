// ======= GLOBAL VARIABLES =======
let clicks = 0;
let clicksPerpress = 1;
let CpCprice = 10;
let clicksPerSecond = 0;
let cpsPrice = 25;

// STOCK VARIABLES
let stockPrice = 100;
let stockHistory = [stockPrice];
let sharesOwned = 0;

// DOM CACHES
let x2CpcButton;
let cpsButton;
let mainMenu;
let settingsMenu;

// ======= NUMBER FORMAT FUNCTION =======
function formatNumber(num) {
    if (num >= 1e42) return (num / 1e42).toFixed(1) + " Tredecillion";
    if (num >= 1e39) return (num / 1e39).toFixed(1) + " Duodecillion";
    if (num >= 1e36) return (num / 1e36).toFixed(1) + " Undecillion";
    if (num >= 1e33) return (num / 1e33).toFixed(1) + " Decillion";
    if (num >= 1e30) return (num / 1e30).toFixed(1) + " Nonillion";
    if (num >= 1e27) return (num / 1e27).toFixed(1) + " Octillion";
    if (num >= 1e24) return (num / 1e24).toFixed(1) + " Septillion";
    if (num >= 1e21) return (num / 1e21).toFixed(1) + " Sextillion";
    if (num >= 1e18) return (num / 1e18).toFixed(1) + " Quintillion";
    if (num >= 1e15) return (num / 1e15).toFixed(1) + " Quadrillion";
    if (num >= 1e12) return (num / 1e12).toFixed(1) + " Trillion";
    if (num >= 1e9) return (num / 1e9).toFixed(1) + " Billion";
    if (num >= 1e6) return (num / 1e6).toFixed(1) + " Million";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + " Thousand";
    return Math.floor(num);
}

// ======= INITIALIZATION =======
function startClicks() {
    x2CpcButton = document.getElementById("x2ClicksPerClick");
    cpsButton = document.getElementById("cpsUpgrade");
    mainMenu = document.getElementById("mainMenu");
    settingsMenu = document.getElementById("settingsMenu");

    x2CpcButton.style.display = "none";
    cpsButton.style.display = "none";
    settingsMenu.style.display = "none";

    loadGame();
    updateDisplay();
    updateStockDisplay();
    drawStockGraph();

    // CPS LOOP
    setInterval(() => {
        clicks += clicksPerSecond;
        updateDisplay();
        showUpgradeButtons();
        saveGame();
    }, 1000);

    // STOCK LOOP
    setInterval(updateStock, 2000);
}

// ======= CLICKER BUTTONS =======
function buttonPressed() {
    clicks += clicksPerpress;
    updateDisplay();
    showUpgradeButtons();
}

function Cpcbutton() {
    if (clicks >= CpCprice) {
        clicks -= CpCprice;
        clicksPerpress *= 2;
        CpCprice *= 2;
        updateDisplay();
        showUpgradeButtons();
    }
}

function buyCps() {
    if (clicks >= cpsPrice) {
        clicks -= cpsPrice;
        clicksPerSecond = clicksPerSecond === 0 ? 2 : clicksPerSecond * 2;
        cpsPrice *= 2;
        updateDisplay();
        showUpgradeButtons();
    }
}

// ======= STOCK LOGIC =======
function updateStock() {
    let changePercent = (Math.random() * 2) - 1; // -1% to +1%
    stockPrice += stockPrice * (changePercent / 100);
    stockPrice = Math.max(1, Math.round(stockPrice));

    stockHistory.push(stockPrice);
    if (stockHistory.length > 50) stockHistory.shift();

    updateStockDisplay();
    drawStockGraph();
}

function buyStock(amount) {
    let cost = stockPrice * amount;
    if (clicks >= cost) {
        clicks -= cost;
        sharesOwned += amount;
        updateDisplay();
        updateStockDisplay();
    } else alert("Not enough clicks!");
}

function sellStock(amount) {
    if (sharesOwned >= amount) {
        sharesOwned -= amount;
        clicks += stockPrice * amount;
        updateDisplay();
        updateStockDisplay();
    } else alert("Not enough shares!");
}

// ======= DISPLAY =======
function updateDisplay() {
    document.getElementById("clicksHTMLDomText").innerText =
        "Clicks: " + formatNumber(clicks);
    document.getElementById("cpc").innerText =
        "Clicks Per Click: " + formatNumber(clicksPerpress) + " (Cost: " + formatNumber(CpCprice) + ")";
    document.getElementById("cpsText").innerText =
        "Clicks Per Second: " + formatNumber(clicksPerSecond) + " (Cost: " + formatNumber(cpsPrice) + ")";
}

function updateStockDisplay() {
    document.getElementById("stockPriceText").innerText =
        "Stock Price: " + formatNumber(stockPrice) + " clicks";
    document.getElementById("sharesText").innerText =
        "Shares Owned: " + formatNumber(sharesOwned);
}

function showUpgradeButtons() {
    x2CpcButton.style.display = clicks >= CpCprice ? "block" : "none";
    cpsButton.style.display = clicks >= cpsPrice ? "block" : "none";
}

// ======= STOCK GRAPH =======
function drawStockGraph() {
    const canvas = document.getElementById("stockGraph");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const max = Math.max(...stockHistory);
    const min = Math.min(...stockHistory);
    const range = max - min || 1;

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    stockHistory.forEach((price, i) => {
        const x = (i / (stockHistory.length - 1)) * canvas.width;
        const y = canvas.height - ((price - min) / range) * canvas.height;
        ctx.lineTo(x, y);
    });

    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ======= SAVE / LOAD =======
function saveGame() {
    const saveData = { clicks, clicksPerpress, clicksPerSecond, CpCprice, cpsPrice, stockPrice, stockHistory, sharesOwned, lastSave: Date.now() };
    localStorage.setItem("save", JSON.stringify(saveData));
}

function loadGame() {
    const save = JSON.parse(localStorage.getItem("save") || "{}");
    clicks = save.clicks ?? clicks;
    clicksPerpress = save.clicksPerpress ?? clicksPerpress;
    clicksPerSecond = save.clicksPerSecond ?? clicksPerSecond;
    CpCprice = save.CpCprice ?? CpCprice;
    cpsPrice = save.cpsPrice ?? cpsPrice;
    stockPrice = save.stockPrice ?? stockPrice;
    stockHistory = save.stockHistory ?? stockHistory;
    sharesOwned = save.sharesOwned ?? sharesOwned;

    const secondsOffline = Math.min(Math.floor((Date.now() - (save.lastSave || Date.now())) / 1000), 86400);
    clicks += secondsOffline * clicksPerSecond;
}

// ======= SETTINGS MENU =======
function settingsMenuf() {
    mainMenu.style.display = "none";
    settingsMenu.style.display = "block";
}

function mainMenuf() {
    settingsMenu.style.display = "none";
    mainMenu.style.display = "block";
}

// ======= SAVE FILE FUNCTIONS =======
function deleteSave() {
    localStorage.removeItem("save");
    alert("Save deleted!");
}

function downloadSave() {
    const saveData = localStorage.getItem("save");
    if (!saveData) return alert("No save found!");
    const blob = new Blob([saveData], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clicker_save.json";
    a.click();
}

function uploadSave(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage.setItem("save", e.target.result);
        loadGame();
        updateDisplay();
        updateStockDisplay();
        drawStockGraph();
        alert("Save uploaded!");
    };
    reader.readAsText(file);
}
