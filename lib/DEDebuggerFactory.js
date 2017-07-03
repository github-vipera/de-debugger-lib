"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DEDebuggerImpl_1 = require("./DEDebuggerImpl");
/**
 * Created by enrico on 02/07/17.
 */
var DEDebuggerFactory = (function () {
    function DEDebuggerFactory() {
    }
    DEDebuggerFactory.createDefault = function () {
        return new DEDebuggerImpl_1.DEDebuggerImpl();
    };
    return DEDebuggerFactory;
}());
exports.DEDebuggerFactory = DEDebuggerFactory;
//# sourceMappingURL=DEDebuggerFactory.js.map