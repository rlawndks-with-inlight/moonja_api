import express from 'express';
import validate from 'express-validation';
import { msgCtrl } from '../controllers/index.js';

const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1/list')
    .post(msgCtrl.list)
router
    .route('/v1/get')
    .post(msgCtrl.get)
router
    .route('/v1/remain')
    .post(msgCtrl.remain)
router
    .route('/v1/send')
    .post(msgCtrl.send)

router
    .route('/v1/send_mass')
    .post(msgCtrl.send_mass)//각기 다른내용으로 대량

export default router;