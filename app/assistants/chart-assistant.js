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

// TODO Test the hell out of the skinnyr integration...

var ChartAssistant = Class.create({

setup: function()
{
	var w = parseInt(this.controller.window.innerWidth);
	var h = parseInt(this.controller.window.innerHeight);

	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

	this.controller.stageController.setWindowOrientation('free');

	/* I'd like consistent events, regardless of the orientation */
	this.controller.useLandscapePageUpDown(false);

	this.screenSizeChanged = this.screenSizeChanged.bind(this);
	this.controller.listen(document, 'resize', this.screenSizeChanged);

	/* Setup the app menu */
	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		{
			visible:		true,
			items:
			this.menuItems = [
				{
					command:				'new-record',
					label:					$L('Enter current weight'),
					shortcut:				'e'
				}, {
					label:					$L('Selected Record'),
					command:				'selected-record',
					items: [
						{
							command:		'modify-record',
							label:			$L('Modify'),
							shortcut:		'm',
							checkEnabled:	true
						}, {
							command:		'delete-record',
							label:			$L('Delete'),
							shortcut:		'd',
							checkEnabled:	true
						}
					]
				}, {
					label:					$L('Goto'),
					items: [
						{
							command:		'today',
							label:			$L('Today'),
							shortcut:		't'
						}, {
							command:		'current-record',
							label:			$L('Selected Record'),
							shortcut:		'c',
							checkEnabled:	true
						}, {
							command:		'next-record',
							label:			$L('Next Record'),
							shortcut:		'n',
							checkEnabled:	true
						}, {
							command:		'prev-record',
							label:			$L('Previous Record'),
							shortcut:		'p',
							checkEnabled:	true
						}
					]
				}, {
					command:				'prefs',
					label:					$L('Preferences & Accounts')
				}, {
					command:				'about',
					label:					$L('About')
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
					command:		'new-record',
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

	/*
		A large (but empty) dummy div sits on top of the chart.  This div is
		scrollable using the regular scroller.  When it is scrolled the chart
		is re-rendered() based on the new position, but the chart doesn't
		actually scroll.  This allows for inertia scrolling of the chart.

		Since this div sits on top of everything else all user interaction is
		through it, including taps.

		For now set the size to be very large.  It will be adjusted based on the
		actual data durning render().
	*/
	this.controller.get('dummy').style.width	= '1000000px';
	this.controller.get('dummy').style.height	= h	+ 'px';

	this.controller.setupWidget('scroller', { mode: 'horizontal' }, {});

	this.moving		= this.moving.bindAsEventListener(this);
	this.moved		= this.moved.bindAsEventListener(this);
	this.controller.listen('scroller', Mojo.Event.scrollStarting, this.moving, true);

	this.tap = this.tap.bindAsEventListener(this);
	this.controller.listen('scroller', Mojo.Event.tap, this.tap, true);


	this.min			= 0;
	this.max			= 0;

	this.topMargin		= 45;
	this.bottomMargin	= 50;

	this.selected		= 0;

	/* The number of days to display.  Adjusting this will scale the chart. */
	this.setDayCount(true);

	/* Default to today (Set it to 0 first, because getX uses it) */
	this.scrollX	= 0;
	this.scrollY	= 0;

	/* Now we need data */
	this.loaded = this.loaded.bind(this);

	if (!this.p.passcode && !weights.loaded && !weights.loading) {
		weights.authtoken = this.p.skinnyr.authtoken;
		weights.load(this.loaded);
	} else {
		/* The selected item defaults to the last one */
		this.selected = weights.count() - 1;
	}

	/* This will be filled out during render() */
	this.ctx			= null;
},

loaded: function()
{
	/* The selected item defaults to the last one */
	this.selected = weights.count() - 1;
	this.activate();

	this.scrollTo(weights.d(weights.count() - 1) || new Date());
},

ready: function()
{
	this.scrollTo(new Date());

	if (MinegoApp.expired) {
		this.controller.showDialog({
			template:		'dialogs/expires-dialog',
			assistant:		new ExpiresAssistant(this.controller),
			preventCancel:	MinegoApp.expired()
		});
	}

	if (this.p.passcode) {
		this.controller.showDialog({
			template:		'dialogs/passcode-dialog',
			assistant:		new PasscodeAssistant(this.p, this.controller, function() {
								weights.authtoken = this.p.skinnyr.authtoken;
								weights.load(this.loaded);
							}.bind(this)),
			preventCancel:	true,

			title:			$L('Enter Passcode'),
			actionBtnTitle:	$L('Done')
		});
	}
},

deactivate: function()
{
},

activate: function()
{
	var u;

	switch (this.p.units) {
		default:
		case 'US':			u = skinnyr.lb;		break;
		case 'metric':		u = skinnyr.kg;		break;
		case 'imperial':	u = skinnyr.stone;	break;
	}

	this.controller.stageController.setWindowOrientation('free');

	if (this.p) {
		this.p.load();
	}

	if (this.p.units) {
		weights.setUnits(this.p.units);
	}

	/*
		Convert the target weight to the user's unit of choice (it is stored in
		metric, as is everything else)
	*/
	this.target = 0;
	if (this.p.target) {
		var u;
		switch (this.p.units) {
			default:
			case 'US':			u = skinnyr.lb;		break;
			case 'metric':		u = skinnyr.kg;		break;
			case 'imperial':	u = skinnyr.stone;	break;
		}

		this.target = Math.round(this.p.target * u * 10) / 10;
	}

	/* Determine the smallest and largest values in our dataset */
	this.min = this.target;
	this.max = 0;

	if (this.min == 0 && weights.count()) {
		this.min = weights.w(0);
	}

	for (var i = 0; i < weights.count(); i++) {
		this.min = Math.min(this.min, weights.w(i));
		this.max = Math.max(this.max, weights.w(i));
	}

	/* Pad a bid */
	this.max += (4.5 * u);
	this.min -= (4.5 * u);

	/*
		Make sure we have a range of at least 50 lbs (22.5 kg)
	*/
	this.max = Math.max(this.max, this.min + (22.5 * u));

	this.render(true);
},

cleanup: function()
{
	this.controller.stopListening('scroller',	Mojo.Event.scrollStarting,
																this.moving);
	this.controller.stopListening('scroller',	Mojo.Event.tap,	this.tap);
	this.controller.stopListening(document,		'resize',		this.screenSizeChanged);
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

		this.scrollX		= ((this.scrollX / oldwidth) * daywidth);
		this.scrollY		= 0;
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
				cmd = event.command;

				switch (cmd) {
					case 'selected-record':
					case 'modify-record':
					case 'delete-record':
					case 'current-record':
						if (isNaN(weights.w(this.selected))) {
							event.preventDefault();
						}
						break;

					case 'next-record':
						if (isNaN(weights.w(this.selected + 1))) {
							event.preventDefault();
						}
						break;

					case 'prev-record':
						if (isNaN(weights.w(this.selected - 1))) {
							event.preventDefault();
						}
						break;
				}

				return;

			default:
				return;
		}
	}

	switch (cmd) {
		case 'about':
			this.controller.showDialog({
				template:		'dialogs/about-dialog',
				assistant:		new AboutAssistant(this.controller),
				preventCancel:	false
			});

			break;

		case 'prefs':
			this.controller.stageController.pushScene('prefs', this.p);
			break;

		case 'back':
			this.controller.stageController.popScene();
			break;

		case 'new-record':
			this.controller.stageController.pushScene('newweight', this.p, NaN);
			break;

		case 'modify-record':
			this.controller.stageController.pushScene('newweight', this.p, this.selected);
			break;

		case 'delete-record':
			weights.del(this.selected);

			weights.sync(function() {
				this.render();
			}.bind(this));
			break;

		case 'today':
			this.scrollTo(new Date());
			break;

		case 'next-record':
			this.scrollTo(weights.d(++this.selected));
			break;

		case 'prev-record':
			this.scrollTo(weights.d(--this.selected));
			break;

		case 'current-record':
			this.scrollTo(weights.d(this.selected));
			break;

		case 'week':
		case 'month':
		case 'year':
			this.p.scale = cmd;
			this.p.save();

			this.setDayCount();
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

			Space the lines at the smallest interval that makes sense.

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

		if (!isNaN(this.p.height) && this.p.height > 0) {
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

		var minlabelheight	= 30;
		var y				= this.getY(this.min) + minlabelheight;
		var i				= this.min - this.getWeight(y);

		i = Math.round(i * 2) / 2;
		if (i > 1) {
			i = Math.round(i / 5) * 5;
		}

		y = Math.floor(this.getWeight(0));
		y = y - (y % i) + i;

		for (;; y += i) {
			var yo = this.getY(y);

			if (isNaN(yo) || (yo - 7) <= -(h - 16)) {
				break;
			}

			/* Draw a label */
			if (0 == (y % i)) {
				if (i >= 1) {
					c.fillText("" + y, 16, yo + 5);
				} else {
					c.fillText(this.NumToStr(y), 16, yo + 5);
				}

				if (!isNaN(this.p.height) && this.p.height > 0) {
					c.fillText(this.NumToStr(this.getBMI(y)),
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

		if (!isNaN(this.p.height) && this.p.height > 0) {
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
	if (!isNaN(this.target) && this.target > 0) {
		this.drawHorizLine(this.getY(this.target), 'rgba(199, 121,  39, 1)');
		this.showHint("TARGET (" + this.target + ")",
			48, this.getY(this.target) - 2,
			'rgba(255, 255, 255, 1)',
			'rgba(199, 121,  39, 1)');
	}

	/*
		Draw the "Weight" line.  This is the main line based on all the values
		the user has previously entered.
	*/
	this.ctx.save();

	this.ctx.strokeStyle	= 'rgba( 79, 121, 159, 1)';
	this.ctx.fillStyle		= 'rgba( 79, 121, 159, 1)';

	var startdate	= this.getDate(this.scrollX);
	var enddate		= this.getDate(this.scrollX + w);
	var projection	= true;
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
				/* There is no need to do a projection if we can't see it */
				projection = false;
				break;
			}
		}
		this.ctx.stroke();
	}

	/*
		Draw a simple projection based on 2 data sets.  Take the most recent x
		records, and average them (dates and weights).  Do the same for the next
		most recent x records.  The difference becomes the projected rate.

		At least one record is required for each set, and no more than 5.
	*/
	if (projection && weights.count() >= 2) {
		var samples		= Math.min(5, Math.floor(weights.count() / 2));
		var a			= { w: 0, d: 0, c: 0 };
		var b			= { w: 0, d: 0, c: 0 };

		for (i = weights.count() - 1; i >= 0; i--) {
			if (a.c < samples) {
				a.w += weights.w(i);
				a.d += weights.d(i).getTime();
				a.c++;
			} else if (b.c < samples) {
				b.w += weights.w(i);
				b.d += weights.d(i).getTime();
				b.c++;
			} else {
				break;
			}
		}

		a.w = a.w / a.c;
		a.d = a.d / a.c;

		b.w = b.w / a.c;
		b.d = b.d / a.c;

		this.ctx.strokeStyle = 'rgba( 79, 121, 159, 0.3)';

		var i		= weights.count() - 1;
		var x		= this.getX(weights.d(i));
		var y		= this.getY(weights.w(i));
		var left	= this.getDate(this.scrollX + w).getTime() -
						weights.d(i).getTime();

		this.ctx.beginPath();
		this.ctx.moveTo(x, y);

		/* Scale the projected rate to 'left' milliseconds */
		var diff	= (((b.w - a.w) / (b.d - a.d)) * left);

		this.ctx.lineTo(w, this.getY(weights.w(i) + diff));
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

	/* Draw the label for the selected item */
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
		Make sure that the dummy scrollable area is large enough to contain all
		of our data, and a bit extra for the projection line.
	*/
	var width = this.scrollX;

	if (projection) {
		width += (w * 2);
	}
	width += this.getX(weights.d(weights.count() - 1)) || 0;

	this.controller.get('dummy').style.width	= width + 'px';
	this.controller.get('dummy').style.height	= h	+ 'px';

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
	var d = this.getDate(this.scrollX);

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
		this.scrollX -= (x - this.mouseX);
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

moving: function(event)
{
	event.scroller.addListener(this);
},

moved: function(ending)
{
	this.scrollX = this.controller.get('scroller').scrollLeft;
	this.scrollY = this.controller.get('scroller').scrollTop;

	/*
		At times ScrollTo() ends early... grumble

		If this is the last event, and we aren't where we are supposed to be
		then scroll to the correct spot.  (Maybe this is an issue with the
		emulator?  I dunno... it is annoying though)
	*/
	if (ending && !isNaN(this.desiredX)) {
		var desired = this.desiredX;

		this.desiredX = NaN;
		if (desired != scrollX) {
			setTimeout(function() {
				this.controller.get('scroller').mojo.scrollTo(-desired, 0, true, false);
			}.bind(this), 1);
		}
	} else {
		this.render();
	}
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

getBMI: function(weight)
{
	if (isNaN(this.p.height) || this.p.height == 0) {
		return(NaN);
	}

	/*
		The weight being passed in will always be in the user's prefered unit,
		but this.p.height is always in metric.

		      mass (kg)
		BMI = ---------
		      (height(m))^2
	*/
	var u;
	switch (this.p.units) {
		default:
		case 'US':			u = skinnyr.lb;		break;
		case 'metric':		u = skinnyr.kg;		break;
		case 'imperial':	u = skinnyr.stone;	break;
	}

	var kg	= weight / u;
	var m	= this.p.height / 100;

	return(kg / (m * m));
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
getX: function(date, absolute)
{
	if (!date) {
		return(0);
	}

	var start		= (weights.d(0) || new Date()).getTime();
	var end			= date.getTime();
	var w			= parseInt(this.controller.window.innerWidth);
	var daywidth	= (w / this.daycount);
	var days		= (end - start) / (86400000);

	if (!absolute) {
		/* Pad the first point by 45 for the weight labels */
		return((45 + (days * daywidth)) - this.scrollX);
	} else {
		return((45 + (days * daywidth)));
	}
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
setDayCount: function(quick)
{
	var daycount;
	var changed = false;

	if (!this.oldscale || this.oldscale != this.p.scale) {
		changed = true;
	}

	this.oldscale = this.p.scale;

	switch (this.p.scale) {
		default:
		case 'week':	daycount = 9;	break;
		case 'month':	daycount = 35;	break;
		case 'year':	daycount = 356;	break;
	}

	if (this.daycount == daycount) {
		quick = true;
	}

	var w				= parseInt(this.controller.window.innerWidth);
	var days			= (w / 2) / this.daywidth;

	this.daycount		= daycount;
	this.daywidth		= (w / this.daycount);

	if (!quick) {
		if (changed) {
			this.scrollTo(weights.d(this.selected));
		}

		this.render();
	}
},

scrollTo: function(date)
{
	var w = parseInt(this.controller.window.innerWidth);
	var scroller;

	if (!date) {
		return(false);
	}

	if (isNaN(this.dayCount)) {
		this.setDayCount(true);
	}

	this.desiredX = this.getX(date, true) - (w * 0.7);

	/* The x offset for a mojo scroller needs to be negative...  */
	if ((scroller = this.controller.get('scroller')) && scroller.mojo) {
		scroller.mojo.scrollTo(-this.desiredX, 0, true, false);
	}

	return(true);
}

});

