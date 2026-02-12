import { getMoveData, type MoveData, type MoveId } from '../data/battle/moves'
import { getTypeMultiplier } from '../data/battle/typeChart'
import type { StatKey, StatusId } from '../data/battle/types'
import type { PokemonInstance } from './pokemon'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const getStageMultiplier = (stage: number) =>
  stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)

export const getEffectiveStat = (pokemon: PokemonInstance, stat: StatKey) => {
  const stage = pokemon.statStages[stat]
  const base = pokemon.stats[stat]
  const stageAdjusted = Math.floor(base * getStageMultiplier(stage))

  if (stat === 'spe' && pokemon.status === 'paralyze') {
    return Math.floor(stageAdjusted * 0.5)
  }

  return stageAdjusted
}

export const getStatusLabel = (status: StatusId) => {
  switch (status) {
    case 'paralyze':
      return 'PAR'
    case 'burn':
      return 'BRN'
    case 'poison':
      return 'PSN'
    case 'sleep':
      return 'SLP'
    default:
      return ''
  }
}

export const attemptAction = (pokemon: PokemonInstance) => {
  const messages: string[] = []

  if (pokemon.status === 'sleep') {
    if (pokemon.statusTurns > 0) {
      pokemon.statusTurns -= 1
      messages.push(`${pokemon.name} is fast asleep!`)
      return { canAct: false, messages }
    }

    pokemon.status = 'none'
    messages.push(`${pokemon.name} woke up!`)
  }

  if (pokemon.status === 'paralyze') {
    if (Math.random() < 0.25) {
      messages.push(`${pokemon.name} is paralyzed! It can't move!`)
      return { canAct: false, messages }
    }
  }

  return { canAct: true, messages }
}

export const applyEndOfTurnStatus = (pokemon: PokemonInstance) => {
  if (pokemon.status === 'burn') {
    const damage = Math.max(1, Math.floor(pokemon.stats.hp / 16))
    pokemon.currentHp = Math.max(0, pokemon.currentHp - damage)
    return { damage, message: `${pokemon.name} is hurt by its burn!` }
  }

  if (pokemon.status === 'poison') {
    const damage = Math.max(1, Math.floor(pokemon.stats.hp / 8))
    pokemon.currentHp = Math.max(0, pokemon.currentHp - damage)
    return { damage, message: `${pokemon.name} is hurt by poison!` }
  }

  return { damage: 0, message: '' }
}

const applyStatChange = (pokemon: PokemonInstance, stat: StatKey, amount: number) => {
  const before = pokemon.statStages[stat]
  const after = clamp(before + amount, -6, 6)
  pokemon.statStages[stat] = after
  return after - before
}

const statLabel = (stat: StatKey) => {
  switch (stat) {
    case 'atk':
      return 'Attack'
    case 'def':
      return 'Defense'
    case 'spa':
      return 'Sp. Atk'
    case 'spd':
      return 'Sp. Def'
    case 'spe':
      return 'Speed'
    default:
      return stat
  }
}

const stageMessage = (name: string, stat: StatKey, delta: number) => {
  if (delta === 0) return `${name}'s ${statLabel(stat)} won't go further!`
  if (delta === 1) return `${name}'s ${statLabel(stat)} rose!`
  if (delta === 2) return `${name}'s ${statLabel(stat)} rose sharply!`
  if (delta === -1) return `${name}'s ${statLabel(stat)} fell!`
  if (delta === -2) return `${name}'s ${statLabel(stat)} harshly fell!`
  return `${name}'s ${statLabel(stat)} changed!`
}

const inflictStatus = (target: PokemonInstance, status: StatusId) => {
  if (target.status !== 'none') {
    return { applied: false, message: `${target.name} is already affected!` }
  }

  target.status = status
  if (status === 'sleep') {
    target.statusTurns = Math.floor(Math.random() * 3) + 1
  }

  switch (status) {
    case 'paralyze':
      return { applied: true, message: `${target.name} is paralyzed!` }
    case 'burn':
      return { applied: true, message: `${target.name} was burned!` }
    case 'poison':
      return { applied: true, message: `${target.name} was poisoned!` }
    case 'sleep':
      return { applied: true, message: `${target.name} fell asleep!` }
    default:
      return { applied: false, message: '' }
  }
}

export const resolveMove = (
  attacker: PokemonInstance,
  defender: PokemonInstance,
  moveData: MoveData,
) => {
  const messages: string[] = []
  const defaultStatusChance = 0.5

  const actionCheck = attemptAction(attacker)
  messages.push(...actionCheck.messages)
  if (!actionCheck.canAct) {
    return { messages, didHit: false, canAct: false }
  }

  const accuracyRoll = Math.random() * 100
  if (accuracyRoll > moveData.accuracy) {
    messages.push(`${attacker.name}'s attack missed!`)
    return { messages, didHit: false, canAct: true }
  }

  if (moveData.category === 'status') {
    if (moveData.effect?.statChanges) {
      const target = moveData.effect.target === 'self' ? attacker : defender
      for (const [statKey, amount] of Object.entries(moveData.effect.statChanges)) {
        const delta = applyStatChange(target, statKey as StatKey, amount ?? 0)
        messages.push(stageMessage(target.name, statKey as StatKey, delta))
      }
    }

    if (moveData.effect?.status) {
      const defenderTypes = defender.species.types
      const typeMultiplier = getTypeMultiplier(moveData.type, defenderTypes)
      if (typeMultiplier === 0) {
        messages.push("It doesn't affect the target...")
        return { messages, didHit: true, canAct: true }
      }

      const target = moveData.effect.target === 'self' ? attacker : defender
      const chance = moveData.effect.statusChance ?? defaultStatusChance
      if (Math.random() < chance) {
        const result = inflictStatus(target, moveData.effect.status)
        if (result.message) messages.push(result.message)
      }
    }

    return { messages, didHit: true, canAct: true }
  }

  const power = moveData.power ?? 0
  const attackStat =
    moveData.category === 'physical' ? getEffectiveStat(attacker, 'atk') : getEffectiveStat(attacker, 'spa')
  const defenseStat =
    moveData.category === 'physical' ? getEffectiveStat(defender, 'def') : getEffectiveStat(defender, 'spd')

  const levelFactor = (2 * attacker.level) / 5 + 2
  let baseDamage = Math.floor(((levelFactor * power * attackStat) / defenseStat) / 50) + 2

  const attackerTypes = attacker.species.types
  const defenderTypes = defender.species.types
  const stab = attackerTypes.includes(moveData.type) ? 1.5 : 1
  const typeMultiplier = getTypeMultiplier(moveData.type, defenderTypes)
  const crit = Math.random() < 1 / 16 ? 1.5 : 1
  const random = 0.85 + Math.random() * 0.15

  if (typeMultiplier === 0) {
    messages.push("It doesn't affect the target...")
    return { messages, didHit: true, canAct: true }
  }

  let modifier = stab * typeMultiplier * crit * random
  if (attacker.status === 'burn' && moveData.category === 'physical') {
    modifier *= 0.5
  }

  const damage = Math.max(1, Math.floor(baseDamage * modifier))
  defender.currentHp = Math.max(0, defender.currentHp - damage)

  if (crit > 1) messages.push('A critical hit!')
  if (typeMultiplier > 1) messages.push("It's super effective!")
  if (typeMultiplier > 0 && typeMultiplier < 1) messages.push("It's not very effective...")
  if (typeMultiplier === 0) messages.push("It doesn't affect the target...")

  if (moveData.effect?.status) {
    const chance = moveData.effect.statusChance ?? defaultStatusChance
    if (Math.random() < chance) {
      const result = inflictStatus(defender, moveData.effect.status)
      if (result.message) messages.push(result.message)
    }
  }

  return { messages, didHit: true, canAct: true }
}

export const attemptCatch = (
  target: PokemonInstance,
  ballRate: number,
) => {
  const maxHp = target.stats.hp
  const currentHp = target.currentHp
  const hpFactor = (3 * maxHp - 2 * currentHp) / (3 * maxHp)
  const statusBonus = target.status === 'sleep' ? 2 : target.status === 'paralyze' ? 1.5 : target.status === 'burn' || target.status === 'poison' ? 1.5 : 1
  const catchRate = Math.min(255, Math.floor(255 * hpFactor * ballRate * statusBonus))
  const shakeChance = Math.floor(65536 / Math.pow(255 / catchRate, 0.1875))

  let shakes = 0
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65536 < shakeChance) {
      shakes++
    } else {
      break
    }
  }

  const caught = shakes >= 4
  const messages: string[] = []

  if (shakes === 0) {
    messages.push('Oh no! The Pokemon broke free!')
  } else if (shakes === 1) {
    messages.push('Aww! It appeared to be caught!')
  } else if (shakes === 2) {
    messages.push('Aargh! Almost had it!')
  } else if (shakes === 3) {
    messages.push('Shoot! It was so close, too!')
  }

  if (caught) {
    messages.push(`Gotcha! ${target.name} was caught!`)
  }

  return { caught, shakes, messages }
}

const STAGE_MAX = 6
const STAGE_MIN = -6

const estimateDamageScore = (
  attacker: PokemonInstance,
  defender: PokemonInstance,
  moveData: MoveData,
) => {
  const power = moveData.power ?? 0
  if (power <= 0) return 0

  const attackStat =
    moveData.category === 'physical' ? getEffectiveStat(attacker, 'atk') : getEffectiveStat(attacker, 'spa')
  const defenseStat =
    moveData.category === 'physical' ? getEffectiveStat(defender, 'def') : getEffectiveStat(defender, 'spd')

  const stab = attacker.species.types.includes(moveData.type) ? 1.5 : 1
  const typeMultiplier = getTypeMultiplier(moveData.type, defender.species.types)
  if (typeMultiplier === 0) return -100

  const expectedBase = ((2 * attacker.level) / 5 + 2) * power * (attackStat / Math.max(1, defenseStat))
  const expectedDamage = Math.max(1, Math.floor((expectedBase / 50 + 2) * stab * typeMultiplier))
  const accuracyFactor = moveData.accuracy / 100

  let score = expectedDamage * accuracyFactor
  if (attacker.species.types.includes(moveData.type)) score += 10
  if (typeMultiplier > 1) score += 25
  if (typeMultiplier < 1) score -= 12
  if (defender.currentHp <= expectedDamage) score += 120

  return score
}

const evaluateStatusMove = (
  attacker: PokemonInstance,
  defender: PokemonInstance,
  moveData: MoveData,
) => {
  let score = 12
  const effect = moveData.effect
  if (!effect) return score

  if (effect.status) {
    const target = effect.target === 'self' ? attacker : defender
    const chance = effect.statusChance ?? 0.5
    if (target.status === 'none') score += 40 * chance
    else score -= 25
  }

  if (effect.statChanges) {
    for (const [key, amount] of Object.entries(effect.statChanges)) {
      const stat = key as StatKey
      const target = effect.target === 'self' ? attacker : defender
      const currentStage = target.statStages[stat]
      const delta = amount ?? 0

      if (delta > 0) {
        if (currentStage >= STAGE_MAX) {
          score -= 10
        } else {
          score += 14 * delta
        }
      }

      if (delta < 0) {
        if (currentStage <= STAGE_MIN) {
          score -= 10
        } else {
          score += 14 * Math.abs(delta)
        }
      }
    }
  }

  return score * (moveData.accuracy / 100)
}

const scoreMove = (attacker: PokemonInstance, defender: PokemonInstance, moveData: MoveData) => {
  if (moveData.category === 'status') {
    return evaluateStatusMove(attacker, defender, moveData)
  }

  let score = estimateDamageScore(attacker, defender, moveData)
  const effect = moveData.effect
  if (effect?.status && defender.status === 'none') {
    score += 10 * (effect.statusChance ?? 0.5)
  }
  return score
}

export const chooseMove = (attacker: PokemonInstance, defender: PokemonInstance) => {
  const usableMoves = attacker.moves.filter((move) => move.pp > 0)
  if (usableMoves.length === 0) return null

  const ranked = usableMoves
    .map((moveState) => {
      const move = getMoveData(moveState.id)
      const score = scoreMove(attacker, defender, move) + Math.random() * 4
      return { moveState, score }
    })
    .sort((a, b) => b.score - a.score)

  const bestScore = ranked[0]?.score ?? 0
  const shortlist = ranked.filter((entry) => entry.score >= bestScore - 8)
  const selected = shortlist[Math.floor(Math.random() * shortlist.length)] ?? ranked[0]
  return selected?.moveState ?? null
}

export const getMoveDataFromState = (moveState: { id: MoveId }) => getMoveData(moveState.id)
