@echo off
title Actualizar Recomendaciones UBA Derecho (2C 2026)
echo =======================================================
echo    Actualizando Bases de Datos de Recomendaciones UBA
echo =======================================================
echo.
echo Descargando ultimas guias de La Campora, Nexo, La Mella,
echo Nuevo Derecho, Franja Morada y PDFs de La Centeno...
echo.
cd /d "C:\Users\User\Downloads\WIN10PRO64NOV-XYZ\Desktop\Proyectos Antigravity\Recomendacion Materias UBA\Recomendacion Materias UBA"
python actualizar_datos.py
echo.
echo =======================================================
echo ¡Proceso Finalizado! El catalogo ha sido actualizado.
echo =======================================================
echo.
pause
