/**
 * Created by eitch on 2015-09-04
 */
Strolch = {

    props: {
        strolch_js: '0.1.1',
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

    translateI18n: function (locale) {
        if (locale == null || locale.length == 0 || locale == 'undefined') {
            console.log('Locale is \'' + locale + '\', detecting browser locale...');
            locale = i18n.detectLocale();
            console.log('Locale is now ' + locale);
        }

        this.i18n.path = 'localization';
        this.i18n.locale = locale;
        this.i18n.resource = 'localization';
        this.i18n.init(locale);
        this.i18n.translate_document();

        this.setLocale(this.i18n.locale);
    },

    /*
     * configuration
     */
    getAuthToken: function () {
        return localStorage.authToken;
    },
    setAuthToken: function (authToken) {
        return localStorage.authToken = authToken;
    },
    hasAuthToken: function () {
        return localStorage.authToken != null;
    },
    getUserConfig: function () {
        if (this.props.userConfig == null) {
            var data = localStorage.userData;
            if (data == null)
                return null;
            this.props.userConfig = JSON.parse(data);
        }

        return this.props.userConfig;
    },
    setUserConfig: function (data) {
        if (data == null)
            throw "Data can not be null!";
        this.props.userConfig = data;
        return localStorage.userData = JSON.stringify(data);
    },
    clearStorageData: function () {
        delete localStorage.authToken;
        delete localStorage.userData;
    },

    getLocale: function () {
        return localStorage.languageLocale;
    },
    setLocale: function (locale) {
        localStorage.languageLocale = locale;
    },

    version: function () {
        var that = this;

        if (this.props.version == null) {
            this.props.version = "unknown";
            $.ajax({
                    async: false,
                    url: that.urls.version
                }
            ).done(function (data) {
                if (data != null) {
                    var ver = data.appVersion.artifactVersion;
                    var rev = data.appVersion.scmRevision;
                    if (rev == '${buildNumber}') {
                        that.props.version = ver;
                    } else {
                        ver = ver ? ver.substr(0, 9) : '?';
                        rev = rev ? rev.substr(0, 7) : '?';
                        that.props.version = ver + " - " + rev;
                    }
                }
            });
        }
        return this.props.version;
    },

    _revision: null,
    revision: function () {
        var that = this;
        if (this.props.revision == null) {
            this.props.revision = Math.floor(Math.random() * 10000000);
            $.ajax({
                    async: false,
                    url: that.urls.version
                }
            ).done(function (data) {
                if (data != null) {
                    var rev = data.appVersion.scmRevision;
                    if (rev != '${buildNumber}') {
                        that.props.revision = rev;
                    }
                }
            });
        }
        return this.props.revision;
    },

    /*
     * session
     */
    getUserProperty: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null || userConfig.properties == null)
            return null;
        var properties = userConfig.properties;
        return properties[name];
    },
    getPrivilege: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null)
            return null;
        var privileges = userConfig.privileges;
        for (var i = 0; i < privileges.length; i++) {
            var privilege = privileges[i];
            if (privilege.name == name)
                return privilege;
        }
        return null;
    },
    hasRole: function (name) {
        var userConfig = this.getUserConfig();
        if (userConfig == null)
            return null;
        var roles = userConfig.roles;
        for (var i = 0; i < roles.length; i++) {
            var role = roles[i];
            if (role == name)
                return true;
        }
        return false;
    },
    hasQueryPrivilege: function (privilegeValue) {
        return this.hasPrivilege('li.strolch.model.query.StrolchQuery', privilegeValue);
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

        // now we handle the privilege access
        if (privilege.allAllowed)
            return true;

        for (var i = 0; i < privilege.allowList.length; i++) {
            if (privilege.allowList[i] == privilegeValue)
                return true;
        }

        return false;
    },


    /*
     * Utils
     */
    getQueryParamValue: function (paramName) {

        var hash = document.location.hash;
        var hashParts = hash.split('?');
        if (hashParts.length !== 2)
            return '';

        var queryParams = hashParts[1];
        var queryArr = queryParams.split('&');
        for (var i = 0; i < queryArr.length; i++) {
            var queryParam = queryArr[i].split('=');
            if (queryParam.length !== 2)
                continue;
            var name = queryParam[0];
            var value = queryParam[1];
            if (name === paramName && Strolch.isNotEmptyString(value)) {
                return value;
            }
        }

        return '';
    },
    setQueryParamValue: function (paramName, paramValue) {

        var hash = document.location.hash;
        var hashParts = hash.split('?');
        if (hashParts.length !== 2) {
            document.location.hash = hash + '/?' + paramName + '=' + paramValue;
            return;
        }

        hash = hashParts[0] + '?';

        var queryParams = hashParts[1];
        var queryArr = queryParams.split('&');
        for (var i = 0; i < queryArr.length; i++) {
            var query = queryArr[i];
            var queryParam = query.split('=');
            if (queryParam.length !== 2 || queryParam[0] !== paramName) {
                hash += query;
                if (i + 1 < queryArr.length)
                    hash += '&';
                continue;
            }

            hash += paramName + '=' + paramValue;
            if (i + 1 < queryArr.length)
                hash += '&';
        }

        document.location.hash = hash
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
        return typeof val == 'undefined' || val == '';
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

    equalsArray: function (a, b) {
        return $(a).not(b).length === 0 && $(b).not(a).length === 0;
    },

    logException: function (e) {
        (console.error || console.log).call(console, e, e.stack || e);
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

    toLocalDate: function (val) {
        if (this.isEmptyString(val) || val == '-')
            return '-';
        var date = new Date(val);
        if (this.props.locale != null)
            return date.toLocaleDateString(this.props.locale);
        return date.toLocaleDateString('de-CH')
    },

    isInfinite: function (val) {
        if (val == '-')
            return true;
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
                if (index == this.values.length)
                    index = 0;
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
        return rollingSequence(days);
    },
    daytime: function () {
        var dayTimes = ['morning', 'midday', 'evening', 'night'];
        return rollingSequence(dayTimes);
    },


    i18n: {
        resource: "messages",
        path: null,
        locale: null,
        bundle: null,

        detectLocale: function () {
            var locale;
            locale = navigator.language; // (Netscape - Browser Localization)
            if (!locale) {
                locale = navigator.browserLanguage; // (IE-Specific - Browser Localized Language)
            }
            if (!locale) {
                locale = navigator.systemLanguage; // (IE-Specific - Windows OS - Localized Language)
            }
            if (!locale) {
                locale = navigator.userLanguage;
            }
            if (!locale) {
                locale = "en";
                console.info("Defaulting to " + locale)
            }

            if (locale.length > 2) {
                console.info("Shortening locale to top level: " + locale)
                locale = locale.substring(0, 2);
            }

            console.info("Current locale: " + locale);
            return locale;
        },

        load18n: function (path, locale, resource) {

            var jsonGet = function (url) {
                var data = {result: {}};

                var client = new XMLHttpRequest();
                client.onreadystatechange = function () {
                    if (client.readyState == 4) {
                        if (client.status == 200) {
                            try {
                                var queryResult = JSON.parse(client.responseText);
                                data.result = queryResult;
                            } catch (e) {
                                alert("Failed to parse i18n from server: " + e);
                            }
                        }
                    }
                };

                client.open("GET", url, false);
                client.setRequestHeader("Accept", "application/json");
                client.send();
                return data.result;
            };

            var locales = [];
            if (locale != null) {
                locales.push(locale);
                var sepIndex = locale.indexOf("-", 0);
                if (sepIndex == -1)
                    sepIndex = locale.indexOf("_", 0);
                if (sepIndex != -1)
                    locales.push(locale.substring(0, sepIndex));
            }
            if (locale.indexOf("en") != 0)
                locales.push("en");

            var bundle = null;
            for (var i = 0; i < locales.length; ++i) {
                var loc = locales[i];
                var url = path + "/" + loc + "/" + resource + ".json?" + Math.random(); // prevent caching
                bundle = jsonGet(url);
                if (bundle != null) {
                    this.locale = loc;
                    break;
                }
            }

            return bundle;
        },

        init: function () {
            if (this.locale == null)
                this.locale = this.detectLocale();
            if (this.bundle == null)
                this.bundle = this.load18n(this.path, this.locale, this.resource);
        },

        t: function (key, properties) {
            this.init();
            var msg = this.bundle[key];
            if (msg == null)
                msg = key;

            if (properties) {
                $.each(properties, function (key, value) {
                    msg = msg.replace('${' + key + '}', value);
                });
            }

            return msg;
        },

        translate_document: function () {

            var that = this;
            var listToI18n = document.querySelectorAll("*[data-i18n]");

            // console.info("Translating " + listToI18n.length + " elements.")
            Array.prototype.slice.call(listToI18n).forEach(function (itemToI18n, index, arr) {
                var key = itemToI18n.getAttribute("data-i18n");
                if (key != null && key.length > 0) {
                    var msg = that.t(key);
                    if (msg == null || msg.length == 0) {
                        console.info("Missing translation for key: " + key);
                    } else {
                        if (itemToI18n.localName == 'input') {
                            if (itemToI18n.type == 'submit' || itemToI18n.type == 'button') {
                                itemToI18n.value = msg;
                            } else {
                                itemToI18n.placeholder = msg;
                            }
                        } else if (itemToI18n.localName == 'button') {
                            itemToI18n.text = msg;
                        } else {
                            itemToI18n.textContent = msg;
                        }
                    }
                }
            });
        }
    }
};
