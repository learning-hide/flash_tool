# forge3.py — try various firmware payload formats
import http.server, ssl, json, base64, hashlib, hmac, os, time
from Crypto.Cipher import AES
from Crypto.Util import Counter

SALT = b"ASR1803_SWD_SERVER_SECRET_SALT_2026_!@#$%"
LOG_FILE = r"C:\RE\api_log.txt"

def decrypt_request(e_data_b64, e_iv_hex):
    iv = bytes.fromhex(e_iv_hex)
    ct = base64.b64decode(e_data_b64)
    key = hashlib.sha256(SALT + iv).digest()
    ctr = Counter.new(128, initial_value=int.from_bytes(iv, "big"))
    return AES.new(key, AES.MODE_CTR, counter=ctr).decrypt(ct)

def encrypt_response(plaintext_json, iv):
    key = hashlib.sha256(SALT + iv).digest()
    ctr = Counter.new(128, initial_value=int.from_bytes(iv, "big"))
    ct = AES.new(key, AES.MODE_CTR, counter=ctr).encrypt(plaintext_json.encode())
    return {
        "e_data": base64.b64encode(ct).decode(),
        "e_iv": iv.hex(),
        "e_sig": hmac.new(SALT, ct, hashlib.sha256).hexdigest(),
    }

# Fake firmware — ABPKENC header + padding (about 4 KB)
def make_fake_ab():
    header = b"ABPKENC"
    version = b"\x02\x00\x00\x00"
    size = b"\x00\x10\x00\x00"  # 4096
    iv = os.urandom(16)
    body = os.urandom(4096 - 15)
    return header + version + size + iv + body

class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)

        try:
            req = json.loads(raw.decode())
            pt = decrypt_request(req["e_data"], req["e_iv"])
            action = json.loads(pt.decode()).get("action", "")
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write("\n=== REQUEST (" + action + ") ===\n")
                f.write(pt.decode(errors="replace") + "\n")
            print("REQ [" + action + "]: " + pt[:300].decode(errors="replace"))
        except Exception as e:
            print("DECRYPT FAIL:", e)
            action = ""

        # Build the response object
        if action == "request_flash_key":
            fake_ab = make_fake_ab()
            fake_ab_b64 = base64.b64encode(fake_ab).decode()
            fake_ab_hex = fake_ab.hex()

            # Send the firmware in EVERY plausible field name
            resp = {
                "status": "success",
                "message": "Firmware delivered",
                "flash_key": "00" * 32,                    # AES-256 key placeholder
                "security_key": "00" * 32,
                "key": "00" * 32,
                "firmware_data": fake_ab_b64,
                "firmware": fake_ab_b64,
                "package": fake_ab_b64,
                "container": fake_ab_b64,
                "ab_data": fake_ab_b64,
                "ab": fake_ab_b64,
                "data": fake_ab_b64,
                "blob": fake_ab_b64,
                "file": fake_ab_b64,
                "content": fake_ab_b64,
                "payload": fake_ab_b64,
                "firmware_b64": fake_ab_b64,
                "ab_file": fake_ab_b64,
                "firmware_hex": fake_ab_hex,
                "ab_hex": fake_ab_hex,
                "firmware_size": len(fake_ab),
                "credits": 999,
                "is_killed": 0,
                "is_online": 1,
                "reset_vault": 0,
                "server_time": int(time.time()),
            }
        elif action == "check_status":
            resp = {
                "status": "success",
                "message": "License Connected & Authorized",
                "machine_code": "ASR-2E76-9210-09C5-C027",
                "username": "PC_E7692100",
                "credits": 999,
                "is_killed": 0,
                "is_online": 1,
                "reset_vault": 0,
                "server_time": int(time.time()),
            }
        else:
            resp = {
                "status": "success",
                "message": "OK",
                "credits": 999,
                "is_killed": 0,
                "is_online": 1,
                "reset_vault": 0,
                "server_time": int(time.time()),
            }

        iv = os.urandom(16)
        enc = encrypt_response(json.dumps(resp, separators=(",", ":")), iv)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("--- FORGED RESPONSE ---\n")
            f.write(json.dumps(resp)[:500] + "\n")
        out = json.dumps(enc).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *args): pass

httpd = http.server.HTTPServer(("127.0.0.1", 443), H)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(r"C:\RE\server.crt", r"C:\RE\server.key")
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
print("listening on 127.0.0.1:443")
print("Fake firmware sent in every plausible field")
httpd.serve_forever()