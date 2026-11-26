# Golden Isles Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Gudril-cool/golden-isles-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Gudril-cool/golden-isles-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A golden-hour 3D flight game built for the [make.fun best-flight-game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

Fly a courier seaplane over the Aurelia Isles, a low-poly tropical archipelago
at sunset. Five sorties, five different jobs:

- **Ring Run** — thread eight glowing target rings in order, against the clock.
- **Island Delivery** — carry the mail to the Farrel strip and put it down
  gently; your landing is judged by sink rate.
- **Volcano Circuit** — six rings around Mount Cindera, the last over the
  crater itself.
- **Harbor Photo Run** — three photo gates over Port Aurelia's harbour; fly
  them low and centred to snap the frame, and get scored on the shot — every
  frame you take is pinned to the HUD as a thumbnail.
- **Lighthouse Supply Drop** — three crates slung under the belly for the
  lighthouse rock; fly the glowing pad, allow for the wind, and press B to let
  one go. Bullseye pays most; the rocks and the drink pay least.

Fuel burns with throttle and hard knocks cost hull, so every sortie is a set
of decisions, not just a joyride. A gentle, veering wind pushes a flying
aeroplane — and a falling crate — a little sideways, and the HUD carries its
arrow and strength so you can allow for it. Stall, ditch and crash states all
read as what happened, and landings are graded from *GREASED IT!* to
*HARD LANDING*.

- Chase camera and a cockpit view (C) with lit, live instruments: attitude
  indicator, airspeed, altimeter and heading, all driven by the flight model.
- HUD with altitude, speed and heading, fuel and hull, wind, mission and score.
- Procedural islands, a volcano with a lava crater, the town of Port Aurelia
  with its windows lit for the evening, a lighthouse whose beam sweeps the
  harbour, boats at anchor and a ferry under way trailing its wake, gulls
  circling the coast, and the sun's glitter path on the sea — all art
  generated in code, all sound synthesised with WebAudio. No network, no
  external assets: serve the folder and open `game/index.html`.

**Controls** — W/S throttle · ↑/↓ pitch · ←/→ or A/D bank · Space brakes ·
B drop a supply crate · C cockpit/chase camera · P pause · M mute ·
1/2/3/4/5 launch a mission.

Run it locally with `node serve.ts`, then open http://localhost:8080.
`node main.ts` hands the entry in: it copies `game/` and `screenshots/` to
the output directory and writes the dossier with the vendored make.fun
library.
