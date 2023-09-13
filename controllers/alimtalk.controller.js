
'use strict';
import _ from "lodash";
import { pool } from "../config/db.js";
import { bizppurioApi } from "../utils/bizppurio-util.js";
import { checkIsManagerUrl, returnMoment, returnMomentOnlyNumber } from "../utils/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../utils/query-util.js";
import send_func_obj from "../utils/send/index.js";
import { checkLevel, createHashedPassword, dateAdd, response, } from "../utils/util.js";
import 'dotenv/config';
import returnResponse from "../utils/send/response-format.js";

const table_name = 'alimtalk';

const alimtalkCtrl = {
    list: async (req, res, next) => {//전송결과
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
            const { } = req.query;

            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    token: async (req, res, next) => {//token 발급
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
            const { num, num_unit } = req.params;
            const { api_key, user_id } = req.body;
            console.log(num);
            console.log(num_unit);
            let is_exist_user_key = await pool.query(`SELECT * FROM users WHERE user_name=? AND api_key=? `, [user_id, api_key]);
            if (!(is_exist_user_key?.result.length > 0)) {
                return returnResponse(req, res, -1000)
            }
            let token_data = await createHashedPassword(`${api_key}${user_id}`);
            let {
                hashedPassword,
                salt,
            } = token_data;
            let expired_date = dateAdd(returnMoment(), parseInt(num), num_unit);
            let expired = new Date(expired_date).getTime();
            let result = await pool.query(`UPDATE users SET kakao_token=?, kakao_token_expired=?`, [
                hashedPassword,
                expired
            ])

            return returnResponse(req, res, 100, {
                token: hashedPassword,
                expired: expired_date
            });
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000);
        } finally {

        }
    },
    auth: async (req, res, next) => {//token 인증요청
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
            const { api_key, user_id, token, plusid, phonenumber } = req.body;

            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000);
        } finally {

        }
    },
    send: async (req, res, next) => { //발송
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
            let {
                api_key,
                user_id,
                token, // 토큰이 필요한 요청일시 token
                senderkey = 'senderkey',
                tpl_code = 'templatecode',
                sender, //보내는사람
                msg_type = 'text',
            } = req.body;
            if (
                !api_key ||
                !user_id ||
                !token ||
                !senderkey ||
                !tpl_code ||
                !sender
            ) {
                return returnResponse(req, res, -999);
            }
            let body = { ...req.body };
            let is_exist_user_key = await pool.query(`SELECT * FROM users WHERE user_name=? AND api_key=? `, [user_id, api_key]);
            if (!(is_exist_user_key?.result.length > 0)) {
                return returnResponse(req, res, -1000)
            }
            let user = is_exist_user_key?.result[0];
            if(token != user?.kakao_token){
                return returnResponse(req, res, -1001)
            }
            if(new Date().getTime() > user?.kakao_token_expired){
                return returnResponse(req, res, -1002)
            }
            let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
            token_data = token_data?.result[0];
            let obj = {
                sender,
                token_data,
                senderkey,
                tpl_code,
                user_id: user?.id,
            }
            // receiver_1, title_1, msg_1, button_1 (1~500)

            let files = req.files;
            if (files?.message_file) {
                if (msg_type == 'text') {
                    return returnResponse(req, res, -2500)
                }
                if (files?.message_file.length > 1) {
                    return returnResponse(req, res, -2501)
                }
                if (files?.message_file?.size > 300 * 1024) {
                    return returnResponse(req, res, -2502)
                }
                let send_file = "";
                let file_result = await bizppurioApi.file({
                    file: files?.message_file[0],
                    token_data
                });
                if (file_result?.code == 1000) {
                    send_file = file_result?.filekey
                } else {
                    return returnResponse(req, res, -4000)
                }
                obj['type'] = 'ai';//
                for (var i = 1; i <= 500; i++) {
                    if (body[`receiver_${i}`] && body[`title_${i}`]) {
                        body[`msg_${i}`] = send_file;
                    }
                }
            } else {
                obj['type'] = 'at';//
            }
            let receiver = [];
            for (var i = 1; i <= 500; i++) {
                if (body[`receiver_${i}`] && body[`title_${i}`] && body[`msg_${i}`]) {
                    let button = body[`button_${i}`]?.button;
                    if (button) {
                        for (var j = 0; j < button.length; j++) {
                            console.log(button[j])
                            if (!button[j]?.name) {
                                return returnResponse(req, res, -2600)
                            }
                            if (!['AC', 'DS', 'WL', 'AL', 'BK', 'MD'].find((element) => element == button[j]?.linkType)) {
                                return returnResponse(req, res, -2601)
                            }
                            button[j] = {
                                name: button[j]?.name,
                                type: button[j]?.linkType,//AC, DS, WL, AL, BK, MD
                                url_pc: button[j]?.linkPc ?? "",
                                url_mobile: button[j]?.linkMo ?? "",
                                scheme_ios: button[j]?.linkIos ?? "",
                                scheme_android: button[j]?.linkAnd ?? "",
                            }
                        }
                    }
                    receiver.push({
                        receiver: body[`receiver_${i}`],
                        msg: body[`msg_${i}`],
                        title: body[`title_${i}`],
                        ...(body[`button_${i}`] ? {
                            button: button
                        } : {})
                    })
                }
            }
            if (receiver.length == 0) {
                return returnResponse(req, res, -2400)
            }
            obj['receiver'] = receiver;
            let result = await send_func_obj['alimtalk'][`multiple`](obj);
            if (result) {
                return returnResponse(req, res, 100)
            } else {
                return returnResponse(req, res, -4500)
            }
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
}
export default alimtalkCtrl;
