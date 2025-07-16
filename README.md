## Project Overview
MontanaTV builds on the open-source iOS App Signer to provide an AceStream based media application. Future updates will add P2P search and Magic Player features similar to the Horus addon.

# iOS App Signer
iOS App Signer is an app for macOS that (re)signs apps and bundles them into IPA files ready for installation on an iOS device.

Supported input types: **ipa**, **deb**, **app**, and **xcarchive**.

## Usage
The app requires Xcode and has been tested on macOS 12 Monterey. Obtain a provisioning profile and signing certificate from Xcode by creating a new project.

Open iOS App Signer and choose your input file, signing certificate, and provisioning file. Optionally, specify a new application ID or display name.

<a href="https://paypal.me/DanTheMan827" class="donate"><img src="http://dantheman827.github.io/images/donate-button.svg" height="44" alt="Donate"></a>

## Thanks To
[maciekish / iReSign](https://github.com/maciekish/iReSign) provided the basic process that inspired this project.

## Repository Cleanup
Previous revisions stored ZIP archives of the iOS App Signer source. These archives were removed from version control in favor of tracking only readable source code.
