import socket
from time import sleep

ip = '127.0.0.1'
port = 19567

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

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
kpLiveReloadPause = bytearray(b'\xc2\x0f\x00\x00\x00\x00\x00\x00\x22')
kpLiveReloadLevel = bytearray(b'\x4b\x1e\x00\x00\x00\x00\x00\x00\x23')
kpLiveReloadStart = bytearray(b'\xf4\x6a\x00\x00\x00\x00\x00\x00\x24')

sock.sendto(kpLiveReloadPause, (ip, port))
sock.sendto(kpLiveReloadLevel, (ip, port))
sleep(0.1)
sock.sendto(kpLiveReloadStart, (ip, port))
