# python dist.py [--no-trim] src_alf dest_alf
#
# Render ALF template src_alf to distributable ALF file dest_alf.
#
# --no-trim
#   Don't remove comments or whitespace.

import sys, os
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from lxml import etree
from alf_globals import alf_globals

args = sys.argv

DO_TRIM = '--no-trim' not in args

fin = args[len(args) - 2]
fout = args[len(args) - 1]

print(f'Rendering {fout}...')

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
        '\033[37;41;1m' + s[c] + '\033[0m',
        '\033[91m' + s[c + 1 : c + n + 1] + '\033[0m'
    ])

try:
    alf = env.get_template(fin).render()

    parser = etree.XMLParser(remove_blank_text=DO_TRIM, remove_comments=DO_TRIM)
    alf = etree.tostring(etree.XML(alf, parser), encoding='unicode')

    with open(fout, 'w') as fh:
        # eliminate unnecessary whitespace in XML output
        fh.write(alf)

except Exception as e:
    os.system('tput bel')
    if (type(e) == etree.XMLSyntaxError):
        print('\033[1;35m' + type(e).__name__ + ': ' + e.msg + ':\033[0m')
        print(getContextHighlighted(alf, e.lineno, e.offset, 128))
        exit(1)
    else:
        raise e
