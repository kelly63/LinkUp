import Foundation
import Capacitor
import LocalAuthentication

@objc(NativeBiometric)
public class NativeBiometric: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBiometric"
    public let jsName = "NativeBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyIdentity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCredentials", returnType: CAPPluginReturnPromise),
    ]

    struct Credentials {
        var username: String
        var password: String
    }

    enum KeychainError: Error {
        case noPassword
        case unexpectedPasswordData
        case duplicateItem
        case unhandledError(status: OSStatus)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        var obj = [String: Any]()

        obj["isAvailable"] = false
        obj["biometryType"] = 0

        let useFallback = call.getBool("useFallback", false)
        let policy = useFallback ? LAPolicy.deviceOwnerAuthentication : LAPolicy.deviceOwnerAuthenticationWithBiometrics

        if context.canEvaluatePolicy(policy, error: &error) {
            switch context.biometryType {
            case .touchID:
                obj["biometryType"] = 1
            case .faceID:
                obj["biometryType"] = 2
            default:
                obj["biometryType"] = 0
            }
            obj["isAvailable"] = true
            call.resolve(obj)
        } else {
            guard let authError = error else {
                obj["errorCode"] = 0
                call.resolve(obj)
                return
            }
            obj["errorCode"] = convertToPluginErrorCode(authError.code)
            call.resolve(obj)
        }
    }

    @objc func verifyIdentity(_ call: CAPPluginCall) {
        let context = LAContext()
        var canEvaluateError: NSError?

        let useFallback = call.getBool("useFallback", false)
        context.localizedFallbackTitle = ""

        if useFallback {
            context.localizedFallbackTitle = nil
            if let fallbackTitle = call.getString("fallbackTitle") {
                context.localizedFallbackTitle = fallbackTitle
            }
        }

        let policy = useFallback ? LAPolicy.deviceOwnerAuthentication : LAPolicy.deviceOwnerAuthenticationWithBiometrics

        if context.canEvaluatePolicy(policy, error: &canEvaluateError) {
            let reason = call.getString("reason") ?? "For biometric authentication"
            context.evaluatePolicy(policy, localizedReason: reason) { success, evaluateError in
                if success {
                    call.resolve()
                } else {
                    guard let error = evaluateError else {
                        call.reject("Biometrics Error", "0")
                        return
                    }
                    let code = self.convertToPluginErrorCode(error._code)
                    call.reject(error.localizedDescription, code.description, error)
                }
            }
        } else {
            call.reject("Authentication not available")
        }
    }

    @objc func getCredentials(_ call: CAPPluginCall) {
        guard let server = call.getString("server") else {
            call.reject("No server name was provided")
            return
        }
        do {
            let credentials = try getCredentialsFromKeychain(server)
            var obj = [String: Any]()
            obj["username"] = credentials.username
            obj["password"] = credentials.password
            call.resolve(obj)
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func setCredentials(_ call: CAPPluginCall) {
        guard let server = call.getString("server"),
              let username = call.getString("username"),
              let password = call.getString("password") else {
            call.reject("Missing properties")
            return
        }
        let credentials = Credentials(username: username, password: password)
        do {
            try storeCredentialsInKeychain(credentials, server)
            call.resolve()
        } catch KeychainError.duplicateItem {
            do {
                try updateCredentialsInKeychain(credentials, server)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func deleteCredentials(_ call: CAPPluginCall) {
        guard let server = call.getString("server") else {
            call.reject("No server name was provided")
            return
        }
        do {
            try deleteCredentialsFromKeychain(server)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    func storeCredentialsInKeychain(_ credentials: Credentials, _ server: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrAccount as String: credentials.username,
            kSecAttrServer as String: server,
            kSecValueData as String: credentials.password.data(using: .utf8)!
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status != errSecDuplicateItem else { throw KeychainError.duplicateItem }
        guard status == errSecSuccess else { throw KeychainError.unhandledError(status: status) }
    }

    func updateCredentialsInKeychain(_ credentials: Credentials, _ server: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrServer as String: server
        ]
        let attributes: [String: Any] = [
            kSecAttrAccount as String: credentials.username,
            kSecValueData as String: credentials.password.data(using: String.Encoding.utf8)!
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        guard status != errSecItemNotFound else { throw KeychainError.noPassword }
        guard status == errSecSuccess else { throw KeychainError.unhandledError(status: status) }
    }

    func getCredentialsFromKeychain(_ server: String) throws -> Credentials {
        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrServer as String: server,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status != errSecItemNotFound else { throw KeychainError.noPassword }
        guard status == errSecSuccess else { throw KeychainError.unhandledError(status: status) }
        guard let existingItem = item as? [String: Any],
              let passwordData = existingItem[kSecValueData as String] as? Data,
              let password = String(data: passwordData, encoding: .utf8),
              let username = existingItem[kSecAttrAccount as String] as? String
        else {
            throw KeychainError.unexpectedPasswordData
        }
        return Credentials(username: username, password: password)
    }

    func deleteCredentialsFromKeychain(_ server: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrServer as String: server
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }

    func convertToPluginErrorCode(_ errorCode: Int) -> Int {
        switch errorCode {
        case LAError.biometryNotAvailable.rawValue: return 1
        case LAError.biometryLockout.rawValue: return 2
        case LAError.biometryNotEnrolled.rawValue: return 3
        case LAError.authenticationFailed.rawValue: return 10
        case LAError.appCancel.rawValue: return 11
        case LAError.invalidContext.rawValue: return 12
        case LAError.notInteractive.rawValue: return 13
        case LAError.passcodeNotSet.rawValue: return 14
        case LAError.systemCancel.rawValue: return 15
        case LAError.userCancel.rawValue: return 16
        case LAError.userFallback.rawValue: return 17
        default: return 0
        }
    }
}
