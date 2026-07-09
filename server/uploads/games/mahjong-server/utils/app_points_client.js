const http = require('http');
const https = require('https');
const { URL } = require('url');

function normalizeBaseUrl(baseUrl) {
    var text = String(baseUrl || '').trim();
    if (!text) return '';
    text = text.replace(/\/+$/, '');
    if (text.toLowerCase().endsWith('/api')) {
        text = text.slice(0, -4);
    }
    return text;
}

function postJson(url, token, payload) {
    return new Promise((resolve, reject) => {
        let target;
        try {
            target = new URL(url);
        } catch (error) {
            reject(error);
            return;
        }

        const body = JSON.stringify(payload || {});
        const transport = target.protocol === 'https:' ? https : http;
        const req = transport.request({
            method: 'POST',
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: target.pathname + target.search,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': 'Bearer ' + token,
            },
            timeout: 8000,
        }, (res) => {
            let chunks = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => chunks += chunk);
            res.on('end', () => {
                let data = {};
                try {
                    data = chunks ? JSON.parse(chunks) : {};
                } catch (error) {
                    reject(error);
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error('APP points HTTP ' + res.statusCode + ': ' + chunks));
                    return;
                }
                if (data && typeof data.code !== 'undefined' && Number(data.code) !== 0) {
                    reject(new Error(data.message || ('APP points code ' + data.code)));
                    return;
                }
                resolve(data && data.data ? data.data : data);
            });
        });

        req.on('timeout', () => {
            req.destroy(new Error('APP points request timeout'));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function changePoints(context, amount, reason, extra) {
    context = context || {};
    const baseUrl = normalizeBaseUrl(context.apiBaseUrl);
    const gameId = String(context.gameId || '').trim();
    const token = String(context.token || '').trim();
    if (!baseUrl || !gameId || !token) {
        return Promise.reject(new Error('APP points context missing'));
    }
    const url = baseUrl + '/api/game/' + encodeURIComponent(gameId) + '/points/change';
    const payload = Object.assign({}, extra || {}, {
        amount: amount,
        reason: reason,
    });
    return postJson(url, token, payload);
}

module.exports = {
    changePoints,
};
