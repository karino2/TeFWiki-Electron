# What's TeFWiki?

TeFWiki is a wiki system based on the plain text file, markdown + WikiLink.

- Plain text file, no metadata, just one folder
- markdown + WikiLink (ex: `[[SomeLink]]`)
- Both Android phone and PC app
 - For PC, Electron-based app. No need to set up a web server or DB
- No sync feature, just use standard folder sync app (I use Google Drive+ [AutoSync for Google Drive](https://play.google.com/store/apps/details?id=com.ttxapps.drivesync&hl=en&gl=US) and can recommend, but you can use whatever you want)

### Supportd Platforms

There are two variant

- PC App: Electron based. [https://github.com/karino2/TeFWiki-Electron/](https://github.com/karino2/TeFWiki-Electron/)
- Android App: [https://github.com/karino2/TeFWiki-Electron/](https://github.com/karino2/TeFWiki-Electron/)

### Screenshot

**PC ver**

![Mac, screenshot](https://karino2.github.io/assets/images/2021-04/TeFWiki_screenshot_mac.png)

![Mac, edit](https://karino2.github.io/assets/images/2021-04/TeFWiki_screenshot_edit_mac.png)

Code highlight is PC ver only (at least now).

**Android ver**

![Android mdtest](https://karino2.github.io/assets/images/2021-04/TeFWiki_screenshot_mdtest.png")

![Android Recents](https://karino2.github.io/assets/images/2021-04/TeFWiki_screenshot_recents.png")

![Android edit](https://karino2.github.io/assets/images/2021-04/TeFWiki_screenshot_edit.png")

### WikiLink spec

WikiLink is a link name enclosed with `[[` and `]]`. (ex. `[[SomeLink]]`)

Use WikiName + `.md` suffix as file name.
For example, `[[SomeLink]]` is the link to file `SomeLink.md` in the same folder.

You can only use a valid file name character for WikiLink.
For example, you can't use `/`.

# Concept

TeFWiki is just a plain text wiki, formated with GFM markdown + WikiLink.
That's all and you can understand almost everything from the above one sentence and screenshot.

But I'll describe some background philosophy here.

### Data is main, an app is a temporal tool

For personal note, the data tend to survive longer than a specific service, app, or platform.
Even if one app finishes its lifetime, the data should be usable afterward.

An app should not own data, but help produce it.

Plain text and ordinal file would survive enough long.

Users should easily change note-taking app.

### I want to share notes on both PC and smartphone

There are already many good local text-file-based note-taking systems.
But most of them lack smartphone app and hard to use from the phone.

For the smartphone app side, they store data to their server or private storage.

I need an app for both PC and smartphone which supports the same data.

### Modern looking, modern implementation

I want good styling for markdown rendering. I use [bulma.css](https://bulma.io) for styling (Thanks! Bulma is awesome!).
Please check screenshots!

I want the menu and navigation of the phone app must be the same as a standard modern app.

Also, the phone app should use up-to-date Android APIs, not the legacy ones, so that I can use the app for not short future, at least my next device.
Specifically, do not use WRITE_EXTERNAL_STORAGE permission, but use the Storage Access Framework.

### Date should be open for other developers

I want to combine many other apps for my daily use.

Some developers might create a good markdown editor, while another developer might create a cool ToDo app on top of the markdown file.

I develop a little instant voice-recognition text input app on markdown file.

For other developers to accept, the rules and conventions for the system must be as conservative as possible.
I guess Github Flavored Markdown with WikiLink is a reasonably plain rule.

TeFWiki stores no metadata.
The drawback of this decision does exist.
For example, it lacks rigid page modified time support (timestamp of the file decided when you sync in other devices).

But it makes other developers easy to understand what they can do.
They can modify or generate data easily without worry about data consistency.

### Open Source

This app is Open Source.
Though I don't think this part is inevitable for a good note-taking app,  Open Source makes it easier for other developers to collaborate with.

Also, if I discontinue the development of TeFWiki in the future, you can fork it if you want. 
