const fs = require("fs");
const path = require("path");
const logger = require("./logger");
const constants = require("./constants");

exports.clearLogs = (rootPath) => {
    const logPath = path.join(rootPath, constants.SYSINFO_PATH);
    try {
        fs.unlinkSync(logPath);
    }
    catch (ex) {
        logger.error(ex);
    }   
}

