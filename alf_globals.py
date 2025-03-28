import math

TICKS_PER_SECOND = 15.625

# convert seconds to Avara game ticks
def toTicks(seconds):
    return seconds * TICKS_PER_SECOND

def throw(msg):
    raise Exception(msg)

def adjustedRadius(r):
    # Because Avara estimates player distance where actors with radii are
    # concerned (e.g. Area and Teleporter objects), it's necessary to make an
    # adjustment to achieve the actual radius desired. Through experiments, it
    # seems that the estimator makes a small exponential error. An
    # experimentally derived exponent is applied here to compensate. It is more
    # accurate at larger radii (>50).
    return math.pow(r, 0.98)

scratchDict = {}

def getScratch(key):
    return scratchDict[key] if key in scratchDict else None

def setScratch(key, value):
    scratchDict[key] = value
    return value

# These globals are exposed to all Jinja templates
alf_globals = {
    # The scratch dict can be used to maintain global state. For instance: To
    # increment a persistent counter over multiple invocations of the same
    # macro.
    'getScratch': getScratch,
    'setScratch': setScratch,
    
    'len': len,
    'str': str,
    'print': print,
    'throw': throw,
    'math': math,
    'int': int,
    'round': round,
    'min': min,
    'max': max,
    'abs': abs,
    'toTicks': toTicks,
    'adjustedRadius': adjustedRadius,
    'legFromHypotenuse': lambda length: length / math.sqrt(2),
    'hypotenuseFromLeg': lambda length: math.sqrt(2 * length * length),
    'MAX_WALL_SIZE': 20, # corresponds to LOCATORRECTSIZE in Avara code--walls larger than this are decimated; ramps are distorted
    'MAX_TEAMS': 8,
    'MAX_PLAYERS': 8,
    'TEAM_COLORS': [None, 'Green', 'Yellow', 'Red', 'Magenta', 'Purple', 'Blue', 'Black', 'White'],
    'PLAYER_RIDE_HEIGHT': 1.75,
    'GOODY_SPIN_SPEED': 2,
    'TELE_GO_TIME': 60, # time in ticks it takes for a teleporter to become usable again after teleporting to it (defined in CTeleporter.cpp)
    'PLANCK': 0.002, # miniscule distance to reduce z-fighting
    'YON_MAX': 500
}
