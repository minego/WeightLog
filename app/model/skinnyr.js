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
var skinnyr = {

/*
	All values are stored in metric.  Multiply by one of the following to
	convert from metric.
*/
lb:			0.45359237,
stone:		6.35029318,
kg:			1.0,

inch:		2.54,
cm:			1.0,

/* The following field names are used for weight records on skinnyr */
weight:		'dblWeight',
date:		'dtDateTime',
id:			'strSyncId',

/*
	Login to the skinnyr service, and if successful return an authentication
	token that can be used with the other commands.  This token can be saved for
	future use as well.
*/
login: function(user, pass, success, failure)
{
	var		succeeded	= false;
	var		failed		= false;

	xmlrpc('http://www.skinnyr.com/api2', 'getAuthToken', [
		user, hex_md5(pass),
		'Weight Log Test',
// TODO Change this to the URI to the app in the palm catalog once it is there
		'www.minego.net'
	], function(ret) {
		if (ret["strAuthToken"]) {
			succeeded = true;
			success(ret["strAuthToken"]);
		} else {
			failed = true;
			failure("Invalid login");
		}
	}, function(err) {
		failed = true;

		failure(err);
	}, function() {
		if (!succeeded && !failed) {
			failure("Unknown error");
		}
	});
},

/*
	Return an array of records stored on the skinnyr service for the account
	associated with the provided token.  Each element in the array will contain
	a 'weight', 'date' and 'id' field
*/
list: function(token, success, failure)
{
	var		succeeded	= false;
	var		failed		= false;

	xmlrpc('http://www.skinnyr.com/api2', 'getAllWeights', [
		token
	], function(ret) {
		succeeded = true;
		success(ret);
	}, function(err) {
		failed = true;
		failure(err);
	}, function() {
		if (!succeeded && !failed) {
			failure("Unknown error");
		}
	});
},

/* Add a new weight record */
add: function(token, weight, date, success, failure)
{
	var		succeeded	= false;
	var		failed		= false;

	xmlrpc('http://www.skinnyr.com/api2', 'createWeight', [
		token, weight, date, ""
	], function(id) {
		succeeded = true;
		success(id);
	}, function(err) {
		failed = true;
		failure(err);
	}, function() {
		if (!succeeded && !failed) {
			failure("Unknown error");
		}
	});
},

/* Modify a record that already exists on the skinnyr service */
set: function(token, id, weight, date, success, failure)
{
	var		succeeded	= false;
	var		failed		= false;

	xmlrpc('http://www.skinnyr.com/api2', 'updateWeight', [
		token, id, weight, date
	], function(worked) {
		if (worked) {
			succeeded = true;
			success(id);
		} else {
			failed = true;
			failure("Unkown error");
		}
	}, function(err) {
		failed = true;
		failure(err);
	}, function() {
		if (!succeeded && !failed) {
			failure("Unknown error");
		}
	});
},

/* Delete a record that already exists on the skinnyr service */
del: function(token, id, success, failure)
{
	var		succeeded	= false;
	var		failed		= false;

	xmlrpc('http://www.skinnyr.com/api2', 'deleteWeight', [
		token, id
	], function(worked) {
		if (worked) {
			succeeded = true;
			success(id);
		} else {
			failed = true;
			failure("Unkown error");
		}
	}, function(err) {
		failed = true;
		failure(err);
	}, function() {
		if (!succeeded && !failed) {
			failure("Unknown error");
		}
	});
}

};
