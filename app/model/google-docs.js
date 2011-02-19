/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
var gdocs = {

url: {
	login:	'https://www.google.com/accounts/ClientLogin',
	feed:	'http://spreadsheets.google.com/feeds/spreadsheets/private/full'
},

init: function(prefs)
{
	this.p = prefs;
},

/* Attempt to login to a google account */
login: function(user, pass, success, failure)
{
	this.serviceLogin(user, pass, 'wise',
		function(key)
		{
			this.p.google.wise = key;
			Mojo.log('wise key: ' + key);

			this.serviceLogin(user, pass, 'writely',
			function(key)
			{
				this.p.google.writely = key;
				Mojo.log('writely key: ' + key);
				this.p.save();

				success();
			}.bind(this), failure);
		}.bind(this), failure);
},

logout: function()
{
	this.p.google = {};
	this.p.save();
},

serviceLogin: function(user, pass, service, success, failure)
{
	new Ajax.Request(this.url.login, {
		parameters: {
			Email:			user,
			Passwd:			pass,

			/* Service may be 'wise' or 'writely' */
			service:		service,
			accountType:	'HOSTED_OR_GOOGLE',

			source: [
				Mojo.Controller.appInfo.vendor,
				Mojo.Controller.appInfo.title,
				Mojo.Controller.appInfo.version
			].join('-')
		},
		method:				'GET',
		evalJSON:			false,

		onSuccess: function(r) {
			var key = null;

			// Mojo.log('success: ' + r.responseText);

			r.responseText.split('\n').each(function(line) {
				var l = line.split('=');

				if (2 == l.length && l[0].toLowerCase().match('auth')) {
					key = l[1];
				}
			});

			// Mojo.log('auth key: ' + key);
			success(key);
		}.bind(this),

		onFailure: function(r) {
			Mojo.log('failure: ' + r.responseText);

			var url = null;
			r.responseText.split('\n').each(function(line) {
				var l = line.split('=');
				var n = l.splice(0, 1)[0].toLowerCase();
				var v = l.join('=');

				if ('url' == n) {
					/*
						Google is convinced that the user is a dick, and is sure
						that forcing the user to squint and bitch will make him
						much much happier....

						Open the browser so the user can enter the captcha
					*/
					Mojo.log('Open Captcha: ' + v);
					this.controller.serviceRequest('palm://com.palm.applicationManager', {
						method:			"open",
						parameters: {
							id:			'com.palm.app.browser',
							params: {
								target:	v
							}
						}
					});
				}
			});

			failure(this.errorText(r.responseText));
		}.bind(this)
	});
},

errorText: function(msg)
{
	if (msg.match('Error=BadAuthentication')) {
		return('Invalid username or password.');
	}

	if (msg.match('Error=ServiceUnavailable')) {
		return('The Google Docs service is not currently available.  Please try later.');
	}

	if (msg.match('Error=NotVerified')		||
		msg.match('Error=TermsNotAgreed')	||
		msg.match('Error=AccountDeleted')	||
		msg.match('Error=AccountDisabled')	||
		msg.match('Error=ServiceDisabled')
	) {
		return('The specified google account can not be used.');
	}

	return('An unknown error occurred.');
},

list: function(name, success, failure)
{
	var query = '';

	if (name) {
		query = '?title=' + escape(name);
	}

	new Ajax.Request(this.url.feed + query, {
		method:				'GET',
		evalJSON:			false,
		requestHeaders:		{ Authorization: 'GoogleLogin auth=' + this.p.google.wise },

		onSuccess: function(r) {
			var e = r.responseXML.getElementsByTagName('entry');
			var x = [];

			for (var i = 0; i < e.length; i++) {
				var n = {};

				n.name = unescape(e[i].getElementsByTagName('title').item(0).textContent);

				var l = e[i].getElementsByTagName('link');
				for (var c = 0; c < l.length; c++) {
					switch (l[c].getAttribute('rel').split('#').pop().toLowerCase()) {
						case 'worksheetsfeed':
							n.url = l[c].getAttribute('href');
							break;

						case 'self':
						case 'alternate':
						default:
							break;
					}
				}

				x.push(n);
			}

			success(x);
		}.bind(this),

		onFailure: function(r) {
			Mojo.log('failure: ' + r.responseText);

			failure(this.errorText(r.responseText));
		}.bind(this)
	});
},

get: function(url, success, failure)
{
	new Ajax.Request(url, {
		method:				'GET',
		evalJSON:			false,
		requestHeaders:		{ Authorization: 'GoogleLogin auth=' + this.p.google.wise },

		onSuccess: function(r) {
			var e	= r.responseXML.getElementsByTagName('entry');
			var x	= [];
			var url	= null;

			for (var i = 0; i < e.length; i++) {
				var l = e[i].getElementsByTagName('link');
				for (var c = 0; c < l.length; c++) {
					switch (l[c].getAttribute('rel').split('#').pop().toLowerCase()) {
						// case 'cellsfeed':
						case 'listfeed':
							url = l[c].getAttribute('href');
							break;

						default:
							break;
					}
				}
			}

			if (!url) {
				failure('Could not load document');
				return;
			}

Mojo.log('One more request...: ', url);
			Ajax.Request(url, {
				method:				'GET',
				evalJSON:			false,
				requestHeaders:		{ Authorization: 'GoogleLogin auth=' + this.p.google.wise },

				onSuccess: function(r) {
Mojo.log('got the final doc');
					this.parseCells(r.responseXML, success, failure);
				}.bind(this),

				onFailure: function(r) {
Mojo.log('did not get the final doc');
					failure(this.errorText(r.responseText));
				}.bind(this)
			});
		}.bind(this),

		onFailure: function(r) {
			Mojo.log('failure: ' + r.responseText);

			failure(this.errorText(r.responseText));
		}.bind(this)
	});
},

parseCells: function(doc, success, failure)
{
	var e	= r.responseXML.getElementsByTagName('entry');

Mojo.log('Found cells: ' + e.length);
	for (var i = 0; i < e.length; i++) {
		Mojo.log(Object.toJSON(e[i].getElementsByTagName('gs:cell')[0]));
	}
}

};
