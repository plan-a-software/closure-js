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

goog.provide('plana.ui.ac.AutoComplete');

goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('goog.math.Size');
goog.require('goog.ui.Component');
goog.require('goog.ui.ac.AutoComplete');
goog.require('goog.ui.ac.AutoComplete.EventType');
goog.require('goog.ui.ac.Renderer');
goog.require('plana.ui.ac.AutoCompleteRenderer');
goog.require('plana.ui.ac.CachingObjectMatcher');
goog.require('plana.ui.ac.InputHandler');
goog.require('plana.ui.ac.RemoteObject');

/**
 * This class is a wrapper around {@link goog.ui.ac.AutoComplete} that uses
 * a remote object matcher. The remote object matcher can retrieve autocomplete
 * suggestions as plain strings, or, custom objects. It is best if the objects
 * have a 'caption' property. This property is used to display the suggestions.
 * If an object does not have a 'caption' property, 'toString' is used instead.
 *
 * @constructor
 * @extends {goog.ui.Component}
 * @param {goog.Uri} uri The server resources to use for fetching a list of
 *     suggestions. You can add custom parameters to uri to pass to the server
 *     with every request
 * @param {boolean=} opt_multi Whether to allow multiple entries separated with
 *     semi-colons or commas
 * @param {boolean=} opt_useSimilar Use similar matches. e.g. "gost" => "ghost".
 *     This option is passed along to the server
 * @param {Object=} opt_renderer An optional renderer that implements at least
 *     'createDom' and 'getInput'. By default we use
 *     {@link plana.ui.ac.AutoCompleteRenderer}
 * @param {goog.dom.DomHelper=} opt_domHelper The dom helper
 */
plana.ui.ac.AutoComplete = function(
  uri, opt_multi, opt_useSimilar, opt_renderer, opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);

  /**
   * Custom renderer for this class. Its main job is to
   * attach custom classes to the container and its input
   * element
   * @type {plana.ui.ac.AutoCompleteRenderer}
   * @protected
   */
  this.componentRenderer = opt_renderer ||
    new plana.ui.ac.AutoCompleteRenderer();

  /**
   * The matcher that combines a local cache of matches with
   * the remote matcher
   * @type {plana.ui.ac.CachingMatcher}
   * @protected
   */
  this.cachingMatcher =
    new plana.ui.ac.CachingObjectMatcher(uri.toString(), !opt_useSimilar);

  /**
   * The renderer to render the list of suggestions for the
   * autocomplete component
   * @type {?goog.ui.ac.Renderer}
   * @private
   */
  this.autoCompleteRenderer_ = null;

  /**
   * The input handler that updates the text input when
   * a match is selected
   * @type {plana.ui.ac.InputHandler}
   * @protected
   */
  this.inputHandler = new plana.ui.ac.InputHandler(null, null, !! opt_multi);

  /**
   * The actual autocomplete component
   * @type {?goog.ui.ac.AutoComplete}
   * @protected
   */
  this.autoComplete = null;

  /**
   * The DOM to display while results are fetched from the server
   * @type {?Element}
   * @private
   */
  this.fetchingMatchesDom_ = null;

  /**
   * The image or text to display while we're fetching
   * matches from the server, e.g. a waiting animation
   * @type {Element|string}
   * @private
   */
  this.loadingContent_ = plana.ui.ac.AutoComplete.MSG_LOADING_DEFAULT;

  /**
   * The DOM to display if the server returned no matches
   * @type {?Element}
   * @private
   */
  this.noMatchesDom_ = null;

  /**
   * An optional message to display if the server did not find
   * any matches
   * @type {?string}
   * @private
   */
  this.noMatchMsg_ = plana.ui.ac.AutoComplete.MSG_NO_MATCHES_FOUND;

  /**
   * Optional placeholder to show in the input textbox
   * @type {string}
   * @private
   */
  this.placeholder_ = '';
};
goog.inherits(plana.ui.ac.AutoComplete, goog.ui.Component);

/**
 * @desc Default loading message while fetching results
 */
plana.ui.ac.AutoComplete.MSG_LOADING_DEFAULT =
  goog.getMsg('<i>Loading...</i>');

/**
 * @desc Default message if no matches were found on
 * the server
 */
plana.ui.ac.AutoComplete.MSG_NO_MATCHES_FOUND =
  goog.getMsg('<i>Could not find a match</i>');

/**
 * @override
 */
plana.ui.ac.AutoComplete.prototype.disposeInternal = function() {
  plana.ui.ac.AutoComplete.superClass_.disposeInternal.call(this);
  this.componentRenderer = null;
  this.cachingMatcher.dispose();
  this.cachingMatcher = null;
  if (this.autoCompleteRenderer_ != null) {
    this.autoCompleteRenderer_.dispose();
    this.autoCompleteRenderer_ = null;
  }
  this.inputHandler.dispose();
  this.inputHandler = null;
  if (this.autoComplete != null) {
    this.autoComplete.dispose();
    this.autoComplete = null;
  }
  this.fetchingMatchesDom_ = null;
  this.loadingContent_ = null;
  this.noMatchesDom_ = null;
  this.noMatchMsg_ = null;
  this.placeholder_ = null;
};


/**
 * @override
 */
plana.ui.ac.AutoComplete.prototype.createDom = function() {
  var dom = this.dom_;

  var renderer = this.componentRenderer;
  var container = renderer.createDom(dom);
  this.setElementInternal(container);

  var input = renderer.getInput(this, dom);
  input['placeholder'] = this.placeholder_;

  this.autoCompleteRenderer_ = new goog.ui.ac.Renderer(container);

  this.autoComplete = new goog.ui.ac.AutoComplete(
    this.cachingMatcher, this.autoCompleteRenderer_, this.inputHandler);

  this.autoComplete.setParentEventTarget(this);

  this.inputHandler.attachAutoComplete(this.autoComplete);
  this.inputHandler.attachInputs(input);

  this.createLoadingDom_();

  this.createNoMatchDom_();
};

/**
 * This function creates the DOM to show a message if there are no
 * matches
 * @private
 */
plana.ui.ac.AutoComplete.prototype.createNoMatchDom_ = function() {
  if (this.noMatchMsg_ == null) {
    if (this.noMatchesDom_ != null) {
      var parent = this.dom_.getParentElement(this.noMatchesDom_);
      if (parent != null)
        this.dom_.removeNode(this.noMatchesDom_);
    }
    this.noMatchesDom_ = null;
  } else {
    var dom = this.dom_;
    if (this.noMatchesDom_ == null) {
      this.noMatchesDom_ = dom.createDom('div', {
        'class': 'ac-fetching-row'
      });
    }
    if (goog.isString(this.noMatchMsg_))
      this.noMatchesDom_.innerHTML = this.noMatchMsg_;
    else {
      dom.removeChildren(this.noMatchesDom_);
      dom.appendChild(this.noMatchesDom_, this.noMatchMsg_);
    }
  }
};

/**
 * This function creates the DOM to show the loading image or text
 * @private
 */
plana.ui.ac.AutoComplete.prototype.createLoadingDom_ = function() {
  if (this.loadingContent_ == null) {
    if (this.fetchingMatchesDom_ != null) {
      var parent = this.dom_.getParentElement(this.fetchingMatchesDom_);
      if (parent != null)
        this.dom_.removeNode(this.fetchingMatchesDom_);
    }
    this.fetchingMatchesDom_ = null;
  } else {
    var dom = this.dom_;
    if (this.fetchingMatchesDom_ == null) {
      this.fetchingMatchesDom_ = dom.createDom('div', {
        'class': 'ac-fetching-row'
      });
    }
    if (goog.isString(this.loadingContent_))
      this.fetchingMatchesDom_.innerHTML = this.loadingContent_;
    else {
      dom.removeChildren(this.fetchingMatchesDom_);
      dom.appendChild(this.fetchingMatchesDom_, this.loadingContent_);
    }
  }
};

/**
 * @override
 */
plana.ui.ac.AutoComplete.prototype.enterDocument = function() {
  plana.ui.ac.AutoComplete.superClass_.enterDocument.call(this);
  var handler = this.getHandler();
  handler.listen(this.autoComplete, [
    goog.ui.ac.AutoComplete.EventType.UPDATE,
    goog.ui.ac.AutoComplete.EventType.SUGGESTIONS_UPDATE
  ], this.onUpdate_, false, this);
  var inputTarget = this.inputHandler.getEventTarget();
  handler.listen(inputTarget, goog.events.EventType.CHANGE,
    this.onUpdate_, false, this);
  handler.listen(inputTarget, goog.events.EventType.SELECT,
    this.onSelect, false, this);
};

/**
 * @override
 */
plana.ui.ac.AutoComplete.prototype.exitDocument = function() {
  var handler = this.getHandler();
  handler.unlisten(this.autoComplete, [
    goog.ui.ac.AutoComplete.EventType.UPDATE,
    goog.ui.ac.AutoComplete.EventType.SUGGESTIONS_UPDATE
  ], this.onUpdate_, false, this);
  var inputTarget = this.inputHandler.getEventTarget();
  handler.unlisten(inputTarget, goog.events.EventType.CHANGE,
    this.onUpdate_, false, this);
  handler.unlisten(inputTarget, goog.events.EventType.SELECT,
    this.onSelect, false, this);
  plana.ui.ac.AutoComplete.superClass_.exitDocument.call(this);
};

/**
 * This function overrides the super class to resize the container
 * showing autocomplete matches to be of the same width as the
 * input element
 * @param {Element=} opt_parent
 * @override
 */
plana.ui.ac.AutoComplete.prototype.render = function(opt_parent) {
  plana.ui.ac.AutoComplete.superClass_.render.call(this, opt_parent);

  /* resize the suggestion list to be the same width as
   * the input textbox*/
  var autoCompleteRenderer = this.autoComplete.getRenderer();
  //make sure we position the suggestion list properly
  autoCompleteRenderer.setAutoPosition(true);
  //make sure the renderer is initialized
  autoCompleteRenderer.redraw();
  var renderer = this.componentRenderer;
  var suggestionContainer = autoCompleteRenderer.getElement();
  var input = renderer.getInput(this, this.dom_);
  var inputSize = goog.style.getSize(input);
  goog.style.setWidth(suggestionContainer, inputSize.width);
};

/**
 * This function sets the focus to the text input
 */
plana.ui.ac.AutoComplete.prototype.focus = function() {
  var renderer = this.componentRenderer;
  var input = renderer.getInput(this, this.dom_);
  if (input)
    input.focus();
};

/**
 * Setter for the placeholder text of the input
 * @param {!string} label
 */
plana.ui.ac.AutoComplete.prototype.setPlaceholder = function(label) {
  this.placeholder_ = label;
  var input = renderer.getInput(this, this.dom_);
  if (input)
    input['placeholder'] = label;
};

/**
 * Set the HTTP headers. Wrapper around
 * {@link plana.ui.ac.RemoteObjectMatcher#setHeaders}
 * @param {?Object} headers
 */
plana.ui.ac.AutoComplete.prototype.setHeaders = function(headers) {
  this.cachingMatcher.getRemoteMatcher().setHeaders(headers);
};

/**
 * This function sets the content to show while fetching matches
 * from the server
 * @param {Element|string|null} content
 */
plana.ui.ac.AutoComplete.prototype.setLoadingContent = function(content) {
  this.loadingContent_ = content;
  this.createLoadingDom_();
};

/**
 * This function sets the content to show if the token does not
 * match anything
 * @param {Element|string|null} content
 */
plana.ui.ac.AutoComplete.prototype.setNoMatchContent = function(content) {
  this.noMatchMsg_ = content;
  this.createNoMatchDom_();
};

/**
 * This function returns the renderer used to render this component
 * (i.e. wrap the input element inside a div)
 * @return {plana.ui.ac.AutoCompleteRenderer}
 */
plana.ui.ac.AutoComplete.prototype.getRenderer = function() {
  return this.componentRenderer;
};

/**
 * This function returns the actual autocomplete UI
 * @return {goog.ui.ac.AutoComplete}
 */
plana.ui.ac.AutoComplete.prototype.getAutoComplete = function() {
  return this.autoComplete;
};

/**
 * This function returns the input handler used by the
 * autocomplete UI
 * @return {plana.ui.ac.InputHandler}
 */
plana.ui.ac.AutoComplete.prototype.getInputHandler = function() {
  return this.inputHandler;
};

/**
 * This function returns the cached-based remote matcher used by this
 * component
 * @return {plana.ui.ac.CachingMatcher}
 */
plana.ui.ac.AutoComplete.prototype.getCachingMatcher = function() {
  return this.cachingMatcher;
};

/**
 * Callback for when a user selected an item from the list of
 * suggestions or when a user modified the text input.
 * This function saves the selected item (or null) as the model of
 * this component. It also shows/hides the fetching and no results
 * found messages
 * @param {goog.events.Event} e The event object with additional
 *     row and index properties
 * @private
 */
plana.ui.ac.AutoComplete.prototype.onUpdate_ = function(e) {
  switch (e.type) {
    case goog.ui.ac.AutoComplete.EventType.UPDATE:
      var rowData = e.row;
      if (rowData)
        rowData = rowData.getData();
      this.setModel(rowData);
      break;
    case goog.ui.ac.AutoComplete.EventType.SUGGESTIONS_UPDATE:
      var state = this.cachingMatcher.getState();
      var renderer = this.autoComplete.getRenderer();
      var dom = this.dom_;
      switch (state) {
        case plana.ui.ac.CachingObjectMatcher.State.FETCHING:
          if (this.fetchingMatchesDom_ != null) {
            var notShowing =
              this.dom_.getParentElement(this.fetchingMatchesDom_) == null;
            if (notShowing) {
              dom.appendChild(renderer.getElement(), this.fetchingMatchesDom_);
              renderer.show();
            }
          }
          if (this.noMatchesDom_ != null &&
            this.dom_.getParentElement(this.noMatchesDom_) != null) {
            dom.removeNode(this.noMatchesDom_);
          }
          break;
        case plana.ui.ac.CachingObjectMatcher.State.NO_MATCH:
          if (this.fetchingMatchesDom_ != null &&
            this.dom_.getParentElement(this.fetchingMatchesDom_) != null) {
            dom.removeNode(this.fetchingMatchesDom_);
          }
          if (this.noMatchesDom_ != null) {
            var notShowing =
              this.dom_.getParentElement(this.noMatchesDom_) == null;
            if (notShowing) {
              dom.appendChild(renderer.getElement(), this.noMatchesDom_);
              renderer.show();
            }
          }
          break;
        case plana.ui.ac.CachingObjectMatcher.State.READY:
          if (this.fetchingMatchesDom_ != null &&
            this.dom_.getParentElement(this.fetchingMatchesDom_) != null) {
            dom.removeNode(this.fetchingMatchesDom_);
          }
          if (this.noMatchesDom_ != null &&
            this.dom_.getParentElement(this.noMatchesDom_) != null) {
            dom.removeNode(this.noMatchesDom_);
          }
          break;
      }
      break;
    default:
      this.setModel(null);
  }
};

/**
 * Callback for when a user pressed enter.
 * This function simply notifies any listeners.
 * @param {goog.events.Event} e The event object with additional
 * row and index properties
 * @protected
 */
plana.ui.ac.AutoComplete.prototype.onSelect = function(e) {
  this.dispatchEvent({
    type: e.type,
    data: this.getModel()
  });
};