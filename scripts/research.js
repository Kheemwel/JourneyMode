import { world } from "@minecraft/server";
import { getMaxStackSize } from "./db.js";

/**
 * Normalizes item ID into a safe property key.
 * @param {string} itemId 
 * @returns {string} Safe dynamic property key (under 30 characters)
 */
function getPropertyKey(itemId) {
  // Strip namespace and keep key short to avoid limits
  const cleanId = itemId.includes(":") ? itemId.split(":")[1] : itemId;
  return `jr_${cleanId}`.substring(0, 30);
}

/**
 * Retrieves the global research scaling multiplier.
 * Looks up custom pack settings first, then falls back to world dynamic property.
 * @returns {number} 1 to 64
 */
export function getResearchMultiplier() {
  let multiplier = 64; // Default to full stack

  try {
    const dynamicSetting = world.getDynamicProperty("journey:research_multiplier");
    if (dynamicSetting !== undefined) {
      multiplier = Number(dynamicSetting);
    }
  } catch (e) {
    // Ignored — use default
  }

  if (isNaN(multiplier) || multiplier < 1) return 1;
  if (multiplier > 64) return 64;
  return multiplier;
}

/**
 * Calculates the exact target amount needed to research an item fully.
 * Scales stackables by multiplier, caps at max stack size, and requires 1 for unstackables.
 * @param {string} itemId 
 * @returns {number} Target quantity
 */
export function getResearchRequirement(itemId) {
  const maxStack = getMaxStackSize(itemId);
  const multiplier = getResearchMultiplier();

  if (maxStack === 1) {
    return 1;
  } else if (maxStack === 16) {
    return Math.min(16, multiplier);
  } else {
    return multiplier;
  }
}

/**
 * Gets a player's current research count for an item.
 * @param {Player} player 
 * @param {string} itemId 
 * @returns {number} Current count
 */
export function getResearchProgress(player, itemId) {
  try {
    const key = getPropertyKey(itemId);
    const val = player.getDynamicProperty(key);
    return val !== undefined ? Number(val) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Increments research progress for a player.
 * @param {Player} player 
 * @param {string} itemId 
 * @param {number} amount 
 * @returns {object} Results containing previous progress, new progress, target, and unlock event
 */
export function addResearchProgress(player, itemId, amount) {
  const key = getPropertyKey(itemId);
  const current = getResearchProgress(player, itemId);
  const target = getResearchRequirement(itemId);
  
  const nextProgress = Math.min(target, current + amount);
  
  try {
    player.setDynamicProperty(key, nextProgress);
  } catch (e) {
    // Dynamic property set failed (e.g. limit reached)
  }

  return {
    previous: current,
    current: nextProgress,
    target: target,
    unlocked: nextProgress >= target && current < target
  };
}

/**
 * Checks if a player has fully researched an item.
 * @param {Player} player 
 * @param {string} itemId 
 * @returns {boolean} True if unlocked
 */
export function isUnlocked(player, itemId) {
  const progress = getResearchProgress(player, itemId);
  const target = getResearchRequirement(itemId);
  return progress >= target;
}

/**
 * Resets all journey mode research progress for a specific player.
 * @param {Player} player 
 */
export function resetResearch(player) {
  try {
    const propertyIds = player.getDynamicPropertyIds();
    for (const id of propertyIds) {
      if (id.startsWith("jr_")) {
        player.setDynamicProperty(id, undefined);
      }
    }
  } catch (e) {
    // Fallback if getDynamicPropertyIds is not supported
  }
}
