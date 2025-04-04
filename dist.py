# python dist.py [options] src_alf dest_alf
#
# Render ALF template src_alf to distributable ALF file dest_alf.
#
# The following options are supported:
#
# --trim
#       Remove comments and whitespace.
# --simplify
#       Simplify algebraic expressions when applying auto-edit annotations.
# --strip-etags
#       Strip etags.
# --crush_floats
#       Truncate floats to fourth decimal place.
# --debug
#       Set DEBUG global to true in ALF template environment
# --use-auto-edit-daemon
#       Use auto-edit daemon instead of running auto-edit.js directly. The
#       daemon must be running already.

import sys, os, re, socket
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from lxml import etree
from alf_globals import alf_globals

args = sys.argv

DO_TRIM = '--trim' in args
DO_STRIP_ETAGS = '--strip-etags' in args
DO_CRUSH_FLOATS = '--crush-floats' in args
DO_SIMPLIFY = '--simplify' in args
USE_AUTO_EDIT_DAEMON = '--use-auto-edit-daemon' in args
DEBUG = '--debug' in args

fin = args[len(args) - 2]
fout = args[len(args) - 1]

print(f'dist.py -> Rendering {fout}...')

class RelativeEnvironment(Environment):
    """Override join_path() to enable relative template paths."""
    def join_path(self, template, parent):
        if (template.startswith('.')):
            p = os.path.join(os.path.dirname(parent), template)
            return os.path.normpath(p)
        return template

env = RelativeEnvironment(
    loader=FileSystemLoader('./src'),
    undefined=StrictUndefined
)

def sformat(value, fmt):
    return fmt.replace('{}', str(value))

env.filters['sformat'] = sformat
alf_globals.update({
    'DEBUG': DEBUG
})
env.globals.update(alf_globals)

def getContextHighlighted(s, line, offset, n):
    c = 0
    l = 1
    while l < line:
        c = s.find('\n', c) + 1
        l += 1
    c += offset
    return ''.join([
        '\033[91m' + s[max(c - n, 0) : c] + '\033[0m',
        '\033[37;41;1m' + (s[c] if c < len(s) else ' ') + '\033[0m',
        '\033[91m' + s[c + 1 : c + n + 1] + '\033[0m'
    ])

def printError(msg):
    print(f'\033[1;35m{msg}\033[0m')

def autoEditViaFiles(alf):
    os.system('mkdir -p tmp')
    alfFileName = os.path.basename(fin)
    tmpPrePath = f'tmp/{alfFileName}'
    tmpPostPath = f'tmp/{alfFileName}-auto-edit'
    with open(tmpPrePath, 'w') as fh:
        fh.write(alf)
    
    autoEditShellCommand = f'node auto-edit.js {' '.join(args[1:-2])} {tmpPrePath} {tmpPostPath}'
    status = os.system(autoEditShellCommand)
    if status != 0:
        if status == 32512:
            raise Exception(f'auto-edit.js exited with status {status}. Is your Node.js environment activated?')
        raise Exception(f'auto-edit.js exited with status {status}.')
    with open(tmpPostPath, 'r') as fh:
        return fh.read()

SOCKET_PATH = 'var/auto-edit.sock'
EOF_STRING = '<<<EOF>>>'

def autoEditViaSocket(alf: str):
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(SOCKET_PATH)
        sock.sendall((alf + EOF_STRING).encode('utf-8'))
        response = []
        boundaryChars = ''
        while True:
            chunk = sock.recv(1024).decode()
            if not chunk:
                raise Exception('auto-edit daemon terminated connection prematurely.')
            response.append(chunk)
            # EOF string could fall on chunk boundary
            if EOF_STRING in chunk or EOF_STRING in boundaryChars + chunk[0:len(EOF_STRING) - 1]:
                break
            boundaryChars = chunk[1 - len(EOF_STRING):]
        response = ''.join(response)
        return response[0 : len(response) - len(EOF_STRING)]
    finally:
        sock.close()

try:
    alf = env.get_template(fin).render()

    if re.search(r'<!--\s*auto:\s*(.+?)\s*-->', alf):
        alf = autoEditViaSocket(alf) if USE_AUTO_EDIT_DAEMON else autoEditViaFiles(alf)

    parser = etree.XMLParser(remove_blank_text=DO_TRIM, remove_comments=DO_TRIM)
    tree = etree.XML(alf, parser)

    if DO_STRIP_ETAGS:
        attr='etag'
        for elem in tree.xpath(f'//*[@{attr}]'):
            del elem.attrib[attr]

    alf = etree.tostring(tree, encoding='unicode')

    if DO_CRUSH_FLOATS:
        alf = re.sub(r'"(-?)([0-9]+?\.[0-9]{4})[0-9]+?(e-?[0-9]+?)?"', r'"\1\2\3"', alf)

    with open(fout, 'w') as fh:
        # eliminate unnecessary whitespace in XML output
        fh.write(alf)
except Exception as e:
    os.system('tput bel')
    if type(e) == etree.XMLSyntaxError:
        printError(type(e).__name__ + ': ' + e.msg + ':')
        print(getContextHighlighted(alf, e.lineno, e.offset, 128))
        exit(1)
    else:
        raise
