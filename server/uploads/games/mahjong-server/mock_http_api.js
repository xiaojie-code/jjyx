/**
 * 本地开发 HTTP API Mock 服务 — port 15103
 * token 格式: "dev_{uid}"，WS 服务端 isLogin dev 模式直接解析，无需 Redis
 */
const http = require('http');

const tokens = {}; // token → uid
const friendRooms = {}; // roomid -> true，本地 mock 用于校验好友房是否存在
let uidCounter = 1000;

function ok(res, data) {
    const body = JSON.stringify({ code: 200, message: 'ok', data: data || {} });
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
    });
    res.end(body);
}

// 返回自定义业务码（HTTP 仍为 200，body.code 为业务码）
function sendCode(res, code, message, data) {
    const body = JSON.stringify({ code: code, message: message || '', data: data || {} });
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
    });
    res.end(body);
}

function parseBody(req) {
    return new Promise(resolve => {
        let s = '';
        req.on('data', c => s += c);
        req.on('end', () => {
            const p = {};
            s.split('&').forEach(pair => {
                const i = pair.indexOf('=');
                if (i > 0) p[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
            });
            resolve(p);
        });
    });
}

const HTTP_PORT = Number(process.env.MAHJONG_HTTP_PORT || 15103);
const WS_PORT = Number(process.env.MAHJONG_WS_PORT || 42001);
const WS_ADDR = process.env.MAHJONG_WS_PUBLIC_URL || `http://localhost:${WS_PORT}`;
const SERVER_HOST_VO = [
    { constant: 125, address: WS_ADDR },
    { constant: 127, address: WS_ADDR },
    { constant: 128, address: WS_ADDR },
];

http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
        return res.end();
    }

    const body = await parseBody(req);
    const path = req.url.split('?')[0];
    console.log(`[mock] ${req.method} ${path}`);

    switch (path) {
        case '/cloudgameapi/system/getInitConfig':
            return ok(res, { serverHostVO: SERVER_HOST_VO, systemEnableMgrVO_list: [], wxShareMgrVO: {}, gameMgrVO: {} });

        case '/cloudgameapi/account/visitor_login': {
            const uid = ++uidCounter;
            const token = 'dev_' + uid;
            tokens[token] = uid;
            return ok(res, { token });
        }

        case '/cloudgameapi/account/login': {
            const uid = ++uidCounter;
            const token = 'dev_' + uid;
            tokens[token] = uid;
            return ok(res, { token });
        }

        case '/cloudgameapi/account/getLoginInfoByToken': {
            const token = body.token || req.headers['token'] || '';
            const uid = tokens[token] || 9999;
            return ok(res, {
                userBaseinfo: {
                    id: uid,
                    user_account_id: 'U' + uid,
                    nick_name: '游客' + uid,
                    head_img_url: '',
                    gold: 99999,
                    beans: 99999,
                    diamond: 999,
                    voucher: 0,
                    invite_code: 'DEV' + uid,
                    sex: 0,
                },
                roomid: null,
            });
        }

        case '/cloudgameapi/room/createRoom':
            return ok(res, { roomid: String(Math.floor(Math.random() * 90000) + 10000) });

        case '/cloudgameapi/room/joinRoom': {
            const roomid = body.roomid || null;
            const isCreateFriend = body.is_create_friend === 'true' || body.is_create_friend === true || body.is_create_friend === '1';
            if (!roomid) {
                return sendCode(res, 403, '参数为空或错误！', {});
            }
            if (isCreateFriend) {
                friendRooms[roomid] = true;
                return ok(res, { roomid });
            }
            if (!friendRooms[roomid]) {
                return sendCode(res, 600, '房间不存在~！', { roomid });
            }
            return ok(res, { roomid });
        }

        case '/cloudgameapi/room/isOnline':
            // 用户当前不在任何房间中：返回非成功码(非200/非401)，
            // 客户端 btn_jrfj 会走 default 分支弹出"加入房间"输入框，而不是拿空 roomid 去重连
            return sendCode(res, 10087, '未在房间中', { isOnline: false });

        default:
            return ok(res, {});
    }
}).listen(HTTP_PORT, () => console.log(`[mock_http_api] listening on :${HTTP_PORT}`));
