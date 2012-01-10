================================================================================
 WeightLog - A weight tracking tool for webOS
================================================================================

Author: 	Micah N Gorrell
Twitter:	@_minego
Email: 		weightlog@minego.net
Web:		http://minego.net

================================================================================
 WeightLog license:
================================================================================

You may do whatever you want with this source code with the following conditions:
 1.	You may not use reproductions, distributions, modifications, or any part of
	this source code or included images, graphics, or other media for commercial
	purposes

 2.	You may not use the "WeightLog" name or marks, or Micah N Gorrell, or minego
	in a manner that implies endorsement or "official" involvement.

 3.	You must retain this license notice.

Email license@minego.net if you need an exception made to the license.

Copyright 2010 - 2011 Micah N Gorrell



================================================================================
 Usage
================================================================================

	The webOS SDK must be installed to build this application. The build system
	depends on gnu make and a handful of unix tools. It has been tested on
	ubuntu and should work with cygwin.


	Select a build type by running one of the following:
		make release
		make debug
		make beta

	Create an ipk by running:
		make clean all

	Install the ipk on a device or the emulator by running:
		make install

	Launch the ipk on a device or the emulator by running:
		make launch

	Watch the log on a device or the emulator by running:
		make log


