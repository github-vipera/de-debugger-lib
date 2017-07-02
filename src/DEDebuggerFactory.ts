import {DEDebugger} from "./DEDebugger";
import {DEDebuggerImpl} from "./DEDebuggerImpl";
/**
 * Created by enrico on 02/07/17.
 */
export class DEDebuggerFactory{
    private constructor(){

    }
    public static createDefault():DEDebugger{
        return new DEDebuggerImpl();
    }
}