# Tantalus

A new set for 2025.

## The Goal

Broadly speaking, the goal of this set is to reduce the chaos of the typical Avara experience. This means addressing several dimensions of the game.

## Architecture

### Exposed vs. Covered

Architecture can either expose the player or offer them cover. Levels should be designed with this intention in mind.

Baghdad, a true classic, levels the playing field by putting everyone in the same position of being totally exposed. Bwadi strikes a good balance between covered and exposed areas.

Many levels seemed to be designed with little thought put into this dynamic. Players are funneled into dangerously exposed positions with zero incentive or intention. These are **dead zones**. They are a design anti-pattern.

### Mobility

Architecture has a huge impact on mobility. Mobility in Avara is challenging enough as it is. Players move and turn slowly. Getting snagged on geometry is one of the worst aspects of Avara's gameplay.

- Visual cueing
    - Floor markings to indicate unimpeded direction of travel?
    - Floor markings to indicate nearby walls?
- Standards
    - What is the ideal wall height that provides cover while still being easy to hurdle?
    - What is the steepest a ramp can be before it starts to hinder movement?
- Fast travel
    - Short range bi-directional teleporters that allow players to "blink"?
    - Bi-directional arches that force-push players allowing them to "dash"?

## Spawn points

All too often players will spawn directly into battle. This creates a chaotic tempo that lacks controlled pacing. It also leads to cheap kills.

- Consider placing incarnators in inaccessible locations. They should serve as temporary observational vantage points and be sheltered from direct fire. They should not provide a positional advantage, nor should they encourage camping.
- Change the tempo of the game by placing incarnators farther away in low-traffic areas.
- Consolidate initial placement of team members by using `Walker` objects.
    - Ideally, consolidate team incarnators on one side of the map?

## Survivability

All too often players are S.O.L. after surviving a skirmish. Once you're out of ammo and boosters you're just a sitting duck. Architecture can help by offering cover, but is there more we can do?

- Experiment with goodies that grant shields and energy, or boostTime.
- Offer booster goodies, but make them rare.

## Team deathmatch?

Team deathmatch isn't as much of a thing as it should be. Teams would go a long way in reducing chaos and cheap kills.
