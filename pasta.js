"use strict";

d3.select("#fileinput").on("change", onChange);

function onChange() {
    if (this.files.length) {
        var reader = new FileReader();
        reader.onload = function(event) {
            var url = event.target.result;
            doVis(url);
        }
        // reading the file triggers the onload event above
        reader.readAsDataURL(this.files[0]);
    }
}

function doVis(url) {
	//remove old svgs
	d3.selectAll("svg").remove();
	
	// format the data and find min/max
	var minX = Number.MAX_SAFE_INTEGER;
	var maxX = Number.MIN_SAFE_INTEGER;
	var minY = Number.MAX_SAFE_INTEGER;
	var maxY = Number.MIN_SAFE_INTEGER;
	function dataTransform(d) {
		var columns = Object.keys(d);
		for (var i = 0; i < columns.length; i++) {
			var colname = columns[i];
			d[colname] = +d[colname];
			if (i === 0) {
				//x
				if (minX > d[colname]) { minX = d[colname]; }
				if (maxX < d[colname]) { maxX = d[colname]; }
			} else {
				//y
				if (minY > d[colname]) { minY = d[colname]; }
				if (maxY < d[colname]) { maxY = d[colname]; }
			}
		}
		return d;
	}
	
    d3.csv(url, dataTransform, function(error, data) {
        if (error) throw error;
        data.minX = minX;
        data.minY = minY;
        data.maxX = maxX;
        data.maxY = maxY;
        spaghetti(data);
        lasagna(data);
        single(data);
    });
}

function range(start, stop) {
    var result = [];
    for (var i = start; i < stop; i++) {
        result.push(i);
    }
    return result;
}

function linearColorScale(val1, val2, colors) {
    var numSteps = colors.length - 1;
    var domainStepSize = (val2 - val1) / numSteps;
    var domain = [];
    for (var i = 0; i < numSteps; i++) {
        domain.push(val1 + (domainStepSize * i));
    }
    domain.push(val2);
    return d3.scaleLinear().domain(domain).range(colors);
}

function lasagna(data) {
	
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 120 - margin.top - margin.bottom;
	
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().rangeRound([height-20, 0]).padding(0);
    var colorAxis = d3.scaleLinear().range([0, width]);
	
    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    var graphgroup = svg.append("g").attr("transform", "translate(0,20)")
    
	var lineHeight = 3;
	var sampleWidth = 3;
	
	//loop over groups/lines
	var numLines = Object.keys(data[0]).length -1;
	
	// scale the range of the data
	x.domain([data.minX, data.maxX]);
	y.domain(range(0, numLines));
	colorAxis.domain([data.minY, data.maxY]);
	
	for (var lineNo = 0; lineNo < numLines; lineNo++) {

		var colX = "x0";
		var colY = "x" + (lineNo + 1);

		var thisGroup = graphgroup.append("g")
									.attr("transform",
										  "translate(" + margin.left + "," + margin.top + ")");

		var color = linearColorScale(data.minY, data.maxY, /*['#ffffd9', ['#edf8b1',  */ ['#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']);

		//linear interpolation between data points 
		var linearInt = d3.scaleLinear().domain(data.map((x) => (x[colX])))
										.range(data.map((x) => (x[colY])));
		var samples = new Array();
		for (var i = 0; i < width; i += sampleWidth) {
			var xinv = x.invert(i);
			var val = linearInt(xinv);
			samples.push([xinv, val]);
		}
		
		// add rects for color field display.
		thisGroup.selectAll("rect")
				   .data(samples)
				   .enter()
				   .append("rect")
				   .attr("width", sampleWidth)
				   .attr("height", y.bandwidth())
				   .attr("x", (d, i) => (x(d[0])))
				   .attr("y", (d, i) => y(lineNo) )
				   .style("fill", (d, i) => (color(d[1])) );
	}
	  
	var axisGroup = graphgroup.append("g")
								  .attr("transform",
										"translate(" + margin.left + "," + margin.top + ")");
			  
	// add x axis
	axisGroup.append("g")
		.attr("transform", "translate(0," + (height - 20) + ")")
		.call(d3.axisBottom(x));
	
    var lineColor = d3.scaleOrdinal(d3.schemeCategory10);
	axisGroup.append("g")
		.call(d3.axisLeft(y).tickFormat(function(d, i) {
			var gNode = d3.select(this.parentNode);
			gNode.selectAll("*").remove();
			gNode.append("rect")
					.attr("x", -10)
					.attr("y", -(y.bandwidth()/4))
					.attr("width", 10)
					.attr("height", (y.bandwidth()/2))
					.style("fill", lineColor(i));
		}))
		.select(".domain").remove();
	
	// draw the color legend
	// define svg color gradient
	var legendGroup = svg.append("g")
							.attr("transform",
								  "translate(" + margin.left + "," + margin.top + ")");	
	legendGroup.append('defs').append('linearGradient').attr('id', 'colorgradient')
			.attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%')
			.selectAll('stop').data(color.range()).enter().append('stop')
			.attr('offset', (d, i) => (i / (color.range().length - 1)) )
			.attr('stop-color', (d) => (d));
	legendGroup.append("rect")
					.attr("x", 0)
					.attr("y", 0)
					.attr("width", width)
					.attr("height", 10)
					.attr('fill', 'url(#colorgradient)');
	legendGroup.append("g").call(d3.axisTop(colorAxis).tickSizeOuter(0)).select(".domain").remove();
	
}

function spaghetti(data) {

    // set the dimensions and margins of the graph
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // colors for the individual lines
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    // ranges of the screen space
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

	// data domains mapped to screen space
	x.domain([data.minX, data.maxX]);
	y.domain([0, data.maxY]);

	//loop over groups/lines
	var numLines = Object.keys(data[0]).length - 1;
	for (var lineNo = 0; lineNo < numLines; lineNo++) {

		var colX = "x0";
		var colY = "x" + (lineNo + 1);

		var thisGroup = svg.append("g")
							.attr("transform",
								  "translate(" + margin.left + "," + margin.top + ")");

		// define the line
		var valueline = d3.line()
						  .x(function(d) { return x(d[colX]); })
						  .y(function(d) { return y(d[colY]); });

		// add path to plot
		thisGroup.append("path")
				  .data([data])
				  .attr("class", "line")
				  .attr("d", valueline)
				  .style("stroke", color(lineNo));
	}
	
	var axisGroup = svg.append("g")
						.attr("transform",
						      "translate(" + margin.left + "," + margin.top + ")");

	// add x axis
	axisGroup.append("g")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(x));

	// add y axis
	axisGroup.append("g")
				.call(d3.axisLeft(y));

}

function single(data) {

    // set the dimensions and margins of the graph
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

	x.domain([data.minX, data.maxX]);
	y.domain([0, data.maxY]);

	//loop over groups/lines
	var numLines = Object.keys(data[0]).length - 1;
	for (var lineNo = 0; lineNo < numLines; lineNo++) {

		var colX = "x0";
		var colY = "x" + (lineNo + 1);

		//append svg for each line of the plot
		var svg = d3.select("body").append("svg")
		  .attr("width", width + margin.left + margin.right)
		  .attr("height", height + margin.top + margin.bottom);

		var thisGroup = svg.append("g")
							.attr("transform",
								  "translate(" + margin.left + "," + margin.top + ")");

		// define the line
		var valueline = d3.line()
		  .x(function(d) { return x(d[colX]); })
		  .y(function(d) { return y(d[colY]); });

		var path = thisGroup.append("path")
							  .data([data])
							  .attr("class", "line")
							  .attr("d", valueline)
							  .style("stroke", color(lineNo));

		var axisGroup = svg.append("g")
							.attr("transform",
								  "translate(" + margin.left + "," + margin.top + ")");

		axisGroup.append("g")
				  .attr("transform", "translate(0," + height + ")")
				  .call(d3.axisBottom(x));

		axisGroup.append("g")
					.call(d3.axisLeft(y));
		
	}

}

//start with initial example
doVis("data.csv");
