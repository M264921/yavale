#!/usr/bin/env python3

import os
import platform
import subprocess
import shutil


def run_setup():
    if os.path.exists("setup.sh"):
        print("Ejecutando setup.sh...")
        subprocess.run(["chmod", "+x", "setup.sh"], check=True)
        subprocess.run(["./setup.sh"], check=True)
    else:
        print("No se encontró setup.sh en la raíz del proyecto.")

def verificar_estructura():
    print("\nVerificando carpetas esenciales...")
    dirs = ["app", "addon", "html", "vpn"]
    for d in dirs:
        if os.path.isdir(d):
            print(f"{d}/ OK")
        else:
            print(f"{d}/ NO encontrada")

def empaquetar_html():
    print("\nEmpaquetando contenido HTML...")
    if os.path.isdir("html"):
        dest = os.path.join("app", "html")
        if os.path.exists(dest):
            shutil.rmtree(dest)
        shutil.copytree("html", dest)
        print(f"HTML copiado a {dest}")
    else:
        print("Carpeta html/ no existe, se omite.")

def main():
    print("Agent Montana ACTIVADO.")
    os_type = platform.system()
    print(f"Sistema detectado: {os_type}\n")

    run_setup()
    verificar_estructura()
    empaquetar_html()

    print("\nMisi\u00F3n completada. Agent Montana fuera.")


if __name__ == "__main__":
    main()
