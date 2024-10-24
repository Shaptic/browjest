import io
import re
import json
import base64
import functools
import http.server
from urllib.parse import urlparse

from google.cloud import storage
from stellar_sdk  import xdr
import pyzstd as zstd

import reader


PROJECT_ID = "YOUR PROJECT"
BUCKET = "YOUR BUCKET"
ORIGIN = 'http://localhost:5137'


client = storage.Client(project=PROJECT_ID)
bucket = storage.Bucket(client, name=BUCKET)
cache = {}


def download_metadata(path: str, blob) -> str:
    """ Wraps download routine to enable caching by path.
    """
    def downloader(path):
        print("Downloading full ledger file from", path[32:])
        with io.BytesIO(blob.download_as_bytes()) as download:
            full = b''
            with io.BytesIO() as output:
                zstd.decompress_stream(download, output)
                full = bytes(output.getvalue())
            return base64.b64encode(full)

    if path not in cache:
        data = downloader(path)
        cache[path] = data

    return cache[path]


class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path[1:]

        if path == "latest":
            blobs = bucket.list_blobs(max_results=3)
            next(blobs)  # skip root
            latest = next(blobs).name
            matches = re.findall(
                r"ledgers/pubnet/[A-F0-9]+--(\d+)-(\d+)/[A-F0-9]+--(\d+)\.xdr\.zstd",
                latest)

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "batchStart": matches[0][0],
                "batchEnd": matches[0][1],
                "latest": matches[0][2],
            }).encode("ascii"))
            return

        print(path)

        if not path:
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.end_headers()
            self.wfile.write(b"Hello, world!")
            return

        if path in cache:
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.end_headers()
            self.wfile.write(cache[path])
            return

        blob = bucket.get_blob(path)
        if blob is None:
            self.send_response(404)
            return

        try:
            raw_metadata_batch = download_metadata(path, blob)
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.end_headers()
            self.wfile.write(raw_metadata_batch)
        except:
            self.send_response(404)

def run():
    server_address = ('', 8080)
    httpd = http.server.HTTPServer(server_address, RequestHandler)
    print("Serving on", server_address)
    httpd.serve_forever()


if __name__ == "__main__":
    run()