//go:build windows

package main

import (
    _ "embed"
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "syscall"
    "time"
)

//go:embed payload/FazendaSerena.exe
var launcher []byte

//go:embed favicon.ico
var icon []byte

const (
    appName = "Fazenda Serena"
    version = "1.0.0"
)

func hidden(name string, args ...string) *exec.Cmd {
    cmd := exec.Command(name, args...)
    cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
    return cmd
}

func ps(script string) error {
    return hidden("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-Command", script).Run()
}

func quotePS(s string) string { return strings.ReplaceAll(s, "'", "''") }

func message(text string) {
    script := fmt.Sprintf(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('%s','%s') | Out-Null`, quotePS(text), appName)
    _ = ps(script)
}

func installDir() string {
    base := os.Getenv("LOCALAPPDATA")
    if base == "" { base = os.TempDir() }
    return filepath.Join(base, "FazendaSerena")
}

func shortcutsScript(target, iconPath string, remove bool) string {
    if remove {
        return `$w=New-Object -ComObject WScript.Shell;` +
            `$d=Join-Path $w.SpecialFolders('Desktop') 'Fazenda Serena.lnk';` +
            `$p=Join-Path $w.SpecialFolders('Programs') 'Fazenda Serena.lnk';` +
            `Remove-Item -LiteralPath $d -Force -ErrorAction SilentlyContinue;` +
            `Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue;`
    }
    t := quotePS(target)
    i := quotePS(iconPath)
    return `$w=New-Object -ComObject WScript.Shell;` +
        `$d=Join-Path $w.SpecialFolders('Desktop') 'Fazenda Serena.lnk';` +
        `$p=Join-Path $w.SpecialFolders('Programs') 'Fazenda Serena.lnk';` +
        `foreach($x in @($d,$p)){` +
        `$s=$w.CreateShortcut($x);` +
        `$s.TargetPath='` + t + `';` +
        `$s.WorkingDirectory='` + quotePS(filepath.Dir(target)) + `';` +
        `$s.IconLocation='` + i + `';` +
        `$s.Description='Fazenda Serena — Agricultura Industrial';` +
        `$s.Save()}`
}

func uninstall() {
    dir := installDir()
    _ = ps(shortcutsScript("", "", true))
    _ = hidden("reg.exe", "DELETE", `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\FazendaSerena`, "/f").Run()
    // O próprio desinstalador está dentro da pasta; removemos após ele encerrar.
    cleanup := fmt.Sprintf(`ping 127.0.0.1 -n 3 >nul & rmdir /s /q "%s"`, dir)
    cmd := hidden("cmd.exe", "/C", "start", "", "/min", "cmd.exe", "/C", cleanup)
    _ = cmd.Start()
    message("Fazenda Serena foi removida deste computador.")
}

func install() error {
    dir := installDir()
    if err := os.MkdirAll(dir, 0755); err != nil { return err }

    launcherPath := filepath.Join(dir, "FazendaSerena.exe")
    iconPath := filepath.Join(dir, "FazendaSerena.ico")
    uninstallPath := filepath.Join(dir, "Uninstall.exe")

    if err := os.WriteFile(launcherPath, launcher, 0755); err != nil { return err }
    if err := os.WriteFile(iconPath, icon, 0644); err != nil { return err }

    self, err := os.Executable()
    if err == nil {
        if bytes, readErr := os.ReadFile(self); readErr == nil {
            _ = os.WriteFile(uninstallPath, bytes, 0755)
        }
    }

    if err := ps(shortcutsScript(launcherPath, iconPath, false)); err != nil { return err }

    key := `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\FazendaSerena`
    values := [][]string{
        {"ADD", key, "/v", "DisplayName", "/t", "REG_SZ", "/d", appName, "/f"},
        {"ADD", key, "/v", "DisplayVersion", "/t", "REG_SZ", "/d", version, "/f"},
        {"ADD", key, "/v", "Publisher", "/t", "REG_SZ", "/d", "Kaik D'Andrade", "/f"},
        {"ADD", key, "/v", "InstallLocation", "/t", "REG_SZ", "/d", dir, "/f"},
        {"ADD", key, "/v", "DisplayIcon", "/t", "REG_SZ", "/d", iconPath, "/f"},
        {"ADD", key, "/v", "UninstallString", "/t", "REG_SZ", "/d", `"` + uninstallPath + `" /uninstall`, "/f"},
        {"ADD", key, "/v", "URLInfoAbout", "/t", "REG_SZ", "/d", "https://fazenda-serena.web.app/", "/f"},
        {"ADD", key, "/v", "NoModify", "/t", "REG_DWORD", "/d", "1", "/f"},
        {"ADD", key, "/v", "NoRepair", "/t", "REG_DWORD", "/d", "1", "/f"},
    }
    for _, args := range values { _ = hidden("reg.exe", args...).Run() }

    // Pequeno atraso para o Explorer perceber os atalhos antes de abrir o app.
    time.Sleep(250 * time.Millisecond)
    if err := hidden(launcherPath).Start(); err != nil { return err }
    message("Fazenda Serena foi instalada. Um atalho foi criado na Área de Trabalho e no menu Iniciar.")
    return nil
}

func main() {
    exe, _ := os.Executable()
    base := strings.ToLower(filepath.Base(exe))
    uninstallMode := strings.Contains(base, "uninstall")
    for _, arg := range os.Args[1:] {
        if strings.EqualFold(arg, "/uninstall") || strings.EqualFold(arg, "--uninstall") { uninstallMode = true }
    }
    if uninstallMode { uninstall(); return }
    if err := install(); err != nil { message("Não foi possível instalar a Fazenda Serena.\n\n" + err.Error()) }
}
