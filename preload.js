const {ipcRenderer} = require('electron')

window.addEventListener('DOMContentLoaded', () => {
    const viewRoot = document.getElementById('content-root')
    let mdname = ""

    // 辿ったらtrueを返す
    const followLink = (e)=> {
        if (e.target.tagName == 'A' && e.target.className == 'wikilink')
        {
            e.preventDefault()
            const href = e.target.href; /// tefwiki:///HelloLink.md, etc.
            toViewMode()
            ipcRenderer.send('follow-link', href.substring(11))
            return true
        }
        if (e.target.tagName == 'A' && e.target.className == 'wikidir')
        {
            e.preventDefault()
            const href = e.target.href; /// tefwiki:///root/RandomThoughts, etc.
            toViewMode()
            ipcRenderer.send('move-dir', href.substring(15))
            return true
        }
        return false
    }

    viewRoot.addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    document.getElementById("linkbar").addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    const breadUL = document.getElementById('bread')
    
    breadUL.addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    /*
        <li><a href="#">Bulma</a></li>
        <li><a href="#">Documentation</a></li>
        <li><a href="#">Components</a></li>
        <li class="is-active"><a href="#" aria-current="page">Breadcrumb</a></li>
    */

    // root -> dirArr = []
    // root/RandomThoughts -> dirArr = ["RandomThoughts"]
    // root/RandomThoughts/Test -> dirArr = ["RandomThoughts", "Test"]
    const updateBread = (dirArr) => {        
        if(dirArr.length == 0 || (dirArr.length == 1 && dirArr[0] == '')) {
            breadUL.innerHTML = ""
            return
        }
        let htmls = []

        htmls.push(`<li><a aria-current="page" class="wikidir" href="tefwiki://root">Root</a></li>`)
        let dirs = ["root"]
        for(const cur of dirArr.slice(0, dirArr.length-1)) {
            dirs.push(cur)
            const absDir = dirs.join("/")
            htmls.push(`<li><a class="wikidir" href="tefwiki://${absDir}">${cur}</a></li>`)
        }

        const cur = dirArr[dirArr.length-1]
        dirs.push(cur)
        const absDir = dirs.join("/")
        htmls.push(`<li class="is-active"><a class="wikidir" href="tefwiki://${absDir}">${cur}</a></li>`)
        breadUL.innerHTML = htmls.join('\n')
    }

    const title = document.getElementById('title')
    const dateElem = document.getElementById('date')

    ipcRenderer.on('update-md', (event, fname, mtime, html, relativeDir) => {
        mdname = fname
        title.innerText = fname.substring(0, fname.length-3)
        dateElem.innerText = mtime
        viewRoot.innerHTML = html

        updateBread(relativeDir.split("/"))
    })

    let prevFname = ""
    ipcRenderer.on('create-new', (event, fname) => {
        prevFname = mdname
        mdname = fname
        prevTitle = title.innerText
        title.innerText = fname.substring(0, fname.length-3)
        dateElem.innerText = "(new)"
        toCreateNewMode()
    })

    document.getElementById('edit').addEventListener('click', ()=> {
        ipcRenderer.send('click-edit', mdname)
    })

    const viewButtons = document.getElementById('view-buttons')
    const editButtons = document.getElementById('edit-buttons')
    const editTextArea = document.getElementById('edit-textarea')
    

    const toEditMode = (text) => {
        viewButtons.style.display = 'none'
        viewRoot.style.display = 'none'
        editButtons.style.display = 'block'
        editTextArea.style.display = 'block'
        editTextArea.value = text
    }
    ipcRenderer.on('start-edit', (event, text)=> {
        toEditMode(text)
    })

    const toViewMode = () => {
        viewButtons.style.display = 'block'
        viewRoot.style.display = 'block'
        editButtons.style.display = 'none'
        editTextArea.style.display = 'none'
    }

    let isNewMode = false
    const toCreateNewMode = () => {
        isNewMode = true
        toEditMode("")
    }

    document.getElementById('edit-cancel').addEventListener('click', ()=> {
        toViewMode()
        if (isNewMode) {
            isNewMode = false
            ipcRenderer.send('cancel-back', prevFname)
        }
    })

    document.getElementById('edit-submit').addEventListener('click', ()=> {
        isNewMode = false
        ipcRenderer.send('submit', mdname, editTextArea.value)
        toViewMode()        
    })

    // recents
    const recentsUL = document.getElementById('recents')    

    ipcRenderer.on('update-recents', (event, recents) => {
        let htmls = []
        for (const recent of recents) {
            htmls.push( `<li class="menu-item"><a class="wikilink" href="tefwiki://${recent.abs}">${recent.label}</a></a></li>`)
        }
        recentsUL.innerHTML = htmls.join('\n')
    })

})