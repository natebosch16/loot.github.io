'use strict';

// Globals
///////////////////

var github = new Octokat();

var repos = [
    [ "Oblivion", "oblivion" ],
    [ "Skyrim", "skyrim" ],
    [ "Fallout 3", "fallout3" ],
    [ "Fallout: New Vegas", "falloutnv" ]
]

var repoBranch = 'master';  //The repository branch to search.

var gameSelect = document.getElementById('gameSelectMenu');
var searchButton = document.getElementById('searchButton');
var searchBox = document.getElementById('searchBox');
var resultsDiv = document.getElementById('results');

// Functions
///////////////////

function isRegexEntry(name) {
    var end = name.substring(name.length - 5).toLowerCase();
    if (end == '\\.esp' || end == '\\.esm') {
        return true;
    }
}

function readMasterlist(err, data) {
    if (err) {
        console.log(err);
        document.getElementById('progress').classList.add('hidden');
        return;
    }

    var masterlist = jsyaml.safeLoad(data);
    document.getElementById('progress').classList.add('hidden');

    /* Do search here. */
    console.log("Starting search.");
    if (masterlist.hasOwnProperty('plugins')) {
        for (var i in masterlist['plugins']) {
            var index = -1;
            if (isRegexEntry(masterlist["plugins"][i].name)) {
                if (RegExp(masterlist["plugins"][i].name, 'i').test(searchBox.value)) {
                    index = i;
                }
            } else if (masterlist["plugins"][i].name.toLowerCase().indexOf(searchBox.value.toLowerCase()) !== -1) {
                index = i;
            }
            if (index != -1) {
                console.log("Match: " + JSON.stringify(masterlist["plugins"][index]));
                var code = document.createElement('code');
                code.textContent = '  - ' + jsyaml.safeDump(masterlist["plugins"][index]).replace(new RegExp('\n', 'g'), '\n    ').trim();
                resultsDiv.appendChild(code);
            }
        }
    }

    if (!resultsDiv.firstElementChild.nextElementSibling) {
        var elem = document.createElement('p');
        elem.textContent = "No matching entries found.";
        resultsDiv.appendChild(elem);
    }

    console.log("Search complete.");
}

function fetchMasterlist(err, data) {
    if (err) {
        console.log(err);
        document.getElementById('progress').classList.add('hidden');
        return;
    }

    for (var i = 0; i < data.tree.length; ++i) {
        if (data.tree[i].path == 'masterlist.yaml') {
            github.repos('loot', gameSelect.selected).git.blobs(data.tree[i].sha).read(readMasterlist);
            break;
        }
    }
}

function fetchTree(err, data) {
    if (err) {
        console.log(err);
        document.getElementById('progress').classList.add('hidden');
        return;
    }

    github.repos('loot', gameSelect.selected).git.trees(data.object.sha).fetch(fetchMasterlist);
}

function onSearchInit(evt) {
    /* The GitHub Repository API can't be used because it only supports
       files of sizes up to 1 MB. The Skyrim masterlist is larger than this, so
       use the GitHub Git Data API instead. */
    github.repos('loot', gameSelect.selected).git.refs('heads/' + repoBranch).fetch(fetchTree);

    /* Clear any previous search results. */
    var progress = document.getElementById('progress');
    while (progress.nextElementSibling) {
        progress.parentElement.removeChild(progress.nextElementSibling);
    }

    console.log("Loading masterlist...");
    progress.classList.remove('hidden');
}

// Startup Code
///////////////////

/* Fill the drop-down games box with stuff. */
for (var i=0; i < repos.length; ++i) {
    var option = document.createElement('paper-item');
    option.textContent = repos[i][0];
    option.setAttribute('data-game', repos[i][1]);
    option.setAttribute('noink', '');
    gameSelect.appendChild(option);
}

searchButton.addEventListener("click", onSearchInit, false);
searchBox.addEventListener('change', onSearchInit, false);

/* If the page was loaded with a PHP-style GET string `?game=<game>&search=<search>`, read it for the search term and perform a search. */
var pos = document.URL.indexOf("?game=");
if (pos != -1) {
    var pos2 = document.URL.indexOf("&search=");
    searchBox.value = decodeURIComponent(document.URL.substring(pos2+8));
    var game = decodeURIComponent(document.URL.substring(pos+6, pos2).toLowerCase());
    if (game == "oblivion") {
        gameSelect.selected = repos[0][1];
    } else if (game == "skyrim") {
        gameSelect.selected = repos[1][1];
    } else if (game == "fallout3") {
        gameSelect.selected = repos[2][1];
    } else if (game == "falloutnv") {
        gameSelect.selected = repos[3][1];
    } else {
        gameSelect.selected = repos[0][1];
    }

    searchButton.click();
} else {
    gameSelect.selected = repos[0][1];
}
