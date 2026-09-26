'use strict';
var mod = Process.getModuleByName(/abpakteam/i);
send('[exports] module base = ' + mod.base + ' size = 0x' + mod.size.toString(16));
var count = 0;
mod.enumerateExports().forEach(function (e) {
    if (/^EP_/i.test(e.name) || /enigma/i.test(e.name)) {
        send('[exports] ' + e.name + ' @ ' + e.address + ' (' + e.type + ')');
        count++;
    }
});
send('[exports] total EP_/enigma exports = ' + count);
