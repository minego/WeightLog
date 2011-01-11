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
var EnterweightAssistant = Class.create({

initialize: function(prefs, selected)
{
	this.p			= prefs;
	this.selected	= selected;
},

setup: function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });

	if (!this.p) {
		this.p = new Preferences('weightlog');
	}

	this.weight = "";
	if (!isNaN(this.selected) && this.selected < this.p.data.length) {
		this.weight += this.p.data[this.selected].weight;
	}

	this.controller.setupWidget('weight', {
		modelProperty:		'weight',
		autoFocus:			true,
		modifierState:		Mojo.Widget.numLock,
		maxLength:			5,
		changeOnKeyPress:	true,
		hintText:			$L('Enter Weight'),
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

	this.comment = "";
	if (!isNaN(this.selected) && this.selected < this.p.data.length) {
		this.comment = this.p.data[this.selected].comment;
	}
	this.controller.setupWidget('comment', {
		modelProperty:		'comment',
		multiline:			true,
		hintText:			$L('Comment...')
	}, this);

	if (isNaN(this.selected) || this.selected >= this.p.data.length) {
		this.controller.get('delete').style.display = 'none';
		this.savedisabled = false;
	} else {
		this.savedisabled = true;
	}

	this.controller.setupWidget('save', {
		label:				$L('Save'),
		disabledProperty:	'savedisabled'
	}, this);

	this.controller.setupWidget('cancel', {
		label:				$L('Cancel')
	}, {});

	this.controller.setupWidget('delete', {
		label:				$L('Delete')
	}, {});

	this.controller.listen('save',		Mojo.Event.tap, this.save.bind(this));
	this.controller.listen('cancel',	Mojo.Event.tap, this.cancel.bind(this));
	this.controller.listen('delete',	Mojo.Event.tap, this.del.bind(this));

	this.controller.listen('weight',	Mojo.Event.propertyChange, this.change.bind(this));

	if (!isNaN(this.selected) && this.selected < this.p.data.length) {
		this.date = this.p.data[this.selected].date;
	} else {
		this.date = new Date();
	}

	this.controller.setupWidget('date', {
		label:				$L('Date'),
		modelProperty:		'date'
	}, this);
	this.controller.setupWidget('time', {
		label:				$L('Time'),
		modelProperty:		'date'
	}, this);
},

cleanup: function()
{
	this.controller.stopListening('save',	Mojo.Event.tap, this.save.bind(this));
	this.controller.stopListening('cancel',	Mojo.Event.tap, this.cancel.bind(this));
	this.controller.stopListening('delete',	Mojo.Event.tap, this.del.bind(this));

	this.controller.stopListening('weight',	Mojo.Event.propertyChange, this.change.bind(this));
},

change: function()
{
	var v = this.controller.get('weight').mojo.getValue();
	var i = v.indexOf('.');

	if (-1 != i) {
		if ('.' == v.charAt(i + 1)) {
			/* Do not allow multiple decimal points */
			this.controller.get('weight').mojo.setValue(v.substring(0, i + 1));
		} else if (i < v.length) {
			/* Only allow 1 digit after the decimal point */
			this.controller.get('weight').mojo.setValue(v.substring(0, i + 2));
		}
	}

	/* Is it safe to save? */
	v = this.controller.get('weight').mojo.getValue();
	if ((v * 1).toString() == v) {
		this.savedisabled = false;
	} else {
		this.savedisabled = true;
	}

	this.controller.modelChanged(this);
},

save: function()
{
	if (!isNaN(this.selected) && this.selected < this.p.data.length) {
		this.p.data.splice(this.selected, 1);
	}

	for (var i = 0; i < this.p.data.length; i++) {
		if (this.p.data[i].date > this.date) {
			break;
		}
	}

	this.p.data.splice(i, 0, {
		weight:		(this.weight * 1),
		date:		this.date,
		comment:	this.comment
	});
	this.p.save();
	this.controller.stageController.popScene();
},

cancel: function() {
	this.controller.stageController.popScene();
},

del: function() {
	if (!isNaN(this.selected) && this.selected < this.p.data.length) {
		this.p.data.splice(this.selected, 1);
		this.p.save();
	}
	this.controller.stageController.popScene();
},

handleCommand: function(event)
{
	event.stop();
	this.controller.stageController.popScene();
}

});

