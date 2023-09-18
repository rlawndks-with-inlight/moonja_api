'use strict';
import 'dotenv/config';
import axios from 'axios';
import { pool } from '../config/db.js';
import { returnMomentOnlyNumber } from './function.js';
import logger from './winston/index.js';
import fs from 'fs';
import FormData from 'form-data';

export const BIZPPURIO_INFO = {
    API_URL: process.env.NODE_ENV == 'development' ? 'https://dev-api.bizppurio.com' : 'https://api.bizppurio.com',
    API_URI: {
        TOKEN: '/v1/token',
        MESSAGE: '/v2/message',
        FILE: '/v2/file',
        REPORT: '/v2/report',
        RESULT: {
            REQUEST: '/v1/result/request ',
            CONFIRM: '/v1/result/confirm'
        }
    },
    ID: 'purplevery2',
    PW: 'qjfwk100djr!',
}
export const MSG_TYPE_LIST = [
    'sms',//0
    'lms',//1
    'mms',//2
    'at',//3
    'ai',//4
]
export const bizppurioApi = {
    token: async () => {
        try {
            let base64 = `${BIZPPURIO_INFO.ID}:${BIZPPURIO_INFO.PW}`;
            base64 = Buffer.from(base64, "utf8").toString('base64');
            const config = {
                headers: {
                    'Authorization': `Basic ${base64}`,
                    'Content-type': 'application/json; charset=utf-8'
                }
            }
            let response = await axios.post(`${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.TOKEN}`, '', config);
            let { accesstoken, expired } = response.data;
            let result = await pool.query(`INSERT INTO bizppurio_tokens (access_token, expired) VALUES (?, ?)`, [
                accesstoken,
                expired
            ])
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    },
    message: async (data) => {
        let {
            token_data,
            type,
            from,
            to,
            content,
            user_id
        } = data;
        let {
            access_token,
            expired,
        } = token_data;
        let obj = {
            account: BIZPPURIO_INFO.ID,
            refkey: 'refkey',
            type,
            from,
            to,
            content,
        }
        try {
            const config = {
                headers: {
                    'Authorization': `Basic ${access_token}`,
                    'Content-type': 'application/json; charset=utf-8'
                }
            }
            let response = await axios.post(`${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.MESSAGE}`, obj, config);
            console.log(response?.data)

            let { code, messagekey, description } = response.data;
            let report_result = await bizppurioApi.report({
                 token_data,
                 messagekey,
            })

            let save_msg_log = await pool.query('INSERT INTO msg_logs (code, type, msg, sender, receiver, msg_key, res_msg, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                code,
                MSG_TYPE_LIST.indexOf(type),
                `${JSON.stringify(content)}`,
                from,
                to,
                messagekey,
                description,
                user_id
            ])
            return response?.data;
        } catch (err) {
            console.log(err?.response?.data)
            logger.error(JSON.stringify(err?.response?.data || err))
            if (err?.response?.data) {
                let {
                    code,
                    description
                } = err?.response?.data
                let save_msg_log = await pool.query('INSERT INTO msg_logs (code, type, msg, sender, receiver, msg_key, res_msg, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                    code,
                    MSG_TYPE_LIST.indexOf(type),
                    `${JSON.stringify(content)}`,
                    from,
                    to,
                    '',
                    description,
                    user_id
                ])
            }
            return err?.response?.data;
        }

    },
    file: async (data) => {
        try {
            let {
                token_data,
                file
            } = data;
            let {
                access_token,
                expired,
            } = token_data;
            let form = new FormData();
            form.append('file', fs.createReadStream(file.path), {
                filename: file.path,
                contentType: 'image/jpg', // 파일 확장자 및 타입 설정
            });
            form.append('account', BIZPPURIO_INFO.ID);
            form.append('sendtime', (new Date().getTime() / 1000).toString());
            const config = {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Basic ${access_token}`,
                    'Content-type': 'multipart/form-data; boundary=5d14-GC42dS9N5BXQAKuhpRfd4VDV54RDDsTJO4',
                }
            }
            let response = await axios.post(`${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.FILE}`, form, config);
            return {
                ...response.data,
                code: 1000
            };
        } catch (err) {
            console.log(err)

            logger.error(JSON.stringify(err?.response?.data || err))
            return err?.response?.data;
        }
    },
    report: async (data) => {
        try {
            let {
                token_data,
                messagekey
            } = data;
            let {
                access_token,
                expired,
            } = token_data;
            const config = {
                headers: {
                    'Authorization': `Basic ${access_token}`,
                    'Content-type': 'application/json',
                }
            }
            let obj = {
                account: BIZPPURIO_INFO.ID,
                messagekey,
            }
            console.log(obj)
            let response = await axios.post(`${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.REPORT}`, obj, config);
            console.log(response?.data)
        } catch (err) {
            console.log(err?.response?.data)

            logger.error(JSON.stringify(err?.response?.data || err))
            return err?.response?.data;
        }
    },
    result: {
        request: async (data) => {
            try {
                let {
                    token_data,
                    messagekey
                } = data;
                let {
                    access_token,
                    expired,
                } = token_data;
                const config = {
                    headers: {
                        'Authorization': `Basic ${access_token}`,
                        'Content-type': 'application/json',
                    }
                }
                console.log(data)
                let obj = {
                    account: BIZPPURIO_INFO.ID,
                    messagekey
                }
                let response = await axios.post(`${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.RESULT.REQUEST}`, obj, config);
                console.log(response)
            } catch (err) {
                console.log(err?.response?.data)

                logger.error(JSON.stringify(err?.response?.data || err))
                return err?.response?.data;
            }
        },
        confirm: async (data) => {
            try {

            } catch (err) {
                console.log(err?.response?.data)

                logger.error(JSON.stringify(err?.response?.data || err))
                return err?.response?.data;
            }
        },
    }
}