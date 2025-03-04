# Listen for UDP messages from Avara and dispatch commands accordingly.

import socket, os

ip = '127.0.0.1'
port_listen = 19569

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((ip, port_listen))

print(f'Listening for messages from Avara on :{port_listen}...')

try:
    while True:
        etag = sock.recv(6).decode('utf-8')
        print(f'Received request to reveal etag "{etag}". Opening VS Code command URI...')
        os.system(f'open vscode://skedastik.ty-levels/extension.findEtag?etag={etag}')
except:
    sock.close()
    raise
