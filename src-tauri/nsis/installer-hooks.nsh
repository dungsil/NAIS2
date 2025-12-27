!macro NSIS_HOOK_PREINSTALL
  ; Kill any running tagger-server.exe processes before installation
  nsExec::ExecToLog 'taskkill /F /IM tagger-server.exe'
  ; Also kill the main app if running (to ensure clean install/update)
  nsExec::ExecToLog 'taskkill /F /IM NAIS2.exe'
!macroend
