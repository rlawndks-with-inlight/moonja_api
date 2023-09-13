import express from 'express';
import validate from 'express-validation';
import { friendtalkCtrl } from '../controllers/index.js';

const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1/list')
    .post(friendtalkCtrl.list)

router
    .route('/v1/send')
    .post(friendtalkCtrl.send)
router
    .route('/v1/send_mass')
    .post(friendtalkCtrl.send_mass)//각기 다른내용으로 대량

export default router;
