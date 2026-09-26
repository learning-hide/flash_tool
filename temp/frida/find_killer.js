'use strict';
var k32 = Process.getModuleByName('kernel32.dll');

function hook(name) {
    try {
        var addr = k32.getExportByName(name);
        Interceptor.attach(addr, {
            onEnter: function (args) {
                send('[KILL] ' + name + ' called from ' + this.returnAddress);
                var bt = Thread.backtrace(this.context, Backtracer.ACCURATE);
                send('[KILL] backtrace: ' + bt.slice(0, 6).map(a => a.toString()).join(' -> '));
            }
        });
        send('[hook] ' + name);
    } catch (e) { send('[hook-fail] ' + name + ': ' + e); }
}

['TerminateProcess', 'ExitProcess'].forEach(hook);

// Also hook ntdll variants
var ntdll = Process.getModuleByName('ntdll.dll');
['RtlExitUserProcess'].forEach(function(n){
    try {
        var addr = ntdll.getExportByName(n);
        Interceptor.attach(addr, {
            onEnter: function (args) {
                send('[KILL] ntdll!' + n + ' from ' + this.returnAddress);
                var bt = Thread.backtrace(this.context, Backtracer.ACCURATE);
                send('[KILL] bt: ' + bt.slice(0, 6).map(a => a.toString()).join(' -> '));
            }
        });
        send('[hook] ntdll!' + n);
    } catch (e) { send('[hook-fail] ' + n + ': ' + e); }
});

send('[ready] all kill hooks installed');
