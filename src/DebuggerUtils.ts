/**
 * Created by enrico on 29/06/17.
 */
declare const Buffer:any;
export class DebuggerUtils {
    static atob(text) {
        return new Buffer(text, 'base64').toString('binary');
    };
    static getObjectFromString(str){
        return JSON.parse(str);
    }

    static tryAdbForward(packageName:string):Promise<any>{
        return new Promise((resolve,reject) => {

        });
    }
}