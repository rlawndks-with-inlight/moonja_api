"use strict";
import "dotenv/config";
import axios from "axios";
import db, { pool } from "../config/db.js";
import { returnMomentOnlyNumber } from "./function.js";
import logger from "./winston/index.js";
import fs from "fs";
import FormData from "form-data";
import sharp from "sharp";
import sizeOf from 'image-size';

export const BIZPPURIO_INFO = {
  API_URL:
    process.env.NODE_ENV == "development"
      ? "https://dev-api.bizppurio.com"
      : "https://api.bizppurio.com",
  API_URI: {
    TOKEN: "/v1/token",
    MESSAGE: "/v2/message",
    FILE: "/v2/file",
    REPORT: "/v2/report",
    RESULT: {
      REQUEST: "/v1/result/request ",
      CONFIRM: "/v1/result/confirm",
    },
  },
  ID: "purplevery2",
  PW: "qjfwk100djr!",
};
export const MSG_TYPE_LIST = [
  "sms", //0
  "lms", //1
  "mms", //2
  "at", //3
  "ai", //4
];
export const bizppurioApi = {
  token: async () => {
    try {
      let base64 = `${BIZPPURIO_INFO.ID}:${BIZPPURIO_INFO.PW}`;
      base64 = Buffer.from(base64, "utf8").toString("base64");
      const config = {
        headers: {
          Authorization: `Basic ${base64}`,
          "Content-type": "application/json; charset=utf-8",
        },
      };
      let response = await axios.post(
        `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.TOKEN}`,
        "",
        config
      );
      let { accesstoken, expired } = response.data;
      let result = await pool.query(
        `INSERT INTO bizppurio_tokens (access_token, expired) VALUES (?, ?)`,
        [accesstoken, expired]
      );
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  message: async (data) => {
    let { token_data, type, from, to, content, user_id, dns_data, user } = data;
    let { access_token, expired } = token_data;
    let refkey = `${new Date().getTime()}${user_id}${to}`;
    let obj = {
      account: BIZPPURIO_INFO.ID,
      refkey: refkey,
      type,
      from,
      to,
      content,
    };
    try {
      const config = {
        headers: {
          Authorization: `Basic ${access_token}`,
          "Content-type": "application/json; charset=utf-8",
        },
      };
      let response = await axios.post(
        `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.MESSAGE}`,
        obj,
        config
      );
      let { code, messagekey, description } = response.data;
      try {
        let save_msg_log = await pool.query(
          "INSERT INTO msg_logs (code, type, msg, sender, receiver, msg_key, res_msg, user_id, ref_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            500,
            MSG_TYPE_LIST.indexOf(type),
            `${JSON.stringify(content)}`,
            from,
            to,
            messagekey,
            "전송중",
            user_id,
            refkey,
          ]
        );
        if (user?.setting_obj[`${type}`] > 0) {
          let subtract_deposit = await pool.query(
            `INSERT INTO deposits (msg_log_id, deposit, brand_deposit, user_id, type, method_type) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              save_msg_log?.result?.insertId,
              -1 * (user?.setting_obj[`${type}`] ?? 0),
              -1 * (dns_data?.bizppurio_obj[`${type}`] ?? 0),
              user?.id,
              1,
              2,
            ]
          );
        }

      } catch (err) {

      }
      return response?.data;
    } catch (err) {
      console.log(err)
      console.log(err?.response?.data);
      logger.error(JSON.stringify(err?.response?.data || err));
      if (err?.response?.data) {
        let { code, description } = err?.response?.data;
        let save_msg_log = await pool.query(
          "INSERT INTO msg_logs (code, type, msg, sender, receiver, msg_key, res_msg, user_id, status, ref_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            code,
            MSG_TYPE_LIST.indexOf(type),
            `${JSON.stringify(content)}`,
            from,
            to,
            "전송실패",
            description,
            user_id,
            2,
            refkey,
          ]
        );
      }
      return err?.response?.data;
    }
  },
  file: async (data) => {
    try {
      let { token_data, file } = data;
      let { access_token, expired } = token_data;
      let form = new FormData();

      form.append("file", fs.createReadStream(file.path), {
        filename: file.path,
        contentType: "image/jpeg", // 파일 확장자 및 타입 설정
      });
      form.append("account", BIZPPURIO_INFO.ID);
      form.append("sendtime", (new Date().getTime() / 1000).toString());
      const config = {
        headers: {
          ...form.getHeaders(),
          Authorization: `Basic ${access_token}`,
          "Content-type":
            "multipart/form-data; boundary=5d14-GC42dS9N5BXQAKuhpRfd4VDV54RDDsTJO4",
        },
      };
      let response = await axios.post(
        `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.FILE}`,
        form,
        config
      );
      return {
        ...response.data,
        code: 1000,
      };
    } catch (err) {
      //console.log(err);

      logger.error(JSON.stringify(err?.response?.data || err));
      return err?.response?.data;
    }
  },
  report: async (data) => {
    try {
      let { token_data, messagekey } = data;
      let { access_token, expired } = token_data;
      const config = {
        headers: {
          Authorization: `Basic ${access_token}`,
          "Content-type": "application/json",
        },
      };
      let obj = {
        account: BIZPPURIO_INFO.ID,
        messagekey,
      };
      let response = await axios.post(
        `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.REPORT}`,
        obj,
        config
      );
      return {
        ...response.data,
        code: 1000,
      };
    } catch (err) {
      console.log(err?.response?.data);

      logger.error(JSON.stringify(err?.response?.data || err));
      return err?.response?.data;
    }
  },
  result: {
    request: async (data) => {
      try {
        let { token_data, messagekey } = data;
        let { access_token, expired } = token_data;
        const config = {
          headers: {
            Authorization: `Basic ${access_token}`,
            "Content-type": "application/json",
          },
        };
        let obj = {
          account: BIZPPURIO_INFO.ID,
          messagekey,
        };
        let response = await axios.post(
          `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.RESULT.REQUEST}`,
          obj,
          config
        );
      } catch (err) {
        console.log(err?.response?.data);

        logger.error(JSON.stringify(err?.response?.data || err));
        return err?.response?.data;
      }
    },
    confirm: async (data) => {
      try {
        let { token_data, msgid } = data;
        let { access_token, expired } = token_data;

        const config = {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-type": "application/json",
          },
        };
        let obj = {
          account: BIZPPURIO_INFO.ID,
          msgid: [
            { msgid: msgid }
          ],
        };
        let response = await axios.post(
          `${BIZPPURIO_INFO.API_URL}${BIZPPURIO_INFO.API_URI.RESULT.CONFIRM}`,
          obj,
          config
        );
        console.log(response)
      } catch (err) {
        console.log(err?.response?.data);
        logger.error(JSON.stringify(err?.response?.data || err));
        return err?.response?.data;
      }
    },
  },
};
