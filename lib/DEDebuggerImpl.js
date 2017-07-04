"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var DebuggerUtils_1 = require("./DebuggerUtils");
//noinspection TypeScriptCheckImport
var events_1 = require("events");
//noinspection TypeScriptCheckImport
var path_1 = require("path");
//noinspection TypeScriptCheckImport
var url_1 = require("url");
//noinspection TypeScriptCheckImport
var fs_1 = require("fs");
//noinspection TypeScriptCheckImport
var http_1 = require("http");
//noinspection TypeScriptCheckImport
var https_1 = require("https");
//noinspection TypeScriptCheckImport
var lodash_1 = require("lodash");
//noinspection TypeScriptUnresolvedFunction
var SourceMapConsumer = require('source-map').SourceMapConsumer;
//import * as CDP from 'chrome-remote-interface'
var CDP = require('chrome-remote-interface');
var DEDebuggerImpl = (function () {
    function DEDebuggerImpl() {
        this.client = null;
        this.breakpoints = [];
        this.scripts = [];
        this.callFrames = [];
        this.events = new events_1.EventEmitter();
        this.attached = false;
        this.paused = false;
        this.client = null;
    }
    DEDebuggerImpl.prototype.activate = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            CDP().then(function (client) {
                _this.client = client;
                //resolve(client);
                Promise.all([
                    _this.client.Network.enable(),
                    _this.client.Page.enable(),
                    _this.client.Runtime.enable(),
                ]).then(resolve, reject);
            }, function (err) {
                reject(err);
            });
        });
    };
    DEDebuggerImpl.prototype.list = function () {
        return new Promise(function (resolve, reject) {
            CDP.List(function (err, data) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    };
    DEDebuggerImpl.prototype.attach = function (targetId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            CDP.Activate({ 'id': targetId }).then(function (err, data) {
                if (err) {
                    reject(err);
                    return;
                }
                _this.initBaseEvents();
                _this.setUpDebuggerScriptParser();
                _this.enableInternalServices().then(resolve, reject);
            });
        });
    };
    DEDebuggerImpl.prototype.enableInternalServices = function () {
        var _this = this;
        return Promise.all([
            this.client.Console.enable(),
            this.client.Debugger.enable(),
            this.client.Inspector.enable()
        ]).then(function (res) {
            console.log("enableInternalServices done", res);
            _this.attached = true;
        });
    };
    DEDebuggerImpl.prototype.initBaseEvents = function () {
        var _this = this;
        this.client.Runtime.exceptionThrown(function (params) {
            if (params.exceptionDetails) {
                _this.fireEvent('didThrownException', params);
                var errorObject = {
                    type: 'string',
                    value: lodash_1.get(params, 'exceptionDetails.exception.description')
                };
                if (lodash_1.get(params, 'exceptionDetails.exception')) {
                    errorObject = params.exceptionDetails.exception;
                }
                _this.fireEvent('didLogMessage', {
                    type: 'error',
                    args: [errorObject]
                });
            }
        });
        /*this.client.on('event',(params) => {
            console.log("Event",params);
        });*/
        this.client.Page.loadEventFired(function (params) {
            _this.scripts = [];
        });
        this.client.Runtime.consoleAPICalled(function (params) {
            _this.fireEvent('didLogMessage', params);
        });
        this.client.Debugger.paused(function (params) {
            _this.callFrames = params.callFrames;
            _this.paused = true;
            _this.fireEvent('didPause', params);
        });
        this.client.Debugger.resumed(function (params) {
            _this.paused = false;
            _this.events.emit('didResume');
        });
        this.client.Console.messageAdded(function (value) {
            //console.log("Console:" + JSON.stringify(value));
            _this.fireEvent('didLogMessage', value);
        });
    };
    DEDebuggerImpl.prototype.setUpDebuggerScriptParser = function () {
        var _this = this;
        this.client.Debugger.scriptParsed(function (params) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var script, mappingUrl, smc_1, rawSourcemap_1, sourcePath_1, isBase64, base64Content, mappingPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        //let isIgnored = this.ignoreUrls['includes'](String(params.url))
                        //if (isIgnored ) return
                        //console.log("Script parsed",params.url);
                        params.originalUrl = params.url;
                        params.url = this.getFilePathFromUrl(params.url);
                        script = {
                            scriptId: params.scriptId,
                            url: params.url,
                            sourceMapURL: params.sourceMapURL
                        };
                        if (!params.sourceMapURL) return [3 /*break*/, 6];
                        sourcePath_1 = path_1.parse(params.url);
                        isBase64 = params
                            .sourceMapURL
                            .match(/^data\:application\/json\;(charset=.+)?base64\,(.+)$/);
                        if (!isBase64) return [3 /*break*/, 2];
                        base64Content = DebuggerUtils_1.DebuggerUtils.atob(String(isBase64[2]));
                        return [4 /*yield*/, this.getObjectFromString(base64Content)];
                    case 1:
                        rawSourcemap_1 = _a.sent();
                        return [3 /*break*/, 5];
                    case 2:
                        mappingPath = path_1.join(sourcePath_1.dir, params.sourceMapURL);
                        return [4 /*yield*/, this
                                .getObjectFromFile(mappingPath)
                                .catch(function () {
                                mappingUrl = url_1.resolve(params.originalUrl, params.sourceMapURL);
                            })];
                    case 3:
                        rawSourcemap_1 = _a.sent();
                        if (!(mappingUrl && lodash_1.isUndefined(rawSourcemap_1))) return [3 /*break*/, 5];
                        return [4 /*yield*/, this
                                .getObjectFromUrl(mappingUrl)
                                .catch(function (e) {
                                // skip: Unable to get sourcemaps.
                            })];
                    case 4:
                        rawSourcemap_1 = _a.sent();
                        _a.label = 5;
                    case 5:
                        if (rawSourcemap_1) {
                            if (lodash_1.get(rawSourcemap_1, 'sources')) {
                                rawSourcemap_1.sources.forEach(function (sourceUrl, index) { return __awaiter(_this, void 0, void 0, function () {
                                    var targetUrl;
                                    return __generator(this, function (_a) {
                                        targetUrl = this.getFilePathFromUrl(sourceUrl);
                                        if (targetUrl === sourceUrl) {
                                            targetUrl = path_1.join(sourcePath_1.dir, sourceUrl);
                                            /*if(targetUrl.indexOf('file:/')>= 0 && targetUrl.indexOf('file:///')<0){
                                                targetUrl=targetUrl.replace("file:/","file:///");
                                            }*/
                                        }
                                        rawSourcemap_1.sources[index] = targetUrl;
                                        return [2 /*return*/];
                                    });
                                }); });
                            }
                            smc_1 = new SourceMapConsumer(rawSourcemap_1);
                            script.sourceMap = {
                                getOriginalPosition: function (lineNumber, columnNumber) {
                                    var lookup = {
                                        line: lineNumber + 1,
                                        column: columnNumber || 0,
                                        bias: SourceMapConsumer.LEAST_UPPER_BOUND
                                    };
                                    var position = smc_1.originalPositionFor(lookup);
                                    if (position.source === null) {
                                        lookup.bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
                                        position = smc_1.originalPositionFor(lookup);
                                    }
                                    if (position.source) {
                                        return {
                                            url: position.source,
                                            lineNumber: position.line - 1,
                                            columnNumber: position.column
                                        };
                                    }
                                    else {
                                        return false;
                                    }
                                }
                            };
                            smc_1.sources.forEach(function (sourceUrl) {
                                var mapScript = {
                                    // scriptId: params.scriptId,
                                    url: sourceUrl,
                                    sourceMap: {
                                        getPosition: function (lineNumber, columnNumber) {
                                            var lookup = {
                                                source: sourceUrl,
                                                line: lineNumber + 1,
                                                column: columnNumber || 0,
                                                bias: SourceMapConsumer.LEAST_UPPER_BOUND
                                            };
                                            var position = smc_1.generatedPositionFor(lookup);
                                            if (position.line === null) {
                                                lookup.bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
                                                position = smc_1.generatedPositionFor(lookup);
                                            }
                                            return {
                                                url: params.url,
                                                lineNumber: position.line - 1
                                            };
                                        }
                                    }
                                };
                                _this.addParsedScript(mapScript);
                            });
                        }
                        else {
                            //TODO fire error
                        }
                        _a.label = 6;
                    case 6:
                        this.addParsedScript(script);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    DEDebuggerImpl.prototype.evaluateOnFrames = function (expression, frames) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (frames.length > 0) {
                var frame = frames.shift();
                if (frame && frame.callFrameId) {
                    _this.client.Debugger
                        .evaluateOnCallFrame({
                        callFrameId: frame.callFrameId,
                        expression: expression,
                        generatePreview: false,
                        silent: true,
                        returnByValue: false,
                        includeCommandLineAPI: false
                    })
                        .then(function (result) {
                        var lookOnParent = frames.length > 0 &&
                            result.result.subtype === 'error' &&
                            result.result.className !== 'SyntaxError';
                        if (lookOnParent) {
                            resolve(_this.evaluateOnFrames(expression, frames));
                        }
                        else if (result && !result.exceptionDetails) {
                            resolve(result);
                        }
                        else {
                            reject(result);
                        }
                    });
                }
                else {
                    reject('frame has no id');
                }
            }
            else {
                reject('there are no frames to evaluate');
            }
        });
    };
    DEDebuggerImpl.prototype.evaluate = function (expression) {
        var frames = (this.callFrames || []).slice();
        return this.evaluateOnFrames(expression, frames);
    };
    DEDebuggerImpl.prototype.getProperties = function (params) {
        return this.client.Runtime.getProperties(params);
    };
    DEDebuggerImpl.prototype.getFilePathFromUrl = function (fileUrl) {
        return fileUrl;
    };
    DEDebuggerImpl.prototype.addParsedScript = function (script) {
        //console.log("addParsedScript:",script.url);
        var parsed = lodash_1.find(this.scripts, {
            url: script.url
        });
        if (parsed) {
            script = lodash_1.extend({}, parsed, script);
        }
        this.scripts.push(script);
        //noinspection TypeScriptUnresolvedFunction
        this.events.emit('didLoadScript', script);
    };
    DEDebuggerImpl.prototype.getScriptByUrl = function (url) {
        return this.scripts.find(function (s) {
            return s.url === url;
        });
    };
    DEDebuggerImpl.prototype.getScriptById = function (scriptId) {
        return this.scripts.find(function (s) {
            return parseInt(s.scriptId) === scriptId;
        });
    };
    DEDebuggerImpl.prototype.getObjectFromString = function (data) {
        return new Promise(function (resolve, reject) {
            try {
                resolve(JSON.parse(data.toString()));
            }
            catch (e) {
                reject(e);
            }
        });
    };
    DEDebuggerImpl.prototype.getObjectFromFile = function (filePath) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs_1.readFile(filePath, function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(_this.getObjectFromString(data));
                }
            });
        });
    };
    DEDebuggerImpl.prototype.getObjectFromUrl = function (fileUrl) {
        var _this = this;
        var urlParts = url_1.parse(fileUrl);
        var requesters = {
            'http:': http_1.request,
            'https:': https_1.request
        };
        return new Promise(function (resolve, reject) {
            var requester = requesters[urlParts.protocol];
            if (requester) {
                var req = requester({
                    hostname: urlParts.hostname,
                    port: urlParts.port,
                    path: urlParts.path,
                    method: 'GET'
                }, function (res) {
                    var responseData = '';
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        responseData += chunk.toString();
                    });
                    res.on('end', function () {
                        resolve(_this.getObjectFromString(responseData));
                    });
                });
                req.on('error', function (e) {
                    reject("problem with request: " + e.message);
                });
                req.end();
            }
            else {
                reject('unable to identify url protocol');
            }
        });
    };
    DEDebuggerImpl.prototype.setBreakpointFromScript = function (script, lineNumber, condition) {
        var _this = this;
        return new Promise(function (resolve) {
            var position = {
                url: script.url,
                lineNumber: lineNumber,
                condition: ''
            };
            if (script.sourceMap && script.sourceMap.getPosition) {
                //noinspection TypeScriptValidateTypes
                position = script.sourceMap.getPosition(lineNumber);
            }
            position.url = _this.getFilePathFromUrl(position.url);
            position.condition = condition;
            _this.client.Debugger.setBreakpointByUrl(position)
                .then(function (breakpoint) {
                _this.breakpoints.push({
                    id: breakpoint.breakpointId,
                    url: script.url,
                    columnNumber: 0,
                    condition: condition,
                    lineNumber: lineNumber
                });
                resolve(breakpoint);
            })
                .catch(function (message) {
                // do nothing
                console.error(message.toString());
            });
        });
    };
    DEDebuggerImpl.prototype.addBreakpoint = function (url, lineNumber, condition) {
        var _this = this;
        return this
            .removeBreakpoint(url, lineNumber)
            .then(function () {
            return new Promise(function (resolve, reject) {
                var script = _this.getScriptByUrl(url);
                if (script) {
                    resolve(_this.setBreakpointFromScript(script, lineNumber, condition));
                }
                else {
                    reject(url + " is not parsed");
                }
            });
        });
    };
    DEDebuggerImpl.prototype.getBreakpointById = function (id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var found = _this.breakpoints.find(function (b) {
                return (b.id === id);
            });
            resolve(found);
        });
    };
    DEDebuggerImpl.prototype.getBreakpoint = function (url, lineNumber) {
        return this.breakpoints.find(function (b) {
            return (b.url === url && b.lineNumber === lineNumber);
        });
    };
    DEDebuggerImpl.prototype.removeBreakpoint = function (url, lineNumber) {
        var breakpoint = this.getBreakpoint(url, lineNumber);
        if (breakpoint) {
            var index = this.breakpoints.indexOf(breakpoint);
            this.breakpoints.splice(index, 1);
            return this.client.Debugger.removeBreakpoint({
                breakpointId: breakpoint.id
            });
        }
        return Promise.resolve();
    };
    DEDebuggerImpl.prototype.getScope = function () {
        var firstFrame = this.getFrameByIndex(0);
        return this.getScopeFromFrame(firstFrame);
    };
    DEDebuggerImpl.prototype.getScopeFromFrame = function (frame) {
        var scope = frame.scopeChain.slice();
        if (frame.this) {
            scope.unshift({
                type: 'this',
                object: frame.this
            });
        }
        return scope.map(function (s) {
            return {
                name: s.type,
                value: s.object
            };
        });
    };
    DEDebuggerImpl.prototype.getCallStack = function () {
        var _this = this;
        return this.callFrames
            .filter(function (frame) {
            frame.location.script = _this.getScriptById(parseInt(frame.location.scriptId));
            var sourceMap = lodash_1.get(frame, 'location.script.sourceMap');
            if (sourceMap) {
                var position = sourceMap.getOriginalPosition(frame.location.lineNumber, parseInt(frame.location.columnNumber));
                if (position) {
                    frame.location.script.url = position.url;
                    frame.location.lineNumber = position.lineNumber;
                    frame.location.columnNumber = position.columnNumber;
                    return true;
                }
                else {
                    return false;
                }
            }
            return true;
        })
            .map(function (frame) {
            return {
                name: frame.functionName,
                columnNumber: frame.location.columnNumber,
                lineNumber: frame.location.lineNumber,
                filePath: frame.location.script.url,
                scope: _this.getScopeFromFrame(frame)
            };
        });
    };
    DEDebuggerImpl.prototype.getFrameByIndex = function (index) {
        return this.callFrames[index];
    };
    DEDebuggerImpl.prototype.resume = function () {
        return this.client.Debugger.resume();
    };
    DEDebuggerImpl.prototype.pause = function () {
        return this.client.Debugger.pause();
    };
    DEDebuggerImpl.prototype.stepOver = function () {
        return this.client.Debugger.stepOver();
    };
    DEDebuggerImpl.prototype.stepInto = function () {
        return this.client.Debugger.stepInto();
    };
    DEDebuggerImpl.prototype.stepOut = function () {
        return this.client.Debugger.stepOut();
    };
    DEDebuggerImpl.prototype.disconnect = function () {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        this.breakpoints = [];
        this.scripts = [];
        this.attached = false;
    };
    DEDebuggerImpl.prototype.fireEvent = function (name, params) {
        //noinspection TypeScriptUnresolvedFunction
        this.events.emit(name, params);
    };
    DEDebuggerImpl.prototype.didClose = function (cb) {
        this.events.addListener('didClose', cb);
    };
    DEDebuggerImpl.prototype.didLogMessage = function (cb) {
        this.events.addListener('didLogMessage', cb);
    };
    DEDebuggerImpl.prototype.didThrownException = function (cb) {
        this.events.addListener('didThrownException', cb);
    };
    DEDebuggerImpl.prototype.didLoadScript = function (cb) {
        this.events.addListener('didLoadScript', cb);
    };
    DEDebuggerImpl.prototype.didPause = function (cb) {
        this.events.addListener('didPause', cb);
    };
    DEDebuggerImpl.prototype.didResume = function (cb) {
        this.events.addListener('didResume', cb);
    };
    DEDebuggerImpl.prototype.onEvent = function (name, callback) {
        this.events.addListener(name, callback);
    };
    DEDebuggerImpl.prototype.removeEventListener = function (name, callback) {
        this.events.removeListener(name, callback);
    };
    DEDebuggerImpl.prototype.removeAllEventListeners = function (name) {
        this.events.removeAllListeners(name);
    };
    return DEDebuggerImpl;
}());
exports.DEDebuggerImpl = DEDebuggerImpl;
//# sourceMappingURL=DEDebuggerImpl.js.map