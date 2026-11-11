Unicode true
!include "MUI2.nsh"

Name "SmartPlanner"
OutFile "../dist/SmartPlanner-Setup-0.2.0.exe"
InstallDir "$LOCALAPPDATA\SmartPlanner"
InstallDirRegKey HKCU "Software\SmartPlanner" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "SmartPlanner"

VIProductVersion "0.2.0.0"
VIAddVersionKey "ProductName" "SmartPlanner"
VIAddVersionKey "CompanyName" "SmartPlanner"
VIAddVersionKey "FileDescription" "SmartPlanner 个人工作台安装程序"
VIAddVersionKey "FileVersion" "0.2.0"
VIAddVersionKey "ProductVersion" "0.2.0"
VIAddVersionKey "LegalCopyright" "SmartPlanner"

!define MUI_ABORTWARNING
!define MUI_ICON "../build/icon.ico"
!define MUI_UNICON "../build/icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\SmartPlanner.exe"
!define MUI_FINISHPAGE_RUN_TEXT "启动 SmartPlanner"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "../dist/win-unpacked/*.*"
  File "../build/icon.ico"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$DESKTOP\SmartPlanner.lnk" "$INSTDIR\SmartPlanner.exe" "" "$INSTDIR\icon.ico" 0
  CreateDirectory "$SMPROGRAMS\SmartPlanner"
  CreateShortcut "$SMPROGRAMS\SmartPlanner\SmartPlanner.lnk" "$INSTDIR\SmartPlanner.exe" "" "$INSTDIR\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\SmartPlanner\卸载 SmartPlanner.lnk" "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\SmartPlanner" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "DisplayName" "SmartPlanner"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "DisplayVersion" "0.2.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "Publisher" "SmartPlanner"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\SmartPlanner.lnk"
  Delete "$SMPROGRAMS\SmartPlanner\SmartPlanner.lnk"
  Delete "$SMPROGRAMS\SmartPlanner\卸载 SmartPlanner.lnk"
  RMDir "$SMPROGRAMS\SmartPlanner"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SmartPlanner"
  DeleteRegKey HKCU "Software\SmartPlanner"

  RMDir /r "$INSTDIR"
SectionEnd
