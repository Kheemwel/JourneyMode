import { ItemTypes, BlockTypes, ItemStack } from "@minecraft/server";

const friendlyNameCache = new Map();
const categoryCache = new Map();
const stackSizeCache = new Map();
const texturePathCache = new Map();

export function isBlock(itemId) {
  try {
    return BlockTypes.get(itemId) !== undefined;
  } catch (e) {
    return false;
  }
}

export function getFriendlyName(itemId) {
  if (friendlyNameCache.has(itemId)) {
    return friendlyNameCache.get(itemId);
  }

  const cleanId = itemId.includes(":") ? itemId.split(":")[1] : itemId;
  const friendlyName = cleanId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  friendlyNameCache.set(itemId, friendlyName);
  return friendlyName;
}

export function getCategory(itemId) {
  if (categoryCache.has(itemId)) {
    return categoryCache.get(itemId);
  }

  const name = itemId.toLowerCase();
  let category = "Materials & Items";

  if (name.includes("_sword") || name.includes("trident") || name.includes("mace")) {
    category = "Swords";
  } else if (name.includes("_pickaxe")) {
    category = "Pickaxes";
  } else if (name.includes("_axe")) {
    category = "Axes";
  } else if (name.includes("_shovel")) {
    category = "Shovels";
  } else if (name.includes("_hoe")) {
    category = "Hoes";
  } else if (name.includes("_helmet")) {
    category = "Helmets";
  } else if (name.includes("_chestplate") || name.includes("elytra")) {
    category = "Chestplates";
  } else if (name.includes("_leggings")) {
    category = "Leggings";
  } else if (name.includes("_boots")) {
    category = "Boots";
  } else if ([
    "shield", "bow", "crossbow", "shears", "flint_and_steel", "fishing_rod",
    "spyglass", "brush", "compass", "clock", "lead", "name_tag"
  ].some(kw => name.includes(kw))) {
    category = "Tools & Utility";
  } else if ([
    "apple", "beef", "porkchop", "chicken", "mutton", "rabbit", "fish", "salmon",
    "cod", "bread", "cookie", "pie", "stew", "soup", "potato", "carrot", "melon",
    "pumpkin", "berries", "chorus_fruit", "golden_apple", "golden_carrot", "mushrooms"
  ].some(kw => name.includes(kw))) {
    category = "Food";
  } else if (isBlock(itemId)) {
    category = "Blocks";
  }

  categoryCache.set(itemId, category);
  return category;
}

export function getMaxStackSize(itemId) {
  if (stackSizeCache.has(itemId)) {
    return stackSizeCache.get(itemId);
  }

  let maxStack = 64;
  try {
    const tempStack = new ItemStack(itemId, 1);
    maxStack = tempStack.maxAmount;
  } catch (e) {
    const name = itemId.toLowerCase();
    if ([
      "sword", "axe", "pickaxe", "shovel", "hoe", "helmet", "chestplate", "leggings", "boots",
      "shield", "elytra", "flint_and_steel", "fishing_rod", "spyglass", "brush", "mace",
      "totem_of_undying", "saddle", "horse_armor", "minecart", "boat", "bucket", "potion"
    ].some(kw => name.includes(kw))) {
      maxStack = 1;
    } else if ([
      "ender_pearl", "snowball", "egg", "bucket", "sign", "banner"
    ].some(kw => name.includes(kw))) {
      maxStack = 16;
    }
  }

  stackSizeCache.set(itemId, maxStack);
  return maxStack;
}

/**
 * FIX: Converts modern item registry names into robust Bedrock UI texture keys.
 * Maps them directly to internal item icons so you don't need manual asset tracking.
 */
export function getTexturePath(itemId) {
  if (texturePathCache.has(itemId)) {
    return texturePathCache.get(itemId);
  }

  const cleanId = itemId.includes(":") ? itemId.split(":")[1] : itemId;
  let path = "";

  // Explicit overrides for vanilla texture quirks inside standard dialogue menus
  if (cleanId === "stick") {
    path = "textures/items/stick.png";
  } else if (cleanId === "compass") {
    path = "textures/items/compass_item.png";
  } else if (isBlock(itemId)) {
    path = `textures/blocks/${cleanId}.png`;
  } else {
    // Bedrock Forms fallback structure for modern engine execution
    path = `textures/items/${cleanId}.png`;
  }

  texturePathCache.set(itemId, path);
  return path;
}

export function getAllItems() {
  const items = [];
  const allTypes = ItemTypes.getAll();

  for (const itemType of allTypes) {
    const itemId = itemType.id;
    items.push({
      id: itemId,
      name: getFriendlyName(itemId),
      category: getCategory(itemId),
      maxStack: getMaxStackSize(itemId),
      texture: getTexturePath(itemId)
    });
  }

  return items;
}