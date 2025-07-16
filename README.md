## Project Overview
This repository builds on the open-source iOS App Signer to create **MontanaTV**, an AceStream-based media application. Future development will add P2P search and Magic Player features similar to the Horus addon.

# iOS App Signer
This is an app for OS X that can (re)sign apps and bundle them into ipa files that are ready to be installed on an iOS device.

Supported input types are: ipa, deb, app, xcarchive

Usage
------
This app requires Xcode to be installed, it has run successfully on the new macOS 12 Monterey.

You need a provisioning profile and signing certificate, you can get these from Xcode by creating a new project.

You can then open up iOS App Signer and select your input file, signing certificate, provisioning file, and optionally specify a new application ID and/or application display name.

<a href="https://paypal.me/DanTheMan827" class="donate"><img src="http://dantheman827.github.io/images/donate-button.svg" height="44" alt="Donate"></a>

Thanks To
------
[maciekish / iReSign](https://github.com/maciekish/iReSign): The basic process was gleaned from the source code of this project.
## Repository Cleanup
The project previously stored ZIP archives of the iOS App Signer source. These archives have been removed from version control in favor of keeping only the readable source.
