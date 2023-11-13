import express from "express";
import msgRoutes from "./msg.route.js";
import alimtalkRoutes from "./alimtalk.route.js";
import friendtalkRoutes from "./friendtalk.route.js";

const router = express.Router({ mergeParams: true }); // eslint-disable-line new-cap

/** GET /health-check - Check service health */

// tables

//moonjs
router.use("/msg", msgRoutes);
router.use("/alimtalk", alimtalkRoutes);
router.use("/friendtalk", friendtalkRoutes);

//auth

//util

export default router;
