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

var PrefsAssistant = Class.create({

initialize: function(prefs)
{
	if (prefs) {
		this.p = prefs;
	}
},

setup: function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });

	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

    this.controller.setupWidget('units', {
		disabled:		true,
		label:			$L('Units'),
		modelProperty:	'units',
		choices:		[
			{ label: $L('U.S. (lb and inches)'),		value: 'US'			},
			{ label: $L('Metric (kg and cm)'),			value: 'metric'		},
			{ label: $L('Imperial (stone and inches)'),	value: 'imperial'	}
		]
	}, this.p);

	/* Load the unit specific values */
	this.loadValues();

	this.controller.setupWidget('target', {
		modelProperty:		'target',
		autoFocus:			false,
		modifierState:		Mojo.Widget.numLock,
		maxLength:			5,
		changeOnKeyPress:	false,
		label:				$L('Target Weight'),
		charsAllow:			function(c)
		{
			/* Allow deleteKey for use with the emulator */
			if (c == Mojo.Char.period || c == Mojo.Char.deleteKey) {
				return(true);
			}

			if (c >= Mojo.Char.asciiZero && c <= Mojo.Char.asciiNine) {
				return(true);
			}

			return(false);
		}
	}, this);

	this.controller.setupWidget('height', {
		modelProperty:		'height',
		autoFocus:			false,
		modifierState:		Mojo.Widget.numLock,
		maxLength:			5,
		changeOnKeyPress:	false,
		label:				$L('Height'),
		charsAllow:			function(c)
		{
			/* Allow deleteKey for use with the emulator */
			if (c == Mojo.Char.period || c == Mojo.Char.deleteKey) {
				return(true);
			}

			if (c >= Mojo.Char.asciiZero && c <= Mojo.Char.asciiNine) {
				return(true);
			}

			return(false);
		}
	}, this);



	this.controller.listen('target',	Mojo.Event.propertyChange, this.change.bind(this));
	this.controller.listen('height',	Mojo.Event.propertyChange, this.change.bind(this));

	this.controller.listen('units',		Mojo.Event.propertyChange, this.changeUnits.bind(this));


	this.updateAccounts();

	this.controller.setupWidget('accounts', {
		itemTemplate:	'prefs/account-item',
		listTemplate:	'prefs/account-list'
	}, this.accounts);

	this.controller.listen(this.controller.get('accounts'), Mojo.Event.listTap,
		this.accountTap.bindAsEventListener(this));

	this.controller.setupWidget('sync', {
		type:			Mojo.Widget.activityButton,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Sync Now')
	});
	this.controller.listen(this.controller.get('sync'), Mojo.Event.tap,
		this.sync.bindAsEventListener(this));


	this.controller.setupWidget('add', {
		type:			Mojo.Widget.add,
		buttonClass:	'primary'
	}, this.addmodel);
	this.controller.listen(this.controller.get('add'), Mojo.Event.tap,
		this.add.bindAsEventListener(this));

	this.activate();
},

ready: function()
{
},

cleanup: function()
{
	this.controller.stopListening('target',	Mojo.Event.propertyChange, this.change.bind(this));
	this.controller.stopListening('height',	Mojo.Event.propertyChange, this.change.bind(this));

	this.controller.stopListening('units',	Mojo.Event.propertyChange, this.changeUnits.bind(this));

	this.controller.stopListening(this.controller.get('accounts'), Mojo.Event.listTap,
		this.accountTap.bindAsEventListener(this));

	this.controller.stopListening(this.controller.get('sync'), Mojo.Event.tap,
		this.sync.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('add'), Mojo.Event.tap,
		this.add.bindAsEventListener(this));
},

activate: function()
{
	this.controller.stageController.setWindowOrientation('up');

	if (this.p) {
		this.p.load();
	}

	if (this.p.units) {
		weights.setUnits(this.p.units);
	}

	if (weights.count()) {
		this.lastweight = weights.w(weights.count() - 1);
	} else {
		this.lastweight = 0;
	}
},

change: function()
{
	var v;
	var u;

	/* Save all values in metric */
	if (isNaN((v = (this.target * 1)))) {
		this.target		= "";
		this.p.target	= NaN;
	} else {
		switch (this.p.units) {
			default:
			case 'US':			u = skinnyr.lb;		break;
			case 'metric':		u = skinnyr.kg;		break;
			case 'imperial':	u = skinnyr.stone;	break;
		}

		this.p.target	= (v / u);
	}

	if (isNaN((v = (this.height * 1)))) {
		this.height		= "";
		this.p.height	= NaN;
	} else {
		switch (this.p.units) {
			default:
			case 'US':
			case 'imperial':	u = skinnyr.inch;	break;
			case 'metric':		u = skinnyr.cm;		break;
		}

		this.p.height	= (v / u);
	}

    this.p.save();
},

changeUnits: function()
{
	this.p.save();

	this.loadValues();
	this.controller.modelChanged(this);
},

loadValues: function()
{
	var u;

	/* Load all values in the user's unit of choice */
	this.target		= "";
	this.height		= "";

	weights.setUnits(this.p.units);

	if (!isNaN(this.p.target) && this.p.target > 0) {
		switch (this.p.units) {
			default:
			case 'US':			u = skinnyr.lb;		break;
			case 'metric':		u = skinnyr.kg;		break;
			case 'imperial':	u = skinnyr.stone;	break;
		}

		this.target += (Math.round(this.p.target * u * 10) / 10);

		switch (this.p.units) {
			default:
			case 'US':			u = 'lbs';			break;
			case 'metric':		u = 'kg';			break;
			case 'imperial':	u = 'stone';		break;
		}

		this.controller.get('targetunit').innerHTML = u;
	}

	if (!isNaN(this.p.height) && this.p.height > 0) {
		switch (this.p.units) {
			default:
			case 'US':
			case 'imperial':	u = skinnyr.inch;	break;
			case 'metric':		u = skinnyr.cm;		break;
		}

		this.height += Math.round(this.p.height * u);

		switch (this.p.units) {
			default:
			case 'US':
			case 'imperial':	u = 'inches';		break;
			case 'metric':		u = 'cm';			break;
		}

		this.controller.get('heightunit').innerHTML = u;
	}
},

sync: function()
{
	this.controller.get('sync').mojo.activate();

	weights.sync(function(worked) {
		this.controller.get('sync').mojo.deactivate();

		if (!worked) {
			Mojo.Controller.errorDialog($L('Syncronization Failed'));
		}
	}.bind(this));
},

accountTap: function(event)
{
	var account	= event.item;

	Event.stop(event);

	 this.controller.showAlertDialog({
		title:		account.user,
		message:	$L('Delete Account?'),

		choices:	[
			{ label: $L("Delete"), value:"delete" },
			{ label: $L("Cancel"), value:"" }
		],
		onChoose:	function(value) {
			if (value == "delete") {
				if (account.type == "skinnyr.com") {
					this.p.skinnyr = {};
					this.p.save();
				}
			}

			this.updateAccounts();
		}.bind(this)
	});
},

updateAccounts: function()
{
	var setup;

	if (this.accounts) {
		setup = false;
	} else {
		setup = true;

		this.accounts = {
			listTitle:		$L('Accounts'),
			items:			[]
		};
	}

	if (!this.addmodel) {
		this.addmodel = {
			buttonLabel:	$L('Add an Account')
		};
	}

	this.addmodel.disabled	= false;
	this.accounts.items		= [];

	if (this.p.skinnyr.authtoken) {
		this.accounts.items.push({
			type:		'skinnyr.com',
			user:		this.p.skinnyr.user,
			token:		this.p.skinnyr.authtoken
		});

		this.addmodel.disabled = true;
	}

	if (!setup) {
		this.controller.modelChanged(this.accounts);
		this.controller.modelChanged(this.addmodel);
	}
},

add: function()
{
	this.controller.showDialog({
		assistant:		new LoginAssistant(this.p, this.controller, function() {
							this.updateAccounts();
						}.bind(this)),
		template:		'login/login-scene',

		preventCancel:	false,

		title:			$L('Login'),
		actionBtnTitle:	$L('Login')
	});
}

});

