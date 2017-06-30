/**
 * Created by enrico on 30/06/17.
 */
//noinspection TypeScriptCheckImport
import { exec } from 'child_process'
export class ADBUtils {
    static getPidByPackageName(packageName:string):Promise<any>{
        return new Promise((resolve,reject) => {
            exec('adb shell pidof ' + packageName, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                try {
                    let pid=parseInt(stdout.toString()).toString();
                    resolve({pid:pid});
                }catch (ex){
                    reject(ex);
                    return;
                }
            });
        });
    }

    static adbForwardForWebviewByPid(pid:string):Promise<any>{
        return new Promise((resolve,reject) => {
            exec('adb forward tcp:9222 localabstract:webview_devtools_remote_' + pid, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }


    static forwardForWebviewByPackageName(packageName:string):Promise<any>{
        return new Promise((resolve,reject) => {
            ADBUtils.getPidByPackageName(packageName).then(function (res) {
                ADBUtils.adbForwardForWebviewByPid(res.pid).then(resolve,reject)
            },reject)
        });
    }


}