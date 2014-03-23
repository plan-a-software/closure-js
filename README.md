closure-js
==========

This repository contains extensions to the Google closure library

# plana.ui.ac.Autocomplete

This class is a wrapper around the autocomplete component provided in closure. It uses a cached remote object matcher. The remote object matcher can retrieve autocomplete suggestions as plain strings or custom objects. It is best if objects have a 'caption' property. This property is used to display the suggestions. If an object does not have a 'caption' property, 'toString' is used instead.

The class also displays 'Loading' and 'No matches found' messages, if a search is in progress or a token does not match anything. A user can configure how these messages are displayed, disable them completely, or provide their own DOM structure to use instead of text messages.

[Here](http://plan-a-software.github.io/autocomplete.html) is a demo of the class.

The JSDoc for this class is [here](http://plan-a-software.github.io/doc/autocomplete/index.html).

### Dependencies

* ```goog.Timer```
* ```goog.Uri```
* ```goog.array```
* ```goog.a11y.aria```
* ```goog.async.Throttle```
* ```goog.dom.selection```
* ```goog.events.BrowserEvent```
* ```goog.events.Event```
* ```goog.events.EventHandler```
* ```goog.events.EventTarget```
* ```goog.events.EventType```
* ```goog.events.KeyCodes```
* ```goog.events.KeyHandler```
* ```goog.math.Size```
* ```goog.net.XhrIo```
* ```goog.net.XmlHttpFactory```
* ```goog.string```
* ```goog.ui.Component```
* ```goog.ui.ac.AutoComplete```
* ```goog.ui.ac.AutoComplete.EventType```
* ```goog.ui.ac.Renderer```
* ```goog.ui.ac.RenderOptions```

# plana.ui.TypeaheadSearch

This class extends the autocomplete class to provide an additional search button that can be used to trigger a fulltext search by adding the 'fulltextsearch' parameter to server requests.

An event is fired when the fulltext search completed. The event contains the search token, results of the search, as well as an indication of whether the server found any matches.

[Here](http://plan-a-software.github.io/typeaheadsearch.html) is a demo of the class.

The JSDoc for this class is [here](http://plan-a-software.github.io/doc/typeaheadsearch/index.html).

### Dependencies

This class depends on

* ```plana.ui.ac.Autocomplete```

==========

# Licence

All software is released under the [Apache License v2](http://opensource.org/licenses/Apache-2.0)

# Donations


PayPal: [![PayPal](https://www.paypalobjects.com/en_GB/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=4TPLHCJWM7CKG&lc=GB&item_name=Plan%2dA%20Software%20Ltd&item_number=Github&currency_code=GBP&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted)
