import { pool } from "../../config/db.js";
import { bizppurioApi } from "../bizppurio-util.js";
import { returnMomentOnlyNumber } from "../function.js";
import queue from "../queue/index.js";

const sendAlarmKakao = {
    single: async (data) => {
        try {
            let {
                sender,
                receiver,
                type,
                msg,
                title,
                file,
                senderkey,
                tpl_code,
                button
            } = data;
            queue.push(async () => {
                let result = await bizppurioApi.message({
                    ...data,
                    from: sender,
                    to: receiver,
                    content: {
                        [`${type}`]: {
                            templatecode: tpl_code,
                            senderkey,
                            message: msg,
                            ...(title ? {
                                title: title
                            } : {}),
                            ...(file ? {
                                file: file,
                            } : {}),
                            ...(button ? {
                                button: button
                            } : {}),
                        }
                    },
                });
                if (result?.code == 1000) {
                    return true;
                } else {
                    return false;
                }
            })
            return true;
        } catch (err) {
            return false;
        }
    },
    multiple: async (data) => {
        try {
            let {
                receiver,
                token_data
            } = data;
            let {
                access_token,
                expired,
            } = token_data;
            for (var i = 0; i < receiver.length; i++) {
                let return_moment = returnMomentOnlyNumber();
                if (return_moment >= expired) {
                    let during_token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
                    during_token_data = during_token_data?.result[0];
                    access_token = during_token_data?.access_token;
                    expired = during_token_data?.expired;
                }
                let result = await sendAlarmKakao.single({
                    ...data,
                    receiver: receiver[i].receiver,
                    token_data: {
                        access_token,
                        expired
                    },
                    msg: receiver[i].msg,
                    title: receiver[i].title,
                    button: receiver[i].button,
                });
            }
            return true;
        } catch (err) {
            return false;
        }
    },
}

export default sendAlarmKakao;