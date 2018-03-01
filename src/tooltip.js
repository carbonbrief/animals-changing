/*
 * Creates tooltip with provided id that
 * floats on top of visualization.
 * Most styling is expected to come from CSS
 * so check out bubble_chart.css for more details.
 */
function floatingTooltip(tooltipId, width) {
  // Local variable to hold tooltip div for
  // manipulation in other functions.
  var tt = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .attr('id', tooltipId)
    .style('pointer-events', 'visibleFill'); // change to visibleFill so can add event listeners
  
  // create container for polygon
  
  var tipContainer = d3.select("body")
    .append("svg")
    .attr('class', 'tip-container');

  var tip = tipContainer.append('polygon') // attempt to add pointer to tooltip
    .attr("points", "0,50 15,20 30,50 0,50")
    .style("fill", "white")
    .style("stroke", "white")
    .style("stroke-width", "4px")
    .style("stroke-linejoin", "round")
    .style('pointer-events', 'none'); 

  // Set a width if it is provided.
  if (width) {
    tt.style('width', width);
  }

  // Initially it is hidden.
  hideTooltip();

  /*
   * Display tooltip with provided content.
   *
   * content is expected to be HTML string.
   *
   * event is d3.event for positioning.
   */
  function showTooltip(content, event) {
    tt.style('opacity', 1.0)
      .html(content);

    tip.style('opacity', 1.0);

    updatePosition(event);
  }

  function showTip() {
  }

  /*
   * Hide the tooltip div.
   */
  function hideTooltip() {
    tt.style('opacity', 0.0);
    tip.style('opacity', 0.0);
  }

  /*
   * Figure out where to place the tooltip
   * based on d3 mouse event.
   */
  function updatePosition(event) {
    var xOffset = -45;
    var yOffset = 25;

    // retrieves width and height of tooltips

    var ttw = tt.style('width');
    var tth = tt.style('height');

    // the number of pixels at which the document is currently scrolled horizontally or vertically

    var wscrY = window.scrollY;
    var wscrX = window.scrollX;

    // clientX retreives horizontal coordinate or application area, regardless of how page is scrolled horizontally
    // event.pageX = The mouse position relative to the left edge of the document - counting scroll
    // A ternary operator is used as shorthand of an if/else statement. 
    // It is written with the syntax of a question mark (?) followed by a colon (:)
    // document.all is a bit like documentGetElementById

    var curX = (document.all) ? event.clientX + wscrX : event.pageX;
    var curY = (document.all) ? event.clientY + wscrY : event.pageY;

    // works out the position of the tooltip from the left
    var ttleft = ((curX - wscrX + xOffset * 2 + ttw) > window.innerWidth) ?
                 curX - ttw - xOffset * 2 : curX + xOffset;

    if (ttleft < wscrX + xOffset) {
      ttleft = wscrX + xOffset;
    }
    
    // works out the position of the tooltip from the top
    var tttop = ((curY - wscrY + yOffset * 2 + tth) > window.innerHeight) ?
                curY - tth - yOffset * 2 : curY + yOffset;

    if (tttop < wscrY + yOffset) {
      tttop = curY + yOffset;
    }

    tt
      .style('top', tttop + 'px')
      .style('left', ttleft + 'px');

    tipContainer.style('top', (tttop - 30) + 'px')
      .style('left', (ttleft + 30) + 'px');
  }

  return {
    showTooltip: showTooltip,
    hideTooltip: hideTooltip,
    updatePosition: updatePosition
  };
}
