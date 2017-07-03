"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by enrico on 30/06/17.
 */
//noinspection TypeScriptCheckImport
var child_process_1 = require("child_process");
var ADBUtils = (function () {
    function ADBUtils() {
    }
    ADBUtils.getPidByPackageName = function (packageName) {
        return new Promise(function (resolve, reject) {
            child_process_1.exec('adb shell pidof ' + packageName, function (err, stdout, stderr) {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                try {
                    var pid = parseInt(stdout.toString()).toString();
                    resolve({ pid: pid });
                }
                catch (ex) {
                    reject(ex);
                    return;
                }
            });
        });
    };
    ADBUtils.adbForwardForWebviewByPid = function (pid) {
        return new Promise(function (resolve, reject) {
            child_process_1.exec('adb forward tcp:9222 localabstract:webview_devtools_remote_' + pid, function (err, stdout, stderr) {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    };
    ADBUtils.forwardForWebviewByPackageName = function (packageName) {
        return new Promise(function (resolve, reject) {
            ADBUtils.getPidByPackageName(packageName).then(function (res) {
                ADBUtils.adbForwardForWebviewByPid(res.pid).then(resolve, reject);
            }, reject);
        });
    };
    return ADBUtils;
}());
exports.ADBUtils = ADBUtils;
//# sourceMappingURL=ADBUtils.js.map