import {
  world,
  system,
  ItemStack,
  CommandPermissionLevel,
  CustomCommandStatus,
  CustomCommandParamType
} from "@minecraft/server";
import { showMainMenu } from "./ui.js";

console.warn("[Journey Mode] Addon scripts initialized!");

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM COMMAND REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
  console.warn("[Journey Mode] Registering commands...");

  try {
    // 1. A single flat enum representing your base command actions
    customCommandRegistry.registerEnum("journey:action", ["menu", "book", "research_scale"]);

    // 2. Register unified /journey command
    customCommandRegistry.registerCommand(
      {
        name: "journey:journey",
        description: "Journey Mode command interface.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
          {
            name: "journey:action", // Clear parameter name for the action hint
            type: CustomCommandParamType.Enum,
            enumName: "journey:action"
          }
        ],
        optionalParameters: [
          {
            name: "scale", // Shows up cleanly as [scale:int] when research_scale is picked
            type: CustomCommandParamType.Integer
          }
        ]
      },
      (origin, action, scale) => {
        const player = origin.sourceEntity;
        if (!player) return { status: CustomCommandStatus.Failure };

        // Handle: /journey menu
        if (action === "menu") {
          system.run(() => showMainMenu(player));
          return { status: CustomCommandStatus.Success };
        } 
        
        // Handle: /journey book
        if (action === "book") {
          system.run(() => giveJourneyBook(player));
          return { status: CustomCommandStatus.Success };
        }

        // Handle: /journey research_scale [scale]
        if (action === "research_scale") {
          // Admin verification check
          const isOp = player.hasTag("admin") || player.commandPermissionLevel >= 2;
          if (!isOp) {
            player.sendMessage("§cYou must have the 'admin' tag or be an operator to change the research scale.");
            return { status: CustomCommandStatus.Failure };
          }

          if (scale === undefined || scale === null) {
            player.sendMessage("§cPlease specify a scale number: /journey research_scale [scale:int]");
            return { status: CustomCommandStatus.Failure };
          }

          const value = Math.max(1, Math.min(64, scale));
          system.run(() => {
            try {
              world.setDynamicProperty("journey:research_multiplier", value);
              player.sendMessage(`§aResearch scale limit updated to §e${value}§a.`);
            } catch (e) {
              player.sendMessage("§cFailed to save research multiplier dynamic property.");
            }
          });

          return { status: CustomCommandStatus.Success };
        }

        return { status: CustomCommandStatus.Failure };
      }
    );

    console.warn("[Journey Mode] Commands registered successfully.");
  } catch (error) {
    console.error("[Journey Mode] Initialization Error inside startup: ", error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIC GIVE BOOK ON SPAWN
// ─────────────────────────────────────────────────────────────────────────────
system.runTimeout(() => {
  world.afterEvents.playerSpawn.subscribe((ev) => {
    const player = ev.player;
    
    system.runTimeout(() => {
      try {
        if (!hasJourneyBook(player)) {
          giveJourneyBook(player);
          if (ev.initialSpawn) {
            player.sendMessage("§e[Journey Mode] §7You received the §eJourney Mode§7 book.");
            player.sendMessage("§7Right-click to open Codex. Lost it? Use §e/journey book");
          }
        }
      } catch (e) {
        console.warn("[Journey Mode] Error giving book on spawn:", e);
      }
    }, 60);
  });
}, 20);

// ─────────────────────────────────────────────────────────────────────────────
// BOOK INTERACTION LISTENERS
// ─────────────────────────────────────────────────────────────────────────────
world.beforeEvents.itemUse.subscribe((event) => {
  if (isJourneyBook(event.itemStack)) {
    event.cancel = true;
    system.run(() => showMainMenu(event.source));
  }
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  if (isJourneyBook(event.itemStack)) {
    event.cancel = true;
    system.run(() => showMainMenu(event.player));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function hasJourneyBook(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return false;
    for (let i = 0; i < inv.container.size; i++) {
      const item = inv.container.getItem(i);
      if (isJourneyBook(item)) return true;
    }
  } catch (e) {}
  return false;
}

function isJourneyBook(itemStack) {
  return (
    itemStack != null &&
    itemStack.typeId === "minecraft:book" &&
    typeof itemStack.nameTag === "string" &&
    itemStack.nameTag.toLowerCase().includes("journey mode")
  );
}

function giveJourneyBook(player) {
  try {
    const inv = player.getComponent("minecraft:inventory");
    if (!inv || !inv.container) return;

    const book = new ItemStack("minecraft:book", 1);
    book.nameTag = "§eJourney Mode§r";
    book.setLore([
      "§7Right-click to open the Journey Mode Codex.",
      "",
      "§8Lost it? Use /journey book"
    ]);

    const leftover = inv.container.addItem(book);
    if (leftover) {
      player.dimension.spawnItem(leftover, player.location);
    }
  } catch (e) {
    console.warn("[Journey Mode] Failed to give book:", e);
  }
}