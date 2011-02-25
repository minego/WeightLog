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

var NewweightAssistant = Class.create({

initialize: function(prefs, selected)
{
	this.p			= prefs;
	this.selected	= selected;
},

setup: function()
{
	this.weight = "";
	if (!isNaN(this.selected) && !isNaN(weights.w(this.selected))) {
		this.weight += weights.w(this.selected);
	} else if (!isNaN(weights.w(weights.count() - 1))) {
		this.weight += weights.w(weights.count() - 1);
	}

	this.controller.setupWidget('weight', {
		modelProperty:		'weight',
		autoFocus:			true,
		modifierState:		Mojo.Widget.numLock,
		maxLength:			5,
		changeOnKeyPress:	true,
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

	this.date = weights.d(this.selected) || new Date();
	this.controller.setupWidget('date', {
		label:				$L('Date'),
		modelProperty:		'date'
	}, this);
	this.controller.setupWidget('time', {
		label:				$L('Time'),
		modelProperty:		'date'
	}, this);


	this.controller.setupWidget('save', {
		type:			Mojo.Widget.activityButton
	}, this.savemodel = {
		buttonLabel:	$L('Save'),
		disabled:		true,
		buttonClass:	'affirmative'
	}, this);
	this.change();

	this.controller.setupWidget('close', {
		type:			Mojo.Widget.button
	}, {
		buttonLabel:	$L('Cancel'),
		buttonClass:	'negative'
	}, this);

	this.save	= this.save.bind(this);
	this.close	= this.close.bind(this);
	this.change = this.change.bind(this);

	this.controller.listen('save',		Mojo.Event.tap,				this.save);
	this.controller.listen('close',		Mojo.Event.tap,				this.close);
	this.controller.listen('weight',	Mojo.Event.propertyChange,	this.change);

	this.minusone		= this.minusone.bind(this);
	this.plusone		= this.plusone.bind(this);
	this.minuspointone	= this.minuspointone.bind(this);
	this.pluspointone	= this.pluspointone.bind(this);

	this.controller.listen('minus1',		'click',				this.minusone);
	this.controller.listen('plus1',			'click',				this.plusone);
	this.controller.listen('minuspoint1',	'click',				this.minuspointone);
	this.controller.listen('pluspoint1',	'click',				this.pluspointone);
},

change: function()
{
	if (this.weight.length == 0 || isNaN(this.weight * 1)) {
		this.savemodel.disabled = true;
	} else {
		this.savemodel.disabled = false;
	}

	this.controller.modelChanged(this.savemodel);
},

cleanup: function()
{
	this.controller.stopListening('save',		Mojo.Event.tap,		this.save);
	this.controller.stopListening('close',		Mojo.Event.tap,		this.close);
	this.controller.stopListening('weight',		Mojo.Event.propertyChange,
																	this.change);

	this.controller.stopListening('minus1',		'click',			this.minusone);
	this.controller.stopListening('plus1',		'click',			this.plusone);
	this.controller.stopListening('minuspoint1','click',			this.minuspointone);
	this.controller.stopListening('pluspoint1',	'click',			this.pluspointone);
},

activate: function()
{
	this.controller.stageController.setWindowOrientation('up');
},

save: function()
{
	this.controller.get('save').mojo.activate();

	if (isNaN(this.selected)) {
		weights.add(				this.weight * 1, this.date);
	} else {
		weights.set(this.selected,	this.weight * 1, this.date);
	}

	weights.authtoken = this.p.skinnyr.authtoken;
	weights.sync(function(worked) {
		Mojo.log('Sync worked');

		this.controller.get('save').mojo.deactivate();

		if (worked) {
			this.controller.stageController.popScene();
		} else {
			if (this.p.skinnyr.authtoken) {
				Mojo.Controller.errorDialog($L('Could not add weight to skinnyr account.'));
			} else {
				Mojo.Controller.errorDialog($L('Could not add weight.'));
			}
		}
	}.bind(this));
},

close: function() {
	this.controller.stageController.popScene();
},

NhandleCommand: function(event)
{
	event.stop();

	this.controller.stageController.popScene();
},

add: function(value)
{
	var		w;

	/*
		You would think that adding or subtracting 0.1 would not be enough to
		cause floating point errors.... but it is...  Multiply by 10 to make the
		math work correctly.
	*/
	if (!isNaN(w = (10 * this.weight))) {
		w += (value * 10);

		this.weight = '' + (w / 10);
		this.controller.modelChanged(this);
	}
},

minusone:		function() {	this.add(-1.0);	},
plusone:		function() {	this.add(+1.0);	},
minuspointone:	function() {	this.add(-0.1);	},
pluspointone:	function() {	this.add(+0.1);	}

});

