const {ipcRenderer} = require('electron')

window.addEventListener('DOMContentLoaded', () => {
    const viewRoot = document.getElementById('content-root')
    let mdname = ""

    // 辿ったらtrueを返す
    const followLink = (e)=> {
        if (e.target.tagName == 'A' && e.target.className == 'wikilink')
        {
            e.preventDefault()
            const href = e.target.href; /// file:///HelloLink.md, etc.
            ipcRenderer.send('follow-link', href.substring(8))
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

    const title = document.getElementById('title')
    const dateElem = document.getElementById('date')

    ipcRenderer.on('update-md', (event, fname, mtime, html) => {
        mdname = fname
        title.innerText = fname.substring(0, fname.length-3)
        dateElem.innerText = mtime
        viewRoot.innerHTML = html
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
        editTextArea.rows = Math.max(5, text.split('\n').length+1)
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
            htmls.push( `<li class="menu-item"><a class="wikilink" href="${recent.abs}">${recent.label}</a></a></li>`)
        }
        recentsUL.innerHTML = htmls.join('\n')
    })

})