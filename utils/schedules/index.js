import schedule from "node-schedule";
import db, { pool } from "../../config/db.js";
import { returnMoment, returnMomentOnlyNumber } from "../function.js";
import { bizppurioApi } from "../bizppurio-util.js";
import { makeObjByList } from "../util.js";

const scheduleIndex = () => {
  schedule.scheduleJob("0 0/1 * * * *", async function () {
    let return_moment = returnMoment();
    let return_moment_number = returnMomentOnlyNumber();
    let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
    token_data = token_data?.result[0];
    let dns_datas = await pool.query(`SELECT * FROM brands `);
    dns_datas = dns_datas?.result;
    for (var i = 0; i < dns_datas.length; i++) {
      dns_datas[i]['theme_css'] = JSON.parse(dns_datas[i]?.theme_css ?? '{}');
      dns_datas[i]['setting_obj'] = JSON.parse(dns_datas[i]?.setting_obj ?? '{}');
    }
    let dns_obj = makeObjByList('id', dns_datas);
    let users = await pool.query(`SELECT * FROM users `);
    users = users?.result;
    let user_obj = makeObjByList('id', users);
    let {
      expired,
      access_token
    } = token_data;
    try {
      if (expired <= parseInt(return_moment_number) + 1000) {
        let result = await bizppurioApi.token();
      }
    } catch (err) {
      console.log(err);
    }
    //  try {
    //      let msg_logs = await pool.query(`SELECT * FROM msg_logs WHERE (created_at >= NOW() - INTERVAL 5 MINUTE ) AND created_at <= NOW() AND status=0 ORDER BY id DESC`);
    //      msg_logs = msg_logs?.result;
    //      let sending_list = [
    //          3011,
    //          3012,
    //          3013,
    //          5000,
    //      ]
    //      for (var i = 0; i < msg_logs.length; i++) {
    //          let report = await bizppurioApi.report({
    //              token_data,
    //              messagekey: msg_logs[i]?.msg_key
    //          })
    //          console.log(report)
    //          if (report.code == 1000) {
    //              let success_result = await pool.query(`UPDATE msg_logs SET code=${report.code}, res_msg=?, status=1 WHERE id=${msg_logs[i]?.id} `, [report?.description])
    //          } else if (sending_list.includes(report.code)) {
    //          } else {
    //              try {
    //                  await db.beginTransaction();
    //                  let fail_result = await pool.query(`UPDATE msg_logs SET code=${report.code}, res_msg=?, status=2 WHERE id=${msg_logs[i]?.id} `, [report?.description]);
    //                  let deposit_log = await pool.query(`SELECT * FROM deposits WHERE msg_log_id=${msg_logs[i]?.id} `);
    //                  deposit_log = deposit_log?.result[0];
    //                  let add_deposit = await pool.query(`INSERT INTO deposits (deposit, user_id, type, method_type, deposit_id) VALUES (?, ?, ?, ?, ?)`, [
    //                      (-1) * deposit_log?.deposit,
    //                      deposit_log?.user_id,
    //                      0,
    //                      2,
    //                      deposit_log?.id
    //                  ]);
    //                  await db.commit();
    //              } catch (err) {
    //                  await db.rollback();
    //              }
    //          }
    //      }
    //  } catch (err) {
    //      console.log(err);
    //  }
  });
};

export default scheduleIndex;
