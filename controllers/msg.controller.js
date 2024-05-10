"use strict";
import db, { pool } from "../config/db.js";
import { MSG_TYPE_LIST, bizppurioApi } from "../utils/bizppurio-util.js";
import {
  checkIsManagerUrl,
  returnMomentOnlyNumber,
} from "../utils/function.js";
import { notiResultFormat } from "../utils/noti-result-format.js";
import {
  deleteQuery,
  getSelectQuery,
  insertQuery,
  selectQuerySimple,
  updateQuery,
} from "../utils/query-util.js";
import send_func_obj from "../utils/send/index.js";
import returnResponse from "../utils/send/response-format.js";
import {
  checkLevel,
  default_permit_ip_list,
  getByteB,
  getReqIp,
  response,
} from "../utils/util.js";
import sharp from "sharp";
import sizeOf from 'image-size';
import fs from 'fs';
import "dotenv/config";
import logger from "../utils/winston/index.js";

const table_name = "msg_logs";

const msgCtrl = {
  list: async (req, res, next) => {
    //전송결과
    try {
      const decode_user = checkLevel(req.cookies.token, 0);
      let { api_key, user_id, page = 1, page_size = 30, s_dt, e_dt, search } = req.body;
      let body = {
        api_key,
        user_id,
        page,
        page_size,
        s_dt,
        e_dt,
        search
      };
      // if (!(page_size >= 10 && page_size <= 1000)) {
      //     return returnResponse(req, res, -998)
      // }
      let is_exist_user_key = await pool.query(
        `SELECT * FROM users WHERE user_name=? AND api_key=? `,
        [user_id, api_key]
      );
      if (!(is_exist_user_key?.result.length > 0)) {
        return returnResponse(req, res, -1000);
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
        `(SELECT SUM(sub_deposits.deposit) FROM deposits sub_deposits WHERE sub_deposits.user_id = deposits.user_id AND sub_deposits.id <= deposits.id ORDER BY sub_deposits.id DESC LIMIT 1) AS cumulative_deposit`,
      ];
      let sql = `SELECT ${process.env.SELECT_COLUMN_SECRET} FROM ${table_name} `;
      sql += ` LEFT JOIN deposits ON deposits.msg_log_id=${table_name}.id `;
      sql += ` WHERE ${table_name}.user_id=${user?.id} AND ${table_name}.type IN (0, 1, 2) `;

      let data = await getSelectQuery(sql, columns, body);
      for (var i = 0; i < data?.content.length; i++) {
        data.content[i]["msg"] = JSON.parse(data.content[i]["msg"]);
        data.content[i]["type"] = MSG_TYPE_LIST[data.content[i]?.type];
      }
      return returnResponse(req, res, 100, data);
    } catch (err) {
      console.log(err);
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
  get: async (req, res, next) => {
    //발송가능건수
    try {
      const decode_user = checkLevel(req.cookies.token, 0);

      return returnResponse(req, res, 100);
    } catch (err) {
      console.log(err);
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
  report: async (req, res, next) => {
    //발송 노티 받는 주소
    try {
      const decode_user = checkLevel(req.cookies.token, 0);
      let result_obj = {
        SMS: {
          success_code: 4100,
        },
        LMS: {
          success_code: 6600,
        },
        MMS: {
          success_code: 6600,
        },
        AT: {
          success_code: 7000,
        },
        AI: {
          success_code: 7000,
        },
        FT: {
          success_code: 7000,
        },
      };
      const {
        DEVICE, //'SMS',
        CMSGID, //'231113153246114sms230073purpo8Ez',
        MSGID, //'1113pu_ED1166095716626218343',
        PHONE, //'01029522667',
        MEDIA, //'SMS',
        UNIXTIME, //'1699857168',
        RESULT, //'4100',
        USERDATA, // '',
        WAPINFO, //'KTF',
        REFKEY, //'16998571660597701029522667'
      } = req.body;
      logger.info(JSON.stringify(req.body));
      let token_data = await pool.query(
        `SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`
      );
      token_data = token_data?.result[0];

      if (RESULT == result_obj[DEVICE]?.success_code) {
        let success_result = await pool.query(
          `UPDATE msg_logs SET code=1000, res_msg=?, msgid=?, status=1 WHERE msg_key=? `,
          ["success", MSGID, CMSGID]
        );
      } else {
        let msg_log = await pool.query(
          `SELECT * FROM msg_logs WHERE msg_key=?`,
          [CMSGID]
        );
        msg_log = msg_log?.result[0];
        let noti_result_format = notiResultFormat;
        let report_description = 'unknown error';
        for (var i = 0; i < noti_result_format.length; i++) {
          let noti_result_format_split_list = noti_result_format[i].split(' ');
          let result_code = noti_result_format_split_list[0];
          if (result_code == RESULT) {
            noti_result_format_split_list.shift();
            report_description = noti_result_format_split_list.join(' ');
          }
        }
        let fail_result = await pool.query(
          `UPDATE msg_logs SET code=${RESULT}, res_msg=?, msgid=?, status=2 WHERE id=${msg_log?.id} `,
          [report_description, MSGID]
        );
        let deposit_log = await pool.query(
          `SELECT * FROM deposits WHERE msg_log_id=${msg_log?.id} `
        );
        deposit_log = deposit_log?.result;
        let fail_deposit_log = await pool.query(
          `SELECT * FROM deposits WHERE msg_log_id=${msg_log?.id} && status=2`
        );
        fail_deposit_log = fail_deposit_log?.result[0];
        if (deposit_log?.length == 1 && !fail_deposit_log) {
          let add_deposit = await pool.query(
            `INSERT INTO deposits (msg_log_id, deposit, brand_deposit, user_id, type, method_type, deposit_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              msg_log?.id,
              -1 * deposit_log[0]?.deposit,
              -1 * deposit_log[0]?.brand_deposit,
              deposit_log[0]?.user_id,
              0,
              2,
              deposit_log[0]?.id,
            ]
          );
        }
      }
      let confirm_result = await bizppurioApi.result.confirm({
        token_data,
        msgid: MSGID
      })
      logger.info(JSON.stringify({
        ...req.body, res: {
          code: 1000,
          message: 'success',
          data: {},
        }
      }));

      return res.status(200).send({
        code: 1000,
        message: 'success',
        data: {},
      })
    } catch (err) {
      console.log(err);
      logger.error(JSON.stringify({
        ...req.body, res: {
          code: -1000,
          message: '',
          data: {},
        }
      }));
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
  remain: async (req, res, next) => {
    //발송가능건수
    try {
      const decode_user = checkLevel(req.cookies.token, 0);
      const { api_key, user_id } = req.body;
      let user_columns = [
        "users.*",
        `(SELECT SUM(deposit) FROM deposits WHERE user_id=users.id) AS total_deposit`,
      ];
      let is_exist_user_key = await pool.query(
        `SELECT ${user_columns.join()} FROM users WHERE user_name=? AND api_key=? `,
        [user_id, api_key]
      );
      if (!(is_exist_user_key?.result.length > 0)) {
        return returnResponse(req, res, -1000);
      }
      let user = is_exist_user_key?.result[0];
      user["setting_obj"] = JSON.parse(user?.setting_obj ?? "{}");
      let user_ips = await pool.query(
        `SELECT * FROM permit_ips WHERE user_id=?`,
        [user?.id]
      );
      user_ips = user_ips?.result;
      user_ips = user_ips.map((ip) => {
        return ip?.ip;
      });
      let requestIp = getReqIp(req);
      if (
        !user_ips.includes(requestIp) &&
        !default_permit_ip_list.includes(requestIp)
      ) {
        return returnResponse(req, res, -996);
      }
      let SMS_CNT = 0;
      let LMS_CNT = 0;
      let MMS_CNT = 0;
      let dns_data = await pool.query(
        `SELECT setting_obj FROM brands WHERE id=${user?.brand_id} `
      );
      dns_data = dns_data?.result[0];

      dns_data["setting_obj"] = JSON.parse(dns_data?.setting_obj ?? "{}");
      let sms_price = user?.setting_obj?.sms || dns_data?.setting_obj?.sms || 1;
      let lms_price = user?.setting_obj?.lms || dns_data?.setting_obj?.lms || 1;
      let mms_price = user?.setting_obj?.mms || dns_data?.setting_obj?.mms || 1;
      SMS_CNT = parseInt(user?.total_deposit / sms_price);
      LMS_CNT = parseInt(user?.total_deposit / lms_price);
      MMS_CNT = parseInt(user?.total_deposit / mms_price);
      let data = {
        SMS_CNT,
        LMS_CNT,
        MMS_CNT,
        TOTAL_DEPOSIT: user?.total_deposit,
      };
      return returnResponse(req, res, 100, data);
    } catch (err) {
      console.log(err);
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
  send: async (req, res, next) => {
    //발송
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
      if (!api_key || !user_id || !sender || !receiver) {
        return returnResponse(req, res, -999);
      }
      let user_columns = [
        "users.*",
        `(SELECT SUM(deposit) FROM deposits WHERE user_id=users.id) AS total_deposit`,
      ];
      let is_exist_user_key = await pool.query(
        `SELECT ${user_columns.join()} FROM users WHERE user_name=? AND api_key=? `,
        [user_id, api_key]
      );
      if (!(is_exist_user_key?.result.length > 0)) {
        return returnResponse(req, res, -1000);
      }
      let user = is_exist_user_key?.result[0];
      user["setting_obj"] = JSON.parse(user?.setting_obj ?? "{}");
      let user_ips = await pool.query(
        `SELECT * FROM permit_ips WHERE user_id=?`,
        [user?.id]
      );
      user_ips = user_ips?.result;
      user_ips = user_ips.map((ip) => {
        return ip?.ip;
      });

      let requestIp = getReqIp(req);
      if (
        !user_ips.includes(requestIp) &&
        !default_permit_ip_list.includes(requestIp)
      ) {
        return returnResponse(req, res, -996);
      }
      let user_senders = await pool.query(
        `SELECT * FROM senders WHERE user_id=? AND status=0 `,
        [user?.id]
      );
      user_senders = user_senders?.result;
      if (
        !user_senders
          .map((sender) => {
            return sender.sender;
          })
          .includes(sender)
      ) {
        return returnResponse(req, res, -995);
      }
      let token_data = await pool.query(
        `SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`
      );
      token_data = token_data?.result[0];
      let dns_data = await pool.query(
        `SELECT setting_obj, bizppurio_obj FROM brands WHERE id=${user?.brand_id} `
      );
      dns_data = dns_data?.result[0];
      dns_data["setting_obj"] = JSON.parse(dns_data?.setting_obj ?? "{}");
      dns_data["bizppurio_obj"] = JSON.parse(dns_data?.bizppurio_obj ?? "{}");

      let obj = {
        ...req.body,
        sender,
        receiver,
        msg,
        title,
        token_data,
        user_id: user?.id,
        dns_data,
        user,
      };

      let files = req.files;
      if (getByteB(msg) > 2000) {
        return returnResponse(req, res, -2503);
      }
      if (files?.image1 || files?.image2 || files?.image3) {
        obj["type"] = "mms"; //
        let req_files = [];
        for (var i = 1; i <= 3; i++) {
          if (files[`image${i}`]) {
            req_files.push(files[`image${i}`][0]);
          }
        }
        let send_file = [];
        for (var i = 0; i < req_files.length; i++) {
          if (req_files[i]?.size > 300 * 1024) {
            return returnResponse(req, res, -4001);
          }
          let image_size = await sizeOf(`${req_files[i].path}`);
          if (image_size.width > 1000 || image_size.height > 1000) {
            return returnResponse(req, res, -4002);
          }
          // let file = req_files[i];
          // let resize_obj = {};
          // let image_size = sizeOf(`${file.path}`);
          // console.log(image_size)
          // if (!(image_size.height < 500 && image_size.width < 500)) {
          //   if (image_size.width >= image_size.height) {
          //     resize_obj = {
          //       width: 499,
          //     }
          //   } else {
          //     resize_obj = {
          //       height: 499,
          //     }
          //   }
          //   await sharp(file.path)  // 압축할 이미지 경로
          //     .resize(resize_obj) // 비율을 유지하며 가로 크기 줄이기
          //     .withMetadata()	// 이미지의 exif데이터 유지
          //     .toBuffer(async (err, buffer) => {
          //       if (err) throw err;
          //       // 압축된 파일 새로 저장(덮어씌우기)
          //       await fs.writeFile(file.path, buffer, (err) => {
          //         if (err) throw err;
          //       });
          //     });
          // }
          let file_result = await bizppurioApi.file({
            file: req_files[i],
            token_data,
          });
          if (file_result?.code == 1000) {
            send_file.push({
              type: "IMG",
              key: file_result?.filekey,
            });
          } else {
            return returnResponse(req, res, -4000);
          }
        }
        obj["file"] = send_file;
      } else {
        if (!msg) {
          return returnResponse(req, res, -999);
        }
        if (getByteB(msg) <= 90) {
          obj["type"] = "sms"; //
          if (title) {
            return returnResponse(req, res, -998);
          }
        } else {
          obj["type"] = "lms"; //
        }
      }
      let is_multiple = false;
      let receiver_list = receiver.split(",");
      if (receiver_list.length > 1) {
        obj["receiver"] = receiver_list;
        is_multiple = true;
      }
      if (
        user?.total_deposit <
        user?.setting_obj[`${obj.type}`] * receiver_list.length
      ) {
        return returnResponse(req, res, -200);
      }
      let result = await send_func_obj["msg"][
        `${is_multiple ? "multiple" : "single"}`
      ](obj);
      if (result) {
        return returnResponse(req, res, 100);
      } else {
        return returnResponse(req, res, -4500);
      }
    } catch (err) {
      console.log(err);
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
  send_mass: async (req, res, next) => {
    //각기다른 내용으로 대량
    try {
      let {
        api_key,
        user_id,
        sender, //보내는사람
        rec_1, // 받는사람
        msg_1, // 메세지
        title, // 제목
      } = req.body;
      if (!api_key || !user_id || !sender || !rec_1) {
        return returnResponse(req, res, -999);
      }
      let user_columns = [
        "users.*",
        `(SELECT SUM(deposit) FROM deposits WHERE user_id=users.id) AS total_deposit`,
      ];
      let is_exist_user_key = await pool.query(
        `SELECT ${user_columns.join()} FROM users WHERE user_name=? AND api_key=? `,
        [user_id, api_key]
      );
      if (!(is_exist_user_key?.result.length > 0)) {
        return returnResponse(req, res, -1000);
      }
      let user = is_exist_user_key?.result[0];
      let user_ips = await pool.query(
        `SELECT * FROM permit_ips WHERE user_id=?`,
        [user?.id]
      );
      user_ips = user_ips?.result;
      user_ips = user_ips.map((ip) => {
        return ip?.ip;
      });
      let requestIp = getReqIp(req);
      if (
        !user_ips.includes(requestIp) &&
        !default_permit_ip_list.includes(requestIp)
      ) {
        return returnResponse(req, res, -996);
      }
      let user_senders = await pool.query(
        `SELECT * FROM senders WHERE user_id=? AND status=0 `,
        [user?.id]
      );
      user_senders = user_senders?.result;
      if (
        !user_senders
          .map((sender) => {
            return sender.sender;
          })
          .includes(sender)
      ) {
        return returnResponse(req, res, -995);
      }
      let token_data = await pool.query(
        `SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`
      );
      token_data = token_data?.result[0];
      let obj = {
        ...req.body,
        sender,
        receiver,
        msg,
        title,
        token_data,
        user_id: user?.id,
      };
    } catch (err) {
      console.log(err);
      return returnResponse(req, res, -5000);
    } finally {
    }
  },
};
export default msgCtrl;
