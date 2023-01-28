const constants = require("./constants");
const winston = require("winston");

const levels = {
    error: 0,
    info: 1,
    http: 2,
    debug: 3,
    sysinfo: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || "development";
    const isDevelopment = env === "development";
    return isDevelopment ? "debug" : "info";
};

const colors = {
    error: "red",
    warn: "yellow",
    sysinfo: "green",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: "DD-MMM-YYYY HH:mm:ss:ms" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

const transports = [
    new winston.transports.Console({ colors: colors }),
    new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
    }),
    new winston.transports.File({
        // filename: "logs/systemInfo.log",
        filename: constants.SYSINFO_PATH,
        level: "sysinfo",
    }),
    new winston.transports.File({
        filename: "logs/all.log",
        level: "info",
    }),
];

const logger = winston.createLogger({
    level: level(),
    levels,
    humanReadableUnhandledException: true,
    format,
    transports,
});

module.exports = logger;
