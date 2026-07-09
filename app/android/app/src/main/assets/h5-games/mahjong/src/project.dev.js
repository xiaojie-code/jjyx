(function() {
  function queryValue(name) {
    var match = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search || "");
    return match ? decodeURIComponent(match[1].replace(/\+/g, "%20")) : "";
  }
  function withPort(baseUrl, port) {
    try {
      var uri = new URL(baseUrl, window.location.href);
      uri.port = String(port);
      uri.pathname = "";
      uri.search = "";
      uri.hash = "";
      return uri.toString().replace(/\/$/, "");
    } catch (e) {
      return "";
    }
  }
  var apiBaseUrl = queryValue("apiBaseUrl");
  window.__MAHJONG_HTTP_URL__ =
    queryValue("mahjongHttpUrl") || withPort(apiBaseUrl, 15103) || "http://127.0.0.1:15103";
  window.__MAHJONG_WS_URL__ =
    queryValue("mahjongWsUrl") || withPort(apiBaseUrl, 42001) || "http://127.0.0.1:42001";
})();

window.__require = function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var b = o.split("/");
        b = b[b.length - 1];
        if (!t[b]) {
          var a = "function" == typeof __require && __require;
          if (!u && a) return a(b, !0);
          if (i) return i(b, !0);
          throw new Error("Cannot find module '" + o + "'");
        }
        o = b;
      }
      var f = n[o] = {
        exports: {}
      };
      t[o][0].call(f.exports, function(e) {
        var n = t[o][1][e];
        return s(n || e);
      }, f, f.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = "function" == typeof __require && __require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
}({
  Account_login_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "fb38f4iD2tCFakIBekgs4uX", "Account_login_layer");
    "use strict";
    var baseinfo = cc.Class({
      name: "baseinfo",
      properties: {
        form_node: {
          default: null,
          type: cc.Node,
          displayName: "\u8868\u5355\u4fe1\u606fnode \u8282\u70b9",
          tooltip: "\u8868\u5355\u4fe1\u606fnode \u8282\u70b9"
        },
        form_editBox: {
          default: null,
          type: cc.EditBox,
          displayName: "\u8f93\u5165\u6846\u8282\u70b9",
          tooltip: "\u8f93\u5165\u6846\u8282\u70b9"
        }
      }
    });
    var UI_SHOW_TYPE = cc.Enum({
      login: 0,
      register: 1,
      change_password: 2
    });
    var UIManager = require("UIManager");
    var Label = require("LabelMsgManager");
    cc.Class({
      extends: UIManager,
      properties: {
        account_node: {
          default: null,
          type: baseinfo,
          displayName: "\u8d26\u53f7  \u8282\u70b9",
          tooltip: "\u8d26\u53f7  \u8282\u70b9"
        },
        password_node: {
          default: null,
          type: baseinfo,
          displayName: "\u5bc6\u7801 \u8282\u70b9",
          tooltip: "\u5bc6\u7801 \u8282\u70b9"
        },
        confirm_password_node: {
          default: null,
          type: baseinfo,
          displayName: "\u786e\u8ba4\u5bc6\u7801 \u8282\u70b9",
          tooltip: "\u786e\u8ba4\u5bc6\u7801 \u8282\u70b9"
        },
        phone_node: {
          default: null,
          type: baseinfo,
          displayName: "\u624b\u673a\u53f7 \u8282\u70b9",
          tooltip: "\u624b\u673a\u53f7 \u8282\u70b9"
        },
        verification_code_node: {
          default: null,
          type: baseinfo,
          displayName: "\u9a8c\u8bc1\u7801 \u8282\u70b9",
          tooltip: "\u9a8c\u8bc1\u7801 \u8282\u70b9"
        },
        from_layout: {
          default: null,
          type: cc.Layout,
          displayName: "\u8868\u5355 layout \u8282\u70b9",
          tooltip: "\u8868\u5355 layout \u8282\u70b9"
        },
        login_ui_node: {
          default: null,
          type: cc.Node,
          displayName: "\u767b\u9646 UI \u8282\u70b9",
          tooltip: "\u767b\u9646 UI \u8282\u70b9"
        },
        register_ui_node: {
          default: null,
          type: cc.Node,
          displayName: "\u6ce8\u518c UI \u8282\u70b9",
          tooltip: "\u6ce8\u518c UI \u8282\u70b9"
        },
        change_password_ui_node: {
          default: null,
          type: cc.Node,
          displayName: "\u4fee\u6539\u5bc6\u7801 UI \u8282\u70b9",
          tooltip: "\u4fee\u6539\u5bc6\u7801 UI \u8282\u70b9"
        },
        default_layout_spacingY: 29,
        default_UI_SHOW_TYPE: {
          default: UI_SHOW_TYPE.login,
          type: UI_SHOW_TYPE
        }
      },
      onLoad: function onLoad() {
        this.switchUIByShowType(this.default_UI_SHOW_TYPE);
      },
      start: function start() {},
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_show_login_ui":
          this.switchUIByShowType(UI_SHOW_TYPE.login);
          break;

         case "btn_show_registern_ui":
          this.switchUIByShowType(UI_SHOW_TYPE.register);
          break;

         case "btn_show_change_password_ui":
          this.switchUIByShowType(UI_SHOW_TYPE.change_password);
          break;

         case "btn_login":
          this.default_UI_SHOW_TYPE == UI_SHOW_TYPE.login ? this.loginByAccount() : null;
          this.default_UI_SHOW_TYPE == UI_SHOW_TYPE.register ? this.register() : null;
          this.default_UI_SHOW_TYPE == UI_SHOW_TYPE.change_password ? this.changePassword() : null;
          break;

         case "btn_send_msg":
          this.sendMsg(e);
        }
      },
      switchUIByShowType: function switchUIByShowType($UI_SHOW_TYPE) {
        this.default_UI_SHOW_TYPE = $UI_SHOW_TYPE;
        switch ($UI_SHOW_TYPE) {
         case UI_SHOW_TYPE.login:
          this.login_ui_node.active = true;
          this.register_ui_node.active = false;
          this.change_password_ui_node.active = false;
          this.from_layout.spacingY = 85;
          this.confirm_password_node.form_node.active = false;
          this.phone_node.form_node.active = false;
          this.verification_code_node.form_node.active = false;
          this.account_node.form_node.active = true;
          this.password_node.form_node.active = true;
          break;

         case UI_SHOW_TYPE.register:
          this.login_ui_node.active = false;
          this.register_ui_node.active = true;
          this.change_password_ui_node.active = false;
          this.from_layout.spacingY = this.default_layout_spacingY;
          this.confirm_password_node.form_node.active = true;
          this.phone_node.form_node.active = true;
          this.verification_code_node.form_node.active = true;
          this.account_node.form_node.active = true;
          this.password_node.form_node.active = true;
          break;

         case UI_SHOW_TYPE.change_password:
          this.login_ui_node.active = false;
          this.register_ui_node.active = false;
          this.change_password_ui_node.active = true;
          this.from_layout.spacingY = this.default_layout_spacingY;
          this.confirm_password_node.form_node.active = true;
          this.phone_node.form_node.active = true;
          this.verification_code_node.form_node.active = true;
          this.account_node.form_node.active = true;
          this.password_node.form_node.active = true;
        }
      },
      sendMsg: function sendMsg(e) {
        var _this = this;
        var phone_number = this.phone_node.form_editBox.string;
        var target = e.target;
        var awaitTime = 60;
        var self = this;
        console.log(target);
        var resdata = {
          phone: phone_number
        };
        cc.myBaseMgr.DAO.SystemDao.sendMsg(resdata, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            _this.creater_Layer("msg_layer", {
              text: "\u53d1\u9001\u9a8c\u8bc1\u7801\u6210\u529f,\u8bf7\u6ce8\u610f\u67e5\u6536"
            });
            target.getComponent(cc.Button).interactable = false;
            target.parent.getComponent(cc.Label).string = cc.myBaseMgr.Tools.Str.stringFormat(Label["SCEND_CODE_WIN"], awaitTime);
            self.schedule(function() {
              if (awaitTime > 0) {
                target.parent.getComponent(cc.Label).string = cc.myBaseMgr.Tools.Str.stringFormat(Label["SCEND_CODE_WIN"], awaitTime);
                awaitTime -= 1;
              } else {
                target.getComponent(cc.Button).interactable = true;
                target.parent.getComponent(cc.Label).string = Label["SEND_MSG_BY_PHONE"];
                self.unscheduleAllCallbacks();
              }
            }, 1);
            break;

           case cc.myBaseMgr.CODE.clientError:
           default:
            _this.creater_Layer("msg_layer", {
              text: message
            });
          }
        });
      },
      loginByAccount: function loginByAccount() {
        var _this2 = this;
        var resdata = {
          account: this.account_node.form_editBox.string,
          pwd: this.password_node.form_editBox.string
        };
        cc.myBaseMgr.DAO.UserDao.onLogin(resdata, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            console.log("\u767b\u5f55\u6210\u529f");
            _this2.onGetLoginInfoByToken();
            break;

           case cc.myBaseMgr.CODE.clientError:
           default:
            _this2.creater_Layer("msg_layer", {
              text: message
            });
          }
        });
      },
      register: function register() {
        var _this3 = this;
        var resdata = {
          account: this.account_node.form_editBox.string,
          tel: this.phone_node.form_editBox.string,
          pwd: this.password_node.form_editBox.string,
          again_pwd: this.confirm_password_node.form_editBox.string,
          phoneCode: this.verification_code_node.form_editBox.string
        };
        cc.myBaseMgr.DAO.UserDao.onRegistered(resdata, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            console.log("\u6ce8\u518c\u6210\u529f");
            _this3.onGetLoginInfoByToken();
            break;

           case cc.myBaseMgr.CODE.clientError:
           default:
            _this3.creater_Layer("msg_layer", {
              text: message
            });
          }
        });
      },
      changePassword: function changePassword() {
        var _this4 = this;
        var resdata = {
          account: this.account_node.form_editBox.string,
          tel: this.phone_node.form_editBox.string,
          pwd: this.password_node.form_editBox.string,
          again_pwd: this.confirm_password_node.form_editBox.string,
          phoneCode: this.verification_code_node.form_editBox.string
        };
        cc.myBaseMgr.DAO.UserDao.onChangePassword(resdata, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            console.log("\u4fee\u6539\u6210\u529f");
            _this4.onGetLoginInfoByToken();
            break;

           case cc.myBaseMgr.CODE.clientError:
           default:
            _this4.creater_Layer("msg_layer", {
              text: message
            });
          }
        });
      },
      onGetLoginInfoByToken: function onGetLoginInfoByToken() {
        var _this5 = this;
        cc.myBaseMgr.DAO.UserDao.onGetLoginInfoByToken(function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            _this5.loadScene("GameMain");
            break;

           case cc.myBaseMgr.CODE.not_login:
          }
        });
      }
    });
    cc._RF.pop();
  }, {
    LabelMsgManager: "LabelMsgManager",
    UIManager: "UIManager"
  } ],
  AudioManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "d159dYdG4hFNqr58d4UnS5R", "AudioManager");
    "use strict";
    function _typeof(obj) {
      "@babel/helpers - typeof";
      _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function _typeof(obj) {
        return typeof obj;
      } : function _typeof(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      return _typeof(obj);
    }
    var AudioMgr = cc.Class({
      extends: cc.Component,
      properties: {
        bgmVolume: .5,
        sfxVolume: 1,
        bgmAudioID: -1,
        musicState: 1
      },
      init: function init() {
        cc.Mgr.loadSound = false;
        var t = cc.sys.localStorage.getItem("bgmVolume");
        null != t && (this.bgmVolume = parseFloat(t));
        var t = cc.sys.localStorage.getItem("sfxVolume");
        null != t && (this.sfxVolume = parseFloat(t));
        cc.game.on(cc.game.EVENT_HIDE, function() {
          console.log("cc.audioEngine.pauseAll");
          cc.audioEngine.pauseAll();
        });
        cc.game.on(cc.game.EVENT_SHOW, function() {
          console.log("cc.audioEngine.resumeAll");
          1 == this.musicState ? cc.audioEngine.resumeAll() : 0 == this.musicState && cc.audioEngine.pauseAll();
        }.bind(this));
      },
      getUrl: function getUrl(url) {
        return "sound/" + url;
      },
      playBGM: function playBGM(url) {
        var audioUrl = this.getUrl(url);
        this.bgmAudioID >= 0 && cc.audioEngine.stop(this.bgmAudioID);
        cc.loader.loadRes(audioUrl, cc.AudioClip, function(err, audioClip) {
          cc.log(_typeof(audioClip));
          this.bgmAudioID = cc.audioEngine.play(audioClip, true, this.bgmVolume);
        }.bind(this));
      },
      playSFX: function playSFX(url) {
        var audioUrl = this.getUrl(url);
        cc.loader.loadRes(audioUrl, cc.AudioClip, function(err, audioClip) {
          cc.log(_typeof(audioClip));
          cc.audioEngine.play(audioClip, false, this.sfxVolume);
        }.bind(this));
      },
      setSFXVolume: function setSFXVolume(v) {
        if (this.sfxVolume != v) {
          cc.sys.localStorage.setItem("sfxVolume", v);
          this.sfxVolume = v;
        }
      },
      setBGMVolume: function setBGMVolume(v, force) {
        this.bgmAudioID >= 0 && (v > 0 ? cc.audioEngine.resume(this.bgmAudioID) : cc.audioEngine.pause(this.bgmAudioID));
        if (this.bgmVolume != v || force) {
          cc.sys.localStorage.setItem("bgmVolume", v);
          this.bgmVolume = v;
          cc.audioEngine.setVolume(this.bgmAudioID, v);
        }
      },
      getSFXVolume: function getSFXVolume() {
        return cc.sys.localStorage.getItem("sfxVolume");
      },
      getBGMVolume: function getBGMVolume() {
        return cc.sys.localStorage.getItem("bgmVolume");
      },
      pauseAll: function pauseAll() {
        this.musicState = 0;
        this.bgmVolume = 0;
        this.sfxVolume = 0;
        cc.audioEngine.pauseAll();
      },
      resumeAll: function resumeAll() {
        this.musicState = 1;
        this.bgmVolume = .5;
        this.sfxVolume = 1;
        cc.audioEngine.resumeAll();
      },
      getVoiceState: function getVoiceState() {
        return this.musicState;
      }
    });
    cc._RF.pop();
  }, {} ],
  BaseWSDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "81b20NgkPZBNKrQN6y/IYf3", "BaseWSDao");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var io = require("socket.io");
    var BaseWSDao = cc.Class({
      extends: cc.Component,
      properties: {
        socket: null,
        is_connect: false,
        game_conf: null,
        matching_on_event: null,
        system_on_event: null,
        game_type_on_event: null,
        game_type_send_event: null,
        game_send_event: null,
        room_send_event: null,
        matching_send_event: null,
        game_type_service_event: null,
        matching_service_event: null,
        system_service_event: null,
        reconnect_num: 0,
        max_reconnect_num: 5
      },
      ctor: function ctor() {
        cc.log("BaseWSDao ctor");
      },
      connect: function connect() {
        cc.log("BaseWSDao connect");
        this.game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this.system_on_event = wsMsgKeyEnum["system"]["on"];
        this.system_service_event = wsMsgKeyEnum["system"]["service"];
        this.matching_on_event = wsMsgKeyEnum["matching"]["on"];
        this.matching_send_event = wsMsgKeyEnum["matching"]["send"];
        this.matching_service_event = wsMsgKeyEnum["matching"]["service"];
        this.room_send_event = wsMsgKeyEnum["room"]["send"];
        this.game_send_event = wsMsgKeyEnum[this.game_conf.gameKey]["send"];
        this.game_type_on_event = wsMsgKeyEnum[this.game_conf.gameTypeKey]["on"];
        this.game_type_send_event = wsMsgKeyEnum[this.game_conf.gameTypeKey]["send"];
        this.game_type_service_event = wsMsgKeyEnum[this.game_conf.gameTypeKey]["service"];
        var opts = {
          reconnection: true,
          "force new connection": true,
          transports: [ "websocket", "polling" ]
        };
        var appInit = this.getAppInit();
        if (appInit) opts.query = this.buildAppContext(appInit);
        var server_info = cc.myBaseMgr.DAO.SystemDao.getWSGameinfoByServerConstant(this.game_conf.serverHost_constant);
        this.socket = io(server_info.address, opts);
        this.initSystemEvent(this.socket, this.system_service_event);
        this.initMatchingEvent(this.socket, this.matching_on_event, this.matching_service_event);
        this.initGameEvent();
      },
      getAppInit: function getAppInit() {
        if ("undefined" == typeof window) return null;
        var app = window.__MAHJONG_APP_INIT__ || window.__GAME_APP_INIT__ || {};
        return app && app.userId && app.token ? app : null;
      },
      buildAppContext: function buildAppContext(app) {
        app = app || this.getAppInit();
        if (!app) return null;
        return {
          appToken: app.token || "",
          appUserId: String(app.userId || ""),
          appGameId: String(app.gameId || ""),
          apiBaseUrl: app.apiBaseUrl || "",
          mahjongHttpUrl: app.mahjongHttpUrl || "",
          mahjongWsUrl: app.mahjongWsUrl || ""
        };
      },
      appendAppContext: function appendAppContext(res_data) {
        var app = this.getAppInit();
        if (!app) return res_data;
        res_data.app_token = app.token || "";
        res_data.app_user_id = String(app.userId || "");
        res_data.app_game_id = String(app.gameId || "");
        res_data.api_base_url = app.apiBaseUrl || "";
        return res_data;
      },
      initSystemEvent: function initSystemEvent(socket, system_service_event) {
        var _this = this;
        cc.log("BaseWSDao initSystemEvent");
        socket.on("connect", function() {
          console.log("\u94fe\u63a5\u6210\u529f");
          _this.connect_init_fun();
          cc.game_frame_EventMgr.pushEventImm(system_service_event["connect"]);
        });
        socket.on("reconnect", function() {
          _this.connect_init_fun();
          console.warn("socket \u91cd\u65b0\u8fde\u63a5\u5230\u670d\u52a1\u5668");
          cc.game_frame_EventMgr.pushEventImm(system_service_event["reconnect"]);
        });
        socket.on("connect_error", function() {
          _this.disconnect();
          _this.reconnection();
          console.log("\u94fe\u63a5\u9519\u8bef");
          cc.game_frame_EventMgr.pushEventImm(system_service_event["connect_error"]);
        });
        socket.on("connect_timeout", function() {
          console.warn("socket \u8fde\u63a5\u8d85\u65f6");
          _this.disconnect();
          cc.game_frame_EventMgr.pushEventImm(system_service_event["connect_error"]);
        });
        socket.on("error", function() {
          console.warn("socket \u53d1\u751f\u9519\u8bef");
          _this.disconnect();
          cc.game_frame_EventMgr.pushEventImm(system_service_event["connect_error"]);
        });
        socket.on("disconnect", function() {
          console.warn("socket \u670d\u52a1\u5668\u8fde\u63a5\u65ad\u5f00 \u6216 \u5ba2\u6237\u7aef\u8fde\u63a5\u65ad\u5f00 ");
          _this.disconnect();
          cc.game_frame_EventMgr.pushEventImm(system_service_event["disconnect"]);
        });
        socket.on("reconnect_failed", function() {
          console.warn("socket \u91cd\u65b0\u8fde\u63a5\u5931\u8d25");
          _this.disconnect();
          _this.reconnection();
        });
        socket.on("pong", function() {
          console.log("pong");
        });
        socket.on(this.system_on_event["message_type_banner"], function(reqData) {
          console.log("".concat(wsMsgKeyEnum["system"]["message_type_banner"], " data = ").concat(JSON.stringify(reqData)));
        });
        socket.on(this.system_on_event["sysError"], function(reqData) {
          console.log("".concat(wsMsgKeyEnum["system"]["sysError"], " data = ").concat(JSON.stringify(reqData)));
        });
      },
      initMatchingEvent: function initMatchingEvent(socket, matching_on_event, matching_service_event) {
        var _this2 = this;
        cc.log("BaseWSDao initMatchingEvent");
        if (!socket || !matching_on_event || !matching_service_event) return;
        socket.on(matching_on_event["start_matching"], function(reqData) {
          console.log("".concat(matching_on_event["start_matching"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(matching_service_event["start_matching"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        socket.on(matching_on_event["update_matching_all"], function(reqData) {
          console.log("".concat(matching_on_event["update_matching_all"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(matching_service_event["update_matching_all"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        socket.on(matching_on_event["matching_win_all"], function(reqData) {
          console.log("".concat(matching_on_event["matching_win_all"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(matching_service_event["matching_win_all"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        socket.on(matching_on_event["exit_matching"], function(reqData) {
          console.log("".concat(matching_on_event["exit_matching"], " data = ").concat(JSON.stringify(reqData)));
          _this2.disconnect();
          cc.game_frame_EventMgr.pushEventImm(matching_service_event["exit_matching"], reqData["code"], reqData["msg"], reqData["data"]);
        });
      },
      ping: function ping() {
        this.schedule(this.pingCallback, 1, this);
      },
      pingCallback: function pingCallback() {
        if (!this.is_connect) return;
        console.log("ping");
        this.socket && this.socket.emit("ping");
      },
      emit: function emit(sendMsgKey, res_data) {
        console.log("\u53d1\u9001\u6d88\u606f : ".concat(sendMsgKey, "   \u53d1\u9001\u6570\u636e = ").concat(JSON.stringify(res_data)));
        this.socket && this.socket.emit(sendMsgKey, res_data);
      },
      send: function send(sendMsgKey, data) {
        cc.log("BaseWSDao send");
        function start_matching() {
          var play_constant = data.play_constant;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(play_constant)) return;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.DAO.UserDao.token)) return;
          var res_data = {
            user_token: cc.myBaseMgr.DAO.UserDao.token,
            play_constant: play_constant,
            user_name: cc.myBaseMgr.DAO.UserDao.nickName + cc.myBaseMgr.DAO.UserDao.userAccountId + "",
            user_icon: cc.myBaseMgr.DAO.UserDao.headImgUrl
          };
          this.appendAppContext(res_data);
          this.emit.bind(this)(sendMsgKey, res_data);
        }
        function joinRoom() {
          var roomid = data.roomid;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(roomid)) return;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.DAO.UserDao.token)) return;
          var res_data = {
            user_token: cc.myBaseMgr.DAO.UserDao.token,
            roomid: roomid,
            max_inning: cc.myBaseMgr.DAO.GameDao.present_max_inning || 0,
            is_create_friend: !!cc.myBaseMgr.DAO.GameDao.present_is_create_friend,
            user_name: cc.myBaseMgr.DAO.UserDao.nickName + cc.myBaseMgr.DAO.UserDao.userAccountId + "",
            user_icon: cc.myBaseMgr.DAO.UserDao.headImgUrl
          };
          this.appendAppContext(res_data);
          cc.myBaseMgr.DAO.GameDao.present_is_create_friend = false;
          this.emit.bind(this)(sendMsgKey, res_data);
        }
        function exit_matching() {
          this.emit.bind(this)(sendMsgKey);
        }
        function exit_game() {
          this.emit.bind(this)(sendMsgKey);
        }
        function prepare() {
          this.emit.bind(this)(sendMsgKey);
        }
        function cancelPrepare() {
          this.emit.bind(this)(sendMsgKey);
        }
        switch (sendMsgKey) {
         case this.matching_send_event.start_matching:
          start_matching.bind(this)();
          return true;

         case this.room_send_event.joinRoom:
          joinRoom.bind(this)();
          return true;

         case this.matching_send_event.exit_matching:
          exit_matching.bind(this)();
          return true;

         case this.game_type_send_event.exit_game:
          exit_game.bind(this)();
          return true;

         case this.room_send_event.prepare:
          prepare.bind(this)();
          return true;

         case this.room_send_event.cancelPrepare:
          cancelPrepare.bind(this)();
          return true;

         default:
          console.warn("BaseWSDao ".concat(sendMsgKey, " is not Find"));
          return false;
        }
      },
      disconnect: function disconnect() {
        cc.log("BaseWSDao disconnect");
        this.is_connect = false;
        this.socket.disconnect();
        this.unschedule(this.pingCallback);
      },
      connect_init_fun: function connect_init_fun() {
        cc.log("BaseWSDao connect_init_fun");
        this.is_connect = true;
        this.reconnect_num = 0;
        this.ping();
      },
      reconnection: function reconnection() {
        cc.log("BaseWSDao reconnection");
        this.reconnect_num++;
        console.warn("BaseWSDao \u65ad\u7ebf\u91cd\u8fde  " + this.reconnect_num + " \u6b21");
        if (this.reconnect_num == this.max_reconnect_num) {
          this.socket.disconnect();
          cc.game_frame_EventMgr.pushEventImm(this.game_type_service_event["connect_error"]);
        }
      }
    });
    cc._RF.pop();
  }, {
    WSMsgKeyEnum: "WSMsgKeyEnum",
    "socket.io": "socket.io"
  } ],
  Create_room_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "58d460x1GBDFo0OQfWlyvUj", "Create_room_layer");
    "use strict";
    var UIManager = require("UIManager");
    var DBConstantMgr = require("DBConstantMgr");
    cc.Class({
      extends: UIManager,
      properties: {
        _maxInning: null,
        _roomType: null,
        _gameKey: null
      },
      onLoad: function onLoad() {
        this._maxInning = 1;
        this._roomType = "normal";
        this._bindRoomTypeToggles();
        this._setupRoomLayerLayout();
        this._updateCreateButtonText();
      },
      _bindRoomTypeToggles: function _bindRoomTypeToggles() {
        var container = this._getRoomTypeContainer();
        if (!container) return;
        var self = this;
        var bind = function bind(toggleName, eventData) {
          var node = container.getChildByName(toggleName);
          if (!node) return;
          var toggle = node.getComponent(cc.Toggle);
          if (!toggle) return;
          var handler = new cc.Component.EventHandler();
          handler.target = self.node;
          handler.component = "Create_room_layer";
          handler.handler = "onClickEvents";
          handler.customEventData = eventData;
          toggle.checkEvents = [ handler ];
        };
        bind("toggle1", "room_normal");
        bind("toggle2", "room_friend");
      },
      _setupRoomLayerLayout: function _setupRoomLayerLayout() {
        var toggleContainers = [];
        var labelNodes = [];
        this._walkNodes(this.node, function(node) {
          node.getComponent && node.getComponent(cc.ToggleContainer) && toggleContainers.push(node);
          node.getComponent && node.getComponent(cc.Label) && labelNodes.push(node);
        });
        var roomToggle = this._getRoomTypeContainer();
        for (var t = 0; t < toggleContainers.length; t++) {
          var item = toggleContainers[t];
          var isRoundToggle = item.getChildByName && item.getChildByName("1") && item.getChildByName("2") && item.getChildByName("8");
          var isRoomToggle = item === roomToggle;
          isRoundToggle || isRoomToggle || (item.active = false);
        }
        var roomLabel = null;
        for (var l = 0; l < labelNodes.length; l++) {
          var label = labelNodes[l].getComponent(cc.Label);
          if (label && "\u5efa\u623f\u9009\u62e9" === label.string) {
            roomLabel = labelNodes[l];
            break;
          }
        }
        roomLabel && (roomLabel.y = 70);
        roomToggle && (roomToggle.y = 49);
        if (roomToggle) {
          var extraToggle = roomToggle.getChildByName("toggle3");
          extraToggle && (extraToggle.active = false);
        }
      },
      _walkNodes: function _walkNodes(root, handler) {
        if (!root) return;
        handler(root);
        var children = root.children || [];
        for (var i = 0; i < children.length; i++) this._walkNodes(children[i], handler);
      },
      _getRoomTypeContainer: function _getRoomTypeContainer() {
        var result = null;
        this._walkNodes(this.node, function(node) {
          if (result) return;
          node.getChildByName && node.getChildByName("toggle1") && node.getChildByName("toggle2") && (result = node);
        });
        return result;
      },
      _getCreateButtonNode: function _getCreateButtonNode() {
        var btn = this.node.getChildByName("15");
        if (btn && btn.getComponent && btn.getComponent(cc.Button)) return btn;
        return null;
      },
      _ensureCreateButtonLabel: function _ensureCreateButtonLabel() {
        var btn = this._getCreateButtonNode();
        if (!btn) return null;
        var oldImg = btn.getChildByName("9");
        oldImg && (oldImg.active = false);
        var labelNode = btn.getChildByName("btn_text");
        if (!labelNode) {
          labelNode = new cc.Node("btn_text");
          labelNode.parent = btn;
          labelNode.addComponent(cc.Label);
        }
        labelNode.active = true;
        labelNode.opacity = 255;
        labelNode.color = new cc.Color(255, 255, 255, 255);
        labelNode.zIndex = 999;
        labelNode.setPosition(0, 0);
        labelNode.setContentSize(160, 52);
        var label = labelNode.getComponent(cc.Label);
        label.useSystemFont = true;
        label.fontSize = 38;
        label.lineHeight = 48;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.SHRINK;
        label.enableWrapText = false;
        var outline = labelNode.getComponent(cc.LabelOutline);
        outline || (outline = labelNode.addComponent(cc.LabelOutline));
        outline.color = new cc.Color(172, 74, 99, 255);
        outline.width = 2;
        return label;
      },
      _updateCreateButtonText: function _updateCreateButtonText() {
        var label = this._ensureCreateButtonLabel();
        if (!label) return;
        label.string = "friend" === this._roomType ? "\u521b\u5efa" : "\u5339\u914d";
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "create":
          var maxInning = 4 * Number(this._maxInning);
          if ("friend" === this._roomType) {
            cc.myBaseMgr.DAO.GameDao.present_max_inning = maxInning;
            this.creater_Layer("join_room_layer", {
              isCreateFriend: true
            });
          } else {
            cc.myBaseMgr.DAO.GameDao.present_play_constant = Number(this._maxInning);
            cc.myBaseMgr.DAO.GameDao.present_max_inning = maxInning;
            cc.myBaseMgr.DAO.GameDao.setPresentGameKey(cc.myBaseMgr.runGame, DBConstantMgr.ROOM_TYPE_MATCHING);
            this.loadScene("MaJiang");
          }
          break;

         case "inning":
          cc.log("\u5c40\u6570\u9009\u62e9");
          this._maxInning = e.node.name;
          break;

         case "room_normal":
          cc.log("\u5efa\u623f\u9009\u62e9\uff1a\u666e\u901a\u623f(\u5339\u914d)");
          this._roomType = "normal";
          this._updateCreateButtonText();
          break;

         case "room_friend":
          cc.log("\u5efa\u623f\u9009\u62e9\uff1a\u597d\u53cb\u623f");
          this._roomType = "friend";
          this._updateCreateButtonText();
        }
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {
    DBConstantMgr: "DBConstantMgr",
    UIManager: "UIManager"
  } ],
  1: [ function(require, module, exports) {
    "use strict";
    exports.byteLength = byteLength;
    exports.toByteArray = toByteArray;
    exports.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = "undefined" !== typeof Uint8Array ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len = b64.length;
      if (len % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
      var validLen = b64.indexOf("=");
      -1 === validLen && (validLen = len);
      var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
      return [ validLen, placeHoldersLen ];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return 3 * (validLen + placeHoldersLen) / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return 3 * (validLen + placeHoldersLen) / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i;
      for (i = 0; i < len; i += 4) {
        tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = 255 & tmp;
      }
      if (2 === placeHoldersLen) {
        tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
        arr[curByte++] = 255 & tmp;
      }
      if (1 === placeHoldersLen) {
        tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = 255 & tmp;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[63 & num];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16 & 16711680) + (uint8[i + 1] << 8 & 65280) + (255 & uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
      if (1 === extraBytes) {
        tmp = uint8[len - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
      } else if (2 === extraBytes) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
      }
      return parts.join("");
    }
  }, {} ],
  2: [ function(require, module, exports) {
    (function(global) {
      "use strict";
      var base64 = require("base64-js");
      var ieee754 = require("ieee754");
      var isArray = require("isarray");
      exports.Buffer = Buffer;
      exports.SlowBuffer = SlowBuffer;
      exports.INSPECT_MAX_BYTES = 50;
      Buffer.TYPED_ARRAY_SUPPORT = void 0 !== global.TYPED_ARRAY_SUPPORT ? global.TYPED_ARRAY_SUPPORT : typedArraySupport();
      exports.kMaxLength = kMaxLength();
      function typedArraySupport() {
        try {
          var arr = new Uint8Array(1);
          arr.__proto__ = {
            __proto__: Uint8Array.prototype,
            foo: function() {
              return 42;
            }
          };
          return 42 === arr.foo() && "function" === typeof arr.subarray && 0 === arr.subarray(1, 1).byteLength;
        } catch (e) {
          return false;
        }
      }
      function kMaxLength() {
        return Buffer.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
      }
      function createBuffer(that, length) {
        if (kMaxLength() < length) throw new RangeError("Invalid typed array length");
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          that = new Uint8Array(length);
          that.__proto__ = Buffer.prototype;
        } else {
          null === that && (that = new Buffer(length));
          that.length = length;
        }
        return that;
      }
      function Buffer(arg, encodingOrOffset, length) {
        if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) return new Buffer(arg, encodingOrOffset, length);
        if ("number" === typeof arg) {
          if ("string" === typeof encodingOrOffset) throw new Error("If encoding is specified then the first argument must be a string");
          return allocUnsafe(this, arg);
        }
        return from(this, arg, encodingOrOffset, length);
      }
      Buffer.poolSize = 8192;
      Buffer._augment = function(arr) {
        arr.__proto__ = Buffer.prototype;
        return arr;
      };
      function from(that, value, encodingOrOffset, length) {
        if ("number" === typeof value) throw new TypeError('"value" argument must not be a number');
        if ("undefined" !== typeof ArrayBuffer && value instanceof ArrayBuffer) return fromArrayBuffer(that, value, encodingOrOffset, length);
        if ("string" === typeof value) return fromString(that, value, encodingOrOffset);
        return fromObject(that, value);
      }
      Buffer.from = function(value, encodingOrOffset, length) {
        return from(null, value, encodingOrOffset, length);
      };
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        Buffer.prototype.__proto__ = Uint8Array.prototype;
        Buffer.__proto__ = Uint8Array;
        "undefined" !== typeof Symbol && Symbol.species && Buffer[Symbol.species] === Buffer && Object.defineProperty(Buffer, Symbol.species, {
          value: null,
          configurable: true
        });
      }
      function assertSize(size) {
        if ("number" !== typeof size) throw new TypeError('"size" argument must be a number');
        if (size < 0) throw new RangeError('"size" argument must not be negative');
      }
      function alloc(that, size, fill, encoding) {
        assertSize(size);
        if (size <= 0) return createBuffer(that, size);
        if (void 0 !== fill) return "string" === typeof encoding ? createBuffer(that, size).fill(fill, encoding) : createBuffer(that, size).fill(fill);
        return createBuffer(that, size);
      }
      Buffer.alloc = function(size, fill, encoding) {
        return alloc(null, size, fill, encoding);
      };
      function allocUnsafe(that, size) {
        assertSize(size);
        that = createBuffer(that, size < 0 ? 0 : 0 | checked(size));
        if (!Buffer.TYPED_ARRAY_SUPPORT) for (var i = 0; i < size; ++i) that[i] = 0;
        return that;
      }
      Buffer.allocUnsafe = function(size) {
        return allocUnsafe(null, size);
      };
      Buffer.allocUnsafeSlow = function(size) {
        return allocUnsafe(null, size);
      };
      function fromString(that, string, encoding) {
        "string" === typeof encoding && "" !== encoding || (encoding = "utf8");
        if (!Buffer.isEncoding(encoding)) throw new TypeError('"encoding" must be a valid string encoding');
        var length = 0 | byteLength(string, encoding);
        that = createBuffer(that, length);
        var actual = that.write(string, encoding);
        actual !== length && (that = that.slice(0, actual));
        return that;
      }
      function fromArrayLike(that, array) {
        var length = array.length < 0 ? 0 : 0 | checked(array.length);
        that = createBuffer(that, length);
        for (var i = 0; i < length; i += 1) that[i] = 255 & array[i];
        return that;
      }
      function fromArrayBuffer(that, array, byteOffset, length) {
        array.byteLength;
        if (byteOffset < 0 || array.byteLength < byteOffset) throw new RangeError("'offset' is out of bounds");
        if (array.byteLength < byteOffset + (length || 0)) throw new RangeError("'length' is out of bounds");
        array = void 0 === byteOffset && void 0 === length ? new Uint8Array(array) : void 0 === length ? new Uint8Array(array, byteOffset) : new Uint8Array(array, byteOffset, length);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          that = array;
          that.__proto__ = Buffer.prototype;
        } else that = fromArrayLike(that, array);
        return that;
      }
      function fromObject(that, obj) {
        if (Buffer.isBuffer(obj)) {
          var len = 0 | checked(obj.length);
          that = createBuffer(that, len);
          if (0 === that.length) return that;
          obj.copy(that, 0, 0, len);
          return that;
        }
        if (obj) {
          if ("undefined" !== typeof ArrayBuffer && obj.buffer instanceof ArrayBuffer || "length" in obj) {
            if ("number" !== typeof obj.length || isnan(obj.length)) return createBuffer(that, 0);
            return fromArrayLike(that, obj);
          }
          if ("Buffer" === obj.type && isArray(obj.data)) return fromArrayLike(that, obj.data);
        }
        throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.");
      }
      function checked(length) {
        if (length >= kMaxLength()) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + kMaxLength().toString(16) + " bytes");
        return 0 | length;
      }
      function SlowBuffer(length) {
        +length != length && (length = 0);
        return Buffer.alloc(+length);
      }
      Buffer.isBuffer = function isBuffer(b) {
        return !!(null != b && b._isBuffer);
      };
      Buffer.compare = function compare(a, b) {
        if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) throw new TypeError("Arguments must be Buffers");
        if (a === b) return 0;
        var x = a.length;
        var y = b.length;
        for (var i = 0, len = Math.min(x, y); i < len; ++i) if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break;
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
         case "hex":
         case "utf8":
         case "utf-8":
         case "ascii":
         case "latin1":
         case "binary":
         case "base64":
         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return true;

         default:
          return false;
        }
      };
      Buffer.concat = function concat(list, length) {
        if (!isArray(list)) throw new TypeError('"list" argument must be an Array of Buffers');
        if (0 === list.length) return Buffer.alloc(0);
        var i;
        if (void 0 === length) {
          length = 0;
          for (i = 0; i < list.length; ++i) length += list[i].length;
        }
        var buffer = Buffer.allocUnsafe(length);
        var pos = 0;
        for (i = 0; i < list.length; ++i) {
          var buf = list[i];
          if (!Buffer.isBuffer(buf)) throw new TypeError('"list" argument must be an Array of Buffers');
          buf.copy(buffer, pos);
          pos += buf.length;
        }
        return buffer;
      };
      function byteLength(string, encoding) {
        if (Buffer.isBuffer(string)) return string.length;
        if ("undefined" !== typeof ArrayBuffer && "function" === typeof ArrayBuffer.isView && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) return string.byteLength;
        "string" !== typeof string && (string = "" + string);
        var len = string.length;
        if (0 === len) return 0;
        var loweredCase = false;
        for (;;) switch (encoding) {
         case "ascii":
         case "latin1":
         case "binary":
          return len;

         case "utf8":
         case "utf-8":
         case void 0:
          return utf8ToBytes(string).length;

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return 2 * len;

         case "hex":
          return len >>> 1;

         case "base64":
          return base64ToBytes(string).length;

         default:
          if (loweredCase) return utf8ToBytes(string).length;
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
        }
      }
      Buffer.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        var loweredCase = false;
        (void 0 === start || start < 0) && (start = 0);
        if (start > this.length) return "";
        (void 0 === end || end > this.length) && (end = this.length);
        if (end <= 0) return "";
        end >>>= 0;
        start >>>= 0;
        if (end <= start) return "";
        encoding || (encoding = "utf8");
        while (true) switch (encoding) {
         case "hex":
          return hexSlice(this, start, end);

         case "utf8":
         case "utf-8":
          return utf8Slice(this, start, end);

         case "ascii":
          return asciiSlice(this, start, end);

         case "latin1":
         case "binary":
          return latin1Slice(this, start, end);

         case "base64":
          return base64Slice(this, start, end);

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return utf16leSlice(this, start, end);

         default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
        }
      }
      Buffer.prototype._isBuffer = true;
      function swap(b, n, m) {
        var i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer.prototype.swap16 = function swap16() {
        var len = this.length;
        if (len % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (var i = 0; i < len; i += 2) swap(this, i, i + 1);
        return this;
      };
      Buffer.prototype.swap32 = function swap32() {
        var len = this.length;
        if (len % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (var i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer.prototype.swap64 = function swap64() {
        var len = this.length;
        if (len % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
        for (var i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer.prototype.toString = function toString() {
        var length = 0 | this.length;
        if (0 === length) return "";
        if (0 === arguments.length) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer.prototype.equals = function equals(b) {
        if (!Buffer.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return 0 === Buffer.compare(this, b);
      };
      Buffer.prototype.inspect = function inspect() {
        var str = "";
        var max = exports.INSPECT_MAX_BYTES;
        if (this.length > 0) {
          str = this.toString("hex", 0, max).match(/.{2}/g).join(" ");
          this.length > max && (str += " ... ");
        }
        return "<Buffer " + str + ">";
      };
      Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (!Buffer.isBuffer(target)) throw new TypeError("Argument must be a Buffer");
        void 0 === start && (start = 0);
        void 0 === end && (end = target ? target.length : 0);
        void 0 === thisStart && (thisStart = 0);
        void 0 === thisEnd && (thisEnd = this.length);
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) throw new RangeError("out of range index");
        if (thisStart >= thisEnd && start >= end) return 0;
        if (thisStart >= thisEnd) return -1;
        if (start >= end) return 1;
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        var x = thisEnd - thisStart;
        var y = end - start;
        var len = Math.min(x, y);
        var thisCopy = this.slice(thisStart, thisEnd);
        var targetCopy = target.slice(start, end);
        for (var i = 0; i < len; ++i) if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break;
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        if (0 === buffer.length) return -1;
        if ("string" === typeof byteOffset) {
          encoding = byteOffset;
          byteOffset = 0;
        } else byteOffset > 2147483647 ? byteOffset = 2147483647 : byteOffset < -2147483648 && (byteOffset = -2147483648);
        byteOffset = +byteOffset;
        isNaN(byteOffset) && (byteOffset = dir ? 0 : buffer.length - 1);
        byteOffset < 0 && (byteOffset = buffer.length + byteOffset);
        if (byteOffset >= buffer.length) {
          if (dir) return -1;
          byteOffset = buffer.length - 1;
        } else if (byteOffset < 0) {
          if (!dir) return -1;
          byteOffset = 0;
        }
        "string" === typeof val && (val = Buffer.from(val, encoding));
        if (Buffer.isBuffer(val)) {
          if (0 === val.length) return -1;
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
        }
        if ("number" === typeof val) {
          val &= 255;
          if (Buffer.TYPED_ARRAY_SUPPORT && "function" === typeof Uint8Array.prototype.indexOf) return dir ? Uint8Array.prototype.indexOf.call(buffer, val, byteOffset) : Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
          return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        var indexSize = 1;
        var arrLength = arr.length;
        var valLength = val.length;
        if (void 0 !== encoding) {
          encoding = String(encoding).toLowerCase();
          if ("ucs2" === encoding || "ucs-2" === encoding || "utf16le" === encoding || "utf-16le" === encoding) {
            if (arr.length < 2 || val.length < 2) return -1;
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i) {
          return 1 === indexSize ? buf[i] : buf.readUInt16BE(i * indexSize);
        }
        var i;
        if (dir) {
          var foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) if (read(arr, i) === read(val, -1 === foundIndex ? 0 : i - foundIndex)) {
            -1 === foundIndex && (foundIndex = i);
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
          } else {
            -1 !== foundIndex && (i -= i - foundIndex);
            foundIndex = -1;
          }
        } else {
          byteOffset + valLength > arrLength && (byteOffset = arrLength - valLength);
          for (i = byteOffset; i >= 0; i--) {
            var found = true;
            for (var j = 0; j < valLength; j++) if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break;
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
        return -1 !== this.indexOf(val, byteOffset, encoding);
      };
      Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        var remaining = buf.length - offset;
        if (length) {
          length = Number(length);
          length > remaining && (length = remaining);
        } else length = remaining;
        var strLen = string.length;
        if (strLen % 2 !== 0) throw new TypeError("Invalid hex string");
        length > strLen / 2 && (length = strLen / 2);
        for (var i = 0; i < length; ++i) {
          var parsed = parseInt(string.substr(2 * i, 2), 16);
          if (isNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function latin1Write(buf, string, offset, length) {
        return asciiWrite(buf, string, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer.prototype.write = function write(string, offset, length, encoding) {
        if (void 0 === offset) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (void 0 === length && "string" === typeof offset) {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else {
          if (!isFinite(offset)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
          offset |= 0;
          if (isFinite(length)) {
            length |= 0;
            void 0 === encoding && (encoding = "utf8");
          } else {
            encoding = length;
            length = void 0;
          }
        }
        var remaining = this.length - offset;
        (void 0 === length || length > remaining) && (length = remaining);
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) throw new RangeError("Attempt to write outside buffer bounds");
        encoding || (encoding = "utf8");
        var loweredCase = false;
        for (;;) switch (encoding) {
         case "hex":
          return hexWrite(this, string, offset, length);

         case "utf8":
         case "utf-8":
          return utf8Write(this, string, offset, length);

         case "ascii":
          return asciiWrite(this, string, offset, length);

         case "latin1":
         case "binary":
          return latin1Write(this, string, offset, length);

         case "base64":
          return base64Write(this, string, offset, length);

         case "ucs2":
         case "ucs-2":
         case "utf16le":
         case "utf-16le":
          return ucs2Write(this, string, offset, length);

         default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
        }
      };
      Buffer.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        return 0 === start && end === buf.length ? base64.fromByteArray(buf) : base64.fromByteArray(buf.slice(start, end));
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        var res = [];
        var i = start;
        while (i < end) {
          var firstByte = buf[i];
          var codePoint = null;
          var bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            var secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
             case 1:
              firstByte < 128 && (codePoint = firstByte);
              break;

             case 2:
              secondByte = buf[i + 1];
              if (128 === (192 & secondByte)) {
                tempCodePoint = (31 & firstByte) << 6 | 63 & secondByte;
                tempCodePoint > 127 && (codePoint = tempCodePoint);
              }
              break;

             case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if (128 === (192 & secondByte) && 128 === (192 & thirdByte)) {
                tempCodePoint = (15 & firstByte) << 12 | (63 & secondByte) << 6 | 63 & thirdByte;
                tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343) && (codePoint = tempCodePoint);
              }
              break;

             case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if (128 === (192 & secondByte) && 128 === (192 & thirdByte) && 128 === (192 & fourthByte)) {
                tempCodePoint = (15 & firstByte) << 18 | (63 & secondByte) << 12 | (63 & thirdByte) << 6 | 63 & fourthByte;
                tempCodePoint > 65535 && tempCodePoint < 1114112 && (codePoint = tempCodePoint);
              }
            }
          }
          if (null === codePoint) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | 1023 & codePoint;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      var MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        var len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) return String.fromCharCode.apply(String, codePoints);
        var res = "";
        var i = 0;
        while (i < len) res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
        return res;
      }
      function asciiSlice(buf, start, end) {
        var ret = "";
        end = Math.min(buf.length, end);
        for (var i = start; i < end; ++i) ret += String.fromCharCode(127 & buf[i]);
        return ret;
      }
      function latin1Slice(buf, start, end) {
        var ret = "";
        end = Math.min(buf.length, end);
        for (var i = start; i < end; ++i) ret += String.fromCharCode(buf[i]);
        return ret;
      }
      function hexSlice(buf, start, end) {
        var len = buf.length;
        (!start || start < 0) && (start = 0);
        (!end || end < 0 || end > len) && (end = len);
        var out = "";
        for (var i = start; i < end; ++i) out += toHex(buf[i]);
        return out;
      }
      function utf16leSlice(buf, start, end) {
        var bytes = buf.slice(start, end);
        var res = "";
        for (var i = 0; i < bytes.length; i += 2) res += String.fromCharCode(bytes[i] + 256 * bytes[i + 1]);
        return res;
      }
      Buffer.prototype.slice = function slice(start, end) {
        var len = this.length;
        start = ~~start;
        end = void 0 === end ? len : ~~end;
        if (start < 0) {
          start += len;
          start < 0 && (start = 0);
        } else start > len && (start = len);
        if (end < 0) {
          end += len;
          end < 0 && (end = 0);
        } else end > len && (end = len);
        end < start && (end = start);
        var newBuf;
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          newBuf = this.subarray(start, end);
          newBuf.__proto__ = Buffer.prototype;
        } else {
          var sliceLen = end - start;
          newBuf = new Buffer(sliceLen, void 0);
          for (var i = 0; i < sliceLen; ++i) newBuf[i] = this[i + start];
        }
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset];
        var mul = 1;
        var i = 0;
        while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
        return val;
      };
      Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset + --byteLength];
        var mul = 1;
        while (byteLength > 0 && (mul *= 256)) val += this[offset + --byteLength] * mul;
        return val;
      };
      Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        noAssert || checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + 16777216 * this[offset + 3];
      };
      Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return 16777216 * this[offset] + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var val = this[offset];
        var mul = 1;
        var i = 0;
        while (++i < byteLength && (mul *= 256)) val += this[offset + i] * mul;
        mul *= 128;
        val >= mul && (val -= Math.pow(2, 8 * byteLength));
        return val;
      };
      Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
        offset |= 0;
        byteLength |= 0;
        noAssert || checkOffset(offset, byteLength, this.length);
        var i = byteLength;
        var mul = 1;
        var val = this[offset + --i];
        while (i > 0 && (mul *= 256)) val += this[offset + --i] * mul;
        mul *= 128;
        val >= mul && (val -= Math.pow(2, 8 * byteLength));
        return val;
      };
      Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
        noAssert || checkOffset(offset, 1, this.length);
        if (!(128 & this[offset])) return this[offset];
        return -1 * (255 - this[offset] + 1);
      };
      Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        var val = this[offset] | this[offset + 1] << 8;
        return 32768 & val ? 4294901760 | val : val;
      };
      Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        noAssert || checkOffset(offset, 2, this.length);
        var val = this[offset + 1] | this[offset] << 8;
        return 32768 & val ? 4294901760 | val : val;
      };
      Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, true, 23, 4);
      };
      Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        noAssert || checkOffset(offset, 4, this.length);
        return ieee754.read(this, offset, false, 23, 4);
      };
      Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        noAssert || checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, true, 52, 8);
      };
      Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        noAssert || checkOffset(offset, 8, this.length);
        return ieee754.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        byteLength |= 0;
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1;
          checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        var mul = 1;
        var i = 0;
        this[offset] = 255 & value;
        while (++i < byteLength && (mul *= 256)) this[offset + i] = value / mul & 255;
        return offset + byteLength;
      };
      Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        byteLength |= 0;
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1;
          checkInt(this, value, offset, byteLength, maxBytes, 0);
        }
        var i = byteLength - 1;
        var mul = 1;
        this[offset + i] = 255 & value;
        while (--i >= 0 && (mul *= 256)) this[offset + i] = value / mul & 255;
        return offset + byteLength;
      };
      Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 1, 255, 0);
        Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value));
        this[offset] = 255 & value;
        return offset + 1;
      };
      function objectWriteUInt16(buf, value, offset, littleEndian) {
        value < 0 && (value = 65535 + value + 1);
        for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) buf[offset + i] = (value & 255 << 8 * (littleEndian ? i : 1 - i)) >>> 8 * (littleEndian ? i : 1 - i);
      }
      Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 65535, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
        } else objectWriteUInt16(this, value, offset, true);
        return offset + 2;
      };
      Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 65535, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 8;
          this[offset + 1] = 255 & value;
        } else objectWriteUInt16(this, value, offset, false);
        return offset + 2;
      };
      function objectWriteUInt32(buf, value, offset, littleEndian) {
        value < 0 && (value = 4294967295 + value + 1);
        for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) buf[offset + i] = value >>> 8 * (littleEndian ? i : 3 - i) & 255;
      }
      Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 4294967295, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset + 3] = value >>> 24;
          this[offset + 2] = value >>> 16;
          this[offset + 1] = value >>> 8;
          this[offset] = 255 & value;
        } else objectWriteUInt32(this, value, offset, true);
        return offset + 4;
      };
      Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 4294967295, 0);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = 255 & value;
        } else objectWriteUInt32(this, value, offset, false);
        return offset + 4;
      };
      Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        if (!noAssert) {
          var limit = Math.pow(2, 8 * byteLength - 1);
          checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        var i = 0;
        var mul = 1;
        var sub = 0;
        this[offset] = 255 & value;
        while (++i < byteLength && (mul *= 256)) {
          value < 0 && 0 === sub && 0 !== this[offset + i - 1] && (sub = 1);
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength;
      };
      Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
        value = +value;
        offset |= 0;
        if (!noAssert) {
          var limit = Math.pow(2, 8 * byteLength - 1);
          checkInt(this, value, offset, byteLength, limit - 1, -limit);
        }
        var i = byteLength - 1;
        var mul = 1;
        var sub = 0;
        this[offset + i] = 255 & value;
        while (--i >= 0 && (mul *= 256)) {
          value < 0 && 0 === sub && 0 !== this[offset + i + 1] && (sub = 1);
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength;
      };
      Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 1, 127, -128);
        Buffer.TYPED_ARRAY_SUPPORT || (value = Math.floor(value));
        value < 0 && (value = 255 + value + 1);
        this[offset] = 255 & value;
        return offset + 1;
      };
      Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 32767, -32768);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
        } else objectWriteUInt16(this, value, offset, true);
        return offset + 2;
      };
      Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 2, 32767, -32768);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 8;
          this[offset + 1] = 255 & value;
        } else objectWriteUInt16(this, value, offset, false);
        return offset + 2;
      };
      Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = 255 & value;
          this[offset + 1] = value >>> 8;
          this[offset + 2] = value >>> 16;
          this[offset + 3] = value >>> 24;
        } else objectWriteUInt32(this, value, offset, true);
        return offset + 4;
      };
      Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset |= 0;
        noAssert || checkInt(this, value, offset, 4, 2147483647, -2147483648);
        value < 0 && (value = 4294967295 + value + 1);
        if (Buffer.TYPED_ARRAY_SUPPORT) {
          this[offset] = value >>> 24;
          this[offset + 1] = value >>> 16;
          this[offset + 2] = value >>> 8;
          this[offset + 3] = 255 & value;
        } else objectWriteUInt32(this, value, offset, false);
        return offset + 4;
      };
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        noAssert || checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38);
        ieee754.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        noAssert || checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308);
        ieee754.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer.prototype.copy = function copy(target, targetStart, start, end) {
        start || (start = 0);
        end || 0 === end || (end = this.length);
        targetStart >= target.length && (targetStart = target.length);
        targetStart || (targetStart = 0);
        end > 0 && end < start && (end = start);
        if (end === start) return 0;
        if (0 === target.length || 0 === this.length) return 0;
        if (targetStart < 0) throw new RangeError("targetStart out of bounds");
        if (start < 0 || start >= this.length) throw new RangeError("sourceStart out of bounds");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        end > this.length && (end = this.length);
        target.length - targetStart < end - start && (end = target.length - targetStart + start);
        var len = end - start;
        var i;
        if (this === target && start < targetStart && targetStart < end) for (i = len - 1; i >= 0; --i) target[i + targetStart] = this[i + start]; else if (len < 1e3 || !Buffer.TYPED_ARRAY_SUPPORT) for (i = 0; i < len; ++i) target[i + targetStart] = this[i + start]; else Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
        return len;
      };
      Buffer.prototype.fill = function fill(val, start, end, encoding) {
        if ("string" === typeof val) {
          if ("string" === typeof start) {
            encoding = start;
            start = 0;
            end = this.length;
          } else if ("string" === typeof end) {
            encoding = end;
            end = this.length;
          }
          if (1 === val.length) {
            var code = val.charCodeAt(0);
            code < 256 && (val = code);
          }
          if (void 0 !== encoding && "string" !== typeof encoding) throw new TypeError("encoding must be a string");
          if ("string" === typeof encoding && !Buffer.isEncoding(encoding)) throw new TypeError("Unknown encoding: " + encoding);
        } else "number" === typeof val && (val &= 255);
        if (start < 0 || this.length < start || this.length < end) throw new RangeError("Out of range index");
        if (end <= start) return this;
        start >>>= 0;
        end = void 0 === end ? this.length : end >>> 0;
        val || (val = 0);
        var i;
        if ("number" === typeof val) for (i = start; i < end; ++i) this[i] = val; else {
          var bytes = Buffer.isBuffer(val) ? val : utf8ToBytes(new Buffer(val, encoding).toString());
          var len = bytes.length;
          for (i = 0; i < end - start; ++i) this[i + start] = bytes[i % len];
        }
        return this;
      };
      var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = stringtrim(str).replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) str += "=";
        return str;
      }
      function stringtrim(str) {
        if (str.trim) return str.trim();
        return str.replace(/^\s+|\s+$/g, "");
      }
      function toHex(n) {
        if (n < 16) return "0" + n.toString(16);
        return n.toString(16);
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        var codePoint;
        var length = string.length;
        var leadSurrogate = null;
        var bytes = [];
        for (var i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                (units -= 3) > -1 && bytes.push(239, 191, 189);
                continue;
              }
              if (i + 1 === length) {
                (units -= 3) > -1 && bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              (units -= 3) > -1 && bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = 65536 + (leadSurrogate - 55296 << 10 | codePoint - 56320);
          } else leadSurrogate && (units -= 3) > -1 && bytes.push(239, 191, 189);
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(codePoint >> 6 | 192, 63 & codePoint | 128);
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
          } else {
            if (!(codePoint < 1114112)) throw new Error("Invalid code point");
            if ((units -= 4) < 0) break;
            bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, 63 & codePoint | 128);
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        var byteArray = [];
        for (var i = 0; i < str.length; ++i) byteArray.push(255 & str.charCodeAt(i));
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        var c, hi, lo;
        var byteArray = [];
        for (var i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        for (var i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isnan(val) {
        return val !== val;
      }
    }).call(this, "undefined" !== typeof global ? global : "undefined" !== typeof self ? self : "undefined" !== typeof window ? window : {});
  }, {
    "base64-js": 1,
    ieee754: 4,
    isarray: 3
  } ],
  3: [ function(require, module, exports) {
    var toString = {}.toString;
    module.exports = Array.isArray || function(arr) {
      return "[object Array]" == toString.call(arr);
    };
  }, {} ],
  4: [ function(require, module, exports) {
    exports.read = function(buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = 8 * nBytes - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];
      i += d;
      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (;nBits > 0; e = 256 * e + buffer[offset + i], i += d, nBits -= 8) ;
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (;nBits > 0; m = 256 * m + buffer[offset + i], i += d, nBits -= 8) ;
      if (0 === e) e = 1 - eBias; else {
        if (e === eMax) return m ? NaN : Infinity * (s ? -1 : 1);
        m += Math.pow(2, mLen);
        e -= eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };
    exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = 8 * nBytes - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = 23 === mLen ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d = isLE ? 1 : -1;
      var s = value < 0 || 0 === value && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || Infinity === value) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        value += e + eBias >= 1 ? rt / c : rt * Math.pow(2, 1 - eBias);
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e += eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }
      for (;mLen >= 8; buffer[offset + i] = 255 & m, i += d, m /= 256, mLen -= 8) ;
      e = e << mLen | m;
      eLen += mLen;
      for (;eLen > 0; buffer[offset + i] = 255 & e, i += d, e /= 256, eLen -= 8) ;
      buffer[offset + i - d] |= 128 * s;
    };
  }, {} ],
  DBConstantMgr: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "afeb0Mw61VL34NJD30Ogpyv", "DBConstantMgr");
    "use strict";
    module.exports = {
      OPEN: "0",
      BAN: "1",
      ALL: "-1",
      PLAY_GOLD: 2,
      PLAY_JOY: 1,
      SOURCE_VISITOR: 1,
      SOURCE_WE_CHAT: 2,
      SOURCE_ACCOUNT: 3,
      MONEY_TYPE_BEANS: "1",
      MONEY_TYPE_DIAMOND: "2",
      MONEY_TYPE_GOLD: "3",
      MONEY_TYPE_VOUCHER: "4",
      MONEY_TYPE_RMB: "5",
      ROOM_IDENTITY_ROOT: "1",
      ROOM_IDENTITY_CIVILIAN: "2",
      ROOM_TYPE_ORDINARY: "1",
      ROOM_TYPE_QYQ: "2",
      ROOM_TYPE_DLM: "3",
      ROOM_TYPE_MATCHING: "5",
      ROOM_CONSUMPTION_TYPE_ROOT: "1",
      ROOM_CONSUMPTION_TYPE_AA: "2",
      ROOM_STATE_INIT: "0",
      ROOM_STATE_AWAIT: "1",
      ROOM_STATE_PLAYING: "2",
      ROOM_STATE_OVER: "3"
    };
    cc._RF.pop();
  }, {} ],
  DataManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7afdfhdImVKebJs5JJtkXO3", "DataManager");
    "use strict";
    function _typeof(obj) {
      "@babel/helpers - typeof";
      _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function _typeof(obj) {
        return typeof obj;
      } : function _typeof(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      return _typeof(obj);
    }
    var DataManager = cc.Class({
      ctor: function ctor() {
        this._GameInitConfig = {};
        this._CURRNT_Game_scene = "";
        this._CURRNT_Game_Room_constant = "";
        this._CURRNT_Game_users_Num = 0;
      },
      set_GameInitConfig: function set_GameInitConfig(config) {
        this._GameInitConfig = config;
      },
      set_CURRNT_Game_Room_constant: function set_CURRNT_Game_Room_constant(room_constant) {
        this._CURRNT_Game_Room_constant = room_constant;
      },
      get_CURRNT_Game_Room_constant: function get_CURRNT_Game_Room_constant() {
        return this._CURRNT_Game_Room_constant;
      },
      setDataStorage: function setDataStorage(key, value) {
        var value = value;
        try {
          value = JSON.stringify(value);
        } catch (e) {}
        cc.sys.localStorage.setItem(key, value);
      },
      getDataStorage: function getDataStorage(key) {
        var value = cc.sys.localStorage.getItem(key);
        if ("" == value || null == value || void 0 == _typeof(value) || "undefined" == value) return null;
        try {
          value = JSON.parse(value);
        } catch (e) {}
        return value;
      },
      isData_UnNull: function isData_UnNull(data) {
        if (!data && "boolean" !== typeof data || "string" === typeof data && "" == data || null == data || void 0 == _typeof(data) || "undefined" == data) {
          if (0 == data && "number" == typeof data) return true;
          console.warn("data is ".concat(data, "   by ").concat(this.__classname__));
          return false;
        }
        return true;
      }
    });
    cc._RF.pop();
  }, {} ],
  EventManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "e68ac2HB+ZKXa9n0IdoKRc6", "EventManager");
    "use strict";
    function _typeof(obj) {
      "@babel/helpers - typeof";
      _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function _typeof(obj) {
        return typeof obj;
      } : function _typeof(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      return _typeof(obj);
    }
    var updateCallback = [];
    var EventDispatcher = cc.Class({
      ctor: function ctor() {
        this.m_events = [];
        this.m_queue = [];
        this.m_events_obj_uuid = {};
        this.m_cberr = "event callback function is null!";
        var tm = 0;
        var cur = 0;
        this.updateTime();
      },
      def: function def(eventId, cb, obj) {
        var evt = this.m_events[eventId];
        if (!evt) {
          evt = [];
          this.m_events[eventId] = evt;
        }
        this.m_events_obj_uuid[obj.uuid] || (this.m_events_obj_uuid[obj.uuid] = []);
        this.m_events_obj_uuid[obj.uuid].push(eventId);
        this.m_events[eventId].push({
          callback: cb,
          obj: obj
        });
        return this;
      },
      off: function off(obj) {
        if (!obj) return;
        var uuid = obj.uuid;
        var m_events_obj_uuid = this.m_events_obj_uuid[uuid];
        if (!m_events_obj_uuid) return;
        for (var i = 0; i < m_events_obj_uuid.length; i++) {
          var _eventId = m_events_obj_uuid[i];
          var evt = this.m_events[_eventId];
          if (!evt) return;
          for (var j = 0; j < evt.length; j++) {
            var element = evt[j];
            element.obj && element.obj.uuid != uuid || this.m_events[_eventId].splice(j, 1);
          }
          this.m_events[_eventId].length < 1 && delete this.m_events[_eventId];
          console.log("\u79fb\u9664\u4e8b\u4ef6");
          delete this.m_events_obj_uuid[uuid];
        }
      },
      undef: function undef(eventId, cb) {
        var evt = this.m_events[eventId];
        if (evt) for (var i = 0; i < evt.length; ) {
          var item = evt[i];
          if (item.callback == cb) {
            evt.splice(evt.indexOf(item), 1);
            break;
          }
          ++i;
        }
      },
      undefAll: function undefAll(obj) {
        if (!obj) return;
        if ("object" == _typeof(obj)) {
          var evt = this.m_events[eventId];
          if (evt) for (var i = 0; i < evt.length; ) {
            var item = evt[i];
            item.obj == obj ? evt.splice(evt.indexOf(item), 1) : ++i;
          }
        } else this.m_events[obj] = null;
      },
      hasEvent: function hasEvent(eventId) {
        return null != this.m_events[eventId];
      },
      _getEvt: function _getEvt(eventId) {
        var evt = this.m_events[eventId];
        return evt;
      },
      pushEvent: function pushEvent(eventId) {
        for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) params[_key - 1] = arguments[_key];
        this.m_queue.push({
          eventId: eventId,
          params: params,
          timeout: 1
        });
      },
      pushEventImm: function pushEventImm(eventId) {
        for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) params[_key2 - 1] = arguments[_key2];
        this.doEvent(eventId, params);
      },
      doEvent: function doEvent(eventId, params) {
        var evt = this._getEvt(eventId);
        if (!evt) return;
        for (var i = 0; i < evt.length; i++) evt[i].callback.apply(evt[i].obj, params);
      },
      pushEventDelay: function pushEventDelay(eventId, delay) {
        for (var _len3 = arguments.length, params = new Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) params[_key3 - 2] = arguments[_key3];
        this.m_queue.push({
          eventId: eventId,
          params: params,
          timeout: delay
        });
      },
      tick: function tick(delay) {
        for (var i = 0; i < this.m_queue.length; ) {
          var item = this.m_queue[i];
          if (item.timeout <= 0) {
            this.doEvent(item.eventId, item.params);
            this.m_queue.splice(this.m_queue.indexOf(item), 1);
          } else {
            item.timeout -= delay;
            ++i;
          }
        }
      },
      setUpdateCallback: function setUpdateCallback(callback) {
        for (var index = 0; index < updateCallback.length; index++) if (updateCallback[index] == callback) return;
        updateCallback.push(callback);
      },
      updateTime: function updateTime() {
        setInterval(function() {
          if (updateCallback.length > 0) for (var index = 0; index < updateCallback.length; index++) updateCallback[index](index);
        }, 1e3);
      },
      removeUpdateCallbackForValue: function removeUpdateCallbackForValue(index) {
        for (var j = 0; j < updateCallback.length; j++) j == index && updateCallback.splice(j, 1);
        console.log("updateCallback.length", updateCallback.length);
      }
    });
    module.exports = new EventDispatcher();
    cc.game_frame_EventMgr = cc.game_frame_EventMgr || null;
    cc.game_frame_EventMgr = module.exports;
    cc._RF.pop();
  }, {} ],
  GameConfing: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "5ee8doYsVRG+pImolS//nFs", "GameConfing");
    "use strict";
    var ToolsManager = require("ToolsManager");
    var LabelMsgManager = require("LabelMsgManager");
    var UserDao = require("UserDao");
    var SystemDao = require("SystemDao");
    var GameDao = require("GameDao");
    var ShopDao = require("ShopDao");
    var HTTPManager = require("HTTPManager");
    var AudioManager = require("AudioManager");
    var DataManager = require("DataManager");
    var _require = require("./WSMsgKeyEnum"), ShangHaiQiaoMa = _require.ShangHaiQiaoMa;
    var game_Config = game_Config || {};
    game_Config.Tools = ToolsManager;
    game_Config.LabelMsg = LabelMsgManager;
    game_Config.HTTP = HTTPManager;
    game_Config.AudioMgr = new AudioManager();
    game_Config.DataMgr = new DataManager();
    game_Config.DAO = {
      UserDao: new UserDao(),
      SystemDao: new SystemDao(),
      GameDao: new GameDao(),
      ShopDao: new ShopDao()
    };
    game_Config.urlSystem = {
      run: "dev",
      dev: window.__MAHJONG_HTTP_URL__ || "http://127.0.0.1:15103",
      test: "https://xsmjapi.19960909.com:15103"
    }, game_Config.wsURLSystem = {
      game_Service: {
        run: "dev",
        dev: window.__MAHJONG_WS_URL__ || "http://192.168.31.155:41000",
        test: "http://152.136.253.46:41000"
      }
    }, game_Config.CODE = {
      success: 200,
      not_login: 401,
      clientError: 10086
    };
    game_Config.constant_localStorage = {
      visitor_account: "visitor_account"
    };
    game_Config.play_type = {
      HLC: "1",
      JBC: "2"
    };
    game_Config.money_type = {
      beans: "1",
      diamond: "2",
      gold: "3",
      voucher: "4",
      RMB: "5"
    };
    game_Config.seats_conf = {
      myself: {
        id: "myself",
        name: "\u81ea\u5df1"
      },
      right: {
        id: "right",
        name: "\u4e0b\u5bb6"
      },
      left: {
        id: "left",
        name: "\u4e0a\u5bb6"
      },
      top: {
        id: "top",
        name: "\u5bf9\u5bb6"
      }
    };
    game_Config.play_title_image_Path = "img/scene/select_home/label/";
    game_Config.arrow_image_Path = [ "img/scene/select_home/arrow/drop-down", "img/scene/select_home/arrow/Packup" ];
    game_Config.Card_TYPE = cc.Enum({
      Poker_TYPE: 0,
      Mahjong_TYPE: 1
    });
    game_Config.play_game_conf = {
      DouDiZhu: {
        gameKey: "DouDiZhu",
        serverHost_constant: 125,
        max_seat_num: 3,
        seats_list: {
          3: [ "myself", "right", "left" ]
        },
        operating_Area: {
          expose_holds: "expose_holds",
          call_landlord: "call_landlord",
          rob_landlord: "rob_landlord",
          btn: "btn"
        },
        action_state: {
          await_expose_holds: 0,
          expose_holds: 1,
          call_landlord_playing: 2,
          call_landlord: 3,
          not_call_landlord: 4,
          not_rob_landlord: 5,
          rob_landlord: 6,
          rob_landlord_playing: 7,
          playing: 8,
          not_out: 9,
          out_card_await: 10,
          not_out_card_await: 11
        },
        game_scene: {
          game_start: 1,
          expose_holds: 2,
          call_landlord: 3,
          game_move: 4,
          game_over: 5
        }
      },
      MaiZui: {
        game_name: "\u4e70\u5634\u9ebb\u5c06",
        gameKey: "MaiZui",
        gameTypeKey: "maJiang",
        serverHost_constant: 127,
        game_constant: 111,
        max_seat_num: 4,
        max_card_len: 13,
        ws_class: "MahjongMaiZuWSDao",
        service_class: "Mahjong_game_maiZui_service",
        seats_list: {
          4: [ "myself", "right", "left", "top" ]
        },
        card_conf: {
          "-1": {
            id: "-1",
            name: "\u6263\u724c\u80cc\u666f",
            icon_res: "myself_hideCard"
          },
          1: {
            id: 1,
            name: "\u4e00\u4e07",
            icon_res: "w1"
          },
          2: {
            id: 2,
            name: "\u4e8c\u4e07",
            icon_res: "w2"
          },
          3: {
            id: 3,
            name: "\u4e09\u4e07",
            icon_res: "w3"
          },
          4: {
            id: 4,
            name: "\u56db\u4e07",
            icon_res: "w4"
          },
          5: {
            id: 5,
            name: "\u4e94\u4e07",
            icon_res: "w5"
          },
          6: {
            id: 6,
            name: "\u516d\u4e07",
            icon_res: "w6"
          },
          7: {
            id: 7,
            name: "\u4e03\u4e07",
            icon_res: "w7"
          },
          8: {
            id: 8,
            name: "\u516b\u4e07",
            icon_res: "w8"
          },
          9: {
            id: 9,
            name: "\u4e5d\u4e07",
            icon_res: "w9"
          },
          17: {
            id: 17,
            name: "\u4e00\u6761",
            icon_res: "t1"
          },
          18: {
            id: 18,
            name: "\u4e8c\u6761",
            icon_res: "t2"
          },
          19: {
            id: 19,
            name: "\u4e09\u6761",
            icon_res: "t3"
          },
          20: {
            id: 20,
            name: "\u56db\u6761",
            icon_res: "t4"
          },
          21: {
            id: 21,
            name: "\u4e94\u6761",
            icon_res: "t5"
          },
          22: {
            id: 22,
            name: "\u516d\u6761",
            icon_res: "t6"
          },
          23: {
            id: 23,
            name: "\u4e03\u6761",
            icon_res: "t7"
          },
          24: {
            id: 24,
            name: "\u516b\u6761",
            icon_res: "t8"
          },
          25: {
            id: 25,
            name: "\u4e5d\u6761",
            icon_res: "t9"
          },
          33: {
            id: 33,
            name: "\u4e00\u7b52",
            icon_res: "b1"
          },
          34: {
            id: 34,
            name: "\u4e8c\u7b52",
            icon_res: "b2"
          },
          35: {
            id: 35,
            name: "\u4e09\u7b52",
            icon_res: "b3"
          },
          36: {
            id: 36,
            name: "\u56db\u7b52",
            icon_res: "b4"
          },
          37: {
            id: 37,
            name: "\u4e94\u7b52",
            icon_res: "b5"
          },
          38: {
            id: 38,
            name: "\u516d\u7b52",
            icon_res: "b6"
          },
          39: {
            id: 39,
            name: "\u4e03\u7b52",
            icon_res: "b7"
          },
          40: {
            id: 40,
            name: "\u516b\u7b52",
            icon_res: "b8"
          },
          41: {
            id: 41,
            name: "\u4e5d\u7b52",
            icon_res: "b9"
          },
          48: {
            id: 48,
            name: "\u4e1c",
            icon_res: "f_dong"
          },
          64: {
            id: 64,
            name: "\u897f",
            icon_res: "f_xi"
          },
          80: {
            id: 80,
            name: "\u5357",
            icon_res: "f_nan"
          },
          96: {
            id: 96,
            name: "\u5317",
            icon_res: "f_bei"
          },
          112: {
            id: 112,
            name: "\u4e2d",
            icon_res: "hz"
          },
          128: {
            id: 128,
            name: "\u53d1\u8d22",
            icon_res: "fc"
          },
          144: {
            id: 144,
            name: "\u767d\u677f",
            icon_res: "28"
          }
        },
        action_state: {
          hold_card: 0,
          send_card: 1,
          knock_card: 2,
          collision_card: 3,
          hide_card: 4,
          hu_card: 5,
          wait: 6,
          self_hu: 7,
          hu_card_over: 8,
          self_hu_over: 9,
          knock_and_collsion: 10,
          knock_collsion_hu: 11,
          knock_and_hu: 12,
          mai_zui: 13,
          ting: 14,
          winner: 15,
          loser: 16,
          prepare: 17,
          await: 18,
          collision_and_hu: 19
        },
        game_scene: {
          repare: 1,
          game_start: 2,
          game_maizui: 3,
          game_move: 4,
          game_over: 5,
          single_over: 6,
          tie_over: 7,
          wait_over: 8
        },
        identity_conf: {
          boss_code: 1,
          common_code: 0
        },
        ting_state: {
          not_ting: -1,
          wait_ting: 0,
          ting: 1
        },
        maiZui_conf: {
          key: [ "\u5360\u5e84", "\u8fde\u516d", "\u65ad\u5e7a", "\u756a\u5b50", "\u72ec\u4e94", "\u574e\u5b50", "\u516b\u53ea", "\u4e94\u4e2a\u5934", "\u5e7a\u9e21\u5934", "\u7f3a\u4e00\u95e8" ],
          val: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
          isDefaultAllMaiZui: false
        },
        score_details_conf: [ "\u5634\u5b50", "\u81ed\u724c", "\u80e1\u724c", "\u81ea\u6478", "\u663e\u542c", "\u663e\u542c\u81ea\u6478" ],
        hu_state: {
          not_hu: {
            id: -1,
            name: "\u672a\u80e1"
          },
          ping_hu: {
            id: 0,
            name: "\u5e73\u80e1"
          },
          qing_yi_se: {
            id: 1,
            name: "\u6e05\u4e00\u8272"
          },
          yi_tiao_long: {
            id: 2,
            name: "\u4e00\u6761\u9f99"
          },
          yi_tiao_long_and_qing_yi_se: {
            id: 3,
            name: "\u6e05\u4e00\u8272,\u4e00\u6761\u9f99"
          },
          bian_or_kan: {
            id: 4,
            name: "\u80e1"
          }
        },
        anim_state: {
          empty: 0,
          knock_card: 1,
          collision_card: 2,
          ping_hu: 3,
          self_hu: 4,
          qing_yi_se: 5,
          yi_tiao_long: 6,
          yi_tiao_long_and_qing_yi_se: 7,
          ting_card: 8
        }
      },
      QuYangMaJiang: {
        game_name: "\u66f2\u9633\u9ebb\u5c06",
        gameKey: "QuYangMaJiang",
        gameTypeKey: "maJiang",
        serverHost_constant: 125,
        game_constant: 111,
        max_seat_num: 4,
        max_card_len: 13,
        ws_class: "MahjongQuYangWSDao",
        service_class: "Mahjong_game_quYang_service",
        seats_list: {
          4: [ "myself", "right", "left", "top" ]
        },
        card_conf: {
          "-1": {
            id: "-1",
            name: "\u6263\u724c\u80cc\u666f",
            icon_res: "myself_hideCard"
          },
          1: {
            id: 1,
            name: "\u4e00\u4e07",
            icon_res: "w1"
          },
          2: {
            id: 2,
            name: "\u4e8c\u4e07",
            icon_res: "w2"
          },
          3: {
            id: 3,
            name: "\u4e09\u4e07",
            icon_res: "w3"
          },
          4: {
            id: 4,
            name: "\u56db\u4e07",
            icon_res: "w4"
          },
          5: {
            id: 5,
            name: "\u4e94\u4e07",
            icon_res: "w5"
          },
          6: {
            id: 6,
            name: "\u516d\u4e07",
            icon_res: "w6"
          },
          7: {
            id: 7,
            name: "\u4e03\u4e07",
            icon_res: "w7"
          },
          8: {
            id: 8,
            name: "\u516b\u4e07",
            icon_res: "w8"
          },
          9: {
            id: 9,
            name: "\u4e5d\u4e07",
            icon_res: "w9"
          },
          17: {
            id: 17,
            name: "\u4e00\u6761",
            icon_res: "t1"
          },
          18: {
            id: 18,
            name: "\u4e8c\u6761",
            icon_res: "t2"
          },
          19: {
            id: 19,
            name: "\u4e09\u6761",
            icon_res: "t3"
          },
          20: {
            id: 20,
            name: "\u56db\u6761",
            icon_res: "t4"
          },
          21: {
            id: 21,
            name: "\u4e94\u6761",
            icon_res: "t5"
          },
          22: {
            id: 22,
            name: "\u516d\u6761",
            icon_res: "t6"
          },
          23: {
            id: 23,
            name: "\u4e03\u6761",
            icon_res: "t7"
          },
          24: {
            id: 24,
            name: "\u516b\u6761",
            icon_res: "t8"
          },
          25: {
            id: 25,
            name: "\u4e5d\u6761",
            icon_res: "t9"
          },
          33: {
            id: 33,
            name: "\u4e00\u7b52",
            icon_res: "b1"
          },
          34: {
            id: 34,
            name: "\u4e8c\u7b52",
            icon_res: "b2"
          },
          35: {
            id: 35,
            name: "\u4e09\u7b52",
            icon_res: "b3"
          },
          36: {
            id: 36,
            name: "\u56db\u7b52",
            icon_res: "b4"
          },
          37: {
            id: 37,
            name: "\u4e94\u7b52",
            icon_res: "b5"
          },
          38: {
            id: 38,
            name: "\u516d\u7b52",
            icon_res: "b6"
          },
          39: {
            id: 39,
            name: "\u4e03\u7b52",
            icon_res: "b7"
          },
          40: {
            id: 40,
            name: "\u516b\u7b52",
            icon_res: "b8"
          },
          41: {
            id: 41,
            name: "\u4e5d\u7b52",
            icon_res: "b9"
          },
          48: {
            id: 48,
            name: "\u4e1c",
            icon_res: "f_dong"
          },
          64: {
            id: 64,
            name: "\u897f",
            icon_res: "f_xi"
          },
          80: {
            id: 80,
            name: "\u5357",
            icon_res: "f_nan"
          },
          96: {
            id: 96,
            name: "\u5317",
            icon_res: "f_bei"
          },
          112: {
            id: 112,
            name: "\u4e2d",
            icon_res: "hz"
          },
          128: {
            id: 128,
            name: "\u53d1\u8d22",
            icon_res: "fc"
          },
          144: {
            id: 144,
            name: "\u767d\u677f",
            icon_res: "28"
          }
        },
        action_state: {
          hold_card: 0,
          send_card: 1,
          knock_card: 2,
          collision_card: 3,
          hide_card: 4,
          hu_card: 5,
          wait: 6,
          self_hu: 7,
          hu_card_over: 8,
          self_hu_over: 9,
          knock_and_collsion: 10,
          knock_collsion_hu: 11,
          knock_and_hu: 12,
          mai_zui: 13,
          ting: 14,
          winner: 15,
          loser: 16,
          prepare: 17,
          await: 18
        },
        ting_state: {
          not_ting: -1,
          wait_ting: 0,
          ting: 1
        },
        anim_state: {
          empty: 0,
          knock_card: 1,
          collision_card: 2,
          ping_hu: 3,
          self_hu: 4,
          qing_yi_se: 5,
          yi_tiao_long: 6,
          yi_tiao_long_and_qing_yi_se: 7,
          ting_card: 8
        },
        game_scene: {
          game_start: 1,
          hide_holds: 2,
          game_move: 3,
          game_over: 4,
          single_over: 5,
          tie_over: 6,
          wait_over: 7
        },
        identity_conf: {
          boss_code: 1,
          common_code: 0
        },
        hu_state: {
          not_hu: {
            id: -1,
            name: "\u672a\u80e1"
          },
          ping_hu: {
            id: 0,
            name: "\u5e73\u80e1"
          },
          qing_yi_se: {
            id: 1,
            name: "\u6e05\u4e00\u8272"
          },
          yi_tiao_long: {
            id: 2,
            name: "\u4e00\u6761\u9f99"
          },
          yi_tiao_long_and_qing_yi_se: {
            id: 3,
            name: "\u6e05\u4e00\u8272,\u4e00\u6761\u9f99"
          },
          bian_or_kan: {
            id: 4,
            name: "\u80e1"
          }
        }
      },
      ShangHaiQiaoMa: {
        game_name: "\u4e0a\u6d77\u6572\u9ebb",
        gameKey: "ShangHaiQiaoMa",
        gameTypeKey: "maJiang",
        serverHost_constant: 128,
        game_constant: 111,
        max_seat_num: 4,
        max_card_len: 13,
        ws_class: "MahjongShangHaiQiaoMaWSDao",
        service_class: "Mahjong_game_shangHaiQiaoMa_service",
        seats_list: {
          4: [ "myself", "right", "left", "top" ]
        },
        card_conf: {
          "-1": {
            id: "-1",
            name: "\u6263\u724c\u80cc\u666f",
            icon_res: "myself_hideCard"
          },
          1: {
            id: 1,
            name: "\u4e00\u4e07",
            icon_res: "w1"
          },
          2: {
            id: 2,
            name: "\u4e8c\u4e07",
            icon_res: "w2"
          },
          3: {
            id: 3,
            name: "\u4e09\u4e07",
            icon_res: "w3"
          },
          4: {
            id: 4,
            name: "\u56db\u4e07",
            icon_res: "w4"
          },
          5: {
            id: 5,
            name: "\u4e94\u4e07",
            icon_res: "w5"
          },
          6: {
            id: 6,
            name: "\u516d\u4e07",
            icon_res: "w6"
          },
          7: {
            id: 7,
            name: "\u4e03\u4e07",
            icon_res: "w7"
          },
          8: {
            id: 8,
            name: "\u516b\u4e07",
            icon_res: "w8"
          },
          9: {
            id: 9,
            name: "\u4e5d\u4e07",
            icon_res: "w9"
          },
          17: {
            id: 17,
            name: "\u4e00\u6761",
            icon_res: "t1"
          },
          18: {
            id: 18,
            name: "\u4e8c\u6761",
            icon_res: "t2"
          },
          19: {
            id: 19,
            name: "\u4e09\u6761",
            icon_res: "t3"
          },
          20: {
            id: 20,
            name: "\u56db\u6761",
            icon_res: "t4"
          },
          21: {
            id: 21,
            name: "\u4e94\u6761",
            icon_res: "t5"
          },
          22: {
            id: 22,
            name: "\u516d\u6761",
            icon_res: "t6"
          },
          23: {
            id: 23,
            name: "\u4e03\u6761",
            icon_res: "t7"
          },
          24: {
            id: 24,
            name: "\u516b\u6761",
            icon_res: "t8"
          },
          25: {
            id: 25,
            name: "\u4e5d\u6761",
            icon_res: "t9"
          },
          33: {
            id: 33,
            name: "\u4e00\u7b52",
            icon_res: "b1"
          },
          34: {
            id: 34,
            name: "\u4e8c\u7b52",
            icon_res: "b2"
          },
          35: {
            id: 35,
            name: "\u4e09\u7b52",
            icon_res: "b3"
          },
          36: {
            id: 36,
            name: "\u56db\u7b52",
            icon_res: "b4"
          },
          37: {
            id: 37,
            name: "\u4e94\u7b52",
            icon_res: "b5"
          },
          38: {
            id: 38,
            name: "\u516d\u7b52",
            icon_res: "b6"
          },
          39: {
            id: 39,
            name: "\u4e03\u7b52",
            icon_res: "b7"
          },
          40: {
            id: 40,
            name: "\u516b\u7b52",
            icon_res: "b8"
          },
          41: {
            id: 41,
            name: "\u4e5d\u7b52",
            icon_res: "b9"
          },
          48: {
            id: 48,
            name: "\u4e1c",
            icon_res: "f_dong"
          },
          64: {
            id: 64,
            name: "\u897f",
            icon_res: "f_xi"
          },
          80: {
            id: 80,
            name: "\u5357",
            icon_res: "f_nan"
          },
          96: {
            id: 96,
            name: "\u5317",
            icon_res: "f_bei"
          },
          112: {
            id: 112,
            name: "\u4e2d",
            icon_res: "hz"
          },
          128: {
            id: 128,
            name: "\u53d1\u8d22",
            icon_res: "fc"
          },
          144: {
            id: 144,
            name: "\u767d\u677f",
            icon_res: "28"
          },
          160: {
            id: 144,
            name: "\u6625",
            icon_res: "hzmj_95"
          },
          161: {
            id: 144,
            name: "\u590f",
            icon_res: "hzmj_94"
          },
          162: {
            id: 144,
            name: "\u79cb",
            icon_res: "hzmj_93"
          },
          163: {
            id: 144,
            name: "\u51ac",
            icon_res: "hzmj_92"
          },
          164: {
            id: 144,
            name: "\u6885",
            icon_res: "hzmj_99"
          },
          165: {
            id: 144,
            name: "\u5170",
            icon_res: "hzmj_98"
          },
          166: {
            id: 144,
            name: "\u7af9",
            icon_res: "hzmj_97"
          },
          167: {
            id: 144,
            name: "\u83ca",
            icon_res: "hzmj_96"
          }
        },
        action_state: {
          hold_card: 0,
          send_card: 1,
          knock_card: 2,
          collision_card: 3,
          chi_card: 4,
          hu_card: 5,
          wait: 6,
          self_hu: 7,
          hu_card_over: 8,
          self_hu_over: 9,
          knock_and_collsion: 10,
          knock_collsion_hu: 11,
          knock_and_hu: 12,
          ting: 14,
          winner: 15,
          loser: 16,
          prepare: 17,
          await: 18,
          collision_and_hu: 19,
          room_await: 20
        },
        game_scene: {
          repare: 1,
          game_start: 2,
          shaizi: 3,
          game_move: 4,
          game_over: 5,
          single_over: 6,
          tie_over: 7,
          wait_over: 8
        },
        identity_conf: {
          boss_code: 1,
          common_code: 0
        },
        ting_state: {
          not_ting: -1,
          wait_ting: 0,
          ting: 1
        },
        maiZui_conf: {
          key: [ "\u5360\u5e84", "\u8fde\u516d", "\u65ad\u5e7a", "\u756a\u5b50", "\u72ec\u4e94", "\u574e\u5b50", "\u516b\u53ea", "\u4e94\u4e2a\u5934", "\u5e7a\u9e21\u5934", "\u7f3a\u4e00\u95e8" ],
          val: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
          isDefaultAllMaiZui: false
        },
        score_details_conf: [ "\u5634\u5b50", "\u81ed\u724c", "\u80e1\u724c", "\u81ea\u6478", "\u663e\u542c", "\u663e\u542c\u81ea\u6478" ],
        hu_state: {
          not_hu: {
            id: -1,
            name: "\u672a\u80e1"
          },
          ping_hu: {
            id: 0,
            name: "\u5e73\u80e1"
          },
          qing_yi_se: {
            id: 1,
            name: "\u6e05\u4e00\u8272"
          },
          yi_tiao_long: {
            id: 2,
            name: "\u4e00\u6761\u9f99"
          },
          yi_tiao_long_and_qing_yi_se: {
            id: 3,
            name: "\u6e05\u4e00\u8272,\u4e00\u6761\u9f99"
          },
          bian_or_kan: {
            id: 4,
            name: "\u80e1"
          }
        },
        anim_state: {
          empty: 0,
          knock_card: 1,
          collision_card: 2,
          ping_hu: 3,
          self_hu: 4,
          qing_yi_se: 5,
          yi_tiao_long: 6,
          yi_tiao_long_and_qing_yi_se: 7,
          ting_card: 8
        }
      }
    };
    game_Config.runGame = "ShangHaiQiaoMa";
    module.exports = game_Config;
    cc.myBaseMgr = cc.myBaseMgr || {};
    cc.myBaseMgr = module.exports;
    cc._RF.pop();
  }, {
    "./WSMsgKeyEnum": "WSMsgKeyEnum",
    AudioManager: "AudioManager",
    DataManager: "DataManager",
    GameDao: "GameDao",
    HTTPManager: "HTTPManager",
    LabelMsgManager: "LabelMsgManager",
    ShopDao: "ShopDao",
    SystemDao: "SystemDao",
    ToolsManager: "ToolsManager",
    UserDao: "UserDao"
  } ],
  GameDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "eae4eEYiadMnZGAcfa5n1bR", "GameDao");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        present_gameKey: null,
        present_gameWSDao: null,
        present_gameService: null,
        present_roomType: null,
        present_play_constant: null,
        present_max_inning: null,
        present_is_create_friend: false
      },
      getPlaylist: function getPlaylist(data, callback) {
        var token = cc.myBaseMgr.DAO.UserDao.token;
        var type = data.type;
        var game_id = data.game_id;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["token"]));
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(type)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["PlayingField_TYPE"]));
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(game_id)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["game_id"]));
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          token: token,
          type: type,
          game_id: game_id
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/games/getPlaylist", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            callback && callback(true, msg, data);
          } else callback && callback(false, msg, data);
        });
      },
      addGameHistor: function addGameHistor(data, callback) {
        var token = cc.myBaseMgr.DAO.UserDao.token;
        var gameConstant = data.gameConstant;
        var gamePatternType = data.gamePatternType;
        var gamePlayConstant = data.gamePlayConstant;
        var successfulOrFailure = data.successfulOrFailure;
        var deductCurrencyType = data.deductCurrencyType;
        var deductCurrencyNum = data.deductCurrencyNum;
        var detailsJsonData = data.detailsJsonData;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["token"]));
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(gameConstant)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(gamePatternType)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(gamePlayConstant)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(successfulOrFailure)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(deductCurrencyType)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(deductCurrencyNum)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(detailsJsonData)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          return true;
        }
        function isError() {
          try {
            JSON.parse(detailsJsonData);
          } catch (error) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_ERROR"]);
            return;
          }
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          gameConstant: gameConstant,
          gamePatternType: gamePatternType,
          gamePlayConstant: gamePlayConstant,
          successfulOrFailure: successfulOrFailure,
          deductCurrencyType: deductCurrencyType,
          deductCurrencyNum: deductCurrencyNum,
          detailsJsonData: detailsJsonData
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/games/addGameHistor", resdata, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      },
      createRoom: function createRoom(data, callback) {
        var gameConstant = data.gameConstant;
        var maxInning = data.maxInning;
        var maxPeopleNum = data.maxPeopleNum;
        var endPoint = data.endPoint;
        var roomConsumptionType = data.roomConsumptionType;
        var roomType = data.roomType;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(gameConstant)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(maxInning)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(maxPeopleNum)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(endPoint)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(roomConsumptionType)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(roomType)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          gameConstant: gameConstant,
          maxInning: maxInning,
          maxPeopleNum: maxPeopleNum,
          endPoint: endPoint,
          roomConsumptionType: roomConsumptionType,
          roomType: roomType
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/room/createRoom", resdata, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      },
      joinRoom: function joinRoom(data, callback) {
        var roomid = data.roomid;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(roomid)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          roomid: roomid,
          is_create_friend: !!cc.myBaseMgr.DAO.GameDao.present_is_create_friend
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/room/joinRoom", resdata, function(code, msg, data) {
          code == cc.myBaseMgr.CODE.success && cc.myBaseMgr.DAO.UserDao._setUserInfo({
            roomid: roomid
          });
          callback && callback(code, msg, data);
        });
      },
      isOnline: function isOnline(data, callback) {
        function isNull() {
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        cc.myBaseMgr.HTTP.post("/cloudgameapi/room/isOnline", null, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      },
      setPresentGameKey: function setPresentGameKey(present_gameKey, present_roomType) {
        this.present_gameKey = present_gameKey;
        this.present_roomType = present_roomType;
        var game_conf = cc.myBaseMgr["play_game_conf"][this.present_gameKey];
        var ws_class = require(game_conf.ws_class);
        this.setPresentGameWSDao(new ws_class());
      },
      setPresentGameWSDao: function setPresentGameWSDao(present_gameWSDao) {
        this.present_gameWSDao = present_gameWSDao;
      },
      setPresentGameService: function setPresentGameService(present_gameService) {
        this.present_gameService = present_gameService;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  GameLogin: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "0c0fbtXxBdJo5euJL5xXVsO", "GameLogin");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        game_start_animation: {
          default: null,
          type: sp.Skeleton,
          displayName: "\u6d4b\u8bd5\u7279\u6548 \u52a8\u753b",
          tooltip: "\u6d4b\u8bd5\u7279\u6548 \u52a8\u753b"
        }
      },
      start: function start() {
        var self = this;
        cc.myBaseMgr.AudioMgr.playBGM("MusicEx_Normal");
        cc.director.preloadScene("GameMain", function() {
          cc.log("GameMain \u9884\u52a0\u8f7d\u5b8c\u6210");
        });
        function enterGameMain() {
          if (self._appAutoEntered) return;
          self._appAutoEntered = true;
          self.loadScene("GameMain");
        }
        function tryAppLogin(retryCount) {
          if (cc.myBaseMgr.DAO.UserDao.applyAppLogin && cc.myBaseMgr.DAO.UserDao.applyAppLogin()) {
            enterGameMain();
            return;
          }
          if (retryCount > 0) {
            self.scheduleOnce(function() {
              tryAppLogin(retryCount - 1);
            }, .2);
            return;
          }
          self.visitor_login(true);
        }
        tryAppLogin(10);
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_wxdl":
          this.visitor_login(true);
          break;

         case "btn_ykdl":
          this.visitor_login();
          break;

         case "btn_zhdl":
          this.account_login();
        }
      },
      visitor_login: function visitor_login(isCache) {
        var self = this;
        function onVisitor_login(visitor_account) {
          cc.myBaseMgr.DAO.UserDao.onVisitor_login(visitor_account, function(code, message, data) {
            switch (code) {
             case cc.myBaseMgr.CODE.success:
              cc.myBaseMgr.DataMgr.setDataStorage(cc.myBaseMgr.constant_localStorage.visitor_account, visitor_account);
              onGetLoginInfoByToken();
              break;

             case cc.myBaseMgr.CODE.clientError:
            }
          });
        }
        function onGetLoginInfoByToken() {
          cc.myBaseMgr.DAO.UserDao.onGetLoginInfoByToken(function(code, message, data) {
            switch (code) {
             case cc.myBaseMgr.CODE.success:
              self.loadScene("GameMain");
              break;

             case cc.myBaseMgr.CODE.not_login:
            }
          });
        }
        var visitor_account = null;
        if (isCache) {
          visitor_account = cc.myBaseMgr.DataMgr.getDataStorage(cc.myBaseMgr.constant_localStorage.visitor_account);
          visitor_account || (visitor_account = cc.myBaseMgr.Tools.Str.getuuid());
        }
        visitor_account || (visitor_account = cc.myBaseMgr.Tools.Str.GetQueryString("a"));
        onVisitor_login(visitor_account);
      },
      account_login: function account_login() {
        this.creater_Layer("account_login_layer");
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  GameMain: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "c398fYnwgtGfJK2HqeW8xFY", "GameMain");
    "use strict";
    var UIManager = require("UIManager");
    var DBConstantMgr = require("DBConstantMgr");
    cc.Class({
      extends: UIManager,
      properties: {},
      onLoad: function onLoad() {
        if ("undefined" != typeof window) {
          window.__mahjongApplyAppInit && window.__mahjongApplyAppInit(window.__MAHJONG_APP_INIT__ || window.__GAME_APP_INIT__ || {});
          window.__mahjongRequestBalance && window.__mahjongRequestBalance();
        }
        this._preloadCommonResources();
      },
      _preloadCommonResources: function _preloadCommonResources() {
        this.scheduleOnce(function() {
          var preloadPrefabs = [ "prefab/layer/loading_layer", "prefab/layer/create_room_layer", "prefab/layer/join_room_layer", "prefab/layer/msg_layer" ];
          for (var i = 0; i < preloadPrefabs.length; i++) cc.loader.loadRes(preloadPrefabs[i], cc.Prefab, function(err) {
            err && cc.warn("[\u9884\u52a0\u8f7d] prefab \u52a0\u8f7d\u5931\u8d25", err);
          });
          cc.director.preloadScene("MaJiang", function() {}, function() {
            cc.log("[\u9884\u52a0\u8f7d] MaJiang \u573a\u666f\u9884\u52a0\u8f7d\u5b8c\u6210");
          });
        }, .2);
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_game_history":
          console.log("\u6e38\u620f\u8bb0\u5f55");
          this.creater_Layer("game_history_layer");
          break;

         case "btn_set":
          console.log("\u8bbe\u7f6e");
          this.creater_Layer("set_layer");
          break;

         case "btn_mail":
          console.log("\u90ae\u4ef6");
          this.creater_Layer("mail_layer");
          break;

         case "user_info":
          console.log("\u7528\u6237\u4fe1\u606f");
          this.creater_Layer("user_info_layer");
          break;

         case "btn_shop":
          console.log("\u5546\u57ce");
          this.creater_Layer("shop_layer");
          break;

         case "btn_rules":
          console.log("\u89c4\u5219");
          this.creater_Layer("rules_layer");
          break;

         case "btn_share":
          console.log("\u5206\u4eab");
          this.creater_Layer("share_layer");
          break;

         case "btn_service":
          console.log("\u5ba2\u670d");
          this.creater_Layer("game_service_info_layer");
          break;

         default:
          this.creater_Layer("msg_layer", {
            text: cc.myBaseMgr.LabelMsg.NOT_OPEN
          });
        }
      },
      onbtnSceneClickEvents: function onbtnSceneClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_bsc":
          console.log("\u6bd4\u8d5b\u573a");
          break;

         case "btn_hlc":
          console.log("\u6b22\u4e50\u573a");
          break;

         case "btn_jrfj":
          console.log("\u52a0\u5165\u623f\u95f4");
          cc.myBaseMgr.DAO.GameDao.isOnline(null, function(code, message, data) {
            switch (code) {
             case cc.myBaseMgr.CODE.success:
              cc.myBaseMgr.DAO.GameDao.joinRoom({
                roomid: data.roomid
              }, function(code, message, data) {
                switch (code) {
                 case cc.myBaseMgr.CODE.success:
                  cc.myBaseMgr.DAO.GameDao.setPresentGameKey(cc.myBaseMgr.runGame, DBConstantMgr.ROOM_TYPE_ORDINARY);
                  this.loadScene("MaJiang");
                  break;

                 default:
                  this.creater_Layer("msg_layer", {
                    text: message
                  });
                }
              }.bind(this));
              break;

             default:
              this.creater_Layer("join_room_layer");
            }
          }.bind(this));
          break;

         case "btn_cjfj":
          console.log("\u521b\u5efa\u623f\u95f4");
          this.creater_Layer("create_room_layer");
          break;

         default:
          this.creater_Layer("msg_layer", {
            text: cc.myBaseMgr.LabelMsg.NOT_OPEN
          });
        }
      }
    });
    cc._RF.pop();
  }, {
    DBConstantMgr: "DBConstantMgr",
    UIManager: "UIManager"
  } ],
  GameScene: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7be11W82GdFoIMKi8UGdkRy", "GameScene");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {},
      onLoad: function onLoad() {},
      start: function start() {
        this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        var service = cc.director.getScene().getChildByName("Canvas").addComponent(this._game_conf.service_class);
        cc.myBaseMgr.DAO.GameDao.setPresentGameService(service);
      },
      onClickEvents: function onClickEvents(e, d) {
        cc.myBaseMgr.DAO.GameDao.present_gameService.onClickEvents(e, d);
      },
      onDisable: function onDisable() {
        cc.myBaseMgr.DAO.GameDao.setPresentGameService(null);
      }
    });
    cc._RF.pop();
  }, {} ],
  Game_history_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "c351fJFW4RPQKugf+7vVy6p", "Game_history_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {},
      start: function start() {},
      oncloseClickEvents: function oncloseClickEvents() {
        this.onRemove();
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  HTTPManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "f3953FHkABDRo02mKr/xF0r", "HTTPManager");
    "use strict";
    var HTTP = HTTP || {
      sessionId: 0,
      userId: 0,
      url: window.__MAHJONG_HTTP_URL__ || "http://127.0.0.1:15103",
      get: function get(path, data, callback, extraUrl) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.timeout = 5e3;
        var parameter = "?";
        for (var k in data) {
          "?" != parameter && (parameter += "&");
          parameter += k + "=" + data[k];
        }
        null == extraUrl && (extraUrl = HTTP.url || cc.EEEURL);
        var requestURL = extraUrl + path + encodeURI(parameter);
        console.log("RequestURL   get :" + requestURL);
        xhr.open("GET", requestURL, true);
        cc.sys.isNative && xhr.setRequestHeader("Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
        xhr.onreadystatechange = function() {
          if (4 === xhr.readyState && xhr.status >= 200 && xhr.status < 300) {
            console.log("http res(" + xhr.responseText.length + "):" + xhr.responseText);
            var ret = JSON.parse(xhr.responseText);
            callback && callback(ret.code, ret.message, ret.data, ret.token || null);
          } else console.log(xhr.readyState + ":" + xhr.status);
        };
        xhr.onerror = function() {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg.NET_ERR, null);
        };
        xhr.send();
        return xhr;
      },
      post: function post(path, body, callback, extraUrl) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.timeout = 5e3;
        var __t0 = Date.now();
        null == extraUrl && (extraUrl = HTTP.url || cc.EEEURL);
        var requestURL = extraUrl + path;
        console.log("RequestURL   post  :" + requestURL);
        console.log("RequestURL   post  \u53c2\u6570 :", body);
        xhr.open("POST", requestURL, true);
        cc.sys.isNative && xhr.setRequestHeader("Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        xhr.setRequestHeader("token", cc.myBaseMgr.DAO.UserDao.token || null);
        xhr.onreadystatechange = function() {
          if (4 === xhr.readyState && xhr.status >= 200 && xhr.status < 300) {
            console.log("[HTTP\u8017\u65f6] " + path + " : " + (Date.now() - __t0) + " ms");
            console.log("http res(" + xhr.responseText.length + "):" + xhr.responseText);
            var ret = JSON.parse(xhr.responseText);
            if (ret.code == cc.myBaseMgr.CODE.not_login) {
              cc.director.loadScene("Loding");
              return;
            }
            callback && callback(ret.code, ret.message, ret.data, ret.token || null);
          } else console.log(xhr.readyState + ":" + xhr.status);
        };
        xhr.onerror = function(e) {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg.NET_ERR, null);
        };
        body ? xhr.send(Object.keys(body).map(function(key) {
          return encodeURIComponent(key) + "=" + encodeURIComponent(body[key]);
        }).join("&")) : xhr.send();
        return xhr;
      }
    };
    module.exports = HTTP;
    cc._RF.pop();
  }, {} ],
  Join_room_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "bc06fGWVppFw5qJ2rNWfArK", "Join_room_layer");
    "use strict";
    var UIManager = require("UIManager");
    var DBConstantMgr = require("DBConstantMgr");
    cc.Class({
      extends: UIManager,
      properties: {
        roomid_label: cc.Label,
        def_roomid_label: "\u8bf7\u8f93\u5165\u623f\u95f4\u53f7",
        _isCreateFriend: false
      },
      onLoad: function onLoad() {
        this.roomid_label.string = this.def_roomid_label;
      },
      setInitAll: function setInitAll(args) {
        this._isCreateFriend = !!(args && args.isCreateFriend);
      },
      start: function start() {},
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_del_roomid":
          if (this.roomid_label.string == this.def_roomid_label) return;
          this.roomid_label.string = this.roomid_label.string.substring(0, this.roomid_label.string.length - 1);
          0 == this.roomid_label.string.length && (this.roomid_label.string = this.def_roomid_label);
          break;

         case "btn_re_roomid":
          this.roomid_label.string = this.def_roomid_label;
          break;

         default:
          this.creater_Layer("msg_Layer");
        }
      },
      onClickNumEvents: function onClickNumEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        if (this.roomid_label.string.length >= 6 && this.roomid_label.string != this.def_roomid_label) return;
        this.roomid_label.string == this.def_roomid_label && (this.roomid_label.string = "");
        this.roomid_label.string += d;
        this.roomid_label.string.length >= 6 && this.roomid_label.string != this.def_roomid_label && this.sendJoinRoom(this.roomid_label.string);
      },
      sendJoinRoom: function sendJoinRoom(roomid) {
        cc.myBaseMgr.DAO.GameDao.present_is_create_friend = this._isCreateFriend;
        cc.myBaseMgr.DAO.GameDao.joinRoom({
          roomid: roomid
        }, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            cc.myBaseMgr.DAO.GameDao.setPresentGameKey(cc.myBaseMgr.runGame, DBConstantMgr.ROOM_TYPE_ORDINARY);
            this.loadScene("MaJiang");
            break;

           default:
            this.creater_Layer("msg_layer", {
              text: message
            });
          }
        }.bind(this));
      }
    });
    cc._RF.pop();
  }, {
    DBConstantMgr: "DBConstantMgr",
    UIManager: "UIManager"
  } ],
  LabelMsgManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7df26ZF4p9CD7kPolF7AF5+", "LabelMsgManager");
    "use strict";
    var LABEL = LABEL || {
      "%": "{1}%",
      "/_": "<i><u>{1}</u></i>",
      NET_ERR: "\u7cfb\u7edf\u9519\u8bef(\u5ba2\u6237\u7aef)",
      SERVICE: "\u7cfb\u7edf\u9519\u8bef,\u8054\u7cfb\u5ba2\u670d\uff01\uff01",
      ARGS_NULL: "\u60a8\u7684{1}\u4e0d\u80fd\u4e3a\u7a7a",
      ARGS_ERROR: "\u60a8\u7684{1}\u9519\u8bef",
      ACCOUNT: "\u8d26\u53f7",
      PASSWORD: "\u767b\u9646\u5bc6\u7801",
      AGAIN_PASSWORD: "\u786e\u8ba4\u767b\u9646\u5bc6\u7801",
      TEL: "\u624b\u673a\u53f7",
      IMAGE_CODE: "\u9a8c\u8bc1\u7801",
      PHONE_CODE: "\u77ed\u4fe1\u9a8c\u8bc1\u7801",
      A_OR_P: "\u8d26\u53f7\u6216\u5bc6\u7801",
      RANKING: "<b>{1}</b>",
      NOT_OPEN: "\u6682\u672a\u5f00\u653e,\u656c\u8bf7\u671f\u5f85\uff01\uff01",
      PASS_MAX_LENGTH: "{1}\u957f\u5ea6\u5fc5\u987b\u57286~16\u4f4d\u4e4b\u95f4",
      NAME_MAX_LENGTH: "{1}\u957f\u5ea6\u5fc5\u987b\u57282~10\u4f4d\u4e4b\u95f4",
      SCEND_CODE_WIN: "\u53d1\u9001\u6210\u529f({1}s)",
      NICKNAME: "\u6635\u79f0",
      WECHAT: "\u5fae\u4fe1\u53f7",
      FEEDBACK: "\u53cd\u9988\u5185\u5bb9",
      FEEDBACK_EVENT: "\u53cd\u9988\u6210\u529f",
      NOT_LOGIN: "\u672a\u767b\u5f55",
      ID: "ID:",
      token: "token",
      PlayingField_TYPE: "\u6bd4\u8d5b\u573a\u7c7b\u578b",
      game_id: "game_id",
      CONTENT_IS_NOT_NULL: "\u5185\u5bb9\u4e0d\u80fd\u4e3a\u7a7a",
      CONTENT_IS_ERROR: "\u5185\u5bb9\u975e\u6cd5",
      SEND_MSG_BY_PHONE: "\u53d1\u9001\u9a8c\u8bc1\u7801"
    };
    module.exports = LABEL;
    cc._RF.pop();
  }, {} ],
  Loading_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "76f03BuVrRCjoiizsUqXs/v", "Loading_layer");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        bar_loading_label: cc.Label
      },
      setBarLabel: function setBarLabel(bar_num) {
        if (!this.bar_loading_label) return;
        this.bar_loading_label.string = "\u6b63\u5728\u52a0\u8f7d\u4e2d...".concat(bar_num || 0, " %");
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {} ],
  Loding: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "69a55oINFpMwamv7i0F/BLK", "Loding");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        progress: cc.ProgressBar,
        text: cc.Label
      },
      onLoad: function onLoad() {
        this.text.string = "\u670d\u52a1\u5668\u8fde\u63a5\u4e2d...";
        this.getInitConfig();
        this.schedule(this.getInitConfig, 10);
      },
      getInitConfig: function getInitConfig() {
        var _this = this;
        var self = this;
        cc.myBaseMgr.DAO.SystemDao.getInitConfig(function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            self.unschedule(_this.getInitConfig);
            self.text.string = "0%";
            self.progress.progress = 0;
            cc.director.preloadScene("GameLogin", function(completedCount, totalCount, item) {
              var p = completedCount / totalCount;
              self.progress.progress = p;
              self.text.string = parseInt(100 * p) + "%";
            }, function() {
              console.log("\u52a0\u8f7d\u6210\u529f");
              cc.director.loadScene("GameLogin");
            });
          }
        });
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  MahjongBaseService: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "27edc9aa0dBSZ+LXhXEf+TF", "MahjongBaseService");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var UIManager = require("UIManager");
    var DBConstantMgr = require("DBConstantMgr");
    cc.Class({
      extends: UIManager,
      properties: {
        matching_layer: {
          default: null,
          type: cc.Node,
          displayName: "matching_layer",
          tooltip: "\u6e38\u620f\u5339\u914d\u9875"
        },
        game_layer: {
          default: null,
          type: cc.Node,
          displayName: "game_layer",
          tooltip: "\u6e38\u620f\u4e2d"
        },
        room_layer: {
          default: null,
          type: cc.Node,
          displayName: "room_layer",
          tooltip: "\u623f\u95f4\u9875"
        },
        matchSuccessful_layer: {
          default: null,
          type: cc.Node,
          displayName: "matchSuccessful_layer",
          tooltip: "\u5339\u914d\u6210\u529fanim\u9875\u9762"
        },
        matchSuccessful_animation: {
          default: null,
          type: sp.Skeleton,
          displayName: "\u5339\u914d\u6210\u529f \u52a8\u753b",
          tooltip: "\u5339\u914d\u6210\u529f \u52a8\u753b"
        },
        game_start_animation: {
          default: null,
          type: sp.Skeleton,
          displayName: "\u5bf9\u5c40\u5f00\u59cb \u52a8\u753b",
          tooltip: "\u5bf9\u5c40\u5f00\u59cb \u52a8\u753b"
        },
        gengDuo_node: {
          default: null,
          type: cc.Node,
          displayName: "\u66f4\u591a\u5f39\u6846\u9875",
          tooltip: "\u66f4\u591a\u5f39\u6846\u9875"
        },
        gengDuo_btn_mask: {
          default: null,
          type: cc.Node,
          displayName: "\u66f4\u591a\u5f39\u6846\u9875 mask\u9875\u9762",
          tooltip: "\u66f4\u591a\u5f39\u6846\u9875 mask\u9875\u9762"
        },
        game_seat_node_myself: {
          default: null,
          type: cc.Node,
          displayName: "game_seat_node_myself",
          tooltip: "game_seat_node_myself"
        },
        game_seat_node_right: {
          default: null,
          type: cc.Node,
          displayName: "game_seat_node_right",
          tooltip: "game_seat_node_right"
        },
        game_seat_node_top: {
          default: null,
          type: cc.Node,
          displayName: "game_seat_node_top",
          tooltip: "game_seat_node_top"
        },
        game_seat_node_left: {
          default: null,
          type: cc.Node,
          displayName: "game_seat_node_left",
          tooltip: "game_seat_node_left"
        },
        room_seat_node_myself: {
          default: null,
          type: cc.Node,
          displayName: "room_seat_node_myself",
          tooltip: "room_seat_node_myself"
        },
        room_seat_node_right: {
          default: null,
          type: cc.Node,
          displayName: "room_seat_node_right",
          tooltip: "room_seat_node_right"
        },
        room_seat_node_top: {
          default: null,
          type: cc.Node,
          displayName: "room_seat_node_top",
          tooltip: "room_seat_node_top"
        },
        room_seat_node_left: {
          default: null,
          type: cc.Node,
          displayName: "room_seat_node_left",
          tooltip: "room_seat_node_left"
        },
        countDown_label: {
          default: null,
          type: cc.Label,
          displayName: "\u6e38\u620f\u5012\u8ba1\u65f6",
          tooltip: "countDown_label"
        },
        timeDisplay_label: {
          default: null,
          type: cc.Label,
          displayName: "\u5339\u914d\u65f6\u95f4",
          tooltip: "\u5339\u914d\u65f6\u95f4"
        },
        gameType_label: {
          default: null,
          type: cc.Label,
          displayName: "\u724c\u684c \u6e38\u620f\u540d\u79f0",
          tooltip: "\u724c\u684c \u6e38\u620f\u540d\u79f0"
        },
        gameName_label: {
          default: null,
          type: cc.Label,
          displayName: "\u5339\u914d\u4e2d \u6e38\u620f\u540d\u79f0",
          tooltip: "\u5339\u914d\u4e2d \u6e38\u620f\u540d\u79f0"
        },
        matchingPerson_label: {
          default: null,
          type: cc.Label,
          displayName: "\u5339\u914d\u4eba\u6570",
          tooltip: "\u5339\u914d\u4eba\u6570"
        },
        over_node: {
          default: null,
          type: cc.Node,
          displayName: "\u7ed3\u675fnode\u8282\u70b9",
          tooltip: "\u7ed3\u675fnode\u8282\u70b9"
        },
        card_total_num_label: {
          default: null,
          type: cc.Label,
          displayName: "\u724c\u603b\u6570\u91cf",
          tooltip: "\u724c\u603b\u6570\u91cf"
        },
        room_info: {
          default: null,
          type: cc.Node,
          displayName: "\u623f\u95f4\u4fe1\u606f\u8282\u70b9",
          tooltip: "\u623f\u95f4\u4fe1\u606f\u8282\u70b9"
        },
        roomid_label: {
          default: null,
          type: cc.Label,
          displayName: "\u623f\u95f4\u53f7",
          tooltip: "\u623f\u95f4\u53f7"
        },
        inning_label: {
          default: null,
          type: cc.Label,
          displayName: "\u5c40\u6570",
          tooltip: "\u5c40\u6570"
        },
        people_num_label: {
          default: null,
          type: cc.Label,
          displayName: "\u4eba\u6570",
          tooltip: "\u4eba\u6570"
        },
        total_score_label: {
          default: null,
          type: cc.Label,
          displayName: "\u7d2f\u8ba1\u5206\u6570",
          tooltip: "\u7d2f\u8ba1\u5206\u6570"
        },
        direction_node: {
          default: null,
          type: cc.Node,
          displayName: "\u51fa\u724c\u65b9\u5411\u76d8",
          tooltip: "\u51fa\u724c\u65b9\u5411\u76d8"
        },
        btn_next_game_node: {
          default: null,
          type: cc.Node,
          displayName: "btn_next_game",
          tooltip: "btn_next_game"
        },
        btn_prepare_node: {
          default: null,
          type: cc.Node,
          displayName: "btn_prepare",
          tooltip: "btn_prepare"
        },
        btn_exit_game_node: {
          default: null,
          type: cc.Node,
          displayName: "btn_exit_game",
          tooltip: "btn_exit_game"
        },
        btn_quit_node: {
          default: null,
          type: cc.Node,
          displayName: "\u9000\u51fa\u5339\u914d\u6309\u94ae\u8282\u70b9",
          tooltip: "\u9000\u51fa\u5339\u914d\u6309\u94ae\u8282\u70b9"
        },
        sendCard_menu_btn_hu_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u80e1\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u80e1\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_ting_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u542c\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u542c\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_gang_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u6760\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u6760\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_peng_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u78b0\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u78b0\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_guo_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u8fc7\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u8fc7\u8282\u70b9"
        },
        sendCard_menu_btn_quXiaoTuoGuan_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u53d6\u6d88\u6258\u7ba1\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u53d6\u6d88\u6258\u7ba1\u8282\u70b9"
        },
        _game_conf: null,
        _game_type_service_event: null,
        _matching_send_event: null,
        _game_type_send_event: null,
        _room_send_event: null,
        _game_select_maizui_layer_isShow: false,
        _game_seats: null,
        _room_seats: null,
        _schedule_start_Matching_time: 15,
        _schedule_end_Matching_time: 0,
        _game_over_seats_data: null,
        _home_state: null,
        _home_data: null,
        _isshow_matchSuccessful_layer: false,
        _seats_sort: []
      },
      ctor: function ctor() {
        cc.log("MahjongBaseService ctor");
      },
      onLoad: function onLoad() {
        console.log("MahjongBaseService onLoad");
        this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this._system_on_event = wsMsgKeyEnum["system"]["on"];
        this._system_service_event = wsMsgKeyEnum["system"]["service"];
        this._matching_on_event = wsMsgKeyEnum["matching"]["on"];
        this._matching_send_event = wsMsgKeyEnum["matching"]["send"];
        this._matching_service_event = wsMsgKeyEnum["matching"]["service"];
        this._room_send_event = wsMsgKeyEnum["room"]["send"];
        this._room_service_event = wsMsgKeyEnum["room"]["service"];
        this._game_type_on_event = wsMsgKeyEnum[this._game_conf.gameTypeKey]["on"];
        this._game_type_send_event = wsMsgKeyEnum[this._game_conf.gameTypeKey]["send"];
        this._game_type_service_event = wsMsgKeyEnum[this._game_conf.gameTypeKey]["service"];
        this.initParameter();
        this.initAllLayer();
        this.initEvents();
        this.initDirectionNode();
        this.initPushGameSeatsBySeatsNode();
        this.initPushRoomSeatsBySeatsNode();
        this.setGameNameLabel();
      },
      initParameter: function initParameter() {
        this._seats_sort = [ "myself", "right", "top", "left" ];
        this.matching_layer = cc.find("Canvas/main/matching_layer");
        this.matchingPerson_label = cc.find("Canvas/main/matching_layer/bar_tou/label_matchingPerson").getComponent("cc.Label");
        this.timeDisplay_label = cc.find("Canvas/main/matching_layer/bar_tou/label_instructions").getComponent("cc.Label");
        this.gameName_label = cc.find("Canvas/main/matching_layer/bar_tou/label_gameName").getComponent("cc.Label");
        this.btn_quit_node = cc.find("Canvas/main/matching_layer/btn_quit");
        this.room_layer = cc.find("Canvas/main/room_layer");
        this.room_seat_node_myself = cc.find("Canvas/main/room_layer/juLi_node/seats/myself");
        this.room_seat_node_right = cc.find("Canvas/main/room_layer/juLi_node/seats/right");
        this.room_seat_node_left = cc.find("Canvas/main/room_layer/juLi_node/seats/left");
        this.room_seat_node_top = cc.find("Canvas/main/room_layer/juLi_node/seats/top");
        this.room_btn_prepare_node = cc.find("Canvas/main/room_layer/btns_layout/btn_prepare");
        this.matchSuccessful_layer = cc.find("Canvas/main/matchSuccessful_layer");
        this.matchSuccessful_animation = cc.find("Canvas/main/matchSuccessful_layer/piPeiChenGong").getComponent("sp.Skeleton");
        this.game_layer = cc.find("Canvas/main/game_layer");
        this.game_start_animation = cc.find("Canvas/main/game_layer/animation_duijukaishi").getComponent("sp.Skeleton");
        this.game_seat_node_myself = cc.find("Canvas/main/game_layer/nodes/myself");
        this.game_seat_node_right = cc.find("Canvas/main/game_layer/nodes/right");
        this.game_seat_node_left = cc.find("Canvas/main/game_layer/nodes/left");
        this.game_seat_node_top = cc.find("Canvas/main/game_layer/nodes/top");
        this.countDown_label = cc.find("Canvas/main/game_layer/spr_desktop/spr_Midpoint/label_operation_time").getComponent("cc.Label");
        this.card_total_num_label = cc.find("Canvas/main/game_layer/node_card/card_total_num_label").getComponent("cc.Label");
        this.direction_node = cc.find("Canvas/main/game_layer/spr_desktop/spr_Midpoint/direction");
        this.gameType_label = cc.find("Canvas/main/game_layer/gameTyoe_label").getComponent("cc.Label");
        this.over_node = cc.find("Canvas/main/game_layer/over_nodes");
        this.take_back_layer = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer");
        this.btn_next_game_node = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer/layout/btn_next_game");
        this.btn_prepare_node = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer/layout/btn_prepare");
        this.btn_exit_game_node = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer/layout/btn_exit_game");
        this.btn_details_game_node = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer/layout/btn_details_game");
        this.btn_take_back = cc.find("Canvas/main/game_layer/over_nodes/take_back_layer/btn_take_back");
        this.btn_an = cc.find("Canvas/main/game_layer/over_nodes/btn_an");
        this.gengDuo_node = cc.find("Canvas/main/menu/sheZhi");
        this.gengDuo_btn_mask = cc.find("Canvas/main/menu/menu_mask");
        this.btn_gengDuo_node_sheZhi_node = cc.find("Canvas/main/menu/sheZhi/btn_sheZhi");
        this.btn_gengDuo_node_guiZe_node = cc.find("Canvas/main/menu/sheZhi/btn_guiZe");
        this.btn_gengDuo_node_exit_game_node = cc.find("Canvas/main/menu/sheZhi/btn_exit_game");
        this.btn_gengDuo_node_caiDan_node = cc.find("Canvas/main/menu/btn_caiDan");
        this.room_info = cc.find("Canvas/main/room_info");
        this.roomid_label = cc.find("Canvas/main/room_info/fangJianHao/fangJianHao_val").getComponent("cc.Label");
        this.inning_label = cc.find("Canvas/main/room_info/juShu/juShu_val").getComponent("cc.Label");
        this.people_num_label = cc.find("Canvas/main/room_info/renShu/val").getComponent("cc.Label");
        this.total_score_label = cc.find("Canvas/main/room_info/leJiDeFen/leJiDeFen_val").getComponent("cc.Label");
        this.dangJuDiFen_label = cc.find("Canvas/main/room_info/dangJuDiFen/val").getComponent("cc.Label");
        this.sendCard_menu_btn_hu_node = cc.find("Canvas/main/game_layer/menu/btn_hu");
        this.sendCard_menu_btn_ting_node = cc.find("Canvas/main/game_layer/menu/btn_ting");
        this.sendCard_menu_btn_gang_node = cc.find("Canvas/main/game_layer/menu/btn_gang");
        this.sendCard_menu_btn_peng_node = cc.find("Canvas/main/game_layer/menu/btn_peng");
        this.sendCard_menu_btn_chi_node = cc.find("Canvas/main/game_layer/menu/btn_chi");
        this.sendCard_menu_btn_guo_node = cc.find("Canvas/main/game_layer/menu/btn_guo");
        this.sendCard_menu_btn_quXiaoTuoGuan_node = cc.find("Canvas/main/game_layer/trusteeship_ongoing/btn_quXiaoTuoGuan");
        this.addClickEventHandler(this.sendCard_menu_btn_hu_node, "btn_hu");
        this.addClickEventHandler(this.sendCard_menu_btn_ting_node, "btn_ting");
        this.addClickEventHandler(this.sendCard_menu_btn_gang_node, "btn_gang");
        this.addClickEventHandler(this.sendCard_menu_btn_peng_node, "btn_peng");
        this.addClickEventHandler(this.sendCard_menu_btn_chi_node, "btn_chi");
        this.addClickEventHandler(this.sendCard_menu_btn_guo_node, "btn_guo");
        this.addClickEventHandler(this.sendCard_menu_btn_quXiaoTuoGuan_node, "btn_quXiaoTuoGuan");
        this.addClickEventHandler(this.btn_gengDuo_node_caiDan_node, "btn_gengDuo");
        this.addClickEventHandler(this.btn_gengDuo_node_exit_game_node, "btn_exit_game");
        this.addClickEventHandler(this.btn_gengDuo_node_sheZhi_node, "btn_sheZhi");
        this.addClickEventHandler(this.btn_gengDuo_node_guiZe_node, "btn_guiZe");
        this.addClickEventHandler(this.gengDuo_btn_mask, "gengDuo_btn_mask");
        this.addClickEventHandler(this.btn_quit_node, "exit_matching");
        this.addClickEventHandler(this.btn_details_game_node, "btn_details_game");
        this.addClickEventHandler(this.btn_next_game_node, "btn_next_game");
        this.addClickEventHandler(this.btn_prepare_node, "btn_prepare");
        this.addClickEventHandler(this.room_btn_prepare_node, "btn_prepare");
        this.addClickEventHandler(this.btn_exit_game_node, "btn_exit_game");
        this.addClickEventHandler(this.btn_take_back, "btn_take_back");
        this.addClickEventHandler(this.btn_an, "btn_an");
      },
      addClickEventHandler: function addClickEventHandler(btn_node, customEventData) {
        this._super(btn_node, cc.director.getScene().getChildByName("Canvas"), "GameScene", "onClickEvents", customEventData);
      },
      initDirectionNode: function initDirectionNode() {
        var children = this.direction_node.children;
        for (var i = 0; i < children.length; i++) {
          var element = children[i];
          element.active = false;
          for (var j = 0; j < 4; j++) element.getChildByName(j + 1 + "").active = false;
        }
      },
      getSelfDirectionNode: function getSelfDirectionNode(self_data_pos_name) {
        var direction_node = this.direction_node.getChildByName(self_data_pos_name + "");
        if (direction_node) {
          direction_node.active = true;
          return direction_node;
        }
        return null;
      },
      initAllLayer: function initAllLayer() {
        console.log("MahjongBaseService initAllLayer");
        this.room_info.active = false;
        this.matching_layer.active = false;
        this.game_layer.active = false;
        this.room_layer.active = false;
        this.matchSuccessful_layer.active = false;
        this.matchSuccessful_animation.node.active = false;
        this.game_start_animation.node.active = false;
        this.over_node.active = false;
      },
      setGameNameLabel: function setGameNameLabel() {
        var game_type_str = "";
        switch (cc.myBaseMgr.DAO.GameDao.present_roomType) {
         case DBConstantMgr.ROOM_TYPE_MATCHING:
          game_type_str = "\u6b22\u4e50\u573a";
          break;

         case DBConstantMgr.ROOM_TYPE_ORDINARY:
          game_type_str = "\u540c\u57ce\u7ade\u6280";
        }
        this.gameName_label.string = "";
        this.gameName_label.node.active = false;
        this.gameType_label.string = "";
        this.gameType_label.node.active = false;
      },
      setRoomID: function setRoomID(roomid) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.roomid_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(roomid)) return;
        this.roomid_label.string = roomid;
      },
      setInning: function setInning(cruent_inning, max_inning) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.inning_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(cruent_inning) || !cc.myBaseMgr.DataMgr.isData_UnNull(max_inning)) return;
        this.inning_label.string = cruent_inning + " / " + max_inning;
      },
      setPeopleNum: function setPeopleNum(cruent_people_num, max_people_num) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.people_num_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(cruent_people_num) || !cc.myBaseMgr.DataMgr.isData_UnNull(max_people_num)) return;
        this.people_num_label.string = cruent_people_num + " / " + max_people_num;
      },
      setTotalScore: function setTotalScore(total_score) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.total_score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(total_score)) return;
        this.total_score_label.string = total_score;
      },
      setDangJuDiFen: function setDangJuDiFen(dangJuDiFen) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.dangJuDiFen_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(dangJuDiFen)) return;
        this.dangJuDiFen_label.string = dangJuDiFen;
      },
      switchGameOverLayerByHomeType: function switchGameOverLayerByHomeType() {
        this.btn_next_game_node.active = false;
        this.btn_prepare_node.active = false;
        this.btn_exit_game_node.active = false;
        switch (cc.myBaseMgr.DAO.GameDao.present_roomType) {
         case DBConstantMgr.ROOM_TYPE_MATCHING:
          this._home_data.max_inning >= 2 ? this._home_state == this._game_conf.game_scene.single_over ? this.btn_prepare_node.active = true : this._home_state == this._game_conf.game_scene.game_over && (this.btn_exit_game_node.active = true) : this.btn_next_game_node.active = true;
          break;

         case DBConstantMgr.ROOM_TYPE_ORDINARY:
          this._home_state == this._game_conf.game_scene.game_over ? this.btn_exit_game_node.active = true : (this._home_state == this._game_conf.game_scene.single_over || this._home_state == this._game_conf.game_scene.wait_over && this._home_data.cruent_inning < this._home_data.max_inning) && (this.btn_prepare_node.active = true);
        }
      },
      gameOverCall: function gameOverCall(data) {
        this._game_over_seats_data = data.seats;
        this.switchGameOverLayerByHomeType();
        this.over_node.active = true;
        var successfulOrFailure = null;
        var is_flow_bureau = true;
        for (var i = 0; i < data.seats.length; i++) {
          var seat = data.seats[i];
          if (-1 != data.seats[i].hu_state) {
            is_flow_bureau = false;
            break;
          }
        }
        var details_json_data = [];
        for (var _i = 0; _i < data.seats.length; _i++) {
          var _seat = data.seats[_i];
          data.seats[_i].user_id == cc.myBaseMgr.DAO.UserDao.userAccountId + "" && (successfulOrFailure = -1 != _seat["hu_state"] ? "1" : "2");
          var details_json_data_save_data = {};
          details_json_data_save_data["user_name"] = _seat["user_name"];
          details_json_data_save_data["user_icon"] = _seat["user_icon"];
          details_json_data_save_data["imultiple"] = _seat["imultiple"];
          details_json_data_save_data["is_online"] = _seat["is_online"];
          details_json_data_save_data["is_trusteeship"] = _seat["is_trusteeship"];
          details_json_data_save_data["identity"] = _seat["identity"];
          details_json_data_save_data["score"] = _seat["score"];
          details_json_data_save_data["hu_state"] = _seat["hu_state"];
          details_json_data.push(details_json_data_save_data);
        }
        var res_data = {
          gameConstant: this._game_conf.game_constant,
          gamePatternType: cc.myBaseMgr.play_type.HLC,
          gamePlayConstant: 101,
          successfulOrFailure: is_flow_bureau ? "3" : successfulOrFailure,
          deduct_currency_type: cc.myBaseMgr.money_type.beans,
          deductCurrencyNum: 0,
          details_json_data: details_json_data
        };
        cc.myBaseMgr.DAO.GameDao.addGameHistor(res_data, function(code, message, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
           case cc.myBaseMgr.CODE.clientError:
          }
        });
      },
      schedule_startMatching_callback: function schedule_startMatching_callback() {
        if (this._schedule_start_Matching_time <= this._schedule_end_Matching_time) {
          this.unschedule(this.schedule_startMatching_callback);
          return;
        }
        this._schedule_start_Matching_time--;
        this.timeDisplay_label.string = "\u9632\u4f5c\u5f0a\u6392\u961f\u4e2d\uff0c\u8bf7\u7a0d\u540e... (".concat(this._schedule_start_Matching_time, "\u79d2)");
        if (this._schedule_start_Matching_time <= 0) {
          this.unschedule(this.schedule_startMatching_callback);
          this.timeDisplay_label.string = "\u5339\u914d\u5b8c\u6210\uff0c\u6b63\u5728\u8fdb\u5165\u623f\u95f4...";
        }
      },
      initPushRoomSeatsBySeatsNode: function initPushRoomSeatsBySeatsNode() {
        if (!this.room_seat_node_myself || !this.room_seat_node_left || !this.room_seat_node_right || !this.room_seat_node_top) return;
        this._room_seats = this._room_seats || {};
        this._room_seats["myself"] = this.room_seat_node_myself;
        this._room_seats["right"] = this.room_seat_node_right;
        this._room_seats["top"] = this.room_seat_node_top;
        this._room_seats["left"] = this.room_seat_node_left;
        this._room_seats["myself"].active = false;
        this._room_seats["left"].active = false;
        this._room_seats["right"].active = false;
        this._room_seats["top"].active = false;
      },
      initPushGameSeatsBySeatsNode: function initPushGameSeatsBySeatsNode() {
        if (!this.game_seat_node_myself || !this.game_seat_node_left || !this.game_seat_node_right || !this.game_seat_node_top) return;
        this._game_seats = this._game_seats || {};
        this._game_seats["myself"] = this.game_seat_node_myself;
        this._game_seats["right"] = this.game_seat_node_right;
        this._game_seats["top"] = this.game_seat_node_top;
        this._game_seats["left"] = this.game_seat_node_left;
        this._game_seats["myself"].active = false;
        this._game_seats["left"].active = false;
        this._game_seats["right"].active = false;
        this._game_seats["top"].active = false;
      },
      setCountDownLabel: function setCountDownLabel(time) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.countDown_label)) return;
        this.countDown_label.string = time || 0;
      },
      setCardTotalNumLabel: function setCardTotalNumLabel(card_total_num) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.card_total_num_label)) return;
        this.card_total_num_label.string = card_total_num || 0;
      },
      exitGame: function exitGame() {
        this.loadScene("GameMain");
      },
      updateRoomSeatsData: function updateRoomSeatsData(seats_data, last_index, home_state, isReload) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(seats_data)) return;
        this.initPushRoomSeatsBySeatsNode();
        var myself_index = null;
        for (var j = 0; j < seats_data.length; j++) {
          var data = seats_data[j];
          data.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId && 0 != j && (myself_index = j);
        }
        if (myself_index) {
          var first_seats_data = seats_data[0];
          seats_data[0] = seats_data[myself_index];
          seats_data[myself_index] = first_seats_data;
        }
        console.warn("qiaobin ========= " + JSON.stringify(seats_data));
        for (var i = 0; i < seats_data.length; i++) {
          var _data = seats_data[i];
          var is_boss = null;
          var seat_info_item = this._room_seats[this._seats_sort[i]].getComponent("Mahjong_game_seat_info_item");
          isReload && seat_info_item.onLoad();
          is_boss = 1 == _data.identity;
          seat_info_item.setAllinfo(home_state, this._seats_sort[i], _data.user_id, _data.user_ip, null, null, _data.seats_index, _data.action_state, _data.user_icon, _data.user_name, _data.score, is_boss, _data.is_online, _data.out_holds, _data.out_buhua_holds, _data.knock_holds, _data.collision_holds, null, last_index, _data.hu_state, _data.is_trusteeship, _data.hand_holds, _data.hide_card_num, _data.ting_state, _data.anim_state, _data.present_card, _data.pos_name, null, null);
          this._room_seats[this._seats_sort[i]].active = true;
        }
      },
      updateGameSeatsData: function updateGameSeatsData(seats_data, last_index, home_state, isReload) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(seats_data) || !cc.myBaseMgr.DataMgr.isData_UnNull(last_index)) return;
        this.initPushGameSeatsBySeatsNode();
        var myself_index = 0;
        for (var j = 0; j < seats_data.length; j++) {
          var data = seats_data[j];
          data.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId && 0 != j && (myself_index = j);
        }
        var new_seats_data = [];
        for (var i = 0; i < seats_data.length; i++) new_seats_data.push(seats_data[(myself_index + i) % seats_data.length]);
        if (2 == seats_data.length) switch (seats_data[myself_index].pos_name) {
         case 1:
          this._seats_sort = [ "myself", "right" ];
          break;

         default:
          this._seats_sort = [ "myself", "left" ];
        }
        if (3 == seats_data.length) switch (seats_data[myself_index].pos_name) {
         case 1:
          this._seats_sort = [ "myself", "right", "top" ];
          break;

         case 2:
          this._seats_sort = [ "myself", "right", "left" ];
          break;

         case 3:
          this._seats_sort = [ "myself", "top", "left" ];
        }
        var is_boss = null;
        var directionNode = null;
        var card_num = null;
        directionNode = this.getSelfDirectionNode(seats_data[myself_index].pos_name);
        for (var _i2 = 0; _i2 < new_seats_data.length; _i2++) {
          var _data2 = new_seats_data[_i2];
          var seat_info_item = this._game_seats[this._seats_sort[_i2]].getComponent("Mahjong_game_seat_info_item");
          "myself" != this._seats_sort[_i2] && (card_num = _data2.card_num);
          isReload && seat_info_item.onLoad();
          is_boss = 1 == _data2.identity;
          seat_info_item.setAllinfo(home_state, this._seats_sort[_i2], _data2.user_id, _data2.user_ip, null, null, _data2.seats_index, _data2.action_state, _data2.user_icon, _data2.user_name, _data2.score, is_boss, _data2.is_online, _data2.out_holds, _data2.out_buhua_holds, _data2.knock_holds, _data2.collision_holds, card_num, last_index, _data2.hu_state, _data2.is_trusteeship, _data2.hand_holds, _data2.hide_card_num, _data2.ting_state, _data2.anim_state, _data2.present_card, _data2.pos_name, directionNode, _data2.is_shot);
          this._game_seats[this._seats_sort[_i2]].active = true;
          console.error("outCard_layout = ", seat_info_item.outCard_layout);
        }
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_gengDuo":
          this.gengDuo_node.active = !this.gengDuo_node.active;
          this.gengDuo_btn_mask.active = !this.gengDuo_btn_mask.active;
          break;

         case "gengDuo_btn_mask":
          this.gengDuo_node.active = false;
          this.gengDuo_btn_mask.active = false;
          break;

         case "exit_matching":
          console.log("\u9000\u51fa\u5339\u914d");
          this.click_exit_matching_event();
          break;

         case "btn_exit_game":
          this.click_exit_game_event();
          break;

         case "btn_kouPai":
          console.log("\u6263\u724c");
          var userId = cc.myBaseMgr.DAO.UserDao.userAccountId + "";
          console.log(userId);
          var res_data = {
            userId: userId
          };
          this.click_kouCrad_event(res_data);
          break;

         case "btn_buKouPai":
          console.log("\u4e0d\u6263\u724c");
          this.click_not_kouPai_event();
          break;

         case "btn_hu":
          console.log("\u80e1\u724c");
          this.click_hu_event();
          break;

         case "btn_ting":
          console.log("\u542c\u724c");
          this.click_ting_event();
          break;

         case "btn_peng":
          console.log("\u78b0\u724c");
          this.click_peng_event();
          break;

         case "btn_chi":
          console.log("\u5403\u724c");
          this.click_chi_event();
          break;

         case "btn_gang":
          console.log("\u6760\u724c");
          this.click_gang_event();
          break;

         case "btn_guo":
          console.log("\u8fc7");
          this.click_guo_event();
          break;

         case "btn_details_game":
          console.log("\u6e38\u620f\u8be6\u60c5");
          this.creater_Layer("mahjong_game_shangHaiQiaoMa_over_layer", this._game_over_seats_data);
          break;

         case "btn_next_game":
          console.log("\u4e0b\u4e00\u5c40");
          this.click_next_game_event();
          break;

         case "btn_prepare":
          console.log("\u51c6\u5907 / \u53d6\u6d88\u51c6\u5907");
          e.target.getComponent("cc.Toggle").isChecked ? this.click_cancelPrepare_event() : this.click_prepare_event();
          break;

         case "btn_guiZe":
          console.log("\u89c4\u5219");
          this.creater_Layer("rules_layer");
          break;

         case "btn_quXiaoTuoGuan":
          this.click_quXiaoTuoGuan_event();
          break;

         case "btn_take_back":
          this.take_back_layer.active = false;
          this.btn_an.active = true;
          break;

         case "btn_an":
          this.take_back_layer.active = true;
          this.btn_an.active = false;
        }
      },
      click_prepare_event: function click_prepare_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._room_send_event["prepare"]);
      },
      click_cancelPrepare_event: function click_cancelPrepare_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._room_send_event["cancelPrepare"]);
      },
      click_peng_event: function click_peng_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["knock_card"]);
      },
      click_chi_event: function click_chi_event() {
        cc.log("click_chi_event");
      },
      click_gang_event: function click_gang_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["collision_card"]);
      },
      click_hu_event: function click_hu_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["hu_card"]);
      },
      click_ting_event: function click_ting_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["ting_card"]);
      },
      click_guo_event: function click_guo_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["skip_this_part"]);
      },
      click_exit_matching_event: function click_exit_matching_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._matching_send_event["exit_matching"]);
      },
      click_quXiaoTuoGuan_event: function click_quXiaoTuoGuan_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_type_send_event["cancel_trusteepship"]);
      },
      click_next_game_event: function click_next_game_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._room_service_event["exit_game"]);
        this.loadScene("MaJiang");
      },
      click_exit_game_event: function click_exit_game_event() {
        var self = this;
        this.creater_Layer("select_box_layer", {
          txt: "\u786e\u5b9a\u8981\u9000\u51fa\uff1f",
          callBack: {
            onbtn_1CallBack: function onbtn_1CallBack() {
              cc.myBaseMgr.DAO.GameDao.present_gameWSDao.disconnect();
            }
          }
        });
      },
      start: function start() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.connect();
      },
      onDisable: function onDisable() {
        cc.game_frame_EventMgr.off(this);
      },
      initEvents: function initEvents() {
        cc.game_frame_EventMgr.def(this._system_service_event["connect"], this.onConnect, this);
        cc.game_frame_EventMgr.def(this._system_service_event["connect_error"], this.onConnect_error, this);
        cc.game_frame_EventMgr.def(this._system_service_event["disconnect"], this.onDisconnect, this);
        cc.game_frame_EventMgr.def(this._system_service_event["reconnect_failed"], this.onReconnectFailed, this);
        cc.game_frame_EventMgr.def(this._system_service_event["reconnect"], this.onReconnect, this);
        cc.game_frame_EventMgr.def(this._system_service_event["sys_error"], this.onSys_error, this);
        cc.game_frame_EventMgr.def(this._matching_service_event["start_matching"], this.onStart_matching, this);
        cc.game_frame_EventMgr.def(this._matching_service_event["matching_win_all"], this.onMatching_win_all, this);
        cc.game_frame_EventMgr.def(this._matching_service_event["update_matching_all"], this.onUpdate_matching_all, this);
        cc.game_frame_EventMgr.def(this._matching_service_event["exit_matching"], this.onExit_matching, this);
        cc.game_frame_EventMgr.def(this._game_type_service_event["update_hand_holds"], this.onUpdate_hand_holds, this);
        cc.game_frame_EventMgr.def(this._game_type_service_event["update_room_info_all"], this.onUpdate_room_info_all, this);
        cc.game_frame_EventMgr.def(this._game_type_service_event["update_countdown_all"], this.onUpdate_countdown_all, this);
        cc.game_frame_EventMgr.def(this._room_service_event["directly_exit_game"], this.onDirectly_exit_game, this);
        cc.game_frame_EventMgr.def(this._room_service_event["next_game"], this.click_next_game_event, this);
      },
      onConnect: function onConnect(code, msg, data) {
        console.log(this._system_service_event["connect"]);
        switch (cc.myBaseMgr.DAO.GameDao.present_roomType) {
         case DBConstantMgr.ROOM_TYPE_MATCHING:
          cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._matching_send_event["start_matching"], {
            play_constant: cc.myBaseMgr.DAO.GameDao.present_play_constant || 1
          });
          break;

         case DBConstantMgr.ROOM_TYPE_ORDINARY:
          cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._room_send_event["joinRoom"], {
            roomid: cc.myBaseMgr.DAO.UserDao.roomid
          });
        }
      },
      onConnect_error: function onConnect_error(code, msg, data) {
        console.log(this._system_service_event["connect_error"]);
        this.exitGame();
      },
      onDisconnect: function onDisconnect(code, msg, data) {
        console.log(this._system_service_event["disconnect"]);
        this.exitGame();
      },
      onReconnectFailed: function onReconnectFailed(code, msg, data) {
        console.log(this._system_service_event["reconnect_failed"]);
      },
      onReconnect: function onReconnect(code, msg, data) {
        console.log(this._system_service_event["reconnect"]);
      },
      onSys_error: function onSys_error() {
        console.log(this._system_service_event["sys_error"]);
        this.creater_Layer("select_box_layer", {
          txt: cc.myBaseMgr.LabelMsg["SERVICE"],
          isShowCloseBtn: false,
          isShowCancelBtn: false,
          callBack: {
            onbtn_1CallBack: function onbtn_1CallBack() {
              cc.myBaseMgr.DAO.GameDao.present_gameWSDao.disconnect();
            }
          }
        });
      },
      onStart_matching: function onStart_matching(code, msg, data) {
        console.log(this._matching_service_event["start_matching"]);
        this._schedule_start_Matching_time = 15;
        this.matching_layer.active = true;
        this.timeDisplay_label.string = "\u9632\u4f5c\u5f0a\u6392\u961f\u4e2d\uff0c\u8bf7\u7a0d\u540e... (".concat(this._schedule_start_Matching_time, "\u79d2)");
        this.unschedule(this.schedule_startMatching_callback);
        this.schedule(this.schedule_startMatching_callback, 1);
      },
      onMatching_win_all: function onMatching_win_all(code, msg, data) {
        var _this = this;
        console.log(this._matching_service_event["onMatching_win_all"]);
        this.unschedule(this.schedule_startMatching_callback);
        this.matching_layer.active = false;
        if (!this._isshow_matchSuccessful_layer) {
          this._isshow_matchSuccessful_layer = true;
          this.matchSuccessful_layer.active = true;
          this.matchSuccessful_animation.node.active = true;
          this.matchSuccessful_animation.setAnimation(0, "animation", false);
          this.matchSuccessful_animation.setCompleteListener(function() {
            _this.matchSuccessful_layer.active = false;
            _this.matchSuccessful_animation.node.active = false;
            _this.game_start_animation.node.active = true;
            _this.game_start_animation.setAnimation(0, "animation", false);
            _this.game_start_animation.setCompleteListener(function() {
              _this.game_start_animation.node.active = false;
            });
          });
        }
      },
      onUpdate_matching_all: function onUpdate_matching_all(code, msg, data) {
        console.log(this._matching_service_event["update_matching_all"]);
        this.matchingPerson_label.string = "\u5339\u914d\u4eba\u6570\uff1a(".concat(data.cruent_online_person, " / ").concat(data.total_person, ")");
      },
      onExit_matching: function onExit_matching(code, msg, data) {
        console.log(this._matching_service_event["exit_matching"]);
        this.exitGame();
      },
      onDirectly_exit_game: function onDirectly_exit_game() {
        console.log(this._room_service_event["directly_exit_game"]);
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.disconnect();
      },
      onUpdate_hand_holds: function onUpdate_hand_holds(code, msg, data) {
        console.log(this._game_type_service_event["update_hand_holds"]);
        var myself_seat_info_item = this._game_seats["myself"].getComponent("Mahjong_game_seat_info_item");
        this._home_state == this._game_conf.game_scene.game_move && (myself_seat_info_item._card_data_start_length = data["holds"].length);
        myself_seat_info_item.setHandCard("myself", data);
      },
      onUpdate_countdown_all: function onUpdate_countdown_all(code, msg, data) {
        console.log(this._game_type_service_event["update_countdown_all"]);
        this.setCountDownLabel(data["countdown"]);
      }
    });
    cc._RF.pop();
  }, {
    DBConstantMgr: "DBConstantMgr",
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  MahjongBaseWSDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "f9046MG80VGJ7pNUJgeK36b", "MahjongBaseWSDao");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var BaseWSDao = require("BaseWSDao");
    cc.Class({
      extends: BaseWSDao,
      properties: {},
      ctor: function ctor() {
        cc.log("MaJiangWSDao");
      },
      connect: function connect() {
        this._super();
        cc.log("this.socket = ", this.socket);
      },
      initGameEvent: function initGameEvent() {
        var _this = this;
        this.socket.on(this.game_type_on_event["update_hand_holds"], function(reqData) {
          console.log("".concat(_this.game_type_on_event["update_hand_holds"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(_this.game_type_service_event["update_hand_holds"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        this.socket.on(this.game_type_on_event["update_room_info_all"], function(reqData) {
          console.log("".concat(_this.game_type_on_event["update_room_info_all"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(_this.game_type_service_event["update_room_info_all"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        this.socket.on(this.game_type_on_event["update_knock_card"], function(reqData) {
          console.log("".concat(_this.game_type_on_event["update_knock_card"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(_this.game_type_service_event["update_knock_card"], reqData["code"], reqData["msg"], reqData["data"]);
        });
        this.socket.on(this.game_type_on_event["update_countdown_all"], function(reqData) {
          console.log("".concat(_this.game_type_on_event["update_countdown_all"], " data = ").concat(JSON.stringify(reqData)));
          cc.game_frame_EventMgr.pushEventImm(_this.game_type_service_event["update_countdown_all"], reqData["code"], reqData["msg"], reqData["data"]);
        });
      },
      send: function send(sendMsgKey, data) {
        function send_card() {
          var value = data.value;
          var type = data.type;
          var isTouch = data.isTouch;
          var isCard = data.isCard;
          var isShow = data.isShow;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.DAO.UserDao.token)) return;
          var res_data = {
            user_token: cc.myBaseMgr.DAO.UserDao.token,
            value: value,
            type: type,
            isTouch: isTouch,
            isCard: isCard,
            isShow: isShow
          };
          this.emit.bind(this)(sendMsgKey, res_data);
        }
        function send_ting_card() {
          this.emit.bind(this)(sendMsgKey);
        }
        function knock_card() {
          this.emit.bind(this)(sendMsgKey);
        }
        function collision_card() {
          this.emit.bind(this)(sendMsgKey);
        }
        function skip_this_part() {
          this.emit.bind(this)(sendMsgKey);
        }
        function hu_card() {
          this.emit.bind(this)(sendMsgKey);
        }
        function cancel_trusteepship() {
          this.emit.bind(this)(sendMsgKey);
        }
        switch (sendMsgKey) {
         case this.game_type_send_event.send_card:
          send_card.bind(this)();
          return true;

         case this.game_type_send_event.knock_card:
          knock_card.bind(this)();
          return true;

         case this.game_type_send_event.skip_this_part:
          skip_this_part.bind(this)();
          return true;

         case this.game_type_send_event.collision_card:
          collision_card.bind(this)();
          return true;

         case this.game_type_send_event.hu_card:
          hu_card.bind(this)();
          return true;

         case this.game_type_send_event.cancel_trusteepship:
          cancel_trusteepship.bind(this)();
          return true;

         case this.game_type_send_event.ting_card:
          send_ting_card.bind(this)();
          return true;

         default:
          this._super(sendMsgKey, data);
          return false;
        }
      }
    });
    cc._RF.pop();
  }, {
    BaseWSDao: "BaseWSDao",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  MahjongMaiZuWSDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "3c065C6unpG3r9tTTK+TUwk", "MahjongMaiZuWSDao");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseWSDao = require("MahjongBaseWSDao");
    cc.Class({
      extends: MahjongBaseWSDao,
      properties: {},
      send: function send(sendMsgKey, data) {
        function send_maizui() {
          var maizui_arr = data.maizui_arr;
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.DAO.UserDao.token)) return;
          var res_data = {
            maizui_arr: maizui_arr
          };
          this.emit.bind(this)(sendMsgKey, res_data);
        }
        switch (sendMsgKey) {
         case this.game_send_event.maizui:
          send_maizui.bind(this)();
          break;

         default:
          this._super(sendMsgKey, data);
        }
      }
    });
    cc._RF.pop();
  }, {
    MahjongBaseWSDao: "MahjongBaseWSDao",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  MahjongQuYangWSDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "ea88eJiXqdKrb4KVH8k3EEh", "MahjongQuYangWSDao");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseWSDao = require("MahjongBaseWSDao");
    cc.Class({
      extends: MahjongBaseWSDao,
      properties: {},
      send: function send(sendMsgKey, data) {
        function hide_cards() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.DAO.UserDao.token)) return;
          var res_data = {
            user_token: cc.myBaseMgr.DAO.UserDao.token,
            userId: cc.myBaseMgr.DAO.UserDao.uid
          };
          this.emit.bind(this)(sendMsgKey, res_data);
        }
        6;
        function stop_hide_cards() {
          this.emit.bind(this)(sendMsgKey);
        }
        switch (sendMsgKey) {
         case this.game_send_event.hide_cards:
          hide_cards.bind(this)();
          return true;

         case this.game_send_event.stop_hide_cards:
          stop_hide_cards.bind(this)();
          return true;

         default:
          this._super(sendMsgKey, data);
          return false;
        }
      }
    });
    cc._RF.pop();
  }, {
    MahjongBaseWSDao: "MahjongBaseWSDao",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  MahjongShangHaiQiaoMaWSDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "3a83ar4DU5IVJBnuBffOjwP", "MahjongShangHaiQiaoMaWSDao");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseWSDao = require("MahjongBaseWSDao");
    cc.Class({
      extends: MahjongBaseWSDao,
      properties: {},
      send: function send(sendMsgKey, data) {
        switch (sendMsgKey) {
         case this.game_send_event.shaizi:
          break;

         default:
          this._super(sendMsgKey, data);
        }
      }
    });
    cc._RF.pop();
  }, {
    MahjongBaseWSDao: "MahjongBaseWSDao",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_maiZui_over_details_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "63de2vgbLRH/6o8oy+6abmb", "Mahjong_game_maiZui_over_details_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        bankerNode: {
          default: null,
          type: cc.Node,
          displayName: "\u5e84\u5bb6\u8282\u70b9",
          tooltip: "\u5e84\u5bb6\u8282\u70b9"
        },
        homeownersNode: {
          default: null,
          type: cc.Node,
          displayName: "\u623f\u4e3b\u8282\u70b9",
          tooltip: "\u623f\u4e3b\u8282\u70b9"
        },
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        }
      },
      setAllInfo: function setAllInfo(headImgUrl, nickName, bankerNodeisActive, homeownersNodeisActive, maizui_arr) {
        this._content = this.scroll_view.content;
        this.setHeadImg(headImgUrl);
        this.setNickName(nickName);
        this.setBankerNode(bankerNodeisActive);
        this.setHomeownersNode(homeownersNodeisActive);
        this.setItemToList(maizui_arr);
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        this.updateSpriteFrame(headImgUrl, self.headImgUrl);
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        var form_nickName = "";
        if (nickName.length > 10) {
          for (var i = 0; i < 10; i++) {
            var element = nickName[i];
            form_nickName += element;
          }
          this.nickName.string = form_nickName + "....";
        } else {
          form_nickName = nickName;
          this.nickName.string = form_nickName;
        }
      },
      setBankerNode: function setBankerNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.bankerNode.active = isActive;
      },
      setHomeownersNode: function setHomeownersNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.homeownersNode.active = isActive;
      },
      setItemToList: function setItemToList(maizui_arr) {
        var self = this;
        this._content.destroyAllChildren();
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        var maiZui_conf_key = game_conf.maiZui_conf.key;
        for (var i = 0; i < maizui_arr.length; i++) {
          var data = maizui_arr[i];
          var key = maiZui_conf_key[i];
          var item = cc.instantiate(self.item_prefab);
          var mahjong_game_maiZui_over_score_maizui_item = item.getComponent("Mahjong_game_maiZui_over_score_maizui_item");
          mahjong_game_maiZui_over_score_maizui_item.setAllInfo(key, data);
          self._content.addChild(item);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_maiZui_over_details_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "a0d4dbR5rhMJqucA+2t0uU+", "Mahjong_game_maiZui_over_details_layer");
    "use strict";
    var UIManager = require("UIManager");
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    cc.Class({
      extends: UIManager,
      properties: {
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        }
      },
      onLoad: function onLoad() {
        this._content = this.scroll_view.content;
      },
      start: function start() {},
      setInitAll: function setInitAll(game_over_seats_data) {
        this.addItemToList(game_over_seats_data);
      },
      addItemToList: function addItemToList(seats_datas) {
        var self = this;
        this._content.destroyAllChildren();
        for (var i = 0; i < seats_datas.length; i++) {
          var seats_data = seats_datas[i];
          var item = cc.instantiate(self.item_prefab);
          var mahjong_game_maiZui_over_details_item = item.getComponent("Mahjong_game_maiZui_over_details_item");
          var homeownersNodeisActive = false;
          seats_data.user_id == cc.myBaseMgr.DAO.UserDao.uid && (homeownersNodeisActive = true);
          var is_boss = 1 == seats_data.identity;
          mahjong_game_maiZui_over_details_item.setAllInfo(seats_data.user_icon, seats_data.user_name, is_boss, homeownersNodeisActive, seats_data.result_score[0].maizui_arr);
          self._content.addChild(item);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_maiZui_over_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "243662IxCZPo62gSL8oZ44n", "Mahjong_game_maiZui_over_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        bankerNode: {
          default: null,
          type: cc.Node,
          displayName: "\u5e84\u5bb6\u8282\u70b9",
          tooltip: "\u5e84\u5bb6\u8282\u70b9"
        },
        homeownersNode: {
          default: null,
          type: cc.Node,
          displayName: "\u623f\u4e3b\u8282\u70b9",
          tooltip: "\u623f\u4e3b\u8282\u70b9"
        },
        score_label: {
          default: null,
          type: cc.Label,
          displayName: "score_label",
          tooltip: "\u5206\u6570\u6587\u672c"
        },
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        }
      },
      onload: function onload() {},
      setAllInfo: function setAllInfo(headImgUrl, nickName, bankerNodeisActive, homeownersNodeisActive, score, maizui_data, seats_datas) {
        this._content = this.scroll_view.content;
        this.setHeadImg(headImgUrl);
        this.setNickName(nickName);
        this.setBankerNode(bankerNodeisActive);
        this.setHomeownersNode(homeownersNodeisActive);
        this.setScoreLabel(score);
        this.setItemToList(maizui_data, seats_datas);
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        this.updateSpriteFrame(headImgUrl, self.headImgUrl);
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        var form_nickName = "";
        if (nickName.length > 10) {
          for (var i = 0; i < 10; i++) {
            var element = nickName[i];
            form_nickName += element;
          }
          this.nickName.string = form_nickName + "....";
        } else {
          form_nickName = nickName;
          this.nickName.string = form_nickName;
        }
      },
      setBankerNode: function setBankerNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.bankerNode.active = isActive;
      },
      setHomeownersNode: function setHomeownersNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.homeownersNode.active = isActive;
      },
      setScoreLabel: function setScoreLabel(score_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(score_label)) return;
        this.score_label.string = (score_label < 0, score_label);
      },
      setItemToList: function setItemToList(maizui_data, seats_datas) {
        var self = this;
        this._content.destroyAllChildren();
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        var score_details_conf = game_conf.score_details_conf;
        for (var i = 0; i < maizui_data.length; i++) {
          var data = maizui_data[i];
          var key = score_details_conf[i];
          var item = cc.instantiate(self.item_prefab);
          var isActive = false;
          var score = data;
          var mahjong_game_maiZui_over_user_score_type_item = item.getComponent("Mahjong_game_maiZui_over_user_score_type_item");
          if (0 == i) {
            isActive = true;
            score = data.maizui_score;
          }
          mahjong_game_maiZui_over_user_score_type_item.setAllInfo(key, isActive, score, seats_datas);
          self._content.addChild(item);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_maiZui_over_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "3882fha+ORGmYsLn6jQs9d6", "Mahjong_game_maiZui_over_layer");
    "use strict";
    var UIManager = require("UIManager");
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    cc.Class({
      extends: UIManager,
      properties: {
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        }
      },
      onLoad: function onLoad() {
        this._content = this.scroll_view.content;
      },
      start: function start() {},
      setInitAll: function setInitAll(game_over_seats_data) {
        "undefined" != typeof window && window.__mahjongSettleFromSeats && window.__mahjongSettleFromSeats(game_over_seats_data, "maizui_over");
        this.addItemToList(game_over_seats_data);
      },
      addItemToList: function addItemToList(seats_datas) {
        var self = this;
        this._content.destroyAllChildren();
        for (var i = 0; i < seats_datas.length; i++) {
          var seats_data = seats_datas[i];
          var item = cc.instantiate(self.item_prefab);
          var mahjong_game_maiZui_over_item = item.getComponent("Mahjong_game_maiZui_over_item");
          var homeownersNodeisActive = false;
          seats_data.user_id == cc.myBaseMgr.DAO.UserDao.uid && (homeownersNodeisActive = true);
          var is_boss = 1 == seats_data.identity;
          mahjong_game_maiZui_over_item.setAllInfo(seats_data.user_icon, seats_data.user_name, is_boss, homeownersNodeisActive, seats_data.score, seats_data.result_score, seats_datas);
          self._content.addChild(item);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_maiZui_over_score_maizui_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "300e1t1CvBKop2u4aJ1wZQf", "Mahjong_game_maiZui_over_score_maizui_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        maizui_name_label: {
          default: null,
          type: cc.Label,
          displayName: "cause_label",
          tooltip: "\u4e70\u5634\u540d\u79f0"
        },
        number_label: {
          default: null,
          type: cc.Label,
          displayName: "number_label",
          tooltip: "\u6570\u91cf\u6587\u672c"
        }
      },
      setAllInfo: function setAllInfo(maizui_name_label, number_label) {
        this.setMaiZuiNameLabel(maizui_name_label);
        this.setNumberLabel(number_label);
      },
      setMaiZuiNameLabel: function setMaiZuiNameLabel(maizui_name_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.maizui_name_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(maizui_name_label)) return;
        this.maizui_name_label.string = maizui_name_label;
      },
      setNumberLabel: function setNumberLabel(number_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.number_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(number_label)) return;
        this.number_label.string = (number_label < 0, number_label);
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_maiZui_over_user_score_type_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "d008cgohchFh5hO8qRYVhnH", "Mahjong_game_maiZui_over_user_score_type_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        score_name_label: {
          default: null,
          type: cc.Label,
          displayName: "cause_label",
          tooltip: "\u5206\u6570\u540d\u79f0"
        },
        btn_find_node: {
          default: null,
          type: cc.Node,
          displayName: "seat_location_label",
          tooltip: "\u67e5\u770b\u6309\u94aenode"
        },
        score_label: {
          default: null,
          type: cc.Label,
          displayName: "score_label",
          tooltip: "\u5206\u6570\u6587\u672c"
        },
        _seats_datas: null
      },
      setAllInfo: function setAllInfo(score_name_label, isActive, score_label, seats_datas) {
        this.setScoreNameLabel(score_name_label);
        this.setBtnFindNode(isActive);
        this.setScoreLabel(score_label);
        this.setSeatsDatas(seats_datas);
      },
      setScoreNameLabel: function setScoreNameLabel(score_name_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score_name_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(score_name_label)) return;
        this.score_name_label.string = score_name_label;
      },
      setBtnFindNode: function setBtnFindNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.btn_find_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.btn_find_node.active = isActive;
      },
      setScoreLabel: function setScoreLabel(score_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(score_label)) return;
        this.score_label.string = (score_label < 0, score_label);
      },
      setSeatsDatas: function setSeatsDatas(seats_datas) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(seats_datas)) return;
        this._seats_datas = seats_datas;
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_find":
          this.creater_Layer("mahjong_game_maiZui_over_details_layer", this._seats_datas);
          break;

         default:
          this.creater_Layer("msg_layer", {
            text: cc.myBaseMgr.LabelMsg.NOT_OPEN
          });
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_maiZui_select_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "074f6izopZJJp2TVKhBx3tr", "Mahjong_game_maiZui_select_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        typeNameLabel: {
          default: null,
          type: cc.Label,
          displayName: "\u6807\u9898\u540d\u79f0",
          tooltip: "\u6807\u9898\u540d\u79f0"
        },
        ToggleContainer: {
          default: null,
          type: cc.Node,
          displayName: "ToggleContainer",
          tooltip: "ToggleContainer"
        }
      },
      setAllInfo: function setAllInfo(key, val) {
        this.setTypeNameLabel(key);
        this.setToggleContainer(val);
      },
      setTypeNameLabel: function setTypeNameLabel(key) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.typeNameLabel) || !cc.myBaseMgr.DataMgr.isData_UnNull(key)) return;
        this.typeNameLabel.string = key;
      },
      setToggleContainer: function setToggleContainer(val) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.ToggleContainer) || !cc.myBaseMgr.DataMgr.isData_UnNull(val)) return;
        this.node._val = val;
        this.ToggleContainer.children[0].getComponent(cc.Toggle).isChecked = false;
        this.ToggleContainer.children[1].getComponent(cc.Toggle).isChecked = false;
        val ? this.ToggleContainer.children[1].getComponent(cc.Toggle).isChecked = true : this.ToggleContainer.children[0].getComponent(cc.Toggle).isChecked = true;
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        cc.log(this.typeNameLabel.string + " = " + d);
        this.node._val = parseInt(d);
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_maiZui_select_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "4849fA8wC9JUZUdEkfREDlZ", "Mahjong_game_maiZui_select_layer");
    "use strict";
    var UIManager = require("UIManager");
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    cc.Class({
      extends: UIManager,
      properties: {
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        },
        select_all_btn: {
          default: null,
          type: cc.Toggle,
          displayName: "Toggle",
          tooltip: "Toggle"
        },
        _items: []
      },
      onLoad: function onLoad() {
        this._content = this.scroll_view.content;
        this.addItemToList();
        this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this._game_send_event = wsMsgKeyEnum[this._game_conf.gameKey]["send"];
      },
      start: function start() {
        this.select_all_btn.isChecked = this._game_conf.maiZui_conf.isDefaultAllMaiZui;
      },
      addItemToList: function addItemToList() {
        var self = this;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        var maiZui_conf_key = game_conf.maiZui_conf.key;
        var maiZui_conf_val = game_conf.maiZui_conf.val;
        for (var i = 0; i < maiZui_conf_key.length; i++) {
          var key = maiZui_conf_key[i];
          var val = maiZui_conf_val[i];
          var item = cc.instantiate(self.item_prefab);
          self._content.addChild(item);
          var mahjong_game_maiZui_select_item = item.getComponent("Mahjong_game_maiZui_select_item");
          mahjong_game_maiZui_select_item.setAllInfo(key, val);
          this._items.push(item);
        }
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_ok":
          var maizui_arr = [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ];
          for (var _i = 0; _i < self._content.children.length; _i++) {
            var element = self._content.children[_i];
            maizui_arr[_i] = element._val;
          }
          var resdata = {
            maizui_arr: maizui_arr
          };
          cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_send_event["maizui"], resdata);
          break;

         case "select_all":
          if (e.isChecked) {
            cc.log("\u5168\u9009");
            for (var i = 0; i < this._items.length; i++) {
              var _element = this._items[i];
              var mahjong_game_maiZui_select_item = _element.getComponent("Mahjong_game_maiZui_select_item");
              mahjong_game_maiZui_select_item.setToggleContainer(1);
            }
          } else {
            cc.log("\u5168\u4e0d\u9009");
            for (var i = 0; i < this._items.length; i++) {
              var _element2 = this._items[i];
              var mahjong_game_maiZui_select_item = _element2.getComponent("Mahjong_game_maiZui_select_item");
              mahjong_game_maiZui_select_item.setToggleContainer(0);
            }
          }
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_maiZui_service: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "98145kE/8hG5Y9hsZp6AVQz", "Mahjong_game_maiZui_service");
    "use strict";
    function _defineProperty(obj, key, value) {
      key in obj ? Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      }) : obj[key] = value;
      return obj;
    }
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseService = require("MahjongBaseService");
    cc.Class(_defineProperty({
      extends: MahjongBaseService,
      properties: {},
      ctor: function ctor() {
        cc.log("Mahjong_game_maiZui_service ctor");
      },
      onLoad: function onLoad() {
        cc.log("onLoad");
        this._super();
      },
      start: function start() {
        this._super();
      },
      onDisable: function onDisable() {
        this._super();
      },
      onMatching_win_all: function onMatching_win_all(code, msg, data) {
        console.log(this._matching_service_event["onMatching_win_all"]);
        this.unschedule(this.schedule_startMatching_callback);
        this.matching_layer.active = false;
      },
      onUpdate_room_info_all: function onUpdate_room_info_all(code, msg, data) {
        this._home_state = data["home_state"];
        this._home_data = data;
        function repare() {
          this.game_layer.active = false;
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_info.active = true;
          this.room_layer.active = true;
          this.updateRoomSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function setRoomInfo() {
          this.setRoomID(data.roomid);
          this.setInning(data.cruent_inning, data.max_inning);
          this.setPeopleNum(data.seats.length, data.max_people_num);
          for (var i = 0; i < data.seats.length; i++) {
            var seat = data.seats[i];
            if (seat.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId + "") {
              this.setTotalScore(seat.total_score);
              break;
            }
          }
        }
        function game_maizui() {
          var _this = this;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          if (!this._isshow_matchSuccessful_layer) {
            this._isshow_matchSuccessful_layer = true;
            this.matchSuccessful_layer.active = true;
            this.matchSuccessful_animation.node.active = true;
            this.matchSuccessful_animation.setAnimation(0, "animation", false);
            this.matchSuccessful_animation.setCompleteListener(function() {
              _this.matchSuccessful_layer.active = false;
              _this.game_layer.active = true;
              _this.matchSuccessful_animation.node.active = false;
              _this.game_start_animation.node.active = true;
              _this.game_start_animation.setAnimation(0, "animation", false);
              _this.game_start_animation.setCompleteListener(function() {
                _this.game_start_animation.node.active = false;
                _this.creater_Layer("mahjong_game_maiZui_select_layer");
              });
            });
          }
        }
        function game_start() {
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_layer.active = false;
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"], true);
        }
        function room_playing_call() {
          this.game_layer.active = true;
          this.room_info.active = true;
          this.remove_Layer("mahjong_game_maiZui_select_layer");
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function gameOver() {
          console.warn("gameOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          this.gameOverCall(data);
          this.creater_Layer("mahjong_game_maiZui_over_layer", this._game_over_seats_data);
        }
        function waitOver() {
          console.warn("waitOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          this.gameOverCall(data);
        }
        var room_state = data["home_state"];
        this.setCardTotalNumLabel(data["home_cards_num"]);
        setRoomInfo.bind(this)();
        switch (room_state) {
         case this._game_conf.game_scene.repare:
          repare.bind(this)();
          break;

         case this._game_conf.game_scene.game_maizui:
          game_start.bind(this)();
          game_maizui.bind(this)();
          break;

         case this._game_conf.game_scene.game_start:
          game_start.bind(this)();
          break;

         case this._game_conf.game_scene.game_move:
          room_playing_call.bind(this)();
          break;

         case this._game_conf.game_scene.game_over:
         case this._game_conf.game_scene.single_over:
          gameOver.bind(this)();
          break;

         case this._game_conf.game_scene.wait_over:
          waitOver.bind(this)();
        }
      }
    }, "onDisable", function onDisable() {
      this._super();
    }));
    cc._RF.pop();
  }, {
    MahjongBaseService: "MahjongBaseService",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_over_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "8ec2bVjPptAOL50BwgKsDuU", "Mahjong_game_over_layer");
    "use strict";
    var UIManager = require("UIManager");
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    cc.Class({
      extends: UIManager,
      properties: {
        seat_node_myself: {
          default: null,
          type: cc.Node,
          displayName: "seat_node_myself",
          tooltip: "seat_node_myself"
        },
        seat_node_right: {
          default: null,
          type: cc.Node,
          displayName: "seat_node_right",
          tooltip: "seat_node_right"
        },
        seat_node_top: {
          default: null,
          type: cc.Node,
          displayName: "seat_node_top",
          tooltip: "seat_node_top"
        },
        seat_node_left: {
          default: null,
          type: cc.Node,
          displayName: "seat_node_left",
          tooltip: "seat_node_left"
        },
        mahjong_game_over_score_describe_item_prefab: {
          default: null,
          type: cc.Prefab,
          displayName: "mahjong_game_over_score_describe_item",
          tooltip: "mahjong_game_over_score_describe_item"
        },
        score_describe_content: {
          default: null,
          type: cc.Node,
          displayName: "score_describe",
          tooltip: "score_describe"
        },
        _seats: null,
        _game_conf: null
      },
      onLoad: function onLoad() {},
      setInitAll: function setInitAll(game_over_seats_data) {
        this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this._game_service_event = wsMsgKeyEnum[this._game_conf.gameKey]["service"];
        this.initPushGameSeatsBySeatsNode();
        this.updateGameSeatsData(game_over_seats_data);
        this.setScoreDescribe();
        "undefined" != typeof window && window.__mahjongSettleFromSeats && window.__mahjongSettleFromSeats(game_over_seats_data, "normal_over");
      },
      initPushGameSeatsBySeatsNode: function initPushGameSeatsBySeatsNode() {
        this._seats = this._seats || {};
        this._seats["myself"] = this.seat_node_myself;
        this._seats["left"] = this.seat_node_left;
        this._seats["right"] = this.seat_node_right;
        this._seats["top"] = this.seat_node_top;
      },
      updateGameSeatsData: function updateGameSeatsData(seats_data) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(seats_data)) return;
        var self_index = null;
        for (var i = 0; i < seats_data.length; i++) {
          var element = seats_data[i];
          if (element.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId + "") {
            self_index = i;
            break;
          }
        }
        var is_flow_innings = true;
        for (var _i = 0; _i < seats_data.length; _i++) {
          var _element = seats_data[_i];
          if (-1 != _element.hu_state) {
            is_flow_innings = false;
            break;
          }
        }
        var left_idnex = self_index - 1 < 0 ? seats_data.length - 1 : self_index - 1;
        var right_index = self_index + 1 >= seats_data.length ? 0 : self_index + 1;
        var top_index = right_index + 1 >= seats_data.length ? 0 : right_index + 1;
        var left_data = seats_data[left_idnex];
        var right_data = seats_data[right_index];
        var top_data = seats_data[top_index];
        var self_data = seats_data[self_index];
        var is_boss = null;
        var myself_mahjong_game_over_seat_item = this._seats["myself"].getComponent("Mahjong_game_over_seat_item");
        is_boss = 1 == self_data.identity;
        myself_mahjong_game_over_seat_item.setAllinfo("myself", self_data.user_icon, self_data.user_name, self_data.score, self_data.hu_state, is_flow_innings);
        var left_mahjong_game_over_seat_item = this._seats["left"].getComponent("Mahjong_game_over_seat_item");
        is_boss = 1 == left_data.identity;
        left_mahjong_game_over_seat_item.setAllinfo("left", left_data.user_icon, left_data.user_name, left_data.score, left_data.hu_state, is_flow_innings);
        var right_mahjong_game_over_seat_item = this._seats["right"].getComponent("Mahjong_game_over_seat_item");
        is_boss = 1 == right_data.identity;
        right_mahjong_game_over_seat_item.setAllinfo("right", right_data.user_icon, right_data.user_name, right_data.score, right_data.hu_state, is_flow_innings);
        var top_mahjong_game_over_seat_item = this._seats["top"].getComponent("Mahjong_game_over_seat_item");
        is_boss = 1 == top_data.identity;
        top_mahjong_game_over_seat_item.setAllinfo("top", top_data.user_icon, top_data.user_name, top_data.score, top_data.hu_state, is_flow_innings);
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_exit_game":
          cc.game_frame_EventMgr.pushEventImm(this._game_service_event["directly_exit_game"]);
          break;

         case "btn_next_game":
          cc.game_frame_EventMgr.pushEventImm(this._game_service_event["next_game"]);
        }
      },
      setScoreDescribe: function setScoreDescribe() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.mahjong_game_over_score_describe_item_prefab) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.score_describe_content) || !cc.myBaseMgr.DataMgr.isData_UnNull(this._game_conf)) return;
        var game_conf_hu_state = this._game_conf["hu_state"];
        function getHuStateConfByid(hu_state_id) {
          for (var key in game_conf_hu_state) if (Object.hasOwnProperty.call(game_conf_hu_state, key)) {
            var element = game_conf_hu_state[key];
            if (element["id"] == hu_state_id) return element;
          }
        }
        function create_prefab(cause_label, seats_postion, score) {
          var prefab = cc.instantiate(this.mahjong_game_over_score_describe_item_prefab);
          var seats_postion_conf = cc.myBaseMgr["seats_conf"][seats_postion];
          var mahjong_game_over_score_describe_item = prefab.getComponent("Mahjong_game_over_score_describe_item");
          mahjong_game_over_score_describe_item.setAllinfo(cause_label, seats_postion_conf["name"], score);
          this.score_describe_content.addChild(prefab);
        }
        for (var key in this._seats) if (Object.hasOwnProperty.call(this._seats, key)) {
          var element = this._seats[key];
          if (element._hu_state != game_conf_hu_state["not_hu"]["id"]) {
            var hu_conf = getHuStateConfByid(element._hu_state);
            create_prefab.bind(this)(hu_conf["name"], element["_seats_postion"], element._score);
          } else element._hu_state == game_conf_hu_state["not_hu"]["id"] && 0 != element._score && create_prefab.bind(this)("\u70b9\u70ae", element["_seats_postion"], element._score);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_over_score_describe_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "de66aW2ZZBBva6/UUcWq+nV", "Mahjong_game_over_score_describe_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        cause_label: {
          default: null,
          type: cc.Label,
          displayName: "cause_label",
          tooltip: "\u80e1\u724c\u7c7b\u578b\u63cf\u8ff0"
        },
        seat_location_label: {
          default: null,
          type: cc.Label,
          displayName: "seat_location_label",
          tooltip: "\u5ea7\u4f4d\u4f4d\u7f6e"
        },
        score_label: {
          default: null,
          type: cc.Label,
          displayName: "score_label",
          tooltip: "\u5206\u6570\u6587\u672c"
        }
      },
      setAllinfo: function setAllinfo(cause_label, seat_location_label, score_label) {
        this.setCauseLabel(cause_label);
        this.setSeatLocationLabel(seat_location_label);
        this.setScoreLabel(score_label);
      },
      setCauseLabel: function setCauseLabel(cause_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.cause_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(cause_label)) return;
        this.cause_label.string = cause_label;
      },
      setSeatLocationLabel: function setSeatLocationLabel(seat_location_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.seat_location_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(seat_location_label)) return;
        this.seat_location_label.string = seat_location_label;
      },
      setScoreLabel: function setScoreLabel(score_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(score_label)) return;
        this.score_label.string = score_label < 0 ? score_label : "+" + score_label;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_over_seat_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "84667/q9vFIH6xAZAS7g6Cr", "Mahjong_game_over_seat_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        score: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u5206\u6570",
          tooltip: "\u7528\u6237\u5206\u6570"
        },
        win_node: {
          default: null,
          type: cc.Node,
          displayName: "\u80dc\u5229\u8282\u70b9",
          tooltip: "\u80dc\u5229\u8282\u70b9"
        },
        lose_node: {
          default: null,
          type: cc.Node,
          displayName: "\u5931\u8d25\u8282\u70b9",
          tooltip: "\u5931\u8d25\u8282\u70b9"
        },
        flow_node: {
          default: null,
          type: cc.Node,
          displayName: "\u5e73\u5c40\u8282\u70b9",
          tooltip: "\u5e73\u5c40\u8282\u70b9"
        }
      },
      setAllinfo: function setAllinfo(seats_postion, headImgUrl, nickName, score, hu_state, is_flow_innings) {
        this.setSeatsPostion(seats_postion);
        this.setHuState(hu_state);
        this.setHeadImg(headImgUrl);
        this.setNickName(nickName);
        this.setScore(score);
        this.setWinOrLose(hu_state, is_flow_innings);
      },
      setSeatsPostion: function setSeatsPostion(seats_postion) {
        this.node._seats_postion = seats_postion;
      },
      setHuState: function setHuState(hu_state) {
        this.node._hu_state = hu_state;
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        cc.loader.load(headImgUrl, function(err, texture) {
          var frame = new cc.SpriteFrame(texture);
          self.headImgUrl.spriteFrame = frame;
        });
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        this.nickName.string = nickName;
      },
      setScore: function setScore(score) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score) || !cc.myBaseMgr.DataMgr.isData_UnNull(score)) return;
        this.node._score = score;
        if (0 == score) return;
        this.score.string = score < 0 ? score : "+" + score;
      },
      setWinOrLose: function setWinOrLose(hu_state, is_flow_innings) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.win_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.lose_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(hu_state) || !cc.myBaseMgr.DataMgr.isData_UnNull(is_flow_innings)) return;
        if (is_flow_innings) {
          this.win_node.active = false;
          this.lose_node.active = false;
          this.flow_node.active = true;
        } else {
          this.win_node.active = -1 != hu_state;
          this.lose_node.active = -1 == hu_state;
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_quYang_service: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "503caHfiHVE8JQomzNgqzhH", "Mahjong_game_quYang_service");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseService = require("MahjongBaseService");
    cc.Class({
      extends: MahjongBaseService,
      properties: {
        sendCard_menu_btn_kouPai_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u6263\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u6263\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_buKouPai_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u4e0d\u6263\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u4e0d\u6263\u724c\u8282\u70b9"
        },
        _isKouPai: false
      },
      ctor: function ctor() {
        cc.log("Mahjong_game_quYang_service ctor");
      },
      onLoad: function onLoad() {
        cc.log("onLoad");
        this._super();
        this._isKouPai = false;
        this.sendCard_menu_btn_kouPai_node = cc.find("Canvas/main/game_layer/menu/btn_kouPai");
        this.sendCard_menu_btn_buKouPai_node = cc.find("Canvas/main/game_layer/menu/btn_buKouPai");
        this.addClickEventHandler(this.sendCard_menu_btn_kouPai_node, "btn_kouPai");
        this.addClickEventHandler(this.sendCard_menu_btn_buKouPai_node, "btn_buKouPai");
        this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this._game_send_event = wsMsgKeyEnum[this._game_conf.gameKey]["send"];
        var myself_seat_info_item = this._game_seats["myself"].getComponent("Mahjong_game_seat_info_item");
        myself_seat_info_item._card_data_start_length = 4;
      },
      start: function start() {
        this._super();
      },
      onDisable: function onDisable() {
        this._super();
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_kouPai":
          console.log("\u6263\u724c");
          this.click_kouCrad_event();
          break;

         case "btn_buKouPai":
          console.log("\u4e0d\u6263\u724c");
          this.click_not_kouPai_event();
          break;

         default:
          this._super(e, d);
        }
      },
      click_kouCrad_event: function click_kouCrad_event() {
        var myself_seat_info_item = this._game_seats["myself"].getComponent("Mahjong_game_seat_info_item");
        myself_seat_info_item._card_data_start_length += 4;
        this._isKouPai = false;
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_send_event["hide_cards"]);
      },
      click_not_kouPai_event: function click_not_kouPai_event() {
        cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_send_event["stop_hide_cards"]);
        this._isKouPai = true;
      },
      onUpdate_hand_holds: function onUpdate_hand_holds(code, msg, data) {
        var myself_seat_info_item = this._game_seats["myself"].getComponent("Mahjong_game_seat_info_item");
        if (this._isKouPai) for (var i = 4; i < data.holds.length; i++) false == data.holds[i].isCard ? myself_seat_info_item._card_data_start_length += 1 : i = i; else this._home_state == this._game_conf.game_scene.game_move && (myself_seat_info_item._card_data_start_length = data["holds"].length);
        myself_seat_info_item.setHandCard("myself", data);
      },
      onUpdate_room_info_all: function onUpdate_room_info_all(code, msg, data) {
        this._home_state = data["home_state"];
        this._home_data = data;
        function repare() {
          this.game_layer.active = false;
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_info.active = true;
          this.room_layer.active = true;
          this.updateRoomSeatsData(data.seats, data.last_index, data["home_state"], true);
        }
        function setRoomInfo() {
          this.setRoomID(data.roomid);
          this.setInning(data.cruent_inning, data.max_inning);
          this.setPeopleNum(data.seats.length, data.max_people_num);
          for (var i = 0; i < data.seats.length; i++) {
            var seat = data.seats[i];
            if (seat.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId + "") {
              this.setTotalScore(seat.total_score);
              break;
            }
          }
        }
        function hide_holds() {
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function game_start() {
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_layer.active = false;
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"], true);
        }
        function room_playing_call() {
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function gameOver() {
          console.warn("gameOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          this.gameOverCall(data);
          this.creater_Layer("mahjong_game_maiZui_over_layer", this._game_over_seats_data);
        }
        function waitOver() {
          console.warn("waitOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        var room_state = data["home_state"];
        this.setCardTotalNumLabel(data["home_cards_num"]);
        setRoomInfo.bind(this)();
        switch (room_state) {
         case this._game_conf.game_scene.repare:
          repare.bind(this)();
          break;

         case this._game_conf.game_scene.hide_holds:
          hide_holds.bind(this)();
          break;

         case this._game_conf.game_scene.game_start:
          game_start.bind(this)();
          break;

         case this._game_conf.game_scene.game_move:
          room_playing_call.bind(this)();
          break;

         case this._game_conf.game_scene.game_over:
         case this._game_conf.game_scene.single_over:
          gameOver.bind(this)();
          break;

         case this._game_conf.game_scene.wait_over:
          waitOver.bind(this)();
        }
      }
    });
    cc._RF.pop();
  }, {
    MahjongBaseService: "MahjongBaseService",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_seat_info_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "9133b8oWpZK1oricGd9hldg", "Mahjong_game_seat_info_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        score: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u5206\u6570",
          tooltip: "\u7528\u6237\u5206\u6570"
        },
        buhua_length: {
          default: null,
          type: cc.Label,
          displayName: "\u8865\u82b1\u6b21\u6570",
          tooltip: "\u8865\u82b1\u6b21\u6570"
        },
        ip: {
          default: null,
          type: cc.Label,
          displayName: "ip",
          tooltip: "ip"
        },
        text_label: {
          default: null,
          type: cc.Label,
          displayName: "\u804a\u5929\u6587\u5b57",
          tooltip: "\u804a\u5929\u6587\u5b57"
        },
        voice_node: {
          default: null,
          type: cc.Node,
          displayName: "\u8bed\u97f3\u8282\u70b9",
          tooltip: "\u8bed\u97f3\u8282\u70b9"
        },
        boos_node: {
          default: null,
          type: cc.Node,
          displayName: "\u4ee3\u8868\u5e84\u5bb6\u7684\u8282\u70b9",
          tooltip: "\u4ee3\u8868\u5e84\u5bb6\u7684\u8282\u70b9"
        },
        await_node: {
          default: null,
          type: cc.Node,
          displayName: "\u7b49\u5f85\u4e2d\u65f6\u95f4 \u8282\u70b9",
          tooltip: "\u7b49\u5f85\u4e2d\u65f6\u95f4 \u8282\u70b9"
        },
        sendCard_user_head_animation_node: {
          default: null,
          type: cc.Node,
          displayName: "\u51fa\u724c\u7528\u6237\u5934\u50cf\u52a8\u753b",
          tooltip: "\u51fa\u724c\u7528\u6237\u5934\u50cf\u52a8\u753b"
        },
        sendCard_menu_btn_hu_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u80e1\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u80e1\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_ting_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u542c\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u542c\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_gang_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u6760\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u6760\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_peng_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u78b0\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u78b0\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_chi_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u5403\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u5403\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_guo_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u8fc7\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u8fc7\u8282\u70b9"
        },
        sendCard_menu_btn_kouPai_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u6263\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u6263\u724c\u8282\u70b9"
        },
        sendCard_menu_btn_buKouPai_node: {
          default: null,
          type: cc.Node,
          displayName: "\u64cd\u4f5c\u6309\u94ae \u4e0d\u6263\u724c\u8282\u70b9",
          tooltip: "\u64cd\u4f5c\u6309\u94ae \u4e0d\u6263\u724c\u8282\u70b9"
        },
        animation: {
          default: null,
          type: sp.Skeleton,
          displayName: "\u7279\u6548 \u52a8\u753b",
          tooltip: "\u7279\u6548 \u52a8\u753b"
        },
        animation_buhua: {
          default: null,
          type: sp.Skeleton,
          displayName: "\u8865\u82b1\u7279\u6548 \u52a8\u753b",
          tooltip: "\u8865\u82b1\u7279\u6548 \u52a8\u753b"
        },
        deposit_node: {
          default: null,
          type: cc.Node,
          displayName: "\u6258\u7ba1\u8282\u70b9",
          tooltip: "\u6258\u7ba1\u8282\u70b9"
        },
        guaJi_node: {
          default: null,
          type: cc.Node,
          displayName: "\u6302\u673a\u8282\u70b9",
          tooltip: "\u6302\u673a\u8282\u70b9"
        },
        handCard_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u624b\u724c_layout",
          tooltip: "\u624b\u724c_layout"
        },
        mo_card_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u6478\u724c_layout",
          tooltip: "\u6478\u724c_layout"
        },
        handCard_layout_mask: {
          type: cc.Node,
          default: null,
          displayName: "\u624b\u724c_Layout_mask",
          tooltip: "\u624b\u724c_Layout_mask"
        },
        peng_and_gang_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u78b0\u724c\u6760\u724c_layout",
          tooltip: "\u78b0\u724c\u6760\u724c_layout"
        },
        outCard_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u51fa\u53bb\u5f97\u724c_layout",
          tooltip: "\u51fa\u53bb\u5f97\u724c_layout"
        },
        huaCard_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u82b1\u724c_layout",
          tooltip: "\u82b1\u724c_layout"
        },
        showCards_layout: {
          type: cc.Node,
          default: null,
          displayName: "\u660e\u724c_layout",
          tooltip: "\u660e\u724c_layout"
        },
        handCard_item_prefab: {
          type: cc.Prefab,
          default: null,
          displayName: "\u624b\u724c\u9884\u5236\u4f53",
          tooltip: "seat_\u65b9\u5411_card_item"
        },
        outCard_animation_subscript_prefab: {
          type: cc.Prefab,
          default: null,
          displayName: "\u51fa\u53bb\u5f97\u724c_\u52a8\u753b\u4e0b\u8868 \u9884\u5236\u4f53",
          tooltip: "\u51fa\u53bb\u5f97\u724c_\u52a8\u753b\u4e0b\u8868 \u9884\u5236\u4f53"
        },
        hu_icon_label_node: {
          type: cc.Node,
          default: null,
          displayName: "\u80e1 \u6587\u5b57 \u8282\u70b9",
          tooltip: "\u80e1 \u6587\u5b57 \u8282\u70b9"
        },
        pingHu_icon_label_node: {
          type: cc.Node,
          default: null,
          displayName: "\u5e73\u80e1 \u6587\u5b57 \u8282\u70b9",
          tooltip: "\u5e73\u80e1 \u6587\u5b57 \u8282\u70b9"
        },
        qingYiSe_icon_label_node: {
          type: cc.Node,
          default: null,
          displayName: "\u6e05\u4e00\u8272 \u6587\u5b57 \u8282\u70b9",
          tooltip: "\u6e05\u4e00\u8272 \u6587\u5b57 \u8282\u70b9"
        },
        yiTiaoLong_icon_label_node: {
          type: cc.Node,
          default: null,
          displayName: "\u4e00\u6761\u9f99 \u6587\u5b57 \u8282\u70b9",
          tooltip: "\u4e00\u6761\u9f99 \u6587\u5b57 \u8282\u70b9"
        },
        dianPao_icon_label_node: {
          type: cc.Node,
          default: null,
          displayName: "\u70b9\u70ae \u6587\u5b57 \u8282\u70b9",
          tooltip: "\u70b9\u70ae \u6587\u5b57 \u8282\u70b9"
        },
        add_score_label: {
          type: cc.Label,
          default: null,
          displayName: "\u52a0\u5206\u6587\u5b57",
          tooltip: "\u52a0\u5206\u6587\u5b57"
        },
        subtract_score_label: {
          type: cc.Label,
          default: null,
          displayName: "\u51cf\u5206\u6587\u5b57",
          tooltip: "\u51cf\u5206\u6587\u5b57"
        },
        trusteeship_ongoing_node: {
          type: cc.Node,
          default: null,
          displayName: "\u6258\u7ba1\u4e2d \u8282\u70b9",
          tooltip: "\u6258\u7ba1\u4e2d \u8282\u70b9"
        },
        zhunBei_node: {
          type: cc.Node,
          default: null,
          displayName: "\u51c6\u5907 \u8282\u70b9",
          tooltip: "\u51c6\u5907 \u8282\u70b9"
        },
        _card_type_node_name: "card_type_node",
        _play_game_conf: null,
        _outCard_layout_children_index: 0,
        _outCard_layout_children_length: 0,
        _record_present_last_outCard_posNode: null,
        _record_present_last_outCard_node: null,
        _record_present_last_outCard_animation_subscript_node: null,
        _pengCard_layout_children_length: 0,
        _gangCard_layout_children_length: 0,
        _card_data_start_length: 0,
        _direction_node: null
      },
      onLoad: function onLoad() {
        console.log("seat_info_item load~~~~~~~~~~~~");
        this.initMenu();
        this.initOutCardLayout();
        this.initHuaCardLayout();
        this.initPengAndGangLayout();
        this.initHandCardLayout();
        this.initShowLayout();
        this.initHuTypeLabelNodes();
        this.initScoreLabel();
        this.initUserHeadInfo();
        this.initTextNode();
        this.initVoiceNode();
        cc.myBaseMgr.DataMgr.isData_UnNull(this.animation_buhua) && (this.animation_buhua.node.active = false);
      },
      initMenu: function initMenu() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_hu_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_gang_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_peng_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_chi_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_kouPai_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_buKouPai_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_guo_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_ting_node)) return;
        this.sendCard_menu_btn_kouPai_node.active = false;
        this.sendCard_menu_btn_buKouPai_node.active = false;
        this.sendCard_menu_btn_hu_node.active = false;
        this.sendCard_menu_btn_ting_node.active = false;
        this.sendCard_menu_btn_gang_node.active = false;
        this.sendCard_menu_btn_peng_node.active = false;
        this.sendCard_menu_btn_chi_node.active = false;
        this.sendCard_menu_btn_guo_node.active = false;
      },
      initScoreLabel: function initScoreLabel() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.subtract_score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.add_score_label)) return;
        this.subtract_score_label.node.active = false;
        this.add_score_label.node.active = false;
      },
      initUserHeadInfo: function initUserHeadInfo() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.zhunBei_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.guaJi_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.deposit_node)) return;
        this.zhunBei_node.active = false;
        this.guaJi_node.active = false;
        this.deposit_node.active = false;
      },
      initOutCardLayout: function initOutCardLayout() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.outCard_layout)) return;
        console.log("\u521d\u59cb\u5316\u6253\u51fa\u53bb\u5f97\u724c \u9690\u85cf\u4e0b\u9762\u6240\u6709\u5b50\u8282\u70b9");
        this._record_present_last_outCard_animation_subscript_node && this._record_present_last_outCard_animation_subscript_node.removeFromParent();
        var children = this.outCard_layout.children;
        for (var i = 0; i < children.length; i++) {
          var element = children[i];
          element.active = false;
        }
      },
      initHuaCardLayout: function initHuaCardLayout() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.huaCard_layout)) return;
        console.log("\u521d\u59cb\u5316\u82b1\u724c \u9690\u85cf\u4e0b\u9762\u6240\u6709\u5b50\u8282\u70b9");
        var children = this.huaCard_layout.children;
        for (var i = 0; i < children.length; i++) {
          var element = children[i];
          element.active = false;
        }
      },
      initPengAndGangLayout: function initPengAndGangLayout() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.peng_and_gang_layout)) return;
        console.log("\u521d\u59cb\u5316 \u78b0\u724c \u6760\u724c Layout\u9690\u85cf\u4e0b\u9762\u6240\u6709\u5b50\u8282\u70b9");
        var children = this.peng_and_gang_layout.children;
        for (var i = 0; i < children.length; i++) {
          var pos = children[i];
          pos.active = false;
          var pos_children = pos.children;
          for (var j = 0; j < pos_children.length; j++) {
            var element = pos_children[j];
            element.active = false;
          }
        }
      },
      initHandCardLayout: function initHandCardLayout() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.handCard_layout)) return;
        this.handCard_layout.active = false;
        var pos_children = this.handCard_layout.children;
        for (var i = 0; i < pos_children.length; i++) {
          var element = pos_children[i];
          element.active = false;
          for (var j = 0; j < element.children.length; j++) {
            var obj = element.children[j];
            obj.active = false;
          }
        }
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.mo_card_layout)) return;
        this.mo_card_layout.active = false;
        if ("myself" == this.node._seats_postion) {
          this.handCard_layout && this.handCard_layout.removeAllChildren();
          this.mo_card_layout && this.mo_card_layout.removeAllChildren();
        }
      },
      initShowLayout: function initShowLayout() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.showCards_layout)) return;
        console.log("\u521d\u59cb\u5316\u660e\u724c \u9690\u85cf\u5168\u90e8 \u724c\u9762");
        var children = this.showCards_layout.children;
        for (var i = 0; i < children.length; i++) {
          var element = children[i];
          element.active = false;
        }
      },
      initHuTypeLabelNodes: function initHuTypeLabelNodes() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.hu_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.pingHu_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.qingYiSe_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.dianPao_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.yiTiaoLong_icon_label_node)) return;
        this.hu_icon_label_node.active = false;
        this.pingHu_icon_label_node.active = false;
        this.qingYiSe_icon_label_node.active = false;
        this.yiTiaoLong_icon_label_node.active = false;
        this.dianPao_icon_label_node.active = false;
      },
      initTextNode: function initTextNode() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.text_label)) return;
        this.text_label.node.parent.active = false;
      },
      initVoiceNode: function initVoiceNode() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.voice_node)) return;
        this.voice_node.active = false;
      },
      initDirection: function initDirection() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this._direction_node)) return;
        for (var i = 0; i < 4; i++) {
          var element = this._direction_node.getChildByName(i + 1 + "");
          element.active = false;
        }
      },
      setAllinfo: function setAllinfo(home_state, seats_postion, user_id, user_ip, text_chat, voice_chat, seats_index, action_state, headImgUrl, nickName, score, isboss, is_online, out_holds, out_buhua_holds, knock_holds, collision_holds, card_num, last_index, hu_state, is_trusteeship, hand_holds, hide_card_num, ting_state, anim_state, present_card, pos_name, direction_node, is_shot) {
        this.setDirectionNode(direction_node);
        this.setHomeState(home_state);
        this.setSeatsPostion(seats_postion);
        this.setUserID(user_id);
        this.setSeatsIndex(seats_index);
        this.setActionState(action_state);
        this.setTingState(ting_state);
        this.setHeadImg(headImgUrl);
        this.setNickName(nickName);
        this.setScore(score);
        this.setBuhuaLength(out_buhua_holds);
        this.setBossnode(isboss);
        this.setIsOnlinenode(is_online);
        this.setHeadDepositNode(is_trusteeship);
        this.setDepositOngoingNode(is_trusteeship);
        this.setMenu(action_state);
        this.setOutCardLayout(out_holds, present_card);
        this.setHuaCardLayout(out_buhua_holds);
        this.setShowCards(hand_holds);
        this.setPengAndGangLayout(knock_holds, collision_holds);
        this.setHandCard(seats_postion, card_num, hide_card_num, knock_holds, collision_holds);
        this.setAwaitNode();
        this.setPlayAnimation(anim_state, hu_state, score);
        this.setHuTypeLabelNodes(hu_state, is_shot);
        this.setPrepare();
        this.setSendCardnode(action_state, pos_name);
        this.setIP(user_ip);
        this.setText(text_chat);
        this.setVoice(voice_chat);
        this.setSelectMaiZui();
      },
      setDirectionNode: function setDirectionNode(direction_node) {
        this._direction_node = direction_node;
      },
      setHomeState: function setHomeState(home_state) {
        this.node._home_state = home_state;
      },
      setSeatsPostion: function setSeatsPostion(seats_postion) {
        this.node._seats_postion = seats_postion;
      },
      setUserID: function setUserID(user_id) {
        this.node._user_id = user_id;
      },
      setSeatsIndex: function setSeatsIndex(seats_index) {
        this.node._seats_index = seats_index;
      },
      setActionState: function setActionState(action_state) {
        this.node._action_state = action_state;
      },
      setTingState: function setTingState(ting_state) {
        this.node._ting_state = ting_state;
      },
      setPrepare: function setPrepare() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.node._action_state) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.zhunBei_node)) return;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this.zhunBei_node.active = false;
        this.node._action_state == game_conf["action_state"]["prepare"] && (this.zhunBei_node.active = true);
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        cc.loader.load(headImgUrl, function(err, texture) {
          var frame = new cc.SpriteFrame(texture);
          self.headImgUrl.spriteFrame = frame;
        });
      },
      _isRobotSeat: function _isRobotSeat() {
        var uid = this.node && this.node._user_id;
        return "string" === typeof uid && 0 === uid.indexOf("AI_");
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        if (this._isRobotSeat()) {
          this.nickName.string = "";
          return;
        }
        this.nickName.string = nickName;
      },
      setIP: function setIP(ip) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.ip) || !cc.myBaseMgr.DataMgr.isData_UnNull(ip)) return;
        this.ip.string = ip;
      },
      setText: function setText(text) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.text_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(text)) return;
        this.text_label.node.parent.active = true;
        this.text_label.string = text;
        this.scheduleOnce(function() {
          this.text_label.node.parent.active = false;
          this.text_label.string = "";
        }, 3);
      },
      setVoice: function setVoice(voice) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.voice_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(voice)) return;
        this.voice_node.active = true;
        this.scheduleOnce(function() {
          this.voice_node.active = false;
        }, 3);
      },
      setSelectMaiZui: function setSelectMaiZui() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.node._action_state) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.node._user_id) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.node._home_state)) return;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this.node._home_state == game_conf.game_scene.game_maizui && "myself" == this.node._seats_postion && this.node._action_state != game_conf["action_state"]["mai_zui"] && this.remove_Layer("mahjong_game_maiZui_select_layer");
      },
      setScore: function setScore(score) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score) || !cc.myBaseMgr.DataMgr.isData_UnNull(score) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.add_score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.subtract_score_label)) return;
        if (this._isRobotSeat()) {
          this.score.string = "";
          this.add_score_label.node.active = false;
          this.subtract_score_label.node.active = false;
          return;
        }
        function update_score_animation() {
          this.add_score_label.node.active = false;
          this.subtract_score_label.node.active = false;
          var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
          if (this.node._home_state == game_conf["game_scene"]["game_over"] || this.node._home_state == game_conf["game_scene"]["single_over"] || this.node._home_state == game_conf["game_scene"]["wait_over"]) {
            if (0 == score) return;
            if (score < 0) {
              this.subtract_score_label.node.active = true;
              this.subtract_score_label.string = score;
            } else {
              this.add_score_label.node.active = true;
              this.add_score_label.string = "+" + score;
            }
          }
        }
        update_score_animation.bind(this)();
        this.score.string = score;
      },
      setBuhuaLength: function setBuhuaLength(out_buhua_holds) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.buhua_length) || !cc.myBaseMgr.DataMgr.isData_UnNull(out_buhua_holds)) return;
        this.buhua_length.string = "X" + out_buhua_holds.length;
      },
      setBossnode: function setBossnode(isboss) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.boos_node)) return;
        this._isBoss = isboss || null;
        this.boos_node.active = isboss;
      },
      setIsOnlinenode: function setIsOnlinenode(is_online) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.guaJi_node)) return;
        this.guaJi_node.active = false;
        this.guaJi_node.active = !is_online;
      },
      setSendCardnode: function setSendCardnode(action_state, pos_name) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_user_head_animation_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this._direction_node)) return;
        this.handCard_layout_mask && (this.handCard_layout_mask.active = true);
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (action_state == game_conf["action_state"]["send_card"]) {
          this.initDirection();
          this._direction_node.getChildByName(pos_name + "").active = true;
          this.handCard_layout_mask && (this.handCard_layout_mask.active = false);
          return;
        }
      },
      setOutCardLayout: function setOutCardLayout(out_holds, present_card) {
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.outCard_layout) || !cc.myBaseMgr.DataMgr.isData_UnNull(out_holds)) return;
        this.initOutCardLayout();
        out_holds.length > 0 && (this.outCard_layout.active = true);
        var index = 1;
        for (var i = 0; i < out_holds.length; i++) {
          if (index >= this.outCard_layout.children.length) {
            index = 1;
            this.initOutCardLayout();
          }
          var out_holds_data = out_holds[i];
          var outCard_layout_children_pos = this.outCard_layout.getChildByName(index + "");
          if (!outCard_layout_children_pos) {
            console.warn("".concat("pos_" + index, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card = outCard_layout_children_pos.getChildByName(this._card_type_node_name);
          if (!card) {
            console.warn("".concat(this._card_type_node_name, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card_sprite = card.getComponent("cc.Sprite");
          card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][out_holds_data["value"]]["icon_res"]));
          if (i == out_holds.length - 1 && present_card && present_card["value"] == out_holds_data["value"]) {
            this._record_present_last_outCard_animation_subscript_node = cc.instantiate(this.outCard_animation_subscript_prefab);
            outCard_layout_children_pos.addChild(this._record_present_last_outCard_animation_subscript_node);
          }
          card.active = true;
          outCard_layout_children_pos.active = true;
          index++;
        }
        present_card;
      },
      setHuaCardLayout: function setHuaCardLayout(out_buhua_holds) {
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.huaCard_layout) || !cc.myBaseMgr.DataMgr.isData_UnNull(out_buhua_holds)) return;
        this.initHuaCardLayout();
        out_buhua_holds.length > 0 && (this.huaCard_layout.active = true);
        var index = 1;
        for (var i = 0; i < out_buhua_holds.length; i++) {
          if (index >= this.huaCard_layout.children.length) {
            index = 1;
            this.initHuaCardLayout();
          }
          var out_buhua_data = out_buhua_holds[i];
          var huaCard_layout_children_pos = this.huaCard_layout.getChildByName(index + "");
          if (!huaCard_layout_children_pos) {
            console.warn("".concat("pos_" + index, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card = huaCard_layout_children_pos.getChildByName(this._card_type_node_name);
          if (!card) {
            console.warn("".concat(this._card_type_node_name, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card_sprite = card.getComponent("cc.Sprite");
          card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][out_buhua_data["value"]]["icon_res"]));
          card.active = true;
          huaCard_layout_children_pos.active = true;
          index++;
        }
      },
      setShowCards: function setShowCards(hand_holds) {
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (this.node._home_state != game_conf["game_scene"]["single_over"] && this.node._home_state != game_conf["game_scene"]["game_over"] && this.node._home_state != game_conf["game_scene"]["wait_over"]) return;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.showCards_layout) || !cc.myBaseMgr.DataMgr.isData_UnNull(hand_holds)) return;
        var is_send_card_state = false;
        hand_holds.length > game_conf.max_card_len && (is_send_card_state = true);
        this.initShowLayout();
        hand_holds.length > 0 && (this.showCards_layout.active = true);
        this.initHandCardLayout();
        var index = 1;
        for (var i = 0; i < hand_holds.length; i++) {
          var hand_holds_data = hand_holds[i];
          if (!hand_holds_data["isShow"]) continue;
          var children_pos = this.showCards_layout.getChildByName(index + "");
          if (!children_pos) {
            console.warn("".concat("pos_" + index, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card = children_pos.getChildByName(this._card_type_node_name);
          if (!card) {
            console.warn("".concat(this._card_type_node_name, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
            return;
          }
          var card_sprite = card.getComponent("cc.Sprite");
          card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][hand_holds_data["value"]]["icon_res"]));
          card.active = true;
          children_pos.active = true;
          index++;
        }
      },
      setPengAndGangLayout: function setPengAndGangLayout(knock_holds, collision_holds) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.peng_and_gang_layout) || !cc.myBaseMgr.DataMgr.isData_UnNull(knock_holds) || !cc.myBaseMgr.DataMgr.isData_UnNull(collision_holds)) return;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this.initPengAndGangLayout();
        (knock_holds.length > 0 || collision_holds.length > 0) && (this.peng_and_gang_layout.active = true);
        var pos_index = 1;
        function setKnockHolds() {
          for (var i = 0; i < knock_holds.length; i++) {
            var holds_data = knock_holds[i]["card_info_bo"];
            var children_pos = this.peng_and_gang_layout.getChildByName(pos_index + "");
            if (!children_pos) {
              console.warn("".concat("pos_" + pos_index, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
              return;
            }
            for (var j = 0; j < 3; j++) {
              var element = children_pos.children[j];
              var card = element.getChildByName(this._card_type_node_name);
              if (!card) {
                console.warn("".concat(this._card_type_node_name, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
                return;
              }
              var card_sprite = card.getComponent("cc.Sprite");
              card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][holds_data["value"]]["icon_res"]));
              element.active = true;
            }
            children_pos.active = true;
            pos_index++;
          }
        }
        function setCollisionHolds() {
          for (var i = 0; i < collision_holds.length; i++) {
            var holds_data = collision_holds[i]["card_info_bo"];
            var children_pos = this.peng_and_gang_layout.getChildByName(pos_index + "");
            if (!children_pos) {
              console.warn("".concat("pos_" + pos_index, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
              return;
            }
            for (var j = 0; j < children_pos.children.length; j++) {
              var element = children_pos.children[j];
              var card = element.getChildByName(this._card_type_node_name);
              if (!card) {
                console.warn("".concat(this._card_type_node_name, "  \u4e0d\u5b58\u5728 \u672a\u627e\u5230"));
                return;
              }
              var card_sprite = card.getComponent("cc.Sprite");
              card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][holds_data["value"]]["icon_res"]));
              element.active = true;
            }
            children_pos.active = true;
            pos_index++;
          }
        }
        cc.myBaseMgr.DataMgr.isData_UnNull(knock_holds) && knock_holds.length > 0 && setKnockHolds.bind(this)();
        cc.myBaseMgr.DataMgr.isData_UnNull(collision_holds) && collision_holds.length > 0 && setCollisionHolds.bind(this)();
      },
      setHeadDepositNode: function setHeadDepositNode(is_trusteeship) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(is_trusteeship) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.deposit_node)) return;
        this.deposit_node.active = false;
        this.deposit_node.active = is_trusteeship;
      },
      setDepositOngoingNode: function setDepositOngoingNode(is_trusteeship) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(is_trusteeship) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.trusteeship_ongoing_node)) return;
        this.trusteeship_ongoing_node.active = false;
        this.trusteeship_ongoing_node.active = is_trusteeship;
      },
      setAwaitNode: function setAwaitNode() {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.await_node)) return;
        this.await_node.active = false;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (this.node._action_state == game_conf["action_state"]["mai_zui"]) {
          this.await_node.active = true;
          return;
        }
      },
      setMenu: function setMenu(action_state) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_hu_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_gang_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_peng_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_kouPai_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_buKouPai_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_guo_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.sendCard_menu_btn_ting_node)) return;
        this.sendCard_menu_btn_kouPai_node.active = false;
        this.sendCard_menu_btn_buKouPai_node.active = false;
        this.sendCard_menu_btn_hu_node.active = false;
        this.sendCard_menu_btn_ting_node.active = false;
        this.sendCard_menu_btn_gang_node.active = false;
        this.sendCard_menu_btn_peng_node.active = false;
        this.sendCard_menu_btn_guo_node.active = false;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (game_conf["ting_state"] && this.node._ting_state == game_conf["ting_state"]["wait_ting"]) {
          this.sendCard_menu_btn_ting_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["hide_card"]) {
          this.sendCard_menu_btn_kouPai_node.active = true;
          this.sendCard_menu_btn_buKouPai_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["hu_card"]) {
          this.sendCard_menu_btn_hu_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["self_hu"]) {
          this.sendCard_menu_btn_hu_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["collision_card"]) {
          this.sendCard_menu_btn_gang_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["knock_card"]) {
          this.sendCard_menu_btn_peng_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["knock_and_collsion"]) {
          this.sendCard_menu_btn_peng_node.active = true;
          this.sendCard_menu_btn_gang_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["knock_collsion_hu"]) {
          this.sendCard_menu_btn_hu_node.active = true;
          this.sendCard_menu_btn_peng_node.active = true;
          this.sendCard_menu_btn_gang_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["knock_and_hu"]) {
          this.sendCard_menu_btn_hu_node.active = true;
          this.sendCard_menu_btn_peng_node.active = true;
          this.sendCard_menu_btn_guo_node.active = true;
          return;
        }
        if (game_conf["action_state"] && action_state == game_conf["action_state"]["collision_and_hu"]) {
          this.sendCard_menu_btn_hu_node.active = true;
          this.sendCard_menu_btn_gang_node.active = true;
          return;
        }
      },
      setPlayAnimation: function setPlayAnimation(anim_state, hu_state, score) {
        var _this = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.animation)) return;
        this.animation.node.active = true;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (this.node._home_state == game_conf["game_scene"]["wait_over"]) return;
        var game_conf_anim_state = game_conf["anim_state"];
        if (!game_conf_anim_state) return;
        switch (anim_state) {
         case game_conf_anim_state["knock_card"]:
          this.animation.setAnimation(0, "mj_peng", false);
          cc.myBaseMgr.AudioMgr.playSFX("games/MaJiang/man/peng");
          break;

         case game_conf_anim_state["collision_card"]:
          this.animation.setAnimation(0, "mj_gang", false);
          cc.myBaseMgr.AudioMgr.playSFX("games/MaJiang/man/gang");
          break;

         case game_conf_anim_state["self_hu"]:
          this.animation.setAnimation(0, "mj_zimo", false);
          cc.myBaseMgr.AudioMgr.playSFX("games/MaJiang/man/hu_zimo");
          break;

         case game_conf_anim_state["ping_hu"]:
         case game_conf_anim_state["qing_yi_se"]:
         case game_conf_anim_state["yi_tiao_long"]:
         case game_conf_anim_state["yi_tiao_long_and_qing_yi_se"]:
          this.animation.setAnimation(0, "mj_hu", false);
          cc.myBaseMgr.AudioMgr.playSFX("games/MaJiang/man/hu");
          break;

         case game_conf_anim_state["ting_card"]:
          this.animation.setAnimation(0, "mj_ting", false);
          break;

         case 1001:
          this.animation_buhua.node.active = true;
          var track = this.animation_buhua.setAnimation(0, "animation", false);
          track && this.animation_buhua.setCompleteListener(function(trackEntry, loopCount) {
            var name = trackEntry.animation ? trackEntry.animation.name : "";
            "animation" === name && (_this.animation_buhua.node.active = false);
          });
        }
        hu_state == game_conf["hu_state"]["not_hu"]["id"] && 0 != score && this.animation.setAnimation(0, "mj_dianpao", false);
      },
      setHandCard: function setHandCard(seats_postion, card_data, hide_card_num, knock_holds, collision_prompt) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(seats_postion) || !cc.myBaseMgr.DataMgr.isData_UnNull(card_data) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.handCard_layout)) return;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        this.initHandCardLayout();
        if (this.node._home_state == game_conf["game_scene"]["single_over"] || this.node._home_state == game_conf["game_scene"]["game_over"] || this.node._home_state == game_conf["game_scene"]["wait_over"]) return;
        function myself_callback() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.mo_card_layout)) return;
          var is_send_card_state = false;
          card_data.holds.length > game_conf.max_card_len && (is_send_card_state = true);
          this._card_data_start_length > 0 && (this.handCard_layout.active = true);
          for (var i = 0; i < this._card_data_start_length; i++) {
            var obj = card_data.holds[i];
            if (!obj) {
              this._card_data_start_length = i + 1;
              break;
            }
            if (!obj["isShow"]) continue;
            var item = cc.instantiate(this.handCard_item_prefab);
            var mahjong_game_seat_myself_card_item = item.getComponent("Mahjong_game_seat_myself_card_item");
            mahjong_game_seat_myself_card_item.setAllinfo(obj["value"], obj["type"], obj["isTouch"], obj["isCard"], obj["isShow"]);
            if (is_send_card_state && i == card_data.holds.length - 1) {
              this.mo_card_layout.addChild(item);
              this.mo_card_layout.active = true;
            } else this.handCard_layout.addChild(item);
          }
        }
        function top_left_right_callback() {
          var is_send_card_state = false;
          var sum_card_num = 3 * knock_holds.length + 3 * collision_prompt.length + card_data;
          sum_card_num > game_conf.max_card_len && (is_send_card_state = true);
          var handCard_num = card_data - hide_card_num;
          handCard_num > 0 && (this.handCard_layout.active = true);
          var pos_index = 1;
          for (var i = 0; i < hide_card_num; i++) {
            this.handCard_layout.getChildByName(pos_index + "").active = true;
            this.handCard_layout.getChildByName(pos_index + "").getChildByName("hide_card").active = true;
            pos_index++;
          }
          for (var _i = 0; _i < handCard_num; _i++) {
            if (is_send_card_state && _i == handCard_num - 1) {
              this.handCard_layout.getChildByName(pos_index + 1 + "").active = true;
              this.handCard_layout.getChildByName(pos_index + 1 + "").getChildByName("card").active = true;
            } else {
              this.handCard_layout.getChildByName(pos_index + "").active = true;
              this.handCard_layout.getChildByName(pos_index + "").getChildByName("card").active = true;
            }
            pos_index++;
          }
        }
        switch (seats_postion) {
         case "myself":
          myself_callback.bind(this)();
          break;

         case "left":
         case "right":
         case "top":
          top_left_right_callback.bind(this)();
        }
      },
      setHuTypeLabelNodes: function setHuTypeLabelNodes(hu_state, is_shot) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.hu_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.pingHu_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.qingYiSe_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.dianPao_icon_label_node) || !cc.myBaseMgr.DataMgr.isData_UnNull(this.yiTiaoLong_icon_label_node)) return;
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (this.node._home_state != game_conf["game_scene"]["single_over"] && this.node._home_state != game_conf["game_scene"]["game_over"] && this.node._home_state != game_conf["game_scene"]["wait_over"]) return;
        is_shot && (this.dianPao_icon_label_node.active = true);
        switch (hu_state) {
         case game_conf["hu_state"]["not_hu"]["id"]:
          this.initHuTypeLabelNodes();
          break;

         case game_conf["hu_state"]["ping_hu"]["id"]:
          this.pingHu_icon_label_node.active = true;
          break;

         case game_conf["hu_state"]["qing_yi_se"]["id"]:
          this.qingYiSe_icon_label_node.active = true;
          break;

         case game_conf["hu_state"]["yi_tiao_long"]["id"]:
          this.yiTiaoLong_icon_label_node.active = true;
          break;

         case game_conf["hu_state"]["yi_tiao_long_and_qing_yi_se"]["id"]:
          this.qingYiSe_icon_label_node.active = true;
          this.yiTiaoLong_icon_label_node.active = true;
          break;

         case game_conf["hu_state"]["bian_or_kan"]["id"]:
          this.hu_icon_label_node.active = true;
        }
      },
      onClickEvents: function onClickEvents() {}
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_seat_myself_card_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "ee3cfTCfW1NLIAgTh2BB6AC", "Mahjong_game_seat_myself_card_item");
    "use strict";
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        spr_item_card: {
          default: null,
          type: cc.Sprite,
          displayName: "spr_item_card",
          tooltip: "\u724c\u7684\u7c7b\u578b\u56fe\u7247"
        },
        node_mask: {
          default: null,
          type: cc.Node,
          displayName: "mask",
          tooltip: "mask"
        },
        card: {
          default: null,
          type: cc.Node,
          displayName: "card",
          tooltip: "card"
        },
        hide_card: {
          default: null,
          type: cc.Node,
          displayName: "hide_card",
          tooltip: "hide_card"
        },
        _value: 0,
        _card_type: null,
        _isTouch: null,
        _isCard: null,
        _isShow: null,
        _btn_count: 0
      },
      onLoad: function onLoad() {
        this.initEvents();
      },
      onDisable: function onDisable() {
        cc.game_frame_EventMgr.off(this);
      },
      initEvents: function initEvents() {
        cc.game_frame_EventMgr.def("maJiang_seat_myself_card_item_onSetNodeStateCall", this.onSetNodeStateCall, this);
      },
      onSetNodeStateCall: function onSetNodeStateCall(state_key, node) {
        if (this.node == node) return;
        this.setNodeState(state_key);
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "spr_select_card":
          if (!this._isTouch) return;
          console.log("\u9009\u4e2d\u724c" + this.value);
          cc.game_frame_EventMgr.pushEventImm("maJiang_seat_myself_card_item_onSetNodeStateCall", "default", this.node);
          this._btn_count++;
          1 == this._btn_count && this.setNodeState("selected");
          if (this._btn_count >= 2) {
            this._game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
            this._game_send_event = wsMsgKeyEnum[this._game_conf.gameTypeKey]["send"];
            console.log("\u51fa\u724c\uff0c\u724c\u503c\u4e3a\uff1a" + this.value);
            var res_data = {
              value: this._value,
              type: this._card_type,
              isTouch: this._isTouch,
              isCard: this._isCard,
              isShow: this._isShow
            };
            cc.myBaseMgr.DAO.GameDao.present_gameWSDao.send(this._game_send_event["send_card"], res_data);
          }
        }
      },
      setAllinfo: function setAllinfo(card_value, type, isTouch, isCard, isShow) {
        this._value = card_value;
        this._card_type = type;
        this._isTouch = isTouch;
        this._isCard = isCard;
        this._isShow = isShow;
        this.card.active = false;
        this.hide_card.active = false;
        this.card.active = !isCard;
        this.hide_card.active = isCard;
        isCard || this.setSprItemCard(card_value);
        this.setMask(isTouch);
      },
      setNodeState: function setNodeState(state_key) {
        switch (state_key) {
         case "default":
          this._btn_count = 0;
          this.node.y = 0;
          break;

         case "selected":
          this.node.y += 30;
        }
      },
      setSprItemCard: function setSprItemCard(card_value) {
        var _game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.spr_item_card) || !cc.myBaseMgr.DataMgr.isData_UnNull(card_value) || !cc.myBaseMgr.DataMgr.isData_UnNull(cc.myBaseMgr.ResourcesConfig.mj_hua_atlas) || !cc.myBaseMgr.DataMgr.isData_UnNull(_game_conf)) return;
        this.spr_item_card.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(_game_conf["card_conf"][card_value]["icon_res"]));
      },
      setMask: function setMask(isTouch) {
        this.node_mask.active = !isTouch;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_shangHaiQiaoMa_over_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "e1593aI8dhBuqA8Hdfg+OLv", "Mahjong_game_shangHaiQiaoMa_over_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        bankerNode: {
          default: null,
          type: cc.Node,
          displayName: "\u5e84\u5bb6\u8282\u70b9",
          tooltip: "\u5e84\u5bb6\u8282\u70b9"
        },
        homeownersNode: {
          default: null,
          type: cc.Node,
          displayName: "\u623f\u4e3b\u8282\u70b9",
          tooltip: "\u623f\u4e3b\u8282\u70b9"
        },
        score_label: {
          default: null,
          type: cc.Label,
          displayName: "score_label",
          tooltip: "\u5206\u6570\u6587\u672c"
        },
        handCard_layout: {
          type: cc.Node,
          default: null
        }
      },
      onload: function onload() {},
      setAllInfo: function setAllInfo(headImgUrl, nickName, bankerNodeisActive, homeownersNodeisActive, score, handCardData) {
        this.setHeadImg(headImgUrl);
        this.setNickName(nickName);
        this.setBankerNode(bankerNodeisActive);
        this.setHomeownersNode(homeownersNodeisActive);
        this.setScoreLabel(score);
        this.setHandCard(handCardData);
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        this.updateSpriteFrame(headImgUrl, self.headImgUrl);
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        var form_nickName = "";
        if (nickName.length > 10) {
          for (var i = 0; i < 10; i++) {
            var element = nickName[i];
            form_nickName += element;
          }
          this.nickName.string = form_nickName + "....";
        } else {
          form_nickName = nickName;
          this.nickName.string = form_nickName;
        }
      },
      setBankerNode: function setBankerNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.bankerNode.active = isActive;
      },
      setHomeownersNode: function setHomeownersNode(isActive) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.bankerNode) || !cc.myBaseMgr.DataMgr.isData_UnNull(isActive)) return;
        this.homeownersNode.active = false;
      },
      setScoreLabel: function setScoreLabel(score_label) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.score_label) || !cc.myBaseMgr.DataMgr.isData_UnNull(score_label)) return;
        this.score_label.string = (score_label < 0, score_label);
      },
      setHandCard: function setHandCard(handCardData) {
        for (var index = 0; index < this.handCard_layout.children.length; index++) {
          var handCard_node = this.handCard_layout.children[index];
          handCard_node.active = false;
          handCard_node.getChildByName("card_type_node").getChildByName("mask").active = false;
        }
        var game_conf = cc.myBaseMgr["play_game_conf"][cc.myBaseMgr.DAO.GameDao.present_gameKey];
        for (var _index = 0; _index < handCardData.length; _index++) {
          var element = handCardData[_index];
          var handCard_node = this.handCard_layout.children[_index];
          var card = handCard_node.getChildByName("card_type_node");
          var card_sprite = card.getComponent("cc.Sprite");
          card_sprite.spriteFrame = cc.myBaseMgr.ResourcesConfig.mj_hua_atlas.getSpriteFrame("".concat(game_conf["card_conf"][element["value"]]["icon_res"]));
          handCard_node.active = true;
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Mahjong_game_shangHaiQiaoMa_over_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "e1447nqINlLVY09O1oDn9Rm", "Mahjong_game_shangHaiQiaoMa_over_layer");
    "use strict";
    var UIManager = require("UIManager");
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    cc.Class({
      extends: UIManager,
      properties: {
        content: {
          type: cc.Node,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        }
      },
      onLoad: function onLoad() {},
      start: function start() {},
      setInitAll: function setInitAll(game_over_seats_data) {
        "undefined" != typeof window && window.__mahjongSettleFromSeats && window.__mahjongSettleFromSeats(game_over_seats_data, "shanghai_qiaoma_over");
        this.addItemToList(game_over_seats_data);
      },
      addItemToList: function addItemToList(seats_datas) {
        var self = this;
        this.content.destroyAllChildren();
        for (var i = 0; i < seats_datas.length; i++) {
          var seats_data = seats_datas[i];
          var item = cc.instantiate(self.item_prefab);
          var mahjong_game_shangHaiQiaoMa_over_item = item.getComponent("Mahjong_game_shangHaiQiaoMa_over_item");
          var homeownersNodeisActive = false;
          seats_data.user_id == cc.myBaseMgr.DAO.UserDao.uid && (homeownersNodeisActive = true);
          var is_boss = 1 == seats_data.identity;
          var displayScore = cc.myBaseMgr.DataMgr.isData_UnNull(seats_data.total_score) ? seats_data.total_score : seats_data.score;
          mahjong_game_shangHaiQiaoMa_over_item.setAllInfo(seats_data.user_icon, seats_data.user_name, is_boss, homeownersNodeisActive, displayScore, seats_data.hand_holds);
          self.content.addChild(item);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mahjong_game_shangHaiQiaoMa_service: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "02f7aRAxwJN86y2iiEBZ7KJ", "Mahjong_game_shangHaiQiaoMa_service");
    "use strict";
    function _defineProperty(obj, key, value) {
      key in obj ? Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      }) : obj[key] = value;
      return obj;
    }
    var wsMsgKeyEnum = require("WSMsgKeyEnum");
    var MahjongBaseService = require("MahjongBaseService");
    cc.Class(_defineProperty({
      extends: MahjongBaseService,
      properties: {},
      ctor: function ctor() {
        cc.log("Mahjong_game_shangHaiQiaoMa_service ctor");
      },
      onLoad: function onLoad() {
        cc.log("onLoad");
        this._super();
        this._preloadGameResources();
      },
      _preloadGameResources: function _preloadGameResources() {
        var preloadList = [ "prefab/layer/games/mahjong/shangHaiQiaoMa/mahjong_game_shangHaiQiaoMa_over_layer", "prefab/item/games/mahjong/shangHaiQiaoMa/mahjong_game_shangHaiQiaoMa_over_item", "prefab/layer/msg_layer", "prefab/layer/select_box_layer" ];
        this.scheduleOnce(function() {
          for (var i = 0; i < preloadList.length; i++) cc.loader.loadRes(preloadList[i], function(err) {
            err;
          });
        }, .3);
      },
      start: function start() {
        this._super();
      },
      onDisable: function onDisable() {
        this._super();
      },
      onMatching_win_all: function onMatching_win_all(code, msg, data) {
        console.log(this._matching_service_event["onMatching_win_all"]);
        this.unschedule(this.schedule_startMatching_callback);
        this.matching_layer.active = false;
      },
      onUpdate_room_info_all: function onUpdate_room_info_all(code, msg, data) {
        this._home_state = data["home_state"];
        this._home_data = data;
        function repare() {
          this.game_layer.active = false;
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_info.active = true;
          this.room_layer.active = true;
          this.updateRoomSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function setRoomInfo() {
          this.setRoomID(data.roomid);
          this.setInning(data.cruent_inning, data.max_inning);
          this.setPeopleNum(data.seats.length, data.max_people_num);
          this.setDangJuDiFen(data.cruent_inning_end_points);
          for (var i = 0; i < data.seats.length; i++) {
            var seat = data.seats[i];
            if (seat.user_id == cc.myBaseMgr.DAO.UserDao.userAccountId + "") {
              this.setTotalScore(seat.total_score);
              break;
            }
          }
        }
        function game_start() {
          var _this = this;
          this.matching_layer.active = false;
          this.over_node.active = false;
          this.room_layer.active = false;
          this.game_layer.active = true;
          this.room_info.active = true;
          if (!this._isshow_matchSuccessful_layer) {
            this._isshow_matchSuccessful_layer = true;
            this.matchSuccessful_layer.active = true;
            this.matchSuccessful_animation.node.active = true;
            this.matchSuccessful_animation.setAnimation(0, "animation", false);
            this.matchSuccessful_animation.setCompleteListener(function() {
              _this.matchSuccessful_layer.active = false;
              _this.game_layer.active = true;
              _this.matchSuccessful_animation.node.active = false;
              _this.game_start_animation.node.active = true;
              _this.game_start_animation.setAnimation(0, "animation", false);
              _this.game_start_animation.setCompleteListener(function() {
                _this.game_start_animation.node.active = false;
              });
            });
          }
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"], true);
        }
        function room_playing_call() {
          this.game_layer.active = true;
          this.room_info.active = true;
          this.remove_Layer("mahjong_game_maiZui_select_layer");
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
        }
        function gameOver() {
          console.warn("gameOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          this.gameOverCall(data);
          this.creater_Layer("mahjong_game_shangHaiQiaoMa_over_layer", this._game_over_seats_data);
        }
        function waitOver() {
          console.warn("waitOver");
          this.game_layer.active = true;
          this.room_info.active = true;
          this.updateGameSeatsData(data.seats, data.last_index, data["home_state"]);
          this.gameOverCall(data);
        }
        var room_state = data["home_state"];
        this.setCardTotalNumLabel(data["home_cards_num"]);
        setRoomInfo.bind(this)();
        switch (room_state) {
         case this._game_conf.game_scene.repare:
          repare.bind(this)();
          break;

         case this._game_conf.game_scene.game_start:
          game_start.bind(this)();
          break;

         case this._game_conf.game_scene.game_move:
          room_playing_call.bind(this)();
          break;

         case this._game_conf.game_scene.game_over:
         case this._game_conf.game_scene.single_over:
          gameOver.bind(this)();
          break;

         case this._game_conf.game_scene.wait_over:
          waitOver.bind(this)();
        }
      }
    }, "onDisable", function onDisable() {
      this._super();
    }));
    cc._RF.pop();
  }, {
    MahjongBaseService: "MahjongBaseService",
    WSMsgKeyEnum: "WSMsgKeyEnum"
  } ],
  Mail_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "83fa6lOWGJJ/pA4+x8Lit79", "Mail_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        item_prefab: {
          type: cc.Prefab,
          default: null
        },
        _limit: 10,
        _page: 1
      },
      onLoad: function onLoad() {
        this._content = this.scroll_view.content;
        this.scroll_view.node.on("scroll-to-bottom", function(event) {
          this._page++;
        }.bind(this));
      },
      start: function start() {},
      addItemToList: function addItemToList() {
        var self = this;
        var res_data = {
          limit: this._limit,
          page: this._page
        };
        cc.game_Config.DAO.UserDao.onGetEmailList(res_data, function(code, msg, data) {
          switch (code) {
           case cc.game_Config.CODE.success:
            if (!data.list || data.list.length < 1) {
              this._page = data.pages;
              return;
            }
            for (var i = 0; i < data.list.length; i++) {
              var obj = data.list[i];
              var item = cc.instantiate(self.item_prefab);
              var mail_Item = item.getComponent("mail_Item");
              mail_Item.setAllinfo(obj["title"], obj["content"], obj["isread"]);
              self._content.addChild(item);
            }
            break;

           case cc.game_Config.CODE.clientError:
          }
        }.bind(this));
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Msg_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "be31aFJYMNNabmB4tMogdTp", "Msg_layer");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        text: cc.Label
      },
      setInitAll: function setInitAll(text) {
        var self = this;
        self.text.string = text;
        var spawn = cc.moveBy(1.5, 0, 200);
        self.node.runAction(cc.sequence(spawn, cc.callFunc(function() {
          self.node.destroy();
        })));
      }
    });
    cc._RF.pop();
  }, {} ],
  PolySDK: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "c87d957FPZD+L4NN0Gy8U2a", "PolySDK");
    "use strict";
    var poly_sdk_config = {
      sdk_key_tt: "tt",
      sdk_key_qq: "qq",
      sdk_key_vivo: "vivo",
      sdk_key_xiaomi: "xiaomi",
      sdk_key_baidu: "baidu",
      sdk_key_oppo: "oppo",
      sdk_key_weixin: "weixin",
      sdk_key_jikewan: "jikewan",
      sdk_key_qtt: "qtt",
      sdk_key_4399: "4399",
      sdk_key_ios: "ios",
      sdk_key_android: "android",
      sdk_key_wangmai: "wangmai",
      sdk_key_juzhang: "juzhang",
      sdk_key_h5: "h5",
      sdk_key_360: "sdk360",
      sdk_key_yungao: "yungao",
      sdk_key_android_vivo: "android_vivo",
      sdk_key_android_oppo: "android_oppo",
      sdk_key_android_360: "android_360",
      sdk_key_android_yyb: "android_yyb",
      sdk_key_android_tap: "android_tap",
      sdk_key_android_jiuyou: "android_jiuyou",
      sdk_key_android_huawei: "android_huawei",
      sdk_key_haoYouKuaiBao: "haoYouKuaiBao",
      sdk_key_yunYouXi: "yunYouXi",
      sdk_key_android_4399: "android_4399",
      sdk_key_android_haixin: "android_haixin",
      sdk_key_android_Lenovo: "android_Lenovo",
      sdk_key_baoqu: "baoqu",
      sdk_key_wifikey: "wifikey",
      sdk_key_wwz: "wwz",
      sdk_key_ks: "ks",
      sdk_key_CSJ: "CSJ",
      sdk_key_GDT: "GDT",
      runSDK: "android",
      game_id: 350,
      appid: "5100634",
      shareTitle: "\u6d4b\u8bd5\u5206\u4eab\u6807\u9898",
      shareDescription: "\u6d4b\u8bd5\u5206\u4eab\u5185\u5bb9",
      shareUrl: "https://www.baidu.com",
      shareImgUrl: "",
      share_wxScene_session: "2",
      share_wxScene_Timeline: "3",
      userLoginUrl: "https://xcx.api.chenxinghuyu.com/game/login",
      failLoginUrl: "https://xcx.api.chenxinghuyu.com/game/faillogin",
      videopushUrl: "https://xcx.api.chenxinghuyu.com/game/videopush",
      bannerpushUrl: "https://xcx.api.chenxinghuyu.com/game/bannerpush",
      screenimgUrl: "https://xcx.api.chenxinghuyu.com/game/screenimg",
      gameOnOffConfig: "https://xcx.api.chenxinghuyu.com/game/onoffconfig",
      userLoginData: {
        session_key: null,
        open_id: null,
        display_id: null
      },
      default_video_id: "000000",
      default_banner_id: "000000",
      HTTPtoken: "fdsfwe45teadfet8adf3TdgD8",
      ui_Type: {
        recorderUI: "0",
        shareUI: "1",
        videoUI: "2"
      },
      ui_Node_state: {
        record_onoff: false,
        share_onoff: false,
        video_onoff: false
      },
      failCode: {
        netErr: 7400,
        userRefusedTo: 7401,
        unknown: 7402
      },
      localStorageUserkeys: [ "display_id", "avatarUrl", "nickName", "gender", "age", "city", "province", "country", "language", "unionid", "id", "openid", "location", "constellation", "phoneNum" ],
      tt: {
        banner_id: "kain30mokfc74em8r1",
        video_id: [ "10aaq361m3912dh5df" ],
        interstitialAd_id: "",
        type: 10
      },
      weixin: {
        banner_id: "",
        video_id: [],
        type: 0
      },
      qq: {
        banner_id: "",
        video_id: [ "" ],
        interstitialAd_id: "",
        type: 13
      },
      xiaomi: {
        banner_id: "",
        video_id: [ "" ],
        interstitialAd_id: "",
        type: 12
      },
      baidu: {
        banner_id: "",
        video_id: [ "" ],
        appSid: "baidu_appSid",
        type: 7
      },
      vivo: {
        banner_id: "",
        video_id: [ "" ],
        native_id: [],
        type: 5
      },
      oppo: {
        banner_id: "",
        video_id: [ "" ],
        AppID: "",
        type: 6
      },
      jikewan: {
        banner_id: "$jikewan_banner_id",
        banner_adId: "$jikewan_adId",
        screenOrientation: "$jikewan_screenOrientation",
        video_adId: [ "" ],
        video_id: [ "" ],
        type: 9
      },
      ios: {
        banner_id: "938448200",
        video_id: [ "938448310", "938448470", "938448494" ],
        interface_path: "JuHeMobileSDK",
        type: 16
      },
      android: {
        banner_id: "945154244",
        video_id: [ "945154246" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "android",
        type: 15
      },
      wangmai: {
        type: 17
      },
      juzhang: {
        clientId: "$juzhang_clientId",
        clientSecret: "$juzhang_clientSecret",
        adType: {
          banner_Ad: "1",
          openS_Ad: "2",
          vertical_Ad: "3",
          horizontal_Ad: "4",
          allS_vertical_Ad: "5",
          allS_horizontal_Ad: "6",
          insert_Ad: "7"
        },
        type: 18
      },
      sdk360: {
        banner_id: "$sdk360_banner_id",
        adIntervals: 30,
        video_id: [ "sdk360_id1", "sdk360_id2", "sdk360_id3" ],
        type: 14
      },
      yungao: {
        banner_id: "",
        video_id: [ "" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u4e91\u544a",
        type: 19
      },
      android_vivo: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_vivo",
        type: 20
      },
      android_oppo: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_oppo",
        type: 21
      },
      android_360: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_360",
        type: 22
      },
      android_yyb: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_\u5e94\u7528\u5b9d",
        type: 23
      },
      android_tap: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_TapTap",
        type: 24
      },
      baoqu: {
        baoqv_pageId: "80",
        baoqv_gameId: "6600",
        gameName: "\u603c\u603c\u6d88\u6d88\u4e50",
        is_baoqu_debug: true,
        type: 25
      },
      wifikey: {
        type: 26
      },
      android_jiuyou: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_\u4e5d\u6e38",
        type: 30
      },
      android_huawei: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_\u534e\u4e3a",
        type: 31
      },
      haoYouKuaiBao: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u597d\u6e38\u5feb\u7206",
        type: 32
      },
      yunYouXi: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u4e91\u6e38\u620f",
        type: 29
      },
      android_4399: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_4399",
        type: 33
      },
      android_haixin: {
        banner_id: "945186350",
        video_id: [ "945187168" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_\u6d77\u4fe1",
        type: 34
      },
      android_Lenovo: {
        banner_id: "945157416",
        video_id: [ "945157417" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "C29C025CD6284C4896ADDE99925CDA9D",
        TDtypeID: "\u5b89\u5353_\u8054\u60f3",
        type: 35
      },
      wwz: {
        type: 27
      },
      ks: {
        adType: {
          video_Ad: "1",
          insert_Ad: "2"
        },
        type: 38
      },
      CSJ: {
        banner_id: "945431392",
        video_id: [ "945431397" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "97A31F1CF17A40109D2E29FD0101C37E",
        TDtypeID: "\u7a7f\u5c71\u7532\u5e7f\u544a",
        type: 41
      },
      GDT: {
        banner_id: "945186350",
        video_id: [ "945187168" ],
        interface_path: "com/xm/demo/H5Interface",
        TDApppID: "",
        TDtypeID: "\u5e7f\u70b9\u901a\u5e7f\u544a",
        type: 40
      }
    };
    var Tools = function() {
      var instance;
      var Tools = function Tools() {
        if (instance) return instance;
        this.sendRequest = function(path, data, handler) {
          if ("undefined" == typeof cc) throw new Error("cc is undefined \u8bf7\u68c0\u67e5\u5f53\u524d\u8fd0\u884c\u73af\u5883 \u662f\u5426\u662f CocosCreator");
          var xhr = cc.loader.getXMLHttpRequest();
          xhr.timeout = 5e3;
          var str = "?";
          for (var k in data) {
            "?" != str && (str += "&");
            str += k + "=" + data[k];
          }
          var requestURL = path + encodeURI(str);
          console.log("RequestURL:" + requestURL);
          xhr.open("GET", requestURL, true);
          cc.sys.isNative && xhr.setRequestHeader("Access-Control-Allow-Origin", "Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
          xhr.onreadystatechange = function() {
            if (4 === xhr.readyState && xhr.status >= 200 && xhr.status < 300) {
              console.log("http res(" + xhr.responseText.length + "):" + xhr.responseText);
              try {
                var ret = JSON.parse(xhr.responseText);
                handler && handler(ret);
              } catch (e) {
                console.log("onreadystatechange 1 err = " + e);
                handler && handler(null);
                throw new Error(e);
              }
            }
          };
          xhr.onerror = function(e) {
            handler && handler(null);
          };
          xhr.send();
          return xhr;
        };
        this.crypto = function() {
          var hexcase = 0;
          var b64pad = "";
          var chrsz = 8;
          function hex_md5(s) {
            return binl2hex(core_md5(str2binl(s), s.length * chrsz));
          }
          function b64_md5(s) {
            return binl2b64(core_md5(str2binl(s), s.length * chrsz));
          }
          function str_md5(s) {
            return binl2str(core_md5(str2binl(s), s.length * chrsz));
          }
          function hex_hmac_md5(key, data) {
            return binl2hex(core_hmac_md5(key, data));
          }
          function b64_hmac_md5(key, data) {
            return binl2b64(core_hmac_md5(key, data));
          }
          function str_hmac_md5(key, data) {
            return binl2str(core_hmac_md5(key, data));
          }
          function md5_vm_test() {
            return "900150983cd24fb0d6963f7d28e17f72" == hex_md5("abc");
          }
          function core_md5(x, len) {
            x[len >> 5] |= 128 << len % 32;
            x[14 + (len + 64 >>> 9 << 4)] = len;
            var a = 1732584193;
            var b = -271733879;
            var c = -1732584194;
            var d = 271733878;
            for (var i = 0; i < x.length; i += 16) {
              var olda = a;
              var oldb = b;
              var oldc = c;
              var oldd = d;
              a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
              d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
              c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
              b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
              a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
              d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
              c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
              b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
              a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
              d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
              c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
              b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
              a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
              d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
              c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
              b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
              a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
              d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
              c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
              b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
              a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
              d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
              c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
              b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
              a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
              d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
              c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
              b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
              a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
              d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
              c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
              b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
              a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
              d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
              c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
              b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
              a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
              d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
              c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
              b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
              a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
              d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
              c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
              b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
              a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
              d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
              c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
              b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
              a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
              d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
              c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
              b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
              a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
              d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
              c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
              b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
              a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
              d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
              c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
              b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
              a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
              d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
              c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
              b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
              a = safe_add(a, olda);
              b = safe_add(b, oldb);
              c = safe_add(c, oldc);
              d = safe_add(d, oldd);
            }
            return Array(a, b, c, d);
          }
          function md5_cmn(q, a, b, x, s, t) {
            return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
          }
          function md5_ff(a, b, c, d, x, s, t) {
            return md5_cmn(b & c | ~b & d, a, b, x, s, t);
          }
          function md5_gg(a, b, c, d, x, s, t) {
            return md5_cmn(b & d | c & ~d, a, b, x, s, t);
          }
          function md5_hh(a, b, c, d, x, s, t) {
            return md5_cmn(b ^ c ^ d, a, b, x, s, t);
          }
          function md5_ii(a, b, c, d, x, s, t) {
            return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
          }
          function core_hmac_md5(key, data) {
            var bkey = str2binl(key);
            bkey.length > 16 && (bkey = core_md5(bkey, key.length * chrsz));
            var ipad = Array(16), opad = Array(16);
            for (var i = 0; i < 16; i++) {
              ipad[i] = 909522486 ^ bkey[i];
              opad[i] = 1549556828 ^ bkey[i];
            }
            var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
            return core_md5(opad.concat(hash), 640);
          }
          function safe_add(x, y) {
            var lsw = (65535 & x) + (65535 & y);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return msw << 16 | 65535 & lsw;
          }
          function bit_rol(num, cnt) {
            return num << cnt | num >>> 32 - cnt;
          }
          function str2binl(str) {
            var bin = Array();
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < str.length * chrsz; i += chrsz) bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << i % 32;
            return bin;
          }
          function binl2str(bin) {
            var str = "";
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < 32 * bin.length; i += chrsz) str += String.fromCharCode(bin[i >> 5] >>> i % 32 & mask);
            return str;
          }
          function binl2hex(binarray) {
            var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
            var str = "";
            for (var i = 0; i < 4 * binarray.length; i++) str += hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 + 4 & 15) + hex_tab.charAt(binarray[i >> 2] >> i % 4 * 8 & 15);
            return str;
          }
          function binl2b64(binarray) {
            var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var str = "";
            for (var i = 0; i < 4 * binarray.length; i += 3) {
              var triplet = (binarray[i >> 2] >> i % 4 * 8 & 255) << 16 | (binarray[i + 1 >> 2] >> (i + 1) % 4 * 8 & 255) << 8 | binarray[i + 2 >> 2] >> (i + 2) % 4 * 8 & 255;
              for (var j = 0; j < 4; j++) 8 * i + 6 * j > 32 * binarray.length ? str += b64pad : str += tab.charAt(triplet >> 6 * (3 - j) & 63);
            }
            return str;
          }
          return {
            hex_md5: hex_md5,
            b64_md5: b64_md5,
            str_md5: str_md5,
            hex_hmac_md5: hex_hmac_md5,
            b64_hmac_md5: b64_hmac_md5,
            str_hmac_md5: str_hmac_md5
          };
        };
      };
      return Tools;
    }();
    var tools = new Tools();
    var LoginAuth = function() {
      var instance;
      var LoginAuth = function LoginAuth() {
        if (instance) return instance;
        this._vivo_islogin = false;
        this._xiaomi_islogin = false;
        this._baidu_islogin = false;
        this._oppo_islogin = false;
        this._tt_islogin = false;
        this._qq_islogin = false;
        this._weixin_islogin = false;
        this._default_islogin = false;
        this._wangmai_islogin = false;
        this._baoqu_islogin = false;
        this._360_islogin = false;
        this._ks_islogin = false;
        this.login = function(args, callback) {
          console.log("LoginAuth start runSDK = " + poly_sdk_config.runSDK + "  args =" + args);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            this.qq_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.tt_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            this.vivo_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            this.xiaomi_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            this.baidu_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            this.oppo_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("weixin wx is undefined");
              return;
            }
            this.weixin_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_wangmai:
            if ("undefined" == typeof WMAds) {
              console.log("\u65fa\u8109 WMAds is undefined");
              return;
            }
            this.wangmai_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
           case poly_sdk_config.sdk_key_CSJ:
           case poly_sdk_config.sdk_key_GDT:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.android_wx_Login(callback);
            break;

           case poly_sdk_config.sdk_key_juzhang:
            this.juzhang_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_360:
            if ("undefined" == typeof qh) {
              console.log("360 qh is undefined");
              return;
            }
            this.sdk360_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_wifikey:
            if ("undefined" == typeof wifikey) {
              console.log("\u4e07\u80fd\u94a5\u5319 is undefined");
              return;
            }
            this.wifikey_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_baoqu:
            "undefined" == typeof CPSDK && console.log("\u8c79\u8da3 CPSDK is undefined");
            this.sdkbaoqu_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_wwz:
            this.wwz_login(args, callback);
            break;

           case poly_sdk_config.sdk_key_ks:
            this.ks_login(args, callback);
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By LoginAuth");
          }
        };
        this.tt_login = function(args, callback) {
          var self = this;
          if (self._tt_islogin) return;
          function checkSession(clicked) {
            if ("undefined" == typeof tt) return;
            tt.checkSession({
              success: function success(res) {
                init();
                login(false, function() {
                  getUserInfo(function() {
                    self.sendLoginMiNiFramework();
                  });
                });
                clicked && clicked(true);
              },
              fail: function fail() {
                console.log("\u8c03\u7528\u767b\u5f55\u548c\u6388\u6743");
                login(false, function() {
                  getUserInfo(function() {
                    self.sendLoginMiNiFramework();
                  });
                });
                clicked && clicked(false);
              }
            });
          }
          function login(force, clicked) {
            if ("undefined" == typeof tt) return;
            self._tt_islogin = true;
            tt.login({
              force: force,
              success: function success(res) {
                console.log("touTiao \u540e\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + res.code);
                res.code, console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(res));
                self.getUserDisplayId(res.code, null, function(iswin) {
                  iswin && clicked && clicked(true);
                });
              },
              fail: function fail(res) {
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                self.sendLoginfailMsg(res);
                clicked && clicked(false);
              }
            });
          }
          function init() {
            if ("undefined" == typeof tt) return;
            tt.showShareMenu({
              withShareTicket: true
            });
            self.launchOption = tt.getLaunchOptionsSync();
            tt.onShow(function(dt) {
              console.log("\u56de\u5230\u524d\u53f0onShow");
              console.log(dt);
              if (1044 == self.launchOption.scene) console.log(" \u6253\u5f00\u7fa4\u6392\u884c"); else if (1044 == dt.scene) ; else if (1007 == self.launchOption.scene) {
                console.log(" \u5206\u4eab\u597d\u53cb\u5f00\u542f");
                console.log("\u5206\u4eab\u597d\u53cb\u5f00\u542f" + self.launchOption.query);
              } else if (1007 == dt.scene) {
                console.log(" \u5206\u4eab\u597d\u53cb\u5f00\u542f");
                console.log("\u5206\u4eab\u597d\u53cb\u5f00\u542f" + dt.query);
              }
            });
          }
          function getUserInfo(clicked) {
            tt.getSetting({
              success: function success(res) {
                console.log("scope.userInfo = " + res.authSetting["scope.userInfo"]);
                res.authSetting["scope.userInfo"] ? clicked && clicked(false) : tt.getUserInfo({
                  success: function success(res) {
                    console.log("getUserInfo success data = ", JSON.stringify(res));
                    self.setlocalUserInfo({
                      avatarUrl: res.userInfo.avatarUrl,
                      nickName: res.userInfo.nickName,
                      gender: res.userInfo.gender,
                      city: res.userInfo.city,
                      province: res.userInfo.province,
                      country: res.userInfo.country,
                      language: res.userInfo.language
                    });
                    clicked && clicked(true);
                  },
                  fail: function fail(res) {
                    console.log("getUserInfo\u8c03\u7528\u5931\u8d25 = " + JSON.stringify(res));
                    clicked && clicked(false);
                  }
                });
              },
              fail: function fail() {
                console.log("getSetting   fail");
                clicked && clicked(false);
              }
            });
          }
          checkSession(function(isLogin) {
            callback && callback(isLogin);
          });
        };
        this.qq_login = function(args, callback) {
          var self = this;
          if (self._qq_islogin) return;
          function login(clicked) {
            self._qq_islogin = true;
            qq.login({
              success: function success(res) {
                if (res.code) {
                  console.log("qq \u540e\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + res.code);
                  self.getUserDisplayId(res.code);
                  getUserInfo(function() {
                    clicked && clicked(true);
                  });
                } else {
                  console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                  self.sendLoginfailMsg(res);
                  clicked && clicked(false);
                }
              }
            });
          }
          function checkSession(clicked) {
            qq.checkSession({
              success: function success() {
                console.log("\u68c0\u67e5\u767b\u9646\u6210\u529f checkSession   success");
                clicked && clicked(true);
              },
              fail: function fail() {
                console.log("\u68c0\u67e5\u767b\u9646\u5931\u8d25 checkSession   fail");
                clicked && clicked(false);
              }
            });
          }
          function getUserInfo(clicked) {
            qq.getUserInfo({
              success: function success(res) {
                var userInfo = res.userInfo;
                console.log("getUserInfo success data = ", JSON.stringify(userInfo));
                self.setlocalUserInfo({
                  avatarUrl: res.userInfo.avatarUrl,
                  nickName: res.userInfo.nickName,
                  gender: res.userInfo.gender,
                  city: res.userInfo.city,
                  province: res.userInfo.province,
                  country: res.userInfo.country,
                  language: res.userInfo.language
                });
                clicked && clicked();
              },
              fail: function fail(res) {
                reject(res);
                console.log("\u83b7\u53d6\u7528\u6237\u4fe1\u606f\u5931\u8d25\uff01err = " + JSON.stringify(err));
              }
            });
          }
          function createUserInfoButton() {
            var btnNode = {
              width: cc.view.getVisibleSize().width,
              height: cc.view.getVisibleSize().height
            };
            self.systemInfo = qq.getSystemInfoSync();
            var btnSize = cc.size(btnNode.width + .1, btnNode.height + .1);
            var frameSize = cc.view.getFrameSize();
            var winSize = cc.director.getWinSize();
            var left = 0;
            var top = 0;
            var width = btnSize.width / winSize.width * frameSize.width;
            var height = btnSize.height / winSize.height * frameSize.height;
            console.log("left: ", left);
            console.log("top: ", top);
            console.log("width: ", width);
            console.log("height: ", height);
            var button = qq.createUserInfoButton({
              type: "image",
              image: "",
              style: {
                left: left,
                top: top,
                width: width,
                height: height
              }
            });
            console.log("\u663e\u793a\u6309\u94ae");
            return button;
          }
          function getSetting(clicked) {
            qq.getSetting({
              success: function success(res) {
                if (res.authSetting["scope.userInfo"]) clicked && clicked(0); else {
                  self.infoButton = createUserInfoButton();
                  self.infoButton.show();
                  onTap(function(req) {
                    clicked && clicked(1);
                  });
                }
              },
              fail: function fail() {
                console.log("getSetting   fail");
                clicked && clicked(-1);
              }
            });
          }
          function onTap(clicked) {
            self.infoButton.onTap(function(res) {
              console.log("button ontap:", res);
              self.infoButton.hide();
              if ("operateWXData:ok" == res.errMsg || "getUserInfo:ok" == res.errMsg) {
                if (res["rawData"]) {
                  JSON.stringify(cc.sys.localStorage.setItem("qqUserInfo", res["userInfo"]));
                  clicked && clicked(true);
                }
              } else {
                self.sendLoginfailMsg(res, poly_sdk_config.failCode.userRefusedTo);
                clicked && clicked(false);
              }
            }.bind(self));
          }
          function showShareMenu() {
            qq.showShareMenu({
              showShareItems: [ "qq", "qzone", "wechatFriends", "wechatMoment" ]
            });
            qq.onShareAppMessage(function() {
              return {
                title: poly_sdk_config.shareTitle,
                imageUrl: poly_sdk_config.shareImgUrl
              };
            });
          }
          showShareMenu();
          checkSession(function(data) {
            data ? login(function(isLogin) {
              callback && callback(isLogin);
            }) : getSetting(function(code) {
              login(function(isLogin) {
                callback && callback(isLogin);
              });
            });
          });
        };
        this.vivo_login = function(args, callback) {
          var self = this;
          if (self._vivo_islogin) return;
          if ("undefined" != typeof qg) {
            self._vivo_islogin = true;
            qg.authorize({
              type: "token",
              success: function success(obj) {
                console.log("vivo \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 accessToken = " + obj.accessToken);
                self.getUserDisplayId(obj.accessToken);
                qg.getProfile({
                  token: obj.accessToken,
                  success: function success(res) {
                    var data = JSON.stringify(res);
                    console.log("getUserInfo success data = ", JSON.stringify(data));
                    self.setlocalUserInfo({
                      avatarUrl: data.avatar,
                      nickName: data.nickname,
                      openid: data.openid,
                      id: data.id,
                      unionid: data.unionid
                    });
                    callback && callback(true);
                  },
                  fail: function fail(data, code) {
                    try {
                      console.log("getProfile  fail = " + JSON.stringify(data));
                    } catch (error) {}
                    callback && callback(false);
                  }
                });
              },
              fail: function fail(data, code) {
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(data));
                callback && callback(false);
                self.sendLoginfailMsg(data);
              }
            });
          }
        };
        this.oppo_login = function(args, callback) {
          var self = this;
          if (self._oppo_islogin) return;
          function login(clicked) {
            self._oppo_islogin = true;
            qg.login({
              success: function success(res) {
                var data = JSON.stringify(res.data);
                console.log("oppo \u767b\u9646\u6210\u529f \uff1a" + data);
                self.setlocalUserInfo({
                  id: res.data.uid,
                  avatarUrl: res.data.avatar,
                  nickName: res.data.nickName,
                  gender: res.data.sex,
                  phoneNum: res.data.phoneNum,
                  age: res.data.age
                });
                clicked && clicked(res.data);
              },
              fail: function fail(res) {
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                self.sendLoginfailMsg(res);
                console.log(JSON.stringify(res));
                clicked && clicked(false);
              }
            });
          }
          function getSign(appKey, appSecret, pkgName, timeStamp, token) {
            var keys = {
              appKey: appKey,
              appSecret: appSecret,
              pkgName: pkgName,
              timeStamp: timeStamp,
              token: token
            };
            var str = "";
            for (var key in keys) if (keys.hasOwnProperty(key)) {
              var val = keys[key];
              str += key + "=" + val + "&";
            }
            str = "&" == str.substring(str.length - 1) ? str.substring(0, str.length - 1) : str;
            return tools.crypto().hex_md5(str).toUpperCase();
          }
          function getUserInfo(token, clicked) {
            console.log("token = " + token);
            var timestamp = new Date().getTime();
            var sign = getSign(poly_sdk_config.oppo.AppKey, poly_sdk_config.oppo.AppSecret, poly_sdk_config.oppo.pkgName, timestamp, token);
            console.log("sign = " + sign);
            var resData = {
              pkgName: poly_sdk_config.oppo.pkgName,
              token: token,
              timeStamp: timestamp,
              sign: sign
            };
            tools.sendRequest(poly_sdk_config.oppo.userInfoUrl, resData, function(data) {
              if (data && 200 == data.errorcode) {
                self.setlocalUserInfo({
                  id: data.userInfo.userId,
                  avatarUrl: data.userInfo.avatar,
                  nickName: data.userInfo.userName,
                  gender: data.userInfo.sex,
                  location: data.userInfo.location,
                  constellation: data.userInfo.constellation,
                  age: data.userInfo.age
                });
                clicked && clicked(data);
              } else {
                console.log("OPPO \u83b7\u53d6\u7528\u6237\u4fe1\u606f\u5931\u8d25 \uff1a " + JSON.stringify(data));
                clicked && clicked(false);
              }
            });
          }
          login(function(req) {
            if (req) {
              console.log("oppo \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 token = " + req.token);
              self.getUserDisplayId(req.token);
              qg.reportMonitor("game_scene", 0);
            }
          });
        };
        this.xiaomi_login = function(args, callback) {
          var self = this;
          if (this._xiaomi_islogin) return;
          function initEvent() {
            qg.onUserInfoChange(function(res) {
              console.log("onUserInfoChange");
              console.log(res.userInfo.nickName);
              console.log(res.userInfo.avatarUrl);
              console.log(res.userInfo.gender);
            });
            qg.offUserInfoChange(function() {
              console.log("offUserInfoChange");
            });
          }
          function login(clicked) {
            self._xiaomi_islogin = true;
            qg.login({
              success: function success(res) {
                console.log("\u5c0f\u7c73\u5feb\u73a9 login success" + JSON.stringify(res));
                console.log("xiaomi \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 token = " + res.token + "  session = " + res.session);
                self.getUserDisplayId(res.token, res.session);
                clicked && clicked(true);
              },
              fail: function fail(res) {
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                self.sendLoginfailMsg(res);
                clicked && clicked(false);
              }
            });
          }
          function getUserInfo() {
            qg.getUserInfo({
              success: function success(res) {
                console.log("getUserInfo success data = ", JSON.stringify(res.userInfo));
                self.setlocalUserInfo({
                  avatarUrl: res.userInfo.avatarUrl,
                  nickName: res.userInfo.nickName,
                  gender: res.userInfo.gender
                });
              },
              fail: function fail() {
                console.log("user reject!");
              },
              complete: function complete(res) {
                console.log("get userInfo complete");
              }
            });
          }
          initEvent();
          login(function() {
            getUserInfo();
          });
        };
        this.baidu_login = function(args, callback) {
          var self = this;
          if (self._baidu_islogin) return;
          var button = null;
          function checkSession(clicked) {
            swan.checkSession({
              success: function success() {
                clicked && clicked(true);
                console.log("\u767b\u5f55\u6001\u6709\u6548");
              },
              fail: function fail() {
                clicked && clicked(true);
                console.log("\u767b\u5f55\u6001\u65e0\u6548");
              }
            });
          }
          function isLoginSync(clicked) {
            try {
              var result = swan.isLoginSync();
              console.log("isLoginSync", result.isLogin);
              clicked && clicked(result.isLogin);
            } catch (e) {
              console.log("error", e);
              clicked && clicked(false);
            }
          }
          function login(loginCallBack) {
            self._baidu_islogin = true;
            console.log("login()");
            swan.login({
              success: function success(res) {
                console.log("\u767b\u5f55\u6210\u529f", res);
                console.log("baidu  \u540e\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + res.code);
                loginCallBack && loginCallBack(res);
              },
              fail: function fail(e) {
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                self.sendLoginfailMsg(e);
                loginCallBack && loginCallBack(false);
              },
              complete: function complete(res) {
                console.log("login complete = " + JSON.stringify(res));
                10004 == res.errCode && loginCallBack && loginCallBack(false);
              }
            });
          }
          function createUserInfoButton() {
            console.log("createUserInfoButton  \u5f00\u59cb");
            var btnNode = args.btnNode;
            self.systemInfo = swan.getSystemInfoSync();
            var btnSize = cc.size(btnNode.width + .1, btnNode.height + .1);
            var frameSize = cc.view.getFrameSize();
            var winSize = cc.director.getWinSize();
            var left = (.5 * winSize.width + btnNode.x - .5 * btnSize.width) / winSize.width * frameSize.width;
            var top = (.5 * winSize.height - btnNode.y - .5 * btnSize.height) / winSize.height * frameSize.height;
            var width = btnSize.width / winSize.width * frameSize.width;
            var height = btnSize.height / winSize.height * frameSize.height;
            console.log("left: ", left);
            console.log("top: ", top);
            console.log("width: ", width);
            console.log("height: ", height);
            button = swan.createUserInfoButton({
              type: "image",
              image: "",
              style: {
                left: left,
                top: top,
                width: width,
                height: height
              }
            });
            console.log("createUserInfoButton  \u6210\u529f");
            onTap();
            button.show();
            return button;
          }
          function getSetting(clicked) {
            console.log("getSetting");
            swan.authorize({
              scope: "scope.userInfo",
              success: function success(res) {
                swan.getSetting({
                  success: function success(res) {
                    console.log("getSetting \u6210\u529f = " + JSON.stringify(res));
                    clicked && clicked(res.authSetting["scope.userInfo"]);
                  },
                  fail: function fail(err) {
                    console.log(err);
                    console.log("getSetting \u5931\u8d25 = " + JSON.stringify(err));
                    clicked && clicked(false);
                  },
                  complete: function complete(res) {
                    console.log("getSetting complete = " + JSON.stringify(res));
                  }
                });
              },
              fail: function fail(err) {
                console.log(err);
                console.log("authorize \u5931\u8d25 = " + JSON.stringify(err));
                clicked && clicked(false);
              },
              complete: function complete(res) {
                console.log("authorize complete = " + JSON.stringify(res));
              }
            });
          }
          function getSwanId(clicked) {
            swan.getSwanId({
              success: function success(res) {
                console.log("swanid = " + res.data.swanid);
                clicked && clicked(res.data.swanid);
              },
              fail: function fail(err) {
                console.log("\u83b7\u53d6 getSwanId \u5931\u8d25 ! " + err);
                clicked && clicked(false);
              }
            });
          }
          function getUserInfo() {
            getSwanId(function(swanid) {
              swan.getUserInfo({
                swanIdList: [ "selfSwanId", swanid ],
                success: function success(res) {
                  console.log("getUserInfo success data = ", JSON.stringify(res.userInfo));
                  self.setlocalUserInfo({
                    avatarUrl: res.userInfo.avatarUrl,
                    nickName: res.userInfo.nickName,
                    gender: res.userInfo.gender
                  });
                },
                fail: function fail(res) {
                  console.log("getUserInfo fail = " + res);
                },
                complete: function complete(res) {
                  self.sendLoginMiNiFramework();
                  console.log("getUserInfo complete = " + res);
                }
              });
            });
          }
          function onTap(clicked) {
            button.onTap(function(res) {
              console.log("button ontap:", res);
              button.hide();
              if ("operateWXData:ok" == res.errMsg || "getUserInfo:ok" == res.errMsg) {
                if (res["rawData"]) {
                  JSON.stringify(cc.sys.localStorage.setItem("qqUserInfo", res["userInfo"]));
                  clicked && clicked(true);
                }
              } else clicked && clicked(false);
            }.bind(self));
          }
          checkSession();
          isLoginSync(function($isLoginSync) {
            $isLoginSync, login(function($islogin) {
              var code = $islogin ? $islogin.code : null;
              self.getUserDisplayId(code, null, function(iswin) {
                console.log("iswin = " + iswin);
                iswin && getSetting(function(isUserInfo) {
                  if (isUserInfo) getUserInfo(); else {
                    console.log("isUserInfo : " + isUserInfo);
                    self.sendLoginMiNiFramework();
                  }
                });
              });
            });
          });
        };
        this.weixin_login = function(args, callback) {
          var self = this;
          if (self._weixin_islogin) return;
          function login(clicked) {
            self._weixin_islogin = true;
            wx.login({
              success: function success(res) {
                if (res.code) {
                  console.log("res.code = " + res.code);
                  self.getUserDisplayId(res.code);
                  getUserInfo(function() {
                    clicked && clicked(true);
                  });
                } else {
                  console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                  clicked && clicked(false);
                }
              }
            });
          }
          function checkSession(clicked) {
            wx.checkSession({
              success: function success() {
                console.log("\u68c0\u67e5\u767b\u9646\u6210\u529f checkSession   success");
                clicked && clicked(true);
              },
              fail: function fail() {
                console.log("\u68c0\u67e5\u767b\u9646\u5931\u8d25 checkSession   fail");
                clicked && clicked(false);
              }
            });
          }
          function getUserInfo(clicked) {
            wx.getUserInfo({
              success: function success(res) {
                var userInfo = res.userInfo;
                console.log("getUserInfo success data = ", JSON.stringify(userInfo));
                self.setlocalUserInfo({
                  avatarUrl: res.userInfo.avatarUrl,
                  nickName: res.userInfo.nickName,
                  gender: res.userInfo.gender,
                  city: res.userInfo.city,
                  province: res.userInfo.province,
                  country: res.userInfo.country,
                  language: res.userInfo.language
                });
                clicked && clicked();
              }
            });
          }
          function createUserInfoButton() {
            var btnNode = {
              width: cc.view.getVisibleSize().width,
              height: cc.view.getVisibleSize().height
            };
            self.systemInfo = wx.getSystemInfoSync();
            var btnSize = cc.size(btnNode.width + .1, btnNode.height + .1);
            var frameSize = cc.view.getFrameSize();
            var winSize = cc.director.getWinSize();
            var left = 0;
            var top = 0;
            var width = btnSize.width / winSize.width * frameSize.width;
            var height = btnSize.height / winSize.height * frameSize.height;
            console.log("left: ", left);
            console.log("top: ", top);
            console.log("width: ", width);
            console.log("height: ", height);
            var button = wx.createUserInfoButton({
              type: "image",
              image: "",
              style: {
                left: left,
                top: top,
                width: width,
                height: height
              }
            });
            console.log("\u663e\u793a\u6309\u94ae");
            return button;
          }
          function getSetting(clicked) {
            wx.getSetting({
              success: function success(res) {
                if (res.authSetting["scope.userInfo"]) clicked && clicked(0); else {
                  self.infoButton = createUserInfoButton();
                  self.infoButton.show();
                  onTap(function(req) {
                    clicked && clicked(1);
                  });
                }
              },
              fail: function fail() {
                console.log("getSetting   fail");
                clicked && clicked(-1);
              }
            });
          }
          function onTap(clicked) {
            self.infoButton.onTap(function(res) {
              console.log("button ontap:", res);
              self.infoButton.hide();
              if ("operateWXData:ok" == res.errMsg || "getUserInfo:ok" == res.errMsg) {
                if (res["rawData"]) {
                  JSON.stringify(cc.sys.localStorage.setItem("qqUserInfo", res["userInfo"]));
                  clicked && clicked(true);
                }
              } else {
                self.sendLoginfailMsg(res, poly_sdk_config.failCode.userRefusedTo);
                clicked && clicked(false);
              }
            }.bind(self));
          }
          function showShareMenu() {
            wx.showShareMenu({
              withShareTicket: true
            });
            wx.onShareAppMessage(function() {
              return {
                title: poly_sdk_config.shareTitle,
                imageUrl: poly_sdk_config.shareImgUrl
              };
            });
          }
          showShareMenu();
          checkSession(function(data) {
            data ? login(function(isLogin) {
              callback && callback(isLogin);
            }) : getSetting(function(code) {
              login(function(isLogin) {
                callback && callback(isLogin);
              });
            });
          });
        };
        this.wangmai_login = function(callback) {
          var self = this;
          console.log("wangmai_login start   self._wangmai_islogin = " + self._wangmai_islogin);
          if (self._wangmai_islogin) return;
          WMAds.getLoginUserInfo && WMAds.getLoginUserInfo({
            engine: "Cocos",
            onSuccess: function onSuccess(res) {
              console.log(res);
              try {
                res = JSON.parse(res);
                if (res && null != res && res.userId && "" != res.userId && "undefined" != typeof res.userId) self.getUserDisplayId(res.userId, null, function(iswin) {
                  console.log("wangmai_login end   iswin = " + iswin);
                  self._wangmai_islogin = true;
                  callback && callback(iswin);
                }); else {
                  console.log("WMAds.getLoginUserInfo  res.userId  fail");
                  self.default_login();
                  callback && callback(false);
                }
              } catch (error) {
                console.log("wangmai_login getLoginUserInfo error  = " + error);
                self.default_login();
                callback && callback(false);
              }
            }
          });
        };
        this.default_login = function(callback) {
          var self = this;
          console.log("default_login start   self.default_login = " + self._default_islogin);
          if (self._default_islogin) return;
          this.getUserDisplayId(null, null, function(iswin) {
            console.log("default_login end   iswin = " + iswin);
            self._default_islogin = true;
            callback && callback(iswin);
          });
        };
        this.android_wx_Login = function(callback) {
          var TDApppID = null;
          var TDtypeID = null;
          var AppID = poly_sdk_config.appid;
          var path = null;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_android:
            TDApppID = poly_sdk_config.android.TDApppID;
            TDtypeID = poly_sdk_config.android.TDtypeID;
            path = poly_sdk_config.android.interface_path;
            break;

           case poly_sdk_config.sdk_key_yungao:
            TDApppID = poly_sdk_config.yungao.TDApppID;
            TDtypeID = poly_sdk_config.yungao.TDtypeID;
            path = poly_sdk_config.yungao.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_360:
            TDApppID = poly_sdk_config.android_360.TDApppID;
            TDtypeID = poly_sdk_config.android_360.TDtypeID;
            path = poly_sdk_config.android_360.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_oppo:
            TDApppID = poly_sdk_config.android_oppo.TDApppID;
            TDtypeID = poly_sdk_config.android_oppo.TDtypeID;
            path = poly_sdk_config.android_oppo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_tap:
            TDApppID = poly_sdk_config.android_tap.TDApppID;
            TDtypeID = poly_sdk_config.android_tap.TDtypeID;
            path = poly_sdk_config.android_tap.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_vivo:
            TDApppID = poly_sdk_config.android_vivo.TDApppID;
            TDtypeID = poly_sdk_config.android_vivo.TDtypeID;
            path = poly_sdk_config.android_vivo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_yyb:
            TDApppID = poly_sdk_config.android_yyb.TDApppID;
            TDtypeID = poly_sdk_config.android_yyb.TDtypeID;
            path = poly_sdk_config.android_yyb.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_jiuyou:
            TDApppID = poly_sdk_config.android_jiuyou.TDApppID;
            TDtypeID = poly_sdk_config.android_jiuyou.TDtypeID;
            path = poly_sdk_config.android_jiuyou.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_huawei:
            TDApppID = poly_sdk_config.android_huawei.TDApppID;
            TDtypeID = poly_sdk_config.android_huawei.TDtypeID;
            path = poly_sdk_config.android_huawei.interface_path;
            break;

           case poly_sdk_config.sdk_key_haoYouKuaiBao:
            TDApppID = poly_sdk_config.haoYouKuaiBao.TDApppID;
            TDtypeID = poly_sdk_config.haoYouKuaiBao.TDtypeID;
            path = poly_sdk_config.haoYouKuaiBao.interface_path;
            break;

           case poly_sdk_config.sdk_key_yunYouXi:
            TDApppID = poly_sdk_config.yunYouXi.TDApppID;
            TDtypeID = poly_sdk_config.yunYouXi.TDtypeID;
            path = poly_sdk_config.yunYouXi.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_4399:
            TDApppID = poly_sdk_config.android_4399.TDApppID;
            TDtypeID = poly_sdk_config.android_4399.TDtypeID;
            path = poly_sdk_config.android_4399.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_haixin:
            TDApppID = poly_sdk_config.android_haixin.TDApppID;
            TDtypeID = poly_sdk_config.android_haixin.TDtypeID;
            path = poly_sdk_config.android_haixin.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_Lenovo:
            TDApppID = poly_sdk_config.android_Lenovo.TDApppID;
            TDtypeID = poly_sdk_config.android_Lenovo.TDtypeID;
            path = poly_sdk_config.android_Lenovo.interface_path;
            break;

           case poly_sdk_config.sdk_key_CSJ:
            TDApppID = poly_sdk_config.CSJ.TDApppID;
            TDtypeID = poly_sdk_config.CSJ.TDtypeID;
            path = poly_sdk_config.CSJ.interface_path;
            break;

           case poly_sdk_config.sdk_key_GDT:
            TDApppID = poly_sdk_config.GDT.TDApppID;
            TDtypeID = poly_sdk_config.GDT.TDtypeID;
            path = poly_sdk_config.GDT.interface_path;
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By BannerAd");
          }
          cc.Poly_SDK_Native_WXLogin_Callback = function(errCode, code) {
            callback && callback(errCode, code);
          };
          jsb.reflection.callStaticMethod(path, "wx_login", "()V");
        };
        this.juzhang_login = function(callback) {
          if (cc.LieYingSDK.PolySDK.adjuzsdk) return;
          var clientId = poly_sdk_config.juzhang.clientId;
          var clientSecret = poly_sdk_config.juzhang.clientSecret;
          if (!clientId || "" == clientId) {
            console.log("\u5f53\u524d \u5de8\u638c clientId  \u4e3a\u7a7a");
            return;
          }
          if (!clientSecret || "" == clientSecret) {
            console.log("\u5f53\u524d \u5de8\u638c clientSecret  \u4e3a\u7a7a");
            return;
          }
          cc.LieYingSDK.PolySDK.adjuzsdk = new Adjuzsdk({
            clientId: clientId,
            clientSecret: clientSecret,
            callback: function callback(data) {
              console.log("SDK\u521d\u59cb\u5316", data);
              jsInitAccount();
              jsAdLoaded();
            }
          });
          function jsInitAccount() {
            cc.LieYingSDK.PolySDK.adjuzsdk.jsInitAccount(function(data) {
              console.log("\u4ee5\u83b7\u53d6\u8d26\u6237id" + data.accountId);
              cc.LieYingSDK.PolySDK.adjuzsdk.jsOpenGame();
            });
          }
          function jsAdLoaded() {
            cc.LieYingSDK.PolySDK.adjuzsdk.jsAdLoaded(function(data) {
              1 == data.adtype ? 1 == data.code ? console.log("\u6a2a\u7248\u89c6\u9891\u5df2\u7f13\u5b58") : console.log("\u6a2a\u7248\u89c6\u9891\u672a\u7f13\u5b58") : 1 == data.code ? console.log("\u7ad6\u7248\u89c6\u9891\u5df2\u7f13\u5b58") : console.log("\u7ad6\u7248\u89c6\u9891\u672a\u7f13\u5b58");
            });
          }
        };
        this.sdk360_login = function(args, callback) {
          var self = this;
          if (self._qh_islogin) return;
          console.log(" self._qh_islogin ");
          function login(clicked) {
            if ("undefined" == typeof qh) return;
            qh.login({
              success: function success(res) {
                self._qh_islogin = true;
                console.log("touTiao \u540e\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + res.code);
                if (res.code) {
                  console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(res));
                  self.getUserDisplayId(res.code);
                } else {
                  self.default_login();
                  console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(res));
                }
                callback && callback(true);
              },
              fail: function fail(res) {
                self._qh_islogin = false;
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(res));
                self.sendLoginfailMsg(res);
                callback && callback(false);
              }
            });
          }
          function getUserInfo() {
            qh.getSetting({
              success: function success(res) {
                console.log("scope.userInfo = " + res.authSetting["scope.userInfo"]);
                res.authSetting["scope.userInfo"] || qh.getUserInfo({
                  success: function success(res) {
                    console.log("getUserInfo success data = ", JSON.stringify(res));
                    self.setlocalUserInfo({
                      avatarUrl: res.userInfo.avatarUrl,
                      nickName: res.userInfo.nickName,
                      gender: res.userInfo.gender
                    });
                  },
                  fail: function fail(res) {
                    console.log("getUserInfo\u8c03\u7528\u5931\u8d25 = " + JSON.stringify(res));
                  }
                });
              },
              fail: function fail() {
                console.log("getSetting   fail");
              }
            });
          }
          login(callback);
        };
        this.wifikey_login = function(args, callback) {
          var self = this;
          if (self.wifikey_islogin) return;
          if ("undefined" == typeof wifikey) return;
          wifikey.login({
            success: function success(result) {
              self.wifikey_islogin = true;
              console.log("\u4e07\u80fd\u94a5\u5319 \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + result.code);
              if (result.code) {
                console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(result));
                self.getUserDisplayId(result.code);
              } else {
                self.default_login();
                console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(result));
              }
            },
            fail: function fail(err) {
              console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = " + JSON.stringify(err));
              self.sendLoginfailMsg(err);
            }
          });
        };
        this.sdkbaoqu_login = function(args, callback) {
          if (true, poly_sdk_config.baoqu.is_baoqu_debug) {
            var script = document.createElement("script");
            script.async = false;
            script.src = "http://superman.cmcm.com/cmplaysdk2/loader.js";
            document.body.appendChild(script);
          }
          var self = this;
          if (self._baoqu_islogin) return;
          if (!poly_sdk_config.baoqu.baoqv_pageId || "" == poly_sdk_config.baoqu.baoqv_pageId) {
            console.log("\u5f53\u524d oppo baoqv_pageId  \u4e3a\u7a7a");
            return;
          }
          if (!poly_sdk_config.baoqu.baoqv_gameId || "" == poly_sdk_config.baoqu.baoqv_gameId) {
            console.log("\u5f53\u524d oppo baoqv_gameId  \u4e3a\u7a7a");
            return;
          }
          if (!poly_sdk_config.baoqu.gameName || "" == poly_sdk_config.baoqu.gameName) {
            console.log("\u5f53\u524d oppo gameName  \u4e3a\u7a7a");
            return;
          }
          CPSDK.init({
            pageId: Number(poly_sdk_config.baoqu.baoqv_pageId),
            gameId: Number(poly_sdk_config.baoqu.baoqv_gameId),
            gameName: poly_sdk_config.baoqu.gameName,
            callback: function callback(ready) {
              if (ready) {
                console.log("CPSDK.init => SUCCESS");
                onCPSDKReady();
              } else {
                console.error("CPSDK.init => FAILED");
                CPSDK.gamePlayError(1e3, "cpsdk init error");
              }
            }
          });
          function onCPSDKReady() {
            self._baoqu_islogin = true;
            CPSDK.login(function(result, playerId) {
              if (result) {
                console.log("\u8c79\u8da3 \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + playerId);
                console.log("CPSDK.login => SUCCESS, playerId:" + playerId);
                console.log("\u767b\u5f55\u7528\u6237\u4fe1\u606f\uff1a" + JSON.stringify(playerId));
                callback && callback(true);
                self.getUserDisplayId(playerId);
                CPSDK.gameLoadingStart();
                CPSDK.gameLoadingFinished();
                CPSDK.gameMainStart();
                CPSDK.setStorageList({
                  score: "null"
                }, function(result) {
                  result;
                });
              } else {
                console.error("CPSDK.login => FAILED");
                console.log("\u8c03\u7528\u767b\u5f55\u5931\u8d25 = ");
                callback && callback(false);
                self.sendLoginfailMsg();
              }
            });
          }
        };
        this.wwz_login = function(args, callback) {
          this.getUserDisplayId("000000");
        };
        this.ks_login = function(args, callback) {
          var self = this;
          console.log("\u5feb\u624b\u5c0f\u6e38\u620f \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = ");
          cc.LieYingSDK.PolySDK.kssdk = function jumpAppLink(type) {
            var param = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            param && (param = $.param(param));
            console.log("-----------------------------======---------------------------------");
            var link = "cheetahbridge://" + type + "?" + param;
            var iframe = document.createElement("iframe");
            iframe.style.width = "1px";
            iframe.style.height = "1px";
            iframe.style.display = "none";
            iframe.src = link;
            document.body.appendChild(iframe);
            setTimeout(function() {
              iframe.remove();
            }, 100);
          };
          cc.LieYingSDK.PolySDK.kssdk("getUserInfo", {});
          window.onGetUserInfo = function(userId, name, avatar) {
            console.log("\u5feb\u624b\u5c0f\u6e38\u620f \u524d\u7aef\u6388\u6743 \u552f\u4e00\u6807\u8bc6 code = " + userId);
            self.getUserDisplayId(userId);
            self.setlocalUserInfo({
              avatarUrl: avatar,
              nickName: name
            });
            self.ks_login = true;
            alert("\u5feb\u624b\u5c0f\u6e38\u620f\u767b\u5f55\u6210\u529f");
          };
        };
        this.setlocalUserInfo = function(args) {
          if (!args) return;
          console.time("setlocalUserInfo End time");
          var keys = poly_sdk_config.localStorageUserkeys;
          for (var key in args) if (args.hasOwnProperty(key)) if (keys.indexOf(key) > -1) {
            var val = args[key];
            if ("undefined" == typeof val) {
              console.log("setlocalUserInfo failure msg : " + key + " is not val ");
              continue;
            }
            cc.sys.localStorage.setItem(key, val);
            console.log("cc.sys.localStorage.setItem success update : key = " + key + "  val = " + val);
          } else console.log("setlocalUserInfo Error msg : " + key + "  not Find ");
          console.timeEnd("setlocalUserInfo End time");
        };
        this.getlocalUserInfo = function(key) {
          if (!key) return;
          if (cc.sys.localStorage.getItem(key) && "" != cc.sys.localStorage.getItem(key)) return cc.sys.localStorage.getItem(key);
          console.log(key + " not Find");
          return null;
        };
        this.sendLoginfailMsg = function(err, fail_code, callback) {
          if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
            console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By sendLoginfailMsg");
            return;
          }
          var type = poly_sdk_config[poly_sdk_config.runSDK].type;
          var game_id = poly_sdk_config.game_id;
          if ("undefined" == typeof type || null == type || "undefined" == typeof game_id || null == game_id || "undefined" == typeof type_response_data || null == type_response_data) {
            console.log("sendLoginfailMsg sendRequest Err : type || game_id || type_response_data \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            callback && callback(false, null);
            return;
          }
          var type_response_data = null;
          try {
            type_response_data = JSON.stringify(err);
          } catch (error) {
            console.log("sendLoginfailMsg JSON.stringify  ERR  error = " + error);
            callback && callback();
            return;
          }
          var fail_code = 7402;
          var resData = {
            type: type,
            game_id: game_id,
            fail_code: fail_code || poly_sdk_config.failCode.unknown,
            type_response_data: type_response_data
          };
          tools.sendRequest(poly_sdk_config.failLoginUrl, resData, function(data) {
            if (data && 200 == data.errorcode) {
              console.log("sendLoginfailMsg sendRequest success");
              callback && callback(true, data);
            } else {
              console.log("sendLoginfailMsg sendRequest failure  data = " + JSON.stringify(data));
              callback && callback(false, data);
            }
          });
        };
        this.getSDKConfig = function() {
          return poly_sdk_config;
        };
        this.getUserDisplayId = function(opcode, session, callback) {
          var self = this;
          if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
            console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By getUserDisplayId");
            callback && callback(false, null);
            return;
          }
          var type = poly_sdk_config[poly_sdk_config.runSDK].type;
          var game_id = poly_sdk_config.game_id;
          var display_id = self.getlocalUserInfo("display_id") || "";
          console.log("getUserDisplayId \u5f00\u59cb \u53c2\u6570: type \uff1a".concat(type, " game_id : ").concat(game_id, " opcode : ").concat(opcode, " session : ").concat(session));
          if ("undefined" == typeof type || null == type || "undefined" == typeof game_id || null == game_id) {
            console.log("getUserDisplayId sendRequest Err : type || game_id \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            callback && callback(false, null);
            return;
          }
          if (poly_sdk_config.runSDK == poly_sdk_config.sdk_key_xiaomi && ("undefined" == typeof session || null == session)) {
            console.log("getUserDisplayId sendRequest Err : session \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            callback && callback(false, null);
            return;
          }
          "undefined" != typeof opcode && null != opcode || (opcode = "000000");
          console.log("getUserDisplayId sendRequest \u5f00\u59cb \u53c2\u6570: type \uff1a".concat(type, " game_id : ").concat(game_id, " opcode : ").concat(opcode, " session : ").concat(session));
          var resData = {
            type: type,
            game_id: game_id,
            opcode: opcode,
            display_id: display_id,
            session: session || null
          };
          tools.sendRequest(poly_sdk_config.userLoginUrl, resData, function(data) {
            if (data && 200 == data.code) {
              console.log("getUserDisplayId sendRequest success data = " + JSON.stringify(data));
              poly_sdk_config.userLoginData.display_id = data.data.display_id;
              self.setlocalUserInfo({
                display_id: poly_sdk_config.userLoginData.display_id
              });
              callback && callback(true, data);
            } else {
              console.log("getUserDisplayId sendRequest failure  data = " + JSON.stringify(data));
              callback && callback(false, data);
            }
          });
        };
        this.sendLoginMiNiFramework = function() {
          console.log("sendLoginMiNiFramework");
          if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
            console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By sendLoginMiNiFramework");
            return;
          }
          var type = poly_sdk_config[poly_sdk_config.runSDK].type;
          var game_id = poly_sdk_config.game_id;
          if ("undefined" == typeof type || null == type || "undefined" == typeof game_id || null == game_id) {
            console.log("sendLoginMiNiFramework sendRequest Err : type || game_id \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            return;
          }
          if ("undefined" == typeof poly_sdk_config.userLoginData.display_id || !poly_sdk_config.userLoginData.display_id) {
            console.log("sendLoginMiNiFramework sendRequest Err : poly_sdk_config.userLoginData.display_id \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            return;
          }
          var resdata = {
            display_id: poly_sdk_config.userLoginData.display_id,
            game_id: game_id,
            channel_id: type,
            name: this.getlocalUserInfo("nickName") || "",
            img: this.getlocalUserInfo("avatarUrl") || ""
          };
          console.log("sendLoginMiNiFramework \u5f00\u59cb \u53c2\u6570: resdata \uff1a".concat(JSON.stringify(resdata)));
          cc.LieYingSDK.DAO.UserDAO.login(resdata);
        };
        return instance = this;
      };
      return LoginAuth;
    }();
    var BannerAd = function() {
      var instance;
      var BannerAd = function BannerAd() {
        if (instance) return instance;
        var self = this;
        this.createBannerAd = function(callback) {
          console.log("createBannerAd start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            this.createBannerAd_qq(callback);
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.createBannerAd_tt(callback);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            this.createBannerAd_vivo(callback);
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            this.createBannerAd_xiaomi(callback);
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            this.createBannerAd_baidu(callback);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            this.createBannerAd_oppo(callback);
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            this.createBannerAd_weixin(callback);
            break;

           case poly_sdk_config.sdk_key_qtt:
            if ("undefined" == typeof qttGame) {
              console.log("qtt qttGame is undefined");
              return;
            }
            this.createBannerAd_qtt(callback);
            break;

           case poly_sdk_config.sdk_key_jikewan:
            if ("undefined" == typeof AdSDK) {
              console.log("\u5373\u523b\u73a9 AdSDK is undefined");
              return;
            }
            this.createBannerAd_jikewan(callback);
            break;

           case poly_sdk_config.sdk_key_ios:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_IOS) {
              console.log("\u539f\u751f IOS \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.createBannerAd_ios(callback);
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
           case poly_sdk_config.sdk_key_CSJ:
           case poly_sdk_config.sdk_key_GDT:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.createBannerAd_android(callback);
            break;

           case poly_sdk_config.sdk_key_juzhang:
            if (!cc.LieYingSDK.PolySDK.adjuzsdk || "undefined" == typeof cc.LieYingSDK.PolySDK.adjuzsdk) {
              console.log("\u5de8\u638c adjuzsdk is undefined");
              return;
            }
            this.createBannerAd_juzhang(callback);
            break;

           case poly_sdk_config.sdk_key_360:
            if ("undefined" == typeof qh) {
              console.log("360 qh is undefined");
              return;
            }
            this.createBannerAd_360(callback);
            break;

           case poly_sdk_config.sdk_key_wifikey:
            if ("undefined" == typeof wifikey) {
              console.log("\u4e07\u80fd\u94a5\u5319 is undefined");
              return;
            }
            this.createBannerAd_wifikey(callback);
            break;

           case poly_sdk_config.sdk_key_baoqu:
            if ("undefined" == typeof CPSDK) {
              console.log("\u8c79\u8da3 CPSDK is undefined");
              return;
            }
            this.createBannerAd_baoqu(callback);
            break;

           case poly_sdk_config.sdk_key_wwz:
            if ("undefined" == typeof wwz) {
              console.log("\u73a9\u73a9\u8d5a wwz is undefined");
              return;
            }
            this.createBannerAd_wwz(callback);
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By BannerAd");
          }
        };
        this.showBannerAd = function() {
          this._isShowBannerAd = true;
          this._bannerAd && this._bannerAd.show();
        }, this.hideBannerAd = function() {
          this._isShowBannerAd = false;
          this._bannerAd && this._bannerAd.hide();
        };
        this.createBannerAd_tt = function(callback) {
          var bannerid = poly_sdk_config.tt.banner_id;
          var bannerAdWidth = 0;
          var self = this;
          if (self._bannerAd) return;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d \u5934\u6761 banner_id  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if ("undefined" != typeof tt) {
            self._isShowBannerAd = true;
            var _tt$getSystemInfoSync = tt.getSystemInfoSync(), windowWidth = _tt$getSystemInfoSync.windowWidth, windowHeight = _tt$getSystemInfoSync.windowHeight;
            var targetBannerAdWidth = 200;
            self._bannerAd = tt.createBannerAd({
              adUnitId: bannerid,
              style: {
                top: windowHeight - targetBannerAdWidth / 16 * 9
              }
            });
            self._bannerAd.onResize(function(size) {
              bannerAdWidth <= 0 && (bannerAdWidth = size.width);
              self._bannerAd.style.left = (windowWidth - bannerAdWidth) / 2;
            });
            self._bannerAd.onLoad(function() {
              self.sendBannerpush(1);
              self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
              callback && callback(true);
            });
          } else {
            self.sendBannerpush(0);
            callback && callback(false);
            console.log("tt is undefined");
          }
        };
        this.createBannerAd_qq = function(callback) {
          var bannerid = poly_sdk_config.qq.banner_id;
          var self = this;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d QQ banner_id  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (self._bannerAd) return;
          self._isShowBannerAd = true;
          var _qq$getSystemInfoSync = qq.getSystemInfoSync(), windowWidth = _qq$getSystemInfoSync.windowWidth, windowHeight = _qq$getSystemInfoSync.windowHeight;
          self._bannerAd = qq.createBannerAd({
            adUnitId: bannerid,
            style: {
              left: .2 * windowWidth / 2,
              top: windowHeight - .2 * windowHeight + .2 * windowHeight / 3,
              width: .8 * windowWidth,
              height: .2 * windowHeight
            }
          });
          self._bannerAd.onResize(function(size) {
            console.log("size.width", size.width);
            console.log("size.width", size.height);
            self._bannerAd.style.left = windowWidth / 2 - size.width / 2;
            self._bannerAd.style.top = windowHeight - size.height - 10;
          });
          self._bannerAd.onError(function(res) {
            console.log("bannerAd onError", res);
            self.sendBannerpush(0);
            callback && callback(false);
          });
          console.log("createBannerAd_qq   self._bannerAd = " + self._bannerAd);
          self._bannerAd.onLoad(function(res) {
            console.log("createBannerAd_qq  self._isShowBannerAd = " + self._isShowBannerAd);
            self.sendBannerpush(1);
            self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
            callback && callback(true);
          });
        };
        this.createBannerAd_vivo = function(callback) {
          var bannerid = poly_sdk_config.vivo.banner_id;
          var self = this;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d vivo bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (self._bannerAd) return;
          self._isShowBannerAd = true;
          console.log("createBannerAd_vivo");
          if (qg.getSystemInfoSync().platformVersionCode < 1031) {
            console.log("createBannerAd_vivo  \u5f53\u524d\u7248\u672c\u4e0d\u652f\u6301\u5e7f\u544a");
            self.sendBannerpush(0);
            callback && callback(false);
          } else {
            console.log("createBannerAd_vivo  \u652f\u6301\u5e7f\u544a");
            var _qg$getSystemInfoSync = qg.getSystemInfoSync(), windowWidth = _qg$getSystemInfoSync.windowWidth, windowHeight = _qg$getSystemInfoSync.windowHeight;
            var targetBannerAdWidth = 200;
            self._bannerAd = qg.createBannerAd({
              posId: bannerid,
              style: {}
            });
            console.log("createBannerAd_vivo   self._bannerAd = " + self._bannerAd);
            self._bannerAd.onLoad(function() {
              console.log("createBannerAd_vivo  self._isShowBannerAd = " + self._isShowBannerAd);
              self.sendBannerpush(1);
              self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
              callback && callback(true);
            });
          }
        };
        this.createBannerAd_oppo = function(callback) {
          var bannerid = poly_sdk_config.oppo.banner_id;
          var self = this;
          if (!poly_sdk_config.oppo.AppID || "" == poly_sdk_config.oppo.AppID) {
            console.log("\u5f53\u524d oppo AppID  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (self._bannerAd) return;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d oppo bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          self._isShowBannerAd = true;
          console.log("createBannerAd_oppo");
          if (qg.getSystemInfoSync().minPlatformVersion < 1031) {
            console.log("createBannerAd_oppo  \u5f53\u524d\u7248\u672c\u4e0d\u652f\u6301\u5e7f\u544a");
            self.sendBannerpush(0);
            callback && callback(false);
          } else {
            console.log("createBannerAd_oppo  \u652f\u6301\u5e7f\u544a");
            qg.initAdService({
              appId: poly_sdk_config.oppo.AppID,
              isDebug: false,
              success: function success(res) {
                console.log("success");
                self._bannerAd = qg.createBannerAd({
                  posId: bannerid
                });
                console.log("createBannerAd_oppo   self._bannerAd = " + self._bannerAd);
                self.sendBannerpush(1);
                self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
                callback && callback(true);
              },
              fail: function fail(res) {
                console.log("fail:" + res.code + res.msg);
                self.sendBannerpush(0);
                callback && callback(false);
              },
              complete: function complete(res) {
                console.log("complete");
              }
            });
          }
        };
        this.createBannerAd_baidu = function(callback) {
          var bannerid = poly_sdk_config.baidu.banner_id;
          if (self._bannerAd) return;
          if (!poly_sdk_config.baidu.appSid || "" == poly_sdk_config.baidu.appSid) {
            console.log("\u5f53\u524d \u767e\u5ea6 appSid (\u767d\u9752\u85e4 \u5e94\u7528\u7ba1\u7406 ID) \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d \u767e\u5ea6 bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          self._isShowBannerAd = true;
          console.log("createBannerAd_baidu  getSystemInfoSync = " + JSON.stringify(swan.getSystemInfoSync()));
          if (swan.getSystemInfoSync().SDKVersion < "1.11.0") {
            console.log("baidu SDKVersion \u8fc7\u4f4e \u4e0d\u652f\u6301 Banner \u5e7f\u544a\uff01");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          var _swan$getSystemInfoSy = swan.getSystemInfoSync(), windowWidth = _swan$getSystemInfoSy.windowWidth, windowHeight = _swan$getSystemInfoSy.windowHeight;
          var targetBannerAdWidth = 200;
          self._bannerAd = swan.createBannerAd({
            adUnitId: bannerid,
            appSid: poly_sdk_config.baidu.appSid,
            style: {
              left: (windowWidth - targetBannerAdWidth) / 2,
              top: windowHeight - targetBannerAdWidth / 16 * 9,
              width: targetBannerAdWidth
            }
          });
          console.log("createBannerAd_baidu   self._bannerAd = " + self._bannerAd);
          self._bannerAd.onError(function(err) {
            self.sendBannerpush(0);
            console.log("createBannerAd_baidu onError = " + err);
          });
          self._bannerAd.onLoad(function() {
            console.log(" banner \u52a0\u8f7d\u5b8c\u6210");
            console.log("createBannerAd_baidu  self._isShowBannerAd = " + self._isShowBannerAd);
            self.sendBannerpush(1);
            self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
            callback && callback(true);
          });
        };
        this.createBannerAd_xiaomi = function(callback) {
          var bannerid = poly_sdk_config.xiaomi.banner_id;
          var self = this;
          if (self._bannerAd) return;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d \u5c0f\u7c73 bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          self._isShowBannerAd = true;
          console.log("createBannerAd_xiaomi");
          var _qg$getSystemInfoSync2 = qg.getSystemInfoSync(), windowWidth = _qg$getSystemInfoSync2.windowWidth, windowHeight = _qg$getSystemInfoSync2.windowHeight;
          var targetBannerAdWidth = 200;
          self._bannerAd = qg.createBannerAd({
            adUnitId: bannerid,
            style: {
              left: (windowWidth - targetBannerAdWidth) / 2,
              top: windowHeight - targetBannerAdWidth / 16 * 9,
              width: targetBannerAdWidth
            }
          });
          console.log("createBannerAd_xiaomi   self._bannerAd = " + self._bannerAd);
          self._bannerAd.onLoad(function() {
            console.log(" banner \u52a0\u8f7d\u5b8c\u6210");
            console.log("createBannerAd_xiaomi  self._isShowBannerAd = " + self._isShowBannerAd);
            self.sendBannerpush(1);
            self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
            callback && callback(true);
          });
        };
        this.createBannerAd_weixin = function(callback) {
          var bannerid = poly_sdk_config.weixin.banner_id;
          var self = this;
          if (self._bannerAd) return;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d \u5fae\u4fe1 bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if ("undefined" != typeof wx) {
            self._isShowBannerAd = true;
            var _wx$getSystemInfoSync = wx.getSystemInfoSync(), windowWidth = _wx$getSystemInfoSync.windowWidth, windowHeight = _wx$getSystemInfoSync.windowHeight;
            var targetBannerAdWidth = 200;
            if ("undefined" == typeof wx.createBannerAd) return;
            self._bannerAd = wx.createBannerAd({
              adUnitId: bannerid,
              style: {
                left: (windowWidth - targetBannerAdWidth) / 2,
                top: windowHeight - targetBannerAdWidth / 16 * 9,
                width: targetBannerAdWidth
              }
            });
            self._bannerAd.onResize(function(res) {
              console.log(res.width, res.height);
              console.log(self._bannerAd.style.realWidth, self._bannerAd.style.realHeight);
            });
            console.log("createBannerAd_weixin   self._bannerAd = " + self._bannerAd);
            self._bannerAd.onLoad(function(req) {
              console.log(" banner \u52a0\u8f7d\u5b8c\u6210");
              console.log("createBannerAd_weixin  self._isShowBannerAd = " + self._isShowBannerAd);
              self.sendBannerpush(1);
              if (void 0 == req || null == req) {
                self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
                callback && callback(true);
              } else callback && callback(false);
            });
            self._bannerAd.onError(function(err) {
              console.log("onError = " + err);
              self.sendBannerpush(0);
            });
          } else {
            self.sendBannerpush(0);
            callback && callback(false);
            console.log("wx is undefined");
          }
        };
        this.createBannerAd_qtt = function() {
          this._bannerAd = this._bannerAd || {};
          this._bannerAd.show || (this._bannerAd.show = function() {
            console.log("createBannerAd_qtt  show");
            qttGame.showBanner();
          });
          this._bannerAd.hide || (this._bannerAd.hide = function() {
            console.log("createBannerAd_qtt  hide");
            qttGame.hideBanner();
          });
        };
        this.createBannerAd_jikewan = function(callback) {
          console.log("createBannerAd_jikewan");
          var bannerid = poly_sdk_config.jikewan.banner_id;
          var banner_adId = poly_sdk_config.jikewan.banner_adId;
          var self = this;
          if (self._bannerAd) return;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d \u5373\u53ef\u73a9 bannerid  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (!banner_adId || "" == banner_adId) {
            console.log("\u5f53\u524d \u5373\u53ef\u73a9 banner_adId  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          AdSDK.init();
          if ("undefined" != typeof AdSDK && null != AdSDK) {
            self._isShowBannerAd = true;
            self._bannerAd = AdSDK.createBannerAd(banner_adId, bannerid, 2);
            self._bannerAd.onLoad(function(param) {
              console.log("createBannerAd_jikewan banner\xa0onLoad:", 1 == param);
              console.log(" banner \u52a0\u8f7d\u5b8c\u6210");
              console.log("createBannerAd_jikewan  self._isShowBannerAd = " + self._isShowBannerAd);
              self.sendBannerpush(1);
              self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
              callback && callback(true);
            });
            self._bannerAd.onError(function(param) {
              console.log("banner\xa0onError:", param);
              self.sendBannerpush(0);
              callback && callback(false);
            });
            self._bannerAd.onResize(function(param) {
              console.log("banner\xa0onResize:", param);
              self.sendBannerpush(0);
              callback && callback(false);
            });
          } else {
            console.log("AdSDK is undefined");
            self.sendBannerpush(0);
            callback && callback(false);
          }
        };
        this.createBannerAd_ios = function(callback) {
          var bannerid = poly_sdk_config.ios.banner_id;
          this._bannerAd = this._bannerAd || {};
          var self = this;
          if (!bannerid || "" == bannerid) {
            self.sendBannerpush(0);
            console.log("\u5f53\u524d ios bannerid  \u4e3a\u7a7a");
            callback && callback(false);
            return;
          }
          try {
            cc.LY_SDK_Native_AdBanner_Callback = function(bannerid, type, code, errMgr) {
              return;
              function call(onSuccess, onError) {
                if ("200" == code) onSuccess && onSuccess(); else {
                  console.log("LY_SDK_Native_AdBanner_Callback  errMgr = " + errMgr);
                  onError && onError();
                }
              }
            };
            this._bannerAd.show = function() {
              console.log("createBannerAd_ios  show  bannerid = " + bannerid);
              jsb.reflection.callStaticMethod(poly_sdk_config.ios.interface_path, "showAdBannerinRootViewBannerId:", bannerid);
            };
            this._bannerAd.hide = function() {
              console.log("createBannerAd_ios  hide bannerid = " + bannerid);
              jsb.reflection.callStaticMethod(poly_sdk_config.ios.interface_path, "hideAdBannerinRootViewBannerId:", bannerid);
            };
          } catch (error) {
            console.log("createBannerAd_ios\xa0error" + JSON.stringify(error));
          }
        }, this.createBannerAd_android = function(callback) {
          var bannerid = null;
          var path = null;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_android:
            bannerid = poly_sdk_config.android.banner_id;
            path = poly_sdk_config.android.interface_path;
            break;

           case poly_sdk_config.sdk_key_yungao:
            bannerid = poly_sdk_config.yungao.banner_id;
            path = poly_sdk_config.yungao.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_360:
            bannerid = poly_sdk_config.android_360.banner_id;
            path = poly_sdk_config.android_360.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_oppo:
            bannerid = poly_sdk_config.android_oppo.banner_id;
            path = poly_sdk_config.android_oppo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_tap:
            bannerid = poly_sdk_config.android_tap.banner_id;
            path = poly_sdk_config.android_tap.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_vivo:
            bannerid = poly_sdk_config.android_vivo.banner_id;
            path = poly_sdk_config.android_vivo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_yyb:
            bannerid = poly_sdk_config.android_yyb.banner_id;
            path = poly_sdk_config.android_yyb.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_jiuyou:
            bannerid = poly_sdk_config.android_jiuyou.banner_id;
            path = poly_sdk_config.android_jiuyou.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_huawei:
            bannerid = poly_sdk_config.android_huawei.banner_id;
            path = poly_sdk_config.android_huawei.interface_path;
            break;

           case poly_sdk_config.sdk_key_haoYouKuaiBao:
            bannerid = poly_sdk_config.haoYouKuaiBao.banner_id;
            path = poly_sdk_config.haoYouKuaiBao.interface_path;
            break;

           case poly_sdk_config.sdk_key_yunYouXi:
            bannerid = poly_sdk_config.yunYouXi.banner_id;
            path = poly_sdk_config.yunYouXi.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_4399:
            bannerid = poly_sdk_config.android_4399.banner_id;
            path = poly_sdk_config.android_4399.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_haixin:
            bannerid = poly_sdk_config.android_haixin.banner_id;
            path = poly_sdk_config.android_haixin.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_Lenovo:
            bannerid = poly_sdk_config.android_Lenovo.banner_id;
            path = poly_sdk_config.android_Lenovo.interface_path;
            break;

           case poly_sdk_config.sdk_key_CSJ:
            bannerid = poly_sdk_config.CSJ.banner_id;
            path = poly_sdk_config.CSJ.interface_path;
            break;

           case poly_sdk_config.sdk_key_GDT:
            bannerid = poly_sdk_config.GDT.banner_id;
            path = poly_sdk_config.GDT.interface_path;
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By BannerAd");
          }
          this._bannerAd = this._bannerAd || {};
          var self = this;
          cc.LY_SDK_Native_AdBanner_Callback = function(bannerid, type, code, errMgr) {
            return;
            function call(onSuccess, onError) {
              if ("200" == code) onSuccess && onSuccess(); else {
                console.log("LY_SDK_Native_AdBanner_Callback  errMgr = " + errMgr);
                onError && onError();
              }
            }
          };
          this._bannerAd.show = function() {
            console.log("createBannerAd_android  show  bannerid = " + bannerid);
            jsb.reflection.callStaticMethod(path, "showAdBannerAd", "(Ljava/lang/String;)V", bannerid);
          };
          this._bannerAd.hide = function() {
            console.log("createBannerAd_android  hide bannerid = " + bannerid);
            jsb.reflection.callStaticMethod(path, "hideAdBannerAd", "(Ljava/lang/String;)V", bannerid);
          };
        }, this.createBannerAd_juzhang = function(callback) {
          var adtype = Number(poly_sdk_config.juzhang.adType.banner_Ad);
          cc.LieYingSDK.PolySDK.adjuzsdk.jsOpenAD(adtype, function(res) {
            if (1 == res.status) {
              console.log("\u5e7f\u544a\u5f00\u59cb\u64ad\u653e");
              1 == res.playStatus ? console.log("\u5e7f\u544a\u64ad\u653e\u5b8c\u6bd5") : console.log("\u5e7f\u544apending");
            } else console.log("\u5e7f\u544a\u64ad\u653e\u5931\u8d25");
          });
        }, this.createBannerAd_360 = function(callback) {
          var bannerid = poly_sdk_config.sdk360.banner_id;
          var self = this;
          if (!bannerid || "" == bannerid) {
            console.log("\u5f53\u524d sdk360 banner_id  \u4e3a\u7a7a");
            self.sendBannerpush(0);
            callback && callback(false);
            return;
          }
          if (self._bannerAd) return;
          var _qh$getSystemInfoSync = qh.getSystemInfoSync(), windowWidth = _qh$getSystemInfoSync.windowWidth, windowHeight = _qh$getSystemInfoSync.windowHeight;
          self._isShowBannerAd = true;
          var bannerAd_width = 1180;
          var bannerAd_height = 150;
          self._bannerAd = qh.createBannerAd({
            adUnitId: bannerid,
            adIntervals: 30,
            style: {
              left: 0,
              top: windowHeight - bannerAd_height + bannerAd_height / 3,
              width: bannerAd_width,
              height: bannerAd_height
            }
          });
          self._bannerAd.onError(function(res) {
            console.log("bannerAd onError", res);
            self.sendBannerpush(0);
            callback && callback(false);
          });
          console.log("createBannerAd_360   self._bannerAd = " + self._bannerAd);
          self._bannerAd.onLoad(function(res) {
            console.log("createBannerAd_360  self._isShowBannerAd = " + self._isShowBannerAd);
            self.sendBannerpush(1);
            self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
            callback && callback(true);
          });
        };
        this.createBannerAd_wifikey = function(callback) {
          var self = this;
          if (self._isShowBannerAd) return;
          self._isShowBannerAd = true;
          self._bannerAd = {
            show: function show() {
              wifikey.showBannerAd({
                style: {
                  left: (window.innerWidth - 320) / 2,
                  top: window.innerHeight - 5,
                  width: 320,
                  height: 200
                }
              });
            },
            hide: function hide() {
              wifikey.hideBannerAd();
            }
          };
          window.onBannerAdLoad = function() {
            self.sendBannerpush(1);
            console.log("createBannerAd_wifikey_load");
          };
          window.onBannerAdError = function(err) {
            self.sendBannerpush(0);
            console.log("createBannerAd_wifikey_Error:", err);
          };
        }, this.createBannerAd_baoqu = function(callback) {
          if (self._bannerAd) return;
          self._bannerAd = {
            show: function show() {
              CPSDK.showBanner();
            },
            hide: function hide() {
              CPSDK.hideBanner();
            }
          };
          self._isShowBannerAd = true;
          self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
          self.sendBannerpush(1);
        }, this.createBannerAd_wwz = function(callback) {
          var self = this;
          if (self._bannerAd) return;
          self._isShowBannerAd = true;
          console.log("createBannerAd_wwz");
          wwz.LY_hdgg_entrance_custom_style.width = "100%";
          wwz.LY_hdgg_entrance_custom_style.height = "10%";
          wwz.LY_hdgg_entrance_custom_style.display = "none";
          wwz.LY_BannerAdImg_style.position = "absolute";
          wwz.LY_BannerAdImg_style.width = "100%";
          wwz.LY_BannerAdImg_style.height = "10%";
          wwz.LY_BannerAdImg_style.top = "90%";
          wwz.LY_BannerAdImg_style.display = "none";
          self._bannerAd = {
            show: function show() {
              wwz.LY_hdgg_entrance_custom_style.display = "block";
              wwz.LY_BannerAdImg_style.display = "block";
            },
            hide: function hide() {
              wwz.LY_hdgg_entrance_custom_style.display = "none";
              wwz.LY_BannerAdImg_style.display = "none";
            }
          };
          if (null != self._bannerAd) {
            self.sendBannerpush(1);
            self._isShowBannerAd ? self.showBannerAd() : self.hideBannerAd();
            callback && callback(true);
          } else {
            self.sendBannerpush(0);
            callback && callback(false);
            console.log("wwz bannerAd is undefined");
          }
        };
        this.sendBannerpush = function(isend, callback) {
          if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
            console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By sendBannerpush");
            return;
          }
          var channel_id = poly_sdk_config[poly_sdk_config.runSDK].type;
          var game_id = poly_sdk_config.game_id;
          var token = poly_sdk_config.HTTPtoken;
          var display_id = poly_sdk_config.userLoginData.display_id || "000000";
          var conf_banner = poly_sdk_config[poly_sdk_config.runSDK].banner_id;
          var banner_id = conf_banner && "" != conf_banner ? conf_banner : poly_sdk_config.default_banner_id;
          var address_id = 0;
          if ("undefined" == typeof channel_id || null == channel_id || "undefined" == typeof game_id || null == game_id || "undefined" == typeof isend || null == isend || "undefined" == typeof banner_id || null == banner_id || "undefined" == typeof address_id || null == address_id) {
            console.log("sendBannerpush sendRequest Err : channel_id || game_id || token  ||  isend || banner_id || address_id \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            callback && callback(false, null);
            return;
          }
          var resData = {
            token: token,
            game_id: game_id,
            channel_id: channel_id,
            display_id: display_id,
            isend: isend,
            banner_id: banner_id,
            address_id: address_id
          };
          tools.sendRequest(poly_sdk_config.bannerpushUrl, resData, function(data) {
            if (data && 200 == data.errorcode) {
              console.log("sendBannerpush sendRequest success");
              callback && callback(true, data);
            } else {
              console.log("sendBannerpush sendRequest failure  data = " + JSON.stringify(data));
              callback && callback(false, data);
            }
          });
        };
        return instance = this;
      };
      return BannerAd;
    }();
    var InterstitialAd = function() {
      var instance;
      var InterstitialAd = function InterstitialAd() {
        if (instance) return instance;
        var self = this;
        this.createInterstitialAd = function(callback) {
          console.log("createInterstitialAd start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            this.createInterstitialAd_qq(callback);
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.createInterstitialAd_tt(callback);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            this.createInterstitialAd_xiaomi(callback);
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_qtt:
            if ("undefined" == typeof qttGame) {
              console.log("qtt qttGame is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_jikewan:
            if ("undefined" == typeof AdSDK) {
              console.log("\u5373\u523b\u73a9 AdSDK is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_ios:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_IOS) {
              console.log("\u539f\u751f IOS \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
           case poly_sdk_config.sdk_key_CSJ:
           case poly_sdk_config.sdk_key_GDT:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_juzhang:
            if (!cc.LieYingSDK.PolySDK.adjuzsdk || "undefined" == typeof cc.LieYingSDK.PolySDK.adjuzsdk) {
              console.log("\u5de8\u638c adjuzsdk is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_360:
            if ("undefined" == typeof qh) {
              console.log("360 qh is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_wifikey:
            if ("undefined" == typeof wifikey) {
              console.log("\u4e07\u80fd\u94a5\u5319 wifikey is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baoqu:
            if ("undefined" == typeof CPSDK) {
              console.log("\u8c79\u8da3 CPSDK is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_wwz:
            if ("undefined" == typeof wwz) {
              console.log("\u73a9\u73a9\u8d5a wwz is undefined");
              return;
            }
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By EInterstitialAd");
          }
        };
        this.showInterstitialAd = function(callback) {
          self._interstitialAd && self._interstitialAd.show();
        };
        this.createInterstitialAd_tt = function(callback) {
          var interstitialAd_id = poly_sdk_config.tt.interstitialAd_id;
          var self = this;
          if (!interstitialAd_id || "" == interstitialAd_id) {
            console.log("\u5f53\u524d tt interstitialAd_id  \u4e3a\u7a7a");
            callback && callback(false);
            return;
          }
          if ("undefined" == typeof tt) {
            console.log("\u5934\u6761 tt is undefined");
            return;
          }
          self._interstitialAd = tt.createInterstitialAd({
            adUnitId: interstitialAd_id
          });
          self._interstitialAd.onLoad(function() {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u6210\u529f");
            callback && callback(true);
          });
          self._interstitialAd.onError(function(res) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u5931\u8d25");
            console.log("interstitialAd onError ", res);
            callback && callback(false);
          });
          self._interstitialAd.onClose(function(data) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u5173\u95ed\u63d2\u5c4f");
            self._interstitialAd.destroy();
            self._interstitialAd = null;
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u91cd\u65b0\u52a0\u8f7d\u63d2\u5c4f");
            self.createInterstitialAd_tt(callback);
            console.log("interstitialAd close ad ", data);
          });
        };
        this.createInterstitialAd_qq = function(callback) {
          var interstitialAd_id = poly_sdk_config.qq.interstitialAd_id;
          var self = this;
          if (!interstitialAd_id || "" == interstitialAd_id) {
            console.log("\u5f53\u524d qq interstitialAd_id  \u4e3a\u7a7a");
            callback && callback(false);
            return;
          }
          if ("undefined" == typeof qq) {
            console.log("QQ qq is undefined");
            return;
          }
          self._interstitialAd = qq.createInterstitialAd({
            adUnitId: interstitialAd_id
          });
          self._interstitialAd.onLoad(function() {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u6210\u529f");
            callback && callback(true);
          });
          self._interstitialAd.onError(function(res) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u5931\u8d25");
            console.log("interstitialAd onError ", res);
          });
          self._interstitialAd.onClose(function(data) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u5173\u95ed\u63d2\u5c4f");
            self._interstitialAd.destroy();
            self._interstitialAd = null;
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u91cd\u65b0\u52a0\u8f7d\u63d2\u5c4f");
            self.createInterstitialAd_qq(callback);
            console.log("interstitialAd close ad ", data);
          });
        };
        this.createInterstitialAd_xiaomi = function(callback) {
          var interstitialAd_id = poly_sdk_config.xiaomi.interstitialAd_id;
          var self = this;
          if (!interstitialAd_id || "" == interstitialAd_id) {
            console.log("\u5f53\u524d xiaomi interstitialAd_id  \u4e3a\u7a7a");
            callback && callback(false);
            return;
          }
          self._interstitialAd = qg.createInterstitialAd({
            adUnitId: interstitialAd_id
          });
          self._interstitialAd.onLoad(function() {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u6210\u529f");
            callback && callback(true);
          });
          self._interstitialAd.onError(function(res) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u52a0\u8f7d\u5931\u8d25");
            console.log("interstitialAd onError ", res);
          });
          self._interstitialAd.onClose(function(data) {
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u5173\u95ed\u63d2\u5c4f");
            self._interstitialAd.destroy();
            self._interstitialAd = null;
            console.log("\u63d2\u5c4f\u5e7f\u544a----\u91cd\u65b0\u52a0\u8f7d\u63d2\u5c4f");
            self.createInterstitialAd_xiaomi(callback);
            console.log("interstitialAd close ad ", data);
          });
        };
        this.createInterstitialAd_wwz = function(callback) {
          wwz.LY_hdgg_entrance_custom_style.width = "100%";
          wwz.LY_hdgg_entrance_custom_style.height = "100%";
          wwz.LY_hdgg_entrance_custom_style.top = "0%";
          wwz.LY_hdgg_entrance_custom_style.display = "none";
          wwz.LY_InterstitialAdImg_style.position = "absolute";
          wwz.LY_InterstitialAdImg_style.top = "30%";
          wwz.LY_InterstitialAdImg_style.left = "15%";
          wwz.LY_InterstitialAdImg_style.width = "70%";
          wwz.LY_InterstitialAdImg_style.height = "35%";
          wwz.LY_InterstitialAdImg_style.display = "none";
          wwz.btn_close.style.position = "absolute";
          wwz.btn_close.style.top = "70%";
          wwz.btn_close.style.left = "40%";
          wwz.btn_close.style.width = "100%";
          wwz.btn_close.style.height = "100%";
          wwz.btn_close.style.display = "none";
          self._interstitialAd = {
            show: function show() {
              wwz.LY_hdgg_entrance_custom_style.display = "block";
              wwz.LY_InterstitialAdImg_style.display = "block";
              wwz.btn_close.style.display = "block";
            }
          };
          null != self._interstitialAd && self._interstitialAd.show();
          console.log("createInterstitialAd_wwz  OK");
        };
        return instance = this;
      };
      return InterstitialAd;
    }();
    var VideoAd = function() {
      var instance;
      var VideoAd = function VideoAd() {
        if (instance) return instance;
        this._ios_isvideo_move = false;
        this._android_isvideo_move = false;
        this._adjuzsdk = null;
        this.wifikey_isvideo_move = false;
        var self = this;
        this.createRewardedVideoAd = function(void_index, onSuccess, onCancel, onLoad) {
          console.log("createRewardedVideoAd start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            this.createRewardedVideoAd_qq(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.createRewardedVideoAd_tt(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            this.createRewardedVideoAd_vivo(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            this.createRewardedVideoAd_xiaomi(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            this.createRewardedVideoAd_baidu(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            this.createRewardedVideoAd_oppo(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            this.createRewardedVideoAd_weixin(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_qtt:
            if ("undefined" == typeof qttGame) {
              console.log("qtt qttGame is undefined");
              return;
            }
            this.createRewardedVideoAd_qtt(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_jikewan:
            if ("undefined" == typeof AdSDK) {
              console.log("\u5373\u523b\u73a9 AdSDK is undefined");
              return;
            }
            this.createRewardedVideoAd_jikewan(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_4399:
            if ("undefined" == typeof h5api) {
              console.log("4399 h5api is undefined");
              return;
            }
            this.createRewardedVideoAd_4399(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_ios:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_IOS) {
              console.log("\u539f\u751f IOS \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.createRewardedVideoAd_ios(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
           case poly_sdk_config.sdk_key_CSJ:
           case poly_sdk_config.sdk_key_GDT:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.createRewardedVideoAd_android(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_wangmai:
            if ("undefined" == typeof WMAds) {
              console.log("\u65fa\u8109 WMAds is undefined");
              return;
            }
            this.createRewardedVideoAd_wangmai(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_juzhang:
            if (!cc.LieYingSDK.PolySDK.adjuzsdk || "undefined" == typeof cc.LieYingSDK.PolySDK.adjuzsdk) {
              console.log("\u5de8\u638c adjuzsdk is undefined");
              return;
            }
            this.createRewardedVideoAd_juzhang(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_h5:
            onSuccess && onSuccess();
            break;

           case poly_sdk_config.sdk_key_360:
            if ("undefined" == typeof qh) {
              console.log("360 adjuzsdk is undefined");
              return;
            }
            this.createRewardedVideoAd_360(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_wifikey:
            if ("undefined" == typeof wifikey) {
              console.log("\u4e07\u80fd\u94a5\u5319 wifikey  is undefined");
              return;
            }
            this.createRewardedVideoAd_wifikey(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_baoqu:
            if ("undefined" == typeof CPSDK) {
              console.log("360 CPSDK is undefined");
              return;
            }
            this.createRewardedVideoAd_baoqu(void_index, onSuccess, onCancel, onLoad);
            break;

           case poly_sdk_config.sdk_key_wwz:
            onSuccess && onSuccess();
            break;

           case poly_sdk_config.sdk_key_ks:
            if (!cc.LieYingSDK.PolySDK.kssdk || "undefined" == typeof cc.LieYingSDK.PolySDK.kssdk) {
              console.log("\u5feb\u624b\u5c0f\u6e38\u620f kssdk is undefined");
              return;
            }
            this.createRewardedVideoAd_ks(void_index, onSuccess, onCancel, onLoad);
            break;

           default:
            onLoad && onLoad(false);
            console.log(poly_sdk_config.runSDK + " is not undefined By VideoAd");
          }
        };
        this.getVideoAdNumber = function(callback) {
          console.log("getVideoAdNumber start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_4399:
            if ("undefined" == typeof h5api) {
              console.log("4399 h5api is undefined");
              return;
            }
            this.getVideoAdNumber_4399(callback);
            break;

           case poly_sdk_config.sdk_key_ios:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_IOS) {
              console.log("\u539f\u751f IOS \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_wangmai:
            if ("undefined" == typeof WMAds) {
              console.log("\u65fa\u8109 WMAds is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_juzhang:
            if (!cc.LieYingSDK.PolySDK.adjuzsdk || "undefined" == typeof cc.LieYingSDK.PolySDK.adjuzsdk) {
              console.log("\u5de8\u638c adjuzsdk is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_h5:
            break;

           case poly_sdk_config.sdk_key_360:
            if ("undefined" == typeof qh) {
              console.log("360 adjuzsdk is undefined");
              return;
            }
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By VideoAd");
          }
        }, this.createRewardedVideoAd_tt = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.tt.video_id[void_index];
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d \u5934\u6761 voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if ("undefined" != typeof tt) {
            var close_listener = function close_listener(req) {
              if (req && req.isEnded) {
                if (onSuccess) {
                  self.sendVideopush(1, void_index);
                  onSuccess();
                }
              } else if (onCancel) {
                self.sendVideopush(2, void_index);
                onCancel();
              }
              videoAd.offClose && videoAd.offClose(close_listener);
            };
            var videoAd = tt.createRewardedVideoAd({
              adUnitId: voidid
            });
            videoAd.load().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u6210\u529f");
              videoAd.show().then(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u6210\u529f");
                onLoad && onLoad(true);
              })["catch"](function(err) {
                self.sendVideopush(0, void_index);
                console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u5931\u8d25:" + err.errMsg);
                onLoad && onLoad(false);
              });
            })["catch"](function(err) {
              self.sendVideopush(0, void_index);
              console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u5931\u8d25:" + err.errMsg);
              onLoad && onLoad(false);
            });
            videoAd.onClose(close_listener);
          } else {
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            console.log("tt is undefined");
          }
        };
        this.createRewardedVideoAd_qq = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.qq.video_id[void_index];
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d QQ voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          var videoAd = qq.createRewardedVideoAd({
            adUnitId: voidid
          });
          videoAd.onError(function(res) {
            console.log("videoAd onError", res);
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
          });
          function close_listener(req) {
            if (req && req.isEnded) {
              if (onSuccess) {
                console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(1, void_index);
                onSuccess();
              }
            } else if (onCancel) {
              console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
              self.sendVideopush(2, void_index);
              onCancel();
            }
            videoAd.offClose && videoAd.offClose(close_listener);
          }
          videoAd.onClose(close_listener);
          videoAd.load().then(function() {
            console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u6210\u529f");
            videoAd.show().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u6210\u529f");
              onLoad && onLoad(true);
            })["catch"](function(err) {
              self.sendVideopush(0, void_index);
              console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u5931\u8d25");
              onLoad && onLoad(false);
            });
          })["catch"](function(err) {
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u5931\u8d25");
          });
        };
        this.createRewardedVideoAd_vivo = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.vivo.video_id[void_index];
          var self = this;
          console.log("onLoad = " + onLoad);
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d vivo voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          try {
            if ("undefined" != typeof qg) {
              var close_listener = function close_listener(req) {
                if (req && req.isEnded) {
                  if (onSuccess) {
                    console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                    self.sendVideopush(1, void_index);
                    onSuccess();
                  }
                } else if (onCancel) {
                  console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                  self.sendVideopush(2, void_index);
                  onCancel();
                }
                rewardedVideoAd.offClose && rewardedVideoAd.offClose(close_listener);
              };
              console.log("createRewardedVideoAd_vivo = " + qg.createRewardedVideoAd);
              var rewardedVideoAd;
              if (qg.createRewardedVideoAd) rewardedVideoAd = qg.createRewardedVideoAd({
                posId: voidid
              }); else {
                self.sendVideopush(0, void_index);
                qg.showToast({
                  message: "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210"
                });
                onLoad && onLoad(false);
              }
              rewardedVideoAd.onError(function(err) {
                if (err && -3 == err.errCode) return;
                self.sendVideopush(0, void_index);
                qg.showToast({
                  message: "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210"
                });
                onLoad && onLoad(false);
              });
              rewardedVideoAd.load().then(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u6210\u529f");
                rewardedVideoAd.show().then(function() {
                  console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u6210\u529f");
                  onLoad && onLoad(true);
                })["catch"](function(err) {
                  console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u5931\u8d25", err);
                  self.sendVideopush(0, void_index);
                  qg.showToast({
                    message: "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210"
                  });
                  onLoad && onLoad(false);
                });
              })["catch"](function(err) {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25", err);
                self.sendVideopush(0, void_index);
                qg.showToast({
                  message: "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210"
                });
                onLoad && onLoad(false);
              });
              rewardedVideoAd.onClose(close_listener);
            } else {
              console.log("qg is undefined");
              self.sendVideopush(0, void_index);
              qg.showToast({
                message: "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210"
              });
              onLoad && onLoad(false);
            }
          } catch (error) {
            onLoad && onLoad(false);
          }
        };
        this.createRewardedVideoAd_baidu = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.baidu.video_id[void_index];
          var self = this;
          if (!poly_sdk_config.baidu.appSid || "" == poly_sdk_config.baidu.appSid) {
            console.log("\u5f53\u524d \u767e\u5ea6 appSid (\u767d\u9752\u85e4 \u5e94\u7528\u7ba1\u7406 ID) \u4e3a\u7a7a");
            self.sendVideopush(0, void_index, 1);
            onLoad && onLoad(false);
            return;
          }
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d \u767e\u5ea6 voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if ("undefined" != typeof swan) {
            var close_listener = function close_listener(req) {
              if (req && req.isEnded) {
                if (onSuccess) {
                  console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                  self.sendVideopush(1, void_index);
                  onSuccess();
                }
              } else if (onCancel) {
                console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(2, void_index);
                onCancel();
              }
              rewardedVideoAd.offClose && rewardedVideoAd.offClose(close_listener);
            };
            console.log("createRewardedVideoAd_baidu");
            var rewardedVideoAd;
            rewardedVideoAd = swan.createRewardedVideoAd({
              adUnitId: voidid,
              appSid: poly_sdk_config.baidu.appSid
            });
            rewardedVideoAd.load().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u6210\u529f");
              rewardedVideoAd.show().then(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u6210\u529f");
                onLoad && onLoad(true);
              })["catch"](function(err) {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u5931\u8d25", err);
                self.sendVideopush(0, void_index);
                onLoad && onLoad(false);
              });
            })["catch"](function(err) {
              console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25", err);
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
            });
            rewardedVideoAd.onClose(close_listener);
          } else {
            console.log("swan is undefined");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
          }
        };
        this.createRewardedVideoAd_xiaomi = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.xiaomi.video_id[void_index];
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d \u5c0f\u7c73 voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if ("undefined" != typeof qg) {
            var close_listener = function close_listener(req) {
              if (req && req.isEnded) {
                if (onSuccess) {
                  console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                  self.sendVideopush(1, void_index);
                  onSuccess();
                }
              } else if (onCancel) {
                console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(2, void_index);
                onCancel();
              }
              rewardedVideoAd.offClose && rewardedVideoAd.offClose(close_listener);
            };
            console.log("createRewardedVideoAd_xiaomi");
            var rewardedVideoAd;
            rewardedVideoAd = qg.createRewardedVideoAd({
              adUnitId: voidid
            });
            rewardedVideoAd.load().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u6210\u529f");
              rewardedVideoAd.show().then(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u6210\u529f");
                onLoad && onLoad(true);
              })["catch"](function(err) {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u663e\u793a\u5931\u8d25", err);
                self.sendVideopush(0, void_index);
                onLoad && onLoad(false);
              });
            })["catch"](function(err) {
              console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25", err);
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
            });
            rewardedVideoAd.onClose(close_listener);
          } else {
            console.log("qg is undefined");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
          }
        };
        this.createRewardedVideoAd_oppo = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.oppo.video_id[void_index];
          var self = this;
          if (!poly_sdk_config.oppo.AppID || "" == poly_sdk_config.oppo.AppID) {
            console.log("\u5f53\u524d oppo AppID  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d oppo voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          var rewardedVideoAd;
          qg.initAdService({
            appId: poly_sdk_config.oppo.AppID,
            isDebug: true,
            success: function success(res) {
              rewardedVideoAd = qg.createRewardedVideoAd({
                posId: voidid
              });
              rewardedVideoAd.load();
              rewardedVideoAd.onLoad(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u6210\u529f");
                rewardedVideoAd.show();
              });
              rewardedVideoAd.onVideoStart(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891 \u5f00\u59cb\u64ad\u653e");
                onLoad && onLoad(true);
              });
              rewardedVideoAd.onError(function(err) {
                console.log("\u6fc0\u52b1\u89c6\u9891\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25", err);
                self.sendVideopush(0, void_index);
                onLoad && onLoad(false);
              });
              function close_listener(req) {
                if (req && req.isEnded) {
                  if (onSuccess) {
                    console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                    self.sendVideopush(1, void_index);
                    onSuccess();
                  }
                } else if (onCancel) {
                  console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                  self.sendVideopush(2, void_index);
                  onCancel();
                }
                rewardedVideoAd.destroy && rewardedVideoAd.destroy();
              }
              rewardedVideoAd.onClose(close_listener);
            },
            fail: function fail(res) {
              console.log("fail:" + res.code + res.msg);
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
            },
            complete: function complete(res) {
              try {
                console.log("complete" + JSON.stringify(res));
              } catch (error) {
                self.sendVideopush(0, void_index);
                onLoad && onLoad(false);
              }
            }
          });
        };
        this.createRewardedVideoAd_weixin = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.weixin.video_id[void_index];
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d weixin voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if ("undefined" != typeof wx) {
            var close_listener = function close_listener(req) {
              if (req && req.isEnded) {
                if (onSuccess) {
                  console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                  self.sendVideopush(1, void_index);
                  onSuccess();
                }
              } else if (onCancel) {
                console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(2, void_index);
                onCancel();
              }
              rewardedVideoAd.offClose && rewardedVideoAd.offClose(close_listener);
            };
            var rewardedVideoAd = wx.createRewardedVideoAd({
              adUnitId: voidid
            });
            rewardedVideoAd.load().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u6210\u529f");
              rewardedVideoAd.show().then(function() {
                console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u6210\u529f");
                onLoad && onLoad(true);
              })["catch"](function(err) {
                self.sendVideopush(0, void_index);
                console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u5931\u8d25");
                onLoad && onLoad(false);
              });
            })["catch"](function(err) {
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
              console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u5931\u8d25");
            });
            rewardedVideoAd.onClose(close_listener);
            rewardedVideoAd.onError(function callback(res) {
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
              console.log("onError  = " + JSON.stringify(res));
            });
          } else {
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            console.log("wx is undefined");
          }
        };
        this.createRewardedVideoAd_qtt = function(void_index, onSuccess, onCancel, onLoad) {
          var options = {};
          options.gametype = 1;
          options.rewardtype = 1;
          options.data = {};
          options.data.title = "\u5237\u65b0\u9053\u5177";
          options.data.url = "//newidea4-gamecenter-frontend.1sapp.com/game/prod/fkxxl_img/1.png";
          options.callback = function(res) {
            if (1 == res) {
              console.log("showVideo  onSuccess  res = " + res);
              self.sendVideopush(1, void_index);
              onSuccess && onSuccess();
            } else {
              console.log("showVideo  onCancel  res = " + res);
              self.sendVideopush(1, void_index);
              onSuccess && onSuccess();
            }
          };
          qttGame.showHDAD(options);
        };
        this.createRewardedVideoAd_4399 = function(void_index, onSuccess, onCancel, onLoad) {
          var self = this;
          if ("undefined" != typeof h5api && null != h5api) h5api.canPlayAd(function(data) {
            console.log("\u662f\u5426\u53ef\u64ad\u653e\u5e7f\u544a", data.canPlayAd, "\u5269\u4f59\u6b21\u6570", data.remain);
            if (data.remain >= 1) data.canPlayAd && h5api.playAd(function(obj) {
              console.log("\u4ee3\u7801:" + obj.code + ",\u6d88\u606f:" + obj.message);
              if (1e4 === obj.code) onLoad && onLoad(true); else if (10001 === obj.code) {
                console.log("\u64ad\u653e\u7ed3\u675f");
                self.sendVideopush(1, void_index);
                onSuccess && onSuccess();
              } else {
                console.log("\u5e7f\u544a\u5f02\u5e38");
                self.sendVideopush(2, void_index);
                onCancel && onCancel(obj.message, true);
              }
            }); else {
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false, "\u4eca\u65e5\u5e7f\u544a\u6b21\u6570\u7528\u5b8c!");
            }
          }); else {
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false, "\u4eca\u65e5\u5e7f\u544a\u6b21\u6570\u7528\u5b8c!");
            console.log("4399 h5api is undefined");
          }
        };
        this.createRewardedVideoAd_jikewan = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.jikewan.video_id[void_index];
          var video_adId = poly_sdk_config.jikewan.video_adId[void_index];
          var self = this;
          if (!poly_sdk_config.jikewan.screenOrientation || "" == poly_sdk_config.jikewan.screenOrientation) {
            console.log("\u5f53\u524d jikewan screenOrientation  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d jikewan voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if (!video_adId || "" == video_adId) {
            console.log("\u5f53\u524d jikewan video_adId  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          AdSDK.init();
          var videoAd = AdSDK.createRewardedVideoAd(video_adId, void_index, poly_sdk_config.jikewan.screenOrientation);
          var isEnded = false;
          videoAd.onLoad(function(param) {
            console.log("rewardedvideoAd\xa0onLoad\xa0~ param = ", param);
            videoAd.show().then(function(res) {
              isEnded = true;
              onLoad && onLoad(true);
            }, function(err) {
              console.log("videoAd\xa01\xa0\u5e7f\u544a\u663e\u793a\u5931\u8d25 err = " + err);
              isEnded = false;
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false, "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210");
            });
          });
          function close_listener(req) {
            console.log("onClose  req = " + req);
            if (isEnded) {
              if (onSuccess) {
                console.log("videoAd\xa01\xa0\u5e7f\u544a\u663e\u793a\u6210\u529f\uff01");
                self.sendVideopush(1, void_index);
                onSuccess();
              }
            } else if (onCancel) {
              console.log("videoAd\xa0\u4e2d\u9014\u9000\u51fa\uff01");
              self.sendVideopush(2, void_index);
              onCancel();
            }
            try {
              videoAd.offClose && videoAd.offClose(close_listener);
              videoAd.destroy && videoAd.destroy();
            } catch (error) {
              console.log("offClose or destroy err = " + error);
            }
          }
          videoAd.onClose(close_listener);
          videoAd.onError(function(param) {
            console.log("onError param = " + param);
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false, "\u6682\u65e0\u5e7f\u544a,\u6216\u64ad\u653e\u672a\u5b8c\u6210");
          });
        };
        this.createRewardedVideoAd_ios = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.ios.video_id[void_index];
          console.log("createRewardedVideoAd_ios  voidid = " + voidid + "    this._ios_isvideo_move = " + this._ios_isvideo_move);
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d ios voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          if (this._ios_isvideo_move) {
            console.log("\u5f53\u524d\u8fd8\u6709\u672a\u64ad\u653e\u5b8c\u5f97\u89c6\u9891");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          cc.LY_SDK_Native_createVideo_Callback = function(iswin) {
            console.log("start \u521b\u5efa\u56de\u8c03 cc.LY_SDK_Native_createVideo_Callback  iswin = " + iswin);
            if ("true" == iswin) {
              console.log("LY_SDK_Native_createVideo_Callback  true");
              jsb.reflection.callStaticMethod(poly_sdk_config.ios.interface_path, "showAdRewardinRootViewScreenId");
            } else {
              self.sendVideopush(0, void_index);
              console.log("LY_SDK_Native_createVideo_Callback  false");
              self._ios_isvideo_move = false;
              console.log("self._ios_isvideo_move = " + self._ios_isvideo_move);
            }
            onLoad && onLoad(iswin);
          };
          cc.LY_SDK_Native_showVideo_Callback = function(iswin) {
            console.log("start \u663e\u793a\u56de\u8c03 cc.LY_SDK_Native_showVideo_Callback  iswin = " + iswin);
            self._ios_isvideo_move = false;
            if ("true" == iswin) {
              console.log("LY_SDK_Native_showVideo_Callback  true");
              self.sendVideopush(1, void_index);
              onSuccess && onSuccess();
            } else {
              console.log("LY_SDK_Native_showVideo_Callback  false");
              self.sendVideopush(2, void_index);
              onCancel && onCancel();
            }
            console.log("self._ios_isvideo_move = " + self._ios_isvideo_move);
          };
          try {
            this._ios_isvideo_move = true;
            console.log("\u5f00\u59cb\u8c03\u7528 ios creatAdRewardinRootViewScreenId  voidid = " + voidid);
            jsb.reflection.callStaticMethod(poly_sdk_config.ios.interface_path, "creatAdRewardinRootViewScreenId:", voidid);
          } catch (error) {
            self.sendVideopush(0, void_index);
            console.log("\u8c03\u7528 ios creatAdRewardinRootViewScreenId error = " + JSON.stringify(error));
            this._ios_isvideo_move = false;
          }
        };
        this.createRewardedVideoAd_android = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = null;
          var path = null;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_android:
            voidid = poly_sdk_config.android.video_id[void_index];
            path = poly_sdk_config.android.interface_path;
            break;

           case poly_sdk_config.sdk_key_yungao:
            voidid = poly_sdk_config.yungao.video_id[void_index];
            path = poly_sdk_config.yungao.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_360:
            voidid = poly_sdk_config.android_360.video_id[void_index];
            path = poly_sdk_config.android_360.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_oppo:
            voidid = poly_sdk_config.android_oppo.video_id[void_index];
            path = poly_sdk_config.android_oppo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_tap:
            voidid = poly_sdk_config.android_tap.video_id[void_index];
            path = poly_sdk_config.android_tap.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_vivo:
            voidid = poly_sdk_config.android_vivo.video_id[void_index];
            path = poly_sdk_config.android_vivo.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_yyb:
            voidid = poly_sdk_config.android_yyb.video_id[void_index];
            path = poly_sdk_config.android_yyb.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_jiuyou:
            voidid = poly_sdk_config.android_jiuyou.video_id[void_index];
            path = poly_sdk_config.android_jiuyou.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_huawei:
            voidid = poly_sdk_config.android_huawei.video_id[void_index];
            path = poly_sdk_config.android_huawei.interface_path;
            break;

           case poly_sdk_config.sdk_key_haoYouKuaiBao:
            voidid = poly_sdk_config.haoYouKuaiBao.video_id[void_index];
            path = poly_sdk_config.haoYouKuaiBao.interface_path;
            break;

           case poly_sdk_config.sdk_key_yunYouXi:
            voidid = poly_sdk_config.yunYouXi.video_id[void_index];
            path = poly_sdk_config.yunYouXi.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_4399:
            voidid = poly_sdk_config.android_4399.video_id[void_index];
            path = poly_sdk_config.android_4399.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_haixin:
            voidid = poly_sdk_config.android_haixin.video_id[void_index];
            path = poly_sdk_config.android_haixin.interface_path;
            break;

           case poly_sdk_config.sdk_key_android_Lenovo:
            voidid = poly_sdk_config.android_Lenovo.video_id[void_index];
            path = poly_sdk_config.android_Lenovo.interface_path;
            break;

           case poly_sdk_config.sdk_key_CSJ:
            voidid = poly_sdk_config.CSJ.video_id[void_index];
            path = poly_sdk_config.CSJ.interface_path;
            break;

           case poly_sdk_config.sdk_key_GDT:
            voidid = poly_sdk_config.GDT.video_id[void_index];
            path = poly_sdk_config.GDT.interface_path;
            break;

           default:
            onLoad && onLoad(false);
            console.log(poly_sdk_config.runSDK + " is not undefined By VideoAd");
          }
          console.log("createRewardedVideoAd_android  voidid = " + voidid + poly_sdk_config.runSDK + " _isvideo_move = " + this._android_isvideo_move);
          var self = this;
          if (!voidid || "" == voidid) {
            self.sendVideopush(0, void_index);
            console.log("\u5f53\u524d " + poly_sdk_config.runSDK + " voidid  \u4e3a\u7a7a");
            onLoad && onLoad(false);
            return;
          }
          cc.LY_SDK_Native_createVideo_Callback = function(iswin) {
            console.log("start \u521b\u5efa\u56de\u8c03 cc.LY_SDK_Native_createVideo_Callback  iswin = " + iswin);
            if ("true" == iswin) {
              console.log("LY_SDK_Native_createVideo_Callback  true");
              jsb.reflection.callStaticMethod(path, "showRewardedVideoAd", "()V");
            } else {
              self.sendVideopush(0, void_index);
              console.log("LY_SDK_Native_createVideo_Callback  false");
              self._android_isvideo_move = false;
              console.log("self._android_isvideo_move = " + self._android_isvideo_move);
            }
            onLoad && onLoad(iswin);
          };
          cc.LY_SDK_Native_showVideo_Callback = function(iswin) {
            console.log("start \u663e\u793a\u56de\u8c03 cc.LY_SDK_Native_showVideo_Callback  iswin = " + iswin);
            self._android_isvideo_move = false;
            if ("true" == iswin) {
              console.log("LY_SDK_Native_showVideo_Callback  true");
              onSuccess && onSuccess();
            } else {
              console.log("LY_SDK_Native_showVideo_Callback  false");
              onCancel && onCancel();
            }
            console.log("self._android_isvideo_move = " + self._android_isvideo_move);
          };
          try {
            this._android_isvideo_move = true;
            console.log("\u5f00\u59cb\u8c03\u7528" + poly_sdk_config.runSDK + "  createRewardedVideoAd  voidid = " + voidid);
            jsb.reflection.callStaticMethod(path, "createRewardedVideoAd", "(Ljava/lang/String;)V", voidid);
          } catch (error) {
            self.sendVideopush(0, void_index);
            console.log("\u8c03\u7528 " + poly_sdk_config.runSDK + " createRewardedVideoAd error = " + JSON.stringify(error));
            this._android_isvideo_move = false;
          }
        };
        this.createRewardedVideoAd_wangmai = function(void_index, onSuccess, onCancel, onLoad) {
          var _this = this;
          var self = this;
          WMAds.showAd({
            adType: 1,
            engine: "Cocos",
            onSuccess: function onSuccess() {
              console.log("onSuccess");
              onLoad && onLoad(true);
            },
            onClose: function onClose() {
              console.log("onClose");
              _this.sendVideopush(1, void_index);
              onSuccess && onSuccess();
            },
            onVideoComplete: function onVideoComplete() {
              console.log("onVideoComplete");
            },
            onNoAd: function onNoAd() {
              console.log("onNoAd");
              _this.sendVideopush(0, void_index);
              onLoad && onLoad(false);
            }
          });
        };
        this.createRewardedVideoAd_juzhang = function(void_index, onSuccess, onCancel, onLoad) {
          var adtype = Number(poly_sdk_config.juzhang.adType.vertical_Ad);
          console.log("adtype" + adtype);
          cc.LieYingSDK.PolySDK.adjuzsdk.jsOpenAD(adtype, function(res) {
            if (1 == res.status) {
              console.log("\u5e7f\u544a\u5f00\u59cb\u64ad\u653e");
              onLoad && onLoad(true);
              if (1 == res.playStatus) {
                console.log("\u5e7f\u544a\u64ad\u653e\u5b8c\u6bd5");
                self.sendVideopush(1, void_index);
                onSuccess();
              } else {
                console.log("\u5e7f\u544apending");
                self.sendVideopush(2, void_index);
                onCancel();
              }
            } else {
              console.log("\u5e7f\u544a\u64ad\u653e\u5931\u8d25");
              self.sendVideopush(0, void_index);
              onLoad && onLoad(false);
            }
          });
        };
        this.createRewardedVideoAd_360 = function(void_index, onSuccess, onCancel, onLoad) {
          var voidid = poly_sdk_config.sdk360.video_id[void_index];
          var self = this;
          if (!voidid || "" == voidid) {
            console.log("\u5f53\u524d 360 voidid  \u4e3a\u7a7a");
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            return;
          }
          var videoAd = qh.createRewardedVideoAd({
            adUnitId: voidid
          });
          videoAd.onError(function(res) {
            console.log("videoAd onError", res);
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
          });
          function close_listener(req) {
            if (req && req.isEnded) {
              if (onSuccess) {
                console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(1, void_index);
                onSuccess();
              }
            } else if (onCancel) {
              console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
              self.sendVideopush(2, void_index);
              onCancel();
            }
            videoAd.offClose && videoAd.offClose(close_listener);
          }
          videoAd.onClose(close_listener);
          videoAd.load().then(function() {
            console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u6210\u529f");
            videoAd.show().then(function() {
              console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u6210\u529f");
              onLoad && onLoad(true);
            })["catch"](function(err) {
              self.sendVideopush(0, void_index);
              console.log("\u6fc0\u52b1\u89c6\u9891 \u5e7f\u544a\u663e\u793a\u5931\u8d25");
              onLoad && onLoad(false);
            });
          })["catch"](function(err) {
            self.sendVideopush(0, void_index);
            onLoad && onLoad(false);
            console.log("\u6fc0\u52b1\u89c6\u9891\u52a0\u8f7d\u5931\u8d25");
          });
        };
        this.createRewardedVideoAd_wifikey = function(void_index, onSuccess, onCancel, onLoad) {
          if (self.wifikey_isvideo_move) return;
          wifikey.showRewardedVideoAd();
          window.onRewardedVideoAdLoad = function() {
            console.log("onRewardedVideoAdLoad");
          };
          window.onRewardedVideoAdPlay = function(result) {
            console.log("onRewardedVideoAdPlay");
            self.wifikey_isvideo_move = true;
            onLoad && onLoad(true);
          };
          window.onRewardedVideoAdError = function(err) {
            self.sendVideopush(0, void_index);
            console.log("onRewardedVideoAdError:", err);
            onLoad && onLoad(false);
          };
          window.onRewardedVideoAdClose = function(result) {
            self.wifikey_isvideo_move = false;
            if (JSON.parse(result).isEnded) {
              onSuccess && onSuccess();
              self.sendVideopush(1, void_index);
            } else {
              onCancel && onCancel();
              self.sendVideopush(2, void_index);
            }
            console.log("onRewardedVideoAdClose");
          };
        }, this.createRewardedVideoAd_baoqu = function(void_index, onSuccess, onCancel, onLoad) {
          CPSDK.startRewardVideo(function(completed) {
            if (completed) {
              if (onSuccess) {
                console.log("\u6b63\u5e38\u64ad\u653e\u7ed3\u675f\uff0c\u53ef\u4ee5\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
                self.sendVideopush(1, void_index);
                onSuccess();
              }
            } else if (onCancel) {
              console.log("\u64ad\u653e\u4e2d\u9014\u9000\u51fa\uff0c\u4e0d\u4e0b\u53d1\u6e38\u620f\u5956\u52b1");
              self.sendVideopush(2, void_index);
              onCancel();
            }
          });
        };
        this.createRewardedVideoAd_ks = function(void_index, onSuccess, onCancel, onLoad) {
          cc.LieYingSDK.PolySDK.kssdk("isAdReady", {
            adType: poly_sdk_config.ks.adType.video_Ad
          });
          window.onAdReady = function(adType, isReady) {
            isReady && cc.LieYingSDK.PolySDK.kssdk("showAd", {
              adType: adType
            });
          };
          window.onAdAwardResult = function(awardSuc) {
            awardSuc ? onSuccess && onSuccess() : onCancel && onCancel();
          };
          window.onAdClose = function(adType, closeType) {
            alert("adType:\xa0".concat(adType, ",closeType:\xa0").concat(closeType));
          };
        };
        this.getVideoAdNumber_4399 = function(callback) {
          "undefined" != typeof h5api && h5api.canPlayAd(function(data) {
            console.log("\u662f\u5426\u53ef\u64ad\u653e\u5e7f\u544a", data.canPlayAd, "\u5269\u4f59\u6b21\u6570", data.remain);
            callback && callback(data.remain);
          });
        };
        this.sendVideopush = function(isend, void_index, callback) {
          if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
            console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By sendVideopush");
            return;
          }
          var channel_id = poly_sdk_config[poly_sdk_config.runSDK].type;
          var game_id = poly_sdk_config.game_id;
          var token = poly_sdk_config.HTTPtoken;
          var display_id = poly_sdk_config.userLoginData.display_id || "000000";
          var conf_video = poly_sdk_config[poly_sdk_config.runSDK].video_id;
          var voidid = conf_video && conf_video[void_index] || poly_sdk_config.default_video_id;
          if ("undefined" == typeof channel_id || null == channel_id || "undefined" == typeof game_id || null == game_id || "undefined" == typeof display_id || null == display_id || "undefined" == typeof token || null == token || "undefined" == typeof isend || null == isend || "undefined" == typeof voidid || null == voidid) {
            console.log("sendVideopush sendRequest Err : channel_id || game_id || display_id || token  ||  isend || voidid  \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
            callback && callback(false, null);
            return;
          }
          var resData = {
            token: token,
            game_id: game_id,
            channel_id: channel_id,
            display_id: display_id,
            isend: isend,
            advert_id: voidid,
            address_id: void_index
          };
          tools.sendRequest(poly_sdk_config.videopushUrl, resData, function(data) {
            if (data && 200 == data.errorcode) {
              console.log("sendVideopush sendRequest success");
              callback && callback(true, data);
            } else {
              console.log("sendVideopush sendRequest failure  data = " + JSON.stringify(data));
              callback && callback(false, data);
            }
          });
        };
        return instance = this;
      };
      return VideoAd;
    }();
    var NativeAd = function() {
      var instance;
      var NativeAd = function NativeAd() {
        if (instance) return instance;
        var self = this;
        this.createNativeAd = function(native_index, onSuccess, onCancel) {
          console.log("createRewardedVideoAd start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            this.createNativeAd_vivo(native_index, onSuccess, onCancel);
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_wangmai:
            if ("undefined" == typeof WMAds) {
              console.log("\u65fa\u8109 WMAds is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_qtt:
            if ("undefined" == typeof qttGame) {
              console.log("qtt qttGame is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_jikewan:
            if ("undefined" == typeof AdSDK) {
              console.log("\u5373\u523b\u73a9 AdSDK is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_4399:
           case poly_sdk_config.sdk_key_4399:
            if ("undefined" == typeof h5api) {
              console.log("4399 h5api is undefined");
              return;
            }
            break;

           default:
            onLoad && onLoad(false);
            console.log(poly_sdk_config.runSDK + " is not undefined By createNativeAd");
          }
        };
        this.createNativeAd_vivo = function(native_index, onSuccess, onCancel) {
          var nativeid = poly_sdk_config.vivo.native_id[native_index];
          var self = this;
          if (!nativeid || "" == nativeid) {
            console.log("\u5f53\u524d vivo nativeid  \u4e3a\u7a7a");
            onCancel && onCancel();
            return;
          }
          var nativeAd;
          var nativeCurrentAdList;
          function init() {
            nativeAd = qg.createNativeAd({
              posId: nativeid
            });
            nativeAd.onLoad(function(res) {
              qg.showToast({
                message: "\u539f\u751f\u5e7f\u544a\u52a0\u8f7d\u5b8c\u6210"
              });
              console.log("\u539f\u751f\u5e7f\u544a\u52a0\u8f7d\u5b8c\u6210", JSON.stringify(res));
              if (res && res.adList) {
                nativeCurrentAdList = res.adList.pop();
                nativeAd.reportAdClick({
                  adId: nativeCurrentAdList.adId.toString()
                });
                onSuccess && onSuccess();
              }
            });
            nativeAd.onError(function(err) {
              switch (err.errCode) {
               case -3:
                console.log("\u539f\u751f\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25---\u8c03\u7528\u592a\u9891\u7e41", JSON.stringify(err));
                qg.showToast({
                  message: "\u539f\u751f\u5e7f\u544a\u52a0\u8f7d\u5931\u8d25---\u8c03\u7528\u592a\u9891\u7e41"
                });
                onCancel && onCancel();
                break;

               default:
                console.log("\u539f\u751f\u5e7f\u544a\u5c55\u793a\u5931\u8d25");
                console.log(JSON.stringify(err));
                qg.showToast({
                  message: "\u539f\u751f\u5e7f\u544a\u5c55\u793a\u5931\u8d25"
                });
                onCancel && onCancel();
              }
            });
          }
          function load() {
            var adLoad = nativeAd.load();
            adLoad && adLoad.then(function() {
              qg.showToast({
                message: "\u52a0\u8f7d\u6210\u529f"
              });
              return;
            })["catch"](function(err) {
              console.log("\u52a0\u8f7d\u5931\u8d25", JSON.stringify(err));
              onCancel && onCancel();
            });
          }
          init();
          load();
        };
        return instance = this;
      };
      return NativeAd;
    }();
    var Share = function() {
      var instance;
      var Share = function Share() {
        if (instance) return instance;
        var self = this;
        this.share = function(onSuccess, onFail, shareTitle, shareImgUrl, shareDescription, shareUrl, shareScene) {
          console.log("Share start runSDK = " + poly_sdk_config.runSDK + "  shareTitle = " + shareTitle + "  shareImgUrl = " + shareImgUrl);
          var shareTitle = void 0 != shareTitle ? shareTitle : poly_sdk_config.shareTitle;
          var shareImgUrl = void 0 != shareImgUrl ? shareImgUrl : poly_sdk_config.shareImgUrl;
          var shareDescription = void 0 != shareDescription ? shareDescription : poly_sdk_config.shareDescription;
          var shareUrl = void 0 != shareUrl ? shareUrl : poly_sdk_config.shareUrl;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            this.shareAppMessage_qq(onSuccess, onFail, shareTitle, shareImgUrl);
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.shareAppMessage_tt(onSuccess, onFail, shareTitle, shareImgUrl);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            this.shareAppMessage_baidu(onSuccess, onFail, shareTitle, shareImgUrl);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            this.shareAppMessage_wx(onSuccess, onFail, shareTitle, shareImgUrl);
            break;

           case poly_sdk_config.sdk_key_android:
           case poly_sdk_config.sdk_key_yungao:
           case poly_sdk_config.sdk_key_android_yyb:
           case poly_sdk_config.sdk_key_android_tap:
           case poly_sdk_config.sdk_key_android_360:
           case poly_sdk_config.sdk_key_android_oppo:
           case poly_sdk_config.sdk_key_android_vivo:
           case poly_sdk_config.sdk_key_android_jiuyou:
           case poly_sdk_config.sdk_key_android_huawei:
           case poly_sdk_config.sdk_key_haoYouKuaiBao:
           case poly_sdk_config.sdk_key_yunYouXi:
           case poly_sdk_config.sdk_key_android_4399:
           case poly_sdk_config.sdk_key_android_haixin:
           case poly_sdk_config.sdk_key_android_Lenovo:
           case poly_sdk_config.sdk_key_CSJ:
           case poly_sdk_config.sdk_key_GDT:
            if (!cc || !cc.sys.isNative || cc.sys.os != cc.sys.OS_ANDROID) {
              console.log(poly_sdk_config.runSDK + " \u5b89\u5353 \u521d\u59cb\u5316 \u73af\u5883\u5931\u8d25! ");
              return;
            }
            this.shareAppMessage_android(onSuccess, onFail, shareTitle, shareDescription, shareUrl, shareScene);
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By Share");
          }
        };
        this.shareAppMessage_tt = function(_success, _fail, shareTitle, shareImgUrl) {
          if ("undefined" != typeof tt) {
            self._isShare = true;
            tt.shareAppMessage({
              title: shareTitle,
              imageUrl: shareImgUrl,
              success: function success(data) {
                console.log(data);
                self._isShare = false;
                _success && _success();
              },
              fail: function fail(data) {
                console.log(data);
                self._isShare = false;
                _fail && _fail();
              }
            });
          } else console.log("tt is undefined");
        };
        this.shareAppMessage_qq = function(_success2, _fail2, shareTitle, shareImgUrl) {
          if ("undefined" != typeof wx) {
            self._isShare = true;
            wx.shareAppMessage({
              title: shareTitle,
              imageUrl: shareImgUrl,
              success: function success(data) {
                console.log(data);
                self._isShare = false;
                _success2 && _success2();
              },
              fail: function fail(data) {
                console.log(data);
                self._isShare = false;
                _fail2 && _fail2();
              }
            });
          }
        };
        this.shareAppMessage_baidu = function(_success3, _fail3, shareTitle, shareImgUrl) {
          if ("undefined" != typeof swan) {
            self._isShare = true;
            swan.shareAppMessage({
              title: shareTitle,
              imageUrl: shareImgUrl,
              success: function success(data) {
                console.log(data);
                self._isShare = false;
                cc.LieYingSDK.DAO.SystemDAO.sharetask();
                _success3 && _success3();
              },
              fail: function fail(data) {
                console.log(data);
                self._isShare = false;
                _fail3 && _fail3();
              }
            });
          } else console.log("swan is undefined");
        };
        this.shareAppMessage_wx = function(success, fail, shareTitle, shareImgUrl) {
          if ("undefined" != typeof wx) {
            self._isShare = true;
            success && success();
            wx.shareAppMessage({
              title: shareTitle,
              imageUrl: shareImgUrl
            });
          }
        };
        this.shareAppMessage_android = function(success, fail, shareTitle, description, shareUrl, shareScene) {
          var path = null;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_android:
            path = poly_sdk_config.android.interface_path;
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By VideoAd");
          }
          console.log("createRewardedVideoAd_android  shareTitle = " + shareTitle + " description = " + description + "  shareUrl = " + shareUrl + "  shareScene = " + shareScene);
          var self = this;
          console.log("\u6211\u662f\u6700\u65b0\u7684\u4ee3\u7801\uff01\uff01\uff01");
          cc.LY_SDK_Native_share_Callback = function(iswin) {
            console.log("start \u521b\u5efa\u56de\u8c03 cc.LY_SDK_Native_createVideo_Callback  iswin = " + iswin);
            if ("true" == iswin) {
              console.log("LY_SDK_Native_share_Callback  true");
              success && success();
            } else {
              console.log("LY_SDK_Native_share_Callback  false");
              fail && fail();
            }
          };
          try {
            this._android_isvideo_move = true;
            console.log("\u5f00\u59cb\u8c03\u7528" + poly_sdk_config.runSDK + "  share ");
            jsb.reflection.callStaticMethod(path, "share", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", shareTitle, description, shareUrl, shareScene);
          } catch (error) {
            console.log("\u8c03\u7528 " + poly_sdk_config.runSDK + " createRewardedVideoAd error = " + JSON.stringify(error));
            this._android_isvideo_move = false;
          }
        };
        return instance = this;
      };
      return Share;
    }();
    var Recorder = function() {
      var instance;
      var Recorder = function Recorder() {
        if (instance) return instance;
        this.duration = 20;
        this.isStart = false;
        this.isCanOverVideo = false;
        this.minVideoTime = 5e3;
        this.tips = "\u5f55\u5236\u65f6\u95f4\u6700\u5c115\u79d2\u54e6\uff01";
        this.showToastTime = 2e3;
        this.isinitEvent = false;
        this.isOpenShareVideo = false;
        var self = this;
        this.videoPath = null;
        this.stop = function(callback) {
          console.log("\u5f55\u5c4f\u7ed3\u675f");
          this.videoPath = null;
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.stop_tt(callback);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By Share");
          }
        };
        this.start = function(callback) {
          console.log("\u5f55\u5c4f\u5f00\u59cb");
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            this.start_tt(callback);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By Share");
          }
        };
        this.initEvent = function(callback) {
          if (this.isinitEvent) return;
          var recorder = tt.getGameRecorderManager();
          recorder.onStop(function(res) {
            self.isStart = false;
            if (!self.isOpenShareVideo) {
              self.videoPath = res.videoPath;
              console.log("\u5f55\u5c4f\u7ed3\u675f \uff1a" + res.videoPath);
            }
            try {
              callback && callback();
            } catch (error) {}
            if (self.isOpenShareVideo) {
              self.isOpenShareVideo = false;
              recorder.clipVideo({
                path: res.videoPath,
                timeRange: [ self.duration, 0 ],
                success: function success(res) {
                  console.log("clipVideo  success");
                  self.videoPath = res.videoPath;
                  console.log(res.videoPath);
                  self.shareVideo_tt(res.videoPath);
                },
                fail: function fail(e) {
                  console.log("\u5f55\u5c4f\u5931\u8d25 ! : " + JSON.stringify(e));
                  tt.showToast({
                    title: "\u5f55\u5c4f\u5931\u8d25\uff01",
                    duration: self.showToastTime,
                    icon: "none",
                    success: function success(res) {
                      console.log("".concat(res));
                    },
                    fail: function fail(res) {
                      console.log("showToast\u8c03\u7528\u5931\u8d25");
                    }
                  });
                }
              });
            }
          });
          recorder.onStart(function(res) {
            console.log("\u5f55\u5c4f\u5f00\u59cb");
            self.isStart = true;
            self.isCanOverVideo = false;
            try {
              callback && callback();
            } catch (error) {}
            setTimeout(function() {
              self.isCanOverVideo = true;
              console.log("scheduleOnce = " + self.isCanOverVideo);
            }, self.minVideoTime);
          });
        };
        this.stop_tt = function(callback) {
          if (!self.isCanOverVideo) {
            tt.showToast({
              title: self.tips,
              duration: self.showToastTime,
              icon: "none",
              success: function success(res) {
                console.log("".concat(res));
              },
              fail: function fail(res) {
                console.log("showToast\u8c03\u7528\u5931\u8d25");
              }
            });
            return;
          }
          self.isOpenShareVideo = true;
          this.initEvent(callback);
          var recorder = tt.getGameRecorderManager();
          recorder.stop();
        };
        this.start_tt = function(callback) {
          this.initEvent(callback);
          var recorder = tt.getGameRecorderManager();
          recorder.start({
            duration: self.duration
          });
        };
        this.shareVideo_tt = function(videoPath) {
          this.videoPath = null;
          var self = this;
          if ("undefined" != typeof tt) {
            console.log("shareVideo_tt  videoPath = " + videoPath);
            tt.shareAppMessage({
              channel: "video",
              extra: {
                videoPath: videoPath
              },
              success: function success() {
                console.log("\u5206\u4eab\u89c6\u9891\u6210\u529f");
              },
              fail: function fail(e) {
                console.log("\u5206\u4eab\u89c6\u9891\u5931\u8d25 ! : " + JSON.stringify(e));
                "shareAppMessage:cancel cancel" == e.errMsg || "shareAppMessage:cancel" == e.errMsg ? tt.showToast({
                  title: "\u5206\u4eab\u89c6\u9891\u5931\u8d25 \uff01",
                  duration: self.showToastTime,
                  icon: "none",
                  success: function success(res) {
                    console.log("".concat(res));
                  },
                  fail: function fail(res) {
                    console.log("showToast\u8c03\u7528\u5931\u8d25");
                  }
                }) : tt.showToast({
                  title: self.tips,
                  duration: self.showToastTime,
                  icon: "none",
                  success: function success(res) {
                    console.log("".concat(res));
                  },
                  fail: function fail(res) {
                    console.log("showToast\u8c03\u7528\u5931\u8d25");
                  }
                });
              }
            });
          } else console.log("tt is undefined");
        };
        return instance = this;
      };
      return Recorder;
    }();
    var Clipboard = function() {
      var instance;
      var Clipboard = function Clipboard() {
        if (instance) return instance;
        var self = this;
        this.setClipboardData = function(txt, onSuccess, onFail) {
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              onFail && onFail();
              return;
            }
            this.setClipboardData_tt(txt, onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              onFail && onFail();
              return;
            }
            this.setClipboardData_baidu(txt, onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof qq) {
              console.log("WX wx is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_h5:
            this.setClipboardData_h5(txt, onSuccess, onFail);
            break;

           default:
            console.log(poly_sdk_config.runSDK + " is not undefined By Share");
          }
        };
        this.getClipboardData = function(onSuccess, onFail) {
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              onFail && onFail();
              return;
            }
            this.getClipboardData_tt(onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              onFail && onFail();
              return;
            }
            this.getClipboardData_baidu(onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              onFail && onFail();
              return;
            }
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof qq) {
              console.log("WX wx is undefined");
              onFail && onFail();
              return;
            }
            break;

           default:
            onFail && onFail();
            console.log(poly_sdk_config.runSDK + " is not undefined By Share");
          }
        };
        this.setClipboardData_tt = function(txt, onSuccess, onFail) {
          tt.setClipboardData({
            data: txt,
            success: function success(res) {
              console.log("setClipboardData\u8c03\u7528\u6210\u529f");
              onSuccess && onSuccess();
            },
            fail: function fail(res) {
              console.log("setClipboardData\u8c03\u7528\u5931\u8d25");
              onFail && onFail();
            }
          });
        };
        this.getClipboardData_tt = function(onSuccess, onFail) {
          tt.getClipboardData({
            success: function success(res) {
              console.log("".concat(res.data));
              onSuccess && onSuccess();
            },
            fail: function fail(res) {
              console.log("getClipboardData\u8c03\u7528\u5931\u8d25");
              onFail && onFail();
            }
          });
        };
        this.setClipboardData_baidu = function(txt, onSuccess, onFail) {
          swan.setClipboardData({
            data: txt,
            success: function success(res) {
              console.log("setClipboardData\u8c03\u7528\u6210\u529f");
              onSuccess && onSuccess();
            },
            fail: function fail(res) {
              console.log("setClipboardData\u8c03\u7528\u5931\u8d25");
              onFail && onFail();
            }
          });
        };
        this.getClipboardData_baidu = function(onSuccess, onFail) {
          swan.getClipboardData({
            success: function success(res) {
              console.log("".concat(res.data));
              onSuccess && onSuccess();
            },
            fail: function fail(res) {
              console.log("getClipboardData\u8c03\u7528\u5931\u8d25");
              onFail && onFail();
            }
          });
        };
        this.setClipboardData_h5 = function(txt, onSuccess, onFail) {
          console.log("\u590d\u5236");
          var input = txt;
          var el = document.createElement("textarea");
          el.value = input;
          el.setAttribute("readonly", "");
          el.style.contain = "strict";
          el.style.position = "absolute";
          el.style.left = "-9999px";
          el.style.fontSize = "12pt";
          var selection = getSelection();
          var originalRange = false;
          selection.rangeCount > 0 && (originalRange = selection.getRangeAt(0));
          document.body.appendChild(el);
          el.select();
          el.selectionStart = 0;
          el.selectionEnd = input.length;
          var success = false;
          try {
            success = document.execCommand("copy");
          } catch (err) {}
          document.body.removeChild(el);
          if (originalRange) {
            selection.removeAllRanges();
            selection.addRange(originalRange);
          }
          success ? onSuccess && onSuccess() : onFail && onFail();
          return success;
        };
        return instance = this;
      };
      return Clipboard;
    }();
    var Navigate = function() {
      var instance;
      var Navigate = function Navigate() {
        if (instance) return instance;
        var self = this;
        this.navigateToMiniProgram = function(key, path, extraData, onSuccess, onFail) {
          console.log("navigateToMiniProgram start runSDK = " + poly_sdk_config.runSDK);
          switch (poly_sdk_config.runSDK) {
           case poly_sdk_config.sdk_key_qq:
            if ("undefined" == typeof qq) {
              console.log("QQ qq is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_tt:
            if ("undefined" == typeof tt) {
              console.log("TouTiao tt is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_vivo:
            if ("undefined" == typeof qg) {
              console.log("vivo qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_xiaomi:
            if ("undefined" == typeof qg) {
              console.log("xiaomi qg is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_baidu:
            if ("undefined" == typeof swan) {
              console.log("baidu swan is undefined");
              return;
            }
            this.navigateToMiniProgram_baidu(key, path, extraData, onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_oppo:
            if ("undefined" == typeof qg) {
              console.log("oppo qg is undefined");
              return;
            }
            this.navigateToMiniProgram_oppo(key, path, extraData, onSuccess, onFail);
            break;

           case poly_sdk_config.sdk_key_weixin:
            if ("undefined" == typeof wx) {
              console.log("WX wx is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_qtt:
            if ("undefined" == typeof qttGame) {
              console.log("qtt qttGame is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_jikewan:
            if ("undefined" == typeof AdSDK) {
              console.log("\u5373\u523b\u73a9 AdSDK is undefined");
              return;
            }
            break;

           case poly_sdk_config.sdk_key_4399:
            if ("undefined" == typeof h5api) {
              console.log("4399 h5api is undefined");
              return;
            }
            break;

           default:
            onFail && onFail();
            console.log(poly_sdk_config.runSDK + " is not undefined By createNativeAd");
          }
        };
        this.navigateToMiniProgram_baidu = function(key, path, extraData, onSuccess, onFail) {
          swan.navigateToMiniProgram({
            appKey: key,
            success: function success(res) {
              onSuccess && onSuccess();
              console.log("navigateToMiniProgram success", res);
            },
            fail: function fail(err) {
              onFail && onFail();
              console.log("navigateToMiniProgram fail", err);
            }
          });
        };
        this.navigateToMiniProgram_oppo = function(key, path, extraData, onSuccess, onFail) {};
        return instance = this;
      };
      return Navigate;
    }();
    var PlatformUIShow = function() {
      var instance;
      var PlatformUIShow = function PlatformUIShow() {
        if (instance) return instance;
        var self = this;
        this.isShow = function(uiType_ID) {
          self.uiType_ID = uiType_ID;
          return self.setUiShowState(poly_sdk_config.ui_Node_state.record_onoff, poly_sdk_config.ui_Node_state.share_onoff, poly_sdk_config.ui_Node_state.video_onoff);
        };
        this.setUiShowState = function(isRecorder, isShare, isVideo) {
          var isShow = false;
          if (!self.uiType_ID) return;
          switch (self.uiType_ID) {
           case poly_sdk_config.ui_Type.recorderUI:
            isShow = isRecorder;
            break;

           case poly_sdk_config.ui_Type.shareUI:
            isShow = isShare;
            break;

           case poly_sdk_config.ui_Type.videoUI:
            isShow = isVideo;
          }
          return isShow;
        };
        return instance = this;
      };
      return PlatformUIShow;
    }();
    var getGameOnOffConfig = function getGameOnOffConfig(callback) {
      var self = this;
      if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
        console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By getGameOnOffConfig");
        callback && callback(false);
        return;
      }
      if (poly_sdk_config.runSDK == poly_sdk_config.sdk_key_4399 || poly_sdk_config.runSDK == poly_sdk_config.sdk_key_h5) return console.log("getUserDisplayId  type \uff1a\u4e3a\u7a7a ");
      var type = poly_sdk_config[poly_sdk_config.runSDK].type;
      var game_id = poly_sdk_config.game_id;
      console.log("getUserDisplayId \u5f00\u59cb \u53c2\u6570: type \uff1a".concat(type, " game_id : ").concat(game_id, " "));
      if ("undefined" == typeof type || null == type || "undefined" == typeof game_id || null == game_id) {
        console.log("getGameOnOffConfig sendRequest Err : type || game_id \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
        callback && callback(false);
        return;
      }
      console.log("getGameOnOffConfig sendRequest \u5f00\u59cb \u53c2\u6570: type \uff1a".concat(type, " game_id : ").concat(game_id, " "));
      var resData = {
        type: type,
        game_id: game_id
      };
      tools.sendRequest(poly_sdk_config.gameOnOffConfig, resData, function(data) {
        if (data && 200 == data.code) {
          console.log("getGameOnOffConfig sendRequest success data = " + JSON.stringify(data));
          poly_sdk_config.ui_Node_state.record_onoff = 0 != data.data.record_onoff;
          poly_sdk_config.ui_Node_state.share_onoff = 0 != data.data.share_onoff;
          poly_sdk_config.ui_Node_state.video_onoff = 0 != data.data.video_onoff;
          console.log("record_onoff", poly_sdk_config.ui_Node_state.record_onoff);
          callback && callback(true);
        } else {
          console.log("getGameOnOffConfig sendRequest failure  data = " + JSON.stringify(data));
          poly_sdk_config.ui_Node_state.record_onoff = false;
          poly_sdk_config.ui_Node_state.share_onoff = false;
          poly_sdk_config.ui_Node_state.video_onoff = true;
          callback && callback(false);
        }
      });
    };
    var getLogoIMG = function getLogoIMG(callback) {
      if (!poly_sdk_config || "undefined" == typeof poly_sdk_config || !poly_sdk_config.runSDK || "undefined" == typeof poly_sdk_config.runSDK) {
        console.log("\u805a\u5408SDK \u521d\u59cb\u5316\u5931\u8d25 \u8bf7\u8054\u7cfb\u7ba1\u7406\u4eba\u5458  By sendBannerpush");
        return;
      }
      if (poly_sdk_config.runSDK == poly_sdk_config.sdk_key_h5) return;
      if (poly_sdk_config.runSDK == poly_sdk_config.sdk_key_4399) return;
      var channel_id = poly_sdk_config[poly_sdk_config.runSDK].type;
      var game_id = poly_sdk_config.game_id;
      if ("undefined" == typeof channel_id || null == channel_id || "undefined" == typeof game_id || null == game_id) {
        console.log("sendBannerpush sendRequest Err : channel_id || game_id  \u53c2\u6570\u4e3a\u7a7a\u6216\u9519\u8bef");
        callback && callback(false, null);
        return;
      }
      var resData = {
        game_id: game_id,
        channel_id: channel_id
      };
      tools.sendRequest(poly_sdk_config.screenimgUrl, resData, function(data) {
        if (!data) {
          console.log("getLogoIMG sendRequest failure  Server ERR  data is null  data = " + data);
          callback && callback(false, null);
          return;
        }
        if (200 == data.code) {
          console.log("getLogoIMG sendRequest success data = " + JSON.stringify(data));
          callback && callback(true, data.data);
        } else {
          console.log("getLogoIMG sendRequest failure  data = " + JSON.stringify(data));
          callback && callback(false, null);
        }
      });
    };
    var platformEventCallback = function platformEventCallback(vidioEventCallback, shareEventCallback, otherEventCallback) {
      switch (poly_sdk_config.runSDK) {
       case poly_sdk_config.sdk_key_qq:
        "undefined" != typeof qq ? 0 != poly_sdk_config.qq.video_id.length ? vidioEventCallback() : shareEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_tt:
        "undefined" != typeof tt ? 0 != poly_sdk_config.tt.video_id.length ? vidioEventCallback() : shareEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_weixin:
        "undefined" != typeof wx ? 0 != poly_sdk_config.weixin.video_id.length ? vidioEventCallback() : shareEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_baidu:
        "undefined" != typeof swan ? 0 != poly_sdk_config.baidu.video_id.length ? vidioEventCallback() : shareEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_vivo:
        "undefined" != typeof qg && 0 != poly_sdk_config.vivo.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_oppo:
        "undefined" != typeof qg && 0 != poly_sdk_config.oppo.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_xiaomi:
        "undefined" != typeof qg && 0 != poly_sdk_config.xiaomi.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_4399:
        "undefined" != typeof h5api ? cc.LieYingSDK.PolySDK.VideoAd.getVideoAdNumber(function(remain) {
          0 == remain ? otherEventCallback() : vidioEventCallback();
        }) : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_qtt:
        "undefined" != typeof qttGame ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_jikewan:
        "undefined" != typeof AdSDK && 0 != poly_sdk_config.jikewan.video_adId.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_ios:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_IOS) && 0 != poly_sdk_config.ios.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_wangmai:
        "undefined" != typeof WMAds ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_juzhang:
        cc.LieYingSDK.PolySDK.adjuzsdk ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_360:
        "undefined" != typeof qh ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_yungao:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.yungao.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_yyb:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_yyb.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_vivo:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_vivo.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_oppo:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_oppo.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_360:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_360.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_tap:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_tap.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_baoqu:
        "undefined" == typeof CPSDK ? otherEventCallback() : vidioEventCallback();
        break;

       case poly_sdk_config.sdk_key_wifikey:
        "undefined" == typeof wifikey ? otherEventCallback() : vidioEventCallback();
        break;

       case poly_sdk_config.sdk_key_h5:
        otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_jiuyou:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_jiuyou.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_huawei:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_huawei.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_haoYouKuaiBao:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.haoYouKuaiBao.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_yunYouXi:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.yunYouXi.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_4399:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_4399.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_haixin:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_haixin.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_android_Lenovo:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.android_Lenovo.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_CSJ:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.CSJ.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       case poly_sdk_config.sdk_key_GDT:
        (cc || cc.sys.isNative || cc.sys.os == cc.sys.OS_ANDROID) && 0 != poly_sdk_config.GDT.video_id.length ? vidioEventCallback() : otherEventCallback();
        break;

       default:
        otherEventCallback();
      }
    };
    module.exports = {
      LoginAuth: new LoginAuth(),
      BannerAd: new BannerAd(),
      InterstitialAd: new InterstitialAd(),
      VideoAd: new VideoAd(),
      NativeAd: new NativeAd(),
      Share: new Share(),
      sdkConfig: poly_sdk_config,
      Tools: new Tools(),
      Recorder: new Recorder(),
      Clipboard: new Clipboard(),
      Navigate: new Navigate(),
      PlatformUIShow: new PlatformUIShow(),
      getGameOnOffConfig: getGameOnOffConfig,
      getLogoIMG: getLogoIMG,
      platformEventCallback: platformEventCallback
    };
    cc.LieYingSDK = cc.LieYingSDK || {};
    cc.LieYingSDK.PolySDK = module.exports;
    cc._RF.pop();
  }, {} ],
  ResourcesConfig: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "8725bI3uopFE74GLXvcJGMU", "ResourcesConfig");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        mj_hua_atlas: {
          default: null,
          type: cc.SpriteAtlas,
          displayName: "mj_hua_atlas",
          tooltip: "mj_hua_atlas"
        }
      },
      onLoad: function onLoad() {
        cc.myBaseMgr.ResourcesConfig = cc.myBaseMgr.ResourcesConfig || {
          mj_hua_atlas: this.mj_hua_atlas
        };
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Rules_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "1898fjihqZOhqO+2b3O+8EU", "Rules_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {},
      start: function start() {},
      oncloseClickEvents: function oncloseClickEvents() {
        this.onRemove();
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  SelectHome: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7c266E8HhFJeoQusCM/P+Zd", "SelectHome");
    "use strict";
    cc._RF.pop();
  }, {} ],
  Select_box_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "20a5erRRsVCarLIRZdn89IU", "Select_box_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        desLabel: {
          default: null,
          type: cc.Label
        },
        closeBtn_node: {
          default: null,
          type: cc.Node
        },
        cancelBtn_node: {
          default: null,
          type: cc.Node
        },
        oKBtn_node: {
          default: null,
          type: cc.Node
        }
      },
      setInfo: function setInfo(args) {
        var self = this;
        args && cc.myBaseMgr.DataMgr.isData_UnNull(args["isShowCloseBtn"]) && (self.closeBtn_node.active = false !== args["isShowCloseBtn"]);
        args && cc.myBaseMgr.DataMgr.isData_UnNull(args["isShowCancelBtn"]) && (self.cancelBtn_node.active = false !== args["isShowCancelBtn"]);
        args && cc.myBaseMgr.DataMgr.isData_UnNull(args["isShowOKBtn"]) && (self.oKBtn_node.active = false !== args["isShowOKBtn"]);
        args && args["txt"] && (self.desLabel.string = args["txt"]);
        if (args && args["callBack"]) {
          self.onbtn_1CallBack = args["callBack"].onbtn_1CallBack;
          self.onbtn_2CallBack = args["callBack"].onbtn_2CallBack;
        }
      },
      onClickEvents: function onClickEvents(e, d) {
        this.onClickEventsBindMusic();
        var target = e.target, self = this;
        function onbtn_1() {
          self.onbtn_1CallBack && self.onbtn_1CallBack();
          self.onRemove();
        }
        function onbtn_2() {
          self.onbtn_2CallBack && self.onbtn_2CallBack();
          self.onRemove();
        }
        switch (d) {
         case "btn_1":
          onbtn_1();
          break;

         case "btn_2":
          onbtn_2();
          break;

         default:
          throw new Error(d + " Type not Find");
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Select_home_game_play_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "71d01Dmh59IjYNizYTC2Bsp", "Select_home_game_play_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        toggle: {
          default: null,
          type: cc.Toggle,
          displayName: "toggle"
        },
        label_gameName: {
          default: null,
          type: cc.Label,
          displayName: "label_gameName",
          tooltip: "\u6e38\u620f\u540d\u79f0"
        },
        _itemData: null
      },
      setAllInFo: function setAllInFo(data, index) {
        data.index = index;
        this.set_itemData(data);
        this.setlabel_gameName(data.gameName);
      },
      set_itemData: function set_itemData(itemData) {
        this._itemData = itemData;
      },
      get_itemData: function get_itemData() {
        return this._itemData;
      },
      settoggleisChecked: function settoggleisChecked(isChecked) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.toggle)) return;
        this.toggle.isChecked = isChecked;
      },
      setlabel_gameName: function setlabel_gameName(gameName) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.label_gameName)) return;
        this.label_gameName.string = gameName;
      },
      onToggleClickEvents: function onToggleClickEvents() {
        this.onClickEventsBindMusic();
        cc.game_frame_EventMgr.pushEventImm("select_home_udateAreaHowPlaySelectedindex", this._itemData.index, false);
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Select_home_session_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "6b6b6CI30VOkI9pLykVTX3l", "Select_home_session_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        label_biaoti: {
          default: null,
          type: cc.Label,
          displayName: "label_biaoti",
          tooltip: "\u573a\u5730\u6807\u9898"
        },
        label_bottom_Score: {
          default: null,
          type: cc.Label,
          displayName: "label_bottom_Score",
          tooltip: "\u5e95\u5206"
        },
        label_renshu: {
          default: null,
          type: cc.Label,
          displayName: "label_renshu",
          tooltip: "\u4eba\u6570"
        },
        label_jindou: {
          default: null,
          type: cc.Label,
          displayName: "label_jindou",
          tooltip: "\u91d1\u8c46"
        },
        _itemData: null
      },
      setAllInFo: function setAllInFo(data) {
        this.set_itemData(data);
        this.setlabel_biaoti(data.name);
        this.setlabel_bottom_Score(data.endPoints);
        this.setlabel_jindou(data.smallTickets, data.maxTickets);
      },
      set_itemData: function set_itemData(itemData) {
        this._itemData = itemData;
      },
      get_itemData: function get_itemData() {
        return this._itemData;
      },
      setlabel_biaoti: function setlabel_biaoti(name) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.label_biaoti)) return;
        this.label_biaoti.string = name;
      },
      setlabel_bottom_Score: function setlabel_bottom_Score(endPoints) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.label_bottom_Score)) return;
        this.label_bottom_Score.string = endPoints;
      },
      setlabel_renshu: function setlabel_renshu(renshu) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.label_renshu)) return;
        this.label_renshu.string = renshu;
      },
      setlabel_jindou: function setlabel_jindou(smallTickets, maxTickets) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.label_jindou)) return;
        this.label_jindou.string = smallTickets + "~" + maxTickets;
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        cc.myBaseMgr.DataMgr.set_CURRNT_Game_Room_constant(this._itemData.constant);
        this.loadScene("DouDiZhu");
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Set_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "e631c60i2BBgZ/BSk0WFcU7", "Set_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {},
      start: function start() {},
      onbtnSceneClickEvents: function onbtnSceneClickEvents(e, d) {
        var _this = this;
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "btn_exitGame":
          console.log("\u9000\u51fa\u767b\u9646");
          cc.myBaseMgr.DAO.UserDao.onGetLoginInfoByToken(function(code, message, data) {
            switch (code) {
             case cc.myBaseMgr.CODE.success:
              _this.loadScene("GameLogin");
              break;

             case cc.myBaseMgr.CODE.not_login:
              break;

             default:
              _this.creater_Layer("msg_layer", {
                text: message
              });
            }
          });
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  ShopDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "7603apAi6FLFLqIDYXHQD3e", "ShopDao");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {},
      onGetShopCategoryList: function onGetShopCategoryList(callback) {
        var self = this;
        cc.myBaseMgr.HTTP.post("/cloudgameapi/shop/getShopCategoryList", null, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      },
      onGetShopListByShopCategoryConstant: function onGetShopListByShopCategoryConstant(data, callback) {
        var token = cc.myBaseMgr.DAO.UserDao.token;
        var pageIndex = data["pageIndex"] || null;
        var pageSize = data["pageSize"] || null;
        var shopCategoryConstant = data["shopCategoryConstant"];
        var self = this;
        function isNull() {
          if (!self.isNull(pageIndex) || !self.isNull(pageSize) || !self.isNull(shopCategoryConstant)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!self.isNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["token"]));
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull() || !isError()) return;
        var resdata = {
          pageIndex: pageIndex,
          pageSize: pageSize,
          shopCategoryConstant: shopCategoryConstant
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/shop/getShopListByShopCategoryConstant", resdata, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      },
      onBuyGoods: function onBuyGoods(data, callback) {
        var token = cc.myBaseMgr.DAO.UserDao.token;
        var shopId = data["shopId"] || null;
        var buyNumber = data["buyNumber"] || null;
        var self = this;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(shopId) || !cc.myBaseMgr.DataMgr.isData_UnNull(buyNumber)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.LabelMsg["CONTENT_IS_NOT_NULL"]);
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["token"]));
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull() || !isError()) return;
        var resdata = {
          shopId: shopId,
          buyNumber: buyNumber
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/shop/buyGoods", resdata, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Shop_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "b5737I74fdESJHzAzdMwKwx", "Shop_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        icon: {
          default: null,
          type: cc.Sprite,
          displayName: "img",
          tooltip: "\u5546\u54c1\u56fe\u7247"
        },
        money: {
          default: null,
          type: cc.Label,
          displayName: "money",
          tooltip: "\u5355\u4ef7\u91d1\u989d"
        },
        num: {
          default: null,
          type: cc.Label,
          displayName: "num",
          tooltip: "\u5546\u54c1\u6570\u91cf"
        },
        money_type: {
          default: [],
          type: cc.Node,
          displayName: "\u8d27\u5e01\u7c7b\u578b",
          tooltip: "\u8d27\u5e01\u7c7b\u578b"
        },
        _shopid: null,
        _icon: null,
        _money: null,
        _num: null,
        _money_type: null,
        _item_name: null,
        _items_describe: null
      },
      setAllInfo: function setAllInfo(id, icon, money, num, money_type, items_describe, item_name) {
        this.setID(id);
        this.setIcon(icon);
        this.setMoney(money);
        this.setNum(num);
        this.setMoneyType(money_type);
        this.setItemDescribe(items_describe);
        this.setItemName(item_name);
      },
      setID: function setID(id) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(id)) return;
        this._shopid = id;
      },
      setIcon: function setIcon(icon) {
        this._icon = icon;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.icon) || !cc.myBaseMgr.DataMgr.isData_UnNull(icon)) return;
        this.updateSpriteFrame(icon, this.icon);
      },
      setMoney: function setMoney(money) {
        this._money = money;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.money) || !cc.myBaseMgr.DataMgr.isData_UnNull(money)) return;
        this.money.string = "\uffe5".concat(money);
      },
      setNum: function setNum(num) {
        this._num = num;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.num) || !cc.myBaseMgr.DataMgr.isData_UnNull(num)) return;
        this.num.string = "x" + num;
      },
      setMoneyType: function setMoneyType(money_type) {
        this._money_type = money_type;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.money_type) || !cc.myBaseMgr.DataMgr.isData_UnNull(money_type)) return;
        this.money_type[money_type - 1].active = true;
      },
      setItemName: function setItemName(item_name) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(item_name)) return;
        this._item_name = item_name;
      },
      setItemDescribe: function setItemDescribe(items_describe) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(items_describe)) return;
        this._items_describe = items_describe;
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        cc.game_frame_EventMgr.pushEventImm("updateShopDetails", this._id, this._icon, this._money, this._num, this._money_type, this._items_describe, this._item_name);
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Shop_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "0bb2729+J1IboI2I428cpgC", "Shop_layer");
    "use strict";
    var UIManager = require("UIManager");
    var Shop_details = cc.Class({
      name: "Shop_details",
      properties: {
        _shop_id: null,
        icon: {
          default: null,
          type: cc.Sprite,
          displayName: "img",
          tooltip: "\u5546\u54c1\u56fe\u7247"
        },
        items_name: {
          default: null,
          type: cc.Label,
          displayName: "\u5546\u54c1\u540d\u79f0",
          tooltip: "\u5546\u54c1\u540d\u79f0"
        },
        items_describe: {
          default: null,
          type: cc.Label,
          displayName: "\u5546\u54c1\u8be6\u60c5\u8bf4\u660e",
          tooltip: "\u5546\u54c1\u8be6\u60c5\u8bf4\u660e"
        },
        num: {
          default: null,
          type: cc.Label,
          displayName: "num",
          tooltip: "\u5546\u54c1\u5355\u4ef7\u6570\u91cf"
        },
        num_EditBox: {
          default: null,
          type: cc.EditBox,
          displayName: "num_EditBox",
          tooltip: "\u5546\u54c1\u81ea\u5b9a\u4e49\u6570\u91cf"
        },
        money: {
          default: null,
          type: cc.Label,
          displayName: "money",
          tooltip: "\u5355\u4ef7\u91d1\u989d"
        },
        money_type: {
          default: [],
          type: cc.Node,
          displayName: "\u8d27\u5e01\u7c7b\u578b",
          tooltip: "\u8d27\u5e01\u7c7b\u578b"
        },
        def_editBox_num: 1
      }
    });
    cc.Class({
      extends: UIManager,
      properties: {
        shop_item_scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        shop_type_scroll_view: {
          type: cc.ScrollView,
          default: null
        },
        shop_type_item_prefab: {
          type: cc.Prefab,
          default: null
        },
        shop_item_prefab: {
          type: cc.Prefab,
          default: null
        },
        shop_details: {
          type: Shop_details,
          default: null,
          displayName: "\u5546\u54c1\u8be6\u60c5",
          tooltip: "\u5546\u54c1\u8be6\u60c5"
        },
        shop_details_node: {
          type: cc.Node,
          default: null
        },
        defPageSize: 20,
        defPageIndex: 1,
        _pageSize: null,
        _pageIndex: null,
        _shopCategoryConstant: null
      },
      onLoad: function onLoad() {
        this._pageSize = this.defPageSize;
        this._pageIndex = this.defPageIndex;
        this._shop_item_content = this.shop_item_scroll_view.content;
        this._shop_type_content = this.shop_type_scroll_view.content;
        this.shop_details_node.active = false;
        this.shop_item_scroll_view.node.on("scroll-to-bottom", function(event) {
          this._pageSize++;
          this.addShopItemToList();
        }.bind(this));
        this.initEvents();
        this.addShopTypeItemToList();
      },
      onDisable: function onDisable() {
        cc.game_frame_EventMgr.off(this);
      },
      initEvents: function initEvents() {
        cc.game_frame_EventMgr.def("updateShopDetails", this.setAllInfo, this);
      },
      start: function start() {},
      addShopTypeItemToList: function addShopTypeItemToList() {
        var self = this;
        self._shop_type_content.destroyAllChildren();
        cc.myBaseMgr.DAO.ShopDao.onGetShopCategoryList(function(code, msg, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            for (var i = 0; i < data.length; i++) {
              var isChecked = 0 == i;
              var obj = data[i];
              var item = cc.instantiate(self.shop_type_item_prefab);
              var item_scripts = item.getComponent("Shop_type_item");
              item_scripts.setAllInfo(obj["id"], obj["constant"], obj["name"], isChecked);
              if (0 == i) {
                self._shopCategoryConstant = item_scripts._constant;
                this.addShopItemToList();
              }
              self._shop_type_content.addChild(item);
            }
            break;

           case cc.myBaseMgr.CODE.clientError:
          }
        }.bind(this));
      },
      addShopItemToList: function addShopItemToList() {
        var self = this;
        var res_data = {
          pageIndex: this._pageIndex,
          pageSize: this._pageSize,
          shopCategoryConstant: this._shopCategoryConstant
        };
        cc.myBaseMgr.DAO.ShopDao.onGetShopListByShopCategoryConstant(res_data, function(code, msg, data) {
          switch (code) {
           case cc.myBaseMgr.CODE.success:
            if (!data.datas || data.datas.length < 1) {
              this._pageSize = data.totalPage;
              return;
            }
            for (var i = 0; i < data.datas.length; i++) {
              var obj = data.datas[i];
              var item = cc.instantiate(self.shop_item_prefab);
              var item_scripts = item.getComponent("Shop_item");
              item_scripts.setAllInfo(obj["id"], obj["itemsIcon"], obj["money"], obj["number"], obj["moneyType"], obj["itemsDescribe"], obj["itemsName"]);
              0 == i && self.setAllInfo(obj["id"], obj["itemsIcon"], obj["money"], obj["number"], obj["moneyType"], obj["itemsDescribe"], obj["itemsName"]);
              self._shop_item_content.addChild(item);
            }
            break;

           case cc.myBaseMgr.CODE.clientError:
          }
        }.bind(this));
      },
      onClickEvents: function onClickEvents(e, d) {
        var self = this;
        this.onClickEventsBindMusic();
        switch (d) {
         case "shopTypeItem":
          console.log("\u5546\u54c1\u7c7b\u76ee");
          console.log("constant = " + e.node.getComponent("Shop_type_item")._constant);
          this._pageSize = this.defPageSize;
          this._pageIndex = this.defPageIndex;
          self._shopCategoryConstant = e.node.getComponent("Shop_type_item")._constant;
          self._shop_item_content.destroyAllChildren();
          this.shop_details_node.active = false;
          this.addShopItemToList();
          break;

         default:
          this.creater_Layer("msg_layer", {
            text: cc.myBaseMgr.LabelMsg.NOT_OPEN
          });
        }
      },
      setAllInfo: function setAllInfo(shopid, icon, money, num, money_type, items_describe, item_name) {
        this.shop_details_node.active = true;
        this.setShopDetailsID(shopid);
        this.setShopDetailsIcon(icon);
        this.setShopDetailsMoney(money);
        this.setShopDetailsNum(num);
        this.setShopDetailsMoneyType(money_type);
        this.setShopDetails(items_describe);
        this.setShopDetailsName(item_name);
        this.setNumEditBox(this.shop_details.def_editBox_num);
      },
      setShopDetailsID: function setShopDetailsID(shopid) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(shopid)) return;
        this.shop_details._shop_id = shopid;
      },
      setShopDetailsIcon: function setShopDetailsIcon(icon) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.icon) || !cc.myBaseMgr.DataMgr.isData_UnNull(icon)) return;
        this.updateSpriteFrame(icon, this.shop_details.icon);
      },
      setShopDetailsMoney: function setShopDetailsMoney(money) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.money) || !cc.myBaseMgr.DataMgr.isData_UnNull(money)) return;
        this.shop_details.money.string = "\uffe5".concat(money);
      },
      setShopDetailsNum: function setShopDetailsNum(num) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.num) || !cc.myBaseMgr.DataMgr.isData_UnNull(num)) return;
        this.shop_details.num.string = "x" + num;
      },
      setShopDetailsMoneyType: function setShopDetailsMoneyType(money_type) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.money_type) || !cc.myBaseMgr.DataMgr.isData_UnNull(money_type)) return;
        for (var i = 0; i < this.shop_details.money_type.length; i++) {
          var element = this.shop_details.money_type[i];
          element.active = i == money_type - 1;
        }
      },
      setShopDetailsName: function setShopDetailsName(item_name) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.items_name) || !cc.myBaseMgr.DataMgr.isData_UnNull(item_name)) return;
        this.shop_details.items_name.string = item_name;
      },
      setShopDetails: function setShopDetails(describe) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.items_describe) || !cc.myBaseMgr.DataMgr.isData_UnNull(describe)) return;
        this.shop_details.items_describe.string = describe;
      },
      setNumEditBox: function setNumEditBox(num) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_details.num_EditBox) || !cc.myBaseMgr.DataMgr.isData_UnNull(num)) return;
        this.shop_details.num_EditBox.string = num;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Shop_type_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "269f4qmFwdJp4zFCCa7V0of", "Shop_type_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        shop_type_name: {
          default: null,
          type: cc.Label,
          displayName: "\u5546\u54c1\u7c7b\u578b\u6807\u9898label",
          tooltip: "\u5546\u54c1\u7c7b\u578b\u6807\u9898label"
        },
        toggle: {
          default: null,
          type: cc.Toggle,
          displayName: "Toggle\u8282\u70b9",
          tooltip: "Toggle\u8282\u70b9"
        },
        _id: null,
        _constant: null
      },
      setAllInfo: function setAllInfo(id, constant, shop_type_name, isChecked) {
        this.setid(id);
        this.setConstant(constant);
        this.setShopTypeName(shop_type_name);
        this.setIsChecked(isChecked);
      },
      setShopTypeName: function setShopTypeName(shop_type_name) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.shop_type_name) || !cc.myBaseMgr.DataMgr.isData_UnNull(shop_type_name)) return;
        this.shop_type_name.string = shop_type_name;
      },
      setIsChecked: function setIsChecked(isChecked) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.toggle) || !cc.myBaseMgr.DataMgr.isData_UnNull(isChecked)) return;
        this.toggle.isChecked = isChecked;
      },
      setid: function setid(id) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(id)) return;
        this._id = id;
      },
      setConstant: function setConstant(constant) {
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(constant)) return;
        this._constant = constant;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  Slider_type_1: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "443c9D8vgdLpK7Vp2Ollqk2", "Slider_type_1");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        progress: {
          default: null,
          type: cc.Sprite
        },
        _width: 0
      },
      onLoad: function onLoad() {
        var slider = this.getComponent(cc.Slider);
        if (null == slider || null == this.progress) return;
        this._width = this.progress.node.width;
        this.progress.node.width = this._width * slider.progress;
        var self = this;
        slider.node.on("slide", function(event) {
          self.progress.node.width = slider.progress * self._width;
        }, this);
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {} ],
  Slider_type_bgm: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "c3219BNwSlNta5Six9dJ6Cc", "Slider_type_bgm");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        progress: {
          default: null,
          type: cc.Sprite
        },
        _width: 0
      },
      onLoad: function onLoad() {
        var slider = this.getComponent(cc.Slider);
        if (null == slider || null == this.progress) return;
        this._width = this.progress.node.width;
        this.progress.node.width = this._width * slider.progress;
        var self = this;
        var maxVolume = self.progress.node.width;
        slider.node.on("slide", function(event) {
          self.progress.node.width = slider.progress * self._width;
          cc.myBaseMgr.AudioMgr.setBGMVolume(self.progress.node.width / maxVolume);
        }, this);
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {} ],
  Slider_type_sfx: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "fd3dcMq7CpCH7iYtLBne8YX", "Slider_type_sfx");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        progress: {
          default: null,
          type: cc.Sprite
        },
        _width: 0
      },
      onLoad: function onLoad() {
        var slider = this.getComponent(cc.Slider);
        if (null == slider || null == this.progress) return;
        this._width = this.progress.node.width;
        this.progress.node.width = this._width * slider.progress;
        var self = this;
        var maxVolume = self.progress.node.width;
        slider.node.on("slide", function(event) {
          self.progress.node.width = slider.progress * self._width;
          cc.myBaseMgr.AudioMgr.setSFXVolume(self.progress.node.width / maxVolume);
        }, this);
      },
      start: function start() {}
    });
    cc._RF.pop();
  }, {} ],
  SystemDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "bea73lRnaJB757jgXwZu2xA", "SystemDao");
    "use strict";
    var UIManager = require("UIManager");
    var Label = require("LabelMsgManager");
    cc.Class({
      extends: UIManager,
      properties: {
        systemEnableMgrVO_list: null,
        wxShareMgrVO: null,
        gameMgrVO: null,
        serverHostVO: null
      },
      _setConfig: function _setConfig(req) {
        this.systemEnableMgrVO_list = req["systemEnableMgrVO_list"];
        this.wxShareMgrVO = req["wxShareMgrVO"];
        this.gameMgrVO = req["gameMgrVO"];
        this.serverHostVO = req["serverHostVO"];
        if ("undefined" != typeof window && window.__MAHJONG_WS_URL__ && this.serverHostVO) {
          for (var i = 0; i < this.serverHostVO.length; i++) {
            this.serverHostVO[i].address = window.__MAHJONG_WS_URL__;
          }
        }
      },
      getWSGameinfoByServerConstant: function getWSGameinfoByServerConstant(game_serverHost_constant) {
        for (var i = 0; i < this.serverHostVO.length; i++) {
          var element = this.serverHostVO[i];
          if (element.constant == game_serverHost_constant) return element;
        }
      },
      getInitConfig: function getInitConfig(callback) {
        var self = this;
        cc.myBaseMgr.HTTP.post("/cloudgameapi/system/getInitConfig", null, function(code, msg, data) {
          code == cc.myBaseMgr.CODE.success && data && self._setConfig(data);
          callback && callback(code, msg, data);
        });
      },
      getPlaylist: function getPlaylist(data, callback) {
        var token = cc.myBaseMgr.DAO.UserDao.token;
        var type = data.type;
        var game_id = data.game_id;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["token"]));
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(type)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["PlayingField_TYPE"]));
            return;
          }
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(game_id)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["game_id"]));
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          token: token,
          type: type,
          game_id: game_id
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/games/getPlaylist", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            callback && callback(true, msg, data);
          } else callback && callback(false, msg, data);
        });
      },
      sendMsg: function sendMsg(data, callback) {
        var tel = data["phone"];
        console.log("dao");
        if ("" == cc.myBaseMgr.Tools.Str.trim(tel, -1)) {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["TEL"]), null);
          return;
        }
        if (!cc.myBaseMgr.Tools.Str.checkType(cc.myBaseMgr.Tools.Str.trim(tel, -1), "phone")) {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["TEL"]), null);
          return;
        }
        var resdata = {
          phone: tel
        };
        var self = this;
        cc.myBaseMgr.HTTP.post("/cloudgameapi//system/createMobileCode", resdata, function(code, msg, data) {
          code == cc.myBaseMgr.CODE.success && data && self._setConfig(data);
          callback && callback(code, msg, data);
        });
      }
    });
    cc._RF.pop();
  }, {
    LabelMsgManager: "LabelMsgManager",
    UIManager: "UIManager"
  } ],
  ToolsManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "42fb1gwdHBHCrk65iUY7uXr", "ToolsManager");
    "use strict";
    function _typeof(obj) {
      "@babel/helpers - typeof";
      _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function _typeof(obj) {
        return typeof obj;
      } : function _typeof(obj) {
        return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      return _typeof(obj);
    }
    var GN = GN || {
      Str: {},
      Arr: {},
      Num: {},
      Obj: {},
      Date: {}
    };
    (function() {
      GN.Arr.upsetArr = function(arr) {
        return arr.sort(function() {
          return Math.random() - .5;
        });
      };
      GN.Arr.maxArr = function(arr) {
        return Math.max.apply(null, arr);
      };
      GN.Arr.minArr = function(arr) {
        return Math.min.apply(null, arr);
      };
      GN.Arr.sumArr = function(arr) {
        return arr.reduce(function(res, cur) {
          return res + cur;
        }, 0);
      };
      GN.Arr.covArr = function(arr) {
        var sumText = GN.Arr.sumArr(arr);
        var covText = sumText / length;
        return covText;
      };
      GN.Arr.randomOne = function(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      };
      GN.Arr.getEleCount = function(obj, ele) {
        var num = 0;
        for (var i = 0, len = obj.length; i < len; i++) ele == obj[i] && num++;
        return num;
      };
      GN.Arr.getCount = function(arr, rank, ranktype) {
        var obj = {}, k, arr1 = [];
        for (var i = 0, len = arr.length; i < len; i++) {
          k = arr[i];
          obj[k] ? obj[k]++ : obj[k] = 1;
        }
        for (var o in obj) arr1.push({
          el: o,
          count: obj[o]
        });
        arr1.sort(function(n1, n2) {
          return n2.count - n1.count;
        });
        1 === ranktype && (arr1 = arr1.reverse());
        var rank1 = rank || arr1.length;
        return arr1.slice(0, rank1);
      };
      GN.Arr.getArrayNum = function(arr, n1, n2) {
        var arr1 = [], len = n2 || arr.length - 1;
        for (var i = n1; i <= len; i++) arr1.push(arr[i]);
        return arr1;
      };
      GN.Arr.removeArrayForValue = function(arr, val, type) {
        arr.filter(function(item) {
          return "%" === type ? -1 !== item.indexOf(val) : item !== val;
        });
      };
      GN.Arr.close = function(arrs) {
        if (arrs) for (var i = 0; i < arrs.length; i) arrs.splice(i, 1);
      };
      GN.Arr.passArray = function(Obj) {
        var arr = [];
        for (var i in Obj) arr.push(Obj[i]);
        return arr;
      };
    })();
    (function() {
      GN.Date.getEndTime = function(endTime) {
        var startDate = new Date();
        var endDate = new Date(endTime);
        var t = endDate.getTime() - startDate.getTime();
        var d = 0, h = 0, m = 0, s = 0;
        if (t >= 0) {
          d = Math.floor(t / 1e3 / 3600 / 24);
          h = Math.floor(t / 1e3 / 60 / 60 % 24);
          m = Math.floor(t / 1e3 / 60 % 60);
          s = Math.floor(t / 1e3 % 60);
        }
        return "\u5269\u4f59\u65f6\u95f4" + d + "\u5929 " + h + "\u5c0f\u65f6 " + m + " \u5206\u949f" + s + " \u79d2";
      };
      GN.Date.curtime = function() {
        return Math.round(new Date().getTime());
      };
      GN.Date.fmtData = function(strfmt) {
        var date = "";
        if (!GN.Obj.instanceOf(strfmt, "undefined") && strfmt && "" != GN.Str.trim(1, strfmt) && 8 == strfmt.length) {
          date = strfmt.substring(0, 4) + "/";
          date += strfmt.substring(4, 6) + "/";
          date += strfmt.substring(6, 8) + "/";
        }
        return date;
      };
    })();
    (function() {
      GN.Num.upDigit = function(n) {
        var fraction = [ "\u89d2", "\u5206", "\u5398" ];
        var digit = [ "\u96f6", "\u58f9", "\u8d30", "\u53c1", "\u8086", "\u4f0d", "\u9646", "\u67d2", "\u634c", "\u7396" ];
        var unit = [ [ "\u5143", "\u4e07", "\u4ebf" ], [ "", "\u62fe", "\u4f70", "\u4edf" ] ];
        var head = n < 0 ? "\u6b20\u4eba\u6c11\u5e01" : "\u4eba\u6c11\u5e01";
        n = Math.abs(n);
        var s = "";
        for (var i = 0; i < fraction.length; i++) s += (digit[Math.floor(10 * n * Math.pow(10, i)) % 10] + fraction[i]).replace(/\u96f6./, "");
        s = s || "\u6574";
        n = Math.floor(n);
        for (var i = 0; i < unit[0].length && n > 0; i++) {
          var p = "";
          for (var j = 0; j < unit[1].length && n > 0; j++) {
            p = digit[n % 10] + unit[1][j] + p;
            n = Math.floor(n / 10);
          }
          s = p + unit[0][i] + s;
        }
        return head + s.replace(/(\u96f6.)*\u96f6\u5143/, "\u5143").replace(/(\u96f6.)+/g, "\u96f6").replace(/^\u6574$/, "\u96f6\u5143\u6574");
      };
      GN.Num.randomNumber = function(n1, n2) {
        return 2 === arguments.length ? Math.round(n1 + Math.random() * (n2 - n1)) : 1 === arguments.length ? Math.round(Math.random() * n1) : Math.round(255 * Math.random());
      };
      GN.Num.randomColor = function() {
        return "rgb(" + GN.Num.randomNumber(255) + "," + GN.Num.randomNumber(255) + "," + GN.Num.randomNumber(255) + ")";
        var color;
        var i;
      };
      GN.Num.passNum = function(Type, strObj) {
        switch (Type) {
         case "int":
          return ~~strObj;

         case "float":
          return 1 * strObj;

         default:
          console.log(Type + "Not Find");
        }
      };
    })();
    (function() {
      GN.Str.trim = function(str, type) {
        switch (type) {
         case 1:
          return str.replace(/\s+/g, "");

         case 2:
          return str.replace(/(^\s*)|(\s*$)/g, "");

         case 3:
          return str.replace(/(^\s*)/g, "");

         case 4:
          return str.replace(/(\s*$)/g, "");

         default:
          return str;
        }
      };
      GN.Str.changeCase = function(str, type) {
        function ToggleCase(str) {
          var itemText = "";
          str.split("").forEach(function(item) {
            /^([a-z]+)/.test(item) ? itemText += item.toUpperCase() : /^([A-Z]+)/.test(item) ? itemText += item.toLowerCase() : itemText += item;
          });
          return itemText;
        }
        switch (type) {
         case 1:
          return str.replace(/^(\w)(\w+)/, function(v, v1, v2) {
            return v1.toUpperCase() + v2.toLowerCase();
          });

         case 2:
          return str.replace(/^(\w)(\w+)/, function(v, v1, v2) {
            return v1.toLowerCase() + v2.toUpperCase();
          });

         case 3:
          return ToggleCase(str);

         case 4:
          return str.toUpperCase();

         case 5:
          return str.toLowerCase();

         default:
          return str;
        }
      };
      GN.Str.repeatStr = function(str, count) {
        var text = "";
        for (var i = 0; i < count; i++) text += str;
        return text;
      };
      GN.Str.replaceAll = function(str, AFindText, ARepText) {
        var raRegExp = new RegExp(AFindText, "g");
        return str.replace(raRegExp, ARepText);
      };
      GN.Str.replaceStr = function(str, regArr, type, ARepText) {
        var regtext = "", Reg = null, replaceText = ARepText || "*";
        if (3 === regArr.length && 0 === type) {
          regtext = "(\\w{" + regArr[0] + "})\\w{" + regArr[1] + "}(\\w{" + regArr[2] + "})";
          Reg = new RegExp(regtext);
          var replaceCount = repeatStr(replaceText, regArr[1]);
          return str.replace(Reg, "$1" + replaceCount + "$2");
        }
        if (3 === regArr.length && 1 === type) {
          regtext = "\\w{" + regArr[0] + "}(\\w{" + regArr[1] + "})\\w{" + regArr[2] + "}";
          Reg = new RegExp(regtext);
          var replaceCount1 = repeatSte(replaceText, regArr[0]);
          var replaceCount2 = repeatSte(replaceText, regArr[2]);
          return str.replace(Reg, replaceCount1 + "$1" + replaceCount2);
        }
        if (1 === regArr.length && 0 == type) {
          regtext = "(^\\w{" + regArr[0] + "})";
          Reg = new RegExp(regtext);
          var replaceCount = repeatSte(replaceText, regArr[0]);
          return str.replace(Reg, replaceCount);
        }
        if (1 === regArr.length && 1 == type) {
          regtext = "(\\w{" + regArr[0] + "}$)";
          Reg = new RegExp(regtext);
          var replaceCount = repeatSte(replaceText, regArr[0]);
          return str.replace(Reg, replaceCount);
        }
      };
      GN.Str.checkType = function(str, type) {
        switch (type) {
         case "email":
          return /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(str);

         case "phone":
          return /^1[3|4|5|7|8|9][0-9]{9}$/.test(str);

         case "tel":
          return /^(0\d{2,3}-\d{7,8})(-\d{1,4})?$/.test(str);

         case "number":
          return /^[0-9]$/.test(str);

         case "english":
          return /^[a-zA-Z]+$/.test(str);

         case "chinese":
          return /^[\u4E00-\u9FA5]+$/.test(str);

         case "lower":
          return /^[a-z]+$/.test(str);

         case "upper":
          return /^[A-Z]+$/.test(str);

         default:
          return true;
        }
      };
      GN.Str.checkPwd = function(str) {
        var nowLv = 0;
        if (str.length < 6) return nowLv;
        /[0-9]/.test(str) && nowLv++;
        /[a-z]/.test(str) && nowLv++;
        /[A-Z]/.test(str) && nowLv++;
        /[\.|-|_]/.test(str) && nowLv++;
        return nowLv;
      };
      GN.Str.countStr = function(str, strSplit) {
        return str.split(strSplit).length - 1;
      };
      GN.Str.stringFormat = function() {
        if (arguments.length < 2) return;
        var str = arguments[0];
        if (2 == arguments.length && GN.Obj.instanceOf(arguments[1], "Array")) {
          var args = arguments[1];
          for (var i = 1; i <= args.length; i++) {
            var regx = new RegExp("\\{" + i + "\\}", "g");
            str = str.replace(regx, args[i - 1]);
          }
        } else for (var i = 1; i < arguments.length; i++) {
          var regx = new RegExp("\\{" + i + "\\}", "g");
          str = str.replace(regx, arguments[i]);
        }
        return str;
      };
      GN.Str.SubStr = function(type, str, FindObj, length) {
        if (-1 == str.indexOf(FindObj)) return str;
        switch (type) {
         case 1:
          return str.substr(str.indexOf(FindObj), length);

         case 2:
          return str.substr(str.lastIndexOf(FindObj), length);

         case 3:
          return str.substr(FindObj.length, length);

         default:
          return str;
        }
      };
      GN.Str.GetQueryString = function(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (null != r) return unescape(r[2]);
        return null;
      };
      GN.Str.getuuid = function() {
        function S4() {
          return (65536 * (1 + Math.random()) | 0).toString(16).substring(1);
        }
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
      };
    })();
    (function() {
      GN.Obj.instanceOf = function(o, type) {
        return toString.apply(o) === "[object " + type + "]" || _typeof(o) === type.toLowerCase();
      };
      GN.Obj.toJSON = function(str) {
        var _json = null;
        try {
          _json = JSON.parse(str);
        } catch (e) {
          console.log("to JSON ERROR=" + str);
        }
        return _json;
      };
      GN.Obj.getFileJSON = function(jsonfileName, CallBack, extraUrl) {
        var path = extraUrl || "resources/json/" + jsonfileName;
        var url = cc.url.raw(path);
        var str = cc.loader.load({
          url: url,
          type: "json"
        }, function(err, data) {
          if (err) {
            cc.error(err.message || err);
            return null;
          }
          cc.log("===============================\u52a0\u8f7d" + jsonfileName + "Begin==============");
          cc.log(data);
          cc.log("===============================\u52a0\u8f7d" + jsonfileName + "End=================");
          CallBack && CallBack(data);
          return data;
        });
      };
      GN.Obj.fmtData = function(Obj) {
        var data = JSON.stringify(Obj);
        return data;
      };
    })();
    module.exports = GN;
    cc._RF.pop();
  }, {} ],
  UIManager: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "83d25EDl4FJR4Tj7pkM7S93", "UIManager");
    "use strict";
    var _ui_layer_map = _ui_layer_map || {};
    cc.Class({
      extends: cc.Component,
      properties: {},
      onClickEventsBindMusic: function onClickEventsBindMusic() {
        cc.log("onClickEventsBindMusic");
        cc.myBaseMgr.AudioMgr.playSFX("SpecOk");
      },
      updateSpriteFrame: function updateSpriteFrame(imgUrl, target_) {
        var target = target_;
        imgUrl && imgUrl.indexOf("http") >= 0 ? cc.loader.load({
          url: imgUrl
        }, function(err, texture) {
          err ? cc.error(err) : target.isValid && (target.spriteFrame = new cc.SpriteFrame(texture));
        }) : cc.loader.loadRes(imgUrl, cc.SpriteFrame, function(err, spriteFrame) {
          err ? cc.log(err) : target.isValid && (target.spriteFrame = spriteFrame);
        });
      },
      initItemsInfo: function initItemsInfo(data, length, time) {
        var self = this;
        console.log("LY_UIManager = " + data);
        void 0 != data.Card_TYPE && "undefined" != data.Card_TYPE || (data.Card_TYPE = null);
        if (0 == data.itemsdata.length) return;
        data.node_fuJieDian.removeAllChildren();
        function createrItem(obj, index) {
          var item = cc.instantiate(data.prefab_yuZhiTi);
          if ("" != data.controllerJSName) {
            var itemInfoController = item.getComponent(data.controllerJSName);
            itemInfoController.setItemData(obj);
          }
          if ("" != data.viewJSName) {
            var itemInfoView = item.getComponent(data.viewJSName);
            itemInfoView.setAllinfo(obj, index + 1, data.Card_TYPE);
          }
          data.node_fuJieDian.addChild(item);
        }
        if (data.itemsdata.length >= length) {
          var callback = function callback() {
            if (index >= data.itemsdata.length) {
              self.unschedule(callback);
              return;
            }
            createrItem(data.itemsdata[index], index);
            index++;
          };
          cc.log("asdasda" + data.itemsdata);
          var index = 0;
          for (var i = 0; i < length - 1; i++) {
            createrItem(data.itemsdata[i], i);
            index++;
          }
          self.unschedule(callback);
          self.schedule(callback, time);
        } else for (var i = 0; i < data.itemsdata.length; i++) {
          cc.log("2\u5f85\u673a" + data.itemsdata[i]);
          createrItem(data.itemsdata[i], i);
        }
      },
      creater_Layer: function creater_Layer(layerName, args, callback) {
        var self = this;
        switch (layerName) {
         case "user_info_layer":
          self._loadRes_Layer("prefab/layer/user_info_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "set_layer":
          self._loadRes_Layer("prefab/layer/set_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "game_history_layer":
          self._loadRes_Layer("prefab/layer/game_history_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mail_layer":
          self._loadRes_Layer("prefab/layer/mail_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "rules_layer":
          self._loadRes_Layer("prefab/layer/rules_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "loading_layer":
          self._loadRes_Layer("prefab/layer/loading_layer", false, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "account_login_layer":
          self._loadRes_Layer("prefab/layer/account_login_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mahjong_game_over_layer":
          self._loadRes_Layer("prefab/layer/games/mahjong/mahjong_game_over_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var mahjong_game_over_layer = prefab.getComponent("Mahjong_game_over_layer");
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            mahjong_game_over_layer.setInitAll(args || null);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mahjong_game_maiZui_over_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/games/mahjong/maiZui/mahjong_game_maiZui_over_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var mahjong_game_over_layer = prefab.getComponent("Mahjong_game_maiZui_over_layer");
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            mahjong_game_over_layer.setInitAll(args || null);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mahjong_game_shangHaiQiaoMa_over_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/games/mahjong/shangHaiQiaoMa/mahjong_game_shangHaiQiaoMa_over_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var mahjong_game_over_layer = prefab.getComponent("Mahjong_game_shangHaiQiaoMa_over_layer");
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            mahjong_game_over_layer.setInitAll(args || null);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mahjong_game_maiZui_over_details_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/games/mahjong/maiZui/mahjong_game_maiZui_over_details_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var mahjong_game_over_layer = prefab.getComponent("Mahjong_game_maiZui_over_details_layer");
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            mahjong_game_over_layer.setInitAll(args || null);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "msg_layer":
          self._loadRes_Layer("prefab/layer/msg_layer", false, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var msg_Layer = prefab.getComponent("Msg_layer");
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            msg_Layer.setInitAll((args ? args["text"] : null) || null);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "select_box_layer":
          self._loadRes_Layer("prefab/layer/select_box_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var select_box_layer = prefab.getComponent("Select_box_layer");
            select_box_layer.setInfo(args);
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "shop_layer":
          self._loadRes_Layer("prefab/layer/shop_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "share_layer":
          self._loadRes_Layer("prefab/layer/share_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "game_service_info_layer":
          self._loadRes_Layer("prefab/layer/game_service_info_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "mahjong_game_maiZui_select_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/games/mahjong/maiZui/mahjong_game_maiZui_select_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "join_room_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/join_room_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            var joinRoomLayer = prefab.getComponent("Join_room_layer");
            joinRoomLayer && joinRoomLayer.setInitAll && joinRoomLayer.setInitAll(args || null);
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
          break;

         case "create_room_layer":
          if (_ui_layer_map[layerName]) {
            callback && callback(_ui_layer_map[layerName]);
            return;
          }
          self._loadRes_Layer("prefab/layer/create_room_layer", true, function(data) {
            var prefab = cc.instantiate(data);
            prefab.layerName = layerName;
            cc.director.getScene().getChildByName("Canvas").addChild(prefab);
            _ui_layer_map[layerName] = prefab;
            callback && callback(prefab);
          });
        }
      },
      remove_all_Layer: function remove_all_Layer() {
        for (var key in _ui_layer_map) if (Object.hasOwnProperty.call(_ui_layer_map, key)) {
          var element = _ui_layer_map[key];
          if (element) {
            element.destroy();
            _ui_layer_map[key] = null;
          }
        }
      },
      remove_Layer: function remove_Layer(layerName) {
        if (!_ui_layer_map[layerName]) return;
        _ui_layer_map[layerName].destroy();
        _ui_layer_map[layerName] = null;
      },
      _loadRes_Layer: function _loadRes_Layer(url, isAsync, callback) {
        var self = this;
        function loadRes(loding, loadingLayer) {
          cc.loader.loadRes(url, function(compCount, totalCount, item) {
            if (loadingLayer) {
              var per = Math.floor(100 * compCount / totalCount);
              loadingLayer.setBarLabel(per);
            }
          }, function(err, data) {
            err && cc.log("load sources is error");
            loding && loding.destroy();
            callback && callback(data);
          });
        }
        var loding = null, loadingLayer = null;
        isAsync ? this.creater_Layer("loading_layer", null, function(data) {
          loding = data;
          loadingLayer = loding.getComponent("Loading_layer");
          loadRes(loding, loadingLayer);
        }) : loadRes();
      },
      loadScene: function loadScene(sceneName, callback, callback1) {
        try {
          var self = this;
          var loding = null, loadingLayer = null;
          var __tScene = Date.now();
          this.creater_Layer("loading_layer", null, function(data) {
            loding = data;
            loadingLayer = loding.getComponent("Loading_layer");
            console.log("[\u573a\u666f\u8017\u65f6] " + sceneName + " loading\u5c42\u5c31\u7eea: " + (Date.now() - __tScene) + " ms\uff0c\u5f00\u59cb\u9884\u52a0\u8f7d");
            var __tPreload = Date.now();
            cc.director.preloadScene(sceneName, function(compCount, totalCount, item) {
              var per = Math.floor(100 * compCount / totalCount);
              loadingLayer.setBarLabel(per);
            }, function() {
              console.log("[\u573a\u666f\u8017\u65f6] " + sceneName + " \u9884\u52a0\u8f7d\u5b8c\u6210: " + (Date.now() - __tPreload) + " ms (\u603b\u8ba1 " + (Date.now() - __tScene) + " ms)");
              loding.destroy();
              self.remove_all_Layer();
              cc.director.loadScene(sceneName);
            });
          });
        } catch (err) {
          console.warn("err = by loadScene " + err);
        }
      },
      onRemove: function onRemove() {
        this.onClickEventsBindMusic();
        this.node.removeAllChildren();
        this.node.destroy();
        this.destroy();
        _ui_layer_map[this.node.layerName] = null;
      },
      addClickEventHandler: function addClickEventHandler(btn_node, target, component, handler, customEventData, clickEventsLength) {
        if (!btn_node) {
          console.warn("err = btn_node is null ");
          return;
        }
        if (!target) {
          console.warn("err = target is null ");
          return;
        }
        if (!component) {
          console.warn("err = component is null ");
          return;
        }
        if (!handler) {
          console.warn("err = handler is null ");
          return;
        }
        var clickEventHandler = new cc.Component.EventHandler();
        clickEventHandler.target = target;
        clickEventHandler.component = component;
        clickEventHandler.handler = handler;
        clickEventHandler.customEventData = customEventData;
        var button = btn_node.getComponent(cc.Button);
        if (-1 != clickEventsLength && button.clickEvents.length > clickEventsLength) {
          console.warn("button push error clickEventsLength is max   clickEventsLength = " + clickEventsLength);
          return;
        }
        button.clickEvents.push(clickEventHandler);
      }
    });
    cc._RF.pop();
  }, {} ],
  UserDao: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "57fb33xIMBIFr3aQBKyIv5k", "UserDao");
    "use strict";
    var UIManager = require("UIManager");
    var Label = require("LabelMsgManager");
    cc.Class({
      extends: UIManager,
      properties: {
        uid: null,
        userAccountId: null,
        headImgUrl: null,
        nickName: null,
        inviteCode: null,
        gold: null,
        beans: null,
        diamond: null,
        voucher: null,
        phone: null,
        sex: null,
        createtime: null,
        updatetime: null,
        token: null,
        appToken: null,
        appApiBaseUrl: null,
        appGameId: null,
        roomid: null
      },
      _setUserInfo: function _setUserInfo(req) {
        var userBaseinfo = req["userBaseinfo"] || null;
        if (userBaseinfo) {
          function pick(key) {
            return Object.prototype.hasOwnProperty.call(userBaseinfo, key) ? userBaseinfo[key] : null;
          }
          this.uid = pick("id");
          this.userAccountId = pick("user_account_id");
          this.headImgUrl = pick("head_img_url");
          this.nickName = pick("nick_name");
          this.inviteCode = pick("invite_code");
          this.gold = pick("gold");
          this.beans = pick("beans");
          this.diamond = pick("diamond");
          this.voucher = pick("voucher");
          this.phone = pick("phone");
          this.sex = pick("sex");
          this.createtime = pick("createTime");
          this.updatetime = pick("updateTime");
        }
        this.roomid = Object.prototype.hasOwnProperty.call(req, "roomid") ? req["roomid"] : null;
        cc.game_frame_EventMgr.pushEventImm("updateUserinfo");
      },
      _setUserToken: function _setUserToken(token) {
        this.token = token;
      },
      _getAppInit: function _getAppInit() {
        if ("undefined" == typeof window) return null;
        var app = window.__MAHJONG_APP_INIT__ || window.__GAME_APP_INIT__ || {};
        return app && app.userId && app.token ? app : null;
      },
      _getAppPoints: function _getAppPoints(app) {
        var keys = [ "points", "balance", "coin", "score", "integral", "credits", "point", "pointBalance", "userPoints", "gold", "beans", "diamond" ];
        for (var i = 0; i < keys.length; i++) {
          var value = app[keys[i]];
          if (void 0 !== value && null !== value && "" !== value) {
            var points = Number(value);
            if (isFinite(points)) return points;
          }
        }
        return 0;
      },
      applyAppLogin: function applyAppLogin(callback) {
        var app = this._getAppInit();
        if (!app) return false;
        var points = this._getAppPoints(app);
        isFinite(points) || (points = 0);
        var userId = String(app.userId);
        this.appToken = app.token || null;
        this.appApiBaseUrl = app.apiBaseUrl || null;
        this.appGameId = app.gameId || null;
        this.token = "app_" + userId;
        this._setUserInfo({
          userBaseinfo: {
            id: userId,
            user_account_id: userId,
            nick_name: app.nickname || app.account || "\u7528\u6237" + userId,
            head_img_url: app.avatar || "",
            gold: points,
            beans: points,
            diamond: points,
            voucher: 0,
            invite_code: "",
            phone: app.account || "",
            sex: 0
          },
          roomid: null
        });
        app.points = points;
        app.balance = points;
        app.coin = points;
        app.diamond = points;
        "undefined" != typeof window && window.__mahjongRefreshVisiblePoints && window.__mahjongRefreshVisiblePoints(points);
        callback && callback(cc.myBaseMgr.CODE.success, "ok", {
          token: this.token,
          userBaseinfo: {
            id: userId
          }
        });
        return true;
      },
      onVisitor_login: function onVisitor_login(visitor_account, callback) {
        if (this.applyAppLogin(callback)) return;
        var visitor_account = visitor_account;
        var self = this;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(visitor_account)) {
            callback && callback(cc.myBaseMgr.Tools.Str.stringFormat(cc.myBaseMgr.LabelMsg["ARGS_NULL"], cc.myBaseMgr.LabelMsg["ACCOUNT"]), null);
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          visitor_account: visitor_account
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/visitor_login", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            self._setUserToken(data.token);
          }
          callback && callback(code, msg, data);
        });
      },
      onGetLoginInfoByToken: function onGetLoginInfoByToken(callback) {
        if (this.applyAppLogin(callback)) return;
        var self = this;
        var token = this.token;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.not_login, null);
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        var resdata = {
          token: token
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/getLoginInfoByToken", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            self._setUserInfo(data);
          }
          callback && callback(code, msg, data);
        });
      },
      onLogin: function onLogin(data, callback) {
        var account = data["account"];
        var pwd = data["pwd"];
        var self = this;
        if ("" == cc.myBaseMgr.Tools.Str.trim(account, -1)) {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["ACCOUNT"]), null);
          return;
        }
        if (cc.myBaseMgr.Tools.Str.trim(pwd, -1).length < 6) {
          callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["A_OR_P"]), null);
          return;
        }
        var resdata = {
          account: account,
          password: pwd
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/login", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            self._setUserToken(data.token);
          }
          callback && callback(code, msg, data);
        });
      },
      onRegistered: function onRegistered(data, callback) {
        var account = data["account"];
        var tel = data["tel"];
        var phoneCode = data["phoneCode"];
        var pwd = data["pwd"];
        var again_pwd = data["again_pwd"];
        var self = this;
        function isNull() {
          if ("" == cc.myBaseMgr.Tools.Str.trim(account, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["ACCOUNT"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(tel, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["TEL"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(phoneCode, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["PHONE_CODE"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["PASSWORD"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(again_pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["AGAIN_PASSWORD"]), null);
            return;
          }
          return true;
        }
        function isError() {
          if (!cc.myBaseMgr.Tools.Str.checkType(cc.myBaseMgr.Tools.Str.trim(tel, -1), "phone")) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["TEL"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(pwd, -1).length < 6 || cc.myBaseMgr.Tools.Str.trim(pwd, -1).length > 16) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["PASS_MAX_LENGTH"], Label["PASSWORD"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(again_pwd, -1).length < 6 || cc.myBaseMgr.Tools.Str.trim(again_pwd, -1).length > 16) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["PASS_MAX_LENGTH"], Label["AGAIN_PASSWORD"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(pwd, -1) != cc.myBaseMgr.Tools.Str.trim(again_pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["PASSWORD"]), null);
            return;
          }
          return true;
        }
        if (!isNull() || !isError()) return;
        var resdata = {
          account: account,
          phone: tel,
          password: pwd,
          confirmPassword: again_pwd,
          phoneCode: phoneCode
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/register", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            self._setUserToken(data.token);
          }
          callback && callback(code, msg, data);
        });
      },
      onChangePassword: function onChangePassword(data, callback) {
        var account = data["account"];
        var tel = data["tel"];
        var phoneCode = data["phoneCode"];
        var pwd = data["pwd"];
        var again_pwd = data["again_pwd"];
        var self = this;
        function isNull() {
          if ("" == cc.myBaseMgr.Tools.Str.trim(account, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["ACCOUNT"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(tel, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["TEL"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(phoneCode, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["PHONE_CODE"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["PASSWORD"]), null);
            return;
          }
          if ("" == cc.myBaseMgr.Tools.Str.trim(again_pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_NULL"], Label["AGAIN_PASSWORD"]), null);
            return;
          }
          return true;
        }
        function isError() {
          if (!cc.myBaseMgr.Tools.Str.checkType(cc.myBaseMgr.Tools.Str.trim(tel, -1), "phone")) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["TEL"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(pwd, -1).length < 6 || cc.myBaseMgr.Tools.Str.trim(pwd, -1).length > 16) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["PASS_MAX_LENGTH"], Label["PASSWORD"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(again_pwd, -1).length < 6 || cc.myBaseMgr.Tools.Str.trim(again_pwd, -1).length > 16) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["PASS_MAX_LENGTH"], Label["AGAIN_PASSWORD"]), null);
            return;
          }
          if (cc.myBaseMgr.Tools.Str.trim(pwd, -1) != cc.myBaseMgr.Tools.Str.trim(again_pwd, -1)) {
            callback && callback(cc.myBaseMgr.CODE.clientError, cc.myBaseMgr.Tools.Str.stringFormat(Label["ARGS_ERROR"], Label["PASSWORD"]), null);
            return;
          }
          return true;
        }
        if (!isNull() || !isError()) return;
        var resdata = {
          account: account,
          phone: tel,
          password: pwd,
          confirmPassword: again_pwd,
          phoneCode: phoneCode
        };
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/modifyPassword", resdata, function(code, msg, data) {
          if (code == cc.myBaseMgr.CODE.success && data) {
            console.log("reqdata = ", data);
            self._setUserToken(data.token);
          }
          callback && callback(code, msg, data);
        });
      },
      exitLogin: function exitLogin(callback) {
        var token = this.token;
        function isNull() {
          if (!cc.myBaseMgr.DataMgr.isData_UnNull(token)) {
            callback && callback(cc.myBaseMgr.CODE.not_login, null);
            return;
          }
          return true;
        }
        function isError() {
          return true;
        }
        if (!isNull.bind(this)() || !isError.bind(this)()) return;
        cc.myBaseMgr.HTTP.post("/cloudgameapi/account/exitLogin", null, function(code, msg, data) {
          callback && callback(code, msg, data);
        });
      }
    });
    cc._RF.pop();
  }, {
    LabelMsgManager: "LabelMsgManager",
    UIManager: "UIManager"
  } ],
  User_info_item: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "b55a9MAl1RA76bNA49od2sF", "User_info_item");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        headImgUrl: {
          default: null,
          type: cc.Sprite,
          displayName: "\u5934\u50cf\u56fe\u7247",
          tooltip: "\u5934\u50cf\u56fe\u7247"
        },
        nickName: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6635\u79f0",
          tooltip: "\u7528\u6237\u6635\u79f0"
        },
        inviteCode: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u9080\u8bf7\u7801",
          tooltip: "\u7528\u6237\u9080\u8bf7\u7801"
        },
        gold: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u91d1\u5e01",
          tooltip: "\u7528\u6237\u91d1\u5e01"
        },
        beans: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u6b22\u4e50\u8c46",
          tooltip: "\u7528\u6237\u6b22\u4e50\u8c46"
        },
        diamond: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u94bb\u77f3",
          tooltip: "\u7528\u6237\u94bb\u77f3"
        },
        voucher: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u5151\u6362\u5377",
          tooltip: "\u7528\u6237\u5151\u6362\u5377"
        },
        phone: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237\u624b\u673a\u53f7",
          tooltip: "\u7528\u6237\u624b\u673a\u53f7"
        },
        user_id: {
          default: null,
          type: cc.Label,
          displayName: "\u7528\u6237ID",
          tooltip: "\u7528\u6237ID"
        }
      },
      onLoad: function onLoad() {
        this.setAllinfo();
        this.initEvents();
      },
      onDisable: function onDisable() {
        cc.game_frame_EventMgr.off(this);
      },
      initEvents: function initEvents() {
        cc.game_frame_EventMgr.def("updateUserinfo", this.setAllinfo, this);
      },
      setAllinfo: function setAllinfo() {
        this.setHeadImg(cc.myBaseMgr.DAO.UserDao.headImgUrl);
        this.setNickName(cc.myBaseMgr.DAO.UserDao.nickName + cc.myBaseMgr.DAO.UserDao.userAccountId + "");
        this.setInviteCode(cc.myBaseMgr.DAO.UserDao.inviteCode);
        this.setGold(cc.myBaseMgr.DAO.UserDao.gold);
        this.setBeans(cc.myBaseMgr.DAO.UserDao.beans);
        this.setDiamond(cc.myBaseMgr.DAO.UserDao.diamond);
        this.setVoucher(cc.myBaseMgr.DAO.UserDao.voucher);
        this.setPhone(cc.myBaseMgr.DAO.UserDao.phone);
        this.setUser_id(cc.myBaseMgr.DAO.UserDao.userAccountId);
        if ("undefined" != typeof window && window.__mahjongRefreshVisiblePoints) {
          var points = cc.myBaseMgr.DAO.UserDao.diamond;
          (void 0 === points || null === points || "" === points) && (points = cc.myBaseMgr.DAO.UserDao.gold);
          (void 0 === points || null === points || "" === points) && (points = cc.myBaseMgr.DAO.UserDao.beans);
          window.__mahjongRefreshVisiblePoints(points);
        }
      },
      setHeadImg: function setHeadImg(headImgUrl) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.headImgUrl) || !cc.myBaseMgr.DataMgr.isData_UnNull(headImgUrl)) return;
        this.updateSpriteFrame(headImgUrl, self.headImgUrl);
      },
      setNickName: function setNickName(nickName) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.nickName) || !cc.myBaseMgr.DataMgr.isData_UnNull(nickName)) return;
        var form_nickName = "";
        if (nickName.length > 10) {
          for (var i = 0; i < 10; i++) {
            var element = nickName[i];
            form_nickName += element;
          }
          this.nickName.string = form_nickName + "....";
        } else {
          form_nickName = nickName;
          this.nickName.string = form_nickName;
        }
      },
      setInviteCode: function setInviteCode(inviteCode) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.inviteCode) || !cc.myBaseMgr.DataMgr.isData_UnNull(inviteCode)) return;
        this.inviteCode.string = inviteCode;
      },
      setGold: function setGold(gold) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.gold) || !cc.myBaseMgr.DataMgr.isData_UnNull(gold)) return;
        this.gold.string = gold;
      },
      setBeans: function setBeans(beans) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.beans) || !cc.myBaseMgr.DataMgr.isData_UnNull(beans)) return;
        this.beans.string = beans;
      },
      setDiamond: function setDiamond(diamond) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.diamond) || !cc.myBaseMgr.DataMgr.isData_UnNull(diamond)) return;
        this.diamond.string = diamond;
      },
      setVoucher: function setVoucher(voucher) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.voucher) || !cc.myBaseMgr.DataMgr.isData_UnNull(voucher)) return;
        this.voucher.string = voucher;
      },
      setPhone: function setPhone(phone) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.phone) || !cc.myBaseMgr.DataMgr.isData_UnNull(phone)) return;
        this.phone.string = phone;
      },
      setUser_id: function setUser_id(uid) {
        var self = this;
        if (!cc.myBaseMgr.DataMgr.isData_UnNull(this.user_id) || !cc.myBaseMgr.DataMgr.isData_UnNull(uid)) return;
        this.user_id.string = cc.myBaseMgr.LabelMsg["ID"] + uid;
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  User_info_layer: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "81eb1Pnko9BdoFnZAGlyrDa", "User_info_layer");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {},
      start: function start() {},
      oncloseClickEvents: function oncloseClickEvents() {
        this.onRemove();
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  WSMsgKeyEnum: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "1d6c1EB+5BIEosMCtNkiwpg", "WSMsgKeyEnum");
    "use strict";
    module.exports = {
      system: {
        on: {
          message_type_banner: "on_sys_message_type_banner",
          sysError: "on_sys_error"
        },
        service: {
          connect: "connect",
          connect_error: "connect_error",
          disconnect: "disconnect",
          reconnect_failed: "reconnect_failed",
          reconnect: "reconnect",
          sys_error: "on_sys_error",
          message_type_banner: "message_type_banner",
          sysError: "sysError"
        }
      },
      matching: {
        on: {
          matching_win_all: "on_matching_win_all",
          exit_matching: "on_exit_matching",
          start_matching: "on_start_matching",
          update_matching_all: "on_update_matching_all"
        },
        send: {
          start_matching: "start_matching",
          exit_matching: "exit_matching"
        },
        service: {
          start_matching: "start_matching",
          matching_win_all: "start_matching_win_all",
          exit_matching: "exit_matching",
          update_matching_all: "update_matching_all"
        }
      },
      room: {
        on: {},
        send: {
          joinRoom: "joinRoom",
          prepare: "prepare",
          cancelPrepare: "cancelPrepare"
        },
        service: {
          next_game: "next_game",
          directly_exit_game: "directly_exit_game"
        }
      },
      maJiang: {
        on: {
          update_hand_holds: "on_update_hand_holds",
          update_room_info_all: "on_update_room_info_all",
          update_countdown_all: "on_update_countdown_all"
        },
        send: {
          send_card: "send_card",
          knock_card: "knock_card",
          collision_card: "collision_card",
          skip_this_part: "skip_this_part",
          hu_card: "hu_card",
          trusteeship: "trusteeship",
          cancel_trusteepship: "cancel_trusteepship",
          ting_card: "ting_card"
        },
        service: {
          update_room_info_all: "update_room_info_all",
          update_countdown_all: "update_countdown_all",
          update_hand_holds: "update_hand_holds",
          update_knock_card: "update_knock_card"
        }
      },
      QuYangMaJiang: {
        on: {},
        send: {
          hide_cards: "hide_cards",
          stop_hide_cards: "stop_hide_cards"
        },
        service: {}
      },
      MaiZui: {
        on: {},
        send: {
          maizui: "maizui"
        },
        service: {}
      },
      ShangHaiQiaoMa: {
        on: {},
        send: {
          shaizi: "shaizi"
        },
        service: {}
      }
    };
    cc._RF.pop();
  }, {} ],
  hand_holds_operating: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "46063O8SKpI0JhIXi26NedC", "hand_holds_operating");
    "use strict";
    var UIManager = require("UIManager");
    cc.Class({
      extends: UIManager,
      properties: {
        card_item: {
          default: null,
          type: cc.Prefab,
          displayName: "card_item",
          tooltip: "\u724c\u9884\u5236\u4f53"
        },
        content: {
          default: null,
          type: cc.Node,
          displayName: "\u9884\u5236\u4f53\u7236\u8282\u70b9",
          tooltip: "\u9884\u5236\u4f53\u7236\u8282\u70b9"
        }
      },
      onLoad: function onLoad() {},
      start: function start() {},
      initcard_data: function initcard_data(data, viewJSName, Card_TYPE) {
        if (data.length > 0) {
          var resdata = {
            itemsdata: data,
            node_fuJieDian: this.content,
            prefab_yuZhiTi: this.card_item,
            controllerJSName: "",
            viewJSName: viewJSName,
            Card_TYPE: Card_TYPE
          };
          this.initItemsInfo(resdata, 1, .15);
        }
      }
    });
    cc._RF.pop();
  }, {
    UIManager: "UIManager"
  } ],
  "socket.io": [ function(require, module, exports) {
    (function(Buffer) {
      "use strict";
      cc._RF.push(module, "4192adiJtdN9JDtFdIIMk9g", "socket.io");
      "use strict";
      function _typeof(obj) {
        "@babel/helpers - typeof";
        _typeof = "function" === typeof Symbol && "symbol" === typeof Symbol.iterator ? function _typeof(obj) {
          return typeof obj;
        } : function _typeof(obj) {
          return obj && "function" === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        };
        return _typeof(obj);
      }
      !function(t, e) {
        "object" == ("undefined" === typeof exports ? "undefined" : _typeof(exports)) && "object" == ("undefined" === typeof module ? "undefined" : _typeof(module)) ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == ("undefined" === typeof exports ? "undefined" : _typeof(exports)) ? exports.io = e() : t.io = e();
      }(void 0, function() {
        return function(t) {
          function e(r) {
            if (n[r]) return n[r].exports;
            var o = n[r] = {
              exports: {},
              id: r,
              loaded: !1
            };
            return t[r].call(o.exports, o, o.exports, e), o.loaded = !0, o.exports;
          }
          var n = {};
          return e.m = t, e.c = n, e.p = "", e(0);
        }([ function(t, e, n) {
          function r(t, e) {
            "object" == _typeof(t) && (e = t, t = void 0), e = e || {};
            var n, r = o(t), i = r.source, u = r.id, p = r.path, h = c[u] && p in c[u].nsps, f = e.forceNew || e["force new connection"] || !1 === e.multiplex || h;
            return f ? (a("ignoring socket cache for %s", i), n = s(i, e)) : (c[u] || (a("new io instance for %s", i), 
            c[u] = s(i, e)), n = c[u]), r.query && !e.query && (e.query = r.query), n.socket(r.path, e);
          }
          var o = n(1), i = n(7), s = n(15), a = n(3)("socket.io-client");
          t.exports = e = r;
          var c = e.managers = {};
          e.protocol = i.protocol, e.connect = r, e.Manager = n(15), e.Socket = n(39);
        }, function(t, e, n) {
          function r(t, e) {
            var n = t;
            e = e || "undefined" != typeof location && location, null == t && (t = e.protocol + "//" + e.host), 
            "string" == typeof t && ("/" === t.charAt(0) && (t = "/" === t.charAt(1) ? e.protocol + t : e.host + t), 
            /^(https?|wss?):\/\//.test(t) || (i("protocol-less url %s", t), t = "undefined" != typeof e ? e.protocol + "//" + t : "https://" + t), 
            i("parse %s", t), n = o(t)), n.port || (/^(http|ws)$/.test(n.protocol) ? n.port = "80" : /^(http|ws)s$/.test(n.protocol) && (n.port = "443")), 
            n.path = n.path || "/";
            var r = -1 !== n.host.indexOf(":"), s = r ? "[" + n.host + "]" : n.host;
            return n.id = n.protocol + "://" + s + ":" + n.port, n.href = n.protocol + "://" + s + (e && e.port === n.port ? "" : ":" + n.port), 
            n;
          }
          var o = n(2), i = n(3)("socket.io-client:url");
          t.exports = r;
        }, function(t, e) {
          var n = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/, r = [ "source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor" ];
          t.exports = function(t) {
            var e = t, o = t.indexOf("["), i = t.indexOf("]");
            -1 != o && -1 != i && (t = t.substring(0, o) + t.substring(o, i).replace(/:/g, ";") + t.substring(i, t.length));
            for (var s = n.exec(t || ""), a = {}, c = 14; c--; ) a[r[c]] = s[c] || "";
            return -1 != o && -1 != i && (a.source = e, a.host = a.host.substring(1, a.host.length - 1).replace(/;/g, ":"), 
            a.authority = a.authority.replace("[", "").replace("]", "").replace(/;/g, ":"), 
            a.ipv6uri = !0), a;
          };
        }, function(t, e, n) {
          (function(r) {
            function o() {
              return !("undefined" == typeof window || !window.process || "renderer" !== window.process.type && !window.process.__nwjs) || ("undefined" == typeof navigator || !navigator.userAgent || !navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) && ("undefined" != typeof document && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || "undefined" != typeof window && window.console && (window.console.firebug || window.console.exception && window.console.table) || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
            }
            function i(e) {
              if (e[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + e[0] + (this.useColors ? "%c " : " ") + "+" + t.exports.humanize(this.diff), 
              this.useColors) {
                var n = "color: " + this.color;
                e.splice(1, 0, n, "color: inherit");
                var r = 0, o = 0;
                e[0].replace(/%[a-zA-Z%]/g, function(t) {
                  "%%" !== t && (r++, "%c" === t && (o = r));
                }), e.splice(o, 0, n);
              }
            }
            function s() {
              var t;
              return "object" === ("undefined" == typeof console ? "undefined" : p(console)) && console.log && (t = console).log.apply(t, arguments);
            }
            function a(t) {
              try {
                t ? e.storage.setItem("debug", t) : e.storage.removeItem("debug");
              } catch (n) {}
            }
            function c() {
              var t = void 0;
              try {
                t = e.storage.getItem("debug");
              } catch (n) {}
              return !t && "undefined" != typeof r && "env" in r && (t = r.env.DEBUG), t;
            }
            function u() {
              try {
                return localStorage;
              } catch (t) {}
            }
            var p = "function" == typeof Symbol && "symbol" == _typeof(Symbol.iterator) ? function(t) {
              return _typeof(t);
            } : function(t) {
              return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : _typeof(t);
            };
            e.log = s, e.formatArgs = i, e.save = a, e.load = c, e.useColors = o, e.storage = u(), 
            e.colors = [ "#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33" ], 
            t.exports = n(5)(e);
            var h = t.exports.formatters;
            h.j = function(t) {
              try {
                return JSON.stringify(t);
              } catch (e) {
                return "[UnexpectedJSONParseError]: " + e.message;
              }
            };
          }).call(e, n(4));
        }, function(t, e) {
          function n() {
            throw new Error("setTimeout has not been defined");
          }
          function r() {
            throw new Error("clearTimeout has not been defined");
          }
          function o(t) {
            if (p === setTimeout) return setTimeout(t, 0);
            if ((p === n || !p) && setTimeout) return p = setTimeout, setTimeout(t, 0);
            try {
              return p(t, 0);
            } catch (e) {
              try {
                return p.call(null, t, 0);
              } catch (e) {
                return p.call(this, t, 0);
              }
            }
          }
          function i(t) {
            if (h === clearTimeout) return clearTimeout(t);
            if ((h === r || !h) && clearTimeout) return h = clearTimeout, clearTimeout(t);
            try {
              return h(t);
            } catch (e) {
              try {
                return h.call(null, t);
              } catch (e) {
                return h.call(this, t);
              }
            }
          }
          function s() {
            y && l && (y = !1, l.length ? d = l.concat(d) : m = -1, d.length && a());
          }
          function a() {
            if (!y) {
              var t = o(s);
              y = !0;
              for (var e = d.length; e; ) {
                for (l = d, d = []; ++m < e; ) l && l[m].run();
                m = -1, e = d.length;
              }
              l = null, y = !1, i(t);
            }
          }
          function c(t, e) {
            this.fun = t, this.array = e;
          }
          function u() {}
          var p, h, f = t.exports = {};
          !function() {
            try {
              p = "function" == typeof setTimeout ? setTimeout : n;
            } catch (t) {
              p = n;
            }
            try {
              h = "function" == typeof clearTimeout ? clearTimeout : r;
            } catch (t) {
              h = r;
            }
          }();
          var l, d = [], y = !1, m = -1;
          f.nextTick = function(t) {
            var e = new Array(arguments.length - 1);
            if (arguments.length > 1) for (var n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
            d.push(new c(t, e)), 1 !== d.length || y || o(a);
          }, c.prototype.run = function() {
            this.fun.apply(null, this.array);
          }, f.title = "browser", f.browser = !0, f.env = {}, f.argv = [], f.version = "", 
          f.versions = {}, f.on = u, f.addListener = u, f.once = u, f.off = u, f.removeListener = u, 
          f.removeAllListeners = u, f.emit = u, f.prependListener = u, f.prependOnceListener = u, 
          f.listeners = function(t) {
            return [];
          }, f.binding = function(t) {
            throw new Error("process.binding is not supported");
          }, f.cwd = function() {
            return "/";
          }, f.chdir = function(t) {
            throw new Error("process.chdir is not supported");
          }, f.umask = function() {
            return 0;
          };
        }, function(t, e, n) {
          function r(t) {
            if (Array.isArray(t)) {
              for (var e = 0, n = Array(t.length); e < t.length; e++) n[e] = t[e];
              return n;
            }
            return Array.from(t);
          }
          function o(t) {
            function e(t) {
              for (var e = 0, n = 0; n < t.length; n++) e = (e << 5) - e + t.charCodeAt(n), e |= 0;
              return o.colors[Math.abs(e) % o.colors.length];
            }
            function o(t) {
              function n() {
                for (var t = arguments.length, e = Array(t), i = 0; i < t; i++) e[i] = arguments[i];
                if (n.enabled) {
                  var s = n, a = Number(new Date()), c = a - (r || a);
                  s.diff = c, s.prev = r, s.curr = a, r = a, e[0] = o.coerce(e[0]), "string" != typeof e[0] && e.unshift("%O");
                  var u = 0;
                  e[0] = e[0].replace(/%([a-zA-Z%])/g, function(t, n) {
                    if ("%%" === t) return t;
                    u++;
                    var r = o.formatters[n];
                    if ("function" == typeof r) {
                      var i = e[u];
                      t = r.call(s, i), e.splice(u, 1), u--;
                    }
                    return t;
                  }), o.formatArgs.call(s, e);
                  var p = s.log || o.log;
                  p.apply(s, e);
                }
              }
              var r = void 0;
              return n.namespace = t, n.enabled = o.enabled(t), n.useColors = o.useColors(), n.color = e(t), 
              n.destroy = i, n.extend = s, "function" == typeof o.init && o.init(n), o.instances.push(n), 
              n;
            }
            function i() {
              var t = o.instances.indexOf(this);
              return -1 !== t && (o.instances.splice(t, 1), !0);
            }
            function s(t, e) {
              var n = o(this.namespace + ("undefined" == typeof e ? ":" : e) + t);
              return n.log = this.log, n;
            }
            function a(t) {
              o.save(t), o.names = [], o.skips = [];
              var e = void 0, n = ("string" == typeof t ? t : "").split(/[\s,]+/), r = n.length;
              for (e = 0; e < r; e++) n[e] && (t = n[e].replace(/\*/g, ".*?"), "-" === t[0] ? o.skips.push(new RegExp("^" + t.substr(1) + "$")) : o.names.push(new RegExp("^" + t + "$")));
              for (e = 0; e < o.instances.length; e++) {
                var i = o.instances[e];
                i.enabled = o.enabled(i.namespace);
              }
            }
            function c() {
              var t = [].concat(r(o.names.map(p)), r(o.skips.map(p).map(function(t) {
                return "-" + t;
              }))).join(",");
              return o.enable(""), t;
            }
            function u(t) {
              if ("*" === t[t.length - 1]) return !0;
              var e = void 0, n = void 0;
              for (e = 0, n = o.skips.length; e < n; e++) if (o.skips[e].test(t)) return !1;
              for (e = 0, n = o.names.length; e < n; e++) if (o.names[e].test(t)) return !0;
              return !1;
            }
            function p(t) {
              return t.toString().substring(2, t.toString().length - 2).replace(/\.\*\?$/, "*");
            }
            function h(t) {
              return t instanceof Error ? t.stack || t.message : t;
            }
            return o.debug = o, o["default"] = o, o.coerce = h, o.disable = c, o.enable = a, 
            o.enabled = u, o.humanize = n(6), Object.keys(t).forEach(function(e) {
              o[e] = t[e];
            }), o.instances = [], o.names = [], o.skips = [], o.formatters = {}, o.selectColor = e, 
            o.enable(o.load()), o;
          }
          t.exports = o;
        }, function(t, e) {
          function n(t) {
            if (t = String(t), !(t.length > 100)) {
              var e = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(t);
              if (e) {
                var n = parseFloat(e[1]), r = (e[2] || "ms").toLowerCase();
                switch (r) {
                 case "years":
                 case "year":
                 case "yrs":
                 case "yr":
                 case "y":
                  return n * h;

                 case "weeks":
                 case "week":
                 case "w":
                  return n * p;

                 case "days":
                 case "day":
                 case "d":
                  return n * u;

                 case "hours":
                 case "hour":
                 case "hrs":
                 case "hr":
                 case "h":
                  return n * c;

                 case "minutes":
                 case "minute":
                 case "mins":
                 case "min":
                 case "m":
                  return n * a;

                 case "seconds":
                 case "second":
                 case "secs":
                 case "sec":
                 case "s":
                  return n * s;

                 case "milliseconds":
                 case "millisecond":
                 case "msecs":
                 case "msec":
                 case "ms":
                  return n;

                 default:
                  return;
                }
              }
            }
          }
          function r(t) {
            var e = Math.abs(t);
            return e >= u ? Math.round(t / u) + "d" : e >= c ? Math.round(t / c) + "h" : e >= a ? Math.round(t / a) + "m" : e >= s ? Math.round(t / s) + "s" : t + "ms";
          }
          function o(t) {
            var e = Math.abs(t);
            return e >= u ? i(t, e, u, "day") : e >= c ? i(t, e, c, "hour") : e >= a ? i(t, e, a, "minute") : e >= s ? i(t, e, s, "second") : t + " ms";
          }
          function i(t, e, n, r) {
            var o = e >= 1.5 * n;
            return Math.round(t / n) + " " + r + (o ? "s" : "");
          }
          var s = 1e3, a = 60 * s, c = 60 * a, u = 24 * c, p = 7 * u, h = 365.25 * u;
          t.exports = function(t, e) {
            e = e || {};
            var i = _typeof(t);
            if ("string" === i && t.length > 0) return n(t);
            if ("number" === i && isFinite(t)) return e["long"] ? o(t) : r(t);
            throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(t));
          };
        }, function(t, e, n) {
          function r() {}
          function o(t) {
            var n = "" + t.type;
            if (e.BINARY_EVENT !== t.type && e.BINARY_ACK !== t.type || (n += t.attachments + "-"), 
            t.nsp && "/" !== t.nsp && (n += t.nsp + ","), null != t.id && (n += t.id), null != t.data) {
              var r = i(t.data);
              if (!1 === r) return g;
              n += r;
            }
            return f("encoded %j as %s", t, n), n;
          }
          function i(t) {
            try {
              return JSON.stringify(t);
            } catch (e) {
              return !1;
            }
          }
          function s(t, e) {
            function n(t) {
              var n = d.deconstructPacket(t), r = o(n.packet), i = n.buffers;
              i.unshift(r), e(i);
            }
            d.removeBlobs(t, n);
          }
          function a() {
            this.reconstructor = null;
          }
          function c(t) {
            var n = 0, r = {
              type: Number(t.charAt(0))
            };
            if (null == e.types[r.type]) return h("unknown packet type " + r.type);
            if (e.BINARY_EVENT === r.type || e.BINARY_ACK === r.type) {
              for (var o = ""; "-" !== t.charAt(++n) && (o += t.charAt(n), n != t.length); ) ;
              if (o != Number(o) || "-" !== t.charAt(n)) throw new Error("Illegal attachments");
              r.attachments = Number(o);
            }
            if ("/" === t.charAt(n + 1)) for (r.nsp = ""; ++n; ) {
              var i = t.charAt(n);
              if ("," === i) break;
              if (r.nsp += i, n === t.length) break;
            } else r.nsp = "/";
            var s = t.charAt(n + 1);
            if ("" !== s && Number(s) == s) {
              for (r.id = ""; ++n; ) {
                var i = t.charAt(n);
                if (null == i || Number(i) != i) {
                  --n;
                  break;
                }
                if (r.id += t.charAt(n), n === t.length) break;
              }
              r.id = Number(r.id);
            }
            if (t.charAt(++n)) {
              var a = u(t.substr(n)), c = !1 !== a && (r.type === e.ERROR || y(a));
              if (!c) return h("invalid payload");
              r.data = a;
            }
            return f("decoded %s as %j", t, r), r;
          }
          function u(t) {
            try {
              return JSON.parse(t);
            } catch (e) {
              return !1;
            }
          }
          function p(t) {
            this.reconPack = t, this.buffers = [];
          }
          function h(t) {
            return {
              type: e.ERROR,
              data: "parser error: " + t
            };
          }
          var f = n(8)("socket.io-parser"), l = n(11), d = n(12), y = n(13), m = n(14);
          e.protocol = 4, e.types = [ "CONNECT", "DISCONNECT", "EVENT", "ACK", "ERROR", "BINARY_EVENT", "BINARY_ACK" ], 
          e.CONNECT = 0, e.DISCONNECT = 1, e.EVENT = 2, e.ACK = 3, e.ERROR = 4, e.BINARY_EVENT = 5, 
          e.BINARY_ACK = 6, e.Encoder = r, e.Decoder = a;
          var g = e.ERROR + '"encode error"';
          r.prototype.encode = function(t, n) {
            if (f("encoding packet %j", t), e.BINARY_EVENT === t.type || e.BINARY_ACK === t.type) s(t, n); else {
              var r = o(t);
              n([ r ]);
            }
          }, l(a.prototype), a.prototype.add = function(t) {
            var n;
            if ("string" == typeof t) n = c(t), e.BINARY_EVENT === n.type || e.BINARY_ACK === n.type ? (this.reconstructor = new p(n), 
            0 === this.reconstructor.reconPack.attachments && this.emit("decoded", n)) : this.emit("decoded", n); else {
              if (!m(t) && !t.base64) throw new Error("Unknown type: " + t);
              if (!this.reconstructor) throw new Error("got binary data when not reconstructing a packet");
              n = this.reconstructor.takeBinaryData(t), n && (this.reconstructor = null, this.emit("decoded", n));
            }
          }, a.prototype.destroy = function() {
            this.reconstructor && this.reconstructor.finishedReconstruction();
          }, p.prototype.takeBinaryData = function(t) {
            if (this.buffers.push(t), this.buffers.length === this.reconPack.attachments) {
              var e = d.reconstructPacket(this.reconPack, this.buffers);
              return this.finishedReconstruction(), e;
            }
            return null;
          }, p.prototype.finishedReconstruction = function() {
            this.reconPack = null, this.buffers = [];
          };
        }, function(t, e, n) {
          (function(r) {
            function o() {
              return !("undefined" == typeof window || !window.process || "renderer" !== window.process.type) || ("undefined" == typeof navigator || !navigator.userAgent || !navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) && ("undefined" != typeof document && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || "undefined" != typeof window && window.console && (window.console.firebug || window.console.exception && window.console.table) || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
            }
            function i(t) {
              var n = this.useColors;
              if (t[0] = (n ? "%c" : "") + this.namespace + (n ? " %c" : " ") + t[0] + (n ? "%c " : " ") + "+" + e.humanize(this.diff), 
              n) {
                var r = "color: " + this.color;
                t.splice(1, 0, r, "color: inherit");
                var o = 0, i = 0;
                t[0].replace(/%[a-zA-Z%]/g, function(t) {
                  "%%" !== t && (o++, "%c" === t && (i = o));
                }), t.splice(i, 0, r);
              }
            }
            function s() {
              return "object" === ("undefined" == typeof console ? "undefined" : p(console)) && console.log && Function.prototype.apply.call(console.log, console, arguments);
            }
            function a(t) {
              try {
                null == t ? e.storage.removeItem("debug") : e.storage.debug = t;
              } catch (n) {}
            }
            function c() {
              var t;
              try {
                t = e.storage.debug;
              } catch (n) {}
              return !t && "undefined" != typeof r && "env" in r && (t = r.env.DEBUG), t;
            }
            function u() {
              try {
                return window.localStorage;
              } catch (t) {}
            }
            var p = "function" == typeof Symbol && "symbol" == _typeof(Symbol.iterator) ? function(t) {
              return _typeof(t);
            } : function(t) {
              return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : _typeof(t);
            };
            e = t.exports = n(9), e.log = s, e.formatArgs = i, e.save = a, e.load = c, e.useColors = o, 
            e.storage = "undefined" != typeof chrome && "undefined" != typeof chrome.storage ? chrome.storage.local : u(), 
            e.colors = [ "#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33" ], 
            e.formatters.j = function(t) {
              try {
                return JSON.stringify(t);
              } catch (e) {
                return "[UnexpectedJSONParseError]: " + e.message;
              }
            }, e.enable(c());
          }).call(e, n(4));
        }, function(t, e, n) {
          function r(t) {
            var n, r = 0;
            for (n in t) r = (r << 5) - r + t.charCodeAt(n), r |= 0;
            return e.colors[Math.abs(r) % e.colors.length];
          }
          function o(t) {
            function n() {
              if (n.enabled) {
                var t = n, r = +new Date(), i = r - (o || r);
                t.diff = i, t.prev = o, t.curr = r, o = r;
                for (var s = new Array(arguments.length), a = 0; a < s.length; a++) s[a] = arguments[a];
                s[0] = e.coerce(s[0]), "string" != typeof s[0] && s.unshift("%O");
                var c = 0;
                s[0] = s[0].replace(/%([a-zA-Z%])/g, function(n, r) {
                  if ("%%" === n) return n;
                  c++;
                  var o = e.formatters[r];
                  if ("function" == typeof o) {
                    var i = s[c];
                    n = o.call(t, i), s.splice(c, 1), c--;
                  }
                  return n;
                }), e.formatArgs.call(t, s);
                var u = n.log || e.log || console.log.bind(console);
                u.apply(t, s);
              }
            }
            var o;
            return n.namespace = t, n.enabled = e.enabled(t), n.useColors = e.useColors(), n.color = r(t), 
            n.destroy = i, "function" == typeof e.init && e.init(n), e.instances.push(n), n;
          }
          function i() {
            var t = e.instances.indexOf(this);
            return -1 !== t && (e.instances.splice(t, 1), !0);
          }
          function s(t) {
            e.save(t), e.names = [], e.skips = [];
            var n, r = ("string" == typeof t ? t : "").split(/[\s,]+/), o = r.length;
            for (n = 0; n < o; n++) r[n] && (t = r[n].replace(/\*/g, ".*?"), "-" === t[0] ? e.skips.push(new RegExp("^" + t.substr(1) + "$")) : e.names.push(new RegExp("^" + t + "$")));
            for (n = 0; n < e.instances.length; n++) {
              var i = e.instances[n];
              i.enabled = e.enabled(i.namespace);
            }
          }
          function a() {
            e.enable("");
          }
          function c(t) {
            if ("*" === t[t.length - 1]) return !0;
            var n, r;
            for (n = 0, r = e.skips.length; n < r; n++) if (e.skips[n].test(t)) return !1;
            for (n = 0, r = e.names.length; n < r; n++) if (e.names[n].test(t)) return !0;
            return !1;
          }
          function u(t) {
            return t instanceof Error ? t.stack || t.message : t;
          }
          e = t.exports = o.debug = o["default"] = o, e.coerce = u, e.disable = a, e.enable = s, 
          e.enabled = c, e.humanize = n(10), e.instances = [], e.names = [], e.skips = [], 
          e.formatters = {};
        }, function(t, e) {
          function n(t) {
            if (t = String(t), !(t.length > 100)) {
              var e = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(t);
              if (e) {
                var n = parseFloat(e[1]), r = (e[2] || "ms").toLowerCase();
                switch (r) {
                 case "years":
                 case "year":
                 case "yrs":
                 case "yr":
                 case "y":
                  return n * p;

                 case "days":
                 case "day":
                 case "d":
                  return n * u;

                 case "hours":
                 case "hour":
                 case "hrs":
                 case "hr":
                 case "h":
                  return n * c;

                 case "minutes":
                 case "minute":
                 case "mins":
                 case "min":
                 case "m":
                  return n * a;

                 case "seconds":
                 case "second":
                 case "secs":
                 case "sec":
                 case "s":
                  return n * s;

                 case "milliseconds":
                 case "millisecond":
                 case "msecs":
                 case "msec":
                 case "ms":
                  return n;

                 default:
                  return;
                }
              }
            }
          }
          function r(t) {
            return t >= u ? Math.round(t / u) + "d" : t >= c ? Math.round(t / c) + "h" : t >= a ? Math.round(t / a) + "m" : t >= s ? Math.round(t / s) + "s" : t + "ms";
          }
          function o(t) {
            return i(t, u, "day") || i(t, c, "hour") || i(t, a, "minute") || i(t, s, "second") || t + " ms";
          }
          function i(t, e, n) {
            if (!(t < e)) return t < 1.5 * e ? Math.floor(t / e) + " " + n : Math.ceil(t / e) + " " + n + "s";
          }
          var s = 1e3, a = 60 * s, c = 60 * a, u = 24 * c, p = 365.25 * u;
          t.exports = function(t, e) {
            e = e || {};
            var i = _typeof(t);
            if ("string" === i && t.length > 0) return n(t);
            if ("number" === i && !1 === isNaN(t)) return e["long"] ? o(t) : r(t);
            throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(t));
          };
        }, function(t, e, n) {
          function r(t) {
            if (t) return o(t);
          }
          function o(t) {
            for (var e in r.prototype) t[e] = r.prototype[e];
            return t;
          }
          t.exports = r, r.prototype.on = r.prototype.addEventListener = function(t, e) {
            return this._callbacks = this._callbacks || {}, (this._callbacks["$" + t] = this._callbacks["$" + t] || []).push(e), 
            this;
          }, r.prototype.once = function(t, e) {
            function n() {
              this.off(t, n), e.apply(this, arguments);
            }
            return n.fn = e, this.on(t, n), this;
          }, r.prototype.off = r.prototype.removeListener = r.prototype.removeAllListeners = r.prototype.removeEventListener = function(t, e) {
            if (this._callbacks = this._callbacks || {}, 0 == arguments.length) return this._callbacks = {}, 
            this;
            var n = this._callbacks["$" + t];
            if (!n) return this;
            if (1 == arguments.length) return delete this._callbacks["$" + t], this;
            for (var r, o = 0; o < n.length; o++) if (r = n[o], r === e || r.fn === e) {
              n.splice(o, 1);
              break;
            }
            return this;
          }, r.prototype.emit = function(t) {
            this._callbacks = this._callbacks || {};
            var e = [].slice.call(arguments, 1), n = this._callbacks["$" + t];
            if (n) {
              n = n.slice(0);
              for (var r = 0, o = n.length; r < o; ++r) n[r].apply(this, e);
            }
            return this;
          }, r.prototype.listeners = function(t) {
            return this._callbacks = this._callbacks || {}, this._callbacks["$" + t] || [];
          }, r.prototype.hasListeners = function(t) {
            return !!this.listeners(t).length;
          };
        }, function(t, e, n) {
          function r(t, e) {
            if (!t) return t;
            if (s(t)) {
              var n = {
                _placeholder: !0,
                num: e.length
              };
              return e.push(t), n;
            }
            if (i(t)) {
              for (var o = new Array(t.length), a = 0; a < t.length; a++) o[a] = r(t[a], e);
              return o;
            }
            if ("object" == _typeof(t) && !(t instanceof Date)) {
              var o = {};
              for (var c in t) o[c] = r(t[c], e);
              return o;
            }
            return t;
          }
          function o(t, e) {
            if (!t) return t;
            if (t && t._placeholder) return e[t.num];
            if (i(t)) for (var n = 0; n < t.length; n++) t[n] = o(t[n], e); else if ("object" == _typeof(t)) for (var r in t) t[r] = o(t[r], e);
            return t;
          }
          var i = n(13), s = n(14), a = Object.prototype.toString, c = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === a.call(Blob), u = "function" == typeof File || "undefined" != typeof File && "[object FileConstructor]" === a.call(File);
          e.deconstructPacket = function(t) {
            var e = [], n = t.data, o = t;
            return o.data = r(n, e), o.attachments = e.length, {
              packet: o,
              buffers: e
            };
          }, e.reconstructPacket = function(t, e) {
            return t.data = o(t.data, e), t.attachments = void 0, t;
          }, e.removeBlobs = function(t, e) {
            function n(t, a, p) {
              if (!t) return t;
              if (c && t instanceof Blob || u && t instanceof File) {
                r++;
                var h = new FileReader();
                h.onload = function() {
                  p ? p[a] = this.result : o = this.result, --r || e(o);
                }, h.readAsArrayBuffer(t);
              } else if (i(t)) for (var f = 0; f < t.length; f++) n(t[f], f, t); else if ("object" == _typeof(t) && !s(t)) for (var l in t) n(t[l], l, t);
            }
            var r = 0, o = t;
            n(o), r || e(o);
          };
        }, function(t, e) {
          var n = {}.toString;
          t.exports = Array.isArray || function(t) {
            return "[object Array]" == n.call(t);
          };
        }, function(t, e) {
          function n(t) {
            return r && Buffer.isBuffer(t) || o && (t instanceof ArrayBuffer || i(t));
          }
          t.exports = n;
          var r = "function" == typeof Buffer && "function" == typeof Buffer.isBuffer, o = "function" == typeof ArrayBuffer, i = function i(t) {
            return "function" == typeof ArrayBuffer.isView ? ArrayBuffer.isView(t) : t.buffer instanceof ArrayBuffer;
          };
        }, function(t, e, n) {
          function r(t, e) {
            if (!(this instanceof r)) return new r(t, e);
            t && "object" == _typeof(t) && (e = t, t = void 0), e = e || {}, e.path = e.path || "/socket.io", 
            this.nsps = {}, this.subs = [], this.opts = e, this.reconnection(!1 !== e.reconnection), 
            this.reconnectionAttempts(e.reconnectionAttempts || 1 / 0), this.reconnectionDelay(e.reconnectionDelay || 1e3), 
            this.reconnectionDelayMax(e.reconnectionDelayMax || 5e3), this.randomizationFactor(e.randomizationFactor || .5), 
            this.backoff = new f({
              min: this.reconnectionDelay(),
              max: this.reconnectionDelayMax(),
              jitter: this.randomizationFactor()
            }), this.timeout(null == e.timeout ? 2e4 : e.timeout), this.readyState = "closed", 
            this.uri = t, this.connecting = [], this.lastPing = null, this.encoding = !1, this.packetBuffer = [];
            var n = e.parser || a;
            this.encoder = new n.Encoder(), this.decoder = new n.Decoder(), this.autoConnect = !1 !== e.autoConnect, 
            this.autoConnect && this.open();
          }
          var o = n(16), i = n(39), s = n(11), a = n(7), c = n(41), u = n(42), p = n(3)("socket.io-client:manager"), h = n(38), f = n(43), l = Object.prototype.hasOwnProperty;
          t.exports = r, r.prototype.emitAll = function() {
            this.emit.apply(this, arguments);
            for (var t in this.nsps) l.call(this.nsps, t) && this.nsps[t].emit.apply(this.nsps[t], arguments);
          }, r.prototype.updateSocketIds = function() {
            for (var t in this.nsps) l.call(this.nsps, t) && (this.nsps[t].id = this.generateId(t));
          }, r.prototype.generateId = function(t) {
            return ("/" === t ? "" : t + "#") + this.engine.id;
          }, s(r.prototype), r.prototype.reconnection = function(t) {
            return arguments.length ? (this._reconnection = !!t, this) : this._reconnection;
          }, r.prototype.reconnectionAttempts = function(t) {
            return arguments.length ? (this._reconnectionAttempts = t, this) : this._reconnectionAttempts;
          }, r.prototype.reconnectionDelay = function(t) {
            return arguments.length ? (this._reconnectionDelay = t, this.backoff && this.backoff.setMin(t), 
            this) : this._reconnectionDelay;
          }, r.prototype.randomizationFactor = function(t) {
            return arguments.length ? (this._randomizationFactor = t, this.backoff && this.backoff.setJitter(t), 
            this) : this._randomizationFactor;
          }, r.prototype.reconnectionDelayMax = function(t) {
            return arguments.length ? (this._reconnectionDelayMax = t, this.backoff && this.backoff.setMax(t), 
            this) : this._reconnectionDelayMax;
          }, r.prototype.timeout = function(t) {
            return arguments.length ? (this._timeout = t, this) : this._timeout;
          }, r.prototype.maybeReconnectOnOpen = function() {
            !this.reconnecting && this._reconnection && 0 === this.backoff.attempts && this.reconnect();
          }, r.prototype.open = r.prototype.connect = function(t, e) {
            if (p("readyState %s", this.readyState), ~this.readyState.indexOf("open")) return this;
            p("opening %s", this.uri), this.engine = o(this.uri, this.opts);
            var n = this.engine, r = this;
            this.readyState = "opening", this.skipReconnect = !1;
            var i = c(n, "open", function() {
              r.onopen(), t && t();
            }), s = c(n, "error", function(e) {
              if (p("connect_error"), r.cleanup(), r.readyState = "closed", r.emitAll("connect_error", e), 
              t) {
                var n = new Error("Connection error");
                n.data = e, t(n);
              } else r.maybeReconnectOnOpen();
            });
            if (!1 !== this._timeout) {
              var a = this._timeout;
              p("connect attempt will timeout after %d", a);
              var u = setTimeout(function() {
                p("connect attempt timed out after %d", a), i.destroy(), n.close(), n.emit("error", "timeout"), 
                r.emitAll("connect_timeout", a);
              }, a);
              this.subs.push({
                destroy: function destroy() {
                  clearTimeout(u);
                }
              });
            }
            return this.subs.push(i), this.subs.push(s), this;
          }, r.prototype.onopen = function() {
            p("open"), this.cleanup(), this.readyState = "open", this.emit("open");
            var t = this.engine;
            this.subs.push(c(t, "data", u(this, "ondata"))), this.subs.push(c(t, "ping", u(this, "onping"))), 
            this.subs.push(c(t, "pong", u(this, "onpong"))), this.subs.push(c(t, "error", u(this, "onerror"))), 
            this.subs.push(c(t, "close", u(this, "onclose"))), this.subs.push(c(this.decoder, "decoded", u(this, "ondecoded")));
          }, r.prototype.onping = function() {
            this.lastPing = new Date(), this.emitAll("ping");
          }, r.prototype.onpong = function() {
            this.emitAll("pong", new Date() - this.lastPing);
          }, r.prototype.ondata = function(t) {
            this.decoder.add(t);
          }, r.prototype.ondecoded = function(t) {
            this.emit("packet", t);
          }, r.prototype.onerror = function(t) {
            p("error", t), this.emitAll("error", t);
          }, r.prototype.socket = function(t, e) {
            function n() {
              ~h(o.connecting, r) || o.connecting.push(r);
            }
            var r = this.nsps[t];
            if (!r) {
              r = new i(this, t, e), this.nsps[t] = r;
              var o = this;
              r.on("connecting", n), r.on("connect", function() {
                r.id = o.generateId(t);
              }), this.autoConnect && n();
            }
            return r;
          }, r.prototype.destroy = function(t) {
            var e = h(this.connecting, t);
            ~e && this.connecting.splice(e, 1), this.connecting.length || this.close();
          }, r.prototype.packet = function(t) {
            p("writing packet %j", t);
            var e = this;
            t.query && 0 === t.type && (t.nsp += "?" + t.query), e.encoding ? e.packetBuffer.push(t) : (e.encoding = !0, 
            this.encoder.encode(t, function(n) {
              for (var r = 0; r < n.length; r++) e.engine.write(n[r], t.options);
              e.encoding = !1, e.processPacketQueue();
            }));
          }, r.prototype.processPacketQueue = function() {
            if (this.packetBuffer.length > 0 && !this.encoding) {
              var t = this.packetBuffer.shift();
              this.packet(t);
            }
          }, r.prototype.cleanup = function() {
            p("cleanup");
            for (var t = this.subs.length, e = 0; e < t; e++) {
              var n = this.subs.shift();
              n.destroy();
            }
            this.packetBuffer = [], this.encoding = !1, this.lastPing = null, this.decoder.destroy();
          }, r.prototype.close = r.prototype.disconnect = function() {
            p("disconnect"), this.skipReconnect = !0, this.reconnecting = !1, "opening" === this.readyState && this.cleanup(), 
            this.backoff.reset(), this.readyState = "closed", this.engine && this.engine.close();
          }, r.prototype.onclose = function(t) {
            p("onclose"), this.cleanup(), this.backoff.reset(), this.readyState = "closed", 
            this.emit("close", t), this._reconnection && !this.skipReconnect && this.reconnect();
          }, r.prototype.reconnect = function() {
            if (this.reconnecting || this.skipReconnect) return this;
            var t = this;
            if (this.backoff.attempts >= this._reconnectionAttempts) p("reconnect failed"), 
            this.backoff.reset(), this.emitAll("reconnect_failed"), this.reconnecting = !1; else {
              var e = this.backoff.duration();
              p("will wait %dms before reconnect attempt", e), this.reconnecting = !0;
              var n = setTimeout(function() {
                t.skipReconnect || (p("attempting reconnect"), t.emitAll("reconnect_attempt", t.backoff.attempts), 
                t.emitAll("reconnecting", t.backoff.attempts), t.skipReconnect || t.open(function(e) {
                  e ? (p("reconnect attempt error"), t.reconnecting = !1, t.reconnect(), t.emitAll("reconnect_error", e.data)) : (p("reconnect success"), 
                  t.onreconnect());
                }));
              }, e);
              this.subs.push({
                destroy: function destroy() {
                  clearTimeout(n);
                }
              });
            }
          }, r.prototype.onreconnect = function() {
            var t = this.backoff.attempts;
            this.reconnecting = !1, this.backoff.reset(), this.updateSocketIds(), this.emitAll("reconnect", t);
          };
        }, function(t, e, n) {
          t.exports = n(17), t.exports.parser = n(24);
        }, function(t, e, n) {
          function r(t, e) {
            return this instanceof r ? (e = e || {}, t && "object" == _typeof(t) && (e = t, 
            t = null), t ? (t = p(t), e.hostname = t.host, e.secure = "https" === t.protocol || "wss" === t.protocol, 
            e.port = t.port, t.query && (e.query = t.query)) : e.host && (e.hostname = p(e.host).host), 
            this.secure = null != e.secure ? e.secure : "undefined" != typeof location && "https:" === location.protocol, 
            e.hostname && !e.port && (e.port = this.secure ? "443" : "80"), this.agent = e.agent || !1, 
            this.hostname = e.hostname || ("undefined" != typeof location ? location.hostname : "localhost"), 
            this.port = e.port || ("undefined" != typeof location && location.port ? location.port : this.secure ? 443 : 80), 
            this.query = e.query || {}, "string" == typeof this.query && (this.query = h.decode(this.query)), 
            this.upgrade = !1 !== e.upgrade, this.path = (e.path || "/engine.io").replace(/\/$/, "") + "/", 
            this.forceJSONP = !!e.forceJSONP, this.jsonp = !1 !== e.jsonp, this.forceBase64 = !!e.forceBase64, 
            this.enablesXDR = !!e.enablesXDR, this.withCredentials = !1 !== e.withCredentials, 
            this.timestampParam = e.timestampParam || "t", this.timestampRequests = e.timestampRequests, 
            this.transports = e.transports || [ "polling", "websocket" ], this.transportOptions = e.transportOptions || {}, 
            this.readyState = "", this.writeBuffer = [], this.prevBufferLen = 0, this.policyPort = e.policyPort || 843, 
            this.rememberUpgrade = e.rememberUpgrade || !1, this.binaryType = null, this.onlyBinaryUpgrades = e.onlyBinaryUpgrades, 
            this.perMessageDeflate = !1 !== e.perMessageDeflate && (e.perMessageDeflate || {}), 
            !0 === this.perMessageDeflate && (this.perMessageDeflate = {}), this.perMessageDeflate && null == this.perMessageDeflate.threshold && (this.perMessageDeflate.threshold = 1024), 
            this.pfx = e.pfx || null, this.key = e.key || null, this.passphrase = e.passphrase || null, 
            this.cert = e.cert || null, this.ca = e.ca || null, this.ciphers = e.ciphers || null, 
            this.rejectUnauthorized = void 0 === e.rejectUnauthorized || e.rejectUnauthorized, 
            this.forceNode = !!e.forceNode, this.isReactNative = "undefined" != typeof navigator && "string" == typeof navigator.product && "reactnative" === navigator.product.toLowerCase(), 
            ("undefined" == typeof self || this.isReactNative) && (e.extraHeaders && Object.keys(e.extraHeaders).length > 0 && (this.extraHeaders = e.extraHeaders), 
            e.localAddress && (this.localAddress = e.localAddress)), this.id = null, this.upgrades = null, 
            this.pingInterval = null, this.pingTimeout = null, this.pingIntervalTimer = null, 
            this.pingTimeoutTimer = null, void this.open()) : new r(t, e);
          }
          function o(t) {
            var e = {};
            for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);
            return e;
          }
          var i = n(18), s = n(11), a = n(3)("engine.io-client:socket"), c = n(38), u = n(24), p = n(2), h = n(32);
          t.exports = r, r.priorWebsocketSuccess = !1, s(r.prototype), r.protocol = u.protocol, 
          r.Socket = r, r.Transport = n(23), r.transports = n(18), r.parser = n(24), r.prototype.createTransport = function(t) {
            a('creating transport "%s"', t);
            var e = o(this.query);
            e.EIO = u.protocol, e.transport = t;
            var n = this.transportOptions[t] || {};
            this.id && (e.sid = this.id);
            var r = new i[t]({
              query: e,
              socket: this,
              agent: n.agent || this.agent,
              hostname: n.hostname || this.hostname,
              port: n.port || this.port,
              secure: n.secure || this.secure,
              path: n.path || this.path,
              forceJSONP: n.forceJSONP || this.forceJSONP,
              jsonp: n.jsonp || this.jsonp,
              forceBase64: n.forceBase64 || this.forceBase64,
              enablesXDR: n.enablesXDR || this.enablesXDR,
              withCredentials: n.withCredentials || this.withCredentials,
              timestampRequests: n.timestampRequests || this.timestampRequests,
              timestampParam: n.timestampParam || this.timestampParam,
              policyPort: n.policyPort || this.policyPort,
              pfx: n.pfx || this.pfx,
              key: n.key || this.key,
              passphrase: n.passphrase || this.passphrase,
              cert: n.cert || this.cert,
              ca: n.ca || this.ca,
              ciphers: n.ciphers || this.ciphers,
              rejectUnauthorized: n.rejectUnauthorized || this.rejectUnauthorized,
              perMessageDeflate: n.perMessageDeflate || this.perMessageDeflate,
              extraHeaders: n.extraHeaders || this.extraHeaders,
              forceNode: n.forceNode || this.forceNode,
              localAddress: n.localAddress || this.localAddress,
              requestTimeout: n.requestTimeout || this.requestTimeout,
              protocols: n.protocols || void 0,
              isReactNative: this.isReactNative
            });
            return r;
          }, r.prototype.open = function() {
            var t;
            if (this.rememberUpgrade && r.priorWebsocketSuccess && -1 !== this.transports.indexOf("websocket")) t = "websocket"; else {
              if (0 === this.transports.length) {
                var e = this;
                return void setTimeout(function() {
                  e.emit("error", "No transports available");
                }, 0);
              }
              t = this.transports[0];
            }
            this.readyState = "opening";
            try {
              t = this.createTransport(t);
            } catch (n) {
              return this.transports.shift(), void this.open();
            }
            t.open(), this.setTransport(t);
          }, r.prototype.setTransport = function(t) {
            a("setting transport %s", t.name);
            var e = this;
            this.transport && (a("clearing existing transport %s", this.transport.name), this.transport.removeAllListeners()), 
            this.transport = t, t.on("drain", function() {
              e.onDrain();
            }).on("packet", function(t) {
              e.onPacket(t);
            }).on("error", function(t) {
              e.onError(t);
            }).on("close", function() {
              e.onClose("transport close");
            });
          }, r.prototype.probe = function(t) {
            function e() {
              if (f.onlyBinaryUpgrades) {
                var e = !this.supportsBinary && f.transport.supportsBinary;
                h = h || e;
              }
              h || (a('probe transport "%s" opened', t), p.send([ {
                type: "ping",
                data: "probe"
              } ]), p.once("packet", function(e) {
                if (!h) if ("pong" === e.type && "probe" === e.data) {
                  if (a('probe transport "%s" pong', t), f.upgrading = !0, f.emit("upgrading", p), 
                  !p) return;
                  r.priorWebsocketSuccess = "websocket" === p.name, a('pausing current transport "%s"', f.transport.name), 
                  f.transport.pause(function() {
                    h || "closed" !== f.readyState && (a("changing transport and sending upgrade packet"), 
                    u(), f.setTransport(p), p.send([ {
                      type: "upgrade"
                    } ]), f.emit("upgrade", p), p = null, f.upgrading = !1, f.flush());
                  });
                } else {
                  a('probe transport "%s" failed', t);
                  var n = new Error("probe error");
                  n.transport = p.name, f.emit("upgradeError", n);
                }
              }));
            }
            function n() {
              h || (h = !0, u(), p.close(), p = null);
            }
            function o(e) {
              var r = new Error("probe error: " + e);
              r.transport = p.name, n(), a('probe transport "%s" failed because of error: %s', t, e), 
              f.emit("upgradeError", r);
            }
            function i() {
              o("transport closed");
            }
            function s() {
              o("socket closed");
            }
            function c(t) {
              p && t.name !== p.name && (a('"%s" works - aborting "%s"', t.name, p.name), n());
            }
            function u() {
              p.removeListener("open", e), p.removeListener("error", o), p.removeListener("close", i), 
              f.removeListener("close", s), f.removeListener("upgrading", c);
            }
            a('probing transport "%s"', t);
            var p = this.createTransport(t, {
              probe: 1
            }), h = !1, f = this;
            r.priorWebsocketSuccess = !1, p.once("open", e), p.once("error", o), p.once("close", i), 
            this.once("close", s), this.once("upgrading", c), p.open();
          }, r.prototype.onOpen = function() {
            if (a("socket open"), this.readyState = "open", r.priorWebsocketSuccess = "websocket" === this.transport.name, 
            this.emit("open"), this.flush(), "open" === this.readyState && this.upgrade && this.transport.pause) {
              a("starting upgrade probes");
              for (var t = 0, e = this.upgrades.length; t < e; t++) this.probe(this.upgrades[t]);
            }
          }, r.prototype.onPacket = function(t) {
            if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) switch (a('socket receive: type "%s", data "%s"', t.type, t.data), 
            this.emit("packet", t), this.emit("heartbeat"), t.type) {
             case "open":
              this.onHandshake(JSON.parse(t.data));
              break;

             case "pong":
              this.setPing(), this.emit("pong");
              break;

             case "error":
              var e = new Error("server error");
              e.code = t.data, this.onError(e);
              break;

             case "message":
              this.emit("data", t.data), this.emit("message", t.data);
            } else a('packet received with socket readyState "%s"', this.readyState);
          }, r.prototype.onHandshake = function(t) {
            this.emit("handshake", t), this.id = t.sid, this.transport.query.sid = t.sid, this.upgrades = this.filterUpgrades(t.upgrades), 
            this.pingInterval = t.pingInterval, this.pingTimeout = t.pingTimeout, this.onOpen(), 
            "closed" !== this.readyState && (this.setPing(), this.removeListener("heartbeat", this.onHeartbeat), 
            this.on("heartbeat", this.onHeartbeat));
          }, r.prototype.onHeartbeat = function(t) {
            clearTimeout(this.pingTimeoutTimer);
            var e = this;
            e.pingTimeoutTimer = setTimeout(function() {
              "closed" !== e.readyState && e.onClose("ping timeout");
            }, t || e.pingInterval + e.pingTimeout);
          }, r.prototype.setPing = function() {
            var t = this;
            clearTimeout(t.pingIntervalTimer), t.pingIntervalTimer = setTimeout(function() {
              a("writing ping packet - expecting pong within %sms", t.pingTimeout), t.ping(), 
              t.onHeartbeat(t.pingTimeout);
            }, t.pingInterval);
          }, r.prototype.ping = function() {
            var t = this;
            this.sendPacket("ping", function() {
              t.emit("ping");
            });
          }, r.prototype.onDrain = function() {
            this.writeBuffer.splice(0, this.prevBufferLen), this.prevBufferLen = 0, 0 === this.writeBuffer.length ? this.emit("drain") : this.flush();
          }, r.prototype.flush = function() {
            "closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length && (a("flushing %d packets in socket", this.writeBuffer.length), 
            this.transport.send(this.writeBuffer), this.prevBufferLen = this.writeBuffer.length, 
            this.emit("flush"));
          }, r.prototype.write = r.prototype.send = function(t, e, n) {
            return this.sendPacket("message", t, e, n), this;
          }, r.prototype.sendPacket = function(t, e, n, r) {
            if ("function" == typeof e && (r = e, e = void 0), "function" == typeof n && (r = n, 
            n = null), "closing" !== this.readyState && "closed" !== this.readyState) {
              n = n || {}, n.compress = !1 !== n.compress;
              var o = {
                type: t,
                data: e,
                options: n
              };
              this.emit("packetCreate", o), this.writeBuffer.push(o), r && this.once("flush", r), 
              this.flush();
            }
          }, r.prototype.close = function() {
            function t() {
              r.onClose("forced close"), a("socket closing - telling transport to close"), r.transport.close();
            }
            function e() {
              r.removeListener("upgrade", e), r.removeListener("upgradeError", e), t();
            }
            function n() {
              r.once("upgrade", e), r.once("upgradeError", e);
            }
            if ("opening" === this.readyState || "open" === this.readyState) {
              this.readyState = "closing";
              var r = this;
              this.writeBuffer.length ? this.once("drain", function() {
                this.upgrading ? n() : t();
              }) : this.upgrading ? n() : t();
            }
            return this;
          }, r.prototype.onError = function(t) {
            a("socket error %j", t), r.priorWebsocketSuccess = !1, this.emit("error", t), this.onClose("transport error", t);
          }, r.prototype.onClose = function(t, e) {
            if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
              a('socket close with reason: "%s"', t);
              var n = this;
              clearTimeout(this.pingIntervalTimer), clearTimeout(this.pingTimeoutTimer), this.transport.removeAllListeners("close"), 
              this.transport.close(), this.transport.removeAllListeners(), this.readyState = "closed", 
              this.id = null, this.emit("close", t, e), n.writeBuffer = [], n.prevBufferLen = 0;
            }
          }, r.prototype.filterUpgrades = function(t) {
            for (var e = [], n = 0, r = t.length; n < r; n++) ~c(this.transports, t[n]) && e.push(t[n]);
            return e;
          };
        }, function(t, e, n) {
          function r(t) {
            var e, n = !1, r = !1, a = !1 !== t.jsonp;
            if ("undefined" != typeof location) {
              var c = "https:" === location.protocol, u = location.port;
              u || (u = c ? 443 : 80), n = t.hostname !== location.hostname || u !== t.port, r = t.secure !== c;
            }
            if (t.xdomain = n, t.xscheme = r, e = new o(t), "open" in e && !t.forceJSONP) return new i(t);
            if (!a) throw new Error("JSONP disabled");
            return new s(t);
          }
          var o = n(19), i = n(21), s = n(35), a = n(36);
          e.polling = r, e.websocket = a;
        }, function(t, e, n) {
          var r = n(20);
          t.exports = function(t) {
            var e = t.xdomain, n = t.xscheme, o = t.enablesXDR;
            try {
              if ("undefined" != typeof XMLHttpRequest && (!e || r)) return new XMLHttpRequest();
            } catch (i) {}
            try {
              if ("undefined" != typeof XDomainRequest && !n && o) return new XDomainRequest();
            } catch (i) {}
            if (!e) try {
              return new (self[[ "Active" ].concat("Object").join("X")])("Microsoft.XMLHTTP");
            } catch (i) {}
          };
        }, function(t, e) {
          try {
            t.exports = "undefined" != typeof XMLHttpRequest && "withCredentials" in new XMLHttpRequest();
          } catch (n) {
            t.exports = !1;
          }
        }, function(t, e, n) {
          function r() {}
          function o(t) {
            if (c.call(this, t), this.requestTimeout = t.requestTimeout, this.extraHeaders = t.extraHeaders, 
            "undefined" != typeof location) {
              var e = "https:" === location.protocol, n = location.port;
              n || (n = e ? 443 : 80), this.xd = "undefined" != typeof location && t.hostname !== location.hostname || n !== t.port, 
              this.xs = t.secure !== e;
            }
          }
          function i(t) {
            this.method = t.method || "GET", this.uri = t.uri, this.xd = !!t.xd, this.xs = !!t.xs, 
            this.async = !1 !== t.async, this.data = void 0 !== t.data ? t.data : null, this.agent = t.agent, 
            this.isBinary = t.isBinary, this.supportsBinary = t.supportsBinary, this.enablesXDR = t.enablesXDR, 
            this.withCredentials = t.withCredentials, this.requestTimeout = t.requestTimeout, 
            this.pfx = t.pfx, this.key = t.key, this.passphrase = t.passphrase, this.cert = t.cert, 
            this.ca = t.ca, this.ciphers = t.ciphers, this.rejectUnauthorized = t.rejectUnauthorized, 
            this.extraHeaders = t.extraHeaders, this.create();
          }
          function s() {
            for (var t in i.requests) i.requests.hasOwnProperty(t) && i.requests[t].abort();
          }
          var a = n(19), c = n(22), u = n(11), p = n(33), h = n(3)("engine.io-client:polling-xhr");
          if (t.exports = o, t.exports.Request = i, p(o, c), o.prototype.supportsBinary = !0, 
          o.prototype.request = function(t) {
            return t = t || {}, t.uri = this.uri(), t.xd = this.xd, t.xs = this.xs, t.agent = this.agent || !1, 
            t.supportsBinary = this.supportsBinary, t.enablesXDR = this.enablesXDR, t.withCredentials = this.withCredentials, 
            t.pfx = this.pfx, t.key = this.key, t.passphrase = this.passphrase, t.cert = this.cert, 
            t.ca = this.ca, t.ciphers = this.ciphers, t.rejectUnauthorized = this.rejectUnauthorized, 
            t.requestTimeout = this.requestTimeout, t.extraHeaders = this.extraHeaders, new i(t);
          }, o.prototype.doWrite = function(t, e) {
            var n = "string" != typeof t && void 0 !== t, r = this.request({
              method: "POST",
              data: t,
              isBinary: n
            }), o = this;
            r.on("success", e), r.on("error", function(t) {
              o.onError("xhr post error", t);
            }), this.sendXhr = r;
          }, o.prototype.doPoll = function() {
            h("xhr poll");
            var t = this.request(), e = this;
            t.on("data", function(t) {
              e.onData(t);
            }), t.on("error", function(t) {
              e.onError("xhr poll error", t);
            }), this.pollXhr = t;
          }, u(i.prototype), i.prototype.create = function() {
            var t = {
              agent: this.agent,
              xdomain: this.xd,
              xscheme: this.xs,
              enablesXDR: this.enablesXDR
            };
            t.pfx = this.pfx, t.key = this.key, t.passphrase = this.passphrase, t.cert = this.cert, 
            t.ca = this.ca, t.ciphers = this.ciphers, t.rejectUnauthorized = this.rejectUnauthorized;
            var e = this.xhr = new a(t), n = this;
            try {
              h("xhr open %s: %s", this.method, this.uri), e.open(this.method, this.uri, this.async);
              try {
                if (this.extraHeaders) {
                  e.setDisableHeaderCheck && e.setDisableHeaderCheck(!0);
                  for (var r in this.extraHeaders) this.extraHeaders.hasOwnProperty(r) && e.setRequestHeader(r, this.extraHeaders[r]);
                }
              } catch (o) {}
              if ("POST" === this.method) try {
                this.isBinary ? e.setRequestHeader("Content-type", "application/octet-stream") : e.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
              } catch (o) {}
              try {
                e.setRequestHeader("Accept", "*/*");
              } catch (o) {}
              "withCredentials" in e && (e.withCredentials = this.withCredentials), this.requestTimeout && (e.timeout = this.requestTimeout), 
              this.hasXDR() ? (e.onload = function() {
                n.onLoad();
              }, e.onerror = function() {
                n.onError(e.responseText);
              }) : e.onreadystatechange = function() {
                if (2 === e.readyState) try {
                  var t = e.getResponseHeader("Content-Type");
                  (n.supportsBinary && "application/octet-stream" === t || "application/octet-stream; charset=UTF-8" === t) && (e.responseType = "arraybuffer");
                } catch (r) {}
                4 === e.readyState && (200 === e.status || 1223 === e.status ? n.onLoad() : setTimeout(function() {
                  n.onError("number" == typeof e.status ? e.status : 0);
                }, 0));
              }, h("xhr data %s", this.data), e.send(this.data);
            } catch (o) {
              return void setTimeout(function() {
                n.onError(o);
              }, 0);
            }
            "undefined" != typeof document && (this.index = i.requestsCount++, i.requests[this.index] = this);
          }, i.prototype.onSuccess = function() {
            this.emit("success"), this.cleanup();
          }, i.prototype.onData = function(t) {
            this.emit("data", t), this.onSuccess();
          }, i.prototype.onError = function(t) {
            this.emit("error", t), this.cleanup(!0);
          }, i.prototype.cleanup = function(t) {
            if ("undefined" != typeof this.xhr && null !== this.xhr) {
              if (this.hasXDR() ? this.xhr.onload = this.xhr.onerror = r : this.xhr.onreadystatechange = r, 
              t) try {
                this.xhr.abort();
              } catch (e) {}
              "undefined" != typeof document && delete i.requests[this.index], this.xhr = null;
            }
          }, i.prototype.onLoad = function() {
            var t;
            try {
              var e;
              try {
                e = this.xhr.getResponseHeader("Content-Type");
              } catch (n) {}
              t = ("application/octet-stream" === e || "application/octet-stream; charset=UTF-8" === e) && this.xhr.response || this.xhr.responseText;
            } catch (n) {
              this.onError(n);
            }
            null != t && this.onData(t);
          }, i.prototype.hasXDR = function() {
            return "undefined" != typeof XDomainRequest && !this.xs && this.enablesXDR;
          }, i.prototype.abort = function() {
            this.cleanup();
          }, i.requestsCount = 0, i.requests = {}, "undefined" != typeof document) if ("function" == typeof attachEvent) attachEvent("onunload", s); else if ("function" == typeof addEventListener) {
            var f = "onpagehide" in this ? "pagehide" : "unload";
            addEventListener(f, s, !1);
          }
        }, function(t, e, n) {
          function r(t) {
            var e = t && t.forceBase64;
            p && !e || (this.supportsBinary = !1), o.call(this, t);
          }
          var o = n(23), i = n(32), s = n(24), a = n(33), c = n(34), u = n(3)("engine.io-client:polling");
          t.exports = r;
          var p = function() {
            var t = n(19), e = new t({
              xdomain: !1
            });
            return null != e.responseType;
          }();
          a(r, o), r.prototype.name = "polling", r.prototype.doOpen = function() {
            this.poll();
          }, r.prototype.pause = function(t) {
            function e() {
              u("paused"), n.readyState = "paused", t();
            }
            var n = this;
            if (this.readyState = "pausing", this.polling || !this.writable) {
              var r = 0;
              this.polling && (u("we are currently polling - waiting to pause"), r++, this.once("pollComplete", function() {
                u("pre-pause polling complete"), --r || e();
              })), this.writable || (u("we are currently writing - waiting to pause"), r++, this.once("drain", function() {
                u("pre-pause writing complete"), --r || e();
              }));
            } else e();
          }, r.prototype.poll = function() {
            u("polling"), this.polling = !0, this.doPoll(), this.emit("poll");
          }, r.prototype.onData = function(t) {
            var e = this;
            u("polling got data %s", t);
            var n = function n(t, _n, r) {
              return "opening" === e.readyState && e.onOpen(), "close" === t.type ? (e.onClose(), 
              !1) : void e.onPacket(t);
            };
            s.decodePayload(t, this.socket.binaryType, n), "closed" !== this.readyState && (this.polling = !1, 
            this.emit("pollComplete"), "open" === this.readyState ? this.poll() : u('ignoring poll - transport state "%s"', this.readyState));
          }, r.prototype.doClose = function() {
            function t() {
              u("writing close packet"), e.write([ {
                type: "close"
              } ]);
            }
            var e = this;
            "open" === this.readyState ? (u("transport open - closing"), t()) : (u("transport not open - deferring close"), 
            this.once("open", t));
          }, r.prototype.write = function(t) {
            var e = this;
            this.writable = !1;
            var n = function n() {
              e.writable = !0, e.emit("drain");
            };
            s.encodePayload(t, this.supportsBinary, function(t) {
              e.doWrite(t, n);
            });
          }, r.prototype.uri = function() {
            var t = this.query || {}, e = this.secure ? "https" : "http", n = "";
            !1 !== this.timestampRequests && (t[this.timestampParam] = c()), this.supportsBinary || t.sid || (t.b64 = 1), 
            t = i.encode(t), this.port && ("https" === e && 443 !== Number(this.port) || "http" === e && 80 !== Number(this.port)) && (n = ":" + this.port), 
            t.length && (t = "?" + t);
            var r = -1 !== this.hostname.indexOf(":");
            return e + "://" + (r ? "[" + this.hostname + "]" : this.hostname) + n + this.path + t;
          };
        }, function(t, e, n) {
          function r(t) {
            this.path = t.path, this.hostname = t.hostname, this.port = t.port, this.secure = t.secure, 
            this.query = t.query, this.timestampParam = t.timestampParam, this.timestampRequests = t.timestampRequests, 
            this.readyState = "", this.agent = t.agent || !1, this.socket = t.socket, this.enablesXDR = t.enablesXDR, 
            this.withCredentials = t.withCredentials, this.pfx = t.pfx, this.key = t.key, this.passphrase = t.passphrase, 
            this.cert = t.cert, this.ca = t.ca, this.ciphers = t.ciphers, this.rejectUnauthorized = t.rejectUnauthorized, 
            this.forceNode = t.forceNode, this.isReactNative = t.isReactNative, this.extraHeaders = t.extraHeaders, 
            this.localAddress = t.localAddress;
          }
          var o = n(24), i = n(11);
          t.exports = r, i(r.prototype), r.prototype.onError = function(t, e) {
            var n = new Error(t);
            return n.type = "TransportError", n.description = e, this.emit("error", n), this;
          }, r.prototype.open = function() {
            return "closed" !== this.readyState && "" !== this.readyState || (this.readyState = "opening", 
            this.doOpen()), this;
          }, r.prototype.close = function() {
            return "opening" !== this.readyState && "open" !== this.readyState || (this.doClose(), 
            this.onClose()), this;
          }, r.prototype.send = function(t) {
            if ("open" !== this.readyState) throw new Error("Transport not open");
            this.write(t);
          }, r.prototype.onOpen = function() {
            this.readyState = "open", this.writable = !0, this.emit("open");
          }, r.prototype.onData = function(t) {
            var e = o.decodePacket(t, this.socket.binaryType);
            this.onPacket(e);
          }, r.prototype.onPacket = function(t) {
            this.emit("packet", t);
          }, r.prototype.onClose = function() {
            this.readyState = "closed", this.emit("close");
          };
        }, function(t, e, n) {
          function r(t, n) {
            var r = "b" + e.packets[t.type] + t.data.data;
            return n(r);
          }
          function o(t, n, r) {
            if (!n) return e.encodeBase64Packet(t, r);
            var o = t.data, i = new Uint8Array(o), s = new Uint8Array(1 + o.byteLength);
            s[0] = v[t.type];
            for (var a = 0; a < i.length; a++) s[a + 1] = i[a];
            return r(s.buffer);
          }
          function i(t, n, r) {
            if (!n) return e.encodeBase64Packet(t, r);
            var o = new FileReader();
            return o.onload = function() {
              e.encodePacket({
                type: t.type,
                data: o.result
              }, n, !0, r);
            }, o.readAsArrayBuffer(t.data);
          }
          function s(t, n, r) {
            if (!n) return e.encodeBase64Packet(t, r);
            if (g) return i(t, n, r);
            var o = new Uint8Array(1);
            o[0] = v[t.type];
            var s = new w([ o.buffer, t.data ]);
            return r(s);
          }
          function a(t) {
            try {
              t = d.decode(t, {
                strict: !1
              });
            } catch (e) {
              return !1;
            }
            return t;
          }
          function c(t, e, n) {
            for (var r = new Array(t.length), o = l(t.length, n), i = function i(t, n, o) {
              e(n, function(e, n) {
                r[t] = n, o(e, r);
              });
            }, s = 0; s < t.length; s++) i(s, t[s], o);
          }
          var u, p = n(25), h = n(26), f = n(27), l = n(28), d = n(29);
          "undefined" != typeof ArrayBuffer && (u = n(30));
          var y = "undefined" != typeof navigator && /Android/i.test(navigator.userAgent), m = "undefined" != typeof navigator && /PhantomJS/i.test(navigator.userAgent), g = y || m;
          e.protocol = 3;
          var v = e.packets = {
            open: 0,
            close: 1,
            ping: 2,
            pong: 3,
            message: 4,
            upgrade: 5,
            noop: 6
          }, b = p(v), C = {
            type: "error",
            data: "parser error"
          }, w = n(31);
          e.encodePacket = function(t, e, n, i) {
            "function" == typeof e && (i = e, e = !1), "function" == typeof n && (i = n, n = null);
            var a = void 0 === t.data ? void 0 : t.data.buffer || t.data;
            if ("undefined" != typeof ArrayBuffer && a instanceof ArrayBuffer) return o(t, e, i);
            if ("undefined" != typeof w && a instanceof w) return s(t, e, i);
            if (a && a.base64) return r(t, i);
            var c = v[t.type];
            return void 0 !== t.data && (c += n ? d.encode(String(t.data), {
              strict: !1
            }) : String(t.data)), i("" + c);
          }, e.encodeBase64Packet = function(t, n) {
            var r = "b" + e.packets[t.type];
            if ("undefined" != typeof w && t.data instanceof w) {
              var o = new FileReader();
              return o.onload = function() {
                var t = o.result.split(",")[1];
                n(r + t);
              }, o.readAsDataURL(t.data);
            }
            var i;
            try {
              i = String.fromCharCode.apply(null, new Uint8Array(t.data));
            } catch (s) {
              for (var a = new Uint8Array(t.data), c = new Array(a.length), u = 0; u < a.length; u++) c[u] = a[u];
              i = String.fromCharCode.apply(null, c);
            }
            return r += btoa(i), n(r);
          }, e.decodePacket = function(t, n, r) {
            if (void 0 === t) return C;
            if ("string" == typeof t) {
              if ("b" === t.charAt(0)) return e.decodeBase64Packet(t.substr(1), n);
              if (r && (t = a(t), !1 === t)) return C;
              var o = t.charAt(0);
              return Number(o) == o && b[o] ? t.length > 1 ? {
                type: b[o],
                data: t.substring(1)
              } : {
                type: b[o]
              } : C;
            }
            var i = new Uint8Array(t), o = i[0], s = f(t, 1);
            return w && "blob" === n && (s = new w([ s ])), {
              type: b[o],
              data: s
            };
          }, e.decodeBase64Packet = function(t, e) {
            var n = b[t.charAt(0)];
            if (!u) return {
              type: n,
              data: {
                base64: !0,
                data: t.substr(1)
              }
            };
            var r = u.decode(t.substr(1));
            return "blob" === e && w && (r = new w([ r ])), {
              type: n,
              data: r
            };
          }, e.encodePayload = function(t, n, r) {
            function o(t) {
              return t.length + ":" + t;
            }
            function i(t, r) {
              e.encodePacket(t, !!s && n, !1, function(t) {
                r(null, o(t));
              });
            }
            "function" == typeof n && (r = n, n = null);
            var s = h(t);
            return n && s ? w && !g ? e.encodePayloadAsBlob(t, r) : e.encodePayloadAsArrayBuffer(t, r) : t.length ? void c(t, i, function(t, e) {
              return r(e.join(""));
            }) : r("0:");
          }, e.decodePayload = function(t, n, r) {
            if ("string" != typeof t) return e.decodePayloadAsBinary(t, n, r);
            "function" == typeof n && (r = n, n = null);
            var o;
            if ("" === t) return r(C, 0, 1);
            for (var i, s, a = "", c = 0, u = t.length; c < u; c++) {
              var p = t.charAt(c);
              if (":" === p) {
                if ("" === a || a != (i = Number(a))) return r(C, 0, 1);
                if (s = t.substr(c + 1, i), a != s.length) return r(C, 0, 1);
                if (s.length) {
                  if (o = e.decodePacket(s, n, !1), C.type === o.type && C.data === o.data) return r(C, 0, 1);
                  var h = r(o, c + i, u);
                  if (!1 === h) return;
                }
                c += i, a = "";
              } else a += p;
            }
            return "" !== a ? r(C, 0, 1) : void 0;
          }, e.encodePayloadAsArrayBuffer = function(t, n) {
            function r(t, n) {
              e.encodePacket(t, !0, !0, function(t) {
                return n(null, t);
              });
            }
            return t.length ? void c(t, r, function(t, e) {
              var r = e.reduce(function(t, e) {
                var n;
                return n = "string" == typeof e ? e.length : e.byteLength, t + n.toString().length + n + 2;
              }, 0), o = new Uint8Array(r), i = 0;
              return e.forEach(function(t) {
                var e = "string" == typeof t, n = t;
                if (e) {
                  for (var r = new Uint8Array(t.length), s = 0; s < t.length; s++) r[s] = t.charCodeAt(s);
                  n = r.buffer;
                }
                o[i++] = e ? 0 : 1;
                for (var a = n.byteLength.toString(), s = 0; s < a.length; s++) o[i++] = parseInt(a[s]);
                o[i++] = 255;
                for (var r = new Uint8Array(n), s = 0; s < r.length; s++) o[i++] = r[s];
              }), n(o.buffer);
            }) : n(new ArrayBuffer(0));
          }, e.encodePayloadAsBlob = function(t, n) {
            function r(t, n) {
              e.encodePacket(t, !0, !0, function(t) {
                var e = new Uint8Array(1);
                if (e[0] = 1, "string" == typeof t) {
                  for (var r = new Uint8Array(t.length), o = 0; o < t.length; o++) r[o] = t.charCodeAt(o);
                  t = r.buffer, e[0] = 0;
                }
                for (var i = t instanceof ArrayBuffer ? t.byteLength : t.size, s = i.toString(), a = new Uint8Array(s.length + 1), o = 0; o < s.length; o++) a[o] = parseInt(s[o]);
                if (a[s.length] = 255, w) {
                  var c = new w([ e.buffer, a.buffer, t ]);
                  n(null, c);
                }
              });
            }
            c(t, r, function(t, e) {
              return n(new w(e));
            });
          }, e.decodePayloadAsBinary = function(t, n, r) {
            "function" == typeof n && (r = n, n = null);
            for (var o = t, i = []; o.byteLength > 0; ) {
              for (var s = new Uint8Array(o), a = 0 === s[0], c = "", u = 1; 255 !== s[u]; u++) {
                if (c.length > 310) return r(C, 0, 1);
                c += s[u];
              }
              o = f(o, 2 + c.length), c = parseInt(c);
              var p = f(o, 0, c);
              if (a) try {
                p = String.fromCharCode.apply(null, new Uint8Array(p));
              } catch (h) {
                var l = new Uint8Array(p);
                p = "";
                for (var u = 0; u < l.length; u++) p += String.fromCharCode(l[u]);
              }
              i.push(p), o = f(o, c);
            }
            var d = i.length;
            i.forEach(function(t, o) {
              r(e.decodePacket(t, n, !0), o, d);
            });
          };
        }, function(t, e) {
          t.exports = Object.keys || function(t) {
            var e = [], n = Object.prototype.hasOwnProperty;
            for (var r in t) n.call(t, r) && e.push(r);
            return e;
          };
        }, function(t, e, n) {
          function r(t) {
            if (!t || "object" != _typeof(t)) return !1;
            if (o(t)) {
              for (var e = 0, n = t.length; e < n; e++) if (r(t[e])) return !0;
              return !1;
            }
            if ("function" == typeof Buffer && Buffer.isBuffer && Buffer.isBuffer(t) || "function" == typeof ArrayBuffer && t instanceof ArrayBuffer || s && t instanceof Blob || a && t instanceof File) return !0;
            if (t.toJSON && "function" == typeof t.toJSON && 1 === arguments.length) return r(t.toJSON(), !0);
            for (var i in t) if (Object.prototype.hasOwnProperty.call(t, i) && r(t[i])) return !0;
            return !1;
          }
          var o = n(13), i = Object.prototype.toString, s = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === i.call(Blob), a = "function" == typeof File || "undefined" != typeof File && "[object FileConstructor]" === i.call(File);
          t.exports = r;
        }, function(t, e) {
          t.exports = function(t, e, n) {
            var r = t.byteLength;
            if (e = e || 0, n = n || r, t.slice) return t.slice(e, n);
            if (e < 0 && (e += r), n < 0 && (n += r), n > r && (n = r), e >= r || e >= n || 0 === r) return new ArrayBuffer(0);
            for (var o = new Uint8Array(t), i = new Uint8Array(n - e), s = e, a = 0; s < n; s++, 
            a++) i[a] = o[s];
            return i.buffer;
          };
        }, function(t, e) {
          function n(t, e, n) {
            function o(t, r) {
              if (o.count <= 0) throw new Error("after called too many times");
              --o.count, t ? (i = !0, e(t), e = n) : 0 !== o.count || i || e(null, r);
            }
            var i = !1;
            return n = n || r, o.count = t, 0 === t ? e() : o;
          }
          function r() {}
          t.exports = n;
        }, function(t, e) {
          function n(t) {
            for (var e, n, r = [], o = 0, i = t.length; o < i; ) e = t.charCodeAt(o++), e >= 55296 && e <= 56319 && o < i ? (n = t.charCodeAt(o++), 
            56320 == (64512 & n) ? r.push(((1023 & e) << 10) + (1023 & n) + 65536) : (r.push(e), 
            o--)) : r.push(e);
            return r;
          }
          function r(t) {
            for (var e, n = t.length, r = -1, o = ""; ++r < n; ) e = t[r], e > 65535 && (e -= 65536, 
            o += d(e >>> 10 & 1023 | 55296), e = 56320 | 1023 & e), o += d(e);
            return o;
          }
          function o(t, e) {
            if (t >= 55296 && t <= 57343) {
              if (e) throw Error("Lone surrogate U+" + t.toString(16).toUpperCase() + " is not a scalar value");
              return !1;
            }
            return !0;
          }
          function i(t, e) {
            return d(t >> e & 63 | 128);
          }
          function s(t, e) {
            if (0 == (4294967168 & t)) return d(t);
            var n = "";
            return 0 == (4294965248 & t) ? n = d(t >> 6 & 31 | 192) : 0 == (4294901760 & t) ? (o(t, e) || (t = 65533), 
            n = d(t >> 12 & 15 | 224), n += i(t, 6)) : 0 == (4292870144 & t) && (n = d(t >> 18 & 7 | 240), 
            n += i(t, 12), n += i(t, 6)), n + d(63 & t | 128);
          }
          function a(t, e) {
            e = e || {};
            for (var r, o = !1 !== e.strict, i = n(t), a = i.length, c = -1, u = ""; ++c < a; ) r = i[c], 
            u += s(r, o);
            return u;
          }
          function c() {
            if (l >= f) throw Error("Invalid byte index");
            var t = 255 & h[l];
            if (l++, 128 == (192 & t)) return 63 & t;
            throw Error("Invalid continuation byte");
          }
          function u(t) {
            var e, n, r, i, s;
            if (l > f) throw Error("Invalid byte index");
            if (l == f) return !1;
            if (e = 255 & h[l], l++, 0 == (128 & e)) return e;
            if (192 == (224 & e)) {
              if (n = c(), s = (31 & e) << 6 | n, s >= 128) return s;
              throw Error("Invalid continuation byte");
            }
            if (224 == (240 & e)) {
              if (n = c(), r = c(), s = (15 & e) << 12 | n << 6 | r, s >= 2048) return o(s, t) ? s : 65533;
              throw Error("Invalid continuation byte");
            }
            if (240 == (248 & e) && (n = c(), r = c(), i = c(), s = (7 & e) << 18 | n << 12 | r << 6 | i, 
            s >= 65536 && s <= 1114111)) return s;
            throw Error("Invalid UTF-8 detected");
          }
          function p(t, e) {
            e = e || {};
            var o = !1 !== e.strict;
            h = n(t), f = h.length, l = 0;
            for (var i, s = []; !1 !== (i = u(o)); ) s.push(i);
            return r(s);
          }
          var h, f, l, d = String.fromCharCode;
          t.exports = {
            version: "2.1.2",
            encode: a,
            decode: p
          };
        }, function(t, e) {
          !function() {
            for (var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", n = new Uint8Array(256), r = 0; r < t.length; r++) n[t.charCodeAt(r)] = r;
            e.encode = function(e) {
              var n, r = new Uint8Array(e), o = r.length, i = "";
              for (n = 0; n < o; n += 3) i += t[r[n] >> 2], i += t[(3 & r[n]) << 4 | r[n + 1] >> 4], 
              i += t[(15 & r[n + 1]) << 2 | r[n + 2] >> 6], i += t[63 & r[n + 2]];
              return o % 3 === 2 ? i = i.substring(0, i.length - 1) + "=" : o % 3 === 1 && (i = i.substring(0, i.length - 2) + "=="), 
              i;
            }, e.decode = function(t) {
              var e, r, o, i, s, a = .75 * t.length, c = t.length, u = 0;
              "=" === t[t.length - 1] && (a--, "=" === t[t.length - 2] && a--);
              var p = new ArrayBuffer(a), h = new Uint8Array(p);
              for (e = 0; e < c; e += 4) r = n[t.charCodeAt(e)], o = n[t.charCodeAt(e + 1)], i = n[t.charCodeAt(e + 2)], 
              s = n[t.charCodeAt(e + 3)], h[u++] = r << 2 | o >> 4, h[u++] = (15 & o) << 4 | i >> 2, 
              h[u++] = (3 & i) << 6 | 63 & s;
              return p;
            };
          }();
        }, function(t, e) {
          function n(t) {
            return t.map(function(t) {
              if (t.buffer instanceof ArrayBuffer) {
                var e = t.buffer;
                if (t.byteLength !== e.byteLength) {
                  var n = new Uint8Array(t.byteLength);
                  n.set(new Uint8Array(e, t.byteOffset, t.byteLength)), e = n.buffer;
                }
                return e;
              }
              return t;
            });
          }
          function r(t, e) {
            e = e || {};
            var r = new i();
            return n(t).forEach(function(t) {
              r.append(t);
            }), e.type ? r.getBlob(e.type) : r.getBlob();
          }
          function o(t, e) {
            return new Blob(n(t), e || {});
          }
          var i = "undefined" != typeof i ? i : "undefined" != typeof WebKitBlobBuilder ? WebKitBlobBuilder : "undefined" != typeof MSBlobBuilder ? MSBlobBuilder : "undefined" != typeof MozBlobBuilder && MozBlobBuilder, s = function() {
            try {
              var t = new Blob([ "hi" ]);
              return 2 === t.size;
            } catch (e) {
              return !1;
            }
          }(), a = s && function() {
            try {
              var t = new Blob([ new Uint8Array([ 1, 2 ]) ]);
              return 2 === t.size;
            } catch (e) {
              return !1;
            }
          }(), c = i && i.prototype.append && i.prototype.getBlob;
          "undefined" != typeof Blob && (r.prototype = Blob.prototype, o.prototype = Blob.prototype), 
          t.exports = function() {
            return s ? a ? Blob : o : c ? r : void 0;
          }();
        }, function(t, e) {
          e.encode = function(t) {
            var e = "";
            for (var n in t) t.hasOwnProperty(n) && (e.length && (e += "&"), e += encodeURIComponent(n) + "=" + encodeURIComponent(t[n]));
            return e;
          }, e.decode = function(t) {
            for (var e = {}, n = t.split("&"), r = 0, o = n.length; r < o; r++) {
              var i = n[r].split("=");
              e[decodeURIComponent(i[0])] = decodeURIComponent(i[1]);
            }
            return e;
          };
        }, function(t, e) {
          t.exports = function(t, e) {
            var n = function n() {};
            n.prototype = e.prototype, t.prototype = new n(), t.prototype.constructor = t;
          };
        }, function(t, e) {
          function n(t) {
            var e = "";
            do {
              e = s[t % a] + e, t = Math.floor(t / a);
            } while (t > 0);
            return e;
          }
          function r(t) {
            var e = 0;
            for (p = 0; p < t.length; p++) e = e * a + c[t.charAt(p)];
            return e;
          }
          function o() {
            var t = n(+new Date());
            return t !== i ? (u = 0, i = t) : t + "." + n(u++);
          }
          for (var i, s = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split(""), a = 64, c = {}, u = 0, p = 0; p < a; p++) c[s[p]] = p;
          o.encode = n, o.decode = r, t.exports = o;
        }, function(t, e, n) {
          (function(e) {
            function r() {}
            function o() {
              return "undefined" != typeof self ? self : "undefined" != typeof window ? window : "undefined" != typeof e ? e : {};
            }
            function i(t) {
              if (s.call(this, t), this.query = this.query || {}, !c) {
                var e = o();
                c = e.___eio = e.___eio || [];
              }
              this.index = c.length;
              var n = this;
              c.push(function(t) {
                n.onData(t);
              }), this.query.j = this.index, "function" == typeof addEventListener && addEventListener("beforeunload", function() {
                n.script && (n.script.onerror = r);
              }, !1);
            }
            var s = n(22), a = n(33);
            t.exports = i;
            var c, u = /\n/g, p = /\\n/g;
            a(i, s), i.prototype.supportsBinary = !1, i.prototype.doClose = function() {
              this.script && (this.script.parentNode.removeChild(this.script), this.script = null), 
              this.form && (this.form.parentNode.removeChild(this.form), this.form = null, this.iframe = null), 
              s.prototype.doClose.call(this);
            }, i.prototype.doPoll = function() {
              var t = this, e = document.createElement("script");
              this.script && (this.script.parentNode.removeChild(this.script), this.script = null), 
              e.async = !0, e.src = this.uri(), e.onerror = function(e) {
                t.onError("jsonp poll error", e);
              };
              var n = document.getElementsByTagName("script")[0];
              n ? n.parentNode.insertBefore(e, n) : (document.head || document.body).appendChild(e), 
              this.script = e;
              var r = "undefined" != typeof navigator && /gecko/i.test(navigator.userAgent);
              r && setTimeout(function() {
                var t = document.createElement("iframe");
                document.body.appendChild(t), document.body.removeChild(t);
              }, 100);
            }, i.prototype.doWrite = function(t, e) {
              function n() {
                r(), e();
              }
              function r() {
                if (o.iframe) try {
                  o.form.removeChild(o.iframe);
                } catch (t) {
                  o.onError("jsonp polling iframe removal error", t);
                }
                try {
                  var e = '<iframe src="javascript:0" name="' + o.iframeId + '">';
                  i = document.createElement(e);
                } catch (t) {
                  i = document.createElement("iframe"), i.name = o.iframeId, i.src = "javascript:0";
                }
                i.id = o.iframeId, o.form.appendChild(i), o.iframe = i;
              }
              var o = this;
              if (!this.form) {
                var i, s = document.createElement("form"), a = document.createElement("textarea"), c = this.iframeId = "eio_iframe_" + this.index;
                s.className = "socketio", s.style.position = "absolute", s.style.top = "-1000px", 
                s.style.left = "-1000px", s.target = c, s.method = "POST", s.setAttribute("accept-charset", "utf-8"), 
                a.name = "d", s.appendChild(a), document.body.appendChild(s), this.form = s, this.area = a;
              }
              this.form.action = this.uri(), r(), t = t.replace(p, "\\\n"), this.area.value = t.replace(u, "\\n");
              try {
                this.form.submit();
              } catch (h) {}
              this.iframe.attachEvent ? this.iframe.onreadystatechange = function() {
                "complete" === o.iframe.readyState && n();
              } : this.iframe.onload = n;
            };
          }).call(e, function() {
            return this;
          }());
        }, function(t, e, n) {
          function r(t) {
            var e = t && t.forceBase64;
            e && (this.supportsBinary = !1), this.perMessageDeflate = t.perMessageDeflate, this.usingBrowserWebSocket = o && !t.forceNode, 
            this.protocols = t.protocols, this.usingBrowserWebSocket || (l = i), s.call(this, t);
          }
          var o, i, s = n(23), a = n(24), c = n(32), u = n(33), p = n(34), h = n(3)("engine.io-client:websocket");
          if ("undefined" != typeof WebSocket ? o = WebSocket : "undefined" != typeof self && (o = self.WebSocket || self.MozWebSocket), 
          "undefined" == typeof window) try {
            i = n(37);
          } catch (f) {}
          var l = o || i;
          t.exports = r, u(r, s), r.prototype.name = "websocket", r.prototype.supportsBinary = !0, 
          r.prototype.doOpen = function() {
            if (this.check()) {
              var t = this.uri(), e = this.protocols, n = {
                agent: this.agent,
                perMessageDeflate: this.perMessageDeflate
              };
              n.pfx = this.pfx, n.key = this.key, n.passphrase = this.passphrase, n.cert = this.cert, 
              n.ca = this.ca, n.ciphers = this.ciphers, n.rejectUnauthorized = this.rejectUnauthorized, 
              this.extraHeaders && (n.headers = this.extraHeaders), this.localAddress && (n.localAddress = this.localAddress);
              try {
                this.ws = this.usingBrowserWebSocket && !this.isReactNative ? e ? new l(t, e) : new l(t) : new l(t, e, n);
              } catch (r) {
                return this.emit("error", r);
              }
              void 0 === this.ws.binaryType && (this.supportsBinary = !1), this.ws.supports && this.ws.supports.binary ? (this.supportsBinary = !0, 
              this.ws.binaryType = "nodebuffer") : this.ws.binaryType = "arraybuffer", this.addEventListeners();
            }
          }, r.prototype.addEventListeners = function() {
            var t = this;
            this.ws.onopen = function() {
              t.onOpen();
            }, this.ws.onclose = function() {
              t.onClose();
            }, this.ws.onmessage = function(e) {
              t.onData(e.data);
            }, this.ws.onerror = function(e) {
              t.onError("websocket error", e);
            };
          }, r.prototype.write = function(t) {
            function e() {
              n.emit("flush"), setTimeout(function() {
                n.writable = !0, n.emit("drain");
              }, 0);
            }
            var n = this;
            this.writable = !1;
            for (var r = t.length, o = 0, i = r; o < i; o++) !function(t) {
              a.encodePacket(t, n.supportsBinary, function(o) {
                if (!n.usingBrowserWebSocket) {
                  var i = {};
                  if (t.options && (i.compress = t.options.compress), n.perMessageDeflate) {
                    var s = "string" == typeof o ? Buffer.byteLength(o) : o.length;
                    s < n.perMessageDeflate.threshold && (i.compress = !1);
                  }
                }
                try {
                  n.usingBrowserWebSocket ? n.ws.send(o) : n.ws.send(o, i);
                } catch (a) {
                  h("websocket closed before onclose event");
                }
                --r || e();
              });
            }(t[o]);
          }, r.prototype.onClose = function() {
            s.prototype.onClose.call(this);
          }, r.prototype.doClose = function() {
            "undefined" != typeof this.ws && this.ws.close();
          }, r.prototype.uri = function() {
            var t = this.query || {}, e = this.secure ? "wss" : "ws", n = "";
            this.port && ("wss" === e && 443 !== Number(this.port) || "ws" === e && 80 !== Number(this.port)) && (n = ":" + this.port), 
            this.timestampRequests && (t[this.timestampParam] = p()), this.supportsBinary || (t.b64 = 1), 
            t = c.encode(t), t.length && (t = "?" + t);
            var r = -1 !== this.hostname.indexOf(":");
            return e + "://" + (r ? "[" + this.hostname + "]" : this.hostname) + n + this.path + t;
          }, r.prototype.check = function() {
            return !(!l || "__initialize" in l && this.name === r.prototype.name);
          };
        }, function(t, e) {}, function(t, e) {
          var n = [].indexOf;
          t.exports = function(t, e) {
            if (n) return t.indexOf(e);
            for (var r = 0; r < t.length; ++r) if (t[r] === e) return r;
            return -1;
          };
        }, function(t, e, n) {
          function r(t, e, n) {
            this.io = t, this.nsp = e, this.json = this, this.ids = 0, this.acks = {}, this.receiveBuffer = [], 
            this.sendBuffer = [], this.connected = !1, this.disconnected = !0, this.flags = {}, 
            n && n.query && (this.query = n.query), this.io.autoConnect && this.open();
          }
          var o = n(7), i = n(11), s = n(40), a = n(41), c = n(42), u = n(3)("socket.io-client:socket"), p = n(32), h = n(26);
          t.exports = e = r;
          var f = {
            connect: 1,
            connect_error: 1,
            connect_timeout: 1,
            connecting: 1,
            disconnect: 1,
            error: 1,
            reconnect: 1,
            reconnect_attempt: 1,
            reconnect_failed: 1,
            reconnect_error: 1,
            reconnecting: 1,
            ping: 1,
            pong: 1
          }, l = i.prototype.emit;
          i(r.prototype), r.prototype.subEvents = function() {
            if (!this.subs) {
              var t = this.io;
              this.subs = [ a(t, "open", c(this, "onopen")), a(t, "packet", c(this, "onpacket")), a(t, "close", c(this, "onclose")) ];
            }
          }, r.prototype.open = r.prototype.connect = function() {
            return this.connected ? this : (this.subEvents(), this.io.open(), "open" === this.io.readyState && this.onopen(), 
            this.emit("connecting"), this);
          }, r.prototype.send = function() {
            var t = s(arguments);
            return t.unshift("message"), this.emit.apply(this, t), this;
          }, r.prototype.emit = function(t) {
            if (f.hasOwnProperty(t)) return l.apply(this, arguments), this;
            var e = s(arguments), n = {
              type: (void 0 !== this.flags.binary ? this.flags.binary : h(e)) ? o.BINARY_EVENT : o.EVENT,
              data: e
            };
            return n.options = {}, n.options.compress = !this.flags || !1 !== this.flags.compress, 
            "function" == typeof e[e.length - 1] && (u("emitting packet with ack id %d", this.ids), 
            this.acks[this.ids] = e.pop(), n.id = this.ids++), this.connected ? this.packet(n) : this.sendBuffer.push(n), 
            this.flags = {}, this;
          }, r.prototype.packet = function(t) {
            t.nsp = this.nsp, this.io.packet(t);
          }, r.prototype.onopen = function() {
            if (u("transport is open - connecting"), "/" !== this.nsp) if (this.query) {
              var t = "object" == _typeof(this.query) ? p.encode(this.query) : this.query;
              u("sending connect packet with query %s", t), this.packet({
                type: o.CONNECT,
                query: t
              });
            } else this.packet({
              type: o.CONNECT
            });
          }, r.prototype.onclose = function(t) {
            u("close (%s)", t), this.connected = !1, this.disconnected = !0, delete this.id, 
            this.emit("disconnect", t);
          }, r.prototype.onpacket = function(t) {
            var e = t.nsp === this.nsp, n = t.type === o.ERROR && "/" === t.nsp;
            if (e || n) switch (t.type) {
             case o.CONNECT:
              this.onconnect();
              break;

             case o.EVENT:
             case o.BINARY_EVENT:
              this.onevent(t);
              break;

             case o.ACK:
             case o.BINARY_ACK:
              this.onack(t);
              break;

             case o.DISCONNECT:
              this.ondisconnect();
              break;

             case o.ERROR:
              this.emit("error", t.data);
            }
          }, r.prototype.onevent = function(t) {
            var e = t.data || [];
            u("emitting event %j", e), null != t.id && (u("attaching ack callback to event"), 
            e.push(this.ack(t.id))), this.connected ? l.apply(this, e) : this.receiveBuffer.push(e);
          }, r.prototype.ack = function(t) {
            var e = this, n = !1;
            return function() {
              if (!n) {
                n = !0;
                var r = s(arguments);
                u("sending ack %j", r), e.packet({
                  type: h(r) ? o.BINARY_ACK : o.ACK,
                  id: t,
                  data: r
                });
              }
            };
          }, r.prototype.onack = function(t) {
            var e = this.acks[t.id];
            "function" == typeof e ? (u("calling ack %s with %j", t.id, t.data), e.apply(this, t.data), 
            delete this.acks[t.id]) : u("bad ack %s", t.id);
          }, r.prototype.onconnect = function() {
            this.connected = !0, this.disconnected = !1, this.emit("connect"), this.emitBuffered();
          }, r.prototype.emitBuffered = function() {
            var t;
            for (t = 0; t < this.receiveBuffer.length; t++) l.apply(this, this.receiveBuffer[t]);
            for (this.receiveBuffer = [], t = 0; t < this.sendBuffer.length; t++) this.packet(this.sendBuffer[t]);
            this.sendBuffer = [];
          }, r.prototype.ondisconnect = function() {
            u("server disconnect (%s)", this.nsp), this.destroy(), this.onclose("io server disconnect");
          }, r.prototype.destroy = function() {
            if (this.subs) {
              for (var t = 0; t < this.subs.length; t++) this.subs[t].destroy();
              this.subs = null;
            }
            this.io.destroy(this);
          }, r.prototype.close = r.prototype.disconnect = function() {
            return this.connected && (u("performing disconnect (%s)", this.nsp), this.packet({
              type: o.DISCONNECT
            })), this.destroy(), this.connected && this.onclose("io client disconnect"), this;
          }, r.prototype.compress = function(t) {
            return this.flags.compress = t, this;
          }, r.prototype.binary = function(t) {
            return this.flags.binary = t, this;
          };
        }, function(t, e) {
          function n(t, e) {
            var n = [];
            e = e || 0;
            for (var r = e || 0; r < t.length; r++) n[r - e] = t[r];
            return n;
          }
          t.exports = n;
        }, function(t, e) {
          function n(t, e, n) {
            return t.on(e, n), {
              destroy: function destroy() {
                t.removeListener(e, n);
              }
            };
          }
          t.exports = n;
        }, function(t, e) {
          var n = [].slice;
          t.exports = function(t, e) {
            if ("string" == typeof e && (e = t[e]), "function" != typeof e) throw new Error("bind() requires a function");
            var r = n.call(arguments, 2);
            return function() {
              return e.apply(t, r.concat(n.call(arguments)));
            };
          };
        }, function(t, e) {
          function n(t) {
            t = t || {}, this.ms = t.min || 100, this.max = t.max || 1e4, this.factor = t.factor || 2, 
            this.jitter = t.jitter > 0 && t.jitter <= 1 ? t.jitter : 0, this.attempts = 0;
          }
          t.exports = n, n.prototype.duration = function() {
            var t = this.ms * Math.pow(this.factor, this.attempts++);
            if (this.jitter) {
              var e = Math.random(), n = Math.floor(e * this.jitter * t);
              t = 0 == (1 & Math.floor(10 * e)) ? t - n : t + n;
            }
            return 0 | Math.min(t, this.max);
          }, n.prototype.reset = function() {
            this.attempts = 0;
          }, n.prototype.setMin = function(t) {
            this.ms = t;
          }, n.prototype.setMax = function(t) {
            this.max = t;
          }, n.prototype.setJitter = function(t) {
            this.jitter = t;
          };
        } ]);
      });
      cc._RF.pop();
    }).call(this, require("buffer").Buffer);
  }, {
    buffer: 2
  } ],
  tset_wxLogin: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "f5592h71yJCVLAtgF/Cg5Ik", "tset_wxLogin");
    "use strict";
    require("PolySDK");
    cc.Class({
      extends: cc.Component,
      properties: {
        text_login_label: cc.Label,
        text_session_label: cc.Label,
        text_Timeline_label: cc.Label
      },
      start: function start() {},
      on_wxlogin: function on_wxlogin() {
        cc.LieYingSDK.PolySDK.LoginAuth.login(null, function(errCode, code) {
          switch (errCode) {
           case "0":
            this.text_login_label.string = "\u6210\u529f code = " + code;
            break;

           case "-4":
            this.text_login_label.string = "\u7528\u6237\u53d6\u6d88\u6388\u6743";
            break;

           case "-2":
            this.text_login_label.string = "\u7528\u6237\u53d6\u6d88";
            break;

           default:
            this.text_login_label.string = "errCode = " + errCode;
          }
        }.bind(this));
      },
      on_wxShare_session: function on_wxShare_session() {
        cc.LieYingSDK.PolySDK.Share.share(function() {
          this.text_session_label.string = "\u597d\u53cb\u5206\u4eab\u6210\u529f";
        }.bind(this), function() {
          this.text_session_label.string = "\u597d\u53cb\u5206\u4eab\u5931\u8d25";
        }.bind(this), null, null, null, null, cc.LieYingSDK.PolySDK.sdkConfig.share_wxScene_session);
      },
      on_wxShare_Timeline: function on_wxShare_Timeline() {
        cc.LieYingSDK.PolySDK.Share.share(function() {
          this.text_Timeline_label.string = "\u670b\u53cb\u5708\u5206\u4eab\u6210\u529f";
        }.bind(this), function() {
          this.text_Timeline_label.string = "\u670b\u53cb\u5708\u5206\u4eab\u5931\u8d25";
        }.bind(this), null, null, null, null, cc.LieYingSDK.PolySDK.sdkConfig.share_wxScene_Timeline);
      }
    });
    cc._RF.pop();
  }, {
    PolySDK: "PolySDK"
  } ],
  use_reversed_rotateBy: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "99195adRvNPL4rW5YogpH8a", "use_reversed_rotateBy");
    "use strict";
    cc.RotateBy._reverse = true;
    cc._RF.pop();
  }, {} ]
}, {}, [ "use_reversed_rotateBy", "PolySDK", "Slider_type_1", "socket.io", "DBConstantMgr", "GameConfing", "ResourcesConfig", "WSMsgKeyEnum", "GameDao", "ShopDao", "SystemDao", "UserDao", "MahjongMaiZuWSDao", "MahjongQuYangWSDao", "MahjongShangHaiQiaoMaWSDao", "BaseWSDao", "MahjongBaseWSDao", "AudioManager", "DataManager", "EventManager", "HTTPManager", "LabelMsgManager", "ToolsManager", "UIManager", "Account_login_layer", "Create_room_layer", "Game_history_layer", "hand_holds_operating", "Join_room_layer", "Loading_layer", "Mahjong_game_maiZui_over_details_layer", "Mahjong_game_maiZui_over_layer", "Mahjong_game_maiZui_select_layer", "Mahjong_game_over_layer", "Mahjong_game_shangHaiQiaoMa_over_layer", "Mail_layer", "Msg_layer", "Rules_layer", "Select_box_layer", "Set_layer", "Shop_layer", "User_info_layer", "GameLogin", "GameMain", "GameScene", "Loding", "SelectHome", "MahjongBaseService", "Mahjong_game_maiZui_service", "Mahjong_game_quYang_service", "Mahjong_game_shangHaiQiaoMa_service", "Select_home_game_play_item", "Select_home_session_item", "Shop_item", "Shop_type_item", "User_info_item", "Mahjong_game_over_score_describe_item", "Mahjong_game_over_seat_item", "Mahjong_game_seat_info_item", "Mahjong_game_seat_myself_card_item", "Mahjong_game_maiZui_over_details_item", "Mahjong_game_maiZui_over_item", "Mahjong_game_maiZui_over_score_maizui_item", "Mahjong_game_maiZui_over_user_score_type_item", "Mahjong_game_maiZui_select_item", "Mahjong_game_shangHaiQiaoMa_over_item", "Slider_type_bgm", "Slider_type_sfx", "tset_wxLogin" ]);
