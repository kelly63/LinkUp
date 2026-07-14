/**
 * Patches capacitor-native-biometric to work with Capacitor 8 / SPM.
 * - Ensures Package.swift and SPM source directory exist
 * - Removes `typealias JSObject` which conflicts with Capacitor 8's built-in type
 * - Removes ObjC .m files (mixed Swift+ObjC breaks Xcode 26 SPM resolution)
 * - Adds CAPBridgedPlugin conformance (required for Capacitor 8 SPM plugin discovery)
 *
 * Run automatically via the `postinstall` npm hook.
 */
const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..', 'node_modules', 'capacitor-native-biometric');
const spmSrcDir = path.join(pluginRoot, 'ios', 'Sources', 'NativeBiometricPlugin');
const swiftFile = path.join(spmSrcDir, 'NativeBiometricPlugin.swift');
const oldSrcDir = path.join(pluginRoot, 'ios', 'Plugin');

if (!fs.existsSync(pluginRoot)) {
  console.log('[fix-biometric-spm] capacitor-native-biometric not installed — skipping');
  process.exit(0);
}

// Ensure SPM source directory exists
fs.mkdirSync(spmSrcDir, { recursive: true });

// Copy Swift source files from old CocoaPods location if SPM location is missing.
// Do NOT copy .m files — mixed Swift+ObjC SPM targets break Xcode 26 package resolution.
for (const file of ['Plugin.swift']) {
  const src = path.join(oldSrcDir, file);
  const destName = file.replace('Plugin', 'NativeBiometricPlugin');
  const dest = path.join(spmSrcDir, destName);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
}

// Remove any .m files — they create a mixed Swift+ObjC target that Xcode 26 rejects.
for (const mFile of fs.readdirSync(spmSrcDir).filter(f => f.endsWith('.m'))) {
  fs.rmSync(path.join(spmSrcDir, mFile));
  console.log(`[fix-biometric-spm] Removed ObjC file ${mFile} from SPM source dir`);
}

// Patch the Swift source file:
// 1. Remove typealias JSObject conflict
// 2. Add CAPBridgedPlugin conformance so Capacitor 8 SPM bridge discovers the plugin
//    (replaces the old CAP_PLUGIN ObjC macro approach that required the now-deleted .m file)
if (fs.existsSync(swiftFile)) {
  let src = fs.readFileSync(swiftFile, 'utf8');
  let patched = src
    // Fix JSObject redeclaration conflict with Capacitor 8
    .replace(/\s*typealias JSObject = \[String:Any\]\n?/g, '\n')
    .replace(/var obj = JSObject\(\)/g, 'var obj = [String:Any]()')
    // Add CAPBridgedPlugin conformance if not already present
    .replace(
      /public class NativeBiometric: CAPPlugin \{/,
      `public class NativeBiometric: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBiometric"
    public let jsName = "NativeBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyIdentity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCredentials", returnType: CAPPluginReturnPromise),
    ]`
    );
  if (patched !== src) {
    fs.writeFileSync(swiftFile, patched, 'utf8');
    console.log('[fix-biometric-spm] Patched NativeBiometricPlugin.swift for Capacitor 8 SPM');
  }
}

// Write Package.swift
const packageSwift = `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorNativeBiometric",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorNativeBiometric",
            targets: ["NativeBiometricPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "NativeBiometricPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/NativeBiometricPlugin")
    ]
)
`;

fs.writeFileSync(path.join(pluginRoot, 'Package.swift'), packageSwift);
console.log('[fix-biometric-spm] Package.swift written for capacitor-native-biometric');
