'use strict';

var qtw = Process.getModuleByName('Qt5Widgets.dll');
var exports = qtw.enumerateExports();

exports.forEach(function (e) {
    if (e.name.indexOf('click@QAbstractButton') !== -1 ||
        e.name.indexOf('animateClick') !== -1 ||
        e.name.indexOf('isDown') !== -1) {
        send('[find] ' + e.name + ' @ ' + e.address);
    }
});

send('[find] done');
