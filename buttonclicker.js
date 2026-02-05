// ======= GLOBAL VARIABLES =======
        let clicks = 0;
        let clicksPerpress = 1;
        let CpCprice = 10;
        let clicksPerSecond = 0;
        let cpsPrice = 25;
        let clickesSinceStarted = 0;

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
            if (num >= 1e21)  return (num / 1e21).toFixed(1) + " Sextillion";
            if (num >= 1e18)  return (num / 1e18).toFixed(1) + " Quintillion";
            if (num >= 1e15)  return (num / 1e15).toFixed(1) + " Quadrillion";
            if (num >= 1e12) return (num / 1e12).toFixed(1) + " Trillion";
            if (num >= 1e9)  return (num / 1e9).toFixed(1) + " Billion";
            if (num >= 1e6)  return (num / 1e6).toFixed(1) + " Million";
            if (num >= 1e3)  return (num / 1e3).toFixed(1) + " Thousand";
            return num;
        }

        // ======= INITIALIZATION =======
        function startClicks() {
            // Cache DOM elements
            x2CpcButton = document.getElementById("x2ClicksPerClick");
            cpsButton = document.getElementById("cpsUpgrade");
            mainMenu = document.getElementById("mainMenu");
            settingsMenu = document.getElementById("settingsMenu");
            clickesSinceStarted = document.getElementById("clickesSinceStarted");

            // Hide upgrades and settings initially
            x2CpcButton.style.display = "none";
            cpsButton.style.display = "none";
            settingsMenu.style.display = "none";

            // Show starting values
            updateDisplay();

            // Load save + offline progress
            loadGame();

            // Start CPS interval + autosave
            setInterval(() => {
                clicks += clicksPerSecond;
                updateDisplay();
                showUpgradeButtons();
                saveGame(); // autosave
            }, 1000);
        }

        // ======= BUTTON FUNCTIONS =======
        function buttonPressed() {
            clicks += clicksPerpress;
            updateDisplay();
            showUpgradeButtons();
        }

        function Cpcbutton() {
            if (clicks >= CpCprice) {
                clicksPerpress *= 2;
                CpCprice *= 2;
                updateDisplay();
                showUpgradeButtons();
            }
        }

        function buyCps() {
            if (clicks >= cpsPrice) {
                clicksPerSecond = clicksPerSecond === 0 ? 2 : clicksPerSecond * 2;
                cpsPrice *= 2;
                updateDisplay();
                showUpgradeButtons();
            }
        }

        // ======= MENU FUNCTIONS =======
        function settingsMenuf() {
            mainMenu.style.display = "none";
            settingsMenu.style.display = "block";
        }

        function mainMenuf() {
            settingsMenu.style.display = "none";
            mainMenu.style.display = "block";
        }

        function deleteSave() {
            clicks = 0;
            clicksPerpress = 1;
            CpCprice = 10;
            clicksPerSecond = 0;
            cpsPrice = 25;
            alert("Save Deleted")
            }

        // ======= DISPLAY HELPERS =======
function updateDisplay() {
    document.getElementById("clicksHTMLDomText").innerHTML = "Clicks: " + formatNumber(clicks);
    document.getElementById("cpc").innerHTML = 
        "Clicks Per Click: " + formatNumber(clicksPerpress) + " (Cost: " + formatNumber(CpCprice) + ")";
    document.getElementById("cpsText").innerHTML = 
        "Clicks Per Second: " + formatNumber(clicksPerSecond) + " (Cost: " + formatNumber(cpsPrice) + ")";
    document.getElementById("clickesSinceStarted").innerHTML = "Clicks since started: " + "Coming Soon!";
}


        function showUpgradeButtons() {
            x2CpcButton.style.display = (clicks >= CpCprice) ? "block" : "none";
            cpsButton.style.display = (clicks >= cpsPrice) ? "block" : "none";
        }

        // ======= SAVE / LOAD =======
        function saveGame() {
            const saveData = {
                clicks,
                clicksPerpress,
                clicksPerSecond,
                CpCprice,
                cpsPrice,
                lastSave: Date.now()
            };
            localStorage.setItem("save", JSON.stringify(saveData));
        }

        function loadGame() {
            const saveString = localStorage.getItem("save");
            if (!saveString) return;

            const save = JSON.parse(saveString);

            clicks = save.clicks;
            clicksPerpress = save.clicksPerpress;
            clicksPerSecond = save.clicksPerSecond;
            CpCprice = save.CpCprice;
            cpsPrice = save.cpsPrice;

            let secondsOffline = Math.floor((Date.now() - save.lastSave) / 1000);
            secondsOffline = Math.min(secondsOffline, 86400);

            let offlineEarnings = secondsOffline * clicksPerSecond / 2;
            if (offlineEarnings > 0) {
                clicks += offlineEarnings;
                alert(`While you were away for ${formatNumber(secondsOffline)} seconds, you earned ${formatNumber(offlineEarnings)} clicks!`);
            }

            updateDisplay();
        }
        // Download current save as a JSON file
// Download current save as JSON
function downloadSave() {
    const saveString = localStorage.getItem("save");
    if (!saveString) {
        alert("No save to download!");
        return;
    }

    const blob = new Blob([saveString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "clicker_save.json";
    a.click();

    URL.revokeObjectURL(url);
}

// Upload a save file
function uploadSave(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const save = JSON.parse(e.target.result);

            // Optional: validate save structure
            if (!("clicks" in save) || !("clicksPerpress" in save) || !("clicksPerSecond" in save)) {
                alert("Invalid save file!");
                return;
            }

            // Save to localStorage and load
            localStorage.setItem("save", JSON.stringify(save));
            loadGame(); // reload into game
            alert("Save successfully uploaded!");
        } catch (err) {
            alert("Error reading save file!");
        }
    };
    reader.readAsText(file);
}
