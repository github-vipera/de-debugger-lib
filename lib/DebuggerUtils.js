"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DebuggerUtils = (function () {
    function DebuggerUtils() {
    }
    DebuggerUtils.atob = function (text) {
        return new Buffer(text, 'base64').toString('binary');
    };
    ;
    DebuggerUtils.getObjectFromString = function (str) {
        return JSON.parse(str);
    };
    DebuggerUtils.tryAdbForward = function (packageName) {
        return new Promise(function (resolve, reject) {
        });
    };
    return DebuggerUtils;
}());
exports.DebuggerUtils = DebuggerUtils;
//# sourceMappingURL=DebuggerUtils.js.map