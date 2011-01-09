var firstlevel = {
	layout: [
		"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
		"wggggggggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgwwwwwwwwwwwwwwwwwwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wwwwwwwwwwwwwwwwwwgwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggogggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgwwwwwwwwwwwwwwwwwwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggwgggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggwgggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggwgggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggwgggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggggwggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggggwggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggggwggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggggwggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wggwggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgwgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wwggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggw",
		"wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
	],

	o: function(div)
	{
		/* This is orange so I can tell if the turtle started in the right spot */
		if (div) div.style.background	= 'orange';
	},

	g: function(div)
	{
		if (div) div.style.background	= 'green';
	},

	w: function(div)
	{
		if (div) div.style.background	= 'grey';
	}
};
