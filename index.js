import * as d3 from "d3";

var Relationtype = {
  SIMILAR: "similarTo",
  PREREQUISITE: "prerequisites",
  POSTREQUISITE: "postrequisites",
  BROADER: "broader",
  NARROWER: "narrower",
  DEMONSTRATES: "demonstrates",
  SUBCONCEPT: "is subconcept of",
  SIMILARTO: "is similar to",
  RELATEDTO: "is related to",
  PREREQUISITEOF: "is prerequisite of"
};

const TEMPLATE_IdGraph = 'graph';
const TEMPLATE_IdText = 'textInfo';

const width = 932;
const height = width;
let view;

let codesColors = ['AM', 'CP', 'CV', 'DA', 'DC', 'DM', 'FC', 'GS', 'KE', 'PD', 'UC'];
let colorsHEX = ['#9999F8', '#AEB9C8', '#F19E70', '#4EAEEA', '#FBE7A3', '#B1CF95', '#F19E9C', '#439798', '#E4EEDC', '#A3C1E3', '#e4e4e4'];

let selectedNodes = [];
let allNodes = {};
let rootNodeCode = '';
let fullBoK = {};
let fullParsedBoK = {};
let versionsCodes = [];

let allVersions = [];
let currSelCode = '';
let currVersion = 'current';

const COLOR_STROKE_SELECTED = 'black';
const COLOR_STROKE_DEFAULT = '#090909';
const COLOR_STROKE_RESULTS = '#080808';

export function parseBOKData(bokJSON, v) {
  // loop all nodes
  // if (v == "current")
  allNodes[v] = [];
  versionsCodes[v] = [];

  bokJSON.concepts.forEach((n, index) => {
    var node = {
      name: n.name,
      code: n.code,
      nameShort: n.code,
      description: n.description,
      content: n.content,
      selfAssesment: n.selfAssesment,
      uri: n.link,
      id: index,
      value: 1,
      children: [],
      parents: [],
      demonstrableSkills: [],
      contributors: [],
      sourceDocuments: [],
      relatedTo: []
    };
    allNodes[v].push(node);
    versionsCodes[v].push(n.code.toLowerCase());

/*     if (!codesColors.includes(n.code.substring(0, 2)))
      codesColors.push(n.code.substring(0, 2)) */

  });

 // console.log(codesColors)

  // add children - parent
  bokJSON.relations.forEach(r => {
    if (r.name === Relationtype.SUBCONCEPT) {
      if (r.target != r.source) {
        if (!allNodes[v][r.target].children.includes(allNodes[v][r.source]))
          allNodes[v][r.target].children.push(allNodes[v][r.source]);
        if (!allNodes[v][r.source].parents.includes(allNodes[v][r.target]))
          allNodes[v][r.source].parents.push(allNodes[v][r.target]);
      } 
    } if (r.name === Relationtype.RELATEDTO) {
      if (r.target != r.source) {
        if (!allNodes[v][r.target].relatedTo.includes(allNodes[v][r.source]))
          allNodes[v][r.target].relatedTo.push(allNodes[v][r.source]);
        if (!allNodes[v][r.source].relatedTo.includes(allNodes[v][r.target]))
          allNodes[v][r.source].relatedTo.push(allNodes[v][r.target]);
      }
    }
  });

  // add skills
  bokJSON.skills.forEach(skill => {
    if (skill.concepts && skill.concepts.length > 0) {
      skill.concepts.forEach(skillconcept => {
        allNodes[v][skillconcept].demonstrableSkills.push(skill.name ? skill.name : '');
      });
    }
  });

  // add contributors
  if (bokJSON.contributors) {
    bokJSON.contributors.forEach(con => {
      if (con.concepts && con.concepts.length > 0) {
        con.concepts.forEach(c => {
          allNodes[v][c].contributors.push({
            name: con.name ? con.name : '',
            description: con.description ? con.description : '',
            url: con.url ? con.url : ''
          });
        });
      }
    });
  }

  // add source documents
  bokJSON.references.forEach(ref => {
    if (ref.concepts && ref.concepts.length > 0) {
      ref.concepts.forEach(c => {
        allNodes[v][c].sourceDocuments.push({
          name: ref.name ? ref.name : '',
          description: ref.description ? ref.description : '',
          url: ref.url ? ref.url : ''
        });
      });
    }
  });

  // find root node
  let rootNode;

  for (let i = 0; i < allNodes[v].length; i++) {
    if (allNodes[v][i].parents.length == 0 && allNodes[v][i].children.length > 0) {
      rootNode = allNodes[v][i];
      rootNodeCode = allNodes[v][i].code.toLowerCase();
      console.log("Version " + v + " root node " + i + " code " + rootNodeCode)
      break;
    }
  }

  return rootNode;

}
export function getCurrSelCode() {
  return currSelCode;
}

window.getCurrSelCode = getCurrSelCode;

export function browseToConcept(code) {
  if (code) {
    var node = d3.select('#node-' + code.toLowerCase()).data();
    // Can not find the node, find in old versions
    if (node.length == 0) {
      let foundInOld = false;
      let versionToDisplay = 'current';
      allVersions.forEach(v => {
        if (versionsCodes[v].includes(code.toLowerCase())) {
          foundInOld = true;
          versionToDisplay = v;
        }
      });
      // if found in old version
      if (foundInOld) {
        currSelCode = code.toLowerCase();
        visualizeBoKVersion(versionToDisplay);
        displayMsgObsoleteV(code, versionToDisplay);
        // else navigate to root and show error
      } else {
        navigateToRoot();
        if (code.length > 0) {
          displayError(code);
        }
      }

    } else {
      zoom(node[0]);
      console.log(node[0])
      displayConcept(node[0]);
    }
  } else {
    navigateToRoot();
  }
}
window.browseToConcept = browseToConcept;

export function zoomToCode(code) {
  var node = d3.select('#node-' + code.toLowerCase()).data();
  if (node.length > 0) {
    zoom(node[0]);
  }
}
window.zoomToCode = zoomToCode;

export async function getBoKData(url) {
  return new Promise(resolve => {
    d3.json(url + '.json ').then((bok, error) => {
      fullBoK = bok;
      resolve('BoK Loaded - resolve');
      if (error) throw error;
    });
  });
}

export function visualizeBoKVersion(version) {

  currVersion = version;

  var bokData = fullParsedBoK[version];

  var pack = data => d3.pack()
    .size([width, height])
    .padding(3)
    (d3.hierarchy(bokData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value));

  var root = pack(bokData);

  let focus = root;

  d3.select('#' + TEMPLATE_IdGraph)
    .select("svg").selectAll("circle").remove();
  d3.select('#' + TEMPLATE_IdGraph)
    .select("svg").selectAll("text").remove();

  const svg = d3.select('#' + TEMPLATE_IdGraph)
    .select("svg")
    .on("click", () => zoom(root));

  const node = svg.append("g")
    .selectAll("circle")
    .data(root)
    .join("circle")
    .attr("fill", d => {
      let code = codesColors.indexOf(d.data.code.substring(0, 2));
      return colorsHEX[code];
    })
    .attr("stroke", COLOR_STROKE_DEFAULT)
    .attr("stroke-width", "0.2px")
    .attr("id", d => "node-" + d.data.code.toLowerCase())
    .on("click", (event, d) => {
      if (focus !== d) {
        event.currentTarget.style.stroke = COLOR_STROKE_SELECTED;
        zoom(d);
        displayConcept(d);
      }
      event.stopPropagation();
    }).on("mouseover", function (d) {
      if (this.attributes.stroke.value === COLOR_STROKE_DEFAULT) this.style.strokeWidth = 1
    })
    .on("mouseleave", function (d) {
      if (this.attributes.stroke.value === COLOR_STROKE_DEFAULT) this.style.strokeWidth = 0.2
    });

  const label = svg.append("g")
    .style("font", "12px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("fill-opacity", d => d.parent === root ? 1 : 0)
    .style("display", d => d.parent === root ? "inline" : "none")
    .each(function (d) { //This function inserts a label and adds linebreaks, avoiding lines > 13 characters
      var arr = d.data.name.split(' '),
        maxLabelLength = 13,
        final = [arr[0]];
      for (var i = 1, j = 0; i < arr.length; i++) {
        (final[j].length + arr[i].length < maxLabelLength) ? final[j] += ' ' + arr[i] : (j++, final[j] = arr[i]);
      }
      final.forEach((t, i) => d3.select(this).append('tspan').text(t).attr('dy', i ? '1em' : -0.5 * (j - 1) + 'em').attr('x', 0).attr('text-anchor', 'middle').attr('class', 'tspan' + i));
    })

  zoomTo([root.x, root.y, root.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];
    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(d) {
    const focus0 = focus;
    focus = d;

    const transition = svg.transition()
      .duration(1000)
      .tween("zoom", d => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });

    label
      .filter(function (d) {
        return d.parent === focus || this.style.display === "inline" || (d === focus && (d.children == null || d.children == []));
      })
      .transition(transition)
      .style("fill-opacity", function (d) {
        return d.parent === focus || (d === focus && (d.children == null || d.children == [])) ? 1 : 0;
      })
      .on("start", function (d) {
        if (d.parent === focus || (d === focus && (d.children == null || d.children == [])))
          this.style.display = "inline";
      })
      .on("end", function (d) {
        if (d.parent !== focus && (d !== focus && (d.children == null || d.children == [])))
          this.style.display = "none";
      });

  }

  window.zoom = zoom;
  browseToConcept(currSelCode);

}

window.visualizeBoKVersion = visualizeBoKVersion;


export async function visualizeBOKData(url, version) {

  await getBoKData(url);

  fullParsedBoK[version] = parseBOKData(fullBoK[version], version);

  d3.select('#' + TEMPLATE_IdGraph)
    .append("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .style("display", "block")
    .style("cursor", "pointer");

  visualizeBoKVersion(version);

}

export function searchInBoK(string, searchCode = true, searchName = true, searchDes = true, searchSkills = true, searchSD = false) {
  cleanSearchInBOK();
  cleanTextInfo();

  let searchInputFieldDoc = string.trim().toLowerCase();
  if (searchInputFieldDoc != "" && searchInputFieldDoc != " ") {

    let results = allNodes[currVersion].filter((n) => {
      let filterBool = searchCode && n.code.toLowerCase().includes(searchInputFieldDoc) ||
        searchName && n.name.toLowerCase().includes(searchInputFieldDoc) ||
        searchDes && n.description.toLowerCase().includes(searchInputFieldDoc);

      // search for coincidences in demonstrableSkills
      if (searchSkills && !filterBool) {
        n.demonstrableSkills.forEach(s => {
          if (s.toLowerCase().includes(searchInputFieldDoc)) {
            filterBool = true;
          }
        });
      }
      if (searchSD && !filterBool) {
        n.sourceDocuments.forEach(s => {
          if (s.name.toLowerCase().includes(searchInputFieldDoc)) {
            filterBool = true;
          }
        });

      }
      return filterBool;
    });

    results.forEach(n => {
      d3.select('#node-' + n.code.toLowerCase())
        .attr("stroke-width", "2px")
        .attr("stroke", COLOR_STROKE_RESULTS);
    });

    selectedNodes = results;

    return selectedNodes;
  } else {
    browseToConcept(rootNodeCode);
    // navigateToRoot();
    return [];
  }
}

export function cleanSearchInBOK() {
  //clean search
  selectedNodes.forEach(n => {
    d3.select('#node-' + n.code.toLowerCase())
      .attr("stroke-width", "0.2px")
      .attr("stroke", COLOR_STROKE_DEFAULT);
  });
  selectedNodes = [];
}

export function navigateToRoot() {
  console.log("Navigate to root");
  const root = d3.select('#node-' + rootNodeCode);
  //new comment
  console.log(root.data()[0])
  displayConcept(root.data()[0]);
}

window.navigateToRoot = navigateToRoot;

export function cleanTextInfo() {
  var mainNode = document.getElementById(TEMPLATE_IdText)
  mainNode.innerHTML = "";
}

export function displayError(code) {
  console.log("Concept does not exists");
  var mainNode = document.getElementById(TEMPLATE_IdText);
  mainNode.innerHTML = "<p style='color:#c60606;'> Concept " + code + " does not exist. Use the links or the graph to navigate to a valid one. </p> " + mainNode.innerHTML;
}

export function displayMsgObsoleteV(code, version) {
  console.log("Warning, this is an old version of the Concept exists in older version, " + code + " version " + version);
  var mainNode = document.getElementById(TEMPLATE_IdText);
  if (!mainNode.innerHTML.includes('Warning: this is an obsolete BoK concept'))
    mainNode.innerHTML = "<p style='color:#c60606;'> Warning: this is an obsolete BoK concept - this concept is no longer present in the <a style='color: #007bff; font-weight: 400; cursor: pointer;' onclick='navigateToRoot(); visualizeBoKVersion(\"current\")' >current</a> version. </p> " + mainNode.innerHTML;
}

export function displayMsgOldV() {
  console.log("Warning, this is an old version the Bok ");
  var mainNode = document.getElementById(TEMPLATE_IdText);
  mainNode.innerHTML = "<p style='color:orange'> Warning: this is an old version of this BoK concept; see “\Versioning”\ below for more recent version(s) </p> " + mainNode.innerHTML;
}

//displays all available content for the currently focussed concept in the description box:
export function displayConcept(d) {
  currSelCode = d.data.code.toLowerCase();
  var mainNode = document.getElementById(TEMPLATE_IdText)
  mainNode.innerHTML = "";

  var pNode = document.createElement("p");
  pNode.innerHTML = `Permalink: <a href= 'https://gistbok-topics.ucgis.org/${d.data.code}' target='blank'> https://gistbok-topics.ucgis.org/${d.data.code}</a>`;
  mainNode.appendChild(pNode);


  var titleNode = document.createElement("h4");
  titleNode.id = "boktitle";
  titleNode.innerHTML = "[" + d.data.code + "] " + d.data.name; //display Name and shortcode of concept:

  mainNode.appendChild(titleNode);

  //display description of concept
  var descriptionNode = document.createElement("div");
  if (d.data.description != null && d.data.description != ' ') {
    var headline = "<h5>Description</h5>";
    var currentTxt = "<div id='bokCurrentDescription'>" + d.data.description + "</div><br>";
    descriptionNode.innerHTML = headline + currentTxt;
  } else
    descriptionNode.innerHTML = "";

  mainNode.appendChild(descriptionNode);

  if (d.parent != null) {
    var parentNode = document.createElement("div");
    parentNode.innerHTML = `<h5>Superconcept:</h5><div id='bokParentNode'><a style='color: #007bff; font-weight: 400; cursor: pointer;' class='concept-name' id='sc-${d.parent.data.code}' onclick='browseToConcept(\"${d.parent.data.code}\")'>[${d.parent.data.code}] ${d.parent.data.name}</a> </div><br>`;
    mainNode.appendChild(parentNode);
  }

  var infoNode = document.createElement("div");

  //display subconcepts (if any):
  d.data.children && d.data.children.length > 0 ? displayChildren(d.data.children, infoNode, "Subconcepts") : null;

  // display related relation
  d.data.relatedTo && d.data.relatedTo.length > 0 ? displayChildren(d.data.relatedTo, infoNode, "Related concepts") : null;

  d.data.demonstrableSkills && d.data.demonstrableSkills.length > 0 ? displayTextList(d.data.demonstrableSkills, infoNode, "Skills") : null;

  d.data.contributors && d.data.contributors.length > 0 ? displayLinksList(d.data.contributors, infoNode, "Contributors", "bokcontributors") : null;
  d.data.sourceDocuments && d.data.sourceDocuments.length > 0 ? displayLinksList(d.data.sourceDocuments, infoNode, "Source Documents", "boksource") : null;

  mainNode.appendChild(infoNode);

};

//displays a list of nodes such as children
export function displayChildren(array, domElement, headline) {

  array.sort((a, b) => a.code.localeCompare(b.code));
  var text = "<h5>" + headline + " [" + array.length + "] </h5><div><ul>";
  array.forEach(c => {
    text += "<a style='color: #007bff; font-weight: 400; cursor: pointer;' class='concept-name' id='sc-" + c.code + "' onclick='browseToConcept(\"" + c.code + "\")'>[" + c.code + '] ' + c.name + "</a> <br>";
  });
  text += "</ul></div>";
  domElement.innerHTML += text;
};

// displays links such as contributors and sourceDocuments
export function displayLinksList(array, domElement, headline, id) {

  var text = "<h5>" + headline + " [" + array.length + "] </h5><div id='" + id + "'><ul>";
  array.forEach(l => {
    text += "<a style='color: #007bff; font-weight: 400; cursor: pointer;' class='concept-name' href='" + l.url + "' target='_blank' >" + l.name + "</a> <br>";
  });
  text += "</ul></div>";
  domElement.innerHTML += text;
};

// displays list such as skills
export function displayTextList(array, domElement, headline) {

  var text = "<h5>" + headline + " [" + array.length + "] </h5><div id='bokskills'><ul>";
  array.forEach(l => {
    text += "<li><a>" + l + "</a></li>";
  });
  text += "</ul></div>";
  domElement.innerHTML += text;
};