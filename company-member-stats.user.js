// ==UserScript==
// @name         Company Member Stats
// @namespace    https://github.com/purple52/company-member-stats
// @version      0.0.2
// @description  Add a copy button for extracting Spartan company member stats
// @author       David Edwards
// @match        https://www.halowaypoint.com/en-us/spartan-companies/*
// @require      https://code.jquery.com/jquery-1.12.0.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      halowaypoint.com
// @run-at       document-idle
// ==/UserScript==

var Member = function (memberLinkElement, playerDocument) {
    this.gamertag  = $(memberLinkElement).text();
    this.href  = $(memberLinkElement).attr('href');
    var rank = document.evaluate('//div[contains(@class,"spartan-rank")]/p/text()', playerDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    this.rank = rank.nodeValue;
};

function memberFrom(memberLinkElement) {
    return new Promise(function(resolve, reject) {
        get($(memberLinkElement).attr('href')).then(function(response) {
            var doc = new DOMParser().parseFromString(response.responseText, "text/html");
            resolve(new Member(memberLinkElement, doc));
        });
    });
}

function get(url) {
    return new Promise(function(resolve, reject) {
        GM_xmlhttpRequest({
            method: 'GET',
            url:    url,
            onload: function(response) {
                resolve(this);
            }
        });
    });
}

// Creates a header for placement of script buttons.
function buildScriptHeader() {
    $('div#company-member-stats-script').remove();
    $('div.clan-edit-bio').prepend(
        '<div id="company-member-stats-script" class="region">' +
            '<div id="company-member-stats-script-buttons" class="content">' +
                '<p class="text--smallest">Company Member Stats</p>' +
                '<hr/>' +
            '</div>' +
            '<div class="content text--smallest">' +
                 '&gt; <span id="company-member-stats-script-status">Ready</span>' +
            '</div>' +
        '</div>'
    );
}

// Creates a copy button for generating stats and add it to the header
function buildStatsCopyButton() {

    var copyButton = $('<a/>')
        .addClass('button')
        .css('margin', '2px')
        .text('Members + Rank')
        .click(
            function () {
                copyMembersAndRank();
            }
        )
    ;

    $('div#company-member-stats-script-buttons').append(copyButton);
}

// Display a message and fade it out
function showMsg(text, fade, duration) {
    var resetStyle = function (elem) {
        $(elem).stop().show().css('opacity', 1);
    };

    // Cancel any animations and reset to full visibility
    resetStyle('#company-member-stats-script-status');

    // Set the content and begin a fade out
    // On completion, reset to "Ready" message
    $('#company-member-stats-script-status').html(text);
    if (fade) {
        $('#company-member-stats-script-status').fadeOut(
            duration || 5000,
            function () { resetStyle(this); $(this).html('Ready'); }
        );
    }
}

// Collect members and rank and copy to clipboard
function copyMembersAndRank() {
    showMsg('Working...');
    collectMembers([], $('ul.clan-member-list li p.gamertag a')).then(function(members) {
        console.log(members);
        var text = buildCopyText(members);
        try {
            GM_setClipboard(text);
            showMsg('Members and ranks copied to clipboard', true);
        } catch (e) {
            showMsg('Failed to copy members and ranks to clipboard, manually copy from JavaScript console', true);
            console.log('Members and ranks:\n' + 'BEGIN\n' + text + 'END');
        }
    });
}

// Recursively collect members into an array
function collectMembers(completedMembers, remainingMembers) {
    return new Promise(function(resolve, reject) {
        memberFrom(remainingMembers[0]).then(function(member) {
            var completedCount = completedMembers.length;
            var remainingCount = remainingMembers.length;
            showMsg('Working... processed ' + member.gamertag + ' (' + (completedCount + 1) + '/' + (completedCount + remainingCount) + ')');
            if (remainingCount == 1) {
                resolve(completedMembers.concat([member]));
            } else {
                resolve(collectMembers(completedMembers.concat([member]), remainingMembers.slice(1)));
            }
        });
    });
}

// Converts the members into text for copying
function buildCopyText(members) {
    return members.map(
        function (member) { return member.gamertag + '\t' + member.rank; }
    ).join('\n') + '\n';
}

(function() {
    'use strict';

    buildScriptHeader();
    buildStatsCopyButton();
})();
