'use strict';
import async from 'async';

const queue = async.queue(async (task, done) => {
    try{
        let result = await task();
        done(null, result);
    }catch(err){
        done(err);
    }
}, 1)

process.on('SIGTERM', () => {
    // 현재 큐에 대기 중인 작업 처리
    queue.drain(() => {
        console.log('모든 작업이 완료됨. 서버 종료.');
    });
});
export default queue;