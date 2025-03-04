# Listen for UDP messages from Avara and dispatch commands accordingly.

import socket, os
from urllib.parse import urlencode

ip = '127.0.0.1'
port_listen = 19569

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((ip, port_listen))

print(f'Listening for messages from Avara on :{port_listen}...')

try:
    while True:
        etag = sock.recv(32).decode('utf-8')
        query = urlencode({'etag': etag})
        uri = f'vscode://skedastik.ty-levels/extension.findEtag?{query}'
        print(f'Received request to reveal etag "{etag}". Opening {uri}')
        os.system(f'open {uri}')
except:
    sock.close()
    raise
