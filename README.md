# Journey Mode BP

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

## Requirements

- Minecraft Bedrock Edition (version 1.21.0 or higher)
- Scripting API support enabled

## Modification & Forking

Feel free to fork, modify, and adapt this addon for your own use. The code is organized as follows:

- `scripts/main.js` - Main entry point for the addon
- `scripts/db.js` - Database and data management
- `scripts/research.js` - Research system logic
- `scripts/ui.js` - User interface components
- `manifest.json` - Addon metadata and configuration

## License

Feel free to use, modify, and distribute as you see fit.
