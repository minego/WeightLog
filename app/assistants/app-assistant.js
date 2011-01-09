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
function AppAssistant(controller)
{
}

AppAssistant.prototype.handleCommand = function(event)
{
};

AppAssistant.prototype.handleLaunch = function(params)
{
	this.controller.createStageWithCallback('chart',
		function(stageController) {
			stageController.pushScene('chart');
		}
	);
};

/* Taken from: http://davidowens.wordpress.com/2010/09/07/html-5-canvas-and-dashed-lines/ */
CanvasRenderingContext2D.prototype.dashedLineTo = function(fromX, fromY, toX, toY, pattern)
{
	// Our growth rate for our line can be one of the following:
	//   (+,+), (+,-), (-,+), (-,-)
	// Because of this, our algorithm needs to understand if the x-coord and
	// y-coord should be getting smaller or larger and properly cap the values
	// based on (x,y).
	var lt = function (a, b) { return a <= b; };
	var gt = function (a, b) { return a >= b; };
	var capmin = function (a, b) { return Math.min(a, b); };
	var capmax = function (a, b) { return Math.max(a, b); };

	var checkX = { thereYet: gt, cap: capmin };
	var checkY = { thereYet: gt, cap: capmin };

	if (fromY - toY > 0) {
		checkY.thereYet = lt;
		checkY.cap = capmax;
	}

	if (fromX - toX > 0) {
		checkX.thereYet = lt;
		checkX.cap = capmax;
	}

	this.moveTo(fromX, fromY);
	var offsetX = fromX;
	var offsetY = fromY;
	var idx = 0, dash = true;
	while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY))) {
		var ang = Math.atan2(toY - fromY, toX - fromX);
		var len = pattern[idx];

		offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
		offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

		if (dash) this.lineTo(offsetX, offsetY);
		else this.moveTo(offsetX, offsetY);

		idx = (idx + 1) % pattern.length;
		dash = !dash;
	}
};


