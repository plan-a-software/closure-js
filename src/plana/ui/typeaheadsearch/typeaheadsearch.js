/* Copyright (C) Plan-A Software Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Kiran Lakhotia <info@plan-a-software.co.uk>, 2014
 */
'use strict';

goog.provide('plana.ui.ts.TypeaheadSearch');

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('plana.ui.ac.AutoComplete');
goog.require('plana.ui.ts.TypeaheadSearchRenerer');

/**
 * This class extends {@link plana.ui.ac.AutoComplete}
 * to provide an additional search button that can be used
 * to trigger a fulltext search by adding the 'fullsearch'
 * parameter to requests
 *
 * @constructor
 * @extends {plana.ui.ac.AutoComplete}
 * @param {goog.Uri} uri The server resources to use for fetching a list of
 *     suggestions
 * @param {boolean=} opt_multi Whether to allow multiple entries separated with
 *     semi-colons or commas
 * @param {boolean=} opt_useSimilar Use similar matches. e.g. "gost" => "ghost"
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper
 */
plana.ui.ts.TypeaheadSearch = function(
  uri, opt_multi, opt_useSimilar, opt_domHelper) {
  plana.ui.ac.AutoComplete.call(this,
    uri, opt_multi, opt_useSimilar,
    new plana.ui.ts.TypeaheadSearchRenerer(), opt_domHelper);

  /**
   * The last token that was used for a full text
   * search
   * @type {?string}
   * @private
   */
  this.lastSearchToken_ = null;
};
goog.inherits(plana.ui.ts.TypeaheadSearch, plana.ui.ac.AutoComplete);

/**
 * @override
 */
plana.ui.ts.TypeaheadSearch.prototype.disposeInternal = function() {
  plana.ui.ts.TypeaheadSearch.superClass_.disposeInternal.call(this);
  this.lastSearchToken_ = null;
};

/**
 * @override
 */
plana.ui.ts.TypeaheadSearch.prototype.enterDocument = function() {
  plana.ui.ts.TypeaheadSearch.superClass_.enterDocument.call(this);
  var renderer = this.componentRenderer;
  var handler = this.getHandler();
  handler.listen(renderer.getSearchButton(this, this.dom_),
    goog.events.EventType.CLICK, this.onSearch_, false, this);
};


/**
 * @override
 */
plana.ui.ts.TypeaheadSearch.prototype.exitDocument = function() {
  var renderer = this.getRenderer();
  var handler = this.getHandler();
  handler.unlisten(renderer.getSearchButton(this, this.dom_),
    goog.events.EventType.CLICK, this.onSearch_, false, this);
  plana.ui.ts.TypeaheadSearch.superClass_.exitDocument.call(this);
};

/**
 * Callback for when the search button is explicitly pressed. Only search
 * if the input value is unknown
 * @param {goog.events.BrowserEvent} e
 * @private
 */
plana.ui.ts.TypeaheadSearch.prototype.onSearch_ = function(e) {
  var renderer = this.componentRenderer;
  var input = renderer.getInput(this, this.dom_);
  var token = input.value;
  if (this.lastSearchToken_ != token) {
    /**
     * @this {plana.ui.ts.TypeaheadSearch}
     * @param {string} tk The search token
     * @param {Array.<plana.ui.ac.RemoteObject>} matches
     */
    var matchHandler = function(tk, matches) {
      this.lastSearchToken_ = tk;
      if (matches.length == 0) {
        //no match
        this.dispatchEvent({
          type: plana.ui.ts.TypeaheadSearch.EventType.NO_MATCH,
          token: tk,
          matches: []
        });
      } else {
        //send matches to listeners
        this.dispatchEvent({
          type: plana.ui.ts.TypeaheadSearch.EventType.MATCHES,
          token: tk,
          matches: goog.array.map(matches, function(m, indx, a) {
            return m.getData();
          })
        });
      }
      tk = matches = null;
    };
    var remoteMatcher = this.cachingMatcher.getRemoteMatcher();
    var queryData = remoteMatcher.getQueryData();
    queryData.set('fullsearch', 1);
    var bound = goog.bind(matchHandler, this);
    remoteMatcher.requestMatchingRows(token, -1, bound);
    queryData.remove('fullsearch');
    bound = matchHandler = null;
  }
};

/**
 * Callback for when a user pressed enter.
 * This function searches the server.
 * @param {goog.events.Event} e The event object with additional
 * row and index properties
 * @override
 */
plana.ui.ts.TypeaheadSearch.prototype.onSelect = function(e) {
  this.onSearch_();
};

/**
 * List of event types dispatched by this UI
 * component.
 * @enum {!string}
 */
plana.ui.ts.TypeaheadSearch.EventType = {
  /**
   * @desc The event dispatched if the filter text does
   *    not match any menu items.
   */
  NO_MATCH: goog.events.getUniqueId('nomatch'),
  /**
   * @desc The event dispatched if a search resulted in
   *    matches.
   */
  MATCHES: goog.events.getUniqueId('match')
};
