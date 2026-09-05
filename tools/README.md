# Tools

Everything here runs under plain Node with no dependencies. The game's own
files are loaded into a sandbox by `load.js`, so the tools exercise exactly the
code the browser runs.

| command | what it does |
| --- | --- |
| `node tools/validate.js` | Content consistency: map shapes, walkable ground, every enemy reachable from the deployment zone, abilities and items that jobs actually refer to, starter kit that cannot be sold. |
| `node tools/regress.js` | Replays each engine defect an adversarial review once found, so a change that brings one back fails here. |
| `node tools/soak.js [battles] [seed]` | Plays randomised battles across every map, job, monster, passive and objective, checking the invariants that must hold whatever happened. Deterministic from its seed. |
| `node tools/test-elements.js` | Elemental affinities: weakness, resistance, absorption, immunity, prediction and AI awareness. |
| `node tools/test-statuses.js` | Silence, Blind and Berserk, the gear that wards them off and the abilities that lift them. |
| `node tools/test-boss.js` | The final battle's second shape and the difficulty it produces. |
| `node tools/simulate.js [runs] [training] [retries]` | Plays whole campaigns with the AI on both sides, retrying a lost chapter as a player would, and reports the difficulty curve. |
| `node tools/make-icons.js` | Redraws every app icon, web and Android, from the game's own sprites. |

Run them all before shipping a change:

```bash
for t in validate regress soak test-elements test-statuses test-boss; do
  node tools/"$t".js || echo "FAILED: $t"
done
```
