'use strict';
// scan_abpa.js — read-only scan for ABPA magic in the target's memory

var MAGIC = [0x41, 0x42, 0x50, 0x41];   // 'ABPA'

function scanAllRegions() {
    var results = [];
    var ranges = Process.enumerateRanges({ protection: 'r--', coalesce: true });
    send('[scan] ranges to scan: ' + ranges.length);

    ranges.forEach(function (r) {
        if (r.size < 0x1000) return;
        try {
            var hits = Memory.scanSync(r.base, r.size, '41 42 50 41');
            hits.forEach(function (m) {
                try {
                    var len   = m.address.add(4).readU32();
                    var parts = m.address.add(8).readU32();
                    if (len < 0x10000 || len > 0x4000000) return;
                    if (parts < 1 || parts > 32) return;
                    results.push({
                        addr: m.address,
                        len: len,
                        parts: parts
                    });
                } catch (e) {}
            });
        } catch (e) {}
    });
    return results;
}

var found = scanAllRegions();
send('[scan] valid ABPA candidates: ' + found.length);

found.forEach(function (f, i) {
    send('[scan] [' + i + '] @' + f.addr + ' len=0x' + f.len.toString(16) + ' parts=' + f.parts);
});

// If we found any, dump the largest
if (found.length > 0) {
    found.sort(function (a, b) { return b.len - a.len; });
    var best = found[0];
    send('[scan] dumping largest: @' + best.addr + ' len=' + best.len);

    var bytes = best.addr.readByteArray(best.len);
    var out = 'C:\\Users\\ali\\Desktop\\Abpak\\firmware_ro\\package_from_live.bin';
    var f = new File(out, 'wb');
    f.write(bytes);
    f.close();
    send('[scan] wrote ' + out);
} else {
    send('[scan] no ABPA package in live process');
}
