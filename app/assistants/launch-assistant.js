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

var LaunchAssistant = Class.create({

// TODO Test the skinnyr integration...

setup: function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });

	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

	if (!weights.loaded) {
		weights.load(this.p.skinnyr.authtoken, function() {
			this.activate();
		}.bind(this));
	}

	// TODO Do we really need the launch page any more???

	// TODO	Write some help pages...

	// TODO Update the menu on the chart screen...

	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		this.menu = {
			visible:		true,
			items: [
				Mojo.Menu.editItem,
				{
					command:		'prefs',
					label:			$L('Preferences & Accounts')
				}, {
					command:		'reset',
					label:			$L('Remove all data')
				}, {
					command:		'newrecord',
					label:			$L('Enter current weight')
				}, {
					command:		'about',
					label:			$L('About')
				},
				Mojo.Menu.helpItem
			]
		}
	);

	this.controller.setupWidget('newweight', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Enter New Weight')
	});
	this.controller.listen(this.controller.get('newweight'), Mojo.Event.tap,
		this.newweight.bindAsEventListener(this));


	this.controller.setupWidget('history', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('View History')
	});
	this.controller.listen(this.controller.get('history'), Mojo.Event.tap,
		this.history.bindAsEventListener(this));

	this.activate();
},

ready: function()
{
},

cleanup: function()
{
	this.controller.stopListening(this.controller.get('history'), Mojo.Event.tap,
		this.history.bindAsEventListener(this));
},

activate: function()
{
	this.controller.stageController.setWindowOrientation('up');

	if (this.p) {
		this.p.load();
	}

	if (weights.count()) {
		this.lastweight = weights.w(weights.count() - 1);
	} else {
		this.lastweight = 0;
	}

	this.renderLED(this.lastweight);
},

history: function()
{
	this.controller.stageController.pushScene('chart');
},

newweight: function()
{
	this.controller.stageController.pushScene('newweight', this.p, NaN);
},

horizLine: function(ctx, x, y, l)
{
	ctx.beginPath();

	ctx.moveTo(x,			y);
	ctx.lineTo(x + 6,		y + 4);
	ctx.lineTo(x - 6 + l,	y + 4);
	ctx.lineTo(x + l,		y);
	ctx.lineTo(x - 6 + l,	y - 4);
	ctx.lineTo(x + 6,		y - 4);
	ctx.lineTo(x,			y);

	ctx.fill();
},

vertLine: function(ctx, x, y, l)
{
	ctx.beginPath();

	ctx.moveTo(x,			y);
	ctx.lineTo(x + 4,		y + 6);
	ctx.lineTo(x + 4,		y - 6 + l);
	ctx.lineTo(x,			y + l);
	ctx.lineTo(x - 4,		y - 6 + l);
	ctx.lineTo(x - 4,		y + 6);
	ctx.lineTo(x,			y);

	ctx.fill();
},

drawDigit: function(ctx, pos, digit, decimal)
{
	var s	= 35;
	var x	= 3;
	var l	= 6 + (pos * s) + (pos * 25);
	var on	= 'rgba( 79, 121, 159, 1)';
	var off	= 'rgba( 70,  70,  70, 1)';

	ctx.save();

	ctx.lineWidth		= 4;

	if (decimal) {
		ctx.fillStyle = on;

		ctx.beginPath();

		ctx.moveTo(l - (s / 2) - 4,	6 + (s * 2));
		ctx.lineTo(l - (s / 2),		6 + (s * 2) - 4);
		ctx.lineTo(l - (s / 2) + 4,	6 + (s * 2));
		ctx.lineTo(l - (s / 2),		6 + (s * 2) + 4);

		ctx.fill();
	}

	/* Left line */
	switch (digit) {
		case 0: case 4: case 5: case 6: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l, 6, s);

	switch (digit) {
		case 0: case 2: case 6: case 8:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l, 6 + s, s);

	/* Right line */
	switch (digit) {
		case 0: case 1: case 2: case 3: case 4: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l + s, 6, s);

	switch (digit) {
		case 0: case 1: case 3: case 4: case 5: case 6: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l + s, 6 + s, s);

	/* Horizontal lines */
	switch (digit) {
		case 0: case 2: case 3: case 5: case 6: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, 6, s);

	switch (digit) {
		case 2: case 3: case 4: case 5: case 6: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, 6 + s, s);

	switch (digit) {
		case 0: case 2: case 3: case 5: case 6: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, 6 + (s * 2), s);

	ctx.restore();
},

renderLED: function(weight)
{
	var led		= this.controller.get('led');
	var w		= 230;
	var h		= 82;

	led.width	= w; led.style.width	= w + "px";
	led.height	= h; led.style.height	= h + "px";

	var ctx		= led.getContext('2d');

	ctx.clearRect(0, 0, w, h);

	this.drawDigit(ctx, 0, Math.floor(weight / 100));
	this.drawDigit(ctx, 1, Math.floor((weight % 100) / 10));
	this.drawDigit(ctx, 2, Math.floor(weight % 10));
	this.drawDigit(ctx, 3, Math.floor((weight * 10) % 10), true);
},

handleCommand: function(event)
{
	var cmd	= null;
	var e	= null;

	/*
		Find the event name.  Normally this is called with an event and the
		event name needs to be stripped off.  Allowing it to be called with a
		string as well makes life easier.
	*/
	if (typeof event == 'string') {
		cmd = event;
	} else if (!event || !event.type) {
		return;
	} else {
		e = event.originalEvent;

		switch (event.type) {
			case Mojo.Event.command:
				cmd = event.command;
				break;

			case Mojo.Event.commandEnable:
				cmd = event.command;
				return;

			default:
				return;
		}
	}

	switch (cmd) {
		case 'prefs':
			this.controller.stageController.pushScene('prefs', this.p);
			break;

		// TODO Remove the account related stuff... it goes in prefs
		case 'login':
			this.controller.showDialog({
				assistant:		new LoginAssistant(this.p, this.controller),
				template:		'login/login-scene',

				preventCancel:	false,

				title:			$L('Login'),
				actionBtnTitle:	$L('Login')
			});

			break;

		case 'reset':
			while (weights.count()) {
				weights.del(0);
			}

			// TODO Let the user know that we're busy syncing...
			weights.sync(function() {
				// TODO Let the user know that we're done...
				this.renderLED(0);
			}.bind(this));
			break;

		case 'about':
			// TODO Create an about page.  It has to give credit for the icon
			// (see http://www.chris-wallace.com/2009/10/18/monday-freebie-vector-scale-icon/ )

			var msg = [
				$L('Copyright 2010-2011, Micah N Gorrell.\n'),
				$L('Icon copyright: Chris Wallace.'),
				$L('www.chris-wallace.com/2009/10/18/monday-freebie-vector-scale-icon/')
			].join('  \n');

			 this.controller.showAlertDialog({
				title:		$L("Weight Log"),
				message:	msg,

				onChoose:	function(value) {},
				choices:	[{ label: $L("OK"), value:"" }]
			});
			break;

		case 'newrecord':
			this.controller.stageController.pushScene('newrecord');
			break;

		default:
			Mojo.log('Ignoring command: ' + cmd);

			/* Let the event through */
			return;
	}

	if (typeof event != 'string') {
		event.stop();
	}
}

});

