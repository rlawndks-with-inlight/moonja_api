import express from 'express';
import validate from 'express-validation';
import { alimtalkCtrl } from '../controllers/index.js';

const router = express.Router(); // eslint-disable-line new-cap

router
    .route('/v1/list')
    .post(alimtalkCtrl.list)
router
    .route('/v1/send')
    .post(alimtalkCtrl.send)
router
    .route('/v1/token/create/:num/:num_unit')
    .post(alimtalkCtrl.token)

export default router;
