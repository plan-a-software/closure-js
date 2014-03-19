// Copyright (C) Plan-A Software Ltd. All Rights Reserved.
//
// Written by Kiran Lakhotia <kiran@plan-a-software.co.uk>, 2014
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

goog.provide('plana.ui.ac.CachingObjectMatcher');
goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.async.Throttle');
goog.require('goog.events');
goog.require('goog.ui.ac.ArrayMatcher');
goog.require('goog.ui.ac.RenderOptions');
goog.require('plana.ui.ac.RemoteObject');
goog.require('plana.ui.ac.RemoteObjectMatcher');

/**
 * This class is based on {@link goog.ui.ac.CachingMatcher}. It differs
 * in the following ways:
 * - it disposes of cached objects (i.e. calls
 *   {@link plana.ui.ac.RemoteObject#dispose})
 * - it defines three states the cache is in:
 *    * fetching server matches
 *    * server returned matches
 *    * no matches found
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {string} url The url of the server that returns autocomplete matches.
 *     The search term is passed to the server as the 'token' query param
 * @param {boolean=} opt_noSimilar If true, request that the server does not do
 *     similarity matches for the input token against the dictionary
 *     The value is sent to the server as the 'use_similar' query param which is
 *     either "1" (opt_noSimilar==false) or "0" (opt_noSimilar==true)
 */
plana.ui.ac.CachingObjectMatcher = function(url, opt_noSimilar) {
  goog.Disposable.call(this);

  /**
   * The client side cache
   * @type {!Array.<!plana.ui.ac.RemoteObject>}}
   * @private
   */
  this.rows_ = [];

  /**
   * Set of stringified rows, for fast deduping. Each element of this.rows_
   * is stored in rowStrings_ as (' ' + row) to ensure we avoid builtin
   * properties like 'toString'
   * @type {Object.<string, boolean>}
   * @private
   */
  this.rowStrings_ = {};

  /**
   * Maximum number of rows in the cache. If the cache grows larger than this,
   * the entire cache will be emptied
   * @type {number}
   * @private
   */
  this.maxCacheSize_ = 1000;

  /**
   * The remote object matcher
   * @type {plana.ui.ac.RemoteObjectMatcher}
   * @private
   */
  this.remoteMatcher_ =
    new plana.ui.ac.RemoteObjectMatcher(url, opt_noSimilar);

  /**
   * Number of matches to request from the remote
   * matcher
   * @type {number}
   * @private
   */
  this.remoteMatcherMaxMatches_ = 100;

  /**
   * The timer to control how often remote requests are
   * submitted to the server in response to key events
   * @type {goog.async.Throttle}
   * @private
   */
  this.throttledTriggerBaseMatch_ =
    new goog.async.Throttle(this.triggerBaseMatch_, 150, this);

  /**
   * The request token to use for the remote matcher
   * @type {string}
   * @private
   */
  this.mostRecentToken_ = '';

  /**
   * The handler to use for handling matches returned by
   * the server
   * @type {Function}
   * @private
   */
  this.mostRecentMatchHandler_ = null;

  /**
   * The maximum number of matches to return from
   * local cache
   * @type {number}
   * @private
   */
  this.cacheMaxMatches_ = 10;

  /**
   * The set of rows which we last displayed.
   *
   * NOTE(reinerp): The need for this is subtle. When a server result comes
   * back, we don't want to suddenly change the list of results without the user
   * doing anything. So we make sure to add the new server results to the end of
   * the currently displayed list
   *
   * We need to keep track of the last rows we displayed, because the "similar
   * matcher" we use locally might otherwise reorder results
   *
   * @type {Array.<!plana.ui.ac.RemoteObject>}
   * @private
   */
  this.mostRecentMatches_ = [];

  /**
   * The state of the cache manager and its base matcher
   * @type {!number}
   * @private
   */
  this.currentState_ = plana.ui.ac.CachingObjectMatcher.State.READY;

  /**
   * The function to handle matches returned from the server. The function
   * has 'this' bound
   * @type {function}
   * @private
   */
  this.remoteMatchCb_ = goog.bind(this.onRemoteMatch_, this);
};
goog.inherits(plana.ui.ac.CachingObjectMatcher, goog.Disposable);

/**
 * @override
 */
plana.ui.ac.CachingObjectMatcher.prototype.disposeInternal = function() {
  plana.ui.ac.CachingObjectMatcher.superClass_.disposeInternal.call(this);
  for (var i = 0, match; match = this.rows_[i]; ++i) {
    match.dispose();
  }
  this.rows_.length = 0;
  this.rows_ = null;
  this.rowStrings_ = null;
  this.maxCacheSize_ = null;
  this.remoteMatcher_.dispose();
  this.remoteMatcher_ = null;
  this.remoteMatcherMaxMatches_ = null;
  this.throttledTriggerBaseMatch_.dispose();
  this.throttledTriggerBaseMatch_ = null;
  this.mostRecentToken_ = null;
  this.mostRecentMatchHandler_ = null;
  this.cacheMaxMatches_ = null;
  this.mostRecentMatches_.length = 0;
  this.mostRecentMatches_ = null;
  this.currentState_ = null;
  this.remoteMatchCb_ = null;
};

/**
 * Sets the number of milliseconds with which to throttle the match requests
 * on the underlying matcher
 *
 * Default value: 150
 *
 * @param {number} throttleTime The value to set
 */
plana.ui.ac.CachingObjectMatcher.prototype.setThrottleTime = function(
  throttleTime) {
  //dispose of old throttle
  this.throttledTriggerBaseMatch_.dispose();
  this.throttledTriggerBaseMatch_ =
    new goog.async.Throttle(this.triggerBaseMatch_, throttleTime, this);
};


/**
 * Sets the maxMatches to use for the remote matcher
 *
 * Default value: 100
 *
 * @param {number} maxMatches The value to set
 */
plana.ui.ac.CachingObjectMatcher.prototype.setRemoteMatcherMaxMatches =
  function(maxMatches) {
    this.remoteMatcherMaxMatches_ = maxMatches;
};


/**
 * Sets the maximum size of the local cache. If the local cache grows larger
 * than this size, it will be emptied
 *
 * Default value: 1000
 *
 * @param {number} maxCacheSize The value to set
 */
plana.ui.ac.CachingObjectMatcher.prototype.setMaxCacheSize = function(
  maxCacheSize) {
  this.maxCacheSize_ = maxCacheSize;
};

/**
 * This function is taken from {@link goog.ui.ac.ArrayMatcher}. It
 * matches the token against the specified rows, first looking for prefix
 * matches and if that fails, then looking for similar matches
 *
 * @param {string} token Token to match
 * @param {number} maxMatches Max number of matches to return
 * @param {!Array.<plana.ui.ac.RemoteObject>} rows Rows to search for matches
 * @return {!Array.<plana.ui.ac.RemoteObject>} Rows that match
 */
plana.ui.ac.CachingObjectMatcher.prototype.getCachedMatches = function(
  token, maxMatches, rows) {
  var matches =
    this.getPrefixMatchesForRows(token, maxMatches, rows);

  if (matches.length == 0) {
    matches = this.getSimilarMatchesForRows(token, maxMatches, rows);
  }
  return matches;
};

/**
 * This function is taken from {@link goog.ui.ac.ArrayMatcher}. It
 * matches the token against the start of words in the row
 * @param {string} token Token to match
 * @param {number} maxMatches Max number of matches to return
 * @param {!Array.<plana.ui.ac.RemoteObject>} rows Rows to search for matches
 * @return {!Array.<plana.ui.ac.RemoteObject>} Rows that match
 */
plana.ui.ac.CachingObjectMatcher.prototype.getPrefixMatchesForRows = function(
  token, maxMatches, rows) {
  var matches = [];

  if (!goog.string.isEmptySafe(token)) {
    var escapedToken = goog.string.regExpEscape(token);
    var matcher = new RegExp('(^|\\W+)' + escapedToken, 'i');

    for (var i = 0, row; row = rows[i] && matches.length < maxMatches; ++i) {
      if (row.toString().match(matcher)) {
        matches.push(row);
      }
    }
  }
  return matches;
};

/**
 * This function is taken from {@link goog.ui.ac.ArrayMatcher}. It
 * matches the token against similar rows, by calculating "distance" between the
 * terms
 * @param {string} token Token to match
 * @param {number} maxMatches Max number of matches to return
 * @param {!Array.<plana.ui.ac.RemoteObject>} rows Rows to search for matches
 * @return {!Array.<plana.ui.ac.RemoteObject>} The best maxMatches rows
 */
plana.ui.ac.CachingObjectMatcher.prototype.getSimilarMatchesForRows = function(
  token, maxMatches, rows) {
  var results = [];

  for (var index = 0, row; row = rows[index]; ++index) {
    var str = token.toLowerCase();
    var txt = row.toString().toLowerCase();
    var score = 0;

    if (txt.indexOf(str) != -1) {
      score = parseInt((txt.indexOf(str) / 4).toString(), 10);

    } else {
      var arr = str.split('');

      var lastPos = -1;
      var penalty = 10;

      for (var i = 0, c; c = arr[i]; ++i) {
        var pos = txt.indexOf(c);

        if (pos > lastPos) {
          var diff = pos - lastPos - 1;

          if (diff > penalty - 5) {
            diff = penalty - 5;
          }

          score += diff;

          lastPos = pos;
        } else {
          score += penalty;
          penalty += 5;
        }
      }
    }

    if (score < str.length * 6) {
      results.push({
        obj: row,
        score: score,
        index: index
      });
    }
  }

  results.sort(function(a, b) {
    var diff = a.score - b.score;
    if (diff != 0) {
      return diff;
    }
    return a.index - b.index;
  });

  var matches = [];
  for (var i = 0; i < maxMatches && i < results.length; ++i) {
    matches.push(results[i].obj);
  }

  return matches;
};

/**
 * This function is taken from {@link goog.ui.ac.CachingMatcher}.
 * It passes matches to the autocomplete
 * @param {string} token Token to match
 * @param {number} maxMatches Max number of matches to return
 * @param {Function} matchHandler callback to execute after matching
 */
plana.ui.ac.CachingObjectMatcher.prototype.requestMatchingRows =
  function(token, maxMatches, matchHandler) {

    this.cacheMaxMatches_ = maxMatches;
    this.mostRecentToken_ = token;
    this.mostRecentMatchHandler_ = matchHandler;

    var fetching = this.remoteMatcher_.shouldRequestMatches(null, token);
    if (fetching) {
      this.currentState_ = plana.ui.ac.CachingObjectMatcher.State.FETCHING;
    } else {
      this.currentState_ = plana.ui.ac.CachingObjectMatcher.State.READY;
    }

    this.throttledTriggerBaseMatch_.fire();

    var matches = this.getCachedMatches(token, maxMatches, this.rows_);

    matchHandler(token, matches);
    this.mostRecentMatches_ = matches;
};


/**
 * This function is taken from {@link goog.ui.ac.CachingMatcher}.
 * Adds the specified rows to the cache
 * @param {!Array.<!plana.ui.ac.RemoteObject>} rows
 * @private
 */
plana.ui.ac.CachingObjectMatcher.prototype.addRows_ = function(rows) {
  goog.array.forEach(rows, function(row) {
    var str = row.toString();
    // The ' ' prefix is to avoid colliding with builtins like toString.
    if (!this.rowStrings_[' ' + str]) {
      this.rows_.push(row);
      this.rowStrings_[' ' + str] = true;
    }
  }, this);
};


/**
 * Checks if the cache is larger than the maximum cache size. If so clears it
 * @private
 */
plana.ui.ac.CachingObjectMatcher.prototype.clearCacheIfTooLarge_ = function() {
  if (this.rows_.length > this.maxCacheSize_) {
    for (var i = 0, match; match = this.rows_[i]; ++i) {
      match.dispose();
    }
    this.rows_.length = 0;
    this.rowStrings_ = {};
  }
};


/**
 * This function is adapted from {@link goog.ui.ac.CachingMatcher}.
 * Triggers a match request against the base matcher. This function is
 * unthrottled, so don't call it directly; instead use
 * this.throttledTriggerBaseMatch_
 * @private
 */
plana.ui.ac.CachingObjectMatcher.prototype.triggerBaseMatch_ = function() {
  this.remoteMatcher_.requestMatchingRows(this.mostRecentToken_,
    this.remoteMatcherMaxMatches_, this.remoteMatchCb_);
};


/**
 * This function is adapted from {@link goog.ui.ac.CachingMatcher}.
 * Handles a match response from the base matcher
 * @param {string} token The token against which the base match was called.
 * @param {!Array.<!plana.ui.ac.RemoteObject>} matches The matches returned by
 *       the base matcher
 * @private
 */
plana.ui.ac.CachingObjectMatcher.prototype.onRemoteMatch_ = function(
  token, matches) {
  // NOTE(reinerp): The user might have typed some more characters since the
  // base matcher request was sent out, which manifests in that token might be
  // older than this.mostRecentToken_. We make sure to do our local matches
  // using this.mostRecentToken_ rather than token so that we display results
  // relevant to what the user is seeing right now

  // NOTE(reinerp): We compute a diff between the currently displayed results
  // and the new results we would get now that the server results have come
  // back. Using this diff, we make sure the new results are only added to the
  // end of the list of results. See the documentation on
  // this.mostRecentMatches_ for details
  this.addRows_(matches);

  var oldMatchesSet = {};
  for (var i = 0, match; match = this.mostRecentMatches_[i]; ++i) {
    // The ' ' prefix is to avoid colliding with builtins like toString.
    oldMatchesSet[' ' + match.toString()] = true;
  }

  var newMatches = this.getCachedMatches(this.mostRecentToken_,
    this.cacheMaxMatches_, this.rows_);

  newMatches = goog.array.filter(newMatches, function(match) {
    return !(oldMatchesSet[' ' + match.toString()]);
  });

  newMatches = this.mostRecentMatches_.concat(newMatches).slice(0,
    this.cacheMaxMatches_);

  this.mostRecentMatches_ = newMatches;

  // We've gone to the effort of keeping the existing rows as before, so let's
  // make sure to keep them highlighted.
  var options = new goog.ui.ac.RenderOptions();
  options.setPreserveHilited(true);

  var fetched =
    this.remoteMatcher_.shouldRequestMatches(null, this.mostRecentToken_);
  if (newMatches.length == 0 && fetched)
    this.currentState_ = plana.ui.ac.CachingObjectMatcher.State.NO_MATCH;
  else
    this.currentState_ = plana.ui.ac.CachingObjectMatcher.State.READY;

  this.mostRecentMatchHandler_(this.mostRecentToken_, newMatches, options);

  // We clear the cache *after* running the local match, so we don't
  // suddenly remove results just because the remote match came back.
  this.clearCacheIfTooLarge_();
};

/**
 * This function returns the current state of the cache manager
 * and its base matcher
 * @return {!number}
 */
plana.ui.ac.CachingObjectMatcher.prototype.getState = function() {
  return this.currentState_;
};

/**
 * This function returns the matcher used to fetch matches via
 * ajax
 * @return {!plana.ui.ac.RemoteObjectMatcher}
 */
plana.ui.ac.CachingObjectMatcher.prototype.getRemoteMatcher = function() {
  return this.remoteMatcher_;
};

/**
 * List of events dispatched by the cache manager
 * @enum {!number}
 */
plana.ui.ac.CachingObjectMatcher.State = {
  /**
   * @desc This state indicates that the remote
   * matcher is fetching results from the server
   */
  FETCHING: 0,
  /**
   * @desc This state indicates that the server
   * could not find matches for a token
   */
  NO_MATCH: 1,
  /**
   * @desc This state indicates that matches
   * have been returned by the server
   */
  READY: 2
};
