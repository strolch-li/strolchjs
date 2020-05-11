/**
 * Created by eitch on 2015-09-04
 */
Strolch = {

    appVersion: null,

    props: {
        strolch_js: '0.4.0',
        version: null,
        revision: null,
        userConfig: null,
        locale: null
    },

    urls: {
        auth: 'rest/strolch/authentication',
        version: 'rest/strolch/version',
        resources: 'rest/strolch/model/resources',
        orders: 'rest/strolch/model/orders',
        activities: 'rest/strolch/model/activities'
    },

    /*
     * configuration
     */
    setAppVersion: function (appVersion) {
        this.appVersion = appVersion;
    },
    getAppVersion: function () {
        return this.appVersion;
    },
    getAuthToken: function () {
        return this.getCookie("strolch.authorization");
    },
    setAuthToken: function (authToken) {
        if (!this.hasAuthToken())
            this.setCookie("strolch.authorization", authToken);
    },
    clearAuthToken: function (authToken) {
        // do nothing
    },
    hasAuthToken: function () {
        return this.getCookie("strolch.authorization") !== "";
    },
    getUserConfig: function () {
        return this.props.userConfig;
    },
    setUserConfig: function (data) {
        if (data == null) throw "Data can not be null!";
        delete data.sessionId;
        delete data.authToken;
        this.props.userConfig = data;
    },
    clearStorageData: function () {
        // do nothing
    },

    getUserLocale: function () {
        if (localStorage.languageLocale) {
            return localStorage.languageLocale;
        }

        var userConfig = this.getUserConfig();
        var userLocale;
        if (userConfig && this.isNotEmptyString(userConfig.locale)) {
            userLocale = userConfig.locale;
            if (userLocale.length > 2) {
                userLocale = userLocale.substr(0, 2).toLowerCase();
            }
        } else {
            var userLang;
            if (navigator.languages && navigator.languages.length > 0) {
                userLang = navigator.languages[0].substr(0, 2).toLowerCase();
            } else if (navigator.language) {
                userLang = navigator.language.substr(0, 2).toLowerCase();
            }

            if (userLang == 'en' || userLang == 'de') {
                userLocale = userLang;
            } else {
                userLocale = "en";
            }
        }

        console.log('Evaluated user locale as ' + userLocale);

        localStorage.languageLocale = userLocale;
        return localStorage.languageLocale;
    },
    setUserLocale: function (locale) {
        console.log('Setting locale to ' + locale);
        localStorage.languageLocale = locale;
    },

    /*
     * session
     */
    getUserProperty: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null || userConfig.properties == null) return null;
        var properties = userConfig.properties;
        return properties[name];
    },
    getPrivilege: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null) return null;
        var privileges = userConfig.privileges;
        for (var i = 0; i < privileges.length; i++) {
            var privilege = privileges[i];
            if (privilege.name == name) return privilege;
        }
        return null;
    },
    hasRole: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null) return null;
        var roles = userConfig.roles;
        for (var i = 0; i < roles.length; i++) {
            var role = roles[i];
            if (role == name) return true;
        }
        return false;
    },
    hasQueryPrivilege: function (privilegeValue) {
        return this.hasPrivilege('li.strolch.model.query.StrolchQuery', privilegeValue);
    },
    hasSearchPrivilege: function (privilegeValue) {
        return this.hasPrivilege('li.strolch.search.StrolchSearch', privilegeValue);
    },
    hasServicePrivilege: function (privilegeValue) {
        return this.hasPrivilege('li.strolch.service.api.Service', privilegeValue);
    },
    hasPrivilege: function (privilegeName, privilegeValue) {

        // find our privilege
        var privilege = this.getPrivilege(privilegeName);

        // handle user does not have expected privilege
        if (privilege == null || (typeof privilege.allAllowed == 'undefined') || (!privilege.allAllowed && typeof privilege.allowList == 'undefined')) {
            return false;
        }

        if (privilegeValue == null)
            return true;

        // now we handle the privilege access
        if (privilege.allAllowed) return true;

        for (var i = 0; i < privilege.allowList.length; i++) {
            if (privilege.allowList[i] == privilegeValue) return true;
        }

        return false;
    },

    hasComponent: function (componentName) {
        for (var i = 0; i < this.appVersion.componentVersions.length; i++) {
            var componentV = this.appVersion.componentVersions[i];
            if (componentV.componentName == componentName)
                return true;
        }

        return false;
    },

    /*
     * Utils
     */
    getQueryParamsAsString: function () {
        var hash = document.location.hash;
        var hashParts = hash.split('?');
        if (hashParts.length !== 2) return '';
        return hashParts[1];
    },

    getQueryParamValue: function (paramName) {

        var hash = document.location.hash;
        var hashParts = hash.split('?');
        if (hashParts.length !== 2) return null;

        var queryParams = hashParts[1];
        var queryArr = queryParams.split('&');
        for (var i = 0; i < queryArr.length; i++) {
            var queryParam = queryArr[i].split('=');
            if (queryParam.length !== 2) continue;
            var name = queryParam[0];
            var value = queryParam[1];
            if (name === paramName && this.isNotEmptyString(value)) {
                return value;
            }
        }

        return null;
    },
    setQueryParamValue: function (paramName, paramValue) {

        var hash = document.location.hash;
        var hashParts = hash.split('?');
        if (hashParts.length !== 2) {
            if (this.isNotEmptyString(paramValue)) {
                if (hash.endsWith("/"))
                    document.location.hash = hash + '?' + paramName + '=' + paramValue;
                else
                    document.location.hash = hash + '/?' + paramName + '=' + paramValue;
            } else if (hash.endsWith("/")) {
                document.location.hash = hash.substr(0, hash.length - 2);
            }

            return;
        }

        if (this.isEmptyString(hashParts[1])) {
            if (this.isNotEmptyString(paramValue)) {
                document.location.hash = hashParts[0] + '?' + paramName + '=' + paramValue;
            }
            return;
        }

        hash = hashParts[0] + '?';

        var set = false;
        var first = true;
        var queryParams = hashParts[1];
        var queryArr = queryParams.split('&');
        for (var i = 0; i < queryArr.length; i++) {
            var query = queryArr[i];
            var queryParam = query.split('=');
            if (queryParam.length !== 2 || queryParam[0] !== paramName) {
                if (!first)
                    hash += '&';
                first = false;
                hash += query;
                continue;
            }

            if (this.isNotEmptyString(paramValue)) {
                if (!first)
                    hash += '&';
                first = false;
                hash += paramName + '=' + paramValue;

            }
            set = true;
        }

        if (!set && this.isNotEmptyString(paramValue)) {
            if (!first)
                hash += '&';
            hash += paramName + '=' + paramValue;
        }

        if (hash.charAt(hash.length - 1) === "?") {
            if (hash.charAt(hash.length - 2) === "/")
                hash = hash.substr(0, hash.length - 2);
            else
                hash = hash.substr(0, hash.length - 1);
        }

        document.location.hash = hash
    },

    getCookie: function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },
    setCookie: function (cname, cvalue, expiration) {
        console.log("Setting cookie " + cname);

        var expires;
        if (expiration == null) {
            var d = new Date();
            d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
            expires = d.toUTCString();
        } else if (typeof expiration == "object" && expiration instanceof Date) {
            expires = expiration.toUTCString();
        } else if (typeof expiration == "number") {
            var d = new Date();
            d.setTime(d.getTime() + (validDays * 24 * 60 * 60 * 1000));
            expires = d.toUTCString();
        } else {
            var d = new Date();
            d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
            expires = d.toUTCString();
        }

        document.cookie = cname + "=" + cvalue + ";expires=" + expires + ";path=/";
    },
    deleteCookie: function (cname) {
        console.log("Deleting cookie " + cname);
        document.cookie = cname + '=; Path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    },

    uuid: function () {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    },

    isEmptyString: function (val) {
        return typeof val == 'undefined' || val == null || val == '';
    },
    isNotEmptyString: function (val) {
        return !this.isEmptyString(val);
    },

    isFloat: function (val) {
        return Number(parseFloat(val)) == val;
    },

    isInteger: function (val) {
        return Number(parseInt(val)) == val;
    },

    isDate: function (val) {
        var pattern = /\\d\\d\\.\\d\\d\\.\\d\\d/;
        var isDate = pattern.test(val);
        return isDate;
    },

    isTime: function (val) {
        var pattern = /[0-2][0-9]:[0-5][0-9]/;
        var isTime = pattern.test(val);
        return isTime;
    },

    isEmail: function (val) {
        var pattern = /([a-zA-Z0-9_\-])([a-zA-Z0-9_\-\.]*)\+?([a-zA-Z0-9_\-])([a-zA-Z0-9_\-\.]*)?@(\[((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}|((([a-zA-Z0-9\-]+)\.)+))([a-zA-Z]{2,}|(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])])/;
        var isEmail = pattern.test(val);
        return isEmail;
    },

    isChrome: function () {
        var isChromium = window.chrome, //
            winNav = window.navigator, //
            vendorName = winNav.vendor, //
            isOpera = winNav.userAgent.indexOf("OPR") > -1, //
            isIEedge = winNav.userAgent.indexOf("Edge") > -1, //
            isIOSChrome = winNav.userAgent.match("CriOS");

        if (isIOSChrome) {
            return true;
        } else if (isChromium !== null && //
            typeof isChromium !== "undefined" && //
            vendorName === "Google Inc." && //
            isOpera === false && //
            isIEedge === false) {
            return true;
        } else {
            return false;
        }
    },
    isFirefox: function () {
        return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    },
    isIE: function () {
        var isIE = /*@cc_on!@*/false || !!document.documentMode;
        return isIE;
    },
    isEdge: function () {
        return !Susi.Compute.isIE() && !!window.StyleMedia;
    },

    equalsArray: function (a, b) {
        return $(a).not(b).length === 0 && $(b).not(a).length === 0;
    },

    logException: function (e) {
        (console.error || console.log).call(console, e, e.stack || e);
    },

    pad10: function (i) {
        if (i < 10) return '0' + i;
        return i;
    },

    pad100: function (i) {
        if (i < 10) return '00' + i;
        if (i < 100) return '0' + i;
        return i;
    },

    syntaxHighlightJson: function (json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        })
    },

    handleAjaxFileDownload: function (response, fileName, mimeType) {
        var blob = new Blob([response], {type: mimeType});

        // handle IE or Edge
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, fileName);
            return;
        }

        var isFirefox = Strolch.isFirefox();
        var url = window.URL.createObjectURL(blob);

        var link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.setAttribute('download', fileName);

        if (isFirefox) document.body.appendChild(link);

        link.onclick = function (e) {

            if (isFirefox) document.body.removeChild(link);

            // revokeObjectURL needs a delay to work properly
            setTimeout(function () {
                window.URL.revokeObjectURL(url);
            }, 1500);
        };

        link.click();
    },

    toLocalDate: function (val) {
        if (this.isEmptyString(val) || val == '-') return '-';
        var date = new Date(val);
        if (this.props.locale != null) return date.toLocaleDateString(this.props.locale);
        return date.toLocaleDateString('de-CH')
    },

    toLocalDateTime: function (val) {
        if (this.isEmptyString(val) || val == '-') return '-';
        var date = new Date(val);
        if (this.props.locale != null) return date.toLocaleDateString(this.props.locale) + ' ' + date.toLocaleTimeString(this.props.locale);
        return date.toLocaleDateString('de-CH') + ' ' + date.toLocaleTimeString('de-CH');
    },

    toDateTime: function (val) {

        if (this.isEmptyString(val) || val == '-') return '-';
        var date = new Date(val);

        var y = date.getFullYear();
        var m = this.pad10(date.getMonth() + 1);
        var d = this.pad10(date.getDate());
        var h = this.pad10(date.getHours());
        var mi = this.pad10(date.getMinutes());
        var s = this.pad10(date.getSeconds());
        var mil = this.pad100(date.getMilliseconds());

        return y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s + '.' + mil;
    },

    toDateTimeNoDelim: function (val) {

        if (this.isEmptyString(val) || val == '-') return '-';
        var date = new Date(val);

        var y = date.getFullYear();
        var m = this.pad10(date.getMonth() + 1);
        var d = this.pad10(date.getDate());
        var h = this.pad10(date.getHours());
        var mi = this.pad10(date.getMinutes());
        var s = this.pad10(date.getSeconds());

        return y + m + d + h + mi + s;
    },

    isInfinite: function (val) {
        if (val == '-') return true;
        return moment(val).isAfter(moment('2100-01-01'));
    },

    rollingSequence: function (values) {
        return {
            values: values,
            current: values[0],
            first: function () {
                this.current = this.values[0];
                return this.current;
            },
            last: function () {
                this.current = this.values[this.values.length - 1];
                return this.current;
            },
            next: function () {
                var index = this.values.indexOf(this.current) + 1;
                if (index == this.values.length) index = 0;
                this.current = this.values[index];
                return this.current;
            },
            length: function () {
                return this.values.length;
            }
        };
    },

    weekdays: function () {
        var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return this.rollingSequence(days);
    },
    daytime: function () {
        var dayTimes = ['morning', 'midday', 'evening', 'night'];
        return this.rollingSequence(dayTimes);
    }
};

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function (predicate) {
            // 1. Let O be ? ToObject(this value).
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var o = Object(this);

            // 2. Let len be ? ToLength(? Get(O, "length")).
            var len = o.length >>> 0;

            // 3. If IsCallable(predicate) is false, throw a TypeError exception.
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }

            // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
            var thisArg = arguments[1];

            // 5. Let k be 0.
            var k = 0;

            // 6. Repeat, while k < len
            while (k < len) {
                // a. Let Pk be ! ToString(k).
                // b. Let kValue be ? Get(O, Pk).
                // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                // d. If testResult is true, return kValue.
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return kValue;
                }
                // e. Increase k by 1.
                k++;
            }

            // 7. Return undefined.
            return undefined;
        },
        configurable: true,
        writable: true
    });
}

