'use strict';

var names = ['Qt5Core.dll', 'Qt5Gui.dll', 'Qt5Widgets.dll', 'Qt5Network.dll'];

names.forEach(function (name) {
    try {
        var mod = Process.getModuleByName(name);
        var exports = mod.enumerateExports();
        send('[qt] ' + name + ' base=' + mod.base + ' exports=' + exports.length);
        // Show first 20 exports
        exports.slice(0, 20).forEach(function (e) {
            send('[qt]   ' + e.name + ' @ ' + e.address);
        });
    } catch (e) {
        send('[qt] ' + name + ' error: ' + e);
    }
});
