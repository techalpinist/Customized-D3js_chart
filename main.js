console.log("D3.js challenge");

const initialParams = {
    selector: '.hierarchy-svg-chart',
    chartWidth: window.innerWidth,
    chartHeight: window.innerHeight,
    functions: {
      showSelectedNode: null,
      search: null,
      closeSearchBox: null,
      clearResult: null,
      findInTree: null,
      reflectResults: null,
      departmentClick: null,
      back: null,
      toggleFullScreen: null,
      locate: null,
      onChangeDimensions: null,
    },
    data: mockData,
  };
  
  function refactor(root){
    var childrenNodes=[];
    if(root.isHeader) {
      for(var i=0; i < root.children.length; i ++) {
        childrenNodes.push({
          label: root.children[i].label,
          children: refactor(root.children[i])
        })
      }
    } else if(root.children) {
      for(var i=0; i < root.children.length; i ++)
        if(root.children[i].isHeader) //
          childrenNodes.push(
            refactor(root.children[i])
          )
        else 
          childrenNodes.push({
            label: root.children[i].label,
            children: refactor(root.children[i])
          })
    } else {
      childrenNodes.push(root)
    }
    return childrenNodes;
  }

  drawHierarchyChart(initialParams);
  
  function drawHierarchyChart(params) {

    const attrs = {
      selector: params.selector,
      root: params.data,
      width: params.chartWidth,
      height: params.chartHeight,
      index: 0,
      nodePadding: 9,
      collapseCircleRadius: 7,
      //
      nodeHeight: 100,
      nodeWidth: 200,
      nodeHeaderHeight: 40,
      //
      duration: 750,
      rootNodeTopMargin: 20,
      minMaxZoomProportions: [0.05, 3],
      linkLineSize: 180,
      collapsibleFontSize: '14px',
      nodeStroke: '#ccc',
      nodeStrokeWidth: '1px',
    };

    //##refactor mockData##
    var refactorMock = refactor(attrs.root)[0];
    console.log(refactorMock)
    // attrs.root = refactorMock;

    params.functions.showSelectedNode = showSelectedNode;
    params.functions.expandAll = expandAll;
    params.functions.search = searchItems;
    params.functions.closeSearchBox = closeSearchBox;
    params.functions.findInTree = findInTree;
    params.functions.clearResult = clearResult;
    params.functions.reflectResults = reflectResults;
    // params.functions.back = back;
    params.functions.toggleFullScreen = toggleFullScreen;
    params.functions.locate = locate;
    params.functions.onChangeDimensions = (width) => {
      attrs.width = width;
  
      d3.select(attrs.selector)
        .select('svg')
        .attr('width', width);
  
      update(attrs.root, { horizontalCentering: true });
    };
  
    const dynamic = {};
    dynamic.rootNodeLeftMargin = attrs.width / 2;
  
    const tree = d3.layout.tree().nodeSize([attrs.nodeWidth + 40, attrs.nodeHeight]);
    const diagonal = d3.svg.diagonal()
      .projection((d) => [d.x + (attrs.nodeWidth / 2), d.y + (attrs.nodeHeight / 2)]);
  
    const zoomBehaviours = d3.behavior
      .zoom()
      .scaleExtent(attrs.minMaxZoomProportions)
      .on('zoom', redraw);
  
    const svg = d3.select(attrs.selector)
      .append('svg')
      .attr('width', attrs.width)
      .attr('height', attrs.height)
      .call(zoomBehaviours)
      .append('g')
      .attr('transform', `translate(${(attrs.width / 2)},${20})`);
  
    // necessary so that zoom knows where to zoom and un-zoom from
    zoomBehaviours.translate([dynamic.rootNodeLeftMargin, attrs.rootNodeTopMargin]);
  
    attrs.root.x0 = 0;
    attrs.root.y0 = dynamic.rootNodeLeftMargin;
  
    if (params.mode !== 'department') {
      // adding unique values to each node recursively
      let uniq = 1;
      addPropertyRecursive('uniqueIdentifier', () => {
        uniq += 1;
        return uniq;
      }, attrs.root);
    }
    
    expand(attrs.root);
  
    if (attrs.root.children) {
      attrs.root.children.forEach(collapse);
    }

    update(attrs.root);
  
    d3.select(attrs.selector).style('height', attrs.height);
  
    const tooltip = d3.select(attrs.selector)
      .append('div')
      .attr('class', 'customTooltip-wrapper');
  
    function update(source, param) {
      // Compute the new tree layout.
      const nodes = tree.nodes(attrs.root).reverse();
      const links = tree.links(nodes);

      // Normalize for fixed-depth.
      nodes.forEach((d) => {
        d.y = d.depth * attrs.linkLineSize;
      });
  
      // Update the nodes
      const node = svg.selectAll('g.node')
        .data(nodes, (d) => {
          if (!d.id) {
            attrs.index += 1;
            d.id = attrs.index;
          }
          return d.id;
        });

      // Enter any new nodes at the parent's previous position.
      console.log(source)
      const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.x0},${source.y0})`);
  
      const nodeGroup = nodeEnter.append('g')
        .attr('class', 'node-group');
  
      nodeGroup.append('rect')
        .attr('width', attrs.nodeWidth)
        .attr('height', attrs.nodeHeight)
        .attr('rx', 3)
        .attr('data-node-group-id', (d) => d.uniqueIdentifier)
        .attr(
          'class',
          (d) => {
            const hasChildrenClass = d._children || d.children ? 'nodeHasChildren' : 'nodeDoesNotHaveChildren';
            return `node-rect ${hasChildrenClass} ${d.isHeader ? ' category' : ''}`;
          },
        );
  
      nodeGroup.append('rect')
        .filter((d) => !d.isHeader)
        .attr('x', 0)
        .attr('y', 0)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('height', attrs.nodeHeaderHeight)
        .attr('width', attrs.nodeWidth)
        .attr('class', 'node-rect-header');
  
      // The node with category name
      nodeGroup.append('text')
        .filter((d) => d.isHeader)
        .attr('x', attrs.nodeWidth / 2)
        .attr('y', attrs.nodeHeight / 2)
        .attr('class', 'node-rect-category-name')
        .attr('text-anchor', 'left')
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text((d) => d.label.trim())
        .call(wrap, attrs.nodeWidth - 10);
  
      // The node with header and measurements
      nodeGroup.append('text')
        .filter((d) => !d.isHeader)
        .attr('x', attrs.nodeWidth / 2)
        .attr('y', (d) => {
          const text = d.label.trim();
          return attrs.nodePadding + (text.length > 25 ? 5 : 12);
        })
        .attr('class', 'node-rect-name')
        .attr('text-anchor', 'left')
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text((d) => d.label.trim())
        .call(wrap, attrs.nodeWidth - 10);
  
      //
      nodeGroup.append('text')
        .filter((d) => !d.isHeader)
        .attr('x', attrs.nodeWidth / 2)
        .attr('y', attrs.nodeHeaderHeight + 16)
        .attr('class', 'node-rect-measurement')
        .attr('text-anchor', 'left')
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text('100%');
    //###
    const childreCount = nodeEnter.append('g')
        .attr('class', 'children-count');
    childreCount.append('text')
        .attr('x', attrs.nodeWidth / 2)
        .attr('y', attrs.nodeHeaderHeight + 40)
        .attr('class', 'node-children-count')
        .attr('text-anchor', 'left')
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .text((d)=>{
            if(d.children) 
                return d.children.length;
            if(d._children)
                return d._children.length;
            
        });

    
    const collapsiblesWrapperGroup = nodeEnter.append('g')
        .attr('class', 'node-collapsibleGroup');
    collapsiblesWrapperGroup.filter((d) => {
        if(d.depth==0){
          var childrenCount = d.children.length;
            d.children.map((v, index)=>{
                let collapsiblesWrapper = collapsiblesWrapperGroup
                    .filter((f)=>f.children)
                    .append('g')
                    .attr('isCollapsed', v.depth ? 0 : 1)
                    .attr('data-id', v.uniqueIdentifier);
                let collapsibles = collapsiblesWrapper
                    .append('circle')
                    .attr('class', 'node-collapse')
                    .attr('cx', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('cy', attrs.nodeHeight)
                    .attr('', setCollapsibleStatusProperty);
                collapsibles
                    .filter((c) => c.children || c._children)
                    .attr('r', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius);
                
                collapsiblesWrapper
                    .filter((c) => c.children || c._children)
                    .append('text')
                    .attr('class', 'text-collapse')
                    .attr('x', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('y', (c) => attrs.nodeHeight + (c.isCollapsed ? 4 : 3))
                    .attr('width', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius)
                    .style('font-size', attrs.collapsibleFontSize)
                    .style('font-weight', '600')
                    .attr('text-anchor', 'middle')
                    .style('font-family', 'monospace')
            })
          return;
        }
        if(d._children) {
            var childrenCount = d._children.length;
            d._children.map((v, index)=>{
                let collapsiblesWrapper = collapsiblesWrapperGroup
                    .filter((f)=>f._children)
                    .append('g')
                    .attr('isCollapsed', v.depth ? 0 : 1)
                    .attr('data-id', v.uniqueIdentifier);
                let collapsibles = collapsiblesWrapper
                    .attr('class', 'node-collapse')
                    .append('circle')
                    .attr('cx', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('cy', attrs.nodeHeight)
                    .attr('', setCollapsibleStatusProperty);
                collapsibles
                    .filter((c) => c.children || c._children)
                    .attr('r', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius);
                
                collapsiblesWrapper
                    .filter((c) => c.children || c._children)
                    .append('text')
                    .attr('class', 'text-collapse')
                    .attr('x', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('y', (c) => attrs.nodeHeight + (c.isCollapsed ? 4 : 3))
                    .attr('width', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius)
                    .style('font-size', attrs.collapsibleFontSize)
                    .style('font-weight', '600')
                    .attr('text-anchor', 'middle')
                    .style('font-family', 'monospace')
                    .text((c) => getCollapsibleSymbol(c.isCollapsed));
              
                  collapsiblesWrapper.on('click', click);
            })
        }
        if(d.children) {
            var childrenCount = d.children.length;
            d.children.map((v, index)=>{
                let collapsiblesWrapper = collapsiblesWrapperGroup
                    .filter((f)=>f.children)
                    .append('g')
                    .attr('isCollapsed', v.depth ? 0 : 1)
                    .attr('data-id', v.uniqueIdentifier);
                let collapsibles = collapsiblesWrapper
                    .append('circle')
                    .attr('class', 'node-collapse')
                    .attr('cx', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('cy', attrs.nodeHeight)
                    .attr('', setCollapsibleStatusProperty);
                collapsibles
                    .filter((c) => c.children || c._children)
                    .attr('r', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius);
                
                collapsiblesWrapper
                    .filter((c) => c.children || c._children)
                    .append('text')
                    .attr('class', 'text-collapse')
                    .attr('x', (attrs.nodeWidth / childrenCount * index + attrs.nodeWidth / childrenCount / 2))
                    .attr('y', (c) => attrs.nodeHeight + (c.isCollapsed ? 4 : 3))
                    .attr('width', attrs.collapseCircleRadius)
                    .attr('height', attrs.collapseCircleRadius)
                    .style('font-size', attrs.collapsibleFontSize)
                    .style('font-weight', '600')
                    .attr('text-anchor', 'middle')
                    .style('font-family', 'monospace')
                    .text((c) => getCollapsibleSymbol(c.isCollapsed));
              
                collapsiblesWrapper.on('click', click);
            })
        }
    })
  
      // Transition nodes to their new position.
      const nodeUpdate = node.transition()
        .duration(attrs.duration)
        .attr('transform', (d) => `translate(${d.x},${d.y})`);
  
      // todo replace with attrs object
      nodeUpdate.select('rect')
        .attr('width', attrs.nodeWidth)
        .attr('height', attrs.nodeHeight)
        .attr('rx', 3)
        .attr('stroke', (d) => {
          if (param && d.uniqueIdentifier === param.locate) {
            return '#a1ceed';
          }
          return attrs.nodeStroke;
        })
        .attr('stroke-width', (d) => {
          if (param && d.uniqueIdentifier === param.locate) {
            return 6;
          }
          return attrs.nodeStrokeWidth;
        });
  
      // Transition exiting nodes to the parent's new position.
      const nodeExit = node.exit().transition()
        .duration(attrs.duration)
        .attr('transform', () => `translate(${source.x},${source.y})`)
        .remove();
  
      nodeExit.select('rect')
        .attr('width', attrs.nodeWidth)
        .attr('height', attrs.nodeHeight);
  
      // Update the links
      const link = svg.selectAll('path.link')
        .data(links, (d) => {
          // console.log(d)
          return d.target.id
        });
      // Enter any new links at the parent's previous position.
      link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('x', attrs.nodeWidth / 2)
        .attr('y', attrs.nodeHeight / 2)
        .attr('d', () => {
          const o = {
            x: source.x0,
            y: source.y0,
          };
          return diagonal({
            source: o,
            target: o,
          });
        });
  
      // Transition links to their new position.
      link.transition()
        .duration(attrs.duration)
        .attr('d', (d)=>{
          console.log(d)
          let count = 1;
          let index = 0;
          if(d.source._children) {
            count = d.source._children.length;
            var indexGroup=[];
            if(d.source.uniqueIdentifier == 2) {
              count = 1;
              index = 0;
            } else {
              d.source._children.map((e)=>{
                indexGroup.push(e.uniqueIdentifier)
              })
              console.log(indexGroup)
              console.log(param.clickedId)
              index = indexGroup.indexOf(parseInt(param.clickedId))
            }
          }
          return diagonal({
            source: {
              x: d.source.x - attrs.nodeWidth/2 + attrs.nodeWidth/count*index + attrs.nodeWidth/count/2,
              y: d.source.y + attrs.nodeHeight / 2
            },
            target: {
              x: d.target.x,
              y: d.target.y - attrs.nodeHeight / 2
            }
          });
        });
  
      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(attrs.duration)
        .attr('d', () => {
          const o = {
            x: source.x,
            y: source.y,
          };
          return diagonal({
            source: o,
            target: o,
          });
        })
        .remove();
  
      // Stash the old positions for transition.
      nodes.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
  
      function moveMainContainerG(newX, newY) {
        svg.attr('transform', `translate(${newX},${newY})`);
        zoomBehaviours.translate([newX, newY]);
        zoomBehaviours.scale(1);
      }
  
      if (param && param.locate) {
        let x = 0;
        let y = 0;
  
        nodes.forEach((d) => {
          if (d.uniqueIdentifier === param.locate) {
            x = d.x;
            y = d.y;
          }
        });
  
        // normalize for width/height
        const newX = -x + (params.chartWidth / 2);
        const newY = -y + (params.chartHeight / 2);
  
        moveMainContainerG(newX, newY);
      }
  
      if (param && param.centerSelectedNode) {
        // normalize for width/height
        const newX = params.chartWidth / 2;
        const newY = params.chartHeight / 2;
  
        moveMainContainerG(newX, newY);
      }
  
      if (param && param.horizontalCentering) {
        // normalize for width/height
        const newX = (params.chartWidth / 2) - (attrs.nodeWidth / 2);
        moveMainContainerG(newX, 0);
      }
  
      /* ################  TOOLTIP  ############################# */
  
      function tooltipContent(item) {
        return `
          <div class='customTooltip'>
            <div class='tooltip-title'>${item.label}</div>
          </div>
        `;
      }
  
      function tooltipHoverHandler(d) {
        const content = tooltipContent(d);
        tooltip.html(content);
  
        tooltip.transition()
          .duration(200).style('opacity', '1').style('display', 'block');
        d3.select(this).attr('cursor', 'pointer').attr('stroke-width', 50);
  
        let y = d3.event.pageY;
        let x = d3.event.pageX;
  
        // restrict tooltip to fit in borders
        if (y < 220) {
          y += 220 - y;
          x += 130;
        }

        if (y > attrs.height - 300) {
          y -= 300 - (attrs.height - y);
        }

        tooltip.style('top', `${y-150}px`)
          .style('left', `${x - 470}px`);
      }
  
      function tooltipOutHandler() {
        tooltip.transition()
          .duration(200)
          .style('opacity', '0').style('display', 'none');
        d3.select(this).attr('stroke-width', 5);
      }
  
      nodeGroup.on('click', tooltipHoverHandler);
  
      nodeGroup.on('dblclick', tooltipOutHandler);
  
      function equalToEventTarget() {
        return this === d3.event.target;
      }
  
      d3.select('body').on('click', () => {
        const outside = tooltip.filter(equalToEventTarget).empty();
        if (outside) {
          tooltip.style('opacity', '0').style('display', 'none');
        }
      });
    }
  
    function getCollapsibleSymbol(isCollapsed) {
      return isCollapsed ? '+' : '-';
    }
  
    // Toggle children on click.
    function click(d) {
      var clickedId = d3.select(this).attr('data-id');
      var isCollapsing = 1^d3.select(this).attr('isCollapsed')
      d3.select(this).attr('isCollapsed', isCollapsing)
      d3.select(this).select('text').text(getCollapsibleSymbol(isCollapsing));

      clickChild(d, {id: clickedId, isCollapsed: isCollapsing})
    }

    function clickChild(d, params) {
      console.log(d)
      if(!params.isCollapsed) {
        if(!d.children) d.children = []
        d._children.map((e)=>{ //expanding
          if(e.uniqueIdentifier == params.id && params.isCollapsed == 0) {
            if(e.isHeader) {
              expandChildren(d, e)
            } else {
              d.children.push(e);
              let index = d._children.indexOf(e)
              d._children.splice(index, 1)
            } 
          } 
        })
        update(d, {clickedId: params.id}); return;
      }
      if(params.isCollapsed) {
        if(!d._children) d._children = []
        d._children.map(e=>{
          if(e.uniqueIdentifier == params.id && params.isCollapsed == 1) {
            collapseChildren(d, e)
          }
        })
        // d.children.map((e)=>{ //collapsing
        //   if(!d._children) d._children = []
        //   if(e.uniqueIdentifier == params.id && params.isCollapsed == 1)
        //     {
        //       if(e.isHeader) {
        //         collapseChildren(d, e)
        //       } else {
        //         d._children.push(e);
        //         let index = d.children.indexOf(e)
        //         d.children.splice(index, 1)
        //       }
        //     }
        // })
        update(d, {clickedId: params.id}); return;
      }
      
    }

    function expandChildren(d, e) {
      if (e._children)
        e._children.map((c)=>{
          if(!d.children) d.children = []
          d.children.push(c);
          let index = d._children.indexOf(c)
          if(index >= 0)
            d._children.splice(index, 1)
        })
    }

    function collapseChildren(d, e) {
      console.log('collapsing...', e._children)
      if(e._children) {
        e._children.map((c)=>{
          let index = d.children.indexOf(c)
          if(index >= 0)
            d.children.splice(index, 1)
        })
      }
    }
  
    // ########################################################
  
    // Redraw for zoom
    function redraw() {
      svg.attr('transform', `translate(${d3.event.translate}) scale(${d3.event.scale})`);
    }
  
    // ############################# Function Area #######################
  
    function wrap(content, width) {
      content.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1; // ems
        const x = text.attr('x');
        const y = text.attr('y');
        const dy = 0; // parseFloat(text.attr('dy')),
        let tspan = text.text(null)
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', `${dy}em`);
  
        // eslint-disable-next-line no-cond-assign
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > width) {
            lineNumber += 1;
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = text.append('tspan')
              .attr('x', x)
              .attr('y', y)
              .attr('dy', `${(lineNumber * lineHeight) + dy}em`)
              .text(word);
          }
        }
      });
    }
  
    function addPropertyRecursive(propertyName, propertyValueFunction, element) {
      if (element[propertyName]) {
        element[propertyName] = `${element[propertyName]} ${propertyValueFunction(element)}`;
      } else {
        element[propertyName] = propertyValueFunction(element);
      }
      if (element.children) {
        element.children.forEach((v) => {
          addPropertyRecursive(propertyName, propertyValueFunction, v);
        });
      }
      if (element._children) {
        element._children.forEach((v) => {
          addPropertyRecursive(propertyName, propertyValueFunction, v);
        });
      }
    }
  
    // function getChildrenCount(node) {
    //   let count = 1;
    //   countChilds(node);
    //   return count;
    //
    //   function countChilds(childNode) {
    //     const childs = childNode.children ? childNode.children : childNode._children;
    //     if (childs) {
    //       childs.forEach((v) => {
    //         count += 1;
    //         countChilds(v);
    //       });
    //     }
    //   }
    // }
  
    function reflectResults(results) {
      const htmlStringArray = results.map((result) => `
          <div class='list-item'>
            <a>
              <div class='image-wrapper'>
                <img class='image' src='${result.imageUrl}' alt='' />
              </div>
              <div class='description'>
                <p class='name'>${result.label}</p>
                <p class='position-name'>${result.positionName}</p>
                <p class='area'>${result.area}</p>
              </div>
              <div class='buttons'>
                <a target='_blank' href='${result.profileUrl}'>
                  <button class='btn-search-box btn-action'>View Profile</button>
                </a>
                <button
                  class='btn-search-box btn-action btn-locate'
                  onclick='params.functions.locate(${result.uniqueIdentifier})'
                >Locate</button>
              </div>
            </a>
          </div>
        `);
  
      const htmlString = htmlStringArray.join('');
      params.functions.clearResult();
  
      const parentElement = get('.result-list');
      const old = parentElement.innerHTML;
      parentElement.innerHTML = htmlString + old;
      set('.search-box .result-header', `RESULT - ${htmlStringArray.length}`);
    }
  
    function clearResult() {
      set('.result-list', '<div class=\'buffer\'></div>');
      set('.search-box .result-header', 'RESULT');
    }
  
    // function listen() {
    //   const input = get('.search-box .search-input');
    //
    //   input.addEventListener('input', () => {
    //     const value = input.value ? input.value.trim() : '';
    //     if (value.length < 3) {
    //       params.functions.clearResult();
    //     } else {
    //       const searchResult = params.functions.findInTree(params.data, value);
    //       params.functions.reflectResults(searchResult);
    //     }
    //   });
    // }
  
    function searchItems() {
      d3.selectAll('.search-box')
        .transition()
        .duration(250)
        .style('width', '350px');
    }
  
    function closeSearchBox() {
      d3.selectAll('.search-box')
        .transition()
        .duration(250)
        .style('width', '0px')
        .each('end', () => {
          params.functions.clearResult();
          clear('.search-input');
        });
    }
  
    function findInTree(rootElement, searchText) {
      const result = [];
      // use regex to achieve case insensitive search and avoid string creation using toLowerCase method
      const regexSearchWord = new RegExp(searchText, 'i');
  
      recursivelyFindIn(rootElement, searchText);
  
      return result;
  
      function recursivelyFindIn(item) {
        if (item.label.match(regexSearchWord)) {
          result.push(item);
        }
  
        const childItems = item.children ? item.children : item._children;
        if (childItems) {
          childItems.forEach((childItem) => {
            recursivelyFindIn(childItem, searchText);
          });
        }
      }
    }
  
    // function back() {
    //   show(['.btn-action']);
    //   hide(['.customTooltip-wrapper', '.btn-action.btn-back', '.department-information']);
    //   clear(params.selector);
    //
    //   params.mode = 'full';
    //   params.data = hierarchicalFunctions.deepNestedCopy(params.pristinaData);
    //   drawHierarchyChart(params);
    // }
  
    function expandAll() {
      expand(attrs.root);
      update(attrs.root);
    }
  
    function expand(d) {
      if (d.children) {
        d.children.forEach(expand);
      }
  
      if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
      }
  
      if (d.children) {
        // if node has children and it's expanded, then  display -
        setToggleIsCollapsed(d, false);
      }
    }
  
    function collapse(d) {
      if (d._children) {
        d._children.forEach(collapse);
      }
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
  
      if (d._children) {
        // if node has children and it's collapsed, then  display +
        setToggleIsCollapsed(d, true);
      }
    }
  
    function setCollapsibleStatusProperty(d) {
      if (d._children) {
        d.isCollapsed = true;
      } else if (d.children) {
        d.isCollapsed = false;
      }
    }
  
    function setToggleIsCollapsed(d, isCollapsed) {
      d.isCollapsed = isCollapsed;
      d3.select(`*[data-id='${d.uniqueIdentifier}']`).select('text').text(getCollapsibleSymbol(isCollapsed));
    }
  
    /* recursively find item in subtree */
    function findSelectedNode(d) {
      // if (d.isLoggedItem) {
      //   expandParents(d);
      // }
      if (d._children) {
        d._children.forEach((ch) => {
          ch.parent = d;
          findSelectedNode(ch);
        });
      } else if (d.children) {
        d.children.forEach((ch) => {
          ch.parent = d;
          findSelectedNode(ch);
        });
      }
    }
  
    function locateRecursive(d, id) {
      if (d.uniqueIdentifier === id) {
        expandParents(d);
      } else if (d._children) {
        d._children.forEach((ch) => {
          ch.parent = d;
          locateRecursive(ch, id);
        });
      } else if (d.children) {
        d.children.forEach((ch) => {
          ch.parent = d;
          locateRecursive(ch, id);
        });
      }
    }
  
    /* expand current nodes collapsed parents */
    function expandParents(node) {
      let d = node;
      while (d.parent) {
        d = d.parent;
        if (!d.children) {
          d.children = d._children;
          d._children = null;
          setToggleIsCollapsed(d, false);
        }
      }
    }
  
    function toggleFullScreen() {
      if (document.fullScreenElement || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
        if (document.documentElement.requestFullScreen) {
          document.documentElement.requestFullScreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullScreen) {
          document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        d3.select(`${params.selector} svg`).attr('width', screen.width).attr('height', screen.height);
      } else {
        if (document.cancelFullScreen) {
          document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        }
        d3.select(`${params.selector} svg`).attr('width', params.chartWidth).attr('height', params.chartHeight);
      }
    }
  
    function showSelectedNode() {
      /* collapse all and expand logged item nodes */
      if (!attrs.root.children) {
        attrs.root.children = attrs.root._children;
      }
      if (attrs.root.children) {
        attrs.root.children.forEach(collapse);
        attrs.root.children.forEach(findSelectedNode);
      }
  
      update(attrs.root, { centerSelectedNode: true });
    }
  
    // locateRecursive
    function locate(id) {
      /* collapse all and expand logged item nodes */
      if (!attrs.root.children && !attrs.root.uniqueIdentifier === id) {
        attrs.root.children = attrs.root._children;
      }
      if (attrs.root.children) {
        attrs.root.children.forEach(collapse);
        attrs.root.children.forEach((ch) => {
          locateRecursive(ch, id);
        });
      }
  
      update(attrs.root, { locate: id });
    }
  
    // function show(selectors) {
    //   display(selectors, 'initial');
    // }
    //
    // function hide(selectors) {
    //   display(selectors, 'none');
    // }
    //
    // function display(selectors, displayProp) {
    //   selectors.forEach((selector) => {
    //     const elements = getAll(selector);
    //     elements.forEach((element) => {
    //       element.style.display = displayProp;
    //     });
    //   });
    // }
  
    function set(selector, value) {
      const elements = getAll(selector);
      elements.forEach((element) => {
        element.innerHTML = value;
        element.value = value;
      });
    }
  
    function clear(selector) {
      set(selector, '');
    }
  
    function get(selector) {
      return document.querySelector(selector);
    }
  
    function getAll(selector) {
      return document.querySelectorAll(selector);
    }
  }
  