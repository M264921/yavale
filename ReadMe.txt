# MontanaOpenAiTV 🍿📱

¡Bienvenido! Aquí te explico paso a paso cómo firmar e instalar apps personalizadas en tu iPhone (por ejemplo MontanaOpenAiTV).

---

### 🛠 Requisitos

- MacOS (puede ser un Mac real o una VM)
- Xcode (desde la App Store)
- iOS App Signer → https://dantheman827.github.io/ios-app-signer/
- iTunes (para instalar IPA firmadas)

---

### 🪪 Paso 1: Importar el Certificado

1. Abre `AltStoreSigningCertificate.p12`
2. Contraseña: `12345`

---

### 📦 Paso 2: Consigue tu IPA

Descarga una app en formato `.ipa`. Puedes encontrar apps en:
- https://appdb.to
- https://iphonecake.com

También necesitas un `.mobileprovision`. Puedes bajarlo de FlekSt0re.

---

### 🖋 Paso 3: Firma la App

1. Abre iOS App Signer.
2. Rellena los campos:
   - **Input File** → el `.ipa` que descargaste
   - **Signing Certificate** → el que importaste antes
   - **Provisioning Profile** → el `.mobileprovision` de FlekSt0re
3. Haz clic en **Start**

---

### 📲 Paso 4: Instálalo

Tienes dos formas:
- Con iTunes (conecta tu iPhone y arrastra el `.ipa`)
- O súbelo a:
  - https://www.diawi.com
  - https://www.installonair.com

Desde ahí lo puedes instalar directo desde el navegador de tu iPhone.

---

Enjoy your Montana app 😎
