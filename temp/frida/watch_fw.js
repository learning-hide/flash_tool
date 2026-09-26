'use strict';

var OUT_DIR = 'C:\\Users\\ali\\Desktop\\Abpak\\firmware_ro';
var seen = false;
var scanCount = 0;

function writeBin(path, bytes) {
    try {
        var f = new File(path, 'wb');
        f.write(bytes);
        f.close();
        send('[watch] wrote ' + path + ' (' + bytes.length + ' bytes)');
    } catch (e) {
        send('[watch] write fail: ' + e);
    }
}

setInterval(function () {
    if (seen) return;
    scanCount++;
    try {
        var ranges = Process.enumerateRanges({ protection: 'r--', coalesce: true });
        var found = false;
        ranges.forEach(function (r) {
            if (found) return;
            try {
                var hits = Memory.scanSync(r.base, r.size, '41 42 50 41');
                hits.forEach(function (m) {
                    if (found) return;
                    try {
                        var len = m.address.add(4).readU32();
                        var parts = m.address.add(8).readU32();
                        if (len < 0x10000 || len > 0x4000000) return;
                        if (parts < 1 || parts > 32) return;

                        send('[watch] FOUND @' + m.address +
                             ' len=' + len + ' parts=' + parts +
                             ' (scan #' + scanCount + ')');

                        var whole = m.address.readByteArray(len);
                        writeBin(OUT_DIR + '\\package.bin', whole);

                        // Parse partition table
                        var off = 12;
                        for (var p = 0; p < parts; p++) {
                            try {
                                var nameLen = m.address.add(off).readU32();
                                if (nameLen > 64) { send('[watch] bad nameLen=' + nameLen); break; }
                                var name = m.address.add(off + 4).readUtf8String(nameLen);
                                var plen = m.address.add(off + 4 + nameLen).readU32();
                                var crc  = m.address.add(off + 4 + nameLen + 4).readU32();
                                var data = m.address.add(off + 4 + nameLen + 8).readByteArray(plen);
                                var safe = name.replace(/[^A-Za-z0-9_\-\.]/g, '_');
                                writeBin(OUT_DIR + '\\part_' + p + '_' + safe + '.bin', data);
                                off = off + 4 + nameLen + 8 + plen;
                            } catch (e) {
                                send('[watch] part parse err: ' + e);
                                break;
                            }
                        }

                        seen = true;
                        found = true;
                        send('[watch] DONE');
                    } catch (e) {}
                });
            } catch (e) {}
        });
    } catch (e) {
        send('[watch] scan error: ' + e);
    }
}, 2000);

send('[watch] watcher started — waiting for ABPA package');
