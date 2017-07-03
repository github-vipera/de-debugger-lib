export declare class ADBUtils {
    static getPidByPackageName(packageName: string): Promise<any>;
    static adbForwardForWebviewByPid(pid: string): Promise<any>;
    static forwardForWebviewByPackageName(packageName: string): Promise<any>;
}
