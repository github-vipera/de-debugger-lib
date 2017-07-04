/// <reference types="node" />
import { DEDebugger, AttachableTarget, Script, Breakpoint } from "./DEDebugger";
import { EventEmitter } from 'events';
export declare class DEDebuggerImpl implements DEDebugger {
    private client;
    breakpoints: Array<Breakpoint>;
    scripts: Array<Script>;
    callFrames: Array<any>;
    events: EventEmitter;
    attached: boolean;
    paused: boolean;
    constructor();
    activate(): Promise<any>;
    list(): Promise<Array<AttachableTarget>>;
    attach(targetId: string): Promise<any>;
    private enableInternalServices();
    private initBaseEvents();
    private setUpDebuggerScriptParser();
    evaluateOnFrames(expression: string, frames: Array<any>): Promise<{}>;
    evaluate(expression: string): Promise<{}>;
    getProperties(params: any): Promise<any>;
    getFilePathFromUrl(fileUrl: string): string;
    private addParsedScript(script);
    private getScriptByUrl(url);
    private getScriptById(scriptId);
    private getObjectFromString(data);
    private getObjectFromFile(filePath);
    private getObjectFromUrl(fileUrl);
    private setBreakpointFromScript(script, lineNumber, condition?);
    addBreakpoint(url: string, lineNumber: number, condition?: string): Promise<any>;
    getBreakpointById(id: string): Promise<any>;
    getBreakpoint(url: string, lineNumber: number): Breakpoint;
    removeBreakpoint(url: string, lineNumber: number): Promise<any>;
    getScope(): {
        name: any;
        value: any;
    }[];
    getScopeFromFrame(frame: any): {
        name: any;
        value: any;
    }[];
    getCallStack(): {
        name: any;
        columnNumber: any;
        lineNumber: any;
        filePath: any;
        scope: {
            name: any;
            value: any;
        }[];
    }[];
    getFrameByIndex(index: number): any;
    resume(): Promise<any>;
    pause(): Promise<any>;
    stepOver(): Promise<any>;
    stepInto(): Promise<any>;
    stepOut(): Promise<any>;
    disconnect(): void;
    private fireEvent(name, params);
    didClose(cb: Function): void;
    didLogMessage(cb: Function): void;
    didThrownException(cb: Function): void;
    didLoadScript(cb: Function): void;
    didPause(cb: Function): void;
    didResume(cb: Function): void;
    onEvent(name: string, callback: Function): void;
    removeEventListener(name: string, callback: Function): void;
    removeAllEventListeners(name?: string): void;
}
