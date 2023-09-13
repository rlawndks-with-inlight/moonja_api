
'use strict';
import { pool } from "../config/db.js";
import { bizppurioApi } from "../utils/bizppurio-util.js";
import { checkIsManagerUrl, returnMomentOnlyNumber } from "../utils/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../utils/query-util.js";
import send_func_obj from "../utils/send/index.js";
import returnResponse from "../utils/send/response-format.js";
import { checkLevel, response } from "../utils/util.js";
import 'dotenv/config';

const table_name = 'friendtalk';

const friendtalkCtrl = {
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
            const { } = req.query;

            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    s: async (req, res, next) => {//token 발급
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
    send: async (req, res, next) => { //발송
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
            let {
                api_key,
                user_id,
                sender, //보내는사람
                receiver, // 받는사람
                msg, // 메세지
                title, // 제목
                button, // 카카오일시 버튼
                token, // 토큰이 필요한 요청일시 token
                senderkey = 'senderkey',
                tpl_code = 'templatecode',
            } = req.body;
            let is_exist_user_key = await pool.query(`SELECT * FROM users WHERE user_name=? AND api_key=? `, [user_id, api_key]);
            if (!(is_exist_user_key?.result.length > 0)) {
                return returnResponse(req, res, -1000)
            }
            let user = is_exist_user_key?.result[0];
            let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
            token_data = token_data?.result[0];
            let obj = {
                ...req.body,
                sender,
                receiver,
                msg,
                title,
                token_data,
                button,
                senderkey,
                tpl_code,
                user_id: user?.id
            }
            let files = req.files;
            if (files?.message_file) {

            }
            let is_multiple = false;
            let receiver_list = receiver.split(',');
            if (receiver_list.length > 1) {
                obj['receiver'] = receiver_list;
                is_multiple = true;
            }
            let result = await send_func_obj['friendtalk'][`${is_multiple ? 'multiple' : 'single'}`](obj);
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
    send_mass: async (req, res, next) => {//각기다른 내용으로 대량
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            let { baseUrl } = req;
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },

}
export default friendtalkCtrl;
