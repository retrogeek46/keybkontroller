const systemInfo = require("../services/systemMonitor.js");
const C = require("../utils/constants.js");
const { remote, ipcRenderer } = require("electron");

let cpuVoltage = "";
let cpuTempRaw = "";
let cpuUsageRaw = "";
let cpuTemp = "";
let cpuUsage = "";

const versionPara = document.getElementById("versionPara");
const ipAddressPara = document.getElementById("ipAddressPara");
const cpuParamsPara = document.getElementById("cpuParamsPara");
const keyboardParamsPara = document.getElementById("keyboardParamsPara");
const currentOSPara = document.getElementById("currentOS");
const currentMediaPara = document.getElementById("currentMedia");
const rgbBoxPara = document.getElementById("rgbBox");

let serverIPText = "";
let appVersionText = "";

const startSystemInfoUITimer = async () => {
    systemInfoUITimer = setInterval(async () => {
        const systemData = await systemInfo.getSystemInfo();
        const systemInfoValues = systemData["HKCU\\SOFTWARE\\HWiNFO64\\VSB"]["values"];

        cpuVoltage = systemInfoValues["Value2"]["value"];
        cpuTempRaw = systemInfoValues["ValueRaw4"]["value"];
        cpuUsageRaw = systemInfoValues["ValueRaw3"]["value"];
        cpuTemp = cpuTempRaw.toString() + "C";
        cpuUsage = cpuUsageRaw.toString() + "%";

        cpuParamsPara.innerHTML = `CPU<br>Temp: ${cpuTemp} &nbsp;&nbsp; Voltage: ${cpuVoltage} &nbsp;&nbsp; Usage: ${cpuUsage}`;

    }, C.SYSTEM_INFO_INTERVAL);
};

const stopSystemInfoUITimer = () => {
    console.log("Stopping system info UI timer");
    clearInterval(systemInfoUITimer);
};

const applyKeyboardRGB = (event) => {
    // event.preventDefault();
    let rValue = document.getElementById("rValue").value;
    let gValue = document.getElementById("gValue").value;
    let bValue = document.getElementById("bValue").value;
    console.log(
        `Func called after button press with values rgb(${rValue}, ${gValue}, ${bValue})`
    );
    rgbBoxPara.style.backgroundColor = `rgb(${rValue}, ${gValue}, ${bValue})`;
    // ipcRenderer.send("applyKeyboardRGB", "message");
    ipcRenderer.send("applyKeyboardRGB", {
        'r': parseInt(rValue),
        'g': parseInt(gValue),
        'b': parseInt(bValue)
    })
}

ipcRenderer.on("updateVersionServerIP", (event, [version, serverIP]) => {
    serverIPText = serverIP;
    versionText = version;

    versionPara.innerText = "Current Version: " + appVersionText;
    ipAddressPara.innerText = serverIPText != ""
        ? "The webpage is hosted at " + serverIP
        : "Cannot get serverIP";
});

ipcRenderer.on("updateCurrentOS", (event, currentOS) => {
    currentOSPara.innerHTML = "Current OS: " + currentOS;
});

ipcRenderer.on("updateCurrentKeyboard", (event, currentKeyboard) => {
    currentKeyboardPara.innerHTML = "Current Keyboard: " + currentKeyboard;
});

ipcRenderer.on("updateKeyboardState", (event, keebState) => {
    keyboardParamsPara.innerHTML = `Keyboard<br>Encoder: ${C.ENCODER_STATES[keebState["encoderState"]]} &nbsp;&nbsp; Layer: ${C.KEEB_LAYERS[keebState["layerState"]]} &nbsp;&nbsp; OS: ${C.OS_STATES[keebState["currentOS"]]}`;
});

ipcRenderer.on("updateCurrentMedia", (event, mediaTitle, mediaArtist) => {
    currentMediaPara.innerHTML = "Playing '" + mediaTitle + "' by " + mediaArtist;
});



