module.exports = {
    apps : [
      {
        name      :"api-server",
        script    : "index.js",
        instances : "4",
        exec_mode : "cluster",
        wait_ready: true,
        listen_timeout: 50000,
        kill_timeout: 5000,
        watch: true, // 파일이 변경되었을 때 재시작 할지 선택
      }
    ]
  }