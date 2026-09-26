'use strict';

// Qt addresses
var WIDGET_AT     = ptr('0x65015c70');   // QApplication::widgetAt(int, int)
var SET_ENABLED   = ptr('0x65039000');   // QWidget::setEnabled(bool)
var BUTTON_CLICK  = ptr('0x650bc230');   // QAbstractButton::click()

// Button screen position
var BTN_X = 832;
var BTN_Y = 283;

// --- 1. widgetAt(int, int): static __cdecl ---
var widgetAt = new NativeFunction(WIDGET_AT, 'pointer', ['int', 'int']);

// --- 2. setEnabled(bool): __thiscall thunk ---
var stubSetEnabled = Memory.alloc(0x40);
stubSetEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,
    0x8B, 0x44, 0x24, 0x08,
    0x50,
    0xB8, 0x00, 0x90, 0x03, 0x65,
    0xFF, 0xD0,
    0xC2, 0x08, 0x00
]);
Memory.protect(stubSetEnabled, 0x40, 'rwx');
var setEnabledThunk = new NativeFunction(stubSetEnabled, 'void', ['pointer', 'int']);

// --- 3. click(): __thiscall thunk ---
var stubClick = Memory.alloc(0x40);
stubClick.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,           // mov ecx, [esp+4]
    0xB8, 0x30, 0xC2, 0x0B, 0x65,     // mov eax, 0x650bc230
    0xFF, 0xD0,                        // call eax
    0xC2, 0x04, 0x00                   // ret 4
]);
Memory.protect(stubClick, 0x40, 'rwx');
var clickThunk = new NativeFunction(stubClick, 'void', ['pointer']);

send('[qt] thunks ready');

// --- 4. Race loop: enable + click every 50 ms ---
var attempts = 0;
var maxAttempts = 40;   // 2 seconds of trying

var intv = setInterval(function () {
    attempts++;

    var w = widgetAt(BTN_X, BTN_Y);
    if (w.isNull()) {
        if (attempts === 1) send('[qt] no widget at (' + BTN_X + ', ' + BTN_Y + ')');
        return;
    }

    try {
        setEnabledThunk(w, 1);
    } catch (e) {}

    try {
        clickThunk(w);
        send('[qt] CLICKED widget ' + w + ' at attempt ' + attempts);
        clearInterval(intv);
        return;
    } catch (e) {
        if (attempts % 10 === 0) send('[qt] attempt ' + attempts + ' err: ' + e);
    }

    if (attempts >= maxAttempts) {
        clearInterval(intv);
        send('[qt] GAVE UP after ' + attempts + ' attempts');
    }
}, 50);

send('[qt] race loop started — trying every 50 ms');
