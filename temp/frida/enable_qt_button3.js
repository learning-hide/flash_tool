'use strict';

// Current button coordinates (from user hover)
var BTN_X = 832;
var BTN_Y = 283;

// Qt addresses (from export enumeration)
var WIDGET_AT   = ptr('0x65015c70');
var SET_ENABLED = ptr('0x65039000');
var IS_ENABLED  = ptr('0x6500f160');

// --- 1. widgetAt(x, y): static, __cdecl, args on stack ---
var widgetAt = new NativeFunction(WIDGET_AT, 'pointer', ['int', 'int']);

// --- 2. Build __thiscall thunks with raw writeByteArray ---
//     void QWidget::setEnabled(bool)  — this in ECX, bool in [esp+4]
var stubSetEnabled = Memory.alloc(0x40);
stubSetEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,          // mov ecx, [esp+4]
    0x8B, 0x44, 0x24, 0x08,          // mov eax, [esp+8]
    0x50,                             // push eax
    0xB8, 0x00, 0x90, 0x03, 0x65,    // mov eax, 0x65039000
    0xFF, 0xD0,                       // call eax
    0xC2, 0x08, 0x00                  // ret 8
]);

//     bool QWidget::isEnabled() const — this in ECX, result in AL
var stubIsEnabled = Memory.alloc(0x40);
stubIsEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,          // mov ecx, [esp+4]
    0xB8, 0x00, 0xF1, 0x00, 0x65,    // mov eax, 0x6500f160
    0xFF, 0xD0,                       // call eax
    0xC2, 0x04, 0x00                  // ret 4
]);

var setEnabledThunk = new NativeFunction(stubSetEnabled, 'void', ['pointer', 'bool']);
var isEnabledThunk  = new NativeFunction(stubIsEnabled,  'bool', ['pointer']);

send('[qt] stubs built: setEnabled=' + stubSetEnabled + ' isEnabled=' + stubIsEnabled);

// --- 3. Test ---
try {
    var w = widgetAt(BTN_X, BTN_Y);
    send('[qt] widgetAt(' + BTN_X + ', ' + BTN_Y + ') = ' + w);

    if (w.isNull()) {
        send('[qt] no widget at (' + BTN_X + ', ' + BTN_Y + ')');
    } else {
        var before = isEnabledThunk(w);
        send('[qt] isEnabled before = ' + before);

        setEnabledThunk(w, true);
        send('[qt] setEnabled(w, true) called');

        var after = isEnabledThunk(w);
        send('[qt] isEnabled after  = ' + after);

        if (after) send('[qt] SUCCESS — button enabled');
        else       send('[qt] still disabled');
    }
} catch (e) {
    send('[qt] error: ' + e);
}
