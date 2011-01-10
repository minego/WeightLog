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

/*
	TODO: Optimize the display so that stuff that isn't currently visible isn't
		  rendered.  One non-visible datapoint on each side should be to make it
		  look correct.

	TODO: When a data point's dot is tapped on move the "today" tooltip to that
		  point, and display it's date.

	TODO: Make the scrolling support inertia

	TODO: When the user adds a record allow adding a note along with it, and
		  display that when they tap on that record.

	TODO: Allow changing the target weight, and record that in the same way that
		  the user's weight is recorded.  But for each new record save one with
		  the previous value one milisecond before.  This will keep all of it's
		  lines level, but show the user what their targets had been in the
		  past.  (Don't show circles on the target line though...)
*/


var ChartAssistant = Class.create({

setup: function()
{
	/* I'd like consistent events, regardless of the orientation */
	this.controller.useLandscapePageUpDown(false);

	this.controller.listen(document, 'resize',
		this.screenSizeChanged.bind(this));


	/*
		Register for drag events on the 'labels' canvas instead of on the
		'chart' canvas, because it is on top.  The 'chart' is the one that will
		be scrolled though.
	*/
	var labels	= this.controller.get('labels');

	this.controller.listen(labels, Mojo.Event.dragStart,
		this.dragStart.bindAsEventListener(this), true);
	this.controller.listen(labels, Mojo.Event.dragEnd,
		this.dragEnd.bindAsEventListener(this), true);
	this.controller.listen(labels, Mojo.Event.dragging,
		this.dragging.bindAsEventListener(this), true);


	// TODO Load the user's saved data and preferences (height and target
	//		weight) from preferences
	this.data			= [];
	this.min			= 0;
	this.max			= 0;

	/* The user's height in inches */
	this.height			= 71;

	/* The user's target weight */
	this.target			= 183;

	this.scrollOffset	= 0;
	this.topMargin		= 24;

	/* The number of days to display.  Adjusting this will scale the chart. */
	this.daycount		= 37;


	// TODO Load real data instead of this fake data
	/* Assign some random data */
	var d = new Date(2011, 4, 27, 0, 0, 0, 0);
	for (var i = 0; i < 356; i++) {
		d.setHours(d.getHours() + 24 + Math.floor(Math.random() * 32));
		this.data[this.data.length] = {
			'weight':	(300 - (i / 4)) + (Math.random() * 3),
			'date':		new Date(d.getTime())
		};
	}

	/* Determine the smallest and largest values in our dataset */
	this.min = this.target;
	this.max = 0;

	for (var i = 0; i < this.data.length; i++) {
		this.min = Math.min(this.min, this.data[i].weight);
		this.max = Math.max(this.max, this.data[i].weight);
	}

	this.max = Math.max(this.max, this.min + 50);
	this.min -= 20;
	this.max += 20;


	/* This will be filled out during render() */
	this.ctx			= null;
},

ready: function()
{
	this.screenSizeChanged();
},

cleanup: function()
{
	this.controller.stopListening(document, 'resize',
		this.screenSizeChanged.bind(this));


	var labels = this.controller.get('labels');

	this.controller.stopListening(labels, Mojo.Event.dragStart,
		this.dragStart.bind(this));
	this.controller.stopListening(labels, Mojo.Event.dragEnd,
		this.dragEnd.bind(this));
	this.controller.stopListening(labels, Mojo.Event.dragging,
		this.dragging.bind(this));
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

	this.render(true);
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


	// TODO: Setup the menu.  Right now none of these events will be called
	// because the default menu is in place
	switch (cmd) {
		case 'undo':
			break;

		case Mojo.Menu.prefsCmd:
			// TODO: Create a prefs page
			this.controller.stageController.pushScene('prefs');
			break;

		case 'about':
			// TODO: Create an about page.  It has to give credit for the icon
			// (see http://www.chris-wallace.com/2009/10/18/monday-freebie-vector-scale-icon/ )
			this.controller.stageController.pushScene('about');
			break;

		case Mojo.Menu.helpCmd:
			// TODO: Create a help page
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

render: function(full)
{
	/* Something has already called render() */
	if (this.ctx) {
		Mojo.log("I'm busy!  Go away!");
		return;
	}

	var h					= parseInt(this.controller.window.innerHeight);
	var w					= parseInt(this.controller.window.innerWidth);
	var chart				= this.controller.get('chart');

	if (full) {
		/* Start by setting up the sizes of each canvas */
		var grid			= this.controller.get('grid');
		var labels			= this.controller.get('labels');

		grid.style.width	= w + 'px'; grid.width	= w;
		grid.style.height	= h + 'px'; grid.height	= h;

		chart.style.width	= w + 'px'; chart.width		= w;
		chart.style.height	= h + 'px'; chart.height	= h;

		labels.style.width	= w + 'px'; labels.width	= w;
		labels.style.height	= h + 'px'; labels.height	= h;


		/*
			Draw the horizontal grid lines

			Since the horizontal lines don't have to scroll they are rendered on
			a canvas below the chart itself.
		*/
		this.ctx = grid.getContext('2d');

		this.ctx.save();

		/*
			Adjust the canvas so that the origin is in the bottom left which
			matches our grid.  The y axis is negative.
		*/
		this.ctx.translate(0, h);

		/* Draw grid lines */
		for (var y = (this.min - (this.min % 10)); y <= this.max; y += 10) {
			this.drawHorizLine(this.getY(y),     'rgba(46, 49, 52, 1)');
			this.drawHorizLine(this.getY(y) + 1, 'rgba(81, 86, 91, 1)');
		}
		this.ctx.restore();


		/*
			Draw the labels for weights and BMI values

			The labels only need to be updated if something major changes, such
			as the screen size changing.  The labels are drawn on their own
			canvas that sits on top of the chart canvas.

			The lines are spaced at 10 lb intervals, and if possible the
			labels should be as well.  If the scale is large enough then
			this won't make sense though, so the interval will need to
			be larger.

			The font is 13px, so increase the interval until the labels
			do not overlap.
		*/

		this.ctx = labels.getContext('2d');

		this.ctx.save();

		this.ctx.fillStyle	= 'rgba(0, 0, 0, 0.7)';
		this.ctx.fillRect(0,		0, 32, h);
		this.ctx.fillRect(w - 32,	0, 32, h);

		this.ctx.fillStyle	= 'rgba(255, 255, 255, 1.0)';
		this.ctx.font		= 'bold 13px sans-serif';
		this.ctx.textAlign	= 'center';

		/*
			Adjust the canvas so that the origin is in the bottom left which
			matches our grid.  The y axis is negative.
		*/
		this.ctx.translate(0, h);


		var i = ((this.max - this.min) / (13 - 3));
		i = i - (i % 10);

		for (var y = (this.min - (this.min % i)); y < this.max; y += i) {
			this.ctx.fillText("" + y, 16, this.getY(y) + 5);
			this.ctx.fillText(this.NumToStr(this.LBtoBMI(y, this.height)),
				w - 16, this.getY(y) + 5);
		}

		this.ctx.fillStyle	= 'rgba(255, 255, 255, 0.4)';
		this.ctx.fillText("LBs", 16,     -(h - 16));
		this.ctx.fillText("BMI", w - 16, -(h - 16));

		this.ctx.restore();
	}

	this.ctx = chart.getContext('2d');

	this.ctx.clearRect(0, 0, w, h);


	/*
		Adjust the canvas so that the origin is in the bottom left which matches
		our grid.  The y axis is negative.
	*/
	this.ctx.save();
	this.ctx.translate(0, h);



	/* Setup some styles before drawing the data points and line */
	this.ctx.save();

	this.ctx.lineWidth		= 2;
	this.ctx.lineCap		= 'round';
	this.ctx.lineJoin		= 'round';
	this.ctx.shadowOffsetX	= 2;
	this.ctx.shadowOffsetY	= 2;
	this.ctx.shadowColor	= 'rgba(0, 0, 0, 1)';


	/* Draw the "Target" line */
	this.drawHorizLine(this.getY(this.target), 'rgba(199, 121,  39, 1)');
	this.showHint("TARGET (" + this.target + ")",
		48, this.getY(this.target) - 2,
		'rgba(255, 255, 255, 1)',
		'rgba(199, 121,  39, 1)');

	/*
		Draw the "Weight" line.  This is the main line based on all the values
		the user has previously entered.
	*/
	this.ctx.save();

	this.ctx.strokeStyle	= 'rgba( 79, 121, 159, 1)';
	this.ctx.fillStyle		= 'rgba( 79, 121, 159, 1)';

	var startdate	= this.getDate(this.scrollOffset);
	var enddate		= this.getDate(this.scrollOffset + w);
	var i;

	for (i = 1; i < this.data.length; i++) {
		if (this.data[i].date >= startdate) {
			i--;
			break;
		}
	}

	this.ctx.beginPath();
	this.ctx.moveTo(0, this.getY(this.data[i].weight));

	for (; i < this.data.length; i++) {
		this.ctx.lineTo(this.getX(this.data[i].date), this.getY(this.data[i].weight));

		if (this.data[i].date >= enddate) {
			break;
		}
	}
	this.ctx.stroke();

	/*
		Draw a projected line...

		TODO: Calculate a rate based on the last few days of data and draw a
		projected line to the end of the graph based on that rate.

		TODO: Draw a projected line for the past as well based on the rate of
		the first few records.

		TODO: Make the projected lines fade as they get further away indicating
		that the data is less accurate.


		TODO: Maybe a dotted line isn't the best approach... it seems to be
		VERY slow on the device.  Maybe a dimmer line would work better??
	*/
	if (this.data[this.data.length - 1].date <= enddate) {
		var tardate = new Date(this.data[this.data.length - 1].date.getTime());

		/* Add 30 days... */
		tardate.setDate(tardate.getDate() + 30);
		this.ctx.dashedLineTo(
			this.getX(this.data[this.data.length - 1].date),
			this.getY(this.data[i - 1].weight),

			this.getX(tardate), this.getY(this.data[i - 1].weight - 20),
			[2, 7]);

		this.ctx.stroke();
	}

	/* Draw a "dot" on each point */
	for (var i = 0; i < this.data.length; i++) {
		if (this.data[i].date < startdate ||
			this.data[i].date > enddate
		) {
			continue;
		}

		this.ctx.beginPath();
		this.ctx.arc(	this.getX(this.data[i].date),
						this.getY(this.data[i].weight),
						4, 0, 360, true);
		this.ctx.fill();
	}

	this.ctx.restore();

	/* The lines are all complete now */
	this.ctx.restore();


	// TODO This should continue to default to the most recent point, but we
	//		should allow the user to select any point by tapping on it.

	// TODO This label should only be today if the selected point is in fact
	//		today.  For any other day show the month/day.
	this.showHint("TODAY (" + this.NumToStr(this.data[i - 1].weight) + ")",
		this.getX(this.data[i - 1].date),
		this.getY(this.data[i - 1].weight) - 3,

		'rgba(255, 255, 255, 1)',
		'rgba( 79, 121, 159, 1)', false);


	/*
		Draw the vertical scales (on top of everything else)

		Keep in mind that the origin is still in the bottom left.
	*/
	this.ctx.save();
	this.ctx.font		= 'bold 13px sans-serif';
	this.ctx.textAlign	= 'center';

	this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
	this.ctx.fillRect(0, -(h - this.topMargin), w, -h);

	/*
		Draw data labels for all visible days

		Determine a sane increment for day labels.  Give each label about 32
		pixels.  This isn't perfect, but seems to work well.
	*/
	var i = 1 + Math.floor(this.daycount / (w / 32));
	var d = this.getDate(this.scrollOffset);

	d.setSeconds(0);
	d.setMinutes(0);
	d.setHours(0);

	/*
		The starting point changes if the increment isn't 1, which looks very
		weird.  So, correct for it using 1970 as a fixed point.
	*/
	d.setDate(d.getDate() - ((d.getTime() / 86400000) % i));

	this.ctx.fillStyle	= 'black';
	for (;;) {
		var x = this.getX(d);

		this.ctx.fillText("" + d.getMonth() + "/" + d.getDate(),
			x, -(h - 17));

		d.setDate(d.getDate() + i);
		if (x > w) break;
	}

	this.ctx.restore();

	/* Restore the original origin */
	this.ctx.restore();

	/* this.ctx is only valid while rendering */
	this.ctx		= null;
},


/*
	speed.x = (float) (mass * acceleration.x * elapsed + speed.x);
	speed.y = (float) (mass * acceleration.y * elapsed + speed.y);


	position.x += mass * acceleration.x / 2 * elapsed * elapsed + speed.x * elapsed;
	position.y += mass * acceleration.y / 2 * elapsed * elapsed + speed.y * elapsed;


	speed.x *= friction;
	speed.y *= friction;
*/

dragStart: function(event)
{
	if (this.interiaTimer) {
		window.clearInterval(this.inertiaTimer);
		this.inertiaTimer = null;
	}

	this.mouse = {
		x:		Event.pointerX(event.down),
		time:	new Date().getTime(),
		speed:	0,
		offset:	0
	};

	Event.stop(event);
},

dragEnd: function(event)
{
	var x	= Event.pointerX(event.up);

	if (x != this.mouse.x) {
		var now	= new Date().getTime();

		this.mouse.speed	= (x - this.mouse.x) / (now - this.mouse.time);
	}

	Mojo.log('Final speed: ' + this.mouse.speed);

	this.inertiaTimer = window.setInterval(function()
	{
		var now	= new Date().getTime();

		/* Apply friction */
		this.mouse.speed *= 0.3;

		var diff = (this.mouse.offset * (this.mouse.speed * (now - this.mouse.time)));

Mojo.log('Moved: ' + diff);
		if (diff) {
			this.scrollOffset	-= diff;
			this.render();

			this.mouse.time		= now;
		} else {
			window.clearInterval(this.inertiaTimer);
			this.inertiaTimer	= null;
		}
	}.bind(this), 100);
},

dragging: function(event)
{
	var x	= Event.pointerX(event.move);
	var now	= new Date().getTime();

	this.mouse.speed	= 0;

	if (x != this.mouse.x) {
		/* Save the speed in pixels/ms */
		this.mouse.speed	= (x - this.mouse.x) / (now - this.mouse.time);
		this.mouse.offset	= (x - this.mouse.x);

		this.scrollOffset	-= this.mouse.offset;
		this.mouse.x		= x;

		this.render();
	}

	this.mouse.time = new Date().getTime();

	Event.stop(event);
},


/*
	****************************************************************************
	Helper functions used during rendering
	****************************************************************************
*/

/*
	Return a string version of a number with a single digit after the decimal
	point.  No more, no less.
*/
NumToStr: function(num)
{
	var n	= Math.floor(num * 10) / 10;
	var str	= "" + n;

	if (Math.floor(n) == n) {
		str += ".0";
	}
	return(str);
},

KGtoBMI: function(kgs, meters)
{
	return(kgs / (meters * meters));
},

LBtoBMI: function(lbs, inches)
{
	return((lbs * 703) / (inches * inches));
},


/* Return the Y offset on the graph based on a weight */
getY: function(weight)
{
	var h		= parseInt(this.controller.window.innerHeight);
	var r		= (h - this.topMargin) / (this.max - this.min);

	return(-((weight - this.min) * r));
},

/* Return the X offset on the graph based on a specific date */
getX: function(date)
{
	var w			= parseInt(this.controller.window.innerWidth);
	var daywidth	= (w / this.daycount);
	var start		= this.data[0].date.getTime();
	var end			= date.getTime();

	var days		= (end - start) / (86400000);

	/* Pad the first point by 32 for the weight labels */
	return((32 + (days * daywidth)) - this.scrollOffset);
},

/*
	Do the inverse of the getX function above.  Take an offset and return a
	date object set properly based on the location on the graph.

	The timestamp of the first data point is fixed at 32 pixels.
*/
getDate: function(x)
{
	var w			= parseInt(this.controller.window.innerWidth);
	var daywidth	= (w / this.daycount);
	var ms			= ((x - 32) / daywidth) * (86400000);

	return(new Date(this.data[0].date.getTime() + ms));
},

/*
	Draw a simple horizontal line all the way across the chart at the specified
	height.
*/
drawHorizLine: function(y, style)
{
	if (!this.ctx) return;

	var w			= parseInt(this.controller.window.innerWidth);

	this.ctx.save();
	if (style) {
		this.ctx.strokeStyle = style;
	}
	// this.ctx.lineWidth = 0.0001;

	this.ctx.beginPath();
// TODO: I don't want to do this floor here...
	this.ctx.moveTo(0, Math.floor(y));
	this.ctx.lineTo(w, Math.floor(y));

	this.ctx.stroke();
	this.ctx.restore();
},

showHint: function(text, x, y, fgstyle, bgstyle)
{
	if (!this.ctx) return;

	this.ctx.save();

	this.ctx.fillStyle		= bgstyle;
	this.ctx.textAlign		= 'left';
	this.ctx.shadowOffsetX	= 2;
	this.ctx.shadowOffsetY	= 2;
	this.ctx.shadowColor	= 'rgba(0, 0, 0, 1)';

	var width				= this.ctx.measureText(text).width;

	this.ctx.beginPath();
	this.ctx.moveTo(x, y);
	this.ctx.lineTo(x + 2, y - 5);

	this.ctx.lineTo(x - 5, y - 5);
	this.ctx.lineTo(x - 5, y - 25);
	this.ctx.lineTo(x + width + 5, y - 25);
	this.ctx.lineTo(x + width + 5, y - 5);

	this.ctx.lineTo(x + 15, y - 5);
	this.ctx.closePath();

	this.ctx.fill();

	/* Don't draw a shadow */
	this.ctx.shadowOffsetX	= 0;
	this.ctx.shadowOffsetY	= 0;
	this.ctx.shadowBlur		= 0;

	this.ctx.fillStyle		= fgstyle;
	this.ctx.font			= 'bold 10px sans-serif';

	this.ctx.fillText(text, x - 1, y - 12);

	this.ctx.restore();
}

});

