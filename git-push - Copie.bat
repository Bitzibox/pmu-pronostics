@echo off
cd C:\Users\ElsyvIA\Documents\pmu-pronostics
"C:\Program Files\Git\bin\git.exe" pull --rebase origin main
"C:\Program Files\Git\bin\git.exe" push origin main
"C:\Program Files\Git\bin\git.exe" add data\*.json
"C:\Program Files\Git\bin\git.exe" commit -m "[AUTO] Mise à jour des données du %DATE%"
"C:\Program Files\Git\bin\git.exe" push
pause
exit 0