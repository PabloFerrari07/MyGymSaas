# mygym

Tracker de gym minimalista y instalable como app. React + Vite, con Firebase (Auth, Firestore y Hosting).
Cada cuenta ve solo sus datos (reglas en `firestore.rules`).

## Desarrollo

    cd frontend
    npm install
    npm run dev

Necesita `frontend/.env.local` con las claves web de Firebase (`VITE_FIREBASE_*`, ver `src/firebase.js`).

## Publicar

    cd frontend && npm run build
    cd .. && firebase deploy --project mygym-tracker-pf

Producción: https://mygym-tracker-pf.web.app. En el celular: menú del navegador -> Instalar app.
