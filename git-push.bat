@echo off
cd C:\Users\ElsyvIA\Documents\pmu-pronostics

rem === 1️⃣ Ajouter tous les fichiers modifiés et nouveaux ===
"C:\Program Files\Git\bin\git.exe" add -A

rem === 2️⃣ Vérifier s’il y a des changements à committer ===
for /f %%i in ('"C:\Program Files\Git\bin\git.exe" diff --cached --name-only') do set changes=true
if not defined changes (
    echo Aucun changement à envoyer.
    pause
    exit 0
)

rem === 3️⃣ Créer le commit ===
"C:\Program Files\Git\bin\git.exe" commit -m "[AUTO] Mise à jour des données du %DATE%"

rem === 4️⃣ Récupérer les changements distants proprement ===
"C:\Program Files\Git\bin\git.exe" pull --rebase origin main

rem === 5️⃣ Envoyer les changements ===
"C:\Program Files\Git\bin\git.exe" push origin main

echo.
echo ✅ Synchronisation terminee avec succes !
exit 0
