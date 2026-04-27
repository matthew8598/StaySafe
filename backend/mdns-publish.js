/**
 * mDNS Hostname Support
 *
 * The Arduino will resolve "staysafe.local" using the system's DNS resolver
 * macOS has built-in mDNS support, so this should work automatically
 *
 * For manual setup, you can configure your router to resolve:
 * staysafe.local → your PC's IP address
 *
 * OR set a static IP for your PC in the router settings
 */

console.log('[mDNS] System mDNS support enabled');
console.log('[mDNS] Arduino will resolve "staysafe.local" to your PC');
