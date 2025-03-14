import socket, os

# Avara's UDP packet structure as seen in CCommManager.h as of 2025.02.08:
#
#     #pragma pack(1)
#     typedef struct PacketInfo {
#         struct PacketInfo *qLink;
#         int16_t sender;
#         int16_t distribution;
#         int8_t command;
#         int8_t p1;
#         int16_t p2;
#         int32_t p3;
#         int16_t dataLen;
#         int16_t flags;
#         char dataBuffer[PACKETDATABUFFERSIZE];
#     } PacketInfo;
#     #pragma pack()

# The first two bytes below are the CRC (obtained from Avara network logs). The
# last byte is the command code corresponding to the definitions in CommDefs.h
# in Avara's source code.
kpLiveReloadPause = bytearray(b'\xc5\xd9\x00\x00\x00\x00\x00\x00\x22')
kpLiveReloadLevel = bytearray(b'\x4c\xc8\x00\x00\x00\x00\x00\x00\x23')
kpLiveReloadStart = bytearray(b'\xf3\xbc\x00\x00\x00\x00\x00\x00\x24')

# This is the expected version of Avara. Update this whenever you update the
# Avara editing-tools branch.
expectedAvaraVersion = '92ed28d5'

ip = '127.0.0.1'
port_avara = 19567
port_listen = 19568

sock_in = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock_in.settimeout(4)
sock_in.bind((ip, port_listen))

sock_out = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

try:
    sock_out.sendto(kpLiveReloadPause, (ip, port_avara))
    sock_in.recv(4)
    sock_out.sendto(kpLiveReloadLevel, (ip, port_avara))
    sock_in.recv(4)
    sock_out.sendto(kpLiveReloadStart, (ip, port_avara))
except socket.timeout:
    os.system('tput bel')
    print('\033[1;35m' + 'Live reload timed out. Is your Avara server running? Is it the correct version (' + expectedAvaraVersion + ')?' + '\033[0m')
    exit(1)
finally:
    sock_in.close()
