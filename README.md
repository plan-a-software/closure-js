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

# Licence

All software is released under the [Apache License v2](http://opensource.org/licenses/Apache-2.0)

# Donations

<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
<input type="hidden" name="cmd" value="_s-xclick">
<input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----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-----END PKCS7-----
">
<input type="image" src="https://www.paypalobjects.com/en_GB/i/btn/btn_donate_LG.gif" border="0" name="submit" alt="PayPal – The safer, easier way to pay online.">
<img alt="" border="0" src="https://www.paypalobjects.com/en_GB/i/scr/pixel.gif" width="1" height="1">
</form>

