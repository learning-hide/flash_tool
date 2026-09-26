'use strict';
var mod = Process.enumerateModules().find(m => /abpakteam/i.test(m.name));
if (!mod) { send('[minimal] module not found'); }
else {
    var base = mod.base;
    var target = base.add(0x1B66008 - 0xA20000);
    var before = target.readU8();
    Memory.patchCode(target, 1, function (code) {
        code.writeByteArray([0xC3]);
    });
    var after = target.readU8();
    send('[minimal] base=' + base + ' before=0x' + before.toString(16) + ' after=0x' + after.toString(16));
}
