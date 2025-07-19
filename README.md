# MontanaOpenAiTV

## Estructura
- app/: App iOS en Swift que abre html/index.html en WKWebView  
- html/: HTML interactivo para abrir ID AceStream en apps externas  
- addon/: Addon para Stremio con catálogo y stream handler  
- vpn/: Config de cliente WireGuard de ejemplo  

## Uso
1. Clona este repo y asegúrate de que el remoto `origin` apunta a tu GitHub.  
2. Ejecuta `./setup.sh` una sola vez para preparar dependencias.
3. `git add . && git commit -m "Init MontanaOpenAiTV base" && git push origin main`  
4. Abre `app/` en Xcode, añade `html/` al bundle, y compila tu IPA.

