# Priority Plan (Pokemon B&W-Like)

## Context
Target: bring this project closer to Pokemon Black & White gameplay feel while keeping scope realistic for iterative delivery.

Status check on previously discussed priorities:
- `P1 Catch mechanic`: done
- `P2 Camera follow`: done
- `P3 Battle animations + transition`: done
- `P10 Mobile controls`: done

Estimation basis:
- 1 developer (Codex) implementing directly in this repository.
- Focus on playable quality first, not final-polish art pipeline.
- Time is in dev-days.

## Priority Backlog
| Priority | Feature | Complexity | Estimate | Worth to Add | Notes |
|---|---|---|---|---|---|
| P1 | Evolution system + level-up move learning | Large | 4-6 days | High | Core Pokemon loop, high retention impact |
| P1 | Move pool expansion (40-60 moves) + basic balancing | Medium-Large | 3-5 days | High | Current move variety is too narrow |
| P1 | Battle AI heuristic (prefer super-effective, avoid bad status use) | Medium | 2-3 days | High | Noticeable battle quality upgrade |
| P1 | Pokemon Center + full-heal + whiteout flow | Medium | 2-4 days | High | Core recovery and fail-state loop |
| P1 | Ability system v1 (10-20 key abilities) | Large | 5-8 days | High | Major battle identity feature |
| P1 | Audio pass v1 (overworld/battle BGM + core SFX) | Medium | 2-4 days | High | Big feel upgrade with moderate effort |
| P2 | Handcrafted routes (replace random generation gradually) | Extra Large | 8-14 days | High | Biggest exploration quality jump |
| P2 | Indoor/building support (Center/Mart/Gym shells) | Large | 5-8 days | High | Needed for B&W-style world structure |
| P2 | Gym progression system (badges + gate checks + reward loop) | Extra Large | 10-16 days | High | Main progression backbone |
| P2 | PC box system (party cap enforcement + storage UI) | Medium | 2-4 days | High | Completes capture/party flow |
| P3 | TM/HM system | Medium-Large | 4-7 days | Medium | Valuable but not blocker for v1 |
| P3 | Double/triple/rotation battles | Extra Large | 10-18 days | Low (for now) | Expensive; postpone until core is stable |
| P3 | Breeding/daycare | Large | 5-8 days | Low (for now) | Late-game depth, not v1 critical |

## Recommended Delivery Sequence
1. Battle depth foundation: evolution, move learning, move expansion, AI.
2. Loop completion: Pokemon Center, PC box, audio pass.
3. World quality pass: handcrafted routes + indoor system.
4. Progression layer: gym and badge loop.
5. Optional systems: TM/HM, advanced battle formats, breeding.

## Risk Notes
- `Feature creep`: scope can expand quickly; lock acceptance criteria per feature.
- `Data structure growth`: move/ability/evolution tables should be centralized and typed early.
- `Asset dependency`: handcrafted map and audio quality depend on available assets.
- `Regression risk`: battle and save-state logic need test checklist each milestone.

## Rough Timeline
- `Phase 1 (2-3 weeks)`: all P1 except handcrafted map/indoor/gym.
- `Phase 2 (2-4 weeks)`: handcrafted routes + indoor + PC box.
- `Phase 3 (2-3 weeks)`: gym progression and polish.

Total realistic range: `~6-10 weeks`, depending on scope changes and polish depth.
