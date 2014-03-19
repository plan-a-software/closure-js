closure-js
==========

This repository contains extensions to the Google closure library

# plana.ui.ac.Autocomplete

This class is a wrapper around the autocomplete component provided in closure. It uses a cached remote object matcher. The remote object matcher can retrieve autocomplete suggestions as plain strings or custom objects. It is best if objects have a 'caption' property. This property is used to display the suggestions. If an object does not have a 'caption' property, 'toString' is used instead.

The class also displays 'Loading' and 'No matches found' messages, if a search is in progress or a token does not match anything. A user can configure how these messages are displayed, disable them completely, or provide their own DOM structure to use instead of text messages.

The JSDoc for this class is [here](http://htmlpreview.github.io/?http://github.com/plan-a-software/closure-js/blob/master/doc/autocomplete/index.html).

### Dependencies

* ```goog.Disposable```
* ```goog.Uri```
* ```goog.array```
* ```goog.async.Throttle```
* ```goog.events.BrowserEvent```
* ```goog.events.Event```
* ```goog.events.EventTarget```
* ```goog.events.EventType```
* ```goog.events.KeyCodes```
* ```goog.math.Size```
* ```goog.ui.ac.ArrayMatcher```
* ```goog.ui.ac.AutoComplete```
* ```goog.ui.ac.AutoComplete.EventType```
* ```goog.ui.ac.InputHandler```
* ```goog.ui.ac.RemoteArrayMatcher```
* ```goog.ui.ac.Renderer```
* ```goog.ui.ac.RenderOptions```
* ```goog.ui.Component```

# plana.ui.TypeaheadSearch

This class extends the autocomplete class to provide an additional search button that can be used to trigger a fulltext search by adding the 'fullsearch' parameter to server requests.

The JSDoc for this class is [here](http://htmlpreview.github.io/?http://github.com/plan-a-software/closure-js/blob/master/doc/typeaheadsearch/index.html).

### Dependencies

This class depends on

* ```plana.ui.ac.Autocomplete```

==========