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

    io.on("connection", async (socket) => {
        socket.on("disconnect", (msg) => {
            logger.error(socket.id + " disconnected due to " + msg);
        });
        socket.on("connected", (msg) => {
            logger.error(`got ${msg}, client connected`);
        });
        socket.on("fromWeb", (msg) => {
            // create native image from buffer
            let img = nativeImage.createFromDataURL(msg);
            this.emitMessage("snipShare", img.toDataURL());
        });
        socket.on("fromAndroid", async (msg) => {
            // create native image from buffer
            logger.info(`got ${msg}`);
            await keyboard.type(Key[Number(msg)]);
        });
        socket.on("startDraw", async (msg) => {
            logger.info(msg);
            const height = msg.split("|")[0];
            const width = msg.split("|")[1];
            electronObj.initDrawWindow(height, width);
        });
        socket.on("draw", async (msg) => {
            // logger.info(msg);
            let currentPos = await mouse.getPosition();
            const x = currentPos.x - parseFloat(msg.split("|")[0]);
            const y = currentPos.y - parseFloat(msg.split("|")[1]);
            // logger.info(`x: ${x}, y: ${y}`);
            // await mouse.move([new Point(x, y)]);
            await mouse.drag([new Point(x, y)]);
            // electronObj.testMethod(`x: ${x}, y: ${y}`)
        });
        // socket.onAny(async (event, ...args) => {
        //     logger.info(`got ${event}`);
        //     // await mouse.move(right(500));
        // });
    });

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

    // exports.startSystemInfoTimer = async () => {
    //     const systemData = await systemInfo.getSystemInfo();
    //     // logger.info(systemData);
    //     const systemInfoValues = systemData["HKCU\\SOFTWARE\\HWiNFO64\\VSB"]["values"];
    //     const msg = `CPU Voltage: ${systemInfoValues["Value2"]["value"]}`;
    //     logger.info(msg);
    //     this.emitMessage("systemInfo", msg);
    // };

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
        const currentMediaTitle = req.body.currentMediaTitle.toLowerCase().replace(/[^a-z ]/g, "");
        const currentArtist = req.body.currentArtist.toLowerCase().replace(/[^a-z ]/g, "");
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
        let mediaTitleArray = [...currentMediaTitle].map(i => i.charCodeAt(0));
        mediaTitleArray = mediaTitleArray.slice(0, 21);
        
        let mediaArtistArray = [...currentArtist].map((i) => i.charCodeAt(0));
        mediaArtistArray = mediaArtistArray.slice(0, 21);

        return [mediaTitleArray, mediaArtistArray]
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
