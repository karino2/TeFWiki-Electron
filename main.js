const { ipcMain, dialog, app, BrowserWindow, screen, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const { constants } = require('fs')
const Store = require('electron-store')
const { PassThrough } = require('stream')

const options = {
    uriSuffix: '.md',
    makeAllLinksAbsolute: true,    
    htmlAttributes: {'class': 'wikilink'}
}
const md = require('markdown-it')()
    .use(require('markdown-it-wikilinks')(options))


const store = new Store()

const createWindow = async ()=>{
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const win = new BrowserWindow({
      width: width,
      height: height,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    })
  
    win.loadFile('index.html')

    win.webContents.on('will-navigate', (e, url)=> {
        console.log(url)
        e.preventDefault()
        shell.openExternal(url)
    })

    const rootPath = store.get('root-path')
    if (rootPath == null) {
        await openDirDialog((dir)=>{
            gotoHome(dir, win)
        })
    }
    else
    {
        await gotoHome(rootPath, win)
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

const toFullPath = (fname) => {
    return path.join(store.get('root-path'), fname)
}

const openMd = async(fname, targetWin) => {
    const mdpath = toFullPath(fname)
    const stat = await fs.stat(mdpath)
    const cont = await fs.readFile(mdpath)
    const html = md.render(cont.toString())
    targetWin.send('update-md', fname, stat.mtime, html)
}

const ensureHome = async (dir) => {
    const homePath = path.join(dir, "Home.md")
    try {
        await fs.access( homePath, constants.O_RDWR )
    }
    catch {
        await fs.writeFile( homePath,
`# Home

Initial wiki page.
Please Edit this file.

[[HelloLink]]
`)
    }
}

const gotoHome = async (dir, targetWin) => {
    await ensureHome(dir)
    openMd( "Home.md", targetWin )
}

const openDirDialog = async (onSuccess) => {
    const {canceled, filePaths} = await dialog.showOpenDialog({
        properties: ['openDirectory']
    })
    if(!canceled) {
        store.set('root-path', filePaths[0])
        onSuccess(filePaths[0])
    }
}

ipcMain.on('follow-link', async (event, fname)=> {
    const full = toFullPath(fname)
    try {
        await fs.access(full, constants.O_RDWR)
        openMd(fname, event.sender)
    }
    catch {
        event.sender.send('create-new', fname)
    }
})

ipcMain.on('click-edit', async (event, mdname) => {
    const full = toFullPath(mdname)
    const content = await fs.readFile(full)
    event.sender.send('start-edit', content.toString())
})

ipcMain.on('submit', async (event, mdname, text)=> {
    const full = toFullPath(mdname)
    await fs.writeFile( full, text )
    openMd(mdname, event.sender)
})

ipcMain.on('cancel-back', async(event, mdname)=> {
    await openMd(mdname, event.sender)
})

const isMac = process.platform === 'darwin'

const template = [
  ...(isMac ? [{ role: 'appMenu'}] : []),
  {
    label: 'File',
    submenu: [
        {
            label: "Open Root Dir",
            accelerator: 'CmdOrCtrl+O',
            click: async (item, focusedWindow)=> {
                openDirDialog((dir)=>{ gotoHome(dir, focusedWindow)})
            }
        },
        {
            label: "Open Recent",
            role: "recentDocuments",
            submenu: [
                {
                    label: "Clear Recent",
                    role: "clearRecentDocuments"
                }
            ]
        },
        isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  { role: 'editMenu' },
  {
    label: 'View',
    submenu: [
      {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow)=> {
              // reloadFile( focusedWindow )
          }
      },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  { role: 'windowMenu' },
  {
    label: 'Developer',
    submenu: [
        { role: 'toggleDevTools' }
    ]
  }
]

app.whenReady().then(async () => {
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    await createWindow()
    console.log(store.get('root-path'))


    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow()
        }
    })
})

