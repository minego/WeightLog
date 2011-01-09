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
var EngineAssistant = Class.create({

/*
	TODO:
	- Keep track of the turtle's current position, and position the level
	  relative to him.
	- Only animate the turtle while he is moving
	- Add additional properties to the tiles.  For example, can the turtle move
	  through a tile, or is it solid.
	- Implement controls.
*/

setup: function()
{
	this.controller.enableFullScreenMode(true);

	/* I'd like consistent events, regardless of the orientation */
	this.controller.useLandscapePageUpDown(false);


	this.controller.listen(document, 'keyup',
		this.keyUp.bindAsEventListener(this), true);
	this.controller.listen(document, 'keydown',
		this.keyDown.bindAsEventListener(this), true);
	this.controller.listen(document, Mojo.Event.stageDeactivate,
		this.background.bindAsEventListener(this), true);
	this.controller.listen(document, Mojo.Event.stageActivate,
		this.foreground.bindAsEventListener(this), true);
	this.controller.listen(document, 'resize',
		this.screenSizeChanged.bind(this));
},

ready: function()
{
	/*
		Set a starting position, the level will be positioned relative to the
		player such that the player appears at the right starting position.
	*/
	this.player = [ 5, 5 ];

	/* Load the level */
	var l		= firstlevel;
	var level	= this.controller.get('level');
	var x		= 0;
	var y		= 0;

	l.layout.each(function(line)
	{
		x = 0;
		for (var i = 0; i < line.length; i++, x++) {
			var type	= line.charAt(i);
			var div		= document.createElement('div');

			if (l[type]) {
				/* Let the level setup the div */
				l[type](div);
			}

			div.style.position	= 'absolute';
			div.style.left		= (x * 64) + 'px';
			div.style.top		= (y * 64) + 'px';

			level.appendChild(div);
		}
		y++;
	});

	/* Start animations */
	this.body	= this.controller.get('body');
	this.frame	= 0;

	this.activate();
	this.screenSizeChanged();
},

/* Called on a timer interval to render the new frame */
render: function()
{
	Element.removeClassName(this.body, 'frame' + this.frame++ % 20);
	Element.addClassName(	this.body, 'frame' + this.frame   % 20);
},

activate: function()
{
	this.foreground();
},

deactivate: function()
{
},

foreground: function()
{
	if (!this.interval) {
		this.interval = window.setInterval(this.render.bind(this), 50);
	}
},

background: function()
{
	var		i;

	if ((i = this.interval)) {
		this.interval = null;
		window.clearInterval(i);
	}
},

cleanup: function()
{
	this.controller.stopListening(document, 'keyup',
		this.keyUp.bindAsEventListener(this), true);
	this.controller.stopListening(document, 'keydown',
		this.keyDown.bindAsEventListener(this), true);
	this.controller.stopListening(document, Mojo.Event.stageDeactivate,
		this.background.bindAsEventListener(this), true);
	this.controller.stopListening(document, Mojo.Event.stageActivate,
		this.foreground.bindAsEventListener(this), true);
	this.controller.stopListening(document, 'resize',
		this.screenSizeChanged.bind(this));
},

screenSizeChanged: function()
{
	if (!this.controller) {
		/*
			When the scene has been popped this will be called but
			this.controller will be null.  Ignore it.
		*/
		return;
	}

	var h		= parseInt(this.controller.window.innerHeight);
	var w		= parseInt(this.controller.window.innerWidth);
	var x		= Math.floor(w / 2);
	var y		= Math.floor(h / 2);
	var level	= this.controller.get('level');
	var player	= this.controller.get('player');

	player.style.left	= x + 'px';
	player.style.top	= y + 'px';

	/* Position the level based on the player's position */
	level.style.left	= ((x - 32) - (this.player[0] * 64)) + 'px';
	level.style.top		= ((y - 32) - (this.player[1] * 64)) + 'px';
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
			case Mojo.Event.back:
				cmd = 'undo';
				break;

			case Mojo.Event.command:
				cmd = event.command;
				break;

			default:
				return;
		}
	}

	switch (cmd) {
		case 'undo':
			break;

		case Mojo.Menu.prefsCmd:
			this.controller.stageController.pushScene('prefs');
			break;

		case 'about':
			this.controller.stageController.pushScene('about');
			break;

		case Mojo.Menu.helpCmd:
			this.controller.stageController.pushScene('help');
			break;

		default:
			/* Let the event through */
			return;
	}

	if (typeof event != 'string') {
		event.stop();
	}
},

keyUp: function(event)
{
},

keyDown: function(event)
{
}

});

