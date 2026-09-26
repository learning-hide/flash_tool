'use strict';

var stubSetEnabled = Memory.alloc(0x40);
stubSetEnabled.writeByteArray([
    0x8B, 0x4C, 0x24, 0x04,
    0x8B, 0x44, 0x24, 0x08,
    0x50,
    0xB8, 0x00, 0x90, 0x03, 0x65,
    0xFF, 0xD0,
    0xC2, 0x08, 0x00
]);

var setEnabledThunk = new NativeFunction(stubSetEnabled, 'void', ['pointer', 'bool']);

var allWidgets = new NativeFunction(ptr('0x6500c250'), 'void', ['pointer']);
var listBuf = Memory.alloc(0x40);
allWidgets(listBuf);

var d = listBuf.readPointer();
if (d.isNull()) {
    send('[qt] allWidgets returned null');
} else {
    var begin = d.add(8).readS32();
    var end   = d.add(12).readS32();
    send('[qt] widget count: ' + (end - begin));

    var arrayBase = d.add(16);
    var count = 0;

    for (var i = begin; i < end; i++) {
        var w = arrayBase.add(i * 4).readPointer();
        if (w.isNull()) continue;
        try {
            setEnabledThunk(w, true);
            count++;
        } catch (e) {
            send('[qt] widget ' + i + ' @ ' + w + ' setEnabled failed: ' + e);
        }
    }

    send('[qt] called setEnabled(true) on ' + count + ' widgets');
    send('[qt] DONE — check the target window');
}
