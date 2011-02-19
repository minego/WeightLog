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
var weights = {

data:		[],
loaded:		false,
loading:	false,
units:		"US",

/*
	Load the locally saved weight records, and all records from the skinnyr
	service (if an authtoken is provided).  The provided callback will be called
	when loading is complete.
*/
load: function(authtoken, cb, keeplocal)
{
	if (weights.loading) {
		Mojo.log('weights.load: Already loading');
		cb(false);
		return;
	}
	weights.loading		= true;

	if (!keeplocal) {
		weights.data		= Preferences.get('weights', []);
		weights.delqueue	= Preferences.get('delqueue', []);
	}

	/*
		The date for each weight record is stored as milliseconds from 1970 and
		need to be converted into a javascript Date object.
	*/
	for (var i = 0; i < weights.data.length; i++) {
		weights.data[i][skinnyr.date] = new Date(weights.data[i][skinnyr.date]);
	}

	if (!authtoken) {
		// TODO	What if the user switches skinnyr accounts?  All the old IDs
		//		will be invalid.  Right now it will look to the app as if all
		//		of the records had been deleted on the skinnyr service...
		//		The only way (that I can think of right now) to deal with this
		//		is to keep track of the authtoken with the records and if it
		//		was set and changes then remove all of the IDs from the local
		//		records...

		/*
			An auth token was not provided, so the local records are all that
			we need.
		*/

		weights.data = weights.data.sort(function(a, b) {
			return(a[skinnyr.date].getTime() - b[skinnyr.date].getTime());
		});

		weights.loading	= false;
		weights.loaded	= true;

		cb(true);
		return;
	}
	weights.authtoken = authtoken;

	/*
		If a record exists locally and doesn't have an ID then it has not
		been saved on the skinnr account yet.  Attempt to add each of these
		to skinnyr before loading the records from skinnyr.
	*/

	Mojo.Controller.appController.showBanner({
		messageText:	$L("Syncing Accounts")
	}, null, "skinnyr-sync");

	weights.syncRecords(function(success)
	{
		Mojo.Controller.appController.removeBanner("skinnyr-sync");
		cb(success);
	}.bind(this));
},

/* Save the local records */
save: function(cb)
{
	var dump = [];

	for (var i = 0; i < weights.data.length; i++) {
		var d = {};

		if (weights.data[i].modified) {
			d.modified		= true;
		}

		if (weights.data[i][skinnyr.id]) {
			d[skinnyr.id]	= weights.data[i][skinnyr.id];
		}

		d[skinnyr.weight]	= weights.data[i][skinnyr.weight];
		d[skinnyr.date]		= weights.data[i][skinnyr.date].getTime();

		dump.push(d);
		delete(d);
	}

	Preferences.set('weights',	dump);
	Preferences.set('delqueue',	weights.delqueue || []);
	delete(dump);
},


/* Save any modified values, both locally and on the skinnyr service */
sync: function(cb)
{
	/*
		Reloading the records will force syncing to skinnyr.  Make sure all data
		is up to date before writing the local copy.
	*/
	weights.load(weights.authtoken, function(success)
	{
		this.save();

		cb(success);
	}.bind(this), true);
},

/*
	Specify the units that should be returned for all data.  Options are "US",
	"metric" and "imperial".
*/
setUnits: function(units)
{
	weights.units = units;
},

/*
	Simple helper to return the number of records that are currently loaded.

	NOTE: I'd like to call this length, but then I'd accidentally write
	something like this:
		if (weights.length) {
			...
		}
	That would be bad...
*/
count: function()
{
	return(weights.data.length);
},

/*
	Return the weight of a specific record by offset.  Valid offset values must
	be >=0 && < weights.length.

	The value will be converted to the correct units based on the value passed
	to weights.setUnits().
*/
weight: function(offset) { return(weights.w(offset)); },
w: function(offset, unit)
{
	if (isNaN(offset) || offset < 0 || offset >= weights.data.length) {
		return(NaN);
	}

	var u;
	switch (unit || weights.units) {
		default:
		case 'US':			u = skinnyr.lb;		break;
		case 'metric':		u = skinnyr.kg;		break;
		case 'imperial':	u = skinnyr.stone;	break;
	}

	var w = (u * weights.data[offset][skinnyr.weight]);
	return(Math.round(w * 10) / 10);
},

/*
	Return the date and time of a specific record by offset.  Valid offset
	values must be >= 0 && < weights.length.
*/
date: function(offset) { return(weights.d(offset)); },
d: function(offset)
{
	if (isNaN(offset) || offset < 0 || offset >= weights.data.length) {
		return(NaN);
	}

	return(weights.data[offset][skinnyr.date]);
},

id: function(offset)
{
	if (isNaN(offset) || offset < 0 || offset >= weights.data.length) {
		return(null);
	}

	return(weights.data[offset][skinnyr.id]);
},

/* Returns the new offset on success */
add: function(weight, date)
{
	if (!weight) {
		return(NaN);
	}

	var u;
	switch (weights.units) {
		default:
		case 'US':			u = skinnyr.lb;		break;
		case 'metric':		u = skinnyr.kg;		break;
		case 'imperial':	u = skinnyr.stone;	break;
	}

	if (!date) date = new Date();

	var offset = weights.data.length;

	weights.data[offset] = {};
	weights.data[offset][skinnyr.weight]	= (weight / u);
	weights.data[offset][skinnyr.date]		= date;

	return(offset);
},

/* Returns true on success */
set: function(offset, weight, date)
{
	if (isNaN(offset) || offset < 0 || offset >= weights.data.length) {
		return(false);
	}

	var u;
	switch (weights.units) {
		default:
		case 'US':			u = skinnyr.lb;		break;
		case 'metric':		u = skinnyr.kg;		break;
		case 'imperial':	u = skinnyr.stone;	break;
	}

	if (weight)			weights.data[offset][skinnyr.weight]	= (weight / u);
	if (date)			weights.data[offset][skinnyr.date]		= date;
	if (weight || date)	weights.data[offset].modified			= true;

	return(weights.data[offset].modified);
},

/* Returns true on succes... will modify the offset of other records */
del: function(offset)
{
	if (isNaN(offset) || offset < 0 || offset >= weights.data.length) {
		return(false);
	}

	if (!weights.delqueue) {
		weights.delqueue = [];
	}

	if (weights.data[offset][skinnyr.id]) {
		weights.delqueue.push(weights.data[offset][skinnyr.id]);
	}

	weights.data.splice(offset, 1);
	return(true);
},

/*
	****************************************************************************
	Internal functions
	****************************************************************************
*/
syncRecords: function(cb, start, skipdel)
{
	if (isNaN(start)) {
		start = 0;
	}

	for (var i = start; i < weights.data.length; i++) {
		if (!weights.data[i][skinnyr.id]) {
Mojo.log('sync: Adding record: ' + weights.data[i][skinnyr.weight]);
			skinnyr.add(weights.authtoken,
				weights.data[i][skinnyr.weight], weights.data[i][skinnyr.date],
				function(id) {
					/* Store the new ID and move on to the next record */
					weights.data[i][skinnyr.id] = id;

					weights.syncRecords(cb, i + 1);
				},

				function(err) {
					/*
						Give up on syncing and just go on with loading the
						remote records.
					*/
					weights.syncRecords(cb, weights.data.length);
				}
			);
			return;
		} else if (weights.data[i].modified) {
Mojo.log('sync: Updating record: ' + weights.data[i][skinnyr.weight]);
			skinnyr.set(weights.authtoken, weights.data[i][skinnyr.id],
				weights.data[i][skinnyr.weight], weights.data[i][skinnyr.date],
				function(id) {
					weights.data[i].modified = false;

					weights.syncRecords(cb, i + 1);
				},
				function(err) {
					/*
						Give up on syncing and just go on with loading the
						remote records.
					*/
					weights.syncRecords(cb, weights.data.length);
				}
			);
			return;
		}
	}

	if (!skipdel && weights.delqueue && weights.delqueue.length) {
Mojo.log('delqueue: ' + weights.delqueue.length);
		var id = weights.delqueue.pop();

Mojo.log('sync: Deleting record: ' + id + ', ' + weights.delqueue.length);
		skinnyr.del(weights.authtoken, id,
			function(worked) {
				if (worked) {
					weights.syncRecords(cb, weights.data.length);
				}
			},
			function(err) {
				if (4 == err['faultCode']) {
					/* The record does not exist, treat as success */
					weights.syncRecords(cb, weights.data.length);
				} else {
					/*
						Give up on deleting this record for now, and try it
						again later.  Go on loading the remote records.
					*/
Mojo.log('Putting the record back in the delqueue to try later: ' + Object.toJSON(err));
					weights.delqueue.push(id);
					weights.syncRecords(cb, weights.data.length, true);
				}
			}
		);

		return;
	}

Mojo.log('sync: Loading remote records');
	if (i >= weights.data.length) {
		/* Syncing is complete (or failed).  Load the remote records. */
		skinnyr.list(weights.authtoken,
			function(records) {
				/*
					We have successfully loaded all the records from skinnyr, so
					remove the local copy of each of these records.
				*/
				for (var i = weights.data.length - 1; i >= 0; i--) {
					if (weights.data[i][skinnyr.id]) {
						weights.data.splice(i, 1);
					}
				}

				weights.data = weights.data.concat(records).sort(function(a, b) {
					return(a[skinnyr.date].getTime() - b[skinnyr.date].getTime());
				});

				weights.loading	= false;
				weights.loaded	= true;

				weights.save();
				cb(true);
			},
			function(err) {
				Mojo.log('weights.syncRecords: ' + err);

				weights.loading	= false;
				weights.loaded	= true;
				cb(false);
			}
		);
	}
}

};

