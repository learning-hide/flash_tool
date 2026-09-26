'use strict';

// Build thiscall thunks
var stubSetEnabled = Memory.alloc(0x40);
stubSetEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,
    0x8B, 0x44, 0x24, 0x08,
    0x50,
    0xB8, 0x00, 0x90, 0x03, 0x65,
    0xFF, 0xD0,
    0xC2, 0x08, 0x00
]);

var stubIsEnabled = Memory.alloc(0x40);
stubIsEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,
    0xB8, 0x00, 0xF1, 0x00, 0x65,
    0xFF, 0xD0,
    0xC2, 0x04, 0x00
]);

var setEnabledThunk = new NativeFunction(stubSetEnabled, 'void', ['pointer', 'bool']);
var isEnabledThunk  = new NativeFunction(stubIsEnabled,  'bool', ['pointer']);

// Enumerate widgets
var allWidgets = new NativeFunction(ptr('0x6500c250'), 'void', ['pointer']);
var listBuf = Memory.alloc(0x40);
allWidgets(listBuf);

var d = listBuf.readPointer();
if (d.isNull()) { send('[qt] allWidgets returned null'); }
else {
    var begin = d.add(8).readS32();
    var end   = d.add(12).readS32();
    send('[qt] widget count: ' + (end - begin));

    var arrayBase = d.add(16);
    var disabled = [];
    var enabled = 0;

    for (var i = begin; i < end; i++) {
        var w = arrayBase.add(i * 4).readPointer();
        if (w.isNull()) continue;
        try {
            var en = isEnabledThunk(w);
            if (en) {
                enabled++;
            } else {
                disabled.push(w);
                send('[qt] DISABLED widget @ ' + w);
            }
        } catch (e) {
            send('[qt] widget ' + i + ' @ ' + w + ' error: ' + e);
        }
    }

    send('[qt] enabled=' + enabled + ' disabled=' + disabled.length);

    if (disabled.length > 0) {
        send('[qt] attempting to enable ' + disabled.length + ' widgets...');
        disabled.forEach(function (w) {
            try {
                setEnabledThunk(w, true);
                send('[qt] enabled widget ' + w);
            } catch (e) {
                send('[qt] setEnabled failed for ' + w + ': ' + e);
            }
        });
        send('[qt] DONE — buttons should be enabled now');
    }
}
