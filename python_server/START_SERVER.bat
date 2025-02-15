@echo off
title ComfyPhotoshop Python Server Hook

:INSTALL

IF NOT EXIST venv (
   	python -m venv venv
	call .\venv\Scripts\activate.bat
   	pip install -r requirements.txt
	GOTO DONE
)

call .\venv\Scripts\deactivate.bat
call .\venv\Scripts\activate.bat

:DONE

call .\venv\Scripts\python.exe websocket_server.py
pause