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
    const searchButton = document.getElementById('search-button')
    const searchPanel = document.getElementById('search-panel')
    const searchInput = document.getElementById('search-input')
    const searchResults = document.getElementById('search-results')
    const searchCandidates = []

    navholderDiv.addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    const selectSearchItem = (item) => {
        toViewMode()
        searchPanel.style.display = 'none'
        ipcRenderer.send('follow-link', item.path)
    }

    const filterCandidates = (query) => {
        const normalizedQuery = query.trim().normalize('NFC')
        return searchCandidates.filter((item) => {
            return item.title.normalize('NFC').includes(normalizedQuery)
        })
    }

    const getSearchResultLinks = () => {
        return Array.from(searchResults.querySelectorAll('a.has-text-link'))
    }

    const focusSearchResultByIndex = (index) => {
        const links = getSearchResultLinks()
        if (links.length === 0) {
            return
        }

        const safeIndex = Math.max(0, Math.min(index, links.length - 1))
        links[safeIndex].focus()
    }

    const renderSearchResults = (query = '') => {
        const filtered = filterCandidates(query)

        searchResults.innerHTML = ''
        if (filtered.length === 0) {
            const emptyItem = document.createElement('li')
            emptyItem.className = 'menu-item'
            emptyItem.innerHTML = '<span class="has-text-grey">No matches</span>'
            searchResults.appendChild(emptyItem)
            return
        }

        filtered.forEach((item) => {
            const listItem = document.createElement('li')
            listItem.className = 'menu-item'
            const link = document.createElement('a')
            link.href = '#'
            link.textContent = item.title
            link.dataset.path = item.path
            link.className = 'has-text-link'
            link.tabIndex = 0
            link.addEventListener('click', (event) => {
                event.preventDefault()
                selectSearchItem(item)
            })
            listItem.appendChild(link)
            searchResults.appendChild(listItem)
        })
    }

    const isSearchPanelVisible = () => {
        return searchPanel.style.display === 'block'
    }

    const eventHandled = (event) => {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
        }
    }

    const toggleSearchPanel = () => {
        if (isSearchPanelVisible()) {
            searchPanel.style.display = 'none'
            return
        }

        ipcRenderer.send('request-search-candidates')
    }

    const startIncrementalSearch = () => {
        searchPanel.style.display = 'block'
        searchInput.value = ''
        renderSearchResults('')
        searchInput.focus()
    }
    
    ipcRenderer.on('update-search-candidates', (event, candidates) => {
        searchCandidates.length = 0
        searchCandidates.push(...candidates)
        startIncrementalSearch()
    });

    searchButton.addEventListener('click', (event) => {
        toggleSearchPanel()
        eventHandled(event)
    })

    document.addEventListener('keydown', (event) => {
        const isFindShortcut = event.key && event.key.toLowerCase() === 'f' && (event.metaKey || event.ctrlKey)
        if (isFindShortcut) {
            toggleSearchPanel()
            eventHandled(event)
        }
    })

    searchInput.addEventListener('input', (event) => {
        renderSearchResults(event.target.value)
    })

    searchInput.addEventListener('keydown', (event) => {
        const { key } = event
        const links = getSearchResultLinks()

        if (key === 'ArrowDown' && links.length > 0) {
            event.preventDefault()
            const activeIndex = links.findIndex((link) => link === document.activeElement)
            if (activeIndex === -1) {
                focusSearchResultByIndex(0)
                return
            }
            if (activeIndex === links.length - 1) {
                searchInput.focus()
                return
            }
            focusSearchResultByIndex(activeIndex + 1)
            return
        }

        if (key === 'ArrowUp' && links.length > 0) {
            event.preventDefault()
            const activeIndex = links.findIndex((link) => link === document.activeElement)
            if (activeIndex === -1) {
                focusSearchResultByIndex(links.length - 1)
                return
            }
            if (activeIndex === 0) {
                searchInput.focus()
                return
            }
            focusSearchResultByIndex(activeIndex - 1)
            return
        }

        if (key !== 'Enter' || event.isComposing) {
            return
        }

        const filtered = filterCandidates(searchInput.value)

        if (document.activeElement && document.activeElement !== searchInput && document.activeElement.classList.contains('has-text-link')) {
            return
        }

        if (filtered.length === 1) {
            event.preventDefault()
            selectSearchItem(filtered[0])
        }
    })

    searchResults.addEventListener('keydown', (event) => {
        const links = getSearchResultLinks()
        const currentIndex = links.findIndex((link) => link === document.activeElement)

        if (event.key === 'ArrowDown' && links.length > 0) {
            event.preventDefault()
            if (currentIndex >= links.length - 1) {
                searchInput.focus()
                return
            }
            focusSearchResultByIndex(currentIndex === -1 ? 0 : currentIndex + 1)
        }

        if (event.key === 'ArrowUp' && links.length > 0) {
            event.preventDefault()
            if (currentIndex <= 0) {
                searchInput.focus()
                return
            }
            focusSearchResultByIndex(currentIndex - 1)
        }
    })

    document.addEventListener('click', (event) => {
        if (!searchPanel.contains(event.target) && event.target !== searchButton && !searchButton.contains(event.target)) {
            searchPanel.style.display = 'none'
        }
    })

    renderSearchResults('')

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
            return
        }
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

    const backlinksSection = document.getElementById('backlinks-section')
    const backlinksContainer = document.getElementById('backlinks')

    backlinksContainer.addEventListener('click', (e)=> {
        if (followLink(e))
            return;
    })

    const renderBacklinks = (backlinks) => {
        backlinksSection.style.display = 'block'
        backlinksContainer.innerHTML = ''

        if (!backlinks || backlinks.length === 0) {
            backlinksContainer.innerHTML = '<p class="has-text-grey">No backlinks found.</p>'
            return
        }

        const list = document.createElement('ul')
        list.className = 'menu-list'

        backlinks.forEach((item) => {
            const listItem = document.createElement('li')
            const link = document.createElement('a')
            link.className = 'wikilink has-text-link'
            link.href = item.path
            link.textContent = item.title
            listItem.appendChild(link)
            list.appendChild(listItem)
        })

        backlinksContainer.appendChild(list)
    }

    const requestBacklinks = (fname) => {
        if (!backlinksSection || !backlinksContainer) {
            return
        }

        backlinksSection.style.display = 'block'
        backlinksContainer.innerHTML = '<p class="has-text-grey">Loading backlinks…</p>'
        ipcRenderer.send('request-backlinks', fname)
    }

    ipcRenderer.on('update-backlinks', (event, backlinks) => {
        renderBacklinks(backlinks)
    })

    ipcRenderer.on('update-md', (event, fname, mtime, html, relativeDir, sibWikis) => {
        mdname = fname
        title.innerText = fname.substring(0, fname.length-3)
        dateElem.innerText = mtime
        viewRoot.innerHTML = html

        updateBread(relativeDir.split("/"), sibWikis)
        requestBacklinks(fname)
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