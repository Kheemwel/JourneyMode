import { system, world, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getAllItems, getFriendlyName } from "./db.js";
import { 
  getResearchProgress, 
  getResearchRequirement, 
  addResearchProgress, 
  isUnlocked, 
  resetResearch,
  getResearchMultiplier
} from "./research.js";

function isPlayerAdmin(player) {
  return player.hasTag("admin") || player.commandPermissionLevel >= 2;
}

function defer(callback) {
  system.run(callback);
}

export function showMainMenu(player) {
  const form = new ActionFormData();
  form.title("§eJourney Mode Codex");
  form.body("Welcome to the Journey Mode database. Research items to gain infinite duplicates!");

  const actionMap = [];

  form.button("Research Items in Inventory", "textures/items/book_writable.png");
  actionMap.push(() => showResearchMenu(player));

  form.button("Browse Catalog", "textures/items/book_portfolio.png");
  actionMap.push(() => showBrowseMenu(player));

  form.button("Search Catalog", "textures/items/compass_item.png");
  actionMap.push(() => showSearchMenu(player));

  if (isPlayerAdmin(player)) {
    form.button("Settings", "textures/items/comparator.png");
    actionMap.push(() => showSettingsMenu(player));

    form.button("Reset My Progress", "textures/blocks/barrier.png");
    actionMap.push(() => showResetConfirmMenu(player));
  }

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;
    
    const handleSelection = actionMap[response.selection];
    if (handleSelection) {
      defer(handleSelection);
    }
  }).catch(() => {});
}

function getResearchableInventoryItems(player) {
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) return [];
  const container = inventory.container;
  
  const itemsMap = new Map();
  
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item) continue;
    
    const itemId = item.typeId;
    if (isUnlocked(player, itemId)) continue;
    
    if (!itemsMap.has(itemId)) {
      itemsMap.set(itemId, {
        id: itemId,
        name: getFriendlyName(itemId),
        totalCount: 0
      });
    }
    
    const entry = itemsMap.get(itemId);
    entry.totalCount += item.amount;
  }
  
  return Array.from(itemsMap.values());
}

function consumeInventoryItem(player, itemId, amountToConsume) {
  const inventory = player.getComponent("minecraft:inventory");
  if (!inventory || !inventory.container) return false;
  const container = inventory.container;
  
  let remaining = amountToConsume;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (!item || item.typeId !== itemId) continue;
    
    if (item.amount <= remaining) {
      remaining -= item.amount;
      container.setItem(i, undefined);
    } else {
      item.amount -= remaining;
      container.setItem(i, item);
      remaining = 0;
    }
    
    if (remaining <= 0) break;
  }
  return remaining === 0;
}

export function showResearchMenu(player) {
  const items = getResearchableInventoryItems(player);

  if (items.length === 0) {
    const form = new ActionFormData();
    form.title("Research Inventory");
    form.body("No researchable items found in your inventory. (Fully researched items are hidden from this list)");
    form.button("« Back to Main Menu", "textures/ui/arrow_left.png");

    form.show(player).then(() => {
      defer(() => showMainMenu(player));
    });
    return;
  }

  const form = new ActionFormData();
  form.title("Research Inventory");
  form.body("Select an item from your inventory to research:");

  for (const item of items) {
    form.button(`${item.name}\n§r§eCount: ${item.totalCount}`, undefined);
  }
  form.button("« Back to Main Menu", "textures/ui/arrow_left.png");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === items.length) {
      defer(() => showMainMenu(player));
      return;
    }

    const selectedItem = items[response.selection];
    defer(() => showResearchItemDetails(player, selectedItem));
  });
}

function showResearchItemDetails(player, item) {
  const itemId = item.id;
  const friendlyName = item.name;
  const currentProgress = getResearchProgress(player, itemId);
  const targetRequirement = getResearchRequirement(itemId);
  const totalCount = item.totalCount;

  const form = new ActionFormData();
  form.title(`Research: ${friendlyName}`);

  const remaining = targetRequirement - currentProgress;
  let bodyText = `Item: §6${friendlyName}§r\nID: §7${itemId}§r\n\n`;
  bodyText += `Progress: §e${currentProgress} / ${targetRequirement}§r (§g${remaining}§r needed)\n`;
  bodyText += `You have §6${totalCount}x§r in your inventory.`;
  form.body(bodyText);

  form.button(`Research All (${totalCount})`);
  form.button("Research 1 Item");
  if (totalCount >= 16) {
    form.button("Research 16 Items");
  }
  form.button("« Back to List", "textures/ui/arrow_left.png");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;

    const selection = response.selection;
    const backIndex = totalCount >= 16 ? 3 : 2;

    if (selection === backIndex) {
      defer(() => showResearchMenu(player));
      return;
    }

    const currentItems = getResearchableInventoryItems(player);
    const verifyItem = currentItems.find(i => i.id === itemId);
    if (!verifyItem || verifyItem.totalCount < 1) {
      player.sendMessage("§cItem no longer in inventory. Research failed.");
      defer(() => showResearchMenu(player));
      return;
    }

    let amountToConsume = 0;
    if (selection === 0) {
      amountToConsume = verifyItem.totalCount;
    } else if (selection === 1) {
      amountToConsume = 1;
    } else if (selection === 2 && verifyItem.totalCount >= 16) {
      amountToConsume = 16;
    }

    if (amountToConsume > 0) {
      consumeInventoryItem(player, itemId, amountToConsume);
      const result = addResearchProgress(player, itemId, amountToConsume);

      if (result.unlocked) {
        player.playSound("random.levelup", { volume: 0.8, pitch: 1.0 });
        player.sendMessage(`§a🎉 UNLOCKED! You now have infinite access to §6${friendlyName}§a!`);
      } else {
        player.playSound("random.orb", { volume: 0.5, pitch: 1.2 });
        player.sendMessage(`§eResearched §6${amountToConsume}x ${friendlyName}§e. Progress: §g${result.current}/${result.target}§e.`);
      }

      defer(() => showResearchMenu(player));
    }
  });
}

function showBrowseMenu(player) {
  const form = new ActionFormData();
  form.title("Browse Catalog");
  form.body("Select a category to view your researched items.");

  const categories = [
    { name: "Swords", icon: "textures/items/iron_sword.png" },
    { name: "Pickaxes", icon: "textures/items/iron_pickaxe.png" },
    { name: "Axes", icon: "textures/items/iron_axe.png" },
    { name: "Shovels", icon: "textures/items/iron_shovel.png" },
    { name: "Hoes", icon: "textures/items/iron_hoe.png" },
    { name: "Helmets", icon: "textures/items/iron_helmet.png" },
    { name: "Chestplates", icon: "textures/items/iron_chestplate.png" },
    { name: "Leggings", icon: "textures/items/iron_leggings.png" },
    { name: "Boots", icon: "textures/items/iron_boots.png" },
    { name: "Tools & Utility", icon: "textures/items/shears.png" },
    { name: "Food", icon: "textures/items/apple.png" },
    { name: "Blocks", icon: "textures/blocks/stone.png" },
    { name: "Materials & Items", icon: "textures/items/gold_ingot.png" }
  ];

  for (const cat of categories) {
    form.button(cat.name, cat.icon);
  }
  form.button("« Back to Main Menu", "textures/ui/arrow_left.png");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === categories.length) {
      defer(() => showMainMenu(player));
      return;
    }

    const selectedCat = categories[response.selection].name;
    defer(() => showItemListMenu(player, selectedCat));
  });
}

function showSearchMenu(player) {
  const form = new ModalFormData();
  form.title("Search Catalog");
  form.textField("Search Query (e.g. Iron, Wood)", "Enter item name...", { defaultValue: "" });

  form.show(player).then((response) => {
    if (response.canceled || !response.formValues) {
      defer(() => showMainMenu(player));
      return;
    }

    const query = response.formValues[0].trim().toLowerCase();
    if (query === "") {
      player.sendMessage("§cSearch query cannot be empty.");
      defer(() => showMainMenu(player));
    } else {
      defer(() => showItemListMenu(player, null, query));
    }
  }).catch(() => {});
}

function showItemListMenu(player, category, searchQuery = "") {
  const allRegistryItems = getAllItems();
  const matchedItems = [];

  for (const item of allRegistryItems) {
    const progress = getResearchProgress(player, item.id);
    if (progress > 0) {
      const requirement = getResearchRequirement(item.id);
      const isItemUnlocked = progress >= requirement;

      if (category && item.category !== category) continue;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery) && !item.id.toLowerCase().includes(searchQuery)) continue;

      matchedItems.push({
        ...item,
        progress,
        requirement,
        unlocked: isItemUnlocked
      });
    }
  }

  const form = new ActionFormData();
  form.title(category ? `Catalog: ${category.toUpperCase()}` : `Search: "${searchQuery}"`);
  
  if (matchedItems.length === 0) {
    form.body("No items have been discovered in this category yet. Research items to discover them here!");
    form.button("« Back", "textures/ui/arrow_left.png");
    form.show(player).then(() => {
      defer(() => category ? showBrowseMenu(player) : showMainMenu(player));
    });
    return;
  }

  form.body("Click an unlocked (Green) item to clone a full stack. Locked (Red) items require more research.");

  for (const item of matchedItems) {
    const label = item.unlocked
      ? `§a${item.name} (Unlocked)§r\n§7Tap to clone stack`
      : `§c${item.name} (${item.progress}/${item.requirement})§r\n§7Requires more research`;
    form.button(label, undefined);
  }

  form.button("« Back", "textures/ui/arrow_left.png");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === matchedItems.length) {
      defer(() => category ? showBrowseMenu(player) : showMainMenu(player));
      return;
    }

    const selectedItem = matchedItems[response.selection];
    if (selectedItem.unlocked) {
      const inventory = player.getComponent("minecraft:inventory");
      if (inventory && inventory.container) {
        const stackSize = selectedItem.maxStack;
        const itemStack = new ItemStack(selectedItem.id, stackSize);
        const remaining = inventory.container.addItem(itemStack);
        
        player.playSound("random.pop", { volume: 0.5, pitch: 1.0 });

        if (remaining) {
          player.dimension.spawnItem(remaining, player.location);
          player.sendMessage(`§cInventory full! Spawned §6${remaining.amount}x ${selectedItem.name}§c at your feet.`);
        } else {
          player.sendMessage(`§aCloned a stack of §6${selectedItem.name}§a!`);
        }
      }
    } else {
      player.sendMessage(`§cThis item is locked. You need §e${selectedItem.requirement - selectedItem.progress}§c more research to unlock §6${selectedItem.name}§c.`);
    }

    defer(() => showItemListMenu(player, category, searchQuery));
  });
}

function showSettingsMenu(player) {
  const currentMultiplier = getResearchMultiplier();

  const form = new ModalFormData();
  form.title("Journey Mode Settings");
  
  form.slider("Research Scaling Limit", 1, 64, { step: 1, defaultValue: currentMultiplier });

  form.show(player).then((response) => {
    if (response.canceled || !response.formValues) {
      defer(() => showMainMenu(player));
      return;
    }

    const value = Math.round(response.formValues[0]);
    try {
      world.setDynamicProperty("journey:research_multiplier", value);
      player.sendMessage(`§aJourney Mode scaling set to §e${value}§a.`);
    } catch (e) {
      player.sendMessage("§cFailed to save settings. Please try again.");
    }

    // REMOVED: No longer calling showMainMenu here so the GUI closes completely on submit!
  });
}

function showResetConfirmMenu(player) {
  const form = new ActionFormData();
  form.title("Reset Research Progress?");
  form.body("§cWARNING: This will permanently delete all your unlocked items and research progress. This cannot be undone!§r");
  form.button("YES, Reset Everything");
  form.button("NO, Keep My Progress");

  form.show(player).then((response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      resetResearch(player);
      player.playSound("fire.ignite", { volume: 1.0, pitch: 0.8 });
      player.sendMessage("§cYour research progress has been reset to zero.");
    } else {
      defer(() => showMainMenu(player));
    }
  });
}