import schedule from 'node-schedule';
import { pool } from '../../config/db.js';
import { returnMoment, returnMomentOnlyNumber } from '../function.js';
import { bizppurioApi } from '../bizppurio-util.js';

const scheduleIndex = () => {
    schedule.scheduleJob('0 0/1 * * * *', async function () {
        let return_moment = returnMoment();
        let return_moment_number = returnMomentOnlyNumber();
        try{
            let token_data = await pool.query(`SELECT * FROM bizppurio_tokens ORDER BY id DESC LIMIT 1`);
            token_data = token_data?.result[0];
            let token_expired = parseInt(token_data?.expired);
            if(token_expired  <= parseInt(return_moment_number) + 1000){
                let result = await bizppurioApi.token();
            }
        }catch(err){
            console.log(err);
        }
       
      
    })
}

export default scheduleIndex;