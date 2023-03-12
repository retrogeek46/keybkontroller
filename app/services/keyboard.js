const hid = require("node-hid");
const logger = require("../utils/logger");

// const KEYBOARD_NAME = "GMMK Pro ANSI";
// const KEYBOARD_USAGE_PAGE = 65376;
// const KEYBOARD_USAGE_ID = 97;
// const KEYBOARD_UPDATE_TIME = 1000;

// const KEYBOARD_NAME = "zoom65";
// const KEYBOARD_USAGE_PAGE = 65376;
// const KEYBOARD_USAGE_ID = 97;
// const KEYBOARD_UPDATE_TIME = 1000;

const KEYBOARD_NAME = "Corne";
const KEYBOARD_USAGE_PAGE = 65376;
const KEYBOARD_USAGE_ID = 97;
const KEYBOARD_UPDATE_TIME = 1000;

let keyboard = null;
let dataListenerAttached = false

const connectKeyboard = () => {
    if (!keyboard) {
        const devices = hid.devices();
        // logger.info(devices);
        for (const d of devices) {
            if (
                d.product === KEYBOARD_NAME &&
                d.usage === KEYBOARD_USAGE_ID &&
                d.usagePage === KEYBOARD_USAGE_PAGE
            ) {
                keyboard = new hid.HID(d.path);
                logger.info("Keyboard connected");
                break;
            }
        }
    }
};

const attachDataListener = () => {
    logger.info("attaching data listener");
    keyboard.on("data", (val) => {
        if (val[0] == 23) {
            let encoderState = val[1];
            let layerState = val[2];
            let currentOS = val[3];
            logger.info(
                `Received data, encoder: ${encoderState}, layer: ${layerState}, OS: ${currentOS}`
            );
        }
    });
    dataListenerAttached = true;
}

const attachErrorListener = () => {
    keyboard.on("error", (val) => {
        logger.info(val[0] + " " + new Date());
    });
    errorListenerAttached = true;
};

/*
1 update_encoder_state
2 send_encoder_state
3 set_cpu_usage_rgb
4 update_os_state
5 test_rgb_value 
6 media title
7 media artist
8 clock
*/
exports.updateKeyboard = (value, extraValues=0) => {
    try {
        if (!keyboard) {
            connectKeyboard();
        }
        if (extraValues == null) {
            extraValues = 0
        }
        if (typeof extraValues === "object") {
            let data_sent = [1, 10, value].concat(extraValues);
            keyboard.write(data_sent);
        } else {
            keyboard.write([1, 10, value, extraValues]);
        }
        return 1;   
    } catch (ex) {
        logger.error("Error in update keyboard \n" + value + ", " + extraValues + "\n" + ex.toString());
        this.resetKeyboard();
        return 0;
    }
}

exports.getKeyboard = () => {
    return keyboard;
}

exports.resetKeyboard = () => {
    logger.info("reset keyboard connection");
    keyboard = null;
}
