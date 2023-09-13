import sendAlarmKakao from "./alimtalk.js";
import sendFriendKakao from "./friendtalk.js";
import sendMsg from "./msg.js";

const send_func_obj = {
    msg: {
        ...sendMsg
    },
    alimtalk: {
        ...sendAlarmKakao
    },
    friendtalk: {
        ...sendFriendKakao
    }
}
export default send_func_obj;