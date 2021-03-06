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
goog.provide('plana.ui.ac.RemoteObjectMatcher.Event');
goog.provide('plana.ui.ac.RemoteObjectMatcher.EventType');

goog.require('goog.Disposable');
goog.require('goog.Uri');
goog.require('goog.Uri.QueryData');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('goog.net.XmlHttpFactory');

/**
 * This class is an alternative to {@link goog.ui.ac.RemoteArrayMatcher}. It
 * submits an ajax request to fetch an array of matches. The array may contain
 * plain strings or objects. If the matches are objects, then the objects
 * 'should' contain a 'caption' property. If they don't, a user will see the
 * result of 'toString' in the suggestion list. This class fires events if the
 * server returned matches, the ajax request failed (i.e. server error), or the
 * server returned an invalid response for some reason.
 *
 * @constructor
 * @extends {goog.events.EventTarget}
 *
 * @param {goog.Uri} uri The uri which generates the auto complete matches. The
 *     search term is passed to the server as the 'token' query param
 * @param {goog.net.XhrIo=} opt_xhrIo Optional XhrIo object to use. By default
 *     we create a new instance
 * @param {goog.net.XmlHttpFactory=} opt_xmlHttpFactory Optional factory to use
 *     when creating XMLHttpRequest objects
 * @param {boolean=} opt_multi Whether to allow multiple entries
 * @param {boolean=} opt_noSimilar If true, request that the server does not do
 *     similarity matches for the input token against the dictionary
 *     The value is sent to the server as the 'use_similar' query param which is
 *     either "1" (opt_noSimilar==false) or "0" (opt_noSimilar==true)
 */
plana.ui.ac.RemoteObjectMatcher = function(
  uri, opt_xhrIo, opt_xmlHttpFactory, opt_multi, opt_noSimilar) {
  goog.events.EventTarget.call(this);

  /**
   * Reference to the URI used to request matches
   * @type {goog.Uri}
   * @protected
   */
  this.uri = uri;

  //set constant query parameters
  var queryData = this.uri.getQueryData();
  queryData.set(plana.ui.ac.RemoteObjectMatcher.USE_SIMILAR_PARA,
    String(Number(opt_noSimilar || false)));
  queryData.set(plana.ui.ac.RemoteObjectMatcher.MULTI_TOKEN_PARA,
    String(Number(opt_multi || false)));
  queryData = null;

  /**
   * The class for performing ajax requests
   * @type {goog.net.XhrIo}
   * @protected
   */
  this.xhrIo = opt_xhrIo || new goog.net.XhrIo(opt_xmlHttpFactory);

  /**
   * Boolean flag whether the request object
   * is ready to handle another request
   * @type {boolean}
   * @protected
   */
  this.xhrIoReady = true;

  /**
   * A map of request headers to include in
   * send requests
   * @type {?Object}
   * @private
   */
  this.xhrIoRequestHeaders_ = null;

  /**
   * The type of request, i.e. 'GET' or 'POST'
   * @type {string}
   * @private
   */
  this.xhrIoRequestType_ = 'POST';

  /**
   * The event handler used by this class to listen to
   * ajax events
   * @type {goog.events.EventHandler}
   * @private
   */
  this.eventHandler_ = new goog.events.EventHandler(this);

  //start listening to ajax events
  this.eventHandler_.listen(this.xhrIo,
    goog.object.getValues(goog.net.EventType),
    this.onRequestCompleted, false);
};
goog.inherits(plana.ui.ac.RemoteObjectMatcher, goog.events.EventTarget);

/**
 * The name of the token parameter passed to the server
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.TOKEN_PARA = 'token';

/**
 * The parameter name of the flag that specifies whether the server
 * should return matches that are similar to the search token
 * @see goog.ui.ac.AutoComplete for an explanation of this flag
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.USE_SIMILAR_PARA = 'user_similar';

/**
 * The parameter name of the flag that specifies whether the autocomplete
 * supports multiple tokens
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.MULTI_TOKEN_PARA = 'multi';


/**
 * The name of the parameter that specifies how many matches the
 * server should return
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.MAX_MATCHES_PARA = 'max_matches';

/**
 * The name of the parameter that contains the entire input value,
 * including previous tokens
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.FULL_STRING_PARA = 'fullstring';

/**
 * The property name that will contain the server matches, if
 * the server is returning additional information along the matches,
 * for example, total available matches on the server
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.MATCHES_PROPERTY = 'matches';

/**
 * The property name that will contain the total count of matches
 * available on the server
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.TOTAL_PROPERTY = 'total';


/**
 * The property name of objects that contain the caption to display
 * in the list of suggestions
 * @type {string}
 */
plana.ui.ac.RemoteObjectMatcher.CAPTION_PROPERTY = 'caption';

/**
 * @override
 * @suppress {checkTypes}
 */
plana.ui.ac.RemoteObjectMatcher.prototype.disposeInternal = function() {
  plana.ui.ac.RemoteObjectMatcher.superClass_.disposeInternal.call(this);
  /** not strictly nec., because we're disposing of eventHandler_, but
   * better to be explicit :) */
  this.eventHandler_.unlisten(this.xhrIo,
    goog.object.getValues(goog.net.EventType),
    this.onRequestCompleted, false, this);

  this.uri = null;
  if (!this.xhrIoReady)
    this.xhrIo.abort();
  this.xhrIo.dispose();
  this.xhrIo = null;
  this.xhrIoReady = null;
  this.xhrIoRequestHeaders_ = null;
  this.xhrIoRequestType_ = null;
  this.eventHandler_.dispose();
  this.eventHandler_ = null;
};


/**
 * Callback for when the server request completed.
 * @param {goog.events.Event} e
 * @protected
 */
plana.ui.ac.RemoteObjectMatcher.prototype.onRequestCompleted = function(e) {
  /** make sure we're not disposed while the server request was pending */
  if (this.isDisposed()) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  switch (e.type) {
    case goog.net.EventType.SUCCESS:
      var response = null;
      try {
        response = this.xhrIo.getResponseJson();
      } catch (ex) {
        response = null;
      }
      if (response != null) {
        /**
         * @type {Array.<String|Object>}
         */
        var serverMatches;
        /**
         * @type {number}
         */
        var totalMatches;
        if (goog.isArray(response)) {
          serverMatches = /**@type {Array.<String|Object>}*/ (response);
          totalMatches = serverMatches.length;
        } else {
          serverMatches =
          /**@type {Array.<String|Object>}*/
          (response[plana.ui.ac.RemoteObjectMatcher.MATCHES_PROPERTY]);
          totalMatches =
          /**@type {number}*/
          (response[plana.ui.ac.RemoteObjectMatcher.TOTAL_PROPERTY]);
        }
        /** @type {Array.<plana.ui.ac.RemoteObject>} */
        var matches = [];
        for (var i = 0, match; match = serverMatches[i]; ++i)
          matches.push(new plana.ui.ac.RemoteObject(match));
        this.dispatchEvent(
          new plana.ui.ac.RemoteObjectMatcher.Event(
            plana.ui.ac.RemoteObjectMatcher.EventType.MATCHES, this,
            matches, totalMatches));
        matches = null;
      } else {
        this.dispatchEvent(
          new goog.events.Event(
            plana.ui.ac.RemoteObjectMatcher.EventType.INVALID_RESPONSE, this));
      }
      break;
    case goog.net.EventType.ERROR:
    case goog.net.EventType.TIMEOUT:
      this.dispatchEvent(
        new goog.events.Event(
          plana.ui.ac.RemoteObjectMatcher.EventType.FAILED_REQUEST, this));
      break;
    case goog.net.EventType.ABORT:
    case goog.net.EventType.COMPLETE:
      break;
    case goog.net.EventType.READY:
      this.xhrIoReady = true;
      break;
  }
};

/**
 * Retrieve a set of matching rows from the server via ajax
 * @param {string} token The text that should be matched; passed to the server
 *     as the 'token' query param
 * @param {number} maxMatches The maximum number of matches requested from the
 *     server; passed as the 'max_matches' query param.  The server is
 *     responsible for limiting the number of matches that are returned
 * @param {string} fullstring The complete text, including token
 */
plana.ui.ac.RemoteObjectMatcher.prototype.requestMatches = function(
  token, maxMatches, fullstring) {

  if (!this.xhrIoReady) {
    this.xhrIo.abort();
  }

  var queryData = this.uri.getQueryData();
  queryData.set(plana.ui.ac.RemoteObjectMatcher.TOKEN_PARA, token);
  queryData.set(plana.ui.ac.RemoteObjectMatcher.MAX_MATCHES_PARA,
    String(maxMatches));
  queryData.set(plana.ui.ac.RemoteObjectMatcher.FULL_STRING_PARA, fullstring);

  this.xhrIoReady = false;
  this.xhrIo.send(this.uri.getPath(),
    /**@type {string} */
    (this.xhrIoRequestType_),
    queryData.toString(), this.xhrIoRequestHeaders_);
};

/**
 * This function returns the query data of the request objec so that
 * a user can modify it on the fly
 * @return {goog.Uri.QueryData}
 */
plana.ui.ac.RemoteObjectMatcher.prototype.getQueryData = function() {
  return this.uri.getQueryData();
};

/**
 * Setter for a map of headers to add to requests.
 * @param {?Object} headers Headers to send along ajax requests
 */
plana.ui.ac.RemoteObjectMatcher.prototype.setRequestHeaders = function(
  headers) {
  this.xhrIoRequestHeaders_ = headers;
};

/**
 * Setter for the type of request, i.e. 'GET' or 'POST'.
 * @param {!string} requestType The request type of the ajax request
 */
plana.ui.ac.RemoteObjectMatcher.prototype.setRequestType = function(
  requestType) {
  goog.asserts.assert(
    goog.string.caseInsensitiveCompare(requestType, 'get') == 0 ||
    goog.string.caseInsensitiveCompare(requestType, 'post') == 0,
    'request type must be get or post');

  this.xhrIoRequestType_ = requestType;
};

/**
 * Setter for the timeout for ajax requests
 * @param {!number} timeout Set to 0 for no timeout
 */
plana.ui.ac.RemoteObjectMatcher.prototype.setRequestTimeout = function(
  timeout) {
  this.xhrIo.setTimeoutInterval(timeout);
};

/**
 * List of events dispatched by this class
 * @enum {!string}
 */
plana.ui.ac.RemoteObjectMatcher.EventType = {
  /**
   * @desc Event dispatched if ajax request
   * did not succeed
   */
  FAILED_REQUEST: goog.events.getUniqueId('failed'),
  /**
   * @desc Event dispatched when an array of matches has
   * been returned from the server
   */
  MATCHES: goog.events.getUniqueId('matches'),
  /**
   * @desc Event dispatched if the server object was not
   * an array
   */
  INVALID_RESPONSE: goog.events.getUniqueId('invalid')
};

/**
 * A custom event class that has a matches property
 * @constructor
 * @extends {goog.events.Event}
 * @param {string} type The event type
 * @param {plana.ui.ac.RemoteObjectMatcher} target The remote
 *     matcher instance that triggered the event
 * @param {Array.<plana.ui.ac.RemoteObject>} matches Array of
 *     matches
 * @param {number=} opt_total Optional number of total matches
 *     available on the server
 */
plana.ui.ac.RemoteObjectMatcher.Event = function(
  type, target, matches, opt_total) {
  goog.events.Event.call(this, type, target);

  /**
   * Optional total number of matches available on the server
   * @type {number}
   * @public
   */
  this.total = opt_total || 0;

  /**
   * Optional array of matches
   * @type {Array.<plana.ui.ac.RemoteObject>}
   * @public
   */
  this.matches = matches;
};
goog.inherits(plana.ui.ac.RemoteObjectMatcher.Event, goog.events.Event);

/**
 * A class to wrap a suggestion item returned by the server.
 * If the server object has a 'caption' property, this property
 * will be used to display the row in the autocomplete component.
 * Otherwise the 'toString' method is used
 * @constructor
 * @extends {goog.Disposable}
 * @param {Object|string|null} data The match object returned by the server
 */
plana.ui.ac.RemoteObject = function(data) {
  goog.Disposable.call(this);

  /**
   * A match object.
   * @type {?(Object|string)}
   * @private
   */
  this.data_ = data;
};
goog.inherits(plana.ui.ac.RemoteObject, goog.Disposable);

/**
 * This function returns a clone
 * @return {plana.ui.ac.RemoteObject}
 */
plana.ui.ac.RemoteObject.prototype.clone = function() {
  return new plana.ui.ac.RemoteObject(this.data_);
};

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
  if (goog.isDefAndNotNull(
    this.data_[plana.ui.ac.RemoteObjectMatcher.CAPTION_PROPERTY]))
    return this.data_[plana.ui.ac.RemoteObjectMatcher.CAPTION_PROPERTY];
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
 * @return {?(Object|string)}
 */
plana.ui.ac.RemoteObject.prototype.getData = function() {
  return this.data_;
};