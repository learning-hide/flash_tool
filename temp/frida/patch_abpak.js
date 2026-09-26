// patch_bypass.js — one-byte RET at 0x1B66008 (ProcessPasswordResult)
'use strict';

var IMG_BASE  = 0xA20000;
var GHIDRA_VA = 0x1B66008;
var RVA       = GHIDRA_VA - IMG_BASE;

var mod = Process.getModuleByName(/abpakteam/i);
var target = mod.base.add(RVA);

send('[patch] module base = ' + mod.base);
send('[patch] target VA   = ' + target + '  (want ' + mod.base.add(0x1146008) + ')');

// Verify the byte before patching
var before = target.readU8();
send('[patch] byte before = 0x' + before.toString(16) + '  (want 0x80)');

if (before !== 0x80) {
    send('[patch] ABORT — unexpected byte, not patching');
} else {
    Memory.patchCode(target, 1, function (code) {
        code.writeByteArray([0xC3]);   // RET
    });
    var after = target.readU8();
    send('[patch] byte after  = 0x' + after.toString(16) + '  (want 0xc3)');
    send('[patch] PATCH INSTALLED');
}