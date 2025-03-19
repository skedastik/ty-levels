# Listen for UDP messages from Avara and dispatch commands accordingly.

import socket, os
from urllib.parse import urlencode

ip = '127.0.0.1'
port_listen = 19569

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((ip, port_listen))

print(f'dispatcher.py -> Listening for messages from Avara on :{port_listen}...')

def openVsCodeUri(command, params):
    query = urlencode(params)
    uri = f'vscode://skedastik.ty-levels/{command}?{query}'
    print(f'dispatcher.py -> Opening "{uri}"...')
    os.system(f'open "{uri}"')

def commandFind(etag):
    openVsCodeUri('extension.findEtag', {'etag': etag})

def commandSetParamOnEtag(argString: str):
    args = argString.split(',')
    if len(args) < 2:
        print('dispatcher.py -> Expected at least two arguments for "setParamOnEtag" command.')
        return
    params = {}
    for arg in args:
        tokens = arg.split('=', 1)
        if (len(tokens) != 2):
            print(f'dispatcher.py -> Incorrectly formatted arg for "setParamOnEtag": {arg}')
        param = tokens[0]
        value = tokens[1]
        params[param] = value
    openVsCodeUri('extension.setParamOnEtag', params)

dispatchTable = {
    'findEtag': commandFind,
    'setParamOnEtag': commandSetParamOnEtag
}

def dispatch(message: str):
    print(f'dispatcher.py -> Received "{message}".')
    tokens = message.split(' ', 1)
    command = tokens[0]
    if command not in dispatchTable:
        print(f'dispatcher.py -> Ignoring unrecognized command "{command}".')
        return
    argString = tokens[1] if len(tokens) > 1 else ''
    dispatchTable[command](argString)

try:
    while True:
        dispatch(sock.recv(64).decode('utf-8'))
except:
    sock.close()
    print('dispatcher.py -> Socket closed.')
    raise
