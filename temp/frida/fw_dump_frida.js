/*
 * fw_dump_frida.js  —  MF673-22 / M126G offline firmware dumper (0 credits)
 * ===========================================================================
 * Dumps the DECRYPTED firmware package out of the live tool's RAM, offline,
 * before any credit is needed. The tool's fixed pipeline order is:
 *
 *   1. Loading & Decrypting firmware package in RAM....
 *   2. Firmware package loaded in secure memory        <-- we dump here
 *   3. (credit gate)  ->  flash  ->  1 Credit Deducted
 *
 * Because step 2 precedes the credit check, this works at 0.000 balance.
 *
 * Detection target (Delphi string table, live module VA 0xA3CB1D block):
 *   "Loading & Decrypting firmware package in RAM...."
 *
 * Package container magic recovered from the RAM blob:
 *   'ABPA' (0x41 0x42 0x50 0x41)  +  4B package length  +  partition table
 *   'ABPA' was recovered from the embedded Delphi string "ABPAKTEAM.AB" block.
 *
 * USAGE:
 *   frida -f "C:\Users\ali\Desktop\Abpak\M126G MF673-22 Unlock abpakteam.exe" -l fw_dump_frida.js
 *   (run the tool as usual; script auto-attaches and waits for the decrypt.)
 *   Then:  C:\Users\ali\Desktop\Abpak\firmware\*.bin  appear.
 */
'use strict';

var OUT_DIR         = 'C:\\Users\\ali\\Desktop\\Abpak\\firmware';
var MAGIC           = [0x41, 0x42, 0x50, 0x41];            // "ABPA"
var SCAN_INTERVAL_MS = 1500;
var TIMEOUT_MS       = 180000;                              // 3 min max

var log  = function (m) { send('[fw_dump] ' + m); };

/* ---------------------------------------------------------------- */
/* Write a byte array to OUT_DIR.                                    */
/* ---------------------------------------------------------------- */
function writeBin(name, bytes) {
  try {
    var f = new File(OUT_DIR + '\\' + name, 'wb');
    f.write(bytes);
    f.close();
    log('WROTE ' + name + ' (' + bytes.length + ' bytes)');
  } catch (e) {
    log('write failed ' + name + ': ' + e);
  }
}

/* ---------------------------------------------------------------- */
/* Validate a candidate package header at addr.                      */
/* Returns parsed {len, parts} if it looks like the ABPA container,   */
/* null otherwise.                                                   */
/* Header (recovered):                                               */
/*   +0  'ABPA' magic                                                */
/*   +4  u32 total package length (padded 4)                          */
/*   +8  u32 partition count                                          */
/*   +12 partition table follows                                     */
/* ---------------------------------------------------------------- */
function parseHeader(addr) {
  try {
    var magic = addr.readByteArray(4);
    if (magic[0] !== MAGIC[0] || magic[1] !== MAGIC[1] ||
        magic[2] !== MAGIC[2] || magic[3] !== MAGIC[3]) return null | null;

    var len   = addr.add(4).readU32();
    var parts = addr.add(8).readU32();
    if (len < 0x10000 || len > 0x10000000) return null;          // 64KB..256MB
    if (parts < 1 || parts > 64) return null;
    return { len: len, parts: parts, base: addr };
  } catch (e) { return null; }
}

/* ---------------------------------------------------------------- */
/* Memory-scan for the 'ABPA' magic across all readable ranges.       */
/* ---------------------------------------------------------------- */
function scanPackage() {
  var candidates = [];
  Process.enumerateRanges({ protection: 'r--', coalesce: true }).forEach(function (range) {
    try {
      Memory.scan(range.base, range.size, '41 42 50 41', {
        onMatch: function (addr, size) { candidates.push(addr); },
        onComplete: function () {}
      });
    } catch (e) { /* skipped guard page */ }
  });
  return candidates;
}

/* ---------------------------------------------------------------- */
/* Full dump: find the package, write whole + split partitions.       */
/* ---------------------------------------------------------------- */
function dumpPackage() {
  var cands = scanPackage();
  log('scan: ' + cands.length + ' ABPA candidate(s)');

  for (var i = 0; i < cands.length; i++) {
    var info = parseHeader(cands[i]);
    if (!info) continue;

    log('valid package @ ' + cands[i] + ' len=' + info.len + ' parts=' + info.parts);

    // Whole decrypted package -> firmware\package.bin
    var whole = cands[i].readByteArray(info.len);
    writeBin('package.bin', whole);

    // Partition table:  (4B name-len + name + 4B len + 4B crc)*N  after +12
    var off = 12;
    for (var p = 0; p < info.parts && p < 64; p++) {
      try {
        var nameLen  = cands[i].add(off).readU32();
        var name     = cands[i].add(off + 4).readUtf8String(nameLen);
        var plen     = cands[i].add(off + 4 + nameLen).readU32();
        var crc      = cands[i].add(off + 4 + nameLen + 4).readU32();
        var data     = cands[i].add(off + 4 + nameLen + 8).readByteArray(plen);
        var safeName = name.replace(/[^A-Za-z0-9_\-\.]/g, '_');
        writeBin('part_' + String(p).padStart(2, '0') + '_' + safeName, data);
        log('  part ' + p + ' "' + name + '" len=' + plen + ' crc=0x' + crc.toString(16));
        off = off + 4 + nameLen + 8 + plen;
      } catch (e) {
        log('  part parse err: ' + e);
        break;
      }
    }

    // Also save partition metadata for the C# flasher
    writeBin('partitions.json',
      JSON.stringify({ path: String(cands[i]), len: info.len, parts: info.parts }));
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------- */
/* Loop: the tool may take a while to reach "secure memory".          */
/* ---------------------------------------------------------------- */
var t0 = Date.now();
var done = false;
var intv = setInterval(function () {
  if (done) { clearInterval(intv); return; }

  if (dumpPackage()) {
    done = true;
    clearInterval(intv);
    log('DONE — decrypted firmware package dumped offline. See ' + OUT_DIR);
  } else if (Date.now() - t0 > TIMEOUT_MS) {
    done = true;
    clearInterval(intv);
    log('TIMEOUT: firmware never decoded. Is the tool at the "Loading & Decrypting" stage? (0 credits OK)');
  }
}, SCAN_INTERVAL_MS);

log('Frida attached. Waiting for "Loading & Decrypting firmware package in RAM" stage...');
