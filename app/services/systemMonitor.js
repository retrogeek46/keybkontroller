// const si = require("systeminformation");
const regedit = require("regedit");
const path = require("path");

const vbsDirectory = "./Resources/vbs";
regedit.setExternalVBSLocation(vbsDirectory);

exports.getSystemInfo = async () => {
    // TODO: check os before reading
    // logger.info("getting system data");
    const systemData = await regedit.promisified.list([
        "HKCU\\SOFTWARE\\HWiNFO64\\VSB",
    ]);
    return systemData;
};
