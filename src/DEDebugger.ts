/**
 * Created by enrico on 28/06/17.
 */

export interface DEDebugger {
    activate: () => Promise<any>
    list:() =>Promise<Array<AttachableTarget>>
    attach: (targetId:string) => Promise<any>
    addBreakpoint: (url: string, lineNumber: number, condition?: string) => Promise<any>
    getBreakpoint: (url: string, lineNumber: number) => Breakpoint
    getBreakpointById: (id:string) => Promise<Breakpoint>
    removeBreakpoint: (url: string, lineNumber: number) => Promise<any>
    resume:() => Promise<any>
    pause:() => Promise<any>
    stepOver:() => Promise<any>
    stepInto:() => Promise<any>
    stepOut:() => Promise<any>
}

export interface ChromeDebuggerClient{
    Network:Network
    Page:Page
    Tracing :Tracing
    Console:Console
    Debugger:Debugger
    Log:Log
    Runtime:Runtime
    Inspector:Inspector
    Target:Target
}

export interface Network{
    enable:() => Promise<any>
}

export interface Page{
    enable:() => Promise<any>
}

export interface Tracing{
    enable:() => Promise<any>
}

export interface Console{
    enable:() => Promise<any>
}

export interface Debugger{
    enable:() => Promise<any>
    disable:() => Promise<any>
    scriptParsed: (callback) => Promise<any>
    setBreakpointByUrl: (position)=>Promise<any>
    setBreakpointsActive: (value:boolean) => Promise<any>
    removeBreakpoint:(breakpointInfo:{breakpointId:string}) => Promise<any>
    resume:() => Promise<any>
    pause:() => Promise<any>
    stepOver:() => Promise<any>
    stepInto:() => Promise<any>
    stepOut:() => Promise<any>
}

export interface Log{

}

export interface Runtime{
    enable:() => Promise<any>
    disable:() => Promise<any>
    exceptionThrown:(handler:(params) => void) => void
    consoleAPICalled:(handler:(params) => void) => void
}

export interface Inspector{
    enable:() => Promise<any>
}

export interface Target{

}


// PLUGIN INTERFACE

export interface AttachableTarget {
    id:string,
    title:string,
    type:string,
    url:string
}

export interface Script {
    scriptId?: string,
    url: string,
    sourceMapURL?: string
    sourceMap?: any
}

export interface Breakpoint {
    id: string
    url: any
    lineNumber:number,
    columnNumber?: number,
    condition?:string
}

//adb shell pidof <package-name>

//adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>