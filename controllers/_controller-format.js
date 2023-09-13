'use strict';
import { pool } from "../config/db.js";
import { checkIsManagerUrl } from "../utils/function.js";
import { deleteQuery, getSelectQuery, insertQuery, selectQuerySimple, updateQuery } from "../utils/query-util.js";
import returnResponse from "../utils/send/response-format.js";
import { checkDns, checkLevel, response, settingFiles } from "../utils/util.js";
import 'dotenv/config';

const table_name = 'table_name';

const Ctrl = {
    list: async (req, res, next) => {
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            
            const { } = req.query;

            let columns = [
                `${table_name}.*`,
            ]
            let sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM ${table_name} `;

            let data = await getSelectQuery(sql, columns, req.query);
            return returnResponse(req, res, 100, data);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    get: async (req, res, next) => {
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            
            const { id } = req.params;
            let data = await pool.query(`SELECT * FROM ${table_name} WHERE id=${id}`)
            data = data?.result[0];
            return returnResponse(req, res, 100, data);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    create: async (req, res, next) => {
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            
            const {
            } = req.body;
            let files = settingFiles(req.files);
            let obj = {
                name, note, price, category_id
            };

            obj = { ...obj, ...files };

            let result = await insertQuery(`${table_name}`, obj);

            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    update: async (req, res, next) => {
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            
            const {
                id
            } = req.body;
            let files = settingFiles(req.files);
            let obj = {
            };
            obj = { ...obj, ...files };

            let result = await updateQuery(`${table_name}`, obj, id);
            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
    remove: async (req, res, next) => {
        try {
            
            const decode_user = checkLevel(req.cookies.token, 0);
            
            const { id } = req.params;
            let result = await deleteQuery(`${table_name}`, {
                id
            })
            return returnResponse(req, res, 100);
        } catch (err) {
            console.log(err)
            return returnResponse(req, res, -5000)
        } finally {

        }
    },
};

export default Ctrl;
