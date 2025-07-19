## Uso
1. Clona este repo y asegúrate de que el remoto `origin` apunta a tu GitHub.
2. Ejecuta `./setup.sh` una sola vez.
3. `git add . && git commit -m "Init MontanaOpenAiTV base" && git push origin main`
4. Abre `app/` en Xcode, añade `html/` al bundle y compila tu IPA.

### Seguridad
El archivo de ejemplo `vpn/montana-client.conf` utiliza valores ficticios.
Nunca subas tus claves reales de WireGuard ni otros datos sensibles al repositorio.

## Firma e instalación de IPA en iPhone

### Requisitos
- MacOS (puede ser un Mac real o una VM)
- Xcode (desde la App Store)
- [iOS App Signer](https://dantheman827.github.io/ios-app-signer/)
- iTunes (para instalar IPA firmadas)

### Paso 1: Importar el Certificado
1. Abre `AltStoreSigningCertificate.p12`
2. Contraseña: `12345`

### Paso 2: Consigue tu IPA
Descarga una app en formato `.ipa`. Puedes encontrar apps en:
- https://appdb.to
- https://iphonecake.com

También necesitas un `.mobileprovision`. Puedes bajarlo de FlekSt0re.

### Paso 3: Firma la App
1. Abre iOS App Signer.
2. Rellena los campos:
   - **Input File** → el `.ipa` que descargaste
   - **Signing Certificate** → el que importaste antes
   - **Provisioning Profile** → el `.mobileprovision` de FlekSt0re
3. Haz clic en **Start**

### Paso 4: Instálalo
Tienes dos formas:
- Con iTunes (conecta tu iPhone y arrastra el `.ipa`)
- O súbelo a:
  - https://www.diawi.com
  - https://www.installonair.com

Desde ahí lo puedes instalar directo desde el navegador de tu iPhone.

Enjoy your Montana app 😎
