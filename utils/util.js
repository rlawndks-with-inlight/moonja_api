import crypto from "crypto";
import util from "util";
import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { readSync } from "fs";
import when from "when";
import { returnMoment } from "./function.js";
import xlsx from 'xlsx';
import axios from "axios";
import _ from "lodash";

const randomBytesPromise = util.promisify(crypto.randomBytes);
const pbkdf2Promise = util.promisify(crypto.pbkdf2);

const createSalt = async () => {
  const buf = await randomBytesPromise(64);
  return buf.toString("base64");
};
export const createHashedPassword = async (password, salt_) => {
  let salt = salt_;
  if (!salt) {
    salt = await createSalt();
  }
  const key = await pbkdf2Promise(password, salt, 104906, 64, "sha512");
  const hashedPassword = key.toString("base64");
  return { hashedPassword, salt };
};
export const makeUserToken = (obj) => {
  let token = jwt.sign({ ...obj }, process.env.JWT_SECRET, {
    expiresIn: "180m",
    issuer: "fori",
  });
  return token;
};
export const checkLevel = (token, level) => {
  //유저 정보 뿌려주기
  try {
    if (token == undefined) return false;

    //const decoded = jwt.decode(token)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      (err, decoded) => {
        //console.log(decoded)
        if (err) {
          console.log("token이 변조되었습니다." + err);
          return false;
        } else return decoded;
      }
    );
    const user_level = decoded.level;
    if (level > user_level) return false;
    else return decoded;
  } catch (err) {
    console.log(err);
    return false;
  }
};
export const checkDns = (token) => {
  //dns 정보 뿌려주기
  try {
    if (token == undefined) return false;

    //const decoded = jwt.decode(token)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      (err, decoded) => {
        //console.log(decoded)
        if (err) {
          console.log("token이 변조되었습니다." + err);
          return false;
        } else return decoded;
      }
    );
    const user_level = decoded.level;
    if (decoded?.id) return decoded;
    else return false;
  } catch (err) {
    console.log(err);
    return false;
  }
};
const logRequestResponse = async (req, res, decode_user, decode_dns) => {
  //로그찍기
  let requestIp;
  try {
    requestIp =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip ||
      "0.0.0.0";
  } catch (err) {
    requestIp = "0.0.0.0";
  }
  let request = {
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body,
    method: req.method,
    file: req.file || req.files || null,
  };
  if (request.url.includes("/logs")) {
    return true;
  }
  request = JSON.stringify(request);
  let user_id = 0;
  if (decode_user && !isNaN(parseInt(decode_user?.id))) {
    user_id = decode_user?.id;
  } else {
    user_id = -1;
  }
  let brand_id = -1;
  // let result = await pool.query(
  //     "INSERT INTO logs (request, response_data, response_result, response_message, request_ip, user_id) VALUES (?, ?, ?, ?, ?, ?)",
  //     [request, JSON.stringify(res?.data), res?.result, res?.message, requestIp, user_id]
  // )
};
export const response = async (req, res, code, message, data) => {
  //응답 포맷
  var resDict = {
    code: code,
    message: message,
    data: data,
  };
  const decode_user = checkLevel(req.cookies.token, 0);
  const decode_dns = checkLevel(req.cookies.dns, 0);
  let save_log = await logRequestResponse(
    req,
    resDict,
    decode_user,
    decode_dns
  );

  res.send(resDict);
};
export const lowLevelException = (req, res) => {
  return response(req, res, -150, "권한이 없습니다.", false);
};
export const isItemBrandIdSameDnsId = (decode_dns, item) => {
  return decode_dns?.id == item?.brand_id;
};
export const settingFiles = (obj = {}) => {
  let keys = Object.keys(obj);
  let result = {};
  for (var i = 0; i < keys.length; i++) {
    let file = obj[keys[i]][0];
    let key = `${keys[i].split("_file")[0]}_img`;
    if (!file) {
      continue;
    }
    let is_multiple = false;

    if (obj[keys[i]].length > 1) {
      is_multiple = true;
    }
    if (is_multiple) {
      let files = obj[keys[i]];
      result[key] = [];
      for (var i = 0; i < files.length; i++) {
        let file = files[i];
        file.destination = "files/" + file.destination.split("files/")[1];
        result[key].push(
          (process.env.NODE_ENV == "development"
            ? process.env.BACK_URL_TEST
            : process.env.BACK_URL) +
          "/" +
          file.destination +
          file.filename
        );
      }
    } else {
      file.destination = "files/" + file.destination.split("files/")[1];
      result[key] =
        (process.env.NODE_ENV == "development"
          ? process.env.BACK_URL_TEST
          : process.env.BACK_URL) +
        "/" +
        file.destination +
        file.filename;
    }
  }
  return result;
};
export const default_permit_ip_list = [
  "::1",
  "115.71.53.78",
  "115.71.53.79",
  "115.71.53.94",
  "115.71.53.95",
  "183.107.112.147",
  "121.183.143.103",
];
export const imageFieldList = [
  "message_file",
  "profile_file",
  "image1",
  "image2",
  "image3",
].map((field) => {
  return {
    name: field,
  };
});
export function getByteB(str) {
  var byte = 0;

  for (var i = 0; i < str.length; ++i) {
    // 기본 한글 2바이트 처리

    str.charCodeAt(i) > 127 ? (byte += 2) : byte++;
  }
  return byte;
}
export const dateAdd = (s_d_, second, type) => {
  let s_d = new Date(s_d_).getTime();
  let plus_second = second * 1000;
  if (type == "s") {
    plus_second = plus_second;
  } else if (type == "m") {
    plus_second = plus_second * 60;
  } else if (type == "h") {
    plus_second = plus_second * 60 * 60;
  } else if (type == "d") {
    plus_second = plus_second * 60 * 60 * 24;
  } else if (type == "m") {
    plus_second = plus_second * 60 * 60 * 24 * 30;
  } else if (type == "y") {
    plus_second = plus_second * 60 * 60 * 24 * 365;
  } else {
    return false;
  }
  let result = s_d + plus_second;
  return returnMoment(result);
};

export const subtractMinus = (s_d_, second, type) => {
  let s_d = new Date(s_d_).getTime();
  let minus_second = second * 1000;
  if (type == "s") {
    minus_second = minus_second;
  } else if (type == "m") {
    minus_second = minus_second * 60;
  } else if (type == "h") {
    minus_second = minus_second * 60 * 60;
  } else if (type == "d") {
    minus_second = minus_second * 60 * 60 * 24;
  } else if (type == "m") {
    minus_second = minus_second * 60 * 60 * 24 * 30;
  } else if (type == "y") {
    minus_second = minus_second * 60 * 60 * 24 * 365;
  } else {
    return false;
  }
  let result = s_d - minus_second;

  return returnMoment(result);
};
export const differenceTwoDate = (s_d_, e_d_) => {
  // 'yyyy-mm-dd hh:mm:ss' 로 받음
  let s_d = new Date(s_d_).getTime();
  let e_d = new Date(e_d_).getTime();
  let second = (s_d - e_d) / 1000;
  return second;
};
export const getReqIp = (req) => {
  let requestIp;
  try {
    requestIp =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip ||
      "0.0.0.0";
  } catch (err) {
    requestIp = "0.0.0.0";
  }
  requestIp = requestIp.replaceAll("::ffff:", "");
  return requestIp;
};
export const makeObjByList = (key, list = []) => {
  let obj = {};
  for (var i = 0; i < list.length; i++) {
    if (!obj[list[i][key]]) {
      obj[list[i][key]] = [];
    }
    obj[list[i][key]].push(list[i]);
  }
  return obj;
};
const asdsadsa = async () => {
  try {
    const workbook = xlsx.readFile('./asd.xlsx'); // 액샐 파일 읽어오기
    const firstSheetName = workbook.SheetNames[0]; // 첫 번째 시트 이름 가져오기
    const firstShee = workbook.Sheets[firstSheetName]; // 시트 이름을 이용해 엑셀 파일의 첫 번째 시트 가져오기

    const excel_list = xlsx.utils.sheet_to_json(firstShee).filter(el => el['서비스'] == 'M' && el.callback == '0260117050');
    console.log(excel_list.length);
    let ing_list = await pool.query(`SELECT * FROM msg_logs WHERE sender='0260117050' AND code=500 ORDER BY id DESC`);
    ing_list = ing_list?.result;

    let set_list = excel_list.map(itm => itm['결과코드']);
    set_list = new Set(set_list);
    console.log(set_list);
    let result_obj = {
      '전달': 6600,
      'NPDB에러': 6625,
      '타임 아웃': 6601,
      '기타 에러': 7300,
      '서비스 일시 정지': 6607,
      '기타 단말기 문제': 6608,
      '서비스 불가 단말기': 6613,
      '핸드폰 호 불가 상태': 6614,
    }
    //스텔라전용

    for (var i = 4000; i < excel_list.length; i++) {
      if (_.find(ing_list, { msg_key: excel_list[i]?.cmsgid }) && result_obj[excel_list[i]['결과코드']] == '전달') {
        await sendAPi({
          DEVICE: 'MMS',
          CMSGID: excel_list[i]['cmsgid'],
          MSGID: excel_list[i]['msgid'],
          RESULT: result_obj[excel_list[i]['결과코드']],
        });

      }
      if (i % 1000 == 0) {
        console.log(i);
      }
    }
    console.log('success')
  } catch (err) {
    console.log(err);
  }
}
const sendAPi = async (obj) => {
  let { data: response } = await axios.post(`https://api.bonaeja.com/api/msg/v1/report`, obj)
  console.log(response);
}