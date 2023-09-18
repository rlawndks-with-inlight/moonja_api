
'use strict';
import { pool } from "../config/db.js";
import { bizppurioApi } from "../utils/bizppurio-util.js";
import { checkIsManagerUrl, returnMomentOnlyNumber } from "../utils/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../utils/query-util.js";
import send_func_obj from "../utils/send/index.js";
import returnResponse from "../utils/send/response-format.js";
import { checkLevel, getByteB, getReqIp, response } from "../utils/util.js";
import 'dotenv/config';

const table_name = 'msg_logs';

const msgCtrl = {
    list: async (req, res, next) => {//전송결과
        try {
            const decode_user = checkLevel(req.cookies.token, 0);
            let {
                api_key,
                user_id,
                page = 1,
                page_size = 30,
                s_dt,
                e_dt,
            } = req.body;
            let body = {
                api_key,
                user_id,
                page,
                page_size,
                s_dt,
                e_dt,
            }
            if (!(page_size >= 30 && page_size <= 500)) {
                return returnResponse(req, res, -998)
            }
            let is_exist_user_key = await pool.query(`SELECT * FROM users WHERE user_name=? AND api_key=? `, [user_id, api_key]);
            if (!(is_exist_user_key?.result.length > 0)) {
                return returnResponse(req, res, -1000)
            }
            let user = is_exist_user_key?.result[0];
            let columns = [
                `${table_name}.code`,
                `${table_name}.type`,
                `${table_name}.msg`,
                `${table_name}.sender`,
                `${table_name}.receiver`,
                `${table_name}.msg_key`,
                `${table_name}.res_msg`,
                `${table_name}.created_at`,
            ]
            let sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM ${table_name} `;
            sql += ` WHERE ${table_name}.user_id=${user?.id} AND ${table_name}.type IN (0, 1, 2) `;
            if (s_dt && e_dt) {
                sql += ` AND (created_at BETWEEN '${s_dt} 00:00:00' AND '${e_dt} 23:59:59') `;
            } else {
                if (s_dt) {
                    sql += ` AND created_at >= '${s_dt} 00:00:00' `;
                }
                if (e_dt) {
                    sql += ` AND created_at <= '${e_dt} 23:59:59' `;
                }
            }

            let data = await getSelectQuery(sql, columns, body);
            for (var i = 0; i < data?.content.length; i++) {
                data.content[i]['msg'] = JSON.parse(data.content[i]['msg'])
            }
            return returnResponse(req, res, 100, data);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    token: async (req, res, next) => {//token 발급
        try {

            const decode_user = checkLevel(req.cookies.token, 0);

            const { } = req.query;

            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    remain: async (req, res, next) => {//발송가능건수
        try {

            const decode_user = checkLevel(req.cookies.token, 0);


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

            let {
                api_key,
                user_id,
                sender, //보내는사람
                receiver, // 받는사람
                msg, // 메세지
                title, // 제목
            } = req.body;
            if (
                !api_key ||
                !user_id ||
                !sender ||
                !receiver
            ) {
                return returnResponse(req, res, -999)
            }
            let user_columns = [
                'users.*',
                `(SELECT SUM(deposit) FROM deposits WHERE user_id=users.id) AS total_deposit`,
            ]
            let is_exist_user_key = await pool.query(`SELECT ${user_columns.join()} FROM users WHERE user_name=? AND api_key=? `, [user_id, api_key]);
            if (!(is_exist_user_key?.result.length > 0)) {
                return returnResponse(req, res, -1000)
            }
            let user = is_exist_user_key?.result[0];
            console.log(user)
            let user_ips = await pool.query(`SELECT * FROM permit_ips WHERE user_id=?`, [user?.id]);
            user_ips = user_ips?.result;
            user_ips = user_ips.map(ip => { return ip?.ip });
            let requestIp = getReqIp(req);
            if (!user_ips.includes(requestIp) && requestIp != '::1') {
                return returnResponse(req, res, -996)
            }
            let user_senders = await pool.query(`SELECT * FROM senders WHERE user_id=? AND status=0 `, [user?.id]);
            user_senders = user_senders?.result;
            if (!user_senders.map(sender => { return sender.sender }).includes(sender)) {
                return returnResponse(req, res, -995)
            }
            let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
            token_data = token_data?.result[0];
            let obj = {
                ...req.body,
                sender,
                receiver,
                msg,
                title,
                token_data,
                user_id: user?.id,
            }
            let files = req.files;
            if (getByteB(msg) > 2000) {
                return returnResponse(req, res, -2503)
            }
            if (files?.image1 || files?.image2 || files?.image3) {
                obj['type'] = 'mms';//
                let req_files = [];
                for (var i = 1; i <= 3; i++) {
                    if (files[`image${i}`]) {
                        req_files.push(files[`image${i}`][0])
                    }
                }
                let send_file = [];
                for (var i = 0; i < req_files.length; i++) {
                    if (req_files[i]?.size > 300 * 1024) {
                        return returnResponse(req, res, -4001)
                    }
                    console.log(req_files[i])
                    let file_result = await bizppurioApi.file({
                        file: req_files[i],
                        token_data
                    });
                    if (file_result?.code == 1000) {
                        send_file.push({
                            type: 'IMG',
                            key: file_result?.filekey
                        })
                    } else {
                        return returnResponse(req, res, -4000)
                    }
                }
                obj['file'] = send_file;
            } else {
                if (!msg) {
                    return returnResponse(req, res, -999)
                }
                if (getByteB(msg) <= 90) {
                    obj['type'] = 'sms';//
                    console.log(getByteB(msg))
                    console.log(req.body)
                    if (title) {
                        return returnResponse(req, res, -998)
                    }
                } else {
                    obj['type'] = 'lms';//

                }
            }
            let is_multiple = false;
            let receiver_list = receiver.split(',');
            if (receiver_list.length > 1) {
                obj['receiver'] = receiver_list;
                is_multiple = true;
            }
            let result = await send_func_obj['msg'][`${is_multiple ? 'multiple' : 'single'}`](obj);
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
export default msgCtrl;
