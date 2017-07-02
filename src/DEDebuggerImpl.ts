import {DebuggerUtils} from "./DebuggerUtils";
/**
 * Created by enrico on 28/06/17.
 */

declare const require: (name:string) => any
import {
    DEDebugger, ChromeDebuggerClient, Network, Page, Runtime, AttachableTarget, Script,
    Breakpoint
} from "./DEDebugger"

//noinspection TypeScriptCheckImport
import {EventEmitter} from 'events'
//noinspection TypeScriptCheckImport
import { dirname, join, parse as parsePath } from 'path'
//noinspection TypeScriptCheckImport
import { resolve as resolveUrl, parse as parseUrl } from 'url'
//noinspection TypeScriptCheckImport
import { stat, readFile } from 'fs'
//noinspection TypeScriptCheckImport
import { request as requestHttp } from 'http'
//noinspection TypeScriptCheckImport
import { request as requestHttps } from 'https'
//noinspection TypeScriptCheckImport
import { get, find, extend, isUndefined } from 'lodash'

//noinspection TypeScriptUnresolvedFunction
const { SourceMapConsumer } = require('source-map')

//import * as CDP from 'chrome-remote-interface'
const CDP = require('chrome-remote-interface')

export class DEDebuggerImpl implements DEDebugger {
    private client:ChromeDebuggerClient = null;
    private paused:boolean=false;
    public breakpoints: Array<Breakpoint> = [];
    public scripts: Array<Script> = [];
    public callFrames:Array<any> = [];
    public events: EventEmitter = new EventEmitter();

    constructor(){
        this.client = null;
    }
    activate():Promise<any> {
        return new Promise<any>((resolve,reject) => {
            CDP().then((client:ChromeDebuggerClient) => {
                this.client=client;
                //resolve(client);
                Promise.all([
                    this.client.Network.enable(),
                    this.client.Page.enable(),
                    this.client.Runtime.enable(),
                ]).then(resolve,reject);
            },(err) => {
                reject(err)
            });
        });
    }
    list():Promise<Array<AttachableTarget>>{
        return new Promise<Array<AttachableTarget>>((resolve,reject) => {
            CDP.List((err,data) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    }
    attach(targetId:string):Promise<any>{
        return new Promise((resolve,reject) => {
            CDP.Activate({'id': targetId}).then((err,data) => {
                if(err){
                    reject(err);
                    return;
                }
                this.initBaseEvents();
                this.setUpDebuggerScriptParser();
                this.enableInternalServices().then(resolve,reject);
            })
        })
    }

    private enableInternalServices(): Promise<any>{
        return Promise.all([
            this.client.Console.enable(),
            this.client.Debugger.enable(),
            this.client.Inspector.enable()
        ]).then((res) => {
            console.log("enableInternalServices done",res);
        });
    }

    private initBaseEvents(){
        this.client.Runtime.exceptionThrown((params) => {
            if (params.exceptionDetails) {
                this.fireEvent('didThrownException', params)
                let errorObject = {
                    type: 'string',
                    value: get(params, 'exceptionDetails.exception.description')
                }
                if (get(params, 'exceptionDetails.exception')) {
                    errorObject = params.exceptionDetails.exception
                }
                this.fireEvent('didLogMessage', {
                    type: 'error',
                    args: [errorObject]
                });
            }
        })

        /*this.client.on('event',(params) => {
            console.log("Event",params);
        });*/

        this.client.Page.loadEventFired((params) => {
           this.scripts = []
        })

        this.client.Runtime.consoleAPICalled((params) => {
            this.fireEvent('didLogMessage', params)
        });

        this.client.Debugger.paused((params) => {
            this.callFrames = params.callFrames
            this.paused = true
            this.fireEvent('didPause', params)
        });

        this.client.Debugger.resumed((params) => {
            this.paused = false
            this.events.emit('didResume')
        });

        this.client.Console.messageAdded((value) => {
            //console.log("Console:" + JSON.stringify(value));
            this.fireEvent('didLogMessage', value)
        });
    }

    private setUpDebuggerScriptParser() {
        this.client.Debugger.scriptParsed(async (params) => {
            //let isIgnored = this.ignoreUrls['includes'](String(params.url))
            //if (isIgnored ) return
            //console.log("Script parsed",params.url);
            params.originalUrl = params.url
            params.url = this.getFilePathFromUrl(params.url)
            let script: Script = {
                scriptId: params.scriptId,
                url: params.url,
                sourceMapURL: params.sourceMapURL
            };
            let mappingUrl;
            if (params.sourceMapURL) {
                let smc;
                let rawSourcemap;
                let sourcePath = parsePath(params.url)
                let isBase64 = params
                    .sourceMapURL
                    .match(/^data\:application\/json\;(charset=.+)?base64\,(.+)$/)
                if (isBase64) {
                    //let base64Content = window.atob(String(isBase64[2]))
                    let base64Content = DebuggerUtils.atob(String(isBase64[2]));
                    rawSourcemap = await this.getObjectFromString(base64Content)
                } else {
                    let mappingPath = join(sourcePath.dir, params.sourceMapURL)
                    rawSourcemap = await this
                        .getObjectFromFile(mappingPath)
                        .catch(() => {
                            mappingUrl = resolveUrl(params.originalUrl, params.sourceMapURL)
                        })
                    if (mappingUrl && isUndefined(rawSourcemap)) {
                        rawSourcemap = await this
                            .getObjectFromUrl(mappingUrl)
                            .catch((e) => {
                                // skip: Unable to get sourcemaps.
                            })
                    }
                }
                if (rawSourcemap) {
                    if (get(rawSourcemap, 'sources')) {
                        rawSourcemap.sources.forEach(async (sourceUrl, index) => {
                            let targetUrl = this.getFilePathFromUrl(sourceUrl)
                            if (targetUrl === sourceUrl) {
                                targetUrl = join(sourcePath.dir, sourceUrl)
                            }
                            rawSourcemap.sources[index] = targetUrl
                            // FIXME: find another way to validate files.
                            // await this.fileExists(targetUrl).catch((err) => {
                            //   atom.notifications.addError('XAtom Debug: Unable to locate file', {
                            //     detail: err,
                            //     dismissable: true
                            //   })
                            // })
                        })
                    }
                    smc = new SourceMapConsumer(rawSourcemap)
                    script.sourceMap = {
                        getOriginalPosition: (lineNumber: number, columnNumber?: number) => {
                            let lookup = {
                                line: lineNumber + 1,
                                column: columnNumber || 0,
                                bias: SourceMapConsumer.LEAST_UPPER_BOUND
                            }
                            let position = smc.originalPositionFor(lookup)
                            if (position.source === null) {
                                lookup.bias = SourceMapConsumer.GREATEST_LOWER_BOUND
                                position = smc.originalPositionFor(lookup)
                            }
                            if (position.source) {
                                return {
                                    url: position.source, //targetUrl,
                                    lineNumber: position.line - 1,
                                    columnNumber: position.column
                                }
                            } else {
                                return false
                            }
                        }
                    }
                    smc.sources.forEach((sourceUrl) => {
                        let mapScript: Script = {
                            // scriptId: params.scriptId,
                            url: sourceUrl,
                            sourceMap: {
                                getPosition: (lineNumber: number, columnNumber?: number) => {
                                    let lookup = {
                                        source: sourceUrl,
                                        line: lineNumber + 1,
                                        column: columnNumber || 0,
                                        bias: SourceMapConsumer.LEAST_UPPER_BOUND
                                    }
                                    let position = smc.generatedPositionFor(lookup)
                                    if (position.line === null) {
                                        lookup.bias = SourceMapConsumer.GREATEST_LOWER_BOUND
                                        position = smc.generatedPositionFor(lookup)
                                    }
                                    return {
                                        url: params.url,
                                        lineNumber: position.line - 1
                                    }
                                }
                            }
                        }
                        this.addParsedScript(mapScript)
                    })
                } else {
                    //TODO fire error
                }
            }
            this.addParsedScript(script)
        })
    }

    private getFilePathFromUrl (fileUrl: string): string {
        return fileUrl
    }

    private addParsedScript (script: Script) {
        //console.log("addParsedScript:",script.url);
        let parsed = find(this.scripts, {
            url: script.url
        })
        if (parsed) {
            script = extend({}, parsed, script)
        }
        this.scripts.push(script)
        //noinspection TypeScriptUnresolvedFunction
        this.events.emit('didLoadScript', script)
    }

    private getScriptByUrl (url: string): Script {
        return this.scripts.find((s) => {
            return s.url === url
        })
    }

    private getScriptById (scriptId: number): Script {
        return this.scripts.find((s) => {
            return parseInt(s.scriptId) === scriptId
        })
    }

    private getObjectFromString (data) {
        return new Promise((resolve, reject) => {
            try {
                resolve(JSON.parse(data.toString()))
            } catch (e) {
                reject(e)
            }
        })
    }

    private getObjectFromFile (filePath: string) {
        return new Promise((resolve, reject) => {
            readFile(filePath, (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(this.getObjectFromString(data))
                }
            })
        })
    }

    private getObjectFromUrl (fileUrl: string) {
        let urlParts = parseUrl(fileUrl)
        let requesters = {
            'http:': requestHttp,
            'https:': requestHttps
        }
        return new Promise((resolve, reject) => {
            let requester = requesters[urlParts.protocol]
            if (requester) {
                let req = requester({
                    hostname: urlParts.hostname,
                    port: urlParts.port,
                    path: urlParts.path,
                    method: 'GET'
                }, (res) => {
                    let responseData = ''
                    res.setEncoding('utf8')
                    res.on('data', (chunk) => {
                        responseData += chunk.toString()
                    })
                    res.on('end', () => {
                        resolve(this.getObjectFromString(responseData))
                    })
                })
                req.on('error', (e) => {
                    reject(`problem with request: ${e.message}`)
                })
                req.end()
            } else {
                reject('unable to identify url protocol')
            }
        })
    }


    private setBreakpointFromScript (script: Script, lineNumber: number, condition?: string) {
        return new Promise((resolve) => {
            let position = {
                url: script.url,
                lineNumber: lineNumber,
                condition: ''
            }
            if (script.sourceMap && script.sourceMap.getPosition) {
                //noinspection TypeScriptValidateTypes
                position = script.sourceMap.getPosition(lineNumber)
            }
            position.url = this.getFilePathFromUrl(position.url)
            position.condition = condition
            this.client.Debugger.setBreakpointByUrl(position)
                .then((breakpoint) => {
                    this.breakpoints.push({
                        id: breakpoint.breakpointId,
                        url: script.url,
                        columnNumber: 0,
                        condition,
                        lineNumber
                    })
                    resolve(breakpoint)
                })
                .catch((message) => {
                    // do nothing
                    console.error(message.toString());
                })
        })
    }

    addBreakpoint (url: string, lineNumber: number, condition?: string):Promise<any> {
        return this
            .removeBreakpoint(url, lineNumber)
            .then(() => {
                return new Promise((resolve, reject) => {
                    let script = this.getScriptByUrl(url)
                    if (script) {
                        resolve(this.setBreakpointFromScript(script, lineNumber, condition))
                    } else {
                        reject(`${url} is not parsed`)
                    }
                })
            })
    }

    getBreakpointById (id:string): Promise<any> {
        return new Promise ((resolve, reject) => {
            let found = this.breakpoints.find((b: any) => {
                return (b.id === id)
            })
            resolve(found)
        })
    }

    getBreakpoint (url: string, lineNumber: number) {
        return this.breakpoints.find((b: any) => {
            return (b.url === url && b.lineNumber === lineNumber)
        })
    }

    removeBreakpoint (url: string, lineNumber: number):Promise<any> {
        let breakpoint: any = this.getBreakpoint(url, lineNumber)
        if (breakpoint) {
            let index = this.breakpoints.indexOf(breakpoint)
            this.breakpoints.splice(index, 1)
            return this.client.Debugger.removeBreakpoint({
                breakpointId: breakpoint.id
            })
        }
        return Promise.resolve()
    }

    getScopeFromFrame (frame) {
        let scope = [...frame.scopeChain]
        if (frame.this) {
            scope.unshift({
                type: 'this',
                object: frame.this
            })
        }
        return scope.map((s) => {
            return {
                name: s.type,
                value: s.object
            }
        })
    }

    getCallStack () {
        return this.callFrames
            .filter((frame: any) => {
                frame.location.script = this.getScriptById(parseInt(frame.location.scriptId))
                let sourceMap: any = get(frame, 'location.script.sourceMap')
                if (sourceMap) {
                    let position = sourceMap.getOriginalPosition(frame.location.lineNumber,
                        parseInt(frame.location.columnNumber))
                    if (position) {
                        frame.location.script.url = position.url
                        frame.location.lineNumber = position.lineNumber
                        frame.location.columnNumber = position.columnNumber
                        return true
                    } else {
                        return false
                    }
                }
                return true
            })
            .map((frame) => {
                return {
                    name: frame.functionName,
                    columnNumber: frame.location.columnNumber,
                    lineNumber: frame.location.lineNumber,
                    filePath: frame.location.script.url,
                    scope: this.getScopeFromFrame(frame)
                }
            })
    }

    getFrameByIndex (index: number) {
        return this.callFrames[index]
    }


    resume () {
        return this.client.Debugger.resume()
    }

    pause () {
        return this.client.Debugger.pause()
    }

    stepOver () {
        return this.client.Debugger.stepOver()
    }

    stepInto () {
        return this.client.Debugger.stepInto()
    }

    stepOut () {
        return this.client.Debugger.stepOut()
    }


    private fireEvent(name:string,params:any):void{
        //noinspection TypeScriptUnresolvedFunction
        this.events.emit(name, params);
    }

    public onEvent(name:string,callback:Function){
        this.events.addListener(name,callback);
    }
    public removeEventListener(name:string,callback:Function){
        this.events.removeListener(name,callback);
    }
    public removeAllEventListeners(name?:string){
        this.events.removeAllListeners(name);
    }

}