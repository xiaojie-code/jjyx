const local = (() => {
    try {
        return require("./local.secrets");
    } catch (error) {
        return {};
    }
})();

const value = (name, fallback) => process.env[name] || local[name] || fallback;

module.exports = {
    isHTTPS: false,
    crt_path: value("MAHJONG_CRT_PATH", "./res/https/192_168_1_107.crt"),
    key_path: value("MAHJONG_KEY_PATH", "./res/https/192_168_1_107.key"),

    mysql_host: value("MAHJONG_MYSQL_HOST", "127.0.0.1"),
    mysql_port: Number(value("MAHJONG_MYSQL_PORT", "3306")),
    mysql_user: value("MAHJONG_MYSQL_USER", "root"),
    mysql_passwd: value("MAHJONG_MYSQL_PASSWORD", ""),
    mysql_db: value("MAHJONG_MYSQL_DATABASE", "xsmj_test"),
    mysql_charset: value("MAHJONG_MYSQL_CHARSET", "utf8mb4_general_ci"),

    oss_keyid: value("MAHJONG_OSS_KEY_ID", ""),
    oss_keysecret: value("MAHJONG_OSS_KEY_SECRET", ""),
    oss_endpoint: value("MAHJONG_OSS_ENDPOINT", ""),
    oss_url: value("MAHJONG_OSS_URL", ""),
    oss_bucketname: value("MAHJONG_OSS_BUCKET", ""),

    redis_host: value("MAHJONG_REDIS_HOST", "127.0.0.1"),
    redis_port: value("MAHJONG_REDIS_PORT", "6379"),
    redis_password: value("MAHJONG_REDIS_PASSWORD", ""),
    redis_db: value("MAHJONG_REDIS_DB", "10")
};
