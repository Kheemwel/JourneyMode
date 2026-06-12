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
    // 1. Unify ALL enums under the strict "journey" namespace
    customCommandRegistry.registerEnum("journey:action", ["menu", "book", "research_scale"]);
    customCommandRegistry.registerEnum("journey:scale_values", ["1", "16", "32", "64"]);
    customCommandRegistry.registerEnum("journey:journal_action", ["book"]); 

    // 2. Register /journey
    customCommandRegistry.registerCommand(
      {
        name: "journey:journey",
        description: "Journey Mode command interface.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
          {
            name: "journey:action", 
            type: CustomCommandParamType.Enum,
            enumName: "journey:action"
          }
        ],
        optionalParameters: [
          {
            name: "journey:scale_values", 
            type: CustomCommandParamType.Enum,
            enumName: "journey:scale_values"
          }
        ]
      },
      (origin, journeyAction, journeyScale) => {
        const player = origin.sourceEntity;
        if (!player) return { status: CustomCommandStatus.Failure };

        if (journeyAction === "menu") {
          system.run(() => showMainMenu(player));
        } else if (journeyAction === "book") {
          system.run(() => giveJourneyBook(player));
        } else if (journeyAction === "research_scale") {
          const isAdmin = player.commandPermissionLevel >= 2 || player.hasTag("admin");
          if (!isAdmin) {
            player.sendMessage("§cYou must be an operator to change the research scale.");
            return { status: CustomCommandStatus.Failure };
          }
          if (!journeyScale) {
            player.sendMessage("§cPlease specify a scale: /journey:journey research_scale <1|16|32|64>");
            return { status: CustomCommandStatus.Failure };
          }
          const value = parseInt(journeyScale);
          system.run(() => {
            try {
              world.setDynamicProperty("journey:research_multiplier", value);
              player.sendMessage(`§aResearch scale set to §e${value}§a.`);
            } catch (e) {
              player.sendMessage("§cFailed to save multiplier.");
            }
          });
        }
        return { status: CustomCommandStatus.Success };
      }
    );

    // 3. Register /journey_journal (Changed namespace prefix from journal to journey)
    customCommandRegistry.registerCommand(
      {
        name: "journey:journal",
        description: "Journal command interface.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
          {
            name: "journey:journal_action", 
            type: CustomCommandParamType.Enum,
            enumName: "journey:journal_action"
          }
        ]
      },
      (origin, journalAction) => {
        const player = origin.sourceEntity;
        if (!player) return { status: CustomCommandStatus.Failure };

        if (journalAction === "book") {
          system.run(() => giveJourneyBook(player));
        }
        return { status: CustomCommandStatus.Success };
      }
    );

    console.warn("[Journey Mode] Commands registered successfully.");
  } catch (error) {
    console.error("[Journey Mode] Initialization Error inside startup: ", error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GIVE BOOK ON SPAWN
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
            player.sendMessage("§7Right-click to open Codex. Lost it? Use §e/journal:journal book");
          }
        }
      } catch (e) {
        console.warn("[Journey Mode] Error giving book:", e);
      }
    }, 60);
  });
}, 20);

// ─────────────────────────────────────────────────────────────────────────────
// BOOK TRIGGER — Right-click in air
// ─────────────────────────────────────────────────────────────────────────────
world.beforeEvents.itemUse.subscribe((event) => {
  if (isJourneyBook(event.itemStack)) {
    event.cancel = true;
    system.run(() => showMainMenu(event.source));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOK TRIGGER — Right-click on block (Fixed for 2026 Script API changes)
// ─────────────────────────────────────────────────────────────────────────────
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
      "§8Lost it? Use /journal:journal book"
    ]);

    const leftover = inv.container.addItem(book);
    if (leftover) {
      player.dimension.spawnItem(leftover, player.location);
    }
  } catch (e) {
    console.warn("[Journey Mode] Failed to give book:", e);
  }
}