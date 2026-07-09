/**
 * Created by jorbeen on 2017/8/30.
 */

/**
 * 公用得js原生方法
 */

var GN = GN || {
    Str: {},
    Arr: {},
    Num: {},
    Obj: {},
    Date: {}
};

/*


    Array
 数组常用接口
 */
(function() {
    //数组去重
    //ES6新增的Set数据结构，类似于数组，但是里面的元素都是唯一的 ，其构造函数可以接受一个数组作为参数
    //let arr=[1,2,1,2,6,3,5,69,66,7,2,1,4,3,6,8,9663,8]
    //let set = new Set(array);
    //{1,2,6,3,5,69,66,7,4,8,9663}
    //ES6中Array新增了一个静态方法from，可以把类似数组的对象转换为数组
    //Array.from(set)
    //[1,2,6,3,5,69,66,7,4,8,9663]
    // GN.Arr.removeRepeatArray = function(arr){
    //     return Array.from(new Set(arr))
    // }

    /*
     数组顺序打乱
     */
    GN.Arr.upsetArr = function(arr) {
        return arr.sort(function() { return Math.random() - 0.5 });
    }


    /*
     数组最大值最小值
     */
    //这一块的封装，主要是针对数字类型的数组
    GN.Arr.maxArr = function(arr) {
        return Math.max.apply(null, arr);
    }
    GN.Arr.minArr = function(arr) {
        return Math.min.apply(null, arr);
    }

    // 数组求和，平均值
    //这一块的封装，主要是针对数字类型的数组
    //求和
    GN.Arr.sumArr = function(arr) {
        return arr.reduce(function(res, cur) {
            return res + cur;
        }, 0)
    }

    //平均值,小数点可能会有很多位，这里不做处理，处理了使用就不灵活了！
    GN.Arr.covArr = function(arr) {
        var sumText = GN.Arr.sumArr(arr);
        var covText = sumText / length;
        return covText
    }

    //从数组中随机获取元素
    //randomOne([1,2,3,6,8,5,4,2,6])
    //2
    //randomOne([1,2,3,6,8,5,4,2,6])
    //8
    //randomOne([1,2,3,6,8,5,4,2,6])
    //8
    //randomOne([1,2,3,6,8,5,4,2,6])
    GN.Arr.randomOne = function(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    //返回数组（字符串）一个元素出现的次数
    //getEleCount('asd56+asdasdwqe','a')
    //3
    //getEleCount([1,2,3,4,5,66,77,22,55,22],22)
    //2
    GN.Arr.getEleCount = function(obj, ele) {
        var num = 0;
        for (var i = 0, len = obj.length; i < len; i++) {
            if (ele == obj[i]) {
                num++;
            }
        }
        return num;
    }


    //返回数组（字符串）出现最多的几次元素和出现次数
    //arr, rank->长度，默认为数组长度，ranktype，排序方式，默认降序
    /*
     getCount([1,2,3,1,2,5,2,4,1,2,6,2,1,3,2])

     默认情况，返回所有元素出现的次数


     getCount([1,2,3,1,2,5,2,4,1,2,6,2,1,3,2],3)

     传参（rank=3），只返回出现次数排序前三的


     getCount([1,2,3,1,2,5,2,4,1,2,6,2,1,3,2],null,1)

     传参（ranktype=1,rank=null），升序返回所有元素出现次数

     getCount([1,2,3,1,2,5,2,4,1,2,6,2,1,3,2],3,1)

     传参（rank=3，ranktype=1），只返回出现次数排序（升序）前三的
     */
    GN.Arr.getCount = function(arr, rank, ranktype) {
        var obj = {},
            k, arr1 = []
            //记录每一元素出现的次数
        for (var i = 0, len = arr.length; i < len; i++) {
            k = arr[i];
            if (obj[k]) {
                obj[k]++;
            } else {
                obj[k] = 1;
            }
        }
        //保存结果{el-'元素'，count-出现次数}
        for (var o in obj) {
            arr1.push({ el: o, count: obj[o] });
        }
        //排序（降序）
        arr1.sort(function(n1, n2) {
            return n2.count - n1.count
        });
        //如果ranktype为1，则为升序，反转数组
        if (ranktype === 1) {
            arr1 = arr1.reverse();
        }
        var rank1 = rank || arr1.length;
        return arr1.slice(0, rank1);
    }


    //得到n1-n2下标的数组
    //getArrayNum([0,1,2,3,4,5,6,7,8,9],5,9)
    //[5, 6, 7, 8, 9]
    //getArrayNum([0,1,2,3,4,5,6,7,8,9],2) 不传第二个参数,默认返回从n1到数组结束的元素
    //[2, 3, 4, 5, 6, 7, 8, 9]
    GN.Arr.getArrayNum = function(arr, n1, n2) {
        var arr1 = [],
            len = n2 || arr.length - 1;
        for (var i = n1; i <= len; i++) {
            arr1.push(arr[i])
        }
        return arr1;
    }

    //筛选数组
    //删除值为'val'的数组元素

    //removeArrayForValue(['test','test1','test2','test','aaa'],'test','%')
    //["aaa"]   带有'test'的都删除
    //removeArrayForValue(['test','test1','test2','test','aaa'],'test')
    //["test1", "test2", "aaa"]  //数组元素的值全等于'test'才被删除

    GN.Arr.removeArrayForValue = function(arr, val, type) {
        arr.filter(function(item) { return type === '%' ? item.indexOf(val) !== -1 : item !== val })
    }

    /**
     * 释放数组对象
     */
    GN.Arr.close = function(arrs) {
        if (arrs) {
            for (var i = 0; i < arrs.length; i) {
                arrs.splice(i, 1);
            }
        }
    }


    GN.Arr.passArray = function(Obj) {
        var arr = [];
        for (var i in Obj) {
            arr.push(Obj[i])
        }
        return arr;
    }


    /**
     * 是否包含此元素
     * @param {*} Obj 
     * @returns 
     */
    GN.Arr.isHasObj = function(array,obj) {
        
        for (let i = 0; i < array.length; i++) {
            const element = array[i];
            if(element == obj){
                return true;
            }
        }
        return false;
    }

})();


//Date
(function() {
    // 例子： 
    // (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
    // (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
    Date.prototype.Format = function(fmt) { //author: meizz 
        var o = {
            "M+": this.getMonth() + 1, //月份 
            "d+": this.getDate(), //日 
            "h+": this.getHours(), //小时 
            "m+": this.getMinutes(), //分 
            "s+": this.getSeconds(), //秒 
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
            "S": this.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

    //到某一个时间的倒计时
    //getEndTime('2017/7/22 16:0:0')
    //"剩余时间6天 2小时 28 分钟20 秒"
    GN.Date.getEndTime = function(endTime) {
        var startDate = new Date(); //开始时间，当前时间
        var endDate = new Date(endTime); //结束时间，需传入时间参数
        var t = endDate.getTime() - startDate.getTime(); //时间差的毫秒数
        var d = 0,
            h = 0,
            m = 0,
            s = 0;
        if (t >= 0) {
            d = Math.floor(t / 1000 / 3600 / 24);
            h = Math.floor(t / 1000 / 60 / 60 % 24);
            m = Math.floor(t / 1000 / 60 % 60);
            s = Math.floor(t / 1000 % 60);
        }
        return "剩余时间" + d + "天 " + h + "小时 " + m + " 分钟" + s + " 秒";
    }

    //获取当前时间戳
    GN.Date.curtime = function() {
        return Math.floor(new Date().getTime() / 1000);
    };

    //格式化时间
    // 20171116   return 2017/11/16
    GN.Date.fmtData = function(strfmt) {
        var date = '';
        if (!GN.Obj.instanceOf(strfmt, 'undefined') && strfmt && GN.Str.trim(1, strfmt) != "" && strfmt.length == 8) {
            date = strfmt.substring(0, 4) + '/';
            date += strfmt.substring(4, 6) + '/';
            date += strfmt.substring(6, 8) + '/';
        }
        return date;
    }
})();

//Number
(function() {
    //现金额大写转换函数
    //upDigit(168752632)
    //"人民币壹亿陆仟捌佰柒拾伍万贰仟陆佰叁拾贰元整"
    //upDigit(1682)
    //"人民币壹仟陆佰捌拾贰元整"
    //upDigit(-1693)
    //"欠人民币壹仟陆佰玖拾叁元整"
    GN.Num.upDigit = function(n) {
        var fraction = ['角', '分', '厘'];
        var digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
        var unit = [
            ['元', '万', '亿'],
            ['', '拾', '佰', '仟']
        ];
        var head = n < 0 ? '欠人民币' : '人民币';
        n = Math.abs(n);
        var s = '';
        for (var i = 0; i < fraction.length; i++) {
            s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
        }
        s = s || '整';
        n = Math.floor(n);
        for (var i = 0; i < unit[0].length && n > 0; i++) {
            var p = '';
            for (var j = 0; j < unit[1].length && n > 0; j++) {
                p = digit[n % 10] + unit[1][j] + p;
                n = Math.floor(n / 10);
            }
            //s = p.replace(/(零.)*零$/, '').replace(/^$/, '零')+ unit[0][i] + s;
            s = p + unit[0][i] + s;
        }
        return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
    }

    //随机返回一个范围的数字
    GN.Num.randomNumber = function(n1, n2) {
        //randomNumber(5,10)
        //返回5-10的随机整数，包括5，10
        if (arguments.length === 2) {
            return Math.round(n1 + Math.random() * (n2 - n1));
        }
        //randomNumber(10)
        //返回0-10的随机整数，包括0，10
        else if (arguments.length === 1) {
            return Math.round(Math.random() * n1)
        }
        //randomNumber()
        //返回0-255的随机整数，包括0，255
        else {
            return Math.round(Math.random() * 255)
        }
    }

    //随机生成颜色值
    //这种写法，偶尔会有问题
    //Math.floor(Math.random()*0xffffff).toString(16);
    GN.Num.randomColor = function() {
            //randomNumber是上面定义的函数
            //写法1
            return 'rgb(' + GN.Num.randomNumber(255) + ',' + GN.Num.randomNumber(255) + ',' + GN.Num.randomNumber(255) + ')';
            //写法2
            return '#' + Math.random().toString(16).substring(2).substr(0, 6);
            //写法3
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += '0123456789abcdef' [GN.Num.randomNumber(15)];
            }
            return color;
        }
        /**
         * 通过字符串转换数字类型
         * @param Type
         * @param strObj
         * @returns {number}
         */
    GN.Num.passNum = function(Type, strObj) {
            switch (Type) {
                case 'int':
                    return ~~strObj;
                case 'float':
                    return 1 * strObj;
                default: //GN.ErrorLog(Type +'Not Find')
                    console.log(Type + 'Not Find');
            }
        },


        /**
         * 获取两个经纬度之间的距离
         * @param lat1 第一点的纬度
         * @param lng1 第一点的经度
         * @param lat2 第二点的纬度
         * @param lng2 第二点的经度
         * @returns {Number}   单位(m)
         */
        GN.Num.getDistance = function(lat1, lng1, lat2, lng2) {
            if (!GN.Num.isNumber(lat1) || !GN.Num.isNumber(lng1) || !GN.Num.isNumber(lat2) || !GN.Num.isNumber(lng2)) {
                Logger.info("lat1 :%j,lng1 :%j,lat2 :%j,lng2 :%j", lat1, lng1, lat2, lng2);
                return 0;
            }
            var radLat1 = lat1 * Math.PI / 180.0;
            var radLat2 = lat2 * Math.PI / 180.0;
            var a = radLat1 - radLat2;
            var b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
            var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
                Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
            s = s * 6378.137; // EARTH_RADIUS;
            s = Math.round(s * 10000) / 10000 * 1000;
            return s;
        }
    GN.Num.isNumber = function(val) {

        var regPos = /^\d+(\.\d+)?$/; //非负浮点数
        var regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
        if (regPos.test(val) || regNeg.test(val)) {
            return true;
        } else {
            return false;
        }

    }
})();

/**
 * String
 * 字符串操常用接口
 */
(function() {
    //去除字符串空格
    //去除空格  type 1-所有空格  2-前后空格  3-前空格 4-后空格
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
    }

    //字母大小写切换
    /*type
     1:首字母大写
     2：首页母小写
     3：大小写转换
     4：全部大写
     5：全部小写
     * */
    //changeCase('asdasd',1)
    //Asdasd
    GN.Str.changeCase = function(str, type) {
        function ToggleCase(str) {
            var itemText = ""
            str.split("").forEach(
                function(item) {
                    if (/^([a-z]+)/.test(item)) {
                        itemText += item.toUpperCase();
                    } else if (/^([A-Z]+)/.test(item)) {
                        itemText += item.toLowerCase();
                    } else {
                        itemText += item;
                    }
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
    }

    //字符串循环复制
    //repeatStr(str->字符串, count->次数)
    //repeatStr('123',3)
    //"123123123"
    GN.Str.repeatStr = function(str, count) {
        var text = '';
        for (var i = 0; i < count; i++) {
            text += str;
        }
        return text;
    }

    //字符串替换
    //字符串替换(字符串,要替换的字符,替换成什么)
    GN.Str.replaceAll = function(str, AFindText, ARepText) {
        var raRegExp = new RegExp(AFindText, "g");
        return str.replace(raRegExp, ARepText);
    }

    //替换*
    //replaceStr(字符串,字符格式, 替换方式,替换的字符（默认*）)
    GN.Str.replaceStr = function(str, regArr, type, ARepText) {
        var regtext = '',
            Reg = null,
            replaceText = ARepText || '*';
        //replaceStr('18819322663',[3,5,3],0)
        //188*****663
        //repeatStr是在上面定义过的（字符串循环复制），大家注意哦
        if (regArr.length === 3 && type === 0) {
            regtext = '(\\w{' + regArr[0] + '})\\w{' + regArr[1] + '}(\\w{' + regArr[2] + '})'
            Reg = new RegExp(regtext);
            var replaceCount = repeatStr(replaceText, regArr[1]);
            return str.replace(Reg, '$1' + replaceCount + '$2')
        }
        //replaceStr('asdasdasdaa',[3,5,3],1)
        //***asdas***
        else if (regArr.length === 3 && type === 1) {
            regtext = '\\w{' + regArr[0] + '}(\\w{' + regArr[1] + '})\\w{' + regArr[2] + '}'
            Reg = new RegExp(regtext);
            var replaceCount1 = repeatSte(replaceText, regArr[0]);
            var replaceCount2 = repeatSte(replaceText, regArr[2]);
            return str.replace(Reg, replaceCount1 + '$1' + replaceCount2)
        }
        //replaceStr('1asd88465asdwqe3',[5],0)
        //*****8465asdwqe3
        else if (regArr.length === 1 && type == 0) {
            regtext = '(^\\w{' + regArr[0] + '})'
            Reg = new RegExp(regtext);
            var replaceCount = repeatSte(replaceText, regArr[0]);
            return str.replace(Reg, replaceCount)
        }
        //replaceStr('1asd88465asdwqe3',[5],1,'+')
        //"1asd88465as+++++"
        else if (regArr.length === 1 && type == 1) {
            regtext = '(\\w{' + regArr[0] + '}$)'
            Reg = new RegExp(regtext);
            var replaceCount = repeatSte(replaceText, regArr[0]);
            return str.replace(Reg, replaceCount)
        }
    }

    //检测字符串
    //checkType('165226226326','phone')
    //false
    //大家可以根据需要扩展
    GN.Str.checkType = function(str, type) {
        switch (type) {
            case 'email':
                return /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(str);
            case 'phone':
                return /^1[3|4|5|7|8][0-9]{9}$/.test(str);
            case 'tel':
                return /^(0\d{2,3}-\d{7,8})(-\d{1,4})?$/.test(str);
            case 'number':
                return /^\+?[1-9][0-9]*$/.test(str);
            case 'english':
                return /^[a-zA-Z]+$/.test(str);
            case 'chinese':
                return /^[\u4E00-\u9FA5]+$/.test(str);
            case 'lower':
                return /^[a-z]+$/.test(str);
            case 'upper':
                return /^[A-Z]+$/.test(str);
            case 'name':
                return /^[\u4e00-\u9fa5]{2,4}$/.test(str);
            case 'idcard':
                return /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(str);
            default:
                return true;
        }
    }

    //检测密码强度
    //checkPwd('12asdASAD')
    //3(强度等级为3)
    GN.Str.checkPwd = function(str) {
        var nowLv = 0;
        if (str.length < 6) {
            return nowLv
        };
        if (/[0-9]/.test(str)) {
            nowLv++
        };
        if (/[a-z]/.test(str)) {
            nowLv++
        };
        if (/[A-Z]/.test(str)) {
            nowLv++
        };
        if (/[\.|-|_]/.test(str)) {
            nowLv++
        };
        return nowLv;
    }

    //查找字符串

    //找出'blog'的出现次数。代码如下
    //     var strTest='sad44654blog5a1sd67as9dablog4s5d16zxc4sdweasjkblogwqepaskdkblogahseiuadbhjcibloguyeajzxkcabloguyiwezxc967'
    // //countStr(strTest,'blog')
    // //6
    GN.Str.countStr = function(str, strSplit) {
        return str.split(strSplit).length - 1
    }

    /**
     * 格式化字符串
     * GN.Str.stringFormat('{1}{2}','hello','world')
     * 
     * 
     *  var teststr = "看样子<color=#ff0000>你常识手册</color>背诵的不是<color=#0fffff>很好啊，正确答案是{1}</color>"
        this.testLable.string = cc.vv.GN.Str.stringFormat(teststr,'hello');

     */
    GN.Str.stringFormat = function() {
        if (arguments.length < 2) return;
        var str = arguments[0];
        if (arguments.length == 2 && GN.Obj.instanceOf(arguments[1], 'Array')) {
            var args = arguments[1];
            for (var i = 1; i <= args.length; i++) {
                var regx = new RegExp('\\{' + i + '\\}', 'g');
                str = str.replace(regx, args[i - 1]);
            }
        } else {
            for (var i = 1; i < arguments.length; i++) {
                var regx = new RegExp('\\{' + i + '\\}', 'g');
                str = str.replace(regx, arguments[i]);
            }
        }
        return str;
    }


    String.prototype.format = function(args) {
        var result = this;
        if (arguments.length > 0) {
            if (arguments.length == 1 && typeof(args) == "object") {
                for (var key in args) {
                    if (args[key] != undefined) {
                        var reg = new RegExp("({" + key + "})", "g");
                        result = result.replace(reg, args[key]);
                    }
                }
            } else {
                for (var i = 0; i < arguments.length; i++) {
                    if (arguments[i] != undefined) {
                        //var reg = new RegExp("({[" + i + "]})", "g");//这个在索引大于9时会有问题，谢谢何以笙箫的指出
                        var reg = new RegExp("({)" + i + "(})", "g");
                        result = result.replace(reg, arguments[i]);
                    }
                }
            }
        }
        return result;
    };

    /**
     * 	索引字符串中 指定的字符   如果未找到指定字符返回元字符
     * @param str  1: 从前向后索引查找  2：反之亦然
     * @param FindObj 要查找的对象为起点
     * @param length 取截取后的字符串长度 默认是全部
     * @returns {string}
     * @constructor
     */
    GN.Str.SubStr = function(type, str, FindObj, length) {
        if (str.indexOf(FindObj) == -1) return str;
        switch (type) {
            case 1:
                return str.substr(str.indexOf(FindObj), length);
                break;
            case 2:
                return str.substr(str.lastIndexOf(FindObj), length);
                break;
            case 3:
                return str.substr(FindObj.length, length);
                break;
            default:
                return str;
                break;
        }

    }

    /**
        获取当前URL参数值
        假设url地址是http://www.xxx.com?ProID=100&UserID=200，

        可用GetQueryString("ProID")或GetQueryString("UserID")获取相应参数值。

    */
    GN.Str.GetQueryString = function(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return unescape(r[2]);
        return null;
    }

})();

//Object
(function() {
    /*
        判断对象类型

         GN.Obj.instanceOf('1','String')    true

         GN.Obj.instanceOf([],'Object')     true

         GN.Obj.instanceOf([],'Array')      true

         GN.Obj.instanceOf(1,'Number')      true
     */
    GN.Obj.instanceOf = function(o, type) {
        return toString.apply(o) === ('[object ' + type + ']') || typeof o === type.toLowerCase();
    };
    //序列化
    GN.Obj.toJSON = function(str) {
        var _json = null;
        try {
            _json = JSON.parse(str)
        } catch (e) {
            console.log('to JSON ERROR=' + str);
            //  GN.ErrorLog('to JSON ERROR='+ str);
        }
        return _json;
    };

    GN.Obj.getFileJSON = function(jsonfileName, CallBack, extraUrl) {
        var path = extraUrl ? extraUrl : "resources/json/" + jsonfileName;
        var url = cc.url.raw(path);
        var str = cc.loader.load({ url: url, type: "json" }, function(err, data) {
            if (err) {
                cc.error(err.message || err);
                return null;
            }
            cc.log("===============================加载" + jsonfileName + "Begin==============")
            cc.log(data);
            cc.log("===============================加载" + jsonfileName + "End=================")
            CallBack && CallBack(data);
            return data;
        });
    };

    //反序列化
    GN.Obj.fmtData = function(Obj) {
        var data = JSON.stringify(Obj);
        return data;
    };

    //克隆一个新对象
    GN.Obj.cloneObject = function(obj) {
        return JSON.parse(JSON.stringify(obj))
    }

})();

module.exports = GN;