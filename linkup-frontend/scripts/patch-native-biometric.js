/**
 * Injects NativeBiometric into the iOS capacitor.config.json packageClassList.
 *
 * WHY: capacitor-native-biometric is excluded from auto-detection by fix-biometric-spm.js
 * (which removes capacitor.ios from the plugin's package.json so cap sync doesn't try to
 * add it as a broken SPM package). As a side effect, cap sync also omits the class name
 * from packageClassList, so the Capacitor bridge never instantiates the plugin.
 * The plugin's Swift source is compiled directly into CapApp-SPM, so we only need to
 * add the class name here — no SPM reference is needed.
 *
 * Run automatically after cap sync ios via the build:ios npm script.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(
  __dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json'
);

if (!fs.existsSync(configPath)) {
  console.log('[patch-native-biometric] capacitor.config.json not found — skipping');
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!Array.isArray(config.packageClassList)) {
  config.packageClassList = [];
}

if (!config.packageClassList.includes('NativeBiometric')) {
  config.packageClassList.push('NativeBiometric');
  fs.writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n', 'utf8');
  console.log('[patch-native-biometric] Added NativeBiometric to packageClassList');
} else {
  console.log('[patch-native-biometric] NativeBiometric already in packageClassList');
}
