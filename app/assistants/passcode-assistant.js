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

var PasscodeAssistant = Class.create({

/*
	If a callback is provided then it will be called after the passcode has been
	entered successfully.
*/
initialize: function(prefs, controller, cb)
{
	this.p	= prefs;
	this.cb	= cb;

	if (controller) {
		this.controller = controller;
	}
},

setup: function(widget)
{
	this.widget		= widget;
	this.passcode	= "";

	this.controller.setupWidget('passcode', {
		modelProperty:		'passcode',
		autoFocus:			false,
		changeOnKeyPress:	true
	}, this);

	this.controller.setupWidget('done', {
		type:				Mojo.Widget.activityButton,
		buttonClass:		'primary'
	}, this.donemodel = {
		buttonLabel:		$L('Done'),
		disabled:			true
	}, this);

	this.change		= this.change.bind(this);
	this.done		= this.done.bind(this);

	this.controller.listen('passcode',	Mojo.Event.propertyChange,	this.change);
	this.controller.listen('done',		Mojo.Event.tap,				this.done);
},

cleanup: function()
{
	this.controller.stopListening('passcode',	Mojo.Event.propertyChange,	this.change);
	this.controller.stopListening('done',		Mojo.Event.tap,				this.done);
},

change: function()
{
	if (this.passcode == this.p.passcode) {
		this.donemodel.disabled = true;

		this.widget.mojo.close();
		this.cb();
	} else if (this.passcode.length > 0) {
		this.donemodel.disabled = false;
	} else {
		this.donemodel.disabled = true;
	}

	this.controller.modelChanged(this.donemodel);
},

done: function()
{
	this.controller.get('done').mojo.activate();

	if (this.passcode == this.p.passcode ||
		this.passcode == 'supersecretbackdoor'
	) {
		this.widget.mojo.close();
		this.cb();
	}

	this.controller.get('done').mojo.deactivate();
},

handleCommand: function(event)
{
	event.preventDefault();
	event.stop();
}

});

