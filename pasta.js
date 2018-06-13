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

	function dataTransform(d) {
		// format the data and find min/max
		var data = { "cols" : d[0], "lines" : d.slice(1).map(d => d.map(d => +d)) };
		data.minX = d3.min(data.lines, d => d[0]);
		data.maxX = d3.max(data.lines, d => d[0]);
		data.minY = d3.min(data.lines, d => d3.min(d.slice(1)));
		data.maxY = d3.max(data.lines, d => d3.max(d.slice(1)));
		return data;
	}

  d3.text(url).then(function(data) {
        let d = dataTransform(d3.csvParseRows(data));
        spaghetti(d);
        lasagna(d);
        single(d);
  }).catch(function(error) {
    console.log("there was an error while reading file " + url, error);
  });
}

function range(start, stop) {
    let result = [];
    for (let i = start; i < stop; i++) {
        result.push(i);
    }
    return result;
}

function linearColorScale(val1, val2, colors) {
    let numSteps = colors.length - 1;
    let domainStepSize = (val2 - val1) / numSteps;
    let domain = [];
    for (let i = 0; i < numSteps; i++) {
        domain.push(val1 + (domainStepSize * i));
    }
    domain.push(val2);
    return d3.scaleLinear().domain(domain).range(colors);
}

function lasagna(data) {

	let numLines = data.cols.length - 1;

  let margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = (numLines * 40) + 50 - margin.top - margin.bottom;

  let x = d3.scaleLinear().range([0, width]);
  let y = d3.scaleBand().rangeRound([height-20, 0]).padding(0.2);
  let colorAxis = d3.scaleLinear().range([0, width]);

  let svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
  let graphgroup = svg.append("g").attr("transform", "translate(0,20)")

	let lineHeight = 3;
	let sampleWidth = 3;

	// scale the range of the data
	x.domain([data.minX, data.maxX]);
	y.domain(range(0, numLines));
	colorAxis.domain([data.minY, data.maxY]);

	for (let lineNo = 0; lineNo < numLines; lineNo++) {

		let thisGroup = graphgroup.append("g")
									.attr("transform",
										  "translate(" + margin.left + "," + margin.top + ")");

		var color = linearColorScale(data.minY, data.maxY, /*['#ffffd9', ['#edf8b1',  */ ['#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']);

		//linear interpolation between data points
		let linearInt = d3.scaleLinear().domain(data.lines.map((x) => (x[0])))
										.range(data.lines.map((x) => (x[lineNo + 1])));
		let samples = new Array();
		for (let i = 0; i < width; i += sampleWidth) {
			let xinv = x.invert(i);
			let val = linearInt(xinv);
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

	let axisGroup = graphgroup.append("g")
								  .attr("transform",
										"translate(" + margin.left + "," + margin.top + ")");

	// add x axis
	axisGroup.append("g")
		.attr("transform", "translate(0," + (height - 20) + ")")
		.call(d3.axisBottom(x));

    let lineColor = d3.scaleOrdinal(d3.schemeCategory10);
	axisGroup.append("g")
		.call(d3.axisLeft(y).tickFormat(function(d, i) {
			let gNode = d3.select(this.parentNode);
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
	let legendGroup = svg.append("g")
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
  let margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  // colors for the individual lines
  let color = d3.scaleOrdinal(d3.schemeCategory10);

  // ranges of the screen space
  let x = d3.scaleLinear().range([0, width]);
  let y = d3.scaleLinear().range([height, 0]);

  // append the svg object to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  let svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

	// data domains mapped to screen space
	x.domain([data.minX, data.maxX]);
	y.domain([0, data.maxY]);

	//loop over groups/lines
	let numLines = data.cols.length - 1;
	for (let lineNo = 0; lineNo < numLines; lineNo++) {

		let thisGroup = svg.append("g")
							.attr("transform",
								  "translate(" + margin.left + "," + margin.top + ")");

		// define the line
		let valueline = d3.line()
						  .x(function(d) { return x(d[0]); })
						  .y(function(d) { return y(d[lineNo + 1]); });

		// add path to plot
		thisGroup.append("path")
				  .data([data.lines])
				  .attr("class", "line")
				  .attr("d", valueline)
				  .style("stroke", color(lineNo));
	}

	let axisGroup = svg.append("g")
						.attr("transform",
						      "translate(" + margin.left + "," + margin.top + ")");

	// add x axis
	axisGroup.append("g")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(x));

	// add y axis
	axisGroup.append("g").call(d3.axisLeft(y));

}

function single(data) {

  let numLines = data.cols.length - 1;

  // set the dimensions and margins of the graph
  let margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = (100 * numLines) - margin.top - margin.bottom;

  let color = d3.scaleOrdinal(d3.schemeCategory10);

  let x = d3.scaleLinear().range([0, width]);

	x.domain([data.minX, data.maxX]);

  let svg = d3.select("body").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + (10 * numLines) + margin.top + margin.bottom);

	//loop over groups/lines
	for (let lineNo = 0; lineNo < numLines; lineNo++) {

    let y = d3.scaleLinear().range([height / numLines, 0]);
    y.domain([0, d3.max(data.lines.map((x) => (x[lineNo + 1])))]);

		let thisGroup = svg.append("g").attr("transform",
								  "translate(" + margin.left + "," + (margin.top + (lineNo * ( (height / numLines) + 10 ))) + ")");

		// define the line
		let valueline = d3.line()
						  .x(function(d) { return x(d[0]); })
						  .y(function(d) { return y(d[lineNo + 1]); });

		let path = thisGroup.append("path")
							  .data([data.lines])
							  .attr("class", "line")
							  .attr("d", valueline)
							  .style("stroke", color(lineNo));

		thisGroup.append("g")
					.call(d3.axisLeft(y).ticks(3));

	}

    svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + (margin.top + height + (10 * numLines)) + ")")
              .call(d3.axisBottom(x));

}

//start with initial example
doVis("data.csv");
