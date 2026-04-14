/**
 * ElizaOS Plugin Entry Point - YieldScout
 *
 * This plugin provides Solana DeFi yield analysis capabilities.
 * Includes providers for Raydium, Orca, Marinade, and Jupiter.
 *
 * ElizaOS Plugin Docs: https://elizaos.github.io/eliza/docs/core/plugins
 */

import { type Plugin } from "@elizaos/core";
import { yieldScoutPlugin } from "./plugin-yieldscout/index.js";

/**
 * Export the yield scout plugin for use in the agent character file.
 * The character file references this as "plugin-yieldscout"
 */
export const customPlugin: Plugin = yieldScoutPlugin;

export default customPlugin;

// Re-export for direct access
export * from "./plugin-yieldscout/index.js";
