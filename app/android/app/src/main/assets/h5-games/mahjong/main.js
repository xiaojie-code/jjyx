(function () {
    var settledRequests = {};

    function pickPoints(data) {
        if (!data) return null;
        var keys = ['points', 'balance', 'coin', 'score', 'integral', 'credits', 'point', 'pointBalance', 'userPoints', 'gold', 'beans', 'diamond'];
        for (var i = 0; i < keys.length; i++) {
            var value = data[keys[i]];
            if (value !== undefined && value !== null && value !== '') {
                var points = Number(value);
                if (isFinite(points)) return points;
            }
        }
        return null;
    }

    function hasAppBridge() {
        return !!(window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === 'function');
    }

    function postGameMessage(action, data) {
        if (!hasAppBridge()) return false;
        try {
            window.flutter_inappwebview.callHandler('gameMessage', JSON.stringify({
                action: action,
                data: data || {}
            }));
            return true;
        } catch (error) {
            console.warn('[mahjong] app bridge failed', error);
            return false;
        }
    }

    function requestBalance() {
        postGameMessage('getBalance', {});
    }

    function queueRequestBalance() {
        [150, 600, 1500, 3000].forEach(function (delay) {
            window.setTimeout(requestBalance, delay);
        });
    }

    function formatPoints(points) {
        var value = Number(points);
        if (!isFinite(value)) return String(points || 0);
        if (Math.trunc) return String(Math.trunc(value));
        return String(value < 0 ? Math.ceil(value) : Math.floor(value));
    }

    function findNodeByName(root, name) {
        if (!root) return null;
        if (root.name === name) return root;
        var children = root.children || [];
        for (var i = 0; i < children.length; i++) {
            var found = findNodeByName(children[i], name);
            if (found) return found;
        }
        return null;
    }

    function walkNodes(root, visitor) {
        if (!root) return;
        visitor(root);
        var children = root.children || [];
        for (var i = 0; i < children.length; i++) walkNodes(children[i], visitor);
    }

    function setNodeLabel(node, text) {
        if (!node) return false;
        var numNode = findNodeByName(node, 'num') || node;
        var label = numNode.getComponent && (numNode.getComponent(cc.Label) || numNode.getComponent('cc.Label'));
        if (!label && node.getComponent) label = node.getComponent(cc.Label) || node.getComponent('cc.Label');
        if (!label) {
            var children = node.children || [];
            for (var i = 0; i < children.length && !label; i++) {
                var childNum = findNodeByName(children[i], 'num') || children[i];
                label = childNum.getComponent && (childNum.getComponent(cc.Label) || childNum.getComponent('cc.Label'));
            }
        }
        if (!label) return false;
        label.string = text;
        return true;
    }

    function refreshVisiblePoints(points) {
        if (points === null || points === undefined || points === '') return false;
        var value = Number(points);
        if (!isFinite(value) || !window.cc || !cc.director) return false;
        var dao = getUserDao();
        if (dao) {
            dao.gold = value;
            dao.beans = value;
            dao.diamond = value;
        }
        var scene = cc.director.getScene && cc.director.getScene();
        if (!scene) return false;
        var text = formatPoints(value);
        var updated = 0;
        var targetNames = {
            user_diamond: true,
            user_gold: true,
            user_beans: true
        };
        walkNodes(scene, function (node) {
            if (targetNames[node.name] && setNodeLabel(node, text)) updated++;
        });
        if (updated > 0) console.log('[mahjong-points] visible points refreshed', text, updated);
        return updated > 0;
    }

    function queueRefreshPoints(points) {
        [0, 100, 400, 1000, 2000, 3500].forEach(function (delay) {
            window.setTimeout(function () {
                refreshVisiblePoints(points);
            }, delay);
        });
    }

    function hashString(text) {
        var hash = 2166136261;
        text = String(text || '');
        for (var i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(36);
    }

    function getUserDao() {
        return window.cc && cc.myBaseMgr && cc.myBaseMgr.DAO && cc.myBaseMgr.DAO.UserDao;
    }

    function getGameDao() {
        return window.cc && cc.myBaseMgr && cc.myBaseMgr.DAO && cc.myBaseMgr.DAO.GameDao;
    }

    function firstValue() {
        for (var i = 0; i < arguments.length; i++) {
            var value = arguments[i];
            if (value !== undefined && value !== null && value !== '') return value;
        }
        return '';
    }

    function buildSettlementRequestId(userDao, selfSeat, amount) {
        var roomInfo = window.__MAHJONG_LAST_ROOM_INFO__ || {};
        var roomId = firstValue(roomInfo.roomid, roomInfo.roomId, userDao.roomid);
        var inning = firstValue(roomInfo.cruent_inning, roomInfo.current_inning, roomInfo.inning);
        var userId = firstValue(userDao.uid, userDao.userAccountId, selfSeat && selfSeat.user_id);
        if (roomId === '' || inning === '' || userId === '') return '';
        return ['mahjong', roomId, inning, userId, amount > 0 ? 'settle' : 'bet'].join(':');
    }

    function findSelfSeat(seats) {
        if (!seats || !seats.length) return null;
        var dao = getUserDao() || {};
        var ids = [dao.uid, dao.userAccountId, dao.userAccountId + ''];
        for (var i = 0; i < seats.length; i++) {
            var seat = seats[i] || {};
            var seatId = seat.user_id == null ? '' : String(seat.user_id);
            for (var j = 0; j < ids.length; j++) {
                if (ids[j] != null && seatId === String(ids[j])) return seat;
            }
        }
        return null;
    }

    function applyAppInit(data) {
        if (!data || typeof data !== 'object') return;
        var current = window.__MAHJONG_APP_INIT__ || window.__GAME_APP_INIT__ || {};
        var merged = {};
        for (var oldKey in current) merged[oldKey] = current[oldKey];
        for (var newKey in data) merged[newKey] = data[newKey];
        var points = pickPoints(merged);
        if (points !== null) {
            merged.points = points;
            merged.balance = points;
            merged.coin = points;
            merged.diamond = points;
        }
        window.__GAME_APP_INIT__ = merged;
        window.__MAHJONG_APP_INIT__ = merged;

        var dao = getUserDao();
        if (!dao) {
            if (points !== null) queueRefreshPoints(points);
            return;
        }
        if (dao.applyAppLogin && (!dao.token || !dao.uid)) dao.applyAppLogin();
        if (points !== null) {
            dao.gold = points;
            dao.beans = points;
            dao.diamond = points;
            queueRefreshPoints(points);
            if (cc.game_frame_EventMgr && cc.game_frame_EventMgr.pushEventImm) {
                cc.game_frame_EventMgr.pushEventImm('updateUserinfo');
            }
        }
    }

    window.__mahjongApplyAppInit = applyAppInit;
    window.__mahjongRequestBalance = requestBalance;
    window.__mahjongRefreshVisiblePoints = refreshVisiblePoints;
    window.__mahjongChangePoints = function (amount, extra) {
        amount = Number(amount);
        if (!isFinite(amount) || amount === 0) return false;
        extra = extra || {};
        var requestId = extra.requestId || ('mahjong_points_' + Date.now() + '_' + Math.random().toString(16).slice(2));
        var payload = {};
        for (var key in extra) payload[key] = extra[key];
        payload.amount = amount;
        payload.reason = payload.reason || 'mahjong_settle';
        payload.requestId = requestId;
        return postGameMessage('changePoints', payload);
    };
    window.__mahjongSettleFromSeats = function (seats, source) {
        try {
            var selfSeat = findSelfSeat(seats);
            if (!selfSeat) return false;
            var amount = Number(selfSeat.score);
            if (!isFinite(amount) || amount === 0) return false;
            var userDao = getUserDao() || {};
            var gameDao = getGameDao() || {};
            var requestId = buildSettlementRequestId(userDao, selfSeat, amount);
            var rawKey = JSON.stringify({
                source: source || 'mahjong_over',
                roomId: userDao.roomid || '',
                gameKey: gameDao.present_gameKey || '',
                roomType: gameDao.present_roomType || '',
                userId: userDao.uid || userDao.userAccountId || '',
                seatIndex: selfSeat.seats_index,
                score: selfSeat.score,
                totalScore: selfSeat.total_score,
                handHolds: selfSeat.hand_holds,
                resultScore: selfSeat.result_score
            });
            requestId || (requestId = 'mahjong_settle_' + hashString(rawKey));
            if (settledRequests[requestId]) return false;
            settledRequests[requestId] = true;
            console.log('[mahjong-points] client settlement ignored; server settlement is authoritative', requestId, amount);
            queueRequestBalance();
            return true;
        } catch (error) {
            console.warn('[mahjong] settle points failed', error);
            return false;
        }
    };
    window.onAppMessage = function (message) {
        try {
            if (typeof message === 'string') message = JSON.parse(message);
            var action = message && message.action;
            var data = message && (message.data || message);
            if (!action || action === 'init' || action === 'balanceUpdate' || action === 'pointsChangeResult' || action === 'deductPointsResult' || action === 'refreshPoints' || action === 'updatePoints') {
                applyAppInit(data);
                if ((action === 'pointsChangeResult' || action === 'deductPointsResult') && (!data || data.success !== false)) {
                    queueRequestBalance();
                }
            }
        } catch (e) {
            console.error('[mahjong] onAppMessage failed', e);
        }
    };
    [300, 1200, 3000].forEach(function (delay) {
        window.setTimeout(requestBalance, delay);
    });
})();

window.boot = function () {
    var settings = window._CCSettings;
    window._CCSettings = undefined;

    if ( !settings.debug ) {
        var uuids = settings.uuids;

        var rawAssets = settings.rawAssets;
        var assetTypes = settings.assetTypes;
        var realRawAssets = settings.rawAssets = {};
        for (var mount in rawAssets) {
            var entries = rawAssets[mount];
            var realEntries = realRawAssets[mount] = {};
            for (var id in entries) {
                var entry = entries[id];
                var type = entry[1];
                // retrieve minified raw asset
                if (typeof type === 'number') {
                    entry[1] = assetTypes[type];
                }
                // retrieve uuid
                realEntries[uuids[id] || id] = entry;
            }
        }

        var scenes = settings.scenes;
        for (var i = 0; i < scenes.length; ++i) {
            var scene = scenes[i];
            if (typeof scene.uuid === 'number') {
                scene.uuid = uuids[scene.uuid];
            }
        }

        var packedAssets = settings.packedAssets;
        for (var packId in packedAssets) {
            var packedIds = packedAssets[packId];
            for (var j = 0; j < packedIds.length; ++j) {
                if (typeof packedIds[j] === 'number') {
                    packedIds[j] = uuids[packedIds[j]];
                }
            }
        }

        var subpackages = settings.subpackages;
        for (var subId in subpackages) {
            var uuidArray = subpackages[subId].uuids;
            if (uuidArray) {
                for (var k = 0, l = uuidArray.length; k < l; k++) {
                    if (typeof uuidArray[k] === 'number') {
                        uuidArray[k] = uuids[uuidArray[k]];
                    }
                }
            }
        }
    }

    function setLoadingDisplay () {
        // Loading splash scene
        var splash = document.getElementById('splash');
        var progressBar = splash.querySelector('.progress-bar span');
        cc.loader.onProgress = function (completedCount, totalCount, item) {
            var percent = 100 * completedCount / totalCount;
            if (progressBar) {
                progressBar.style.width = percent.toFixed(2) + '%';
            }
        };
        splash.style.display = 'block';
        progressBar.style.width = '0%';

        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, function () {
            splash.style.display = 'none';
        });
    }

    var onStart = function () {
        cc.loader.downloader._subpackages = settings.subpackages;

        cc.view.enableRetina(true);
        cc.view.resizeWithBrowserSize(true);

        if (cc.sys.isBrowser) {
            setLoadingDisplay();
        }

        if (cc.sys.isMobile) {
            if (settings.orientation === 'landscape') {
                cc.view.setOrientation(cc.macro.ORIENTATION_LANDSCAPE);
            }
            else if (settings.orientation === 'portrait') {
                cc.view.setOrientation(cc.macro.ORIENTATION_PORTRAIT);
            }
            cc.view.enableAutoFullScreen([
                cc.sys.BROWSER_TYPE_BAIDU,
                cc.sys.BROWSER_TYPE_WECHAT,
                cc.sys.BROWSER_TYPE_MOBILE_QQ,
                cc.sys.BROWSER_TYPE_MIUI,
            ].indexOf(cc.sys.browserType) < 0);
        }

        // Limit downloading max concurrent task to 2,
        // more tasks simultaneously may cause performance draw back on some android system / browsers.
        // You can adjust the number based on your own test result, you have to set it before any loading process to take effect.
        if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_ANDROID) {
            cc.macro.DOWNLOAD_MAX_CONCURRENT = 2;
        }

        function loadScene(launchScene) {
            cc.director.loadScene(launchScene,
                function (err) {
                    if (!err) {
                        if (cc.sys.isBrowser) {
                            // show canvas
                            var canvas = document.getElementById('GameCanvas');
                            canvas.style.visibility = '';
                            var div = document.getElementById('GameDiv');
                            if (div) {
                                div.style.backgroundImage = '';
                            }
                        }
                        cc.loader.onProgress = null;
                        console.log('Success to load scene: ' + launchScene);
                    }
                    else if (CC_BUILD) {
                        setTimeout(function () {
                            loadScene(launchScene);
                        }, 1000);
                    }
                }
            );

        }

        var launchScene = settings.launchScene;

        // load scene
        loadScene(launchScene);

    };

    // jsList
    var jsList = settings.jsList;

    var bundledScript = settings.debug ? 'src/project.dev.js' : 'src/project.js';
    if (jsList) {
        jsList = jsList.map(function (x) {
            return 'src/' + x;
        });
        jsList.push(bundledScript);
    }
    else {
        jsList = [bundledScript];
    }

    var option = {
        id: 'GameCanvas',
        scenes: settings.scenes,
        debugMode: cc.debug.DebugMode.ERROR,
        showFPS: false,
        frameRate: 60,
        jsList: jsList,
        groupList: settings.groupList,
        collisionMatrix: settings.collisionMatrix,
    };

    // init assets
    cc.AssetLibrary.init({
        libraryPath: 'res/import',
        rawAssetsBase: 'res/raw-',
        rawAssets: settings.rawAssets,
        packedAssets: settings.packedAssets,
        md5AssetsMap: settings.md5AssetsMap,
        subpackages: settings.subpackages
    });

    cc.game.run(option, onStart);
};

if (window.jsb) {
    var isRuntime = (typeof loadRuntime === 'function');
    if (isRuntime) {
        require('src/settings.js');
        require('src/cocos2d-runtime.js');
        if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
            require('src/physics.js');
        }
        require('jsb-adapter/engine/index.js');
    }
    else {
        require('src/settings.js');
        require('src/cocos2d-jsb.js');
        if (CC_PHYSICS_BUILTIN || CC_PHYSICS_CANNON) {
            require('src/physics.js');
        }
        require('jsb-adapter/jsb-engine.js');
    }

    cc.macro.CLEANUP_IMAGE_CACHE = true;
    window.boot();
}
