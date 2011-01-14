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

// TODO	The target weight needs to be stored in metric and converted on the fly
//		to the correct unit for display...

// TODO	Height needs to be stored in metric and the list needs to be updated
//		based on the unit selected

// TODO If height isn't set don't display the BMI scale

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

	// TODO This needs to work in inches or cm...
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
		disabled:		true,
		label:			$L('Units'),
		modelProperty:	'units',
		choices:		[
			{ label: $L('U.S. (lb and inches)'),		value: 'US'			},
			{ label: $L('Metric (kg and cm)'),			value: 'metric'		},
			{ label: $L('Imperial (stone and inches)'),	value: 'imperial'	}
		]
	}, this.p);

	this.target = "";
	if (this.p.target > 0) {
		this.target += this.p.target;
	}

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

	this.controller.listen('target',	Mojo.Event.propertyChange, this.change.bind(this));
	this.controller.listen('height',	Mojo.Event.propertyChange, this.change.bind(this));
	this.controller.listen('units',		Mojo.Event.propertyChange, this.change.bind(this));

	this.accounts = {
		listTitle:		$L('Accounts'),
		items:			[]
	};

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
	}, this.addmodel = {
		disabled:		false,
		buttonLabel:	$L('Add an Account')
	});
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
	this.controller.stopListening('units',	Mojo.Event.propertyChange, this.change.bind(this));

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

	this.updateAccounts();
},

change: function()
{
	this.p.target = this.target * 1;
	if (isNaN(this.p.target)) {
		this.p.target	= 0;
		this.target		= "";
	}
    this.p.save();

	if (this.p.units) {
		weights.setUnits(this.p.units);
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

	this.controller.modelChanged(this.accounts);
	this.controller.modelChanged(this.addmodel);
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

