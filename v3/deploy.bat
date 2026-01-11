@echo off
title RePhone Safe Deploy - Versao 4.0
echo ==========================================
echo    INICIANDO DEPLOY SEGURO - REPHONE
echo ==========================================

:: 1. Verificacao de arquivos criticos
if not exist public\app-radar.js (
    echo [ERRO] Arquivo app-radar.js (ofuscado) nao encontrado!
    pause
    exit
)

if not exist public\app-admin.js (
    echo [ERRO] Arquivo app-admin.js (ofuscado) nao encontrado!
    pause
    exit
)

:: 2. Limpeza de cache local do Firebase
echo [LOG] Limpando arquivos temporarios...
rd /s /q .firebase

:: 3. Deploy para o Hosting
echo [LOG] Enviando para o Firebase Hosting...
call firebase deploy --only hosting

echo ==========================================
echo    DEPLOY CONCLUIDO COM SUCESSO!
echo    Seu marketplace esta protegido.
echo ==========================================
pause
