/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Inspired by:
 * https://bost.ocks.org/mike/chart/
 * http://vallandingham.me/bubble_chart_v4/
 *
 */
function bubbleChart() {
  // Constants for sizing
  // will be changing viewport so don't need to make responsive here
  var width = 830;
  var height = 900;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 1.9 };

  var nodeCenters = {
    1: { x: width / 1.65, y: height / 5 * 1.25 },
    2: { x: width / 1.65, y: height / 5 * 2.3 },
    3: { x: width / 1.65, y: height / 5 * 3.2 },
    4: { x: width / 1.65, y: height / 5 * 4.0 }
  };

  console.log(nodeCenters);

  // y locations of the year titles. nb html markup doesn't work
  var changesTitleY = {
    "Growing": height / 5 * 4.3,
    "Could grow": height / 5 * 3.55,
    "Could shrink": height / 5 * 2.3,
    "Shrinking": height / 5 * 0.8
  };

  // y locations of the year subtitletitles. slightly hacky method
  var changesSubtitleY = {
    "observed, with recent climate": height / 5 * 4.3 + 25,
    "change implicated": height / 5 * 4.3 + 42,
    "implied by experiments, geographic": height / 5 * 3.55 + 25,
    "comparisons, or fossil evidence": height / 5 * 3.55 + 42,
    "implied by experiments, geographic ": height / 5 * 2.3 + 25,
    "comparisons, or fossil evidence ": height / 5 * 2.3 + 42,
    "observed, with recent climate  ": height / 5 * 0.8 + 25,
    "change implicated  ": height / 5 * 0.8 + 42
  };

  console.log(changesTitleY);
  console.log(changesSubtitleY);

  // @v4 strength to apply to the position forces
  var forceStrength = 0.07;

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
    .domain(['Shrinking', 'Growing'])
    .range(['#A14A7b', '#e08b1b']);


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
    var maxAmount = d3.max(rawData, function (d) { return +d.size; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 27])
      .domain([0, maxAmount]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: radiusScale(+d.size),
        value: +d.size, // determines size
        name: d.organism,
        latin: d.latin_name,
        change: d.change,
        location: d.location,
        group: d.class,         // will determine colour
        position: d.position,
        image: d.img,       // will determine icon
        journal: d.journal,
        title: d.title,
        year: d.year,
        author: d.author,
        summary: d.summary,
        link: d.link,
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

    // add different silhouette patterns

    var defs = svg.append("defs");

    defs.selectAll(null)
      .data(nodes)
      .enter()
      .append("pattern")
      .attr("id", function(d){
          return d.image
      })//set the id here
      .attr("height", "100%")
      .attr("width", "100%")
      .attr("patternContentUnits", "objectBoundingBox")
      .append("image")
      .attr("height", 1)
      .attr("width", 1)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", function(d) {
          return "img/" + d.image + ".svg"
      });

    // add darker silhouette pattern for hover

    var defs2 = svg.append("defs");

    defs2.selectAll(null)
      .data(nodes)
      .enter()
      .append("pattern")
      .attr("id", function(d){
          return d.image + "2"
      })//set the id here
      .attr("height", "100%")
      .attr("width", "100%")
      .attr("patternContentUnits", "objectBoundingBox")
      .append("image")
      .attr("height", 1)
      .attr("width", 1)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", function(d) {
          return "img/" + d.image + "2.svg"
      });


    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.

    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .style("fill", function(d) { return "url(#" + d.image + ")"})
      .attr('r', 0)  // initial radius zero to allow transition
      .attr('class', function(d) { 
        return "bubble " + d.group 
      })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.change)); })
      .attr('stroke-width', 2)
      .on('mouseover', mouseover)
      .on('mouseout', mouseout)
      .on('click', mouseclick)
      .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

    // drag actions

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    
    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    } 


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
      .attr("cx", function(d) { return d.x = Math.max((d.radius+5), Math.min(width - (d.radius+5), d.x)); })
      .attr("cy", function(d) { return d.y = Math.max((d.radius+5), Math.min(height - (d.radius+5), d.y)); });
  }

  /*
   * Provides a y value for each node to be used with the split by year
   * y force.
   */
  function nodePosY(d) {
    return nodeCenters[d.position].y;
  }

  // add extra one for the x position

  function nodePosX(d) {
    return nodeCenters[d.position].x;
  }


  /*
   * Sets visualization in "single group mode".
   * The titles are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideChangeTitles();

    // @v4 Reset the 'y' force to draw the bubbles to the center.
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));

    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * nodeCenter of their data's year.
   */
  function splitBubbles() {
    showChangeBox();
    showChangeTitles();
    showChangeSubtitles();
    showChangeLine();
    showKey();

    // @v4 Reset the 'y' force to draw the bubbles to their year centers
    simulation.force('y', d3.forceY().strength(forceStrength).y(nodePosY));

    simulation.force('x', d3.forceX().strength(forceStrength).x(nodePosX));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Hides size change title displays.
   */
  function hideChangeTitles() {
    svg.selectAll('.change').remove();
    svg.selectAll('.subtitle').remove();
    svg.selectAll('.change-line').remove();
    svg.selectAll('.change-box').remove();
  }

  /*
   * Shows size change title displays.
  */

  function showChangeBox() {

    var changeBox = svg.append("g")
    .attr('id', 'box-wrapper')
    .attr("width", 400)
    .attr("height", 200);

    changeBox.append("rect")
    .attr('class', 'change-box')
    .attr("x", 30)
    .attr("y", 115)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", 180)
    .attr("height", 90)
    .attr("fill", "#a14a7b");

    changeBox.append("rect")
    .attr('class', 'change-box')
    .attr("x", 30)
    .attr("y", 385)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", 215)
    .attr("height", 90)
    .attr("fill", "#a14a7b");

    changeBox.append("rect")
    .attr('class', 'change-box')
    .attr("x", 30)
    .attr("y", 605)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", 215)
    .attr("height", 90)
    .attr("fill", "#e08b1b");

    changeBox.append("rect")
    .attr('class', 'change-box')
    .attr("x", 30)
    .attr("y", 745)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("width", 180)
    .attr("height", 90)
    .attr("fill", "#e08b1b");

  }

  /*
   * Shows size change title displays.
   */
  function showChangeTitles() {
    // Another way to do this would be to create
    // the change texts once and then just hide them.
    var changesData = d3.keys(changesTitleY);
    var changes = svg.selectAll('.change')
      .data(changesData);

    changes.enter().append('text')
      .attr('class', 'change')
      .attr('x', 40)
      .attr('y', function (d) { return changesTitleY[d]; })
      .attr('text-anchor', 'left')
      .text(function (d) { return d; });
  }

  /*
   * Shows change subtitle displays.
   */
  function showChangeSubtitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var subtitlesData = d3.keys(changesSubtitleY);
    var subtitles = svg.selectAll('.subtitle')
      .data(subtitlesData);

    subtitles.enter().append('text')
      .attr('class', 'subtitle')
      .attr('x', 40)
      .attr('y', function (d) { return changesSubtitleY[d]; })
      .attr('text-anchor', 'left')
      .text(function (d) { return d; });
  }

  // function to add lines linking titles to bubbles....find way to condense this section? lots of repeated code

  function showChangeLine () {

    var line1Data = [
      {
        "x": width/3.1,
        "y": height/5*0.8
      },
      {
        "x": width/2.5,
        "y": height/5*0.8
      }
    ]

    var line2Data = [
      {
        "x": width/3.1,
        "y": height/5*2.4
      },
      {
        "x": width/2.5,
        "y": height/5*2.4
      }
    ]

    var line3Data = [
      {
        "x": width/3.1,
        "y": height/5*3.7
      },
      {
        "x": width/2.5,
        "y": height/5*3.7
      }
    ]

    var line4Data = [
      {
        "x": width/3.1,
        "y": height/5*4.4
      },
      {
        "x": width/2.5,
        "y": height/5*4.4
      }
    ]

    var t = d3.transition()
      .delay(20)
      .duration(300)
      .ease(d3.easeLinear)
      .on("start", function(d){ console.log("transiton start"); })
      .on("end", transitionEnd);

    var lineFunction = d3.line()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

    var line1 = svg.selectAll(".line-1")
      .data([line1Data]);

    line1.enter().append("path")
      .attr("class", "change-line line-1")
      .merge(line1)
      .attr("d", lineFunction(line1Data))
      .attr("stroke-dasharray", function(d){ return this.getTotalLength() })
      .attr("stroke-dashoffset", function(d){ return this.getTotalLength() });

    var line2 = svg.selectAll(".line-2")
      .data([line2Data]);

    line2.enter().append("path")
      .attr("class", "change-line line-2")
      .merge(line1)
      .attr("d", lineFunction(line2Data))
      .attr("fill", "none")
      .attr("stroke-dasharray", function(d){ return this.getTotalLength() })
      .attr("stroke-dashoffset", function(d){ return this.getTotalLength() });

    var line3 = svg.selectAll(".line-3")
      .data([line3Data]);

    line3.enter().append("path")
      .attr("class", "change-line line-3")
      .merge(line1)
      .attr("d", lineFunction(line3Data))
      .attr("fill", "none")
      .attr("stroke-dasharray", function(d){ return this.getTotalLength() })
      .attr("stroke-dashoffset", function(d){ return this.getTotalLength() });

    var line4 = svg.selectAll(".line-4")
      .data([line4Data]);

    line4.enter().append("path")
      .attr("class", "change-line line-4")
      .merge(line1)
      .attr("d", lineFunction(line4Data))
      .attr("fill", "none")
      .attr("stroke-dasharray", function(d){ return this.getTotalLength() })
      .attr("stroke-dashoffset", function(d){ return this.getTotalLength() });


    svg.selectAll(".change-line")
      .transition(t)
      .attr("stroke-dashoffset", 0)
      .style("opacity", 1);
  
    function transitionEnd () {
      svg.selectAll(".change-line")
      .style("stroke-dasharray", ("4, 4"));
      console.log("transiton end");
    }

  }

  // function to show key once transitions have completed

  function showKey () {

    console.log("showkey");

    // append to the same svg as the chart so that it scales with the chart

    var bubblesKey = svg.append("g")
        .attr('id', 'key');

    bubblesKey.append("circle")
    .attr('class', 'bubble-key')
    .attr("cx", 85)
    .attr("cy", 40)
    .attr("r", 17);

    bubblesKey.append("circle")
    .attr('class', 'bubble-key')
    .attr("cx", 205)
    .attr("cy", 40)
    .attr("r", 26);

    // slightly inelegant way of adding text over multiple lines, still haven't found a simple fix

    bubblesKey.append("text")
    .attr("class", "key-text")
    .attr("x", 20)
    .attr("y", 35)
    .attr("dy", "0em")
    .text("single");

    bubblesKey.append("text")
    .attr("class", "key-text")
    .attr("x", 20)
    .attr("y", 35)
    .attr("dy", "1.2em")
    .text("species");

    bubblesKey.append("text")
    .attr("class", "key-text")
    .attr("x", 125)
    .attr("y", 35)
    .attr("dy", "0em")
    .text("multiple");

    bubblesKey.append("text")
    .attr("class", "key-text")
    .attr("x", 125)
    .attr("y", 35)
    .attr("dy", "1.2em")
    .text("species");


  }

  // variable to turn tooltip on an off

  var toggleTooltip = true;

  // actions on mouseclick, depending on the variable toggleTooltip

  function mouseclick (d) {

    // to stop an event from propagating up the DOM tree, so that bodyclick doesn't get fired too

    d3.event.stopPropagation();

    if (toggleTooltip == true) {

      // show tooltip on mouseclick if not already open

      var content = '<img src="img/' +
      d.image +
      '.svg" class="tooltip_image"><h3>' +
      d.name +
      '</h3><h4>' +
      d.latin + 
      '</h4><p class="entry"><span class="name">Location: </span><span class="value">' +
      d.location +
      '</span></p>' +
      '<p class="entry"><span class="name">Summary: </span><span class="value">' +
      d.summary +
      '</span></p>' + 
      // '<p class="entry"><span class="name">Citation: </span><span class="value">' +
      // d.author + ' (' + d.year + '), "' + d.title + '". <em>' + d.journal +
      // '.</em></span></p>' + 
      '<p class="entry"><span class="link"><a href="' + 
      d.link + 
      '" target="blank">Link</a></span></p> ';

      tooltip.showTooltip(content, d3.event);

      console.log("show tooltip");

      // so that it doesn't fire immediately and catch the current click

      setTimeout(bodyClick, 100);

      toggleTooltip = false;

    } else {

      tooltip.hideTooltip();

      toggleTooltip = true;

      console.log("show tooltip");

    }
  
    


  }

  // function to stop clicks on the tooltip propagating to the body

  function tooltipClick () {

    console.log('tooltip function');

    var tooltipListen = document.getElementById('gates_tooltip');

    tooltipListen.style.pointerEvents = 'visibleFill';

    tooltipListen.addEventListener('click', function b() {

      d3.event.stopPropagation();

      console.log('stop tooltip propagation');

      tooltipListen.removeEventListener('click', b);

      tooltipListen.style.pointerEvents = 'none';

    });

    // console.log(tooltipListen);
    
  }

  // function so that tooltip dissapears when click off the graph

  function bodyClick () {

    tooltipClick();

    var listen = document.getElementById('bubble-chart');

    listen.addEventListener('click', function a() {
        tooltip.hideTooltip();
        console.log('body click');

        listen.removeEventListener('click', a);

        var tooltipListen = document.getElementById('gates_tooltip');

        tooltipListen.style.pointerEvents = 'none';

    });

    toggleTooltip = true;
    
  }

  // mouseover style changes, no longer linked to tooltip

  function mouseover(d) {

    // change size of bubbles on mouseover
    d3.select(this).transition()
      .duration(450)
      .ease(d3.easeLinear)
      .attr("r", function(d){ 
        if (d.position > 2) {
          return d.radius*1.2;
        } 
        else {
          return d.radius*0.8;
        }
      });
    
    // change opacity of stroke on mouseover

    d3.select(this)
    .attr('stroke', function (d) { 
      if (d.change == "Growing") {
        return "#b77408";
      } else {
        return "#77395e";
      }})
    .style("fill", function(d) { return "url(#" + d.image + "2)"})
    .attr('opacity', 1);

    // console.log("mouseover event");

  }

  /*
   * Function called on mouseout to reset various features
   */

  function mouseout(d) {

    // reset bubble size
    d3.select(this).transition()
      .duration(750)
      .ease(d3.easeLinear)
      .attr("r", function(d){return d.radius});

    // reset stroke outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.change)))
      .style("fill", function(d) { return "url(#" + d.image + ")"})
      .attr('opacity', 1);

    // console.log("mouse event end");
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes during the initial transition.
   *
   * displayName is expected to be a string and either 'change' or 'all'.
   */

  chart.toggleDisplay = function (displayName) {
    if (displayName === 'change') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };

  // function to control cluster dropdown

  $('#cluster').change(function () {
    if (this.value == "all") {
      groupBubbles();
    } else {
      splitBubbles();
    }
  })

  // code to control dropdown

  $('#groups').change(function () {
    if (this.value == "All") {
      d3.selectAll('.bubble').style("opacity", "1");
    }
    else {
      d3.selectAll('.bubble').style("opacity", "0.3");
      d3.selectAll('.' + this.value).style("opacity", "1");
    }
  })


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
//setupButtons();


// once loaded, switch to timeline view

function initialTransition () {
  $("#cluster").val('change').prop('selected', true);
  //d3.select("#all").classed('active', false);
  myBubbleChart.toggleDisplay("change");
  setTimeout(viewToolbar, 300);
}

// make tool bar visible once transitions have completed

function viewToolbar () {
  d3.select("#toolbar").transition().duration(1200).style("opacity", "1");
}

setTimeout(initialTransition, 2500);


// reset dropdown on window reload

$(document).ready(function () {
  $("select").each(function () {
      $(this).val($(this).find('option[selected]').val());
  });
})