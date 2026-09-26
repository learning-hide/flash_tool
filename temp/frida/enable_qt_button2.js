'use strict';

var BTN_X = 820;
var BTN_Y = 289;

var WIDGET_AT   = ptr('0x65015c70');
var SET_ENABLED = ptr('0x65039000');

// QApplication::widgetAt(int, int) — static, args on stack
var widgetAt = new NativeFunction(WIDGET_AT, 'pointer', ['int', 'int']);

// Build a thiscall thunk for QWidget::setEnabled(bool)
var stub = Memory.alloc(0x40);
Memory.patchCode(stub, 0x40, function (code) {
    code.writeByteArray([0x8B, 0x4C, 0x24, 0x04]);   // mov ecx, [esp+4]
    code.writeByteArray([0x8B, 0x44, 0x24, 0x08]);   // mov eax, [esp+8]
    code.writeByte([0x50]);                           // push eax
    code.writeByte([0xB8, 0x00, 0x90, 0x03, 0x65]);   // mov eax, 0x65039000
    code.writeByteArray([0xFF, 0xD0]);                // call eax
    code.writeByteArray([0xC2, 0x08, 0x00]);          // ret 8
});

var setEnabledThunk = new NativeFunction(stub, 'void', ['pointer', 'bool']);

try {
    var w = widgetAt(BTN_X, BTN_Y);
    send('[qt] widgetAt(' + BTN_X + ', ' + BTN_Y + ') = ' + w);

    if (w.isNull()) {
        send('[qt] no widget at that position');
    } else {
        send('[qt] calling setEnabled(' + w + ', true)');
        setEnabledThunk(w, true);
        send('[qt] setEnabled returned — button should be enabled');
    }
} catch (e) {
    send('[qt] error: ' + e);
}
