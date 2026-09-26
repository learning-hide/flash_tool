'use strict';

// Enumerate Qt widgets to find the disabled Start button

// Qt5 exports from Qt5Widgets / Qt5Core
var qtw = Process.getModuleByName('Qt5Widgets.dll');
var qtc = Process.getModuleByName('Qt5Core.dll');
var qtg = Process.getModuleByName('Qt5Gui.dll');

send('[qt] Qt5Widgets base: ' + qtw.base);
send('[qt] Qt5Core base: ' + qtc.base);
send('[qt] Qt5Gui base: ' + qtg.base);

// Look up symbols we might need
function tryExport(mod, name) {
    try {
        return mod.getExportByName(name);
    } catch (e) {
        return null;
    }
}

// Qt5 exports we need
var QApplication_allWidgets    = tryExport(qtw, '?allWidgets@QApplication@@SA?AV?$QList@PEAVQWidget@@@@XZ');
var QApplication_allWidgetsAlt = tryExport(qtw, 'allWidgets');
var QWidget_metaObject         = tryExport(qtw, '?metaObject@QWidget@@UEBAPEBVQMetaObject@@XZ');
var QWidget_isEnabled          = tryExport(qtw, '?isEnabled@QWidget@@QEBANXZ');
var QWidget_windowTitle        = tryExport(qtw, '?windowTitle@QWidget@@QEBAAEBVQString@@XZ');
var QWidget_objectName         = tryExport(qtc, '?objectName@QObject@@QEBAAEBVQString@@XZ');
var QString_toUtf8             = tryExport(qtc, '?toUtf8@QString@@QEBAAEBVQByteArray@@XZ');
var QByteArray_constData       = tryExport(qtc, '?constData@QByteArray@@QEBAPEBDXZ');

send('[qt] allWidgets: ' + QApplication_allWidgets);
send('[qt] metaObject: ' + QWidget_metaObject);
send('[qt] isEnabled: ' + QWidget_isEnabled);
send('[qt] objectName: ' + QWidget_objectName);
send('[qt] QString_toUtf8: ' + QString_toUtf8);
send('[qt] QByteArray_constData: ' + QByteArray_constData);

if (!QApplication_allWidgets) {
    send('[qt] ERROR: cannot find QApplication::allWidgets');
} else {
    send('[qt] allWidgets export found — but calling it requires careful stack setup');
    send('[qt] this is complex; switching to alternative approach');
}
