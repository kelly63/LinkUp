/**
 * Patches capacitor-native-biometric so it does NOT get included as an SPM package.
 *
 * The plugin's Swift source is compiled directly as part of CapApp-SPM
 * (ios/App/CapApp-SPM/Sources/CapApp-SPM/NativeBiometricPlugin.swift).
 *
 * Problem: the plugin has "capacitor": { "ios": ... } in package.json, which
 * causes `npx cap sync ios` to re-add it as an external SPM package every time.
 * That external package fails to build in Xcode 26 (mixed Swift+ObjC, version
 * conflicts, etc.). Fix: remove the ios key so cap sync ignores it for iOS SPM.
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

// Remove the capacitor.ios key from package.json so `cap sync ios` does NOT
// add this plugin as an external SPM package in CapApp-SPM/Package.swift.
// The native implementation lives in CapApp-SPM/Sources/CapApp-SPM/NativeBiometricPlugin.swift.
const pkgJsonPath = path.join(pluginRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
if (pkg.capacitor && pkg.capacitor.ios) {
  delete pkg.capacitor.ios;
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('[fix-biometric-spm] Removed capacitor.ios from package.json — cap sync will skip iOS SPM for this plugin');
}
