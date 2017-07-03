/**
 * Created by enrico on 28/06/17.
 */
export declare type EventHandler = (params: any) => void;
export interface DEDebugger {
    activate: () => Promise<any>;
    list: () => Promise<Array<AttachableTarget>>;
    attach: (targetId: string) => Promise<any>;
    addBreakpoint: (url: string, lineNumber: number, condition?: string) => Promise<any>;
    getBreakpoint: (url: string, lineNumber: number) => Breakpoint;
    getBreakpointById: (id: string) => Promise<Breakpoint>;
    removeBreakpoint: (url: string, lineNumber: number) => Promise<any>;
    getFilePathFromUrl: (url: string) => string;
    resume: () => Promise<any>;
    pause: () => Promise<any>;
    stepOver: () => Promise<any>;
    stepInto: () => Promise<any>;
    stepOut: () => Promise<any>;
    evaluate: (expression: any) => Promise<any>;
    getProperties: (params: any) => Promise<any>;
    onEvent: (name: string, callback: Function) => void;
    didClose: (handler: EventHandler) => void;
    didLogMessage: (handler: EventHandler) => void;
    didThrownException: (handler: EventHandler) => void;
    didLoadScript: (handler: EventHandler) => void;
    didPause: (handler: EventHandler) => void;
    didResume: (handler: EventHandler) => void;
    removeEventListener: (name: string, callback: Function) => void;
    removeAllEventListeners: (name?: string) => void;
    attached: boolean;
    paused: boolean;
    disconnect: () => void;
}
export interface ChromeDebuggerClient {
    on: (eventName: string, handler: EventHandler) => void;
    Network: Network;
    Page: Page;
    Tracing: Tracing;
    Console: Console;
    Debugger: Debugger;
    Log: Log;
    Runtime: Runtime;
    Inspector: Inspector;
    Target: Target;
    close: () => void;
}
export interface Network {
    enable: () => Promise<any>;
}
export interface Page {
    enable: () => Promise<any>;
    loadEventFired: (handler: EventHandler) => void;
}
export interface Tracing {
    enable: () => Promise<any>;
}
export interface Console {
    enable: () => Promise<any>;
    messageAdded: (handler: EventHandler) => void;
}
export interface Debugger {
    enable: () => Promise<any>;
    disable: () => Promise<any>;
    paused: (handler: (params: any) => void) => void;
    resumed: (handler: (params: any) => void) => void;
    scriptParsed: (callback) => Promise<any>;
    setBreakpointByUrl: (position) => Promise<any>;
    setBreakpointsActive: (value: boolean) => Promise<any>;
    removeBreakpoint: (breakpointInfo: {
        breakpointId: string;
    }) => Promise<any>;
    evaluateOnCallFrame: (request: any) => Promise<any>;
    resume: () => Promise<any>;
    pause: () => Promise<any>;
    stepOver: () => Promise<any>;
    stepInto: () => Promise<any>;
    stepOut: () => Promise<any>;
}
export interface Log {
}
export interface Runtime {
    enable: () => Promise<any>;
    disable: () => Promise<any>;
    exceptionThrown: (handler: (params) => void) => void;
    consoleAPICalled: (handler: (params) => void) => void;
    getProperties: (params: any) => Promise<any>;
}
export interface Inspector {
    enable: () => Promise<any>;
}
export interface Target {
}
export interface AttachableTarget {
    id: string;
    title: string;
    type: string;
    url: string;
}
export interface Script {
    scriptId?: string;
    url: string;
    sourceMapURL?: string;
    sourceMap?: any;
}
export interface Breakpoint {
    id: string;
    url: any;
    lineNumber: number;
    columnNumber?: number;
    condition?: string;
}
