; The directory page must show the real install folder before copying starts.
; electron-builder adds "XO Craft Solution" only on the next page, so the
; field can say D:\ while the files go into D:\XO Craft Solution, or the
; person creates that folder by hand and ends up with two of them.

!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryLeave

!macro customHeader
  !ifndef WM_GETTEXT
    !define WM_GETTEXT 0x000D
  !endif
  !ifndef WM_SETTEXT
    !define WM_SETTEXT 0x000C
  !endif

  Var AppDirEdited
  Var AppDirNormalized

  Function DirectoryLeave
    Push $0
    Push $1
    Push $2
    Push $R0
    Push $R1
    Push $R2
    Push $R3
    Push $R4

    FindWindow $0 "#32770" "" $HWNDPARENT
    GetDlgItem $1 $0 1019
    ${If} $1 = 0
      StrCpy $AppDirEdited $INSTDIR
    ${Else}
      SendMessage $1 ${WM_GETTEXT} ${NSIS_MAX_STRLEN} "STR:$AppDirEdited"
    ${EndIf}

    ${If} $AppDirEdited == ""
      Goto directoryLeaveDone
    ${EndIf}

    ; Drop a trailing slash, but keep the root of a drive ("D:\").
    ${Do}
      StrCpy $R0 $AppDirEdited "" -1
      StrLen $R1 $AppDirEdited
      ${If} $R0 == "\"
      ${AndIf} $R1 > 3
        StrCpy $AppDirEdited $AppDirEdited -1
      ${Else}
        ${Break}
      ${EndIf}
    ${Loop}

    StrCpy $R3 "\${APP_FILENAME}"
    StrLen $R4 $R3
    IntOp $R2 $R4 * 2
    StrLen $R1 $AppDirEdited
    ${If} $R1 >= $R2
      StrCpy $R0 $AppDirEdited "" -$R2
      StrCpy $R1 "$R3$R3"
      ${If} $R0 == $R1
        StrCpy $AppDirEdited $AppDirEdited -$R4
      ${EndIf}
    ${EndIf}

    StrLen $R1 $AppDirEdited
    ${If} $R1 > $R4
      StrCpy $R0 $AppDirEdited "" -$R4
    ${Else}
      StrCpy $R0 ""
    ${EndIf}

    ${If} $R0 != $R3
      StrCpy $AppDirNormalized "$AppDirEdited$R3"
    ${Else}
      StrCpy $AppDirNormalized $AppDirEdited
    ${EndIf}

    StrCpy $INSTDIR $AppDirNormalized
    ${If} $1 != 0
    ${AndIf} $AppDirNormalized != $AppDirEdited
      SendMessage $1 ${WM_SETTEXT} 0 "STR:$AppDirNormalized"
      Pop $R4
      Pop $R3
      Pop $R2
      Pop $R1
      Pop $R0
      Pop $2
      Pop $1
      Pop $0
      Abort
    ${EndIf}

    directoryLeaveDone:
    Pop $R4
    Pop $R3
    Pop $R2
    Pop $R1
    Pop $R0
    Pop $2
    Pop $1
    Pop $0
  FunctionEnd
!macroend
