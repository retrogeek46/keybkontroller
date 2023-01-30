const { NativeImage } = require('electron');
const electron = require('electron');
const path = require("path");
const server = require("./server.js");
const keyboard = require("./services/keyboard.js");
const { app, BrowserWindow, Tray, Menu, dialog, clipboard, globalShortcut, ipcMain } = electron;
const logger = require("./utils/logger");
const utils = require("./utils/utils");
const spawn = require("child_process").spawn;
const kill = require("tree-kill");
const constants = require('./utils/constants.js');

let mainWindow;
let activeWinProcess;
let keebStateUI = false;

const createMainWindow = () => {
    let win = new BrowserWindow({
        width: 900,
        height: 480,
        icon: path.join(__dirname, "/Resources/cut-paper.png"),
        transparent: true,
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        autoHideMenuBar: true,
        center: true,
        thickFrame: true,
        backgroundColor: "#2e2c29",
    });
    
    win.loadFile(path.join(__dirname, 'static/index.html'))

    let tray = null;
    win.on('minimize', function (event) {
        event.preventDefault();
        win.hide();
        tray = createTray();
    });
    win.on('restore', function (event) {
        win.show();
        tray.destroy();
    });
    return win;
}

const createDrawWindow = (height, width) => {
    logger.info("Creating draw window");

    let win = new BrowserWindow({
        width: width,
        height: height,
        // icon: path.join(__dirname, "/Resources/cut-paper.png"),
        // transparent: true,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: "#2e2c29",
        opacity: 0.25
    });

    win.setIgnoreMouseEvents(true);
    win.setFocusable(false);

    return win
};

const sendEncoderStateChange = () => {
    // keyboard.updateKeyboard(1);
    const randomCharacter =
        constants.ALPHABET[Math.floor(Math.random() * constants.ALPHABET.length)];
    logger.info(randomCharacter);
    let aaa = []
    for (i = 0; i < 21; i++) {
        aaa.push('a');
    }
    aaa = [...aaa].map(i => i.charCodeAt(0));
    keyboard.updateKeyboard(6, aaa);
}

const getKeyboardState = () => {
    keyboard.getKeyboardState();
}

const resetKeyboard = () => {
    keyboard.resetKeyboard();
}

const updateCurrentOS = () => {
    keyboard.updateKeyboard(4, 1);
}

const attachKeyboardListener = async (retryCount=0) => {
    if (retryCount > 5) {
        logger.error("Retry count exceeded");
        return;
    }
    if (keebStateUI) {
        logger.error("Keyboard already connected");
        return;
    }
    let keyboardObj = keyboard.getKeyboard();
    if (keyboardObj) {
        logger.info("Attaching keyboard UI listener");
        keebStateUI = true;
        keyboardObj.on("data", (val) => {
            if (val[0] == 23) {
                mainWindow.webContents.send("updateKeyboardState", {
                    "encoderState": val[1],
                    "layerState": val[2],
                    "currentOS": val[3]
                });
            }
        });
    } else {
        logger.info("Keyboard not initialized yet, retrying after 5 seconds");
        await new Promise(resolve => setTimeout(resolve, constants.KEYBOARD_ATTACH_DELAY));
        attachKeyboardListener(retryCount + 1);
    }
};

const createTray = async () => {
    let appIcon = new Tray(path.join(__dirname, "/Resources/cut-paper.png"));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Send Snippet",
            click: function () {
                sendSnip();
            },
        },
        {
            label: "Show Draw Window",
            click: function () {
                createDrawWindow();
            },
        },
        {
            label: "Start sending System Info",
            click: async function () {
                await server.startSystemInfoTimer();
            },
        },
        {
            label: "Stop sending System Info",
            click: function () {
                server.stopSystemInfoTimer();
            },
        },
        {
            label: "Exit",
            click: function () {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);
    appIcon.on('double-click', (event) => {
        mainWindow.show();
    });
    appIcon.setToolTip('SnipShare');
    appIcon.setContextMenu(contextMenu);
    return appIcon;
}

const spawnActiveWinProcess = () => {
    // TODO: add check for os, spawn correct process etc based on os
    // TODO: pass app port to spawned process
    // activeWinProcess = spawn('cd E:/Coding/C#/ActiveWinTest && dotnet run Program.cs', { shell: true })
    logger.info("spawning activeWinTest");
    activeWinProcess = spawn(
        path.join(__dirname, "Resources/publish/ActiveWinTest.exe 3456"),
        { shell: true }
    );
}

const killActiveWinProcess = () => {
    if (activeWinProcess != null) {
        kill(activeWinProcess.pid);
        logger.info("Killed active win process");
    }
}

const updateVersionServerIP = async () => {
    await new Promise(resolve => setTimeout(resolve, constants.UI_UPDATE_TIMEOUT));
    mainWindow.webContents.send("updateVersionServerIP", [
        app.getVersion(),
        server.getServerIP(),
    ]);
};

app.on('ready', async () => {
    utils.clearLogs(app.getAppPath());
    await server.server(this);
    await server.startSystemInfoTimer();

    // TODO: handle active win so that it is optional based on os
    // spawnActiveWinProcess();
    attachKeyboardListener();
    
    const qmkGetKeyboardState = globalShortcut.register(
        "Ctrl+Alt+-",
        () => {
            attachKeyboardListener();
        }
    );
    const killActiveWinProcessRegister = globalShortcut.register(
        "Ctrl+Alt+0",
        () => {
            killActiveWinProcess();
        }
    );
    const sendSnipRegister = globalShortcut.register(
        "Ctrl+Alt+9",
        () => {
            sendSnip();
        }
    );
    const qmkUpdateEncoderRegister = globalShortcut.register(
        "Ctrl+Alt+8",
        async () => {
            sendEncoderStateChange();
        }
    );
    const qmkGetEncoderRegister = globalShortcut.register(
        "Ctrl+Alt+7",
        async () => {
            // getEncoderState();
            resetKeyboard();
        }
    );
    const startSystemInfoTimer = globalShortcut.register(
        "Ctrl+Alt+6",
        async () => {
            await server.startSystemInfoTimer();
        }
    );
    const stopSystemInfoTimer = globalShortcut.register(
        "Ctrl+Alt+5",
        async () => {
            sendEncoderStateChange();
        }
    );
    mainWindow = createMainWindow();
    mainWindow.webContents.openDevTools();
    await updateVersionServerIP();
    
    // mainWindow.minimize();

    // const nodeAbi = require("node-abi");
    // logger.info(nodeAbi.getAbi("14.16.1", "node"));
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    killActiveWinProcess();
})

ipcMain.on("applyKeyboardRGB", (event, message) => {
    keyboard.updateKeyboard(5, [message["r"], message["g"], message["b"]]);
});

exports.initDrawWindow = (height, width) => {
    logger.info(`height is ${height}, width is ${width}`);
    createDrawWindow(height, width);
};

exports.updateCurrentOS = (currentOS) => {
    mainWindow.webContents.send("updateCurrentOS", currentOS);
};
