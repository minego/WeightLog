/*
 * Copyright (c) 2008 David Crawshaw <david@zentus.com>
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/*
 * An XML-RPC library for JavaScript.
 *
 * The xmlrpc() function is the public entry point.
 */

/*
 * Execute an XML-RPC method and return the response to 'callback'.
 * Parameters are passed as JS Objects, and the callback function is
 * given a single JS Object representing the server's response.
 */
var xmlrpc = function(server, method, params, callback, callErr, callFinal) {
    if (callErr == null)
        callErr = alert;

    var request = window.XMLHttpRequest ? new XMLHttpRequest()
        : new ActiveXObject("MSXML2.XMLHTTP.3.0");
    request.open("POST", server, true);
    request.onreadystatechange = function() {
        if (request.readyState != 4) {
            return; // TODO: callbacks?
		}

        try {
            if (request.status != 200) {
                callErr("connection error " + request.status);
                return;
            }

            var ret = null;
            try {
Mojo.log('request.responseText: ' + request.responseText);
                if (request.responseXML)
                    ret = xmlrpc.parseResponse(request.responseXML);
                else
                    throw "bad xml: '" + request.responseText + "'";
            } catch (err) {
                err.message = "xmlrpc: " + err.message;
                callErr(err);
                throw err;
            }

            try {
Mojo.log('Calling callback');
Mojo.log('result is: ' + ret);
                callback(ret);
            } catch (err) {
                err.message = "callback: " + err.message;
                callErr(err);
                throw err;
            }
        } finally {
            if (callFinal)
                callFinal();
        }
    };

    var sending = xmlrpc.writeCall(method, params);
Mojo.log('sending: ' + sending);
    request.send(sending);
};

xmlrpc.writeCall = function(method, params) {
    out = "<?xml version=\"1.0\"?>\n";
    out += "<methodCall>\n";
    out += "<methodName>"+ method + "</methodName>\n";

    if (params && params.length > 0) {
        out += "<params>\n";
        for (var i=0; i < params.length; i++) {
            out += "<param><value>";
            out += xmlrpc.writeParam(params[i]);
            out += "</value></param>";
        }
        out += "</params>\n";
    }

    out += "</methodCall>\n";
    return out;
};

xmlrpc.writeParam = function(param) {
    if (param == null)
        return "<nil />";
    switch (typeof(param)) {
        case "boolean":     return "<boolean>" + param + "</boolean>";
        case "string":
            param = param.replace(/</g, "&lt;");
            param = param.replace(/&/g, "&amp;");
            return "<string>" + param + "</string>";
        case "undefined":   return "<nil/>";
        case "number":
            var r =  /\./.test(param) ?
                "<double"> + param + "</double>" :
                "<int>" + param + "</int>";
			return r;
        case "object":
            if (param.constructor == Array) {
                out = "<array><data>\n";
                for (var i in param) {
                    out += "  <value>";
                    xmlrpc.writeParam(param[i]);
                    out += "</value>\n";
                }
                out += "</data></array>";
                return out;
            } else if (param.constructor == Date) {
                out = "<dateTime.iso8601>";
                out += param.getUTCFullYear();
                if (param.getUTCMonth() < 10)
                    out += "0";
                out += param.getUTCMonth();
                if (param.getUTCDate() < 10)
                    out += "0";
                out += param.getUTCDate() + "T";
                if (param.getUTCHours() < 10)
                    out += "0";
                out += param.getUTCHours() + ":";
                if (param.getUTCMinutes() < 10)
                    out += "0";
                out += param.getUTCMinutes() + ":";
                if (param.getUTCSeconds() < 10)
                    out += "0";
                out += param.getUTCSeconds();
                out += "</dateTime.iso8601>";
                return out;
            } else { /* struct */
                out = "<struct>\n";
                for (var i in param) {
                    out += "<member>";
                    out += "<name>" + i + "</name>";
                    out += "<value>" + xmlrpc.writeParam(param[i]) + "</value>";
                    out += "</member>\n";
                }
                out += "</struct>\n";
                return out;
            }
    }

	return "";
};

xmlrpc.findChild = function(parent, name) {
	for (var i = 0; i < parent.childNodes.length; i++) {
		if (parent.childNodes[i].nodeName == "#text") {
			continue;
		}

		if (!name || parent.childNodes[i].nodeName == name) {
			return(parent.childNodes[i]);
		}
	}

	return(null);
};

xmlrpc.parseResponse = function(dom) {
	var methResp = xmlrpc.findChild(dom, "methodResponse");

	if (!methResp) {
        Mojo.log("malformed or missing <methodResponse>");
        throw "malformed or missing <methodResponse>";
	}

	var params = xmlrpc.findChild(methResp, "fault");
	if (params) {
		var fault = xmlrpc.findChild(params);
        Mojo.log(fault["faultString"]);
        throw fault["faultString"];
    }

	params = xmlrpc.findChild(methResp, "params");
	if (!params) {
        Mojo.log("malformed or missing <params>");
        throw "malformed or missing <params>";
	}

	var param = xmlrpc.findChild(params);
	if (!param) {
        Mojo.log("malformed or missing <param>");
        throw "malformed <param>";
	}

	var value = xmlrpc.findChild(param);
	if (!value) {
        Mojo.log("malformed or missing <value>");
        throw "malformed or missing <value>";
	}

    return xmlrpc.parse(value);
};

xmlrpc.parse = function(value) {
    if (value.nodeName != "value") {
        Mojo.log("parser: expected <value>");
        throw "parser: expected <value>";
	}

	var type = xmlrpc.findChild(value);
    if (type == null) {
        Mojo.log("parser: expected <value> to have a child");
        throw "parser: expected <value> to have a child";
	}

	var v = xmlrpc.findChild(type);
	var d = type.childNodes.length ? type.childNodes[0] : null;
Mojo.log('Found type: ' + type.nodeName);
    switch (type.nodeName) {
        case "boolean":
            return (d && d.data == "1") ? true : false;
        case "i4":
        case "int":
            return parseInt(d.data);
        case "double":
            return parseFloat(d.data);
        case "#text": // Apache XML-RPC 2 doesn't wrap strings with <string>
            return type.data;
        case "string":
            return d ? d.data : null;
        case "array":
            var res = new Array();

            for (var i = 0; i < v.childNodes.length; i++) {
                res[res.length] = xmlrpc.parse(v.childNodes[i]);
			}

            return res;
        case "struct":
Mojo.log('Found a struct');
            var members = type.childNodes;
            var res = {};

            for (var i = 0; i < members.length; i++) {
				if (members[i].nodeName != "member") {
					continue;
				}

				var name	= xmlrpc.findChild(members[i], "name").childNodes[0].data;
Mojo.log('member: ' + name);
				res[name]	= xmlrpc.parse(xmlrpc.findChild(members[i], "value"));
Mojo.log('value: ' + res[name]);
            }
            return res;
        case "dateTime.iso8601":
            var s = d.data;
            var d = new Date();
            d.setUTCFullYear(s.substr(0, 4));
            d.setUTCMonth(parseInt(s.substr(4, 2)) - 1);
            d.setUTCDate(s.substr(6, 2));
            d.setUTCHours(s.substr(9, 2));
            d.setUTCMinutes(s.substr(12, 2));
            d.setUTCSeconds(s.substr(15, 2));
            return d;
        case "base64":
            alert("TODO base64"); // XXX
        default:
            Mojo.log("parser: expected type, got <"+type.nodeName+">");
            throw "parser: expected type, got <"+type.nodeName+">";
    }
};
