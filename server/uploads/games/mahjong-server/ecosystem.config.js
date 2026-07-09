module.exports = {
    apps: [
        {
            name: "mahjong-http-api",
            script: "mock_http_api.js",
            cwd: ".",
            env: {
                MAHJONG_HTTP_PORT: process.env.MAHJONG_HTTP_PORT || 15103,
                MAHJONG_WS_PORT: process.env.MAHJONG_WS_PORT || 42001,
                MAHJONG_WS_PUBLIC_URL: process.env.MAHJONG_WS_PUBLIC_URL || ""
            },
            merge_logs: true,
            error_file: "./logs/mahjong-http-api/err.log",
            out_file: "./logs/mahjong-http-api/out.log",
            log_date_format: "YYYY-MM-DD HH:mm Z"
        },
        {
            name: "mahjong_game_shqm_server",
            script: "App.js",
            cwd: "./ws_server/mahjong_game_shqm_server",
            env_dev: {
                WS_PORT: process.env.MAHJONG_WS_PORT || 42001,
                H_NODE_ENV: "dev"
            },
            env_test: {
                WS_PORT: process.env.MAHJONG_WS_PORT || 42001,
                H_NODE_ENV: "test"
            },
            env_production: {
                WS_PORT: process.env.MAHJONG_WS_PORT || 42001,
                H_NODE_ENV: "pro"
            },
            instance_var: "INSTANCE_ID",
            min_uptime: "30s",
            max_restarts: 0,
            merge_logs: true,
            error_file: "./ycyGameLogs/mahjong_game_shqm_server/err.log",
            out_file: "./ycyGameLogs/mahjong_game_shqm_server/out.log",
            log_date_format: "YYYY-MM-DD HH:mm Z"
        }
    ]
};
