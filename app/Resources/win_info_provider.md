### This file has the source code for the windows application which provides data such as current window title and currently playing media

```
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Net.Http;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Threading;
using Windows.Media.Control;

namespace ActiveWinTest {
    [ComImport]
    [Guid("3E68D4BD-7135-4D10-8018-9FB6D9F33FA1")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IInitializeWithWindow {
        void Initialize (IntPtr hwnd);
    }

    class Program {
        //https://stackoverflow.com/questions/115868/how-do-i-get-the-title-of-the-current-active-window-using-c

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern IntPtr GetForegroundWindow ();

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetWindowText (IntPtr hWnd, StringBuilder text, int count);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetWindowTextLength (IntPtr hWnd);

        static async Task Main (string[] args) {
            Console.WriteLine("Running!");

            //SystemMediaTransportControls _control = Windows.Media.Playback.BackgroundMediaPlayer.Current.SystemMediaTransportControls;
            //_control.DisplayUpdater.Type = MediaPlaybackType.Music;
            //SystemMediaTransportControlsDisplayUpdater currentTrack = _control.DisplayUpdater;
            //Console.WriteLine(currentTrack.MusicProperties);

            var sessions = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
            var currentSession = sessions.GetCurrentSession();

            string oldTitle = "";
            string oldArtist = "";
            string oldMediaTitle = "";
            const int nChars = 256;
            int sleepDuration = 500;
            StringBuilder Buff = new StringBuilder(nChars);
            while (true) {
                IntPtr handle = GetForegroundWindow();
                string currentTitle = "";
                string currentArtist = "-";
                string currentMediaTitle = "-";

                if (GetWindowText(handle, Buff, nChars) > 0) {
                    currentTitle = Buff.ToString();
                }

                currentSession = sessions.GetCurrentSession();
                
                if (currentSession != null) {
                    var info = await currentSession.TryGetMediaPropertiesAsync();
                    currentArtist = info.Artist;
                    currentMediaTitle = info.Title;
                }

                if (currentTitle != oldTitle && currentTitle != "") {
                    oldTitle = currentTitle;
                    Console.WriteLine(currentTitle);
                    var body = FormatRequestBody(new List<string>{"windowTitle"}, new List<string>{currentTitle});
                    await SendPostRequest("http://localhost:3456/updateActiveWin", body);
                }

                if ((currentMediaTitle != oldMediaTitle && currentMediaTitle != "") || (currentArtist != oldArtist && currentArtist != "")) {
                    oldMediaTitle = currentMediaTitle;
                    oldArtist = currentArtist;
                    Console.WriteLine("Playing " + currentMediaTitle + " by " + currentArtist);
                    var body = FormatRequestBody(new List<string>{"currentMediaTitle", "currentArtist"}, new List<string>{currentMediaTitle, currentArtist});
                    await SendPostRequest("http://localhost:3456/updateCurrentMedia", body);
                }

                Thread.Sleep(sleepDuration);
            }
        }

        private static async Task<string> SendPostRequest (string url, Dictionary<string, string> body) {
            try {
                var content = JsonSerializer.Serialize(body);
                HttpResponseMessage response = null;
                using (var client = new HttpClient()) {
                    response = await client.PostAsync(url, new StringContent(content, Encoding.UTF8, "application/json"));
                }

                string result = response.Content.ReadAsStringAsync().Result;
                return result;
            } catch (Exception ex) {
                Console.WriteLine("Error in SendPostRequest");
                return "";
            }
        }

        private static Dictionary<string, string> FormatRequestBody (List<string> keys, List<string> values) {
            if (keys.Count != values.Count) {
                return new Dictionary<string, string>();
            }

            Dictionary<string, string> body = new();
            for (int i = 0; i < keys.Count; i++) {
                body.Add(keys[i], values[i]);
            }
            return body;
        }
    }
}
```
