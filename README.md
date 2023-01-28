# KeybKontroller
Control your qmk enabled keyboard using raw HID protocol

### Installation
TODO

### Development
TODO

### Documentation
- QMK
  - This program communicates with the keyboard using raw-hid
  - Related code can be found in `app/services/keyboard.js`.
  - QMK keymap related code can be found [here](https://github.com/retrogeek46/qmk_firmware/blob/7a64172f9fec88af5bb11a0c4b213f80f295abb0/keyboards/crkbd/keymaps/retrogeek46/keymap.c#L125) 

- System Info
  - System info is fetch using [HWiNFO64](https://www.hwinfo.com/)
  - HWiNFO64 writes info to regedit which is then read into the program.
  - Related code can be found in `app/services/systemMonitor.js`.

- Current window and currently playing media
  - This data is fetched using a child process running C# code (this will only work for windows)
  - Source code for this can be found in `Resources/win_info_provider.md`.

- Current OS switching (using Barrier software KVM)
  - OS is switched by reading the current window data and changing to macOS if active window is `BarrierDesk`, since that means that focus has switched to other device.
