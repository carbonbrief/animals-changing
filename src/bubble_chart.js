/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 * http://vallandingham.me/bubble_chart_v4/
 *
 */
function bubbleChart() {
  // Constants for sizing
  // will be changing viewport so don't need to make responsive here
  var width = 600;
  var height = 800;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 1.9 };

  var yearCenters = {
    1: { x: width / 2, y: height / 6 * 2 },
    2: { x: width / 2, y: height / 6 * 3 },
    3: { x: width / 2, y: height / 6 * 4 },
    4: { x: width / 2, y: height / 6 * 5 },
  };

  console.log(yearCenters);

  // X locations of the year titles. nb html markup doesn't work
  var yearsTitleY = {
    "Growing": height / 6 * 5,
    "Predicted to grow": height / 6 * 4,
    "Predicted to shrink": height / 6 * 3,
    "Shrinking": height / 6 * 2,
  };

  console.log(yearsTitleY);

  // @v4 strength to apply to the position forces
  var forceStrength = 0.03;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force("collide", d3.forceCollide().radius(function(d) { return d.radius + 0.5; }).iterations(2))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // @v4 scales now have a flattened naming scheme
  var fillColor = d3.scaleOrdinal()
    .domain(['Mammals', 'Birds', 'Plants'])
    .range(['#ade2ea', '#999999', '#424242']);


  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max studies in the data as the max in the scale's domain
    // note we have to ensure the studies is a number.
    var maxAmount = d3.max(rawData, function (d) { return +d.studies; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 55])
      .domain([0, maxAmount]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: radiusScale(+d.studies),
        value: +d.studies,
        name: d.organism,
        unfccc: d.unfccc,
        continent: d.continent,
        group: d.class,         // will determine colour
        year: d.position,
        image: d.img,       // will determine icon
        peak_year: d.peak_year,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr("viewBox", "0 0 " + (width) + " " + (height))
      .attr("preserveAspectRatio", "xMidYMid meet");
      // .attr('width', width)
      // .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)  // initial radius zero to allow transition
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);
      
    // works but in wrong position

    var silhouettes = bubbles.enter().append('svg:image')
        .attr("xlink:href",  function(d) { return "img/" + d.image})
        .attr("x", function(d) { return d.x -25;})
        .attr("y", function(d) { return d.y -25;})
        .attr("height", 50)
        .attr("width", 50);

    console.log(function(d) { return d.img});

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
    bubbles
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });
  }

  /*
   * Provides a x value for each node to be used with the split by year
   * x force.
   */
  function nodeYearPos(d) {
    return yearCenters[d.year].y;
  }


  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    showYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('y', d3.forceY().strength(forceStrength).y(nodeYearPos));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Hides Year title displays.
   */
  function hideYearTitles() {
    svg.selectAll('.year').remove();
  }

  /*
   * Shows Year title displays.
   */
  function showYearTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsData = d3.keys(yearsTitleY);
    var years = svg.selectAll('.year')
      .data(yearsData);

    years.enter().append('text')
      .attr('class', 'year')
      .attr('x', 100)
      .attr('y', function (d) { return yearsTitleY[d]; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this)
    .attr('stroke', 'black')
    .attr('opacity', 0.7);

    var content = '<h3>' +
                  d.name +
                  '</h3>' +
                  '<span class="name">Peak year: </span><span class="value">' +
                  d.peak_year +
                  '</span><br/>' +
                  '<span class="name">Carbon footprint*: </span><span class="value">' +
                  addCommas(d.value) +
                  ' tonnes CO2E</span>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip and resets styling on mouse mouseOut
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.group)).darker())
      .attr('opacity', 1);

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'year') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#bubble-chart', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('data/test.csv', display);

// setup the buttons.
setupButtons();


// once loaded, switch to timeline view

function initialTransition () {
  d3.select("#year").classed('active', true);
  d3.select("#all").classed('active', false);
  myBubbleChart.toggleDisplay("year");
  setTimeout(viewToolbar, 300);

}

// make tool bar visible once transitions have completed

function viewToolbar () {
  d3.select("#toolbar").transition().duration(1200).style("opacity", "1");
}

setTimeout(initialTransition, 2500);

// set up dropdown

var varState = "";

// the .bubble method is not going to work because the bubbles do not have data associated with them once drawn

function filterBubbles (varState) { // filter that can be used slightly differently each time

  if (varState === "All continents") {  //since All Continents will not be a variable in the data

    console.log("if");

    d3.csv('data/test.csv', display);
    setTimeout(initialTransition, 300);

    
  }
  else {

    console.log("else");

        // var filteredData = d3.selectAll(".bubble").filter(function(d){
    //   return continent == [varState]; 
    // })
    // console.log(filteredData.length);

    // d3.csv("data/dummy-data-3.csv", function(data, varState) {
    //   filteredData = data.filter(function(row) {
    //     return row['continent'] == [varState]; 
    //   });

    //   console.log(filteredData.length, filteredData);

    //   display(error, filteredData);
      
    // });
    
  }

}

$("#dropdown").change(function() {

  varState = $(this).val();

  d3.selectAll("#bubble-chart svg").remove();

  console.log(varState);

  filterBubbles(varState);

})

// reset dropdown on window reload

$(document).ready(function () {
  $("select").each(function () {
      $(this).val($(this).find('option[selected]').val());
  });
})