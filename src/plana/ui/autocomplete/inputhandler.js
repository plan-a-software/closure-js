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

goog.provide('plana.ui.ac.InputHandler');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.ui.ac.InputHandler');

/**
 * This class extends {@link goog.ui.ac.InputHandler} to fire a change event
 * whenver the text input changes
 *
 * @constructor
 * @extends {goog.ui.ac.InputHandler}
 * @param {?string=} opt_separators Separators to split multiple entries.
 *     If none passed, uses ',' and ';'
 * @param {?string=} opt_literals Characters used to delimit text literals.
 * @param {?boolean=} opt_multi Whether to allow multiple entries
 *     (Default: true)
 * @param {?number=} opt_throttleTime Number of milliseconds to throttle
 *     keyevents with (Default: 150). Use -1 to disable updates on typing. Note
 *     that typing the separator will update autocomplete suggestions
 */
plana.ui.ac.InputHandler = function(opt_separators, opt_literals,
  opt_multi, opt_throttleTime) {
  goog.ui.ac.InputHandler.call(this, opt_separators, opt_literals,
    opt_multi, opt_throttleTime);

  /**
   * A helper to be able to notify other components when
   * a key event resulted in a change of input
   * @type {goog.events.EventTarget}
   * @private
   */
  this.inputEventTarget_ = new goog.events.EventTarget();
};
goog.inherits(plana.ui.ac.InputHandler, goog.ui.ac.InputHandler);

/**
 * Cleanup.
 * @override
 */
plana.ui.ac.InputHandler.prototype.disposeInternal = function() {
  plana.ui.ac.InputHandler.superClass_.disposeInternal.call(this);
  this.inputEventTarget_.dispose();
  this.inputEventTarget_ = null;

  //cleanup resources from superclass :(
  this.ac_ = null;
  if (this.timer_ != null) {
    this.timer_.dispose();
    this.timer_ = null;
  }
  this.trimmer_ = null;
  this.separatorCheck_ = null;
  if (this.keyHandler_ != null) {
    this.keyHandler_.dispose();
    this.keyHandler_ = null;
  }
  if (this.activateHandler_ != null) {
    this.activateHandler_.dispose();
    this.activateHandler_ = null;
  }
  this.defaultSeparator_ = null;
  this.separators_ = null;
  this.literals_ = null;
};

/**
 * This function lets the super class handle the key event. If the key
 * event corresponds to an enter key, then fire a 'select' event
 * otherwise check if it was a text modifying key and fire a change event
 * @param {goog.events.BrowserEvent} e Browser event object
 * @return {boolean} True if the key event was handled
 * @override
 */
plana.ui.ac.InputHandler.prototype.handleKeyEvent = function(e) {
  var handled =
    plana.ui.ac.InputHandler.superClass_.handleKeyEvent.call(this, e);
  switch (e.keyCode) {
    case goog.events.KeyCodes.ENTER:
    case goog.events.KeyCodes.MAC_ENTER:
      this.inputEventTarget_.dispatchEvent(
        new goog.events.Event(
          goog.events.EventType.SELECT, this
        )
      );
      break;
    default:
      if (goog.events.KeyCodes.isTextModifyingKeyEvent(e)) {
        this.inputEventTarget_.dispatchEvent(
          new goog.events.Event(
            goog.events.EventType.CHANGE, this
          )
        );
      }
  }
  return handled;
};

/**
 * Getter for the event target
 * @return {goog.events.EventTarget}
 */
plana.ui.ac.InputHandler.prototype.getEventTarget = function() {
  return this.inputEventTarget_;
};
