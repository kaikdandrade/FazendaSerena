//go:build windows

package main

import (
    "os"
    "os/exec"
    "path/filepath"
    "syscall"
)

const gameURL = "https://fazenda-serena.web.app/play.html?app=windows"

func existing(paths ...string) string {
    for _, p := range paths {
        if p == "" { continue }
        if _, err := os.Stat(p); err == nil { return p }
    }
    return ""
}

func findEdge() string {
    pf := os.Getenv("ProgramFiles")
    pfx86 := os.Getenv("ProgramFiles(x86)")
    local := os.Getenv("LOCALAPPDATA")
    if p := existing(
        filepath.Join(pfx86, "Microsoft", "Edge", "Application", "msedge.exe"),
        filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
        filepath.Join(local, "Microsoft", "Edge", "Application", "msedge.exe"),
    ); p != "" { return p }
    if p, err := exec.LookPath("msedge.exe"); err == nil { return p }
    return ""
}

func hiddenCommand(name string, args ...string) *exec.Cmd {
    cmd := exec.Command(name, args...)
    cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
    return cmd
}

func main() {
    if edge := findEdge(); edge != "" {
        // O modo --app mantém a origem web real (Firebase/Google Auth) e remove
        // a interface normal do navegador. Para o jogador, abre como uma janela
        // independente chamada Fazenda Serena.
        cmd := hiddenCommand(edge,
            "--app="+gameURL,
            "--start-maximized",
            "--disable-features=msEdgeSidebarV2",
        )
        if err := cmd.Start(); err == nil { return }
    }

    // Fallback para instalações do Windows sem Edge disponível.
    _ = hiddenCommand("rundll32.exe", "url.dll,FileProtocolHandler", gameURL).Start()
}
