'use strict';
var BTN_X = 820;
var BTN_Y = 289;

var WIDGET_AT    = ptr('0x65015c70');
var SET_ENABLED  = ptr('0x65039000');
var IS_ENABLED   = ptr('0x6500f160');

var widgetAt   = new NativeFunction(WIDGET_AT,   'pointer', ['int', 'int']);
var setEnabled = new NativeFunction(SET_ENABLED, 'void',    ['pointer', 'bool']);
var isEnabled  = new NativeFunction(IS_ENABLED,  'bool',    ['pointer']);

send('[qt] widgetAt = ' + WIDGET_AT);
send('[qt] setEnabled = ' + SET_ENABLED);
send('[qt] isEnabled = ' + IS_ENABLED);

try {
    var w = widgetAt(BTN_X, BTN_Y);
    send('[qt] widgetAt(' + BTN_X + ', ' + BTN_Y + ') = ' + w);

    if (w.isNull()) {
        send('[qt] no widget at that position');
    } else {
        var before = isEnabled(w);
        send('[qt] isEnabled(w) before = ' + before);

        setEnabled(w, true);
        send('[qt] setEnabled(w, true) called');

        var after = isEnabled(w);
        send('[qt] isEnabled(w) after = ' + after);

        if (after) send('[qt] SUCCESS — button is now enabled');
        else        send('[qt] still disabled');
    }
} catch (e) {
    send('[qt] error: ' + e);
}
