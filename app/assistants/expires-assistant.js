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

var ExpiresAssistant = Class.create({

initialize: function(controller)
{
	this.controller = controller;
},

setup: function(widget)
{
	this.widget	= widget;

	this.controller.setupWidget('close', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Close'),
		disabled:		MinegoApp.expired()
	}, this);

	this.close = this.close.bind(this);
	this.controller.listen('close', Mojo.Event.tap, this.close);


	if (MinegoApp.beta) {
		this.controller.get('title').innerHTML		= $L('Weight Log Beta');
	} else if (MinegoApp.debug) {
		this.controller.get('title').innerHTML		= $L('Weight Log (debug)');
	} else {
		this.controller.get('title').innerHTML		= $L('Weight Log');
	}

	if (MinegoApp.expired()) {
		var msg = [
			'This version of Weight Log expired on',
			MinegoApp.expires().toLocaleDateString() + '.'
		].join(' ');

		this.controller.get('message').innerHTML	= msg;
	} else if (MinegoApp.beta) {
		var msg = [
			'This is a beta build of Weight Log.  It is fully functional, but',
			'it will expire on', MinegoApp.expires().toLocaleDateString() + '.',
			'<br/><br/>',

			'Any weights and preferences saved will be reset when the released',
			'version of the application is installed.',
			'If you use a skinnyr.com account then all of your data will be',
			'stored on your account and the same account can be used with the',
			'release version.<br /><br/>',

			'Please email any issues, comments or suggestions to',
			'<a href="mailto:weightlog@minego.net">weightlog@minego.net</a>.'
		].join(' ');

		this.controller.get('message').innerHTML	= msg;
	} else {
		var msg = [
			'This version of Weight Log will expire on',
			MinegoApp.expires().toLocaleDateString() + '.',
			'Please enjoy the app until that time.<br /><br />'
		].join(' ');

		this.controller.get('message').innerHTML	= msg;
	}
},

cleanup: function()
{
	this.controller.stopListening('close', Mojo.Event.tap, this.close);
},

close: function() {
	if (!MinegoApp.expired()) {
		this.widget.mojo.close();
	}
},

handleCommand: function(event)
{
	event.stop();

	if (!MinegoApp.expired()) {
		this.widget.mojo.close();
	}
}

});

