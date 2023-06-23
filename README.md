# UCGIS-bok-dataviz-tools

UCGIS-bok-dataviz-tools is an script to parse a json-ld file and visualize it in a circle packing d3 layout.

## Installation

Using npm: 

```bash
npm i @ucgis/find-in-bok-dataviz-tools
```

## Usage

Place a div and give it this id: 'graph'.
If you want to show also the textual information, place a div and give this id: 'textInfo'.

```html
<div id="graph"> </div>
<div id="textInfo"></div>
```

In Javascript call the function visualizeBOKData(url, numVersion)


- url : is the location BD
- numVersion : the number of the version you want to visualize


```javascript
import * as bok from '@ucgis/find-in-bok-dataviz-tools';
[...]

bok.visualizeBOKData('https://ucgis-bok-default-rtdb.firebaseio.com/', 'current') // will render the graphical view and the textual view from the version 1 in database

```

Other functions

```javascript
import * as bok from '@ucgis/find-in-bok-dataviz';
[...]

selectedNodes = bok.searchInBoK(searchText); // returns an array of concepts matching the searchText string

bok.browseToConcept(conceptShortName); // navigates to the concept specified

// Examples
selectedNodes = bok.searchInBoK('Analytics');
bok.browseToConcept('GIST'); // navigates to root concept
bok.browseToConcept('AM'); // navigates to Analytical Methods concept

```


