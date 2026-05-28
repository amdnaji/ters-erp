using System;
using System.Diagnostics;
using System.IO;

namespace TersErp.Launcher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                // Define dynamic CommonAppData path
                var appDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "TersERP");
                var activePortPath = Path.Combine(appDataFolder, "active_port.txt");
                
                string port = "5080"; // Fallback port
                if (File.Exists(activePortPath))
                {
                    string content = File.ReadAllText(activePortPath).Trim();
                    if (!string.IsNullOrEmpty(content))
                    {
                        port = content;
                    }
                }
                
                var url = $"http://localhost:{port}";
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch
            {
                // Silent fallback
            }
        }
    }
}
