// Global variables to manage windows and icons
let windows = [];
let zIndex = 10;
let activeWindow = null;
let isDragging = false;
let initialX, initialY, initialLeft, initialTop;

// Initialize the desktop when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up the clock
    updateClock();
    setInterval(updateClock, 60000);
    
    // Create sample desktop icons with correct image paths
    createDesktopIcon('My Blog Posts', 'images/folder.png', 50, 50);
    createDesktopIcon('About Me', 'images/notepad.png', 50, 150);
    createDesktopIcon('Projects', 'images/folder.png', 50, 250);
    createDesktopIcon('Contact', 'images/mail.png', 50, 350);
    
    // Add event listener for start button
    document.querySelector('.start-button').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleStartMenu();
    });
    
    // Click outside to close start menu
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.start-button') && !e.target.closest('.start-menu')) {
            closeStartMenu();
        }
    });

    // Initialize window resizing
    windows.forEach(win => makeWindowResizable(win.element));
});

// Function to update the clock
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    document.querySelector('.time').textContent = `${hours}:${minutes} ${ampm}`;
}

// Function to create desktop icons
function createDesktopIcon(name, iconSrc, left, top) {
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
    
    const img = document.createElement('img');
    img.className = 'icon-img';
    img.src = iconSrc;
    img.alt = name;
    
    const text = document.createElement('div');
    text.className = 'icon-text';
    text.textContent = name;
    
    icon.appendChild(img);
    icon.appendChild(text);
    
    // Add event listener for double-click to open window
    icon.addEventListener('dblclick', function() {
        createWindow(name);
    });
    
    // Make the icon draggable
    makeIconDraggable(icon);
    
    document.querySelector('.desktop').appendChild(icon);
    return icon;
}

// Function to create windows
function createWindow(title) {
    // First check if window already exists
    const existingWindow = windows.find(w => w.title === title);
    if (existingWindow) {
        // If window is minimized, restore it
        if (existingWindow.element.classList.contains('minimized')) {
            toggleMinimize(existingWindow);
        }
        // Set focus to the existing window
        setActiveWindow(existingWindow.element);
        return;
    }
    
    // Create new window
    const win = document.createElement('div');
    win.className = 'window';
    win.style.left = '150px';
    win.style.top = '100px';
    win.style.width = '500px';
    win.style.height = '400px';
    win.style.zIndex = ++zIndex;
    
    // Create window title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'window-title-bar';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'window-title';
    titleElement.textContent = title;
    
    const controls = document.createElement('div');
    controls.className = 'window-controls';
    
    // Minimize button
    const minimizeBtn = document.createElement('div');
    minimizeBtn.className = 'window-control minimize';
    minimizeBtn.innerHTML = '&#95;';
    minimizeBtn.addEventListener('click', function() {
        const windowObj = windows.find(w => w.element === win);
        toggleMinimize(windowObj);
    });
    
    // Maximize button
    const maximizeBtn = document.createElement('div');
    maximizeBtn.className = 'window-control maximize';
    maximizeBtn.innerHTML = '&#9744;';
    maximizeBtn.addEventListener('click', function() {
        win.classList.toggle('maximized');
        updateTaskbarButton(win, title);
    });
    
    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'window-control close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', function() {
        closeWindow(win);
    });
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(maximizeBtn);
    controls.appendChild(closeBtn);
    
    titleBar.appendChild(titleElement);
    titleBar.appendChild(controls);
    
    // Content area
    const content = document.createElement('div');
    content.className = 'window-content';
    
    // Add content based on window type
    populateWindowContent(content, title);
    
    win.appendChild(titleBar);
    win.appendChild(content);
    
    // Make window draggable by the title bar
    makeWindowDraggable(win, titleBar);
    
    // Make window focusable
    win.addEventListener('mousedown', function() {
        setActiveWindow(win);
    });
    
    // Make window resizable
    makeWindowResizable(win);
    
    document.querySelector('.desktop').appendChild(win);
    
    // Create taskbar button
    createTaskbarButton(win, title);
    
    // Add to windows array
    const windowObj = {
        element: win,
        title: title,
        taskbarButton: null // Will be set by createTaskbarButton
    };
    windows.push(windowObj);
    
    // Set as active window
    setActiveWindow(win);
    
    return win;
}


async function populateWindowContent(contentElement, title) {
    // A list of known non-post titles.
    const nonPostTitles = ['My Blog Posts', 'About Me', 'Projects', 'Project 1', 'Project 2', 'Contact'];

    // Check if the title is a blog post by exclusion
    if (!nonPostTitles.includes(title)) {
        // Assume it's a blog post. Generate file path from title.
        const filePath = `my blog posts/${title.toLowerCase().replace(/ /g, '-')}.html`;
        contentElement.innerHTML = `<p>Loading...</p>`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('Network response was not ok');
            const html = await response.text();
            contentElement.innerHTML = html;
        } catch (error) {
            console.error('Error fetching post:', error);
            contentElement.innerHTML = `<p>Error: Could not load post content.</p>`;
        }
        return; // Exit after handling the post
    }

    // Handle non-post windows
    switch (title) {
        case 'My Blog Posts':
            contentElement.innerHTML = `<h2>My Blog Posts</h2><div class="folder-contents"></div>`;
            const folderContents = contentElement.querySelector('.folder-contents');

            try {
                const response = await fetch('my blog posts/posts.json');
                if (!response.ok) throw new Error('Could not load posts.json');
                const posts = await response.json();

                posts.forEach(post => {
                    const fileElement = document.createElement('div');
                    fileElement.className = 'file';
                    fileElement.innerHTML = `
                        <img src="images/doc.png" alt="Document">
                        <div>${post.title}</div>
                    `;
                    fileElement.ondblclick = () => createWindow(post.title);
                    folderContents.appendChild(fileElement);
                });
            } catch (error) {
                console.error('Error loading posts:', error);
                folderContents.innerHTML = `<p>Error loading blog posts.</p>`;
            }
            break;
        case 'About Me':
            contentElement.innerHTML = `
                <h2>About Me</h2>
                <div class="about-content">
                    <img src="images/avatar.png" alt="Profile Picture" class="profile-pic">
                    <p>Hello! I am Dayhta. I'm a computer enthusiast/researcher. </p>
                    <p>General Skills:</p>
                    <ul>
                        <li>DevSecOps/AppSec</li>
                        <li>Malware Analysis</li>
                        <li>Threat Intelligence</li>
                        <li>Purple Teaming </li>
                        <li>System Administration</li>
                    </ul>
                    <p>Technical Skills:</p>
                    <ul>
                        <li>HTML/CSS</li>
                        <li>JavaScript</li>
                        <li>Python</li>
                        <li>Docker</li>
                        <li>Proxmox</li>
                        <li>Bash</li>
                        <li>Powershell</li>
                    </ul>
                </div>
            `;
            break;
        case 'Projects':
            contentElement.innerHTML = `
                <h2>My Projects</h2>
                <div class="folder-contents">
                    <div class="file" ondblclick="createWindow('Project 1')">
                        <img src="images/doc.png" alt="Document">
                        <div>Project 1</div>
                    </div>
                    <div class="file" ondblclick="createWindow('Project 2')">
                        <img src="images/doc.png" alt="Document">
                        <div>Project 2</div>
                    </div>
                </div>
            `;
            break;
        case 'Project 1':
            contentElement.innerHTML = `
                <h2>Project 1: Windows-Style Blog</h2>
                <p>This very website you're using right now! A blog designed to look like
                   a Windows 95/98 desktop.</p>
                <p>Technologies used:</p>
                <ul>
                    <li>HTML5</li>
                    <li>CSS3</li>
                    <li>Vanilla JavaScript</li>
                </ul>
            `;
            break;
        case 'Project 2':
            contentElement.innerHTML = `
                <h2>Project 2: Retro Game Collection</h2>
                <p>A collection of simple retro-style games implemented in HTML5 Canvas and JavaScript.</p>
                <p>Games included:</p>
                <ul>
                    <li>Snake</li>
                    <li>Pong</li>
                    <li>Tetris</li>
                    <li>Minesweeper</li>
                </ul>
            `;
            break;
        case 'Contact':
            contentElement.innerHTML = `
                <h2>Contact Me</h2>
                <form class="contact-form">
                    <div class="form-group">
                        <label for="name">Name:</label>
                        <input type="text" id="name" name="name">
                    </div>
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" name="email">
                    </div>
                    <div class="form-group">
                        <label for="message">Message:</label>
                        <textarea id="message" name="message" rows="5"></textarea>
                    </div>
                    <button type="button" onclick="alert('Message sent!')">Send</button>
                </form>
            `;
            break;
        default:
            contentElement.innerHTML = `<p>Content for ${title} window</p>`;
    }

    // Add styles for the window content
    const style = document.createElement('style');
    style.textContent = `
        .folder-contents { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px; }
        .file { display: flex; flex-direction: column; align-items: center; width: 80px; cursor: pointer; padding: 5px; }
        .file:hover { background-color: rgba(0, 0, 255, 0.1); }
        .file img { width: 32px; height: 32px; margin-bottom: 5px; }
        .file div { text-align: center; font-size: 12px; word-break: break-word; }
        .post-date { color: #666; font-style: italic; margin-bottom: 15px; }
        .about-content { display: flex; flex-direction: column; gap: 10px; }
        .profile-pic { width: 100px; height: 100px; border-radius: 50%; border: 2px solid #000080; align-self: center; margin-bottom: 10px; }
        .contact-form { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-weight: bold; }
        .form-group input, .form-group textarea { padding: 5px; border: 1px inset #dfdfdf; background-color: white; }
        button { padding: 5px 15px; background-color: #c0c0c0; border: 2px outset #dfdfdf; cursor: pointer; width: fit-content; }
        button:active { border: 2px inset #dfdfdf; }
    `;
    contentElement.appendChild(style);
}

// Function to create taskbar button for a window
function createTaskbarButton(win, title) {
    const taskbarPrograms = document.querySelector('.taskbar-programs');
    
    // Create taskbar programs container if it doesn't exist
    if (!taskbarPrograms) {
        const programs = document.createElement('div');
        programs.className = 'taskbar-programs';
        
        const taskbar = document.querySelector('.taskbar');
        taskbar.insertBefore(programs, taskbar.querySelector('.time'));
    }
    
    const button = document.createElement('div');
    button.className = 'taskbar-program';
    button.textContent = title;
    
    button.addEventListener('click', function() {
        const windowObj = windows.find(w => w.element === win);
        if (win.classList.contains('minimized')) {
            toggleMinimize(windowObj);
        } else if (activeWindow === win) {
            toggleMinimize(windowObj);
        } else {
            setActiveWindow(win);
        }
    });
    
    document.querySelector('.taskbar-programs').appendChild(button);
    
    // Update the window object with the taskbar button
    const windowObj = windows.find(w => w.element === win);
    if (windowObj) {
        windowObj.taskbarButton = button;
    }
    
    return button;
}

// Function to update taskbar button
function updateTaskbarButton(win, title) {
    const windowObj = windows.find(w => w.element === win);
    if (windowObj && windowObj.taskbarButton) {
        if (win.classList.contains('minimized')) {
            windowObj.taskbarButton.classList.remove('active');
        } else {
            windowObj.taskbarButton.classList.add('active');
        }
    }
}

// Function to toggle window minimize state
function toggleMinimize(windowObj) {
    if (!windowObj) return;
    
    const win = windowObj.element;
    win.classList.toggle('minimized');
    
    if (win.classList.contains('minimized')) {
        // If window was active, make nothing active
        if (activeWindow === win) {
            activeWindow = null;
        }
    } else {
        // Make window active when restoring
        setActiveWindow(win);
    }
    
    updateTaskbarButton(win, windowObj.title);
}

// Function to close a window
function closeWindow(win) {
    const windowIndex = windows.findIndex(w => w.element === win);
    if (windowIndex > -1) {
        const windowObj = windows[windowIndex];
        
        // Remove taskbar button
        if (windowObj.taskbarButton) {
            windowObj.taskbarButton.remove();
        }
        
        // Remove window element
        win.remove();
        
        // Remove from windows array
        windows.splice(windowIndex, 1);
        
        // If this was the active window, set active to the top-most window
        if (activeWindow === win) {
            activeWindow = null;
            const topWindow = findTopWindow();
            if (topWindow) {
                setActiveWindow(topWindow);
            }
        }
    }
}

// Function to find the top-most window
function findTopWindow() {
    let topWindow = null;
    let highestZ = -1;
    
    windows.forEach(windowObj => {
        const win = windowObj.element;
        if (!win.classList.contains('minimized')) {
            const z = parseInt(win.style.zIndex || 0);
            if (z > highestZ) {
                highestZ = z;
                topWindow = win;
            }
        }
    });
    
    return topWindow;
}

// Function to set the active window
function setActiveWindow(win) {
    // Deactivate previous active window
    if (activeWindow && activeWindow !== win) {
        activeWindow.style.zIndex = parseInt(activeWindow.style.zIndex);
        
        // Deactivate taskbar button
        const prevWindowObj = windows.find(w => w.element === activeWindow);
        if (prevWindowObj && prevWindowObj.taskbarButton) {
            prevWindowObj.taskbarButton.classList.remove('active');
        }
    }
    
    // Set new active window
    activeWindow = win;
    win.style.zIndex = ++zIndex;
    
    // Activate taskbar button
    const windowObj = windows.find(w => w.element === win);
    if (windowObj && windowObj.taskbarButton) {
        windowObj.taskbarButton.classList.add('active');
    }
}

// Function to make window draggable
function makeWindowDraggable(win, handle) {
    handle.addEventListener('mousedown', function(e) {
        // Skip if window is maximized
        if (win.classList.contains('maximized')) {
            return;
        }
        
        // Set active window
        setActiveWindow(win);
        
        // Start dragging
        isDragging = true;
        initialX = e.clientX;
        initialY = e.clientY;
        initialLeft = parseInt(win.style.left) || 0;
        initialTop = parseInt(win.style.top) || 0;
        
        // Add event listeners for drag and end
        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', stopDragging);
        
        // Prevent default behavior (like text selection)
        e.preventDefault();
    });
    
    function dragWindow(e) {
        if (isDragging) {
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            
            win.style.left = `${initialLeft + dx}px`;
            win.style.top = `${initialTop + dy}px`;
        }
    }
    
    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', dragWindow);
        document.removeEventListener('mouseup', stopDragging);
    }
}

// Function to make desktop icon draggable
function makeIconDraggable(icon) {
    let isDragging = false;
    let initialX, initialY, initialLeft, initialTop;

    icon.addEventListener('mousedown', function(e) {
        // Skip if it's a double-click
        if (e.detail > 1) return;
        
        // Start dragging
        isDragging = true;
        initialX = e.clientX;
        initialY = e.clientY;
        initialLeft = parseInt(icon.style.left) || 0;
        initialTop = parseInt(icon.style.top) || 0;
        
        // Add visual feedback
        icon.classList.add('dragging');
        
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
        
        e.preventDefault();
    });

    function handleDrag(e) {
        if (!isDragging) return;

        const dx = e.clientX - initialX;
        const dy = e.clientY - initialY;
        
        // Calculate new position
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        
        // Get desktop boundaries
        const desktop = document.querySelector('.desktop');
        const desktopRect = desktop.getBoundingClientRect();
        const iconRect = icon.getBoundingClientRect();
        
        // Constrain to desktop boundaries
        newLeft = Math.max(0, Math.min(newLeft, desktopRect.width - iconRect.width));
        newTop = Math.max(0, Math.min(newTop, desktopRect.height - iconRect.height));
        
        icon.style.left = `${newLeft}px`;
        icon.style.top = `${newTop}px`;
    }

    function handleDragEnd() {
        isDragging = false;
        icon.classList.remove('dragging');
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        
        // Snap to grid (optional)
        const gridSize = 10;
        const left = parseInt(icon.style.left);
        const top = parseInt(icon.style.top);
        icon.style.left = `${Math.round(left / gridSize) * gridSize}px`;
        icon.style.top = `${Math.round(top / gridSize) * gridSize}px`;
    }
}

function toggleStartMenu() {
    const startMenu = document.querySelector('.start-menu');
    startMenu.classList.toggle('active');
}

// Function to close the start menu
function closeStartMenu() {
    const startMenu = document.querySelector('.start-menu');
    startMenu.classList.remove('active');
}

// Function to handle window resizing
function makeWindowResizable(win) {
    const resizers = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].map(dir => {
        const resizer = document.createElement('div');
        resizer.className = `resizer ${dir}`;
        win.appendChild(resizer);
        return resizer;
    });

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', function(e) {
            // Skip if window is maximized
            if (win.classList.contains('maximized')) {
                return;
            }
            
            // Set active window
            setActiveWindow(win);
            
            // Start resizing
            const direction = this.className.split(' ')[1];
            startResize(win, direction, e);
            
            // Prevent default behavior
            e.preventDefault();
        });
    });
    
    function startResize(win, direction, e) {
        // Initial window dimensions and position
        const initialRect = win.getBoundingClientRect();
        const initialWidth = initialRect.width;
        const initialHeight = initialRect.height;
        const initialLeft = parseInt(win.style.left) || 0;
        const initialTop = parseInt(win.style.top) || 0;
        
        // Initial mouse position
        const initialX = e.clientX;
        const initialY = e.clientY;
        
        // Add resize listeners
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        function resize(e) {
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            
            // Define minimum sizes
            const minWidth = 200;
            const minHeight = 150;
            
            // Apply resizing based on direction
            let newWidth = initialWidth;
            let newHeight = initialHeight;
            let newLeft = initialLeft;
            let newTop = initialTop;
            
            if (direction.includes('e')) {
                newWidth = Math.max(initialWidth + dx, minWidth);
            }
            if (direction.includes('w')) {
                newWidth = Math.max(initialWidth - dx, minWidth);
                newLeft = initialLeft + initialWidth - newWidth;
            }
            if (direction.includes('s')) {
                newHeight = Math.max(initialHeight + dy, minHeight);
            }
            if (direction.includes('n')) {
                newHeight = Math.max(initialHeight - dy, minHeight);
                newTop = initialTop + initialHeight - newHeight;
            }
            
            // Apply the new dimensions and position
            win.style.width = `${newWidth}px`;
            win.style.height = `${newHeight}px`;
            win.style.left = `${newLeft}px`;
            win.style.top = `${newTop}px`;
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    }
}

// Function to add a new program to the start menu
function addStartMenuItem(name, iconSrc, action) {
    const startMenu = document.querySelector('.start-menu');
    
    // Create menu item
    const menuItem = document.createElement('div');
    menuItem.className = 'start-menu-item';
    
    // Create icon
    const icon = document.createElement('img');
    icon.src = iconSrc;
    icon.alt = name;
    
    // Create text
    const text = document.createElement('span');
    text.textContent = name;
    
    // Add to menu item
    menuItem.appendChild(icon);
    menuItem.appendChild(text);
    
    // Add event listener
    menuItem.addEventListener('click', function() {
        closeStartMenu();
        action();
    });
    
    // Add to start menu
    startMenu.appendChild(menuItem);
    
    return menuItem;
}

// Function to create a context menu
function createContextMenu(x, y, items) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Add menu items
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        
        if (item.separator) {
            menuItem.className += ' separator';
        } else {
            menuItem.textContent = item.text;
            
            if (item.action) {
                menuItem.addEventListener('click', function() {
                    closeContextMenu();
                    item.action();
                });
            }
            
            if (item.disabled) {
                menuItem.className += ' disabled';
            }
        }
        
        menu.appendChild(menuItem);
    });
    
    // Add to desktop
    document.querySelector('.desktop').appendChild(menu);
    
    // Add click outside event to close
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 0);
    
    return menu;
}

// Function to close context menu
function closeContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) {
        menu.remove();
    }
    document.removeEventListener('click', closeContextMenu);
}

// Handle desktop context menu
document.querySelector('.desktop').addEventListener('contextmenu', function(e) {
    // Prevent default context menu
    e.preventDefault();
    
    // Create custom context menu
    createContextMenu(e.clientX, e.clientY, [
        { text: 'New', action: null },
        { text: 'Display Properties', action: null },
        { separator: true },
        { text: 'Refresh', action: () => location.reload() }
    ]);
});

// Create browser window
function createBrowserWindow(url) {
    const win = createWindow('Browser');
    const content = win.querySelector('.window-content');
    
    content.innerHTML = `
        <div class="browser-toolbar">
            <button class="browser-button back">←</button>
            <button class="browser-button forward">→</button>
            <button class="browser-button refresh">↻</button>
            <input type="text" class="browser-address" value="${url || 'https://'}">
            <button class="browser-button go">Go</button>
        </div>
        <div class="browser-content">
            <iframe src="${url || 'about:blank'}" frameborder="0"></iframe>
        </div>
    `;
    
    // Add event listeners for browser buttons
    const iframe = content.querySelector('iframe');
    const addressBar = content.querySelector('.browser-address');
    
    content.querySelector('.browser-button.back').addEventListener('click', () => {
        iframe.contentWindow.history.back();
    });
    
    content.querySelector('.browser-button.forward').addEventListener('click', () => {
        iframe.contentWindow.history.forward();
    });
    
    content.querySelector('.browser-button.refresh').addEventListener('click', () => {
        iframe.contentWindow.location.reload();
    });
    
    content.querySelector('.browser-button.go').addEventListener('click', () => {
        iframe.src = addressBar.value;
    });
    
    addressBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            iframe.src = addressBar.value;
        }
    });
    
    return win;
}

// Initialize the desktop once DOM is loaded
window.addEventListener('load', function() {
    // Add browser to start menu
    addStartMenuItem('Internet Browser', 'browser.png', function() {
        createBrowserWindow();
    });
    
    // Add notepad to start menu
    addStartMenuItem('Notepad', 'notepad.png', function() {
        createWindow('Notepad');
    });
    
    // Add settings to start menu
    addStartMenuItem('Settings', 'settings.png', function() {
        createWindow('Settings');
    });
    
    // Add shutdown option
    addStartMenuItem('Shut Down', 'shutdown.png', function() {
        if (confirm('Are you sure you want to shut down?')) {
            document.body.innerHTML = '<div class="shutdown">It is now safe to turn off your computer.</div>';
        }
    });
});