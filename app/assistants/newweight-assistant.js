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

var NewWeightDialog = Class.create({

initialize: function(scene, prefs, selected)
{
	this.controller	= scene.controller;
	this.p			= prefs;
	this.selected	= selected;

	if (0 == this.selected) {
		this.selected = NaN;
	}
},

setup: function(widget)
{
	this.widget	= widget;

	this.weight = "";

	if (!isNaN(this.selected) && !isNaN(weights.w(this.selected))) {
		this.weight += weights.w(this.selected);
	}

	this.controller.setupWidget('weight', {
		modelProperty:		'weight',
		autoFocus:			true,
		modifierState:		Mojo.Widget.numLock,
		maxLength:			5,
		changeOnKeyPress:	false,
		label:				$L('Enter New Weight'),
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

	// TODO Disable the save button if the user hasn't entered a valid weight..

	this.controller.setupWidget('save', {
		type:			Mojo.Widget.activityButton,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Save')
	}, this);

	this.controller.setupWidget('close', {
		type:			Mojo.Widget.button,
		buttonClass:	'primary'
	}, {
		buttonLabel:	$L('Cancel')
	}, this);

	this.controller.listen(this.controller.get('save'), Mojo.Event.tap,
		this.save.bindAsEventListener(this));
	this.controller.listen(this.controller.get('close'), Mojo.Event.tap,
		this.close.bindAsEventListener(this));
},

cleanup: function()
{
	this.controller.stopListening(this.controller.get('save'), Mojo.Event.tap,
		this.save.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('close'), Mojo.Event.tap,
		this.close.bindAsEventListener(this));
},

save: function()
{
	this.controller.get('save').mojo.activate();

	if (isNaN(this.selected)) {
		weights.add(parseInt(this.weight));
	} else {
		weights.set(this.selected, parseInt(this.weight));
	}

	weights.sync(function(worked) {
		Mojo.log('Sync worked');

		this.controller.get('save').mojo.deactivate();

		if (worked) {
			this.widget.mojo.close();
		} else {
			this.controller.get('message').innerHTML = $L("Could not save new weight");
		}
	}.bind(this));
},

close: function() {
	this.widget.mojo.close();
},

NhandleCommand: function(event)
{
	event.stop();

	this.widget.mojo.close();
}

});

