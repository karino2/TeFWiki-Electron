const { ipcMain, dialog, app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const { constants } = require('fs')
const Store = require('electron-store')
const windowStateKeeper = require('electron-window-state')
const hljs = require('highlight.js')

if (require('electron-squirrel-startup')) return app.quit()


const options = {
    uriSuffix: '.md',
    baseURL: "tefwiki:///",
    makeAllLinksAbsolute: true,
    // for ：, jekyll seems link to replace hankaku :, and fail to map to file. So we do not support TeFWiki either.
    // Zenkaku question mark is the same.
    linkPattern: /\[\[([\w\s/\u4E00-\u9FFFぁ-んァ-ヶ　-ー]+)(\|([\w\s/\u4E00-\u9FFFぁ-んァ-ヶ　-ー]+))?\]\]/,
    htmlAttributes: {'class': 'wikilink'}
}

const wikilinks = require('@kwvanderlinde/markdown-it-wikilinks')(options)
const taskList = require('markdown-it-task-lists')

const md = require('markdown-it')({
        highlight: (str, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(str, {language: lang}).value;
                } catch (__) {}
            }
          
            return '' // use external default
        }
    })
    .use(wikilinks)
    .use(taskList)

md.renderer.rules.table_open = ()=> {
    return '<table class="table is-striped">\n'
}

const store = new Store()

const MAX_RECENT = 15

// relativeDir format
//
// root: ""
// test/Home.md: "test"
// test/test2/Home.md: "test/test2"
let relativeDir = ""

// Store last opened md name. "Home.md"
let lastMd = "Home.md"

const recentFiles = async() => {
    const dir = path.join(store.get('root-path'), relativeDir)
    const files = await fs.readdir(dir)
    const fwithm = await Promise.all(files
        .filter( fname => fname.endsWith(".md") )
        .map( async fname=> {
            const full = path.join(dir, fname)
            const mtime = (await fs.stat(full)).mtime
            return {fname, mtime}
        }))

    return fwithm.sort( (a, b)=> b.mtime - a.mtime)
            .slice(0, MAX_RECENT)
            .map( pair=> {return {abs: `/${pair.fname}`, label:pair.fname.substring(0, pair.fname.length-3)}})
}

const updateRecentFiles = async(win) => {
   const recents = await recentFiles()
   win.send('update-recents', recents)
}


const createWindow = async ()=>{
    const winStat = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800
    })
    const win = new BrowserWindow({
        x: winStat.x,
        y: winStat.y,
        width: winStat.width,
        height: winStat.height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    winStat.manage(win)
  
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
    updateRecentFiles(win)
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

/*
path.join("/abc", "", "def")
'/abc/def'
*/
const toFullPath = (fname) => {
    return path.join(store.get('root-path'), relativeDir, fname)
}

const toFullDir = () => {
    return path.join(store.get('root-path'), relativeDir)
}

/*
// relativeDir format
//
// root: ""
// test/Home.md: "test"
// test/test2/Home.md: "test/test2"
let relativeDir = ""
*/
const siblings = async() => {
    if(relativeDir == "")
        return []
    const seps = relativeDir.split("/")
    const parentRelative = seps.slice(0, seps.length-1).join("/")
    const cur = seps[seps.length-1]
    const parent = path.join(store.get('root-path'), parentRelative)
    const children =  await fs.readdir(parent, {withFileTypes: true})
    return children
        .filter( f => f.name != cur && f.isDirectory() )
        .map( f=> f.name )
        .sort()
}

const openMd = async(fname, targetWin) => {
    const mdpath = toFullPath(fname)
    const stat = await fs.stat(mdpath)
    const cont = await fs.readFile(mdpath)
    const html = md.render(cont.toString())
    const sibWikis = await siblings()
    // console.log(sibWikis)
    targetWin.send('update-md', fname, stat.mtime, html, relativeDir, sibWikis)
    lastMd = fname
}

const ensureDir = async (dir) => {
    try {
        await fs.access( dir, constants.O_RDWR )
    }
    catch {
        await fs.mkdir( dir )
    }
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

ipcMain.on('follow-link', async (event, fnameOrg)=> {
    fnameOrg = decodeURI(fnameOrg)
    const seps = fnameOrg.split("/")
    let full = ""
    let fname = fnameOrg

    if(seps.length > 1) {
        relativeDir = path.join(relativeDir, seps.slice(0, seps.length-1).join("/"))
        fname = seps[seps.length-1]

        const absDir = path.join(store.get('root-path'), relativeDir)
        ensureDir(absDir)
        updateRecentFiles(event.sender)
    }

    full = toFullPath(fname)
    try {
        await fs.access(full, constants.O_RDWR)
        openMd(fname, event.sender)
    }
    catch {
        event.sender.send('create-new', fname)
    }
})

// dir
//
// root: ""
// root/RandomThoughts: "/RandomThoughts"
// root/RandomThoughts/dir1: "/RandomThougts/dir1"
ipcMain.on('move-dir', async (event, dir)=> {
    dir = decodeURI(dir)
    if (dir == '') {
        relativeDir = ""
    } else {
        // skip head '/'
        relativeDir = dir.substring(1)
        await ensureHome(toFullDir())
    }

    openMd("Home.md", event.sender)
    updateRecentFiles(event.sender)
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
    updateRecentFiles(event.sender)
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
              updateRecentFiles(focusedWindow)
              openMd(lastMd, focusedWindow)
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

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow()
        }
    })
})

