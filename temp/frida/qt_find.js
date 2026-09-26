'use strict';

function searchExports(modName, patterns) {
    try {
        var mod = Process.getModuleByName(modName);
        var exports = mod.enumerateExports();
        send('[find] ' + modName + ' has ' + exports.length + ' exports');
        exports.forEach(function (e) {
            for (var i = 0; i < patterns.length; i++) {
                if (e.name.indexOf(patterns[i]) !== -1) {
                    send('[find] ' + modName + ' | ' + e.name + ' @ ' + e.address);
                    break;
                }
            }
        });
    } catch (e) {
        send('[find] ' + modName + ' error: ' + e);
    }
}

// Itanium-style patterns
searchExports('Qt5Widgets.dll', [
    'allWidgets',
    'setEnabled',
    'isEnabled',
    'QApplication',
    'QPushButton'
]);

searchExports('Qt5Core.dll', [
    'objectName',
    'QMetaObject',
    'invokeMethod',
    'QString'
]);
