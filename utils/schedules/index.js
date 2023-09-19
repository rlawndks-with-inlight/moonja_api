import schedule from 'node-schedule';
import { pool } from '../../config/db.js';
import { returnMoment, returnMomentOnlyNumber } from '../function.js';
import { bizppurioApi } from '../bizppurio-util.js';

const scheduleIndex = () => {
    schedule.scheduleJob('0 0/1 * * * *', async function () {
        let return_moment = returnMoment();
        let return_moment_number = returnMomentOnlyNumber();
        let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
        token_data = token_data?.result[0];
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

        try {
            let msg_logs = await pool.query(`SELECT * FROM msg_logs WHERE (created_at >= NOW() - INTERVAL 5 MINUTE) AND status=0 ORDER BY id DESC`);
            msg_logs = msg_logs?.result;
            console.log(msg_logs)
            let sending_list = [
                3011,
                3012,
                3013,
                5000,
            ]
            for (var i = 0; i < msg_logs.length; i++) {
                let report = await bizppurioApi.report({
                    token_data,
                    messagekey: msg_logs[i]?.msg_key
                })
                if(report.code == 1000){
                    let success_result = await pool.query(`UPDATE msg_logs SET code=${report.code}, res_msg=?, status=1 WHERE id=${msg_logs[i]?.id} `,[report?.description])
                }else if(sending_list.includes(report.code)){

                }else{
                    let fail_result = await pool.query(`UPDATE msg_logs SET code=${report.code}, res_msg=?, status=2 WHERE id=${msg_logs[i]?.id} `,[report?.description])
                }
            }
        } catch (err) {

        }

    })
}

export default scheduleIndex;