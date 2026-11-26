# Golden Isles Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Gudril-cool/golden-isles-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Gudril-cool/golden-isles-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A golden-hour 3D flight game built for the [make.fun best-flight-game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

Fly a courier seaplane over the Aurelia Isles, a low-poly tropical archipelago
at sunset. Three sorties, three different jobs:

- **Ring Run** — thread eight glowing target rings in order, against the clock.
- **Island Delivery** — carry the mail to the Farrel strip and put it down
  gently; your landing is judged by sink rate.
- **Volcano Circuit** — six rings around Mount Cindera, the last over the
  crater itself.

Fuel burns with throttle and hard knocks cost hull, so every sortie is a set
of decisions, not just a joyride. Stall, ditch and crash states all read as
what happened, and landings are graded from *GREASED IT!* to *HARD LANDING*.

- Chase camera and a cockpit view (C) with lit, live instruments: attitude
  indicator, airspeed, altimeter and heading, all driven by the flight model.
- HUD with altitude, speed and heading, fuel and hull, mission and score.
- Procedural islands, a volcano with a lava crater, the town of Port Aurelia
  and its lighthouse — all art generated in code, all sound synthesised with
  WebAudio. No network, no external assets: serve the folder and open
  `game/index.html`.

**Controls** — W/S throttle · ↑/↓ pitch · ←/→ or A/D bank · Space brakes ·
C cockpit/chase camera · P pause · M mute · 1/2/3 launch a mission.

Run it locally with `node serve.ts`, then open http://localhost:8080.
`node main.ts` hands the entry in: it copies `game/` and `screenshots/` to
the output directory and writes the dossier with the vendored make.fun
library.
