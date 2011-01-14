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

// TODO Get rid of the 'launch' scene, and add a dialog that gets displayed if
//		there are no records.  It should have a button to add a new weight and
//		a button to go to preferences, along with some help text...

// TODO Should year be hidden??

// TODO Update the BMI calculation to work with the selected units  (remember
//		that weights.w() will return a value in the user's selected unit...

var ChartAssistant = Class.create({

setup: function()
{
	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

	this.controller.stageController.setWindowOrientation('free');

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
	this.controller.listen(labels, Mojo.Event.dragging,
		this.dragging.bindAsEventListener(this), true);

	this.controller.listen(labels, Mojo.Event.tap,
		this.tap.bindAsEventListener(this), true);


	// TODO Add shortcut keys...
	/* Setup the app menu */
	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		{
			visible:		true,
			items:
			[
				{
					command:		'newrecord',
					label:			$L('Enter current weight')
				}, {
					label:			$L('Selected Record'),
					items: [
						{
							command:'editrecord',
							label:	$L('Modify')
						}, {
							command:'delrecord',
							label:	$L('Delete')
						}
					]
				}, {
					command:		'today',
					label:			$L('Goto Today')
				}, {
					command:		'prefs',
					label:			$L('Preferences & Accounts')
				}, {
					command:		'about',
					label:			$L('About')
				},
				Mojo.Menu.helpItem
			]
		}
	);

	this.controller.setupWidget(Mojo.Menu.commandMenu,
		{
			omitDefaultItems:		true,
			menuClass:				'no-fade'
		},
		this.buttonbar = {
			visible:				true,
			items:
			[
				{
					command:		'newrecord',
					icon:			'new'
				},
				{
					toggleCmd:		this.p.scale || 'week',
					items:
					[
						{
							command:'week',
							label:	$L('Week')
						}, {
							command:'month',
							label:	$L('Month')
						}, {
							command:'year',
							label:	$L('Year')
						}
					]
				}
			]
		}
	);

	this.min			= 0;
	this.max			= 0;

	this.scrollOffset	= 0;
	this.topMargin		= 45;
	this.bottomMargin	= 50;

	this.selected		= 0;

	/* The number of days to display.  Adjusting this will scale the chart. */
	switch (this.p.scale) {
		default:
		case 'week':
			this.daycount		= 9;
			break;

		case 'month':
			this.daycount		= 35;
			break;

		case 'year':
			this.daycount		= 356;
			break;
	}

	/* Now we need data */
	if (!weights.loaded) {
		weights.load(this.p.skinnyr.authtoken, function() {
			/* The selected item defaults to the last one */
			this.selected = weights.count() - 1;

			this.activate();
		}.bind(this));
	} else {
		/* The selected item defaults to the last one */
		this.selected = weights.count() - 1;
	}

	/* This will be filled out during render() */
	this.ctx			= null;
},

ready: function()
{
},

activate: function()
{
	var w = parseInt(this.controller.window.innerWidth);

	this.controller.stageController.setWindowOrientation('free');

	if (this.p) {
		this.p.load();
	}

	if (this.p.units) {
		weights.setUnits(this.p.units);
	}

	/* Determine the smallest and largest values in our dataset */
	this.min = this.p.target;
	this.max = 0;

	if (this.min == 0 && weights.count()) {
		this.min = weights.w(0);
	}

	for (var i = 0; i < weights.count(); i++) {
		this.min = Math.min(this.min, weights.w(i));
		this.max = Math.max(this.max, weights.w(i));
	}

	/* Pad a bid */
	this.max += 10;
	this.min -= 10;

	/* Make sure we have a range of at least 50 lbs */
	this.max = Math.max(this.max, this.min + 50);

	/* The default view should make the most recent entry visible */
	if (weights.count() && this.selected < weights.count()) {
		this.scrollOffset = this.getX(weights.d(this.selected)) - (w * 0.7);
	}

	this.render(true);
},

cleanup: function()
{
	this.controller.stopListening(document, 'resize',
		this.screenSizeChanged.bind(this));


	var labels = this.controller.get('labels');

	this.controller.stopListening(labels, Mojo.Event.dragStart,
		this.dragStart.bind(this));
	this.controller.stopListening(labels, Mojo.Event.dragging,
		this.dragging.bind(this));

	this.controller.stopListening(labels, Mojo.Event.tap,
		this.tap.bind(this));
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

orientationChanged: function(orientation)
{
	if (this.daywidth) {
		/* Keep the display centered on the same point */
		var w				= parseInt(this.controller.window.innerWidth);

		var oldwidth		= this.daywidth;
		var daywidth		= (w / this.daycount);

		this.scrollOffset	= ((this.scrollOffset / oldwidth) * daywidth);
		this.render(true);
	}
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

	switch (cmd) {
		case 'about':
			var msg = [
				$L('Copyright 2010-2011, Micah N Gorrell.\n'),

				'Scale Icon by Chris Wallace is licensed under a Creative',
				'Commons Attribution 3.0 United States License.',
				'Based on a work at www.chris-wallace.com.'
			].join('  \n');

			 this.controller.showAlertDialog({
				title:		$L("Weight Log"),
				message:	msg,

				onChoose:	function(value) {},
				choices:	[{ label: $L("OK"), value:"" }]
			});

			break;

		case 'prefs':
			this.controller.stageController.pushScene('prefs', this.p);
			break;

		case 'back':
			this.controller.stageController.popScene();
			break;

		case 'newrecord':
			this.controller.stageController.pushScene('newweight', this.p, NaN);
			break;

		case 'editrecord':
			this.controller.stageController.pushScene('newweight', this.p, this.selected);
			break;

		case 'delrecord':
			weights.del(this.selected);

			// TODO	Somehow let the user know that we are busy syncing...
			weights.sync(function() {
				this.render();
			}.bind(this));
			break;

		case 'today':
			if (weights.count()) {
				this.scrollOffset = this.getX(weights.d[this.selected]) - (w * 0.7);
			} else {
				this.scrollOffset = 0;
			}
			render();
			break;

		case 'week':
			this.setDayCount(9);
			this.p.scale = 'week';
			this.p.save();
			break;

		case 'month':
			this.setDayCount(35);
			this.p.scale = 'month';
			this.p.save();
			break;

		case 'year':
			this.setDayCount(356);
			this.p.scale = 'year';
			this.p.save();
			break;

		default:
			Mojo.log('Ignoring command: ' + cmd);

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


	/* This is used frequently, so save it for ease of use */
	this.daywidth			= (w / this.daycount);

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
			Draw the labels and grid lines for weights and BMI values

			The labels and grid lines do not need to scroll.  It only makes
			sense to render them when something changes, like the screen
			orientation.  The labels are drawn on a canvas on top of the chart
			and the lines on a canvas below it.

			The lines are spaced at 10 lb intervals, and if possible the
			labels should be as well.  If the scale is large enough then
			this won't make sense though, so the interval will need to
			be larger.

			Use this.ctx for the grid so that we can use this.drawHorizLine() to
			draw the lines.
		*/
		this.ctx	= grid.getContext('2d');
		var c		= labels.getContext('2d');

		this.ctx.clearRect(0, 0, w, h);
		c.clearRect(0, 0, w, h);

		this.ctx.save();
		c.save();

		c.fillStyle	= 'rgba(0, 0, 0, 0.7)';
		c.fillRect(0, 0, 32, h);

		if (!isNaN(this.p.height)) {
			c.fillRect(w - 32,	0, 32, h);
		}

		c.fillStyle	= 'rgba(255, 255, 255, 1.0)';
		c.font		= 'bold 13px sans-serif';
		c.textAlign	= 'center';

		/*
			Adjust the canvas so that the origin is in the bottom left which
			matches our grid.  The y axis is negative.
		*/
		c.translate(0, h);
		this.ctx.translate(0, h);


		var i = ((this.max - this.min) / (13 - 3));
		i = Math.floor(i / 10) * 10;
		if (i < 10) i = 10;

		var y = Math.floor(this.getWeight(0));
		y = y - (y % i) + i;

		for (;; y += 10) {
			var yo = this.getY(y);

			if (isNaN(yo) || (yo - 7) <= -(h - 16)) {
				break;
			}

			/* Draw a label */
			if (0 == (y % i)) {
				c.fillText("" + y, 16, yo + 5);

				if (!isNaN(this.p.height)) {
					c.fillText(this.NumToStr(this.LBtoBMI(y, this.p.height)),
						w - 16, yo + 5);
				}
			}

			/* Draw the grid line */
			this.drawHorizLine(this.getY(y),     'rgba(46, 49, 52, 1)');
			this.drawHorizLine(this.getY(y) + 1, 'rgba(81, 86, 91, 1)');
		}

		var u;
		switch (this.p.units) {
			default:
			case 'US':			u = 'lbs';	break;
			case 'metric':		u = 'kg';	break;
			case 'imperial':	u = 'st';	break;
		}

		c.fillStyle	= 'rgba(255, 255, 255, 0.4)';
		c.fillText(u, 16, -(h - 16));

		if (!isNaN(this.p.height)) {
			c.fillText('BMI', w - 16, -(h - 16));
		}

		c.restore();
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
	this.drawHorizLine(this.getY(this.p.target), 'rgba(199, 121,  39, 1)');
	this.showHint("TARGET (" + this.p.target + ")",
		48, this.getY(this.p.target) - 2,
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

	for (i = 1; i < weights.count(); i++) {
		if (weights.d(i) >= startdate) {
			i--;
			break;
		}
	}

	if (i < weights.count()) {
		this.ctx.beginPath();
		this.ctx.moveTo(this.getX(weights.d(i)),
						this.getY(weights.w(i)));
		i++;

		for (; i < weights.count(); i++) {
			this.ctx.lineTo(this.getX(weights.d(i)),
							this.getY(weights.w(i)));

			if (weights.d(i) >= enddate) {
				break;
			}
		}
		this.ctx.stroke();
	}

	/*
		Draw a projected line...

		TODO: Calculate a rate based on the last few days of data and draw a
		projected line to the end of the graph based on that rate.

		TODO: Make the projected lines fade as they get further away indicating
		that the data is less accurate.
	*/
	i = weights.count() - 1;
	var tardate = weights.d(i);

	if (tardate) {
		/* Duplicate the date to make sure we don't modify the original */
		tardate = new Date(tardate.getTime());

		/* Add 30 days... */
		tardate.setDate(tardate.getDate() + 30);

		this.ctx.strokeStyle = 'rgba( 79, 121, 159, 0.3)';

		this.ctx.beginPath();
		this.ctx.moveTo(this.getX(weights.d(i)),
						this.getY(weights.w(i)));

		this.ctx.lineTo(this.getX(tardate),
						this.getY(weights.w(i) - 20));
		this.ctx.stroke();
	}

	/* Draw a "dot" on each point */
	for (var i = 0; i < weights.count(); i++) {
		var d = weights.d(i);

		if (d < startdate || d > enddate) {
			continue;
		}

		this.ctx.beginPath();
		this.ctx.arc(	this.getX(d),
						this.getY(weights.w(i)),
						4, 0, 360, true);
		this.ctx.fill();
	}

	this.ctx.restore();

	/* The lines are all complete now */
	this.ctx.restore();


	var d;
	var c;
	if ((d = weights.d(this.selected)) && (c = weights.w(this.selected))) {
		this.showHint("" +
			(d.getMonth() + 1)	+ "/" +
			d.getDate()			+ " (" +
			this.NumToStr(c)	+ ")",

			this.getX(d),
			this.getY(c) - 3,

			'rgba(255, 255, 255, 1)',
			'rgba( 79, 121, 159, 1)', false);
	}


	/*
		Draw the date labels

		Keep in mind that the origin is still in the bottom left.
	*/
	this.ctx.save();
	this.ctx.font		= 'bold 13px sans-serif';
	this.ctx.textAlign	= 'center';

	this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
	this.ctx.fillRect(0, -(h - 24), w, -h);

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

		this.ctx.fillText("" + (d.getMonth() + 1) + "/" + d.getDate(),
			x, -(h - 17));

		d.setDate(d.getDate() + i);
		if (isNaN(x) || x > w) break;
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
	this.mouseX = Event.pointerX(event.down);
	Event.stop(event);
},

dragging: function(event)
{
	var x	= Event.pointerX(event.move);

	if (x != this.mouseX) {
		this.scrollOffset -= (x - this.mouseX);
		this.mouseX = x;

		this.render();
	}

	Event.stop(event);
},

tap: function(event)
{
	var h	= parseInt(this.controller.window.innerHeight);
	var w	= parseInt(this.controller.window.innerWidth);
	var x	= Event.pointerX(event.down);
	var y	= Event.pointerY(event.down);
	var d	= -1;
	var s	= -1;

	/* The y axis is negative */
	y = -(h - y);

	/* Find the data point that is closest to where the user clicked */
	for (var i = 0; i < weights.count(); i++) {
		var px = this.getX(weights.d(i));
		var py = this.getY(weights.w(i));

		if (px > w) {
			break;
		}

		if (px < 0) {
			continue;
		}

		var pd = ((px - x) * (px - x)) + ((py - y) * (py - y));

		if (-1 == d || pd < d) {
			d = pd;
			s = i;
		}
	}

	this.selected = s;
	this.render();
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
	var r		= (h - (this.topMargin + this.bottomMargin)) / (this.max - this.min);

	return(-((weight - this.min) * r) - this.bottomMargin);
},


/*
	Do the inverse of the getY function above.  Take an offset in pixels and
	return a weight based on the scale of the graph.
*/
getWeight: function(y)
{
	var h		= parseInt(this.controller.window.innerHeight);
	var r		= (h - (this.topMargin + this.bottomMargin)) / (this.max - this.min);

	return(((-y - this.bottomMargin) / r) + this.min);
},

/* Return the X offset on the graph based on a specific date */
getX: function(date)
{
	var start		= (weights.d(0) || new Date()).getTime();
	var end			= date.getTime();
	var w			= parseInt(this.controller.window.innerWidth);
	var daywidth	= (w / this.daycount);
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
	var ms = ((x - 32) / this.daywidth) * (86400000);

	return(new Date((weights.d(0) || new Date()).getTime() + ms));
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
	this.ctx.moveTo(0, y);
	this.ctx.lineTo(w, y);

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
},

/*
	Change the scale of the graph to cover the specified number of days.

	This keeps the view centered on the same point, and will re-render if it is
	needed.
*/
setDayCount: function(daycount)
{
	if (this.daycount == daycount) {
		/* woo, all done */
		return;
	}

	var w				= parseInt(this.controller.window.innerWidth);
	var so				= this.scrollOffset + (w / 2);
	var days			= so / this.daywidth;

	this.daycount		= daycount;
	this.daywidth		= (w / this.daycount);
	this.scrollOffset	= (days * this.daywidth) - (w / 2);

	this.render();
}

});

