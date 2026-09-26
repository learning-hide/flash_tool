function hookStrcmp() {
    const strcmp = Module.getExportByName(null, 'strcmp');
    console.log('[+] strcmp at ' + strcmp);
    Interceptor.attach(strcmp, {
        onEnter: function(args) {
            try {
                const s1 = args[0].readUtf8String();
                const s2 = args[1].readUtf8String();
                if (s1 && s2) {
                    console.log('[strcmp] "' + s1 + '" vs "' + s2 + '"');
                }
            } catch(e) {}
        },
        onLeave: function(retval) {
            console.log('[strcmp] returned: ' + retval);
        }
    });
}
setTimeout(hookStrcmp, 100);
