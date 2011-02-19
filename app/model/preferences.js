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
function Preferences(name) {
	this.name	= name;
	this.hide	= {};

    this.reset();
    this.load();
}

Preferences.get = function(key, defaultValue) {
	var cookie	= new Mojo.Model.Cookie(key);
	var value;

	if (!(value = cookie.get())) {
		cookie.put(defaultValue);
		value = cookie.get();
	}

	return(value);
};

Preferences.set = function(key, value) {
	var cookie = new Mojo.Model.Cookie(key);

	cookie.put(value);
	return(value);
};

Preferences.prototype.load = function()
{
	var prefs = Preferences.get(this.name + '_options', {});

	this.reset();

	if (prefs['height'] != undefined) {
		this.height	= prefs['height'];
	}

	if (prefs['target'] != undefined) {
		this.target	= prefs['target'];
	}

	this.units		= prefs['units']	|| this.units;
	this.scale		= prefs['scale']	|| this.scale;

	this.skinnyr	= prefs['skinnyr']	|| this.skinnyr;
	this.google		= prefs['google']	|| this.google;
};

Preferences.prototype.dump = function()
{
	var dump = {
		'height':			this.height,
		'units':			this.units,
		'scale':			this.scale,
		'target':			this.target,

		'skinnyr': {
			'authtoken':	this.skinnyr.authtoken,
			'user':			this.skinnyr.user
		},

		'google': {
			'user':			this.google.user,
			'wise':			this.google.wise,
			'writely':		this.google.writely
		}
	};

	return(dump);
};

Preferences.prototype.save = function()
{
	Preferences.set(this.name + '_options', this.dump());
};

Preferences.prototype.reset = function()
{
	this.height		= NaN;
	this.target		= NaN;
	this.units		= 'US';
	this.scale		= 'week';

	this.skinnyr	= { };
	this.google		= { };
};

