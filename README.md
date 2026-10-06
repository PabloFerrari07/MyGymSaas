# mygym

Tracker de gym minimalista. Flask + SQLite (backend), React + Vite (frontend).

## Arrancar

Backend (puerto 5000):

    cd backend
    python -m venv .venv
    .venv\Scripts\pip install -r requirements.txt
    .venv\Scripts\python app.py

Frontend (puerto 5173, proxy de /api al backend):

    cd frontend
    npm install
    npm run dev

Abre http://localhost:5173. Tests del backend: `.venv\Scripts\python -m pytest`.

## Publicar en PythonAnywhere (siempre disponible en el celular)

Flask sirve el front ya compilado (`backend/web/`) y la API desde la misma URL.
Si cambias el front: `cd frontend && npm run build` y sube los cambios.

1. Sube el repo a GitHub y crea una cuenta gratis en pythonanywhere.com.
2. En una consola Bash de PythonAnywhere:

       git clone https://github.com/<tu-usuario>/mygym.git
       cd mygym/backend
       python3 -m venv .venv && source .venv/bin/activate
       pip install -r requirements.txt

3. Pestaña **Web** -> Add a new web app -> Manual configuration (Python 3.x). En *Virtualenv* pon `/home/<usuario>/mygym/backend/.venv`.
4. Edita el archivo WSGI y deja solo:

       import os, sys
       sys.path.insert(0, "/home/<usuario>/mygym/backend")
       os.environ["APP_PASSWORD"] = "elige-una-contraseña"
       from wsgi import application

5. Reload. Abre `https://<usuario>.pythonanywhere.com`, entra con cualquier usuario y esa contraseña.
6. En el celular (Chrome): menú ⋮ -> **Instalar app / Añadir a pantalla de inicio**.

Para actualizar: `git pull` en la consola y Reload en la pestaña Web. La base de datos
(`mygym.db`) vive en el servidor y no se pisa con `git pull`.
