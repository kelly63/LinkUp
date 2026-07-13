/**
 * Patches capacitor-native-biometric to work with Capacitor 8 / SPM.
 * - Ensures Package.swift and SPM source directory exist
 * - Removes `typealias JSObject` which conflicts with Capacitor 8's built-in type
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

// Copy Swift + ObjC source files from old CocoaPods location if SPM location is missing
for (const file of ['Plugin.swift', 'Plugin.m']) {
  const src = path.join(oldSrcDir, file);
  const destName = file.replace('Plugin', 'NativeBiometricPlugin');
  const dest = path.join(spmSrcDir, destName);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
}

// Remove `typealias JSObject = [String:Any]` — conflicts with Capacitor 8's built-in JSObject type,
// causing SPM to fail with "invalid redeclaration of JSObject" and breaking the entire CapApp-SPM build.
if (fs.existsSync(swiftFile)) {
  let src = fs.readFileSync(swiftFile, 'utf8');
  const patched = src
    .replace(/\s*typealias JSObject = \[String:Any\]\n?/g, '\n')
    .replace(/var obj = JSObject\(\)/g, 'var obj = [String:Any]()');
  if (patched !== src) {
    fs.writeFileSync(swiftFile, patched, 'utf8');
    console.log('[fix-biometric-spm] Patched JSObject conflict in NativeBiometricPlugin.swift');
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
