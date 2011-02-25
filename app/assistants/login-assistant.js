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

var LoginAssistant = Class.create({

/* If a callback is provided then it will be called after a successful login */
initialize: function(prefs, controller, cb)
{
	this.p	= prefs;
	this.cb	= cb;

	if (controller) {
		this.controller = controller;
	}
},

setup: function(widget)
{
	this.widget	= widget;

	this.user	= "";
	this.controller.setupWidget('user', {
		modelProperty:		'user',
		autoFocus:			true,
		changeOnKeyPress:	true,
		textCase:			Mojo.Widget.steModeLowerCase
	}, this);

	this.pass	= "";
	this.controller.setupWidget('pass', {
		modelProperty:		'pass',
		autoFocus:			false,
		changeOnKeyPress:	true
	}, this);

	this.controller.setupWidget('login', {
		type:				Mojo.Widget.activityButton,
		buttonClass:		'primary',
		textCase:			Mojo.Widget.steModeLowerCase,
		autoReplace:		false
	}, this.loginmodel = {
		buttonLabel:		$L('Login'),
		disabled:			true
	}, this);

	this.controller.setupWidget('close', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Cancel')
	}, this);


	this.controller.setupWidget('skinnyr', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Create skinnyr Account')
	}, this);

	this.change		= this.change.bind(this);
	this.login		= this.login.bind(this);
	this.close		= this.close.bind(this);
	this.skinnyr	= this.skinnyr.bind(this);

	this.controller.listen('user',		Mojo.Event.propertyChange,	this.change);
	this.controller.listen('pass',		Mojo.Event.propertyChange,	this.change);
	this.controller.listen('login',		Mojo.Event.tap,				this.login);
	this.controller.listen('close',		Mojo.Event.tap,				this.close);
	this.controller.listen('skinnyr',	Mojo.Event.tap,				this.skinnyr);
},

cleanup: function()
{
	this.controller.stopListening('user',		Mojo.Event.propertyChange,	this.change);
	this.controller.stopListening('pass',		Mojo.Event.propertyChange,	this.change);
	this.controller.stopListening('login',		Mojo.Event.tap,				this.login);
	this.controller.stopListening('close',		Mojo.Event.tap,				this.close);
	this.controller.stopListening('skinnyr',	Mojo.Event.tap,				this.skinnyr);
},

change: function()
{
	if (this.user && this.user.length && this.pass && this.pass.length) {
		this.loginmodel.disabled = false;
	} else {
		this.loginmodel.disabled = true;
	}
	this.controller.modelChanged(this.loginmodel);
},

login: function()
{
	this.controller.get('login').mojo.activate();

	skinnyr.login(this.user, this.pass,
		function(token) {
			this.p.skinnyr.authtoken	= token;
			this.p.skinnyr.user			= this.user;
			this.p.save();

			weights.authtoken = this.p.skinnyr.authtoken;
			weights.sync(function(worked) {
				this.controller.get('login').mojo.deactivate();

				if (worked) {
					if (this.widget) {
						this.widget.mojo.close();
					} else {
						this.controller.stageController.popScene();
					}
					this.cb();
				} else {
					this.controller.get('message').innerHTML = $L("Could not sync with skinnyr.com");
				}
			}.bind(this));
		}.bind(this),
		function(err) {
			this.controller.get('login').mojo.deactivate();

			// TODO Get more specific errors from the xmlrpc stuff... It would
			//		be nice to say "wrong password" or "could not connect"
			this.controller.get('message').innerHTML = $L("Could not login");
			Mojo.log(err);
		}.bind(this)
	);
},

close: function() {
	if (this.widget) {
		this.widget.mojo.close();
	} else {
		this.controller.stageController.popScene();
	}
},

skinnyr: function() {
	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method:			"open",
		parameters: {
			id:			'com.palm.app.browser',
			params: {
				target:	'http://www.skinnyr.com'
			}
		}
	});
},

handleCommand: function(event)
{
	event.stop();

	if (this.widget) {
		this.widget.mojo.close();
	} else {
		this.controller.stageController.popScene();
	}
}

});

