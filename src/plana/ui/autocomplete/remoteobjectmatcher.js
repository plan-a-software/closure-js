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

goog.provide('plana.ui.ac.RemoteObject');
goog.provide('plana.ui.ac.RemoteObjectMatcher');

goog.require('goog.Uri');
goog.require('goog.ui.ac.RemoteArrayMatcher');

/**
 * This class extends {@link goog.ui.ac.RemoteArrayMatcher} to handle
 * an array of {@link plana.ui.ac.RemoteObject} objects instead of just
 * string arrays. However, we also support plain string arrays too
 *
 * @constructor
 * @extends {goog.ui.ac.RemoteArrayMatcher}
 *
 * @param {string} url The Uri which generates the auto complete matches. The
 *     search term is passed to the server as the 'token' query param
 * @param {boolean=} opt_noSimilar If true, request that the server does not do
 *     similarity matches for the input token against the dictionary
 *     The value is sent to the server as the 'use_similar' query param which is
 *     either "1" (opt_noSimilar==false) or "0" (opt_noSimilar==true)
 */
plana.ui.ac.RemoteObjectMatcher = function(url, opt_noSimilar) {
  goog.ui.ac.RemoteArrayMatcher.call(this, url, opt_noSimilar);

  /**
   * An optional object to use for logging exceptions
   * when parsing the response from the server
   * @type {?Object}
   * @private
   */
  this.errorLogger_ = null;

  /**
   * Reference to the URI used to request matches
   * @type {goog.Uri}
   * @private
   */
  this.uri_ = new goog.Uri(url);
};
goog.inherits(plana.ui.ac.RemoteObjectMatcher, goog.ui.ac.RemoteArrayMatcher);

/**
 * Returns whether the suggestions should be updated. We're ignoring
 * empty strings (tokens)
 * @param {string} uri The base URI of the request target
 * @param {string} token Current token in autocomplete
 * @param {number} maxMatches Maximum number of matches required
 * @param {boolean} useSimilar A hint to the server
 * @param {string=} opt_fullString Complete text in the input element
 * @return {boolean} Whether new matches be requested
 * @override
 */
plana.ui.ac.RemoteObjectMatcher.prototype.shouldRequestMatches =
  function(uri, token, maxMatches, useSimilar, opt_fullString) {
    return !goog.string.isEmptySafe(token);
};

/**
 * Parses and retrieves the array of suggestions from XHR response
 * @param {string} responseText The XHR response text
 * @return {Array.<plana.ui.ac.RemoteObject>} The array of suggestions
 * @override
 */
plana.ui.ac.RemoteObjectMatcher.prototype.parseResponseText = function(
  responseText) {
  var matches = [];
  // If there is no response text, unsafeParse will throw a syntax error.
  if (responseText) {
    /** @preserveTry */
    try {
      var json = goog.json.unsafeParse(responseText);
      goog.asserts.assert(goog.isArray(json));
      for (var i = 0, match; match = json[i]; ++i)
        matches.push(new plana.ui.ac.RemoteObject(match));
    } catch (exception) {
      if (this.errorLogger_)
        this.errorLogger_.log(exception);
    }
  }
  return /** @type {Array.<plana.ui.ac.RemoteObject>} */ (matches);
};

/**
 * @override
 */
plana.ui.ac.RemoteObjectMatcher.prototype.disposeInternal = function() {
  plana.ui.ac.RemoteObjectMatcher.superClass_.disposeInternal.call(this);
  this.errorLogger_ = null;
  this.uri_ = null;
};

/**
 * This function returns the query data of the request objec so that
 * a user can modify it on the fly
 * @return {goog.Uri.QueryData}
 */
plana.ui.ac.RemoteObjectMatcher.prototype.getQueryData = function() {
  return this.uri_.getQueryData();
};

/**
 * Setter for the error logger
 * @param {?Object} logger An object that must implement a 'log' function
 */
plana.ui.ac.RemoteObjectMatcher.prototype.setErrorLogger = function(logger) {
  this.errorLogger_ = logger;
};

/**
 * Builds a complete GET-style URL, given the base URI and autocomplete related
 * parameter values.
 * @param {string} uri The base URI of the request target
 * @param {string} token Current token in autocomplete
 * @param {number} maxMatches Maximum number of matches required
 * @param {boolean} useSimilar A hint to the server
 * @param {string=} opt_fullString Complete text in the input element
 * @return {?string} The complete url. Return null if no request should be sent
 * @override
 */
plana.ui.ac.RemoteObjectMatcher.prototype.buildUrl = function(uri,
  token, maxMatches, useSimilar, opt_fullString) {

  var url = new goog.Uri(uri);
  //add additional user query data
  var queryData = this.uri_.getQueryData();
  var keys = queryData.getKeys();
  for (var i = 0, key; key = keys[i]; ++i) {
    url.setParameterValue(key, queryData.get(key));
  }

  return plana.ui.ac.RemoteObjectMatcher.superClass_.buildUrl.call(this,
    url.toString(), token, maxMatches, useSimilar, opt_fullString);
};

/**
 * A class to wrap a suggestion item returned by the server.
 * If the server object has a 'caption' property, this property
 * will be used to display the row in the autocomplete component.
 * Otherwise the 'toString' method is used
 * @constructor
 * @extends {goog.Disposable}
 * @param {!Object} data The match object returned by the server
 */
plana.ui.ac.RemoteObject = function(data) {
  goog.Disposable.call(this);

  /**
   * A match object.
   * @type {!Object}
   * @private
   */
  this.data_ = data;
};
goog.inherits(plana.ui.ac.RemoteObject, goog.Disposable);

/**
 * If the server match has a caption property, we return
 * this property. Otherwise call 'toString'
 * @return {!string}
 * @override
 */
plana.ui.ac.RemoteObject.prototype.toString = function() {
  if (this.data_ == null)
    return '';
  if (goog.isString(this.data_))
    return this.data_;
  if (goog.isDefAndNotNull(this.data_['caption']))
    return this.data_['caption'];
  return this.data_.toString();
};

/**
 * @override
 */
plana.ui.ac.RemoteObject.prototype.disposeInternal = function() {
  plana.ui.ac.RemoteObject.superClass_.disposeInternal.call(this);
  this.data_ = null;
};

/**
 * Returns the match data
 * @return {!Object}
 */
plana.ui.ac.RemoteObject.prototype.getData = function() {
  return this.data_;
};