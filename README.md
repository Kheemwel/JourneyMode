# Journey Mode

A Minecraft Bedrock Edition behavior pack addon that adds research and item cloning systems to enhance your gameplay experience.

## Features

- **Research System** - Progress through research tiers to unlock new capabilities
- **Item Cloning** - Ability to clone items with a custom system
- **Interactive UI** - User-friendly interface for managing research and item operations

## Installation

### PC Installation

1. Download or clone this repository
2. Rename the folder to `JourneyModeBP` if needed
3. Move the `JourneyModeBP` folder to your Minecraft Bedrock behavior packs directory:
   - **Windows 10/11**: `C:\Users\[YourUsername]\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang\behavior_packs\`
   - **macOS**: `~/Library/Application Support/minecraft/behavior_packs/`

4. Launch Minecraft Bedrock and enable the addon in world settings

### Mobile Installation

Download the `.mcpack` file from the [releases](../../releases) section and open it with Minecraft Bedrock Edition to import the addon.

## Quick Start Guide

### Accessing the Journey Mode Menu

1. Use the `/journey book` command to get the **Journey Mode book**
2. **Right-click** (or interact with) the book to open the **Journey Mode Codex**
3. Alternatively, use the `/journey menu` command directly

### Admin Features & Settings

To unlock the **Settings** and **Reset Progress** options:

1. Run the following command as the world owner or with operator privileges:
   ```
   /tag @s add admin
   ```
   - `@s` targets yourself (the player executing the command)
   - Replace `@s` with a specific player name if needed (e.g., `/tag @p add admin`)

2. Open the Journey Mode menu again—you'll now see **Settings** and **Reset My Progress** buttons

3. In **Settings**, adjust the **Research Scaling Limit** (1-64) to control how many items are needed to research an item

## Requirements

- Minecraft Bedrock Edition (version 1.21.0 or higher)
- Scripting API support enabled