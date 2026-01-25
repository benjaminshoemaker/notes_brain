const { getDefaultConfig } = require("expo/metro-config");
const { load } = require("@expo/env");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

// Load monorepo root `.env*` files so `EXPO_PUBLIC_*` variables work in a workspace setup.
load(monorepoRoot, { silent: true, force: true });

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  // Ensure Expo's internal `whatwg-url-without-unicode` resolves its compatible
  // `webidl-conversions@5` dependency when hierarchical lookup is disabled.
  path.resolve(monorepoRoot, "node_modules/whatwg-url-without-unicode/node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Force Metro to resolve modules only from the folders above.
// This prevents the workspace root from leaking incompatible versions of
// React / React Native into the mobile bundle.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
