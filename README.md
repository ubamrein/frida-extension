# Frida Extension
## Requirements
- xz-Tools
- Android Build Tools (adb, zipalign, jarsigner)
- frida-tools

This extension needs an opened folder to work correctly. If you encounter random errors, try first to open a
workspace.

## Apk-Tool
Apk-Tool is downloaded from Github. Each time the extension is loaded, it looks for new versions and updates if
necessary. 

## Android View (Custom View)
This extension tries to help with standard tasks while analyzing packages. It offers
an Android view, which lists packages on the device (if any is plugged in), downloaded Apk, extracted Apk
and repackaged Apk. 

With a click on a item on a device, the extension uses `adb pull` to pull the package. Afterwards the Apk
can be extracted using Apk-Tool (which is downloaded from Github if it is not found).

After editing everything, it can be repacked, resigned and zip aligned to have a ready to ship APK. One further
click allows the APK to be installed on the device.

It allows further to directly download the needed Frida-Gadget libraries for the found platforms in the APK. 
If no native libraries are used, one needs to manually add the platform-directories, for which Frida-Gadget
is needed.

## Frida View (Injects itself into the Explorer View)
The Frida View lists all found processes, and sorts them by package identifier. It exposes two folders (for 
Android and iOS), which contain basic Frida-Hooks often needed. Clicking on a script, launches frida and
attaches to the respective device. Right click enables to open the script (which is stored in the extension 
directory, so saves are persisted)
and adjust it.

It also exposes a third directory, which lists all Javascript-Files found in the current Workspace.

> ⚠️ **Multiple Devices plugged in**: Please be aware that currently only one Frida USB Device is supported.
If you have multiple devices plugged in which are recognized by frida, the extension fails with random frida 
errors.