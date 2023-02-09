const { networkInterfaces } = require("os");
const express = require("express");
const cors = require("cors");
const http = require("http");
const fs = require("fs");
const app = express();
const nativeImage = require("electron").nativeImage;
const systemInfo = require("./services/systemMonitor.js");
const keyboardQmk = require("./services/keyboard.js");
const logger = require("./utils/logger");
const constants = require("./utils/constants");
const helmet = require("helmet");
const compression = require("compression");

app.use(cors());
app.use(express.json({ limit: "50mb", extended: true }));
app.use(
    express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
app.use(helmet());
app.use(compression());

app.set("json spaces", 4);

const key = fs.readFileSync(__dirname + "/../ssl_cert/key.pem");
const cert = fs.readFileSync(__dirname + "/../ssl_cert/cert.pem");
const options = {
    key: key,
    cert: cert,
};

const systemInfoInterval = constants.SYSTEM_INFO_INTERVAL;
let systemInfoTimer = null;

Date.prototype.toShortFormat = function () {
    const monthNames = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
    ];

    const day = this.getDate();
    const monthIndex = this.getMonth();
    const monthName = monthNames[monthIndex];
    const year = this.getFullYear().toString().substring(2);

    return `${day}-${monthName}-${year}`;
};

const server = async (electronObj) => {
    // const server = https.createServer(options, app);
    const server = http.createServer(app);
    const socket = require("socket.io");
    const io = socket(server, {
        cors: {
            origin: "https://localhost:3444",
            methods: ["GET", "POST"],
        },
    });
    let currentBarrierOS = constants.OS.WINDOWS;

    exports.startSystemInfoTimer = async () => {
        logger.info("Starting system info timer");
        systemInfoTimer = setInterval(async () => {
            const systemData = await systemInfo.getSystemInfo();
            // logger.info(systemData);
            const systemInfoValues =
                systemData["HKCU\\SOFTWARE\\HWiNFO64\\VSB"]["values"];
            // logger.info(systemData["HKCU\\SOFTWARE\\HWiNFO64\\VSB"]);

            let cpuVoltage = systemInfoValues["Value2"]["value"];
            let cpuTempRaw = systemInfoValues["ValueRaw4"]["value"];
            let cpuUsageRaw = systemInfoValues["ValueRaw3"]["value"];
            let cpuTemp = cpuTempRaw.toString() + "C";
            let cpuUsage = cpuUsageRaw.toString() + "%";
            // if (Number(cpuTempRaw) > 60) {
            //     keyboardQmk.updateKeyboard(3);
            // } else {
            //     keyboardQmk.updateKeyboard(4);
            // }
            // XXX: stop sending cpu data to keyboard till rgb/oled is added to keeb
            // keyboardQmk.updateKeyboard(3, parseInt(cpuUsageRaw));
            keyboardQmk.updateKeyboard(2);
            keyboardQmk.updateKeyboard(8, formatDateTime());
            // let cpuVoltage = systemInfoValues["Value2"]["value"];
            const msg = `CPU Temp: ${cpuTemp}, CPU Voltage: ${cpuVoltage}, CPU Usage: ${cpuUsage}`;
            // logger.sysinfo(msg);
            this.emitMessage("systemInfo", msg);
        }, systemInfoInterval);
    };

    exports.stopSystemInfoTimer = () => {
        logger.info("Stopping system info timer");
        clearInterval(systemInfoTimer);
    };

    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/static/keybKontroller.html");
    });

    app.get("/connect", (req, res) => {
        res.send("hi");
    });

    app.post("/updateCurrentWindow", (req, res) => {
        const windowTitle = req.body.windowTitle;
        if (windowTitle == "BarrierDesk" && currentBarrierOS == "windows") {
            currentBarrierOS = "macos"
            logger.info("updating keyboard layer, switching to mac");
            keyboardQmk.updateKeyboard(4, 1);
            electronObj.updateCurrentOS(currentBarrierOS)
        } else if (currentBarrierOS == "macos") {
            currentBarrierOS = "windows";
            logger.info("updating keyboard layer, switching to windows");
            keyboardQmk.updateKeyboard(4, 0);
            electronObj.updateCurrentOS(currentBarrierOS);
        }
        res.send("received");
    });

    app.post("/updateCurrentMedia", (req, res) => {
        const currentMediaTitle = req.body.currentMediaTitle.toUpperCase().replace(/[^A-Z ]/g, "");
        const currentArtist = req.body.currentArtist.toUpperCase().replace(/[^A-Z ]/g, "");
        // console.log(currentArtist);
        const [mediaTitleArray, mediaArtistArray] = formatMediaInfo(
            currentMediaTitle,
            currentArtist
        );
        keyboardQmk.updateKeyboard(6, mediaTitleArray);
        keyboardQmk.updateKeyboard(7, mediaArtistArray);
        res.send("received");
    });

    app.post("/debugActiveWin", (req, res) => {
        logger.info("Received args " + req.body.message);
    })

    const formatMediaInfo = (currentMediaTitle, currentArtist) => {
        // remove artist name from title
        currentMediaTitle = currentMediaTitle.replace(currentArtist, "");
        currentMediaTitle = currentMediaTitle.trim();
        let mediaTitleArray = [...currentMediaTitle].map(i => constants.CHAR_TO_CODE_MAPPING[i]);
        mediaTitleArray = mediaTitleArray.slice(0, 21);
        
        let mediaArtistArray = [...currentArtist].map((i) => constants.CHAR_TO_CODE_MAPPING[i]);
        mediaArtistArray = mediaArtistArray.slice(0, 21);

        return [mediaTitleArray, mediaArtistArray]
    }

    const formatDateTime = () => {
        let now = new Date();
        let hours = now.getHours() > 9 ? now.getHours() : "0" + now.getHours();
        let minutes = now.getMinutes() > 9 ? now.getMinutes() : "0" + now.getMinutes();
        let seconds = now.getSeconds() > 9 ? now.getSeconds() : "0" + now.getSeconds();
        let formattedDate = now.toShortFormat() + ` ${hours}:${minutes}:${seconds}`;
        let formattedDateArray = [...formattedDate].map(i => constants.CHAR_TO_CODE_MAPPING[i]);
        return formattedDateArray;
    }

    exports.emitMessage = (tag, message) => {
        io.emit(tag, message);
    };

    // TODO: remove port hardcoding
    const port = constants.PORT;

    exports.getServerIP = () => {
        try {
            const nets = networkInterfaces();
            const results = Object.create(null); // Or just '{}', an empty object

            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                    if (net.family === "IPv4" && !net.internal) {
                        if (!results[name]) {
                            results[name] = [];
                        }
                        results[name].push(net.address);
                    }
                }
            }
            // logger.info(results);
            if (!("Ethernet" in results)) {
                // logger.info(results[0][0]);
                return (
                    results["vEthernet (New Virtual Switch)"][0] +
                    ":" +
                    String(port)
                );
            }
            return results["Ethernet"][0] + ":" + String(port);
        } catch (ex) {
            logger.error(ex);
            return "";
        }
    };

    server.listen(port, () => {
        logger.info("listening on " + this.getServerIP());
    });
};

module.exports.server = server;
