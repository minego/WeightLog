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
var xmlrpc = function(server, method, params, callback, callErr, callFinal)
{
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
				Mojo.log('response XML: ' + request.responseText);
				Mojo.log('');

                if (request.responseXML)
                    ret = xmlrpc.parseResponse(request.responseXML);
                else
                    throw "bad xml: '" + request.responseText + "'";
            } catch (err) {
                err.message = "xmlrpc: " + err.message;
				Mojo.log(err.message);
                callErr(err.message);
            }

            try {
				if (ret[1]) {
					callback(ret[0]);
				} else {
					callErr(ret[0]);
				}
            } catch (err) {
                err.message = "callback: " + err.message;
                callErr(err.message);
            }
        } finally {
            if (callFinal)
                callFinal();
        }
    };

    var sending = xmlrpc.writeCall(method, params);
	// Mojo.log('request XML: ' + sending);
	// Mojo.log('');
    request.send(sending);
};

xmlrpc.writeCall = function(method, params)
{
    out = "<?xml version=\"1.0\"?>\n";
    out += "<methodCall>\n";
    out += "<methodName>"+ method + "</methodName>\n";

    if (params && params.length > 0) {
        out += "<params>\n";
        for (var i = 0; i < params.length; i++) {
            out += "<param><value>";
            out += xmlrpc.writeParam(params[i]);
            out += "</value></param>";
        }
        out += "</params>\n";
    }

    out += "</methodCall>\n";
    return out;
};

xmlrpc.writeParam = function(param)
{
    if (param == null) {
        return "<nil />";
	}

    switch (typeof(param)) {
		default:
			return "<nil />";

        case "boolean":
			return "<boolean>" + param + "</boolean>";

        case "string":
            param = param.replace(/</g, "&lt;");
            param = param.replace(/&/g, "&amp;");

            return "<string>" + param + "</string>";

        case "undefined":
			return "<nil/>";

        case "number":
			if (/\./.test(param)) {
				return("<double>" + param + "</double>");
			} else {
                return("<int>" + param + "</int>");
			}

        case "object":
            if (param.constructor == Array) {
                out = "<array><data>\n";
                for (var i in param) {
                    out += "  <value>";
                    out += xmlrpc.writeParam(param[i]);
                    out += "</value>\n";
                }
                out += "</data></array>";
                return out;
            } else if (param.constructor == Date) {
                out = "<dateTime.iso8601>";
                out += param.getUTCFullYear();

				var m = (param.getUTCMonth() + 1);
				if (m < 10) {
					out += "0";
				}
				out += m;

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

xmlrpc.findChild = function(parent, name)
{
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

xmlrpc.parseResponse = function(dom)
{
	var methResp = xmlrpc.findChild(dom, "methodResponse");
	var params;
	var param;
	var value;
	var success;

	if (!methResp) {
        Mojo.log("malformed or missing <methodResponse>");
        throw "malformed or missing <methodResponse>";
	}

	if ((params = xmlrpc.findChild(methResp, "fault"))) {
		value = xmlrpc.findChild(params, "value");
		success = false;
    } else {
		if (!(params = xmlrpc.findChild(methResp, "params"))) {
			Mojo.log("malformed or missing <params>");
			throw "malformed or missing <params>";
		}

		if (!(param = xmlrpc.findChild(params, "param"))) {
			Mojo.log("malformed or missing <param>");
			throw "malformed <param>";
		}

		value = xmlrpc.findChild(param, "value");
		success = true;
	}

	if (!value) {
		Mojo.log("malformed or missing <value>");
		throw "malformed or missing <value>";
	}

    return([ xmlrpc.parse(value), success ]);
};

xmlrpc.parse = function(value)
{
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
            var res		= new Array();
			var array	= xmlrpc.findChild(type, 'data') || type;

            for (var i = 0; i < array.childNodes.length; i++) {
				if (array.childNodes[i].nodeName != 'value') {
					continue;

				}
				res[res.length] = xmlrpc.parse(v.childNodes[i]);
			}

            return res;

        case "struct":
            var members = type.childNodes;
            var res = {};

            for (var i = 0; i < members.length; i++) {
				if (members[i].nodeName != "member") {
					continue;
				}

				var name	= xmlrpc.findChild(members[i], "name").childNodes[0].data;
				res[name]	= xmlrpc.parse(xmlrpc.findChild(members[i], "value"));
            }
            return res;

        case "dateTime.iso8601":
            var s	= d.data;
            var d	= new Date();
			var m	= s.trim().match(/(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/);
			var o	= 0;

			if (m) {
				d.setUTCDate(1);
				d.setUTCFullYear(	parseInt(m[1], 10), parseInt(m[3], 10) - 1,	parseInt(m[5], 10));
				d.setUTCHours(		parseInt(m[7], 10), parseInt(m[9], 10),		parseInt(m[11],10));

				if (m[12]) {
					d.setUTCMilliseconds(parseFloat(m[12]) * 1000);
				} else {
					d.setUTCMilliseconds(0);
				}

				if (m[13] != 'Z') {
					o = (m[15] * 60) + parseInt(m[17], 10);
					o *= ((m[14] == '-') ? -1 : 1);
					d.setTime(d.getTime() - o * 60 * 1000);
				}
			} else {
				d.setTime(Date.parse(s));
			}

            return d;

        case "base64":
            alert("TODO base64"); // XXX
        default:
            Mojo.log("parser: expected type, got <"+type.nodeName+">");
            throw "parser: expected type, got <"+type.nodeName+">";
    }
};

