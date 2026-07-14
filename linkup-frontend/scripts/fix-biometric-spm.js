/**
 * Patches capacitor-native-biometric so it does NOT get included as an SPM package.
 *
 * WHY: capacitor-native-biometric is a pre-Capacitor-8 plugin that ships mixed
 * Swift+ObjC sources. Xcode 26 rejects mixed-language SPM targets during package
 * resolution, breaking the entire CapApp-SPM build. The plugin's Swift source is
 * compiled directly as part of CapApp-SPM instead
 * (ios/App/CapApp-SPM/Sources/CapApp-SPM/NativeBiometricPlugin.swift).
 *
 * WHAT THIS DOES:
 * 1. Removes "capacitor.ios" from the plugin's package.json — prevents `cap sync ios`
 *    from auto-adding it as an external SPM package in CapApp-SPM/Package.swift.
 * 2. Removes any CapacitorNativeBiometric references from CapApp-SPM/Package.swift
 *    in case `cap sync ios` ran before this script and re-added them.
 *
 * Run automatically via the `postinstall` npm hook.
 */
const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..', 'node_modules', 'capacitor-native-biometric');

if (!fs.existsSync(pluginRoot)) {
  console.log('[fix-biometric-spm] capacitor-native-biometric not installed — skipping');
  process.exit(0);
}

// ── Step 1: Remove capacitor.ios from the plugin's package.json ──────────────
// This prevents `cap sync ios` from detecting it as an iOS SPM plugin.
const pkgJsonPath = path.join(pluginRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
if (pkg.capacitor && pkg.capacitor.ios) {
  delete pkg.capacitor.ios;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('[fix-biometric-spm] Removed capacitor.ios from plugin package.json');
}

// ── Step 2: Remove any CapacitorNativeBiometric from CapApp-SPM/Package.swift ─
// Guards against `cap sync ios` having been run before this script, which would
// have re-added the broken external package reference.
const capAppSpmPkg = path.join(
  __dirname, '..', 'ios', 'App', 'CapApp-SPM', 'Package.swift'
);
if (fs.existsSync(capAppSpmPkg)) {
  const original = fs.readFileSync(capAppSpmPkg, 'utf8');
  const cleaned = original
    // Remove the .package(name: "CapacitorNativeBiometric", ...) dependency line
    .replace(/\s*\.package\(name:\s*"CapacitorNativeBiometric"[^)]*\),?\n?/g, '\n')
    // Remove the .product(name: "CapacitorNativeBiometric", ...) target dep line
    .replace(/\s*\.product\(name:\s*"CapacitorNativeBiometric"[^)]*\),?\n?/g, '\n');
  if (cleaned !== original) {
    fs.writeFileSync(capAppSpmPkg, cleaned, 'utf8');
    console.log('[fix-biometric-spm] Removed CapacitorNativeBiometric from CapApp-SPM/Package.swift (was re-added by cap sync)');
  }
}
