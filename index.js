"use strict";

import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import path from "path";
import "dotenv/config";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import http from "http";
import https from "https";
import scheduleIndex from "./utils/schedules/index.js";
import upload from "./config/multerConfig.js";
import { imageFieldList } from "./utils/util.js";
import { fileURLToPath } from "url";
import fs from "fs";
import cluster from "cluster";
import { cpus } from "os";
const numCPUs = cpus().length;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

app.use("/files", express.static(__dirname + "/files"));
app.use("/api", upload.fields(imageFieldList), routes);

app.get("/", (req, res) => {
  console.log("back-end initialized");
  res.send("back-end initialized");
});

app.use((req, res, next) => {
  const err = new APIError("API not found", httpStatus.NOT_FOUND);
  return next(err);
});
let server = undefined;
const HTTP_PORT = 8080;
const HTTPS_PORT = 443;
if (process.env.NODE_ENV == "development") {
  server = http.createServer(app).listen(HTTP_PORT, function () {
    console.log("**-------------------------------------**");
    console.log(`====      Server is On ${HTTP_PORT}...!!!    ====`);
    console.log("**-------------------------------------**");
  });
} else {
  const options = {
    // letsencrypt로 받은 인증서 경로를 입력해 줍니다.
    ca: fs.readFileSync("/etc/letsencrypt/live/api.bonaeja.com/fullchain.pem"),
    key: fs.readFileSync("/etc/letsencrypt/live/api.bonaeja.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/api.bonaeja.com/cert.pem"),
  };
  server = https.createServer(options, app).listen(HTTPS_PORT, function () {
    console.log("**-------------------------------------**");
    console.log(`====      Server is On ${HTTPS_PORT}...!!!    ====`);
    console.log("**-------------------------------------**");
    scheduleIndex();
  });
}
