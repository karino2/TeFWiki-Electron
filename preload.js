const {ipcRenderer} = require('electron')

window.addEventListener('DOMContentLoaded', () => {
    const viewRoot = document.getElementById('content-root')
    let mdname = ""

    // 辿ったらtrueを返す
    const followLink = (e)=> {
        if (e.target.tagName == 'A' && e.target.classList.contains('wikilink'))
        {
            e.preventDefault()
            const href = e.target.href; /// tefwiki:///HelloLink.md, etc.
            toViewMode()
            ipcRenderer.send('follow-link', href.substring(11))
            return true
        }
        if (e.target.tagName == 'A' && e.target.classList.contains('wikidir'))
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

    const navroot = document.getElementById('navroot')
    const navholderDiv = document.getElementById('navholder')

    navholderDiv.addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    /*

        <a class="navbar-item" href="#">Root</a>
        <a class="navbar-item"  href="#">RandomThoughts</a>
        <a class="navbar-item"  href="#">Dir1</a>
        <span class="navbar-item">Dir2</span>
    */

    // root -> dirArr = []
    // root/RandomThoughts -> dirArr = ["RandomThoughts"]
    // root/RandomThoughts/Test -> dirArr = ["RandomThoughts", "Test"]
    const updateBread = (dirArr, sibWikis) => {        
        if(dirArr.length == 0 || (dirArr.length == 1 && dirArr[0] == '')) {
            navholderDiv.innerHTML = ""
            navroot.style.display = 'none'
            return
        }
        navroot.style.display = 'block'
        let htmls = []

        htmls.push(`<a class="navbar-item wikidir" href="tefwiki:///root">Root</a>`)
        htmls.push(`<span class="navbar-item">/</span>`)
        let dirs = ["root"]
        for(const cur of dirArr.slice(0, dirArr.length-1)) {
            dirs.push(cur)
            const absDir = dirs.join("/")
            htmls.push(`<a class="navbar-item wikidir" href="tefwiki:///${absDir}">${cur}</a>`)
            htmls.push(`<span class="navbar-item">/</span>`)
        }

        const cur = dirArr[dirArr.length-1]
        if (sibWikis.length == 0) {
            htmls.push(`<span class="navbar-item">${cur}</span>`)
        } else {
            htmls.push(`<div class="navbar-item has-dropdown is-hoverable">`)
            htmls.push(`<a class="navbar-link">${cur}</a>`)
            htmls.push(`<div class="navbar-dropdown">`)
            for (const sib of sibWikis) {
                const absDir = [...dirs, sib].join("/")
                htmls.push(`<a class="navbar-item wikidir" href="tefwiki:///${absDir}">${sib}</a>`)
            }    
            htmls.push(`</div>`) // navbar-dropdown
            htmls.push(`</div>`) // navbar-item
    
        }
        navholderDiv.innerHTML = htmls.join('\n')
    }

    const title = document.getElementById('title')
    const dateElem = document.getElementById('date')

    ipcRenderer.on('update-md', (event, fname, mtime, html, relativeDir, sibWikis) => {
        mdname = fname
        title.innerText = fname.substring(0, fname.length-3)
        dateElem.innerText = mtime
        viewRoot.innerHTML = html

        updateBread(relativeDir.split("/"), sibWikis)
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
    document.getElementById('edit-b').addEventListener('click', ()=> {
        ipcRenderer.send('click-edit', mdname)
    })

    const viewButtons = document.getElementById('view-buttons')
    const viewButtonsB = document.getElementById('view-buttons-b')
    const editButtons = document.getElementById('edit-buttons')
    const editButtonsB = document.getElementById('edit-buttons-b')
    const editTextArea = document.getElementById('edit-textarea')
    

    const toEditMode = (text) => {
        viewButtons.style.display = 'none'
        viewButtonsB.style.display = 'none'
        viewRoot.style.display = 'none'
        editButtons.style.display = 'block'
        editButtonsB.style.display = 'block'
        editTextArea.style.display = 'block'
        editTextArea.value = text
    }
    ipcRenderer.on('start-edit', (event, text)=> {
        toEditMode(text)
    })

    const toViewMode = () => {
        viewButtons.style.display = 'block'
        viewButtonsB.style.display = 'block'
        viewRoot.style.display = 'block'
        editButtons.style.display = 'none'
        editButtonsB.style.display = 'none'
        editTextArea.style.display = 'none'
    }

    let isNewMode = false
    const toCreateNewMode = () => {
        isNewMode = true
        toEditMode("")
    }

    const editCancel = () => {
        toViewMode()
        if (isNewMode) {
            isNewMode = false
            ipcRenderer.send('cancel-back', prevFname)
        }        
    }
    const editSubmit = () => {
        isNewMode = false
        ipcRenderer.send('submit', mdname, editTextArea.value)
        toViewMode()        
    }
    document.getElementById('edit-cancel').addEventListener('click', editCancel)
    document.getElementById('edit-cancel-b').addEventListener('click', editCancel)
    document.getElementById('edit-submit').addEventListener('click', editSubmit)
    document.getElementById('edit-submit-b').addEventListener('click', editSubmit)

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