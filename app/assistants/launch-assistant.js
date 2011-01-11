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

setup: function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });

	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		this.menu = {
			visible:		true,
			items: [
				Mojo.Menu.editItem,
				{ label: $L('Reset all data'), command: 'reset' }
			]
		}
	);

	var inches = [];
	for (var i = (7 * 12); i > (2 * 12); i--) {
		inches[inches.length] = {
			label: "" + Math.floor(i / 12) + "' " + (i % 12) + '"',
			value: i
		};
	}

    this.controller.setupWidget('height', {
		label:			$L('Your height'),
		modelProperty:	'height',
		choices:		inches
	}, this.p);

    this.controller.setupWidget('units', {
		label:			$L('Units'),
		modelProperty:	'units',
		choices:		[
			{ label: $L('U.S.'),	value: 'US'		},
			{ label: $L('metric'),	value: 'metric'	}
		]
	}, this.p);

	this.controller.setupWidget('enterweight', {
		type:			Mojo.Widget.button
	}, {
		buttonLabel:	$L('Enter Weight'),
		buttonClass:	'primary'
	}, this);

	this.controller.setupWidget('viewchart', {
		type:			Mojo.Widget.button
	}, {
		buttonLabel:	$L('View History'),
		buttonClass:	'primary'
	}, this);


	this.controller.listen(this.controller.get('viewchart'), Mojo.Event.tap,
		this.viewChart.bindAsEventListener(this));

	if (this.p.data && this.p.data.length) {
		this.renderLED(this.p.data[this.p.data.length - 1].weight);
	} else {
		// this.renderLED(0);
		this.renderLED(243.5);
	}
},

ready: function()
{
},

cleanup: function()
{
},

deactivate: function()
{
    this.p.save();
},

viewChart: function()
{
	this.controller.stageController.pushScene('chart');
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

drawDigit: function(ctx, digit, pos, decimal)
{
	var s	= 35;
	var x	= 3;
	var l	= (pos * s) + (pos * 25);
	var on	= 'rgba( 79, 121, 159, 1)';
	var off	= 'rgba( 70,  70,  70, 1)';

	ctx.save();

	ctx.lineWidth		= 4;

	if (decimal) {
		ctx.fillStyle = on;

		ctx.beginPath();

		ctx.moveTo(l - (s / 2) - 4,	(s * 3));
		ctx.lineTo(l - (s / 2),		(s * 3) - 4);
		ctx.lineTo(l - (s / 2) + 4,	(s * 3));
		ctx.lineTo(l - (s / 2),		(s * 3) + 4);

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
	this.vertLine(ctx, l, s, s);

	switch (digit) {
		case 0: case 2: case 6: case 8:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l, s * 2, s);

	/* Right line */
	switch (digit) {
		case 0: case 1: case 2: case 3: case 4: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l + s, s, s);

	switch (digit) {
		case 0: case 1: case 3: case 4: case 5: case 6: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.vertLine(ctx, l + s, s * 2, s);

	/* Horizontal lines */
	switch (digit) {
		case 0: case 2: case 3: case 5: case 6: case 7: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, s, s);

	switch (digit) {
		case 2: case 3: case 4: case 5: case 6: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, s * 2, s);

	switch (digit) {
		case 0: case 2: case 3: case 5: case 6: case 8: case 9:
			ctx.fillStyle = on;
			break;

		default:
			ctx.fillStyle = off;
			break;
	}
	this.horizLine(ctx, l, s * 3, s);

	ctx.restore();
},

renderLED: function(weight)
{
	var led		= this.controller.get('led');
	var w		= 280;
	var h		= 150;

	led.width	= w; led.style.width	= w + "px";
	led.height	= h; led.style.height	= h + "px";

	var ctx		= led.getContext('2d');

	ctx.clearRect(0, 0, w, h);

	this.drawDigit(ctx, Math.floor(weight / 100), 1); weight = weight % 100;
	this.drawDigit(ctx, Math.floor(weight / 10 ), 2); weight = weight % 10;
	this.drawDigit(ctx, Math.floor(weight      ), 3); weight -= Math.floor(weight);
	this.drawDigit(ctx, Math.floor(weight * 10 ), 4, true);
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
				/*
					This app does not enable or disable any menu items, so
					all commands are enabled.
				*/
				event.stopPropagation();
				return;

			default:
				return;
		}
	}


	// TODO Setup the menu.  Right now none of these events will be called
	//		because the default menu is in place
	switch (cmd) {
		case Mojo.Menu.prefsCmd:
			// TODO Create a prefs page
			this.controller.stageController.pushScene('prefs');
			break;

		case 'about':
			// TODO Create an about page.  It has to give credit for the icon
			// (see http://www.chris-wallace.com/2009/10/18/monday-freebie-vector-scale-icon/ )
			this.controller.stageController.pushScene('about');
			break;

		case Mojo.Menu.helpCmd:
			// TODO Create a help page
			this.controller.stageController.pushScene('help');
			break;

		case 'newrecord':
			// TODO Create a new record dialog (This should be a dialog, not
			//		a page...
			this.controller.stageController.pushScene('newrecord');
			break;

		case 'editrecord':
			// TODO: Create an edit record page or dialog
			this.controller.stageController.pushScene('editrecord');
			break;


		case 'week':
			this.setDayCount(9);
			break;

		case 'month':
			this.setDayCount(35);
			break;

		case 'year':
			this.setDayCount(356);
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

