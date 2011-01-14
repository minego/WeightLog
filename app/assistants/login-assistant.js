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

initialize: function(prefs, controller)
{
	this.p = prefs;

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
		changeOnKeyPress:	false
	}, this);

	this.pass	= "";
	this.controller.setupWidget('pass', {
		modelProperty:		'pass',
		autoFocus:			false,
		changeOnKeyPress:	false
	}, this);

	// TODO Disable the login button if there isn't a value for user and pass..

	this.controller.setupWidget('login', {
		type:			Mojo.Widget.activityButton,
		buttonClass:	'primary',
		textCase:		Mojo.Widget.steModeLowerCase,
		autoReplace:	false
	}, {
		buttonLabel:	$L('Login')
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
		buttonLabel:	$L('Get an account on skinnyr')
	}, this);



	this.controller.listen(this.controller.get('login'), Mojo.Event.tap,
		this.login.bindAsEventListener(this));
	this.controller.listen(this.controller.get('close'), Mojo.Event.tap,
		this.close.bindAsEventListener(this));

	this.controller.listen(this.controller.get('skinnyr'), Mojo.Event.tap,
		this.skinnyr.bindAsEventListener(this));
},

cleanup: function()
{
	this.controller.stopListening(this.controller.get('login'), Mojo.Event.tap,
		this.login.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('close'), Mojo.Event.tap,
		this.close.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('skinnyr'), Mojo.Event.tap,
		this.skinnyr.bindAsEventListener(this));
},

login: function()
{
	this.controller.get('login').mojo.activate();

	skinnyr.login(this.user, this.pass,
		function(token) {
			this.p.authtoken = token;
			this.p.save();

			weights.sync(function(worked) {
				this.controller.get('login').mojo.deactivate();

				if (worked) {
					if (this.widget) {
						this.widget.mojo.close();
					} else {
						this.controller.stageController.popScene();
					}
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
	// TODO Make this actually go to www.skinnyr.com
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

