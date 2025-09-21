document.addEventListener("DOMContentLoaded", () => {
    console.log("Pagina di presentazione caricata e script.js eseguito.");

    // --- Variabili globali per lo stato originale della navbar ---
    let originalDesktopNavLinksLi = [];
    let desktopThemeSelectorLiGlobal = null;
    let originalMobileNavLinksLi = [];

    // --- Selezione Elementi per Switch Tema ---
    const themeStylesheet = document.getElementById('theme-stylesheet');
    const mainElement = document.querySelector('main'); 
    const bodyElement = document.body; 

    const themeDropdownButtonDesktop = document.getElementById('theme-dropdown-button-desktop');
    const themeDropdownMenuDesktop = document.getElementById('theme-dropdown-menu-desktop');
    // Seleziona tutti i pulsanti/link per cambiare tema, sia desktop che mobile
    const themeSelectButtons = document.querySelectorAll('a[data-theme]');

    // --- Popolamento stato iniziale Navbar ---
    const navDesktopUlInitial = document.querySelector('header nav ul.hidden.md\\:flex');
    if (navDesktopUlInitial) {
        const allLiDesktop = Array.from(navDesktopUlInitial.children);
        originalDesktopNavLinksLi = allLiDesktop.filter(li => li.querySelector('a[href^="#"]'));
        desktopThemeSelectorLiGlobal = allLiDesktop.find(li => li.querySelector('#theme-dropdown-button-desktop'));
    }

    const navMobileUlInitial = document.querySelector('#mobile-menu ul');
    if (navMobileUlInitial) {
        originalMobileNavLinksLi = Array.from(navMobileUlInitial.children).filter(li => li.querySelector('a[href^="#"]'));
    }
    // --- Fine Popolamento stato iniziale Navbar ---

    // --- Funzione Utility per Intersection Observer ---
    function createIntersectionObserver(targetSelector, threshold = 0.1, rootMargin = "0px 0px -50px 0px", visibleClass = "is-visible") {
        if ('IntersectionObserver' in window) {
            const elementsToObserve = document.querySelectorAll(targetSelector);
            if (elementsToObserve.length === 0) return null; // Nessun elemento da osservare

            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(visibleClass);
                        // Opzionale: smettere di osservare dopo la prima volta per performance
                        // Potremmo volerlo per animazioni che avvengono una sola volta.
                        // obs.unobserve(entry.target);
                    } else {
                        // Opzionale: rimuovere la classe se esce dal viewport, per animazioni ripetute
                        // Questo è utile se l'animazione deve ripartire ogni volta che l'elemento rientra
                        // entry.target.classList.remove(visibleClass);
                    }
                });
            }, { threshold: threshold, rootMargin: rootMargin });

            elementsToObserve.forEach(element => {
                observer.observe(element);
            });
            return observer; 
        } else {
            // Fallback per browser senza IntersectionObserver: rende tutto subito visibile
            document.querySelectorAll(targetSelector).forEach(element => {
                element.classList.add(visibleClass);
            });
            return null;
        }
    }

    // --- Funzioni di supporto per il tema ---
    function updateActiveThemeVisuals(themeName) {
        themeSelectButtons.forEach(btn => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active-theme-option'); // Es. per dare uno stile al tema attivo nel dropdown
                // Potresti aggiungere stili specifici qui, es. btn.style.fontWeight = 'bold';
            } else {
                btn.classList.remove('active-theme-option');
                // btn.style.fontWeight = 'normal';
            }
        });
    }

    // --- Funzione per Applicare il Tema e Caricare Contenuto --- 
    async function applyTheme(themeName) {
        if (!themeStylesheet || !mainElement || !bodyElement) {
            console.error('Elementi DOM necessari per lo switch del tema non trovati.');
            return;
        }

        console.log(`Applicazione tema: ${themeName}`);

        // 1. Cambia il foglio di stile CSS
        themeStylesheet.setAttribute('href', `themes/theme-${themeName}.css`);

        // 2. Aggiorna l'attributo data-* sul main e la classe sul body
        mainElement.dataset.currentTheme = themeName;
        bodyElement.classList.remove('theme-modern', 'theme-high-tech', 'theme-matrix', 'theme-aura'); // Rimuovi temi precedenti
        bodyElement.classList.add(`theme-${themeName}`); // Aggiungi tema corrente

        // 3. Aggiorna lo stato visivo dei pulsanti di selezione tema
        updateActiveThemeVisuals(themeName);

        // 4. Salva il tema selezionato nel localStorage
        try {
            localStorage.setItem('selectedUserProfileTheme', themeName);
        } catch (e) {
            console.warn('LocalStorage non disponibile o errore durante il salvataggio del tema:', e);
        }

        // 5. Carica dinamicamente il contenuto HTML per il tema
        try {
            const response = await fetch(`themes/${themeName}-content.html`);
            if (!response.ok) {
                console.error(`Errore nel caricare il contenuto del tema ${themeName}: ${response.statusText}`);
                // Potresti caricare un contenuto di fallback o mostrare un errore
                return;
            }
            const themeHtmlContent = await response.text();
            const parser = new DOMParser();
            const themeDoc = parser.parseFromString(themeHtmlContent, 'text/html');
            
            const themedSections = themeDoc.querySelectorAll('[data-theme-section-id]');
            const sectionOrderFromTheme = Array.from(themedSections).map(s => s.dataset.themeSectionId);

            // --- Riordino Navbar ---
            const navDesktopUl = document.querySelector('header nav ul.hidden.md\\:flex');
            const navMobileUl = document.querySelector('#mobile-menu ul');

            updateNavbarOrder(navDesktopUl, originalDesktopNavLinksLi, sectionOrderFromTheme, desktopThemeSelectorLiGlobal);
            updateNavbarOrder(navMobileUl, originalMobileNavLinksLi, sectionOrderFromTheme);
            // --- Fine Riordino Navbar ---

            themedSections.forEach(themedSection => {
                const sectionId = themedSection.dataset.themeSectionId;
                const targetSectionElement = document.getElementById(sectionId);
                if (targetSectionElement) {
                    // Rimuovi vecchie classi di visibilità prima di aggiornare innerHTML
                    targetSectionElement.querySelectorAll('.is-visible, .card-is-visible, .icon-is-visible, .entry-is-visible, .title-is-visible, .fade-in-visible').forEach(el => {
                        el.classList.remove('is-visible', 'card-is-visible', 'icon-is-visible', 'entry-is-visible', 'title-is-visible', 'fade-in-visible');
                    });
                    targetSectionElement.innerHTML = themedSection.innerHTML;
                } else {
                    console.warn(`Elemento target con ID '${sectionId}' non trovato nel DOM principale.`);
                }
            });

            // 6. Re-inizializza componenti/funzioni che dipendono dal DOM aggiornato
            initializePageComponents(); 

            // Gestione specifica per il tema Matrix (Digital Rain)
            if (themeName === 'matrix') {
                setupMatrixRain();
            } else {
                clearMatrixRain(); // Pulisce il canvas se si passa ad un altro tema
            }

        } catch (error) {
            console.error(`Errore durante il fetch o parsing del contenuto del tema ${themeName}:`, error);
        }
        console.log(`Tema ${themeName} applicato e contenuto caricato.`);
    }

    // --- Gestione Dropdown Tema Desktop ---
    if (themeDropdownButtonDesktop && themeDropdownMenuDesktop) {
        themeDropdownButtonDesktop.addEventListener('click', (event) => {
            event.stopPropagation(); // Impedisce al click di raggiungere document e chiudere subito il menu
            themeDropdownMenuDesktop.classList.toggle('hidden');
        });

        document.addEventListener('click', (event) => {
            if (!themeDropdownMenuDesktop.contains(event.target) && !themeDropdownButtonDesktop.contains(event.target)) {
                themeDropdownMenuDesktop.classList.add('hidden');
            }
        });
    }

    // --- Event Listener per i Pulsanti/Link di Selezione Tema (Desktop e Mobile) ---
    if (themeSelectButtons.length > 0) {
        themeSelectButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Previene il comportamento di default del link
                const selectedTheme = event.currentTarget.dataset.theme;
                if (selectedTheme) {
                    applyTheme(selectedTheme);
                    // Chiudi dropdown desktop se aperto
                    if (themeDropdownMenuDesktop) {
                        themeDropdownMenuDesktop.classList.add('hidden');
                    }
                    // Chiudi menu mobile e selettore temi mobile se il click proviene da un pulsante tema
                    // all'interno di #mobile-theme-selector e i menu sono effettivamente aperti.
                    if (event.currentTarget.closest('#mobile-theme-selector')) {
                        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                            mobileMenu.classList.add('hidden');
                        }
                        if (mobileThemeSelector && !mobileThemeSelector.classList.contains('hidden')) {
                            mobileThemeSelector.classList.add('hidden');
                        }
                        // Ripristina icona burger se necessario
                        if (mobileMenuButton) {
                            const icon = mobileMenuButton.querySelector('svg path');
                            icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7');
                        }
                    }
                }
            });
        });
    } else {
        console.warn('Nessun pulsante per lo switch del tema trovato con [data-theme].');
    }

    // --- Carica Tema Iniziale (da localStorage o default) ---
    function loadInitialTheme() {
        let initialTheme = 'modern'; // Tema di default
        try {
            const savedTheme = localStorage.getItem('selectedUserProfileTheme');
            // Valida i temi salvati
            if (savedTheme && (savedTheme === 'modern' || savedTheme === 'high-tech' || savedTheme === 'matrix' || savedTheme === 'aura')) { 
                initialTheme = savedTheme;
            }
        } catch (e) {
            console.warn('LocalStorage non disponibile o errore durante il recupero del tema:', e);
        }
        applyTheme(initialTheme); // Applica il tema iniziale e carica il contenuto
    }

    // --- Gestione Menu Mobile --- 
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileThemeSelector = document.getElementById('mobile-theme-selector'); // Seleziono anche il contenitore dei temi mobile

    if (mobileMenuButton && mobileMenu && mobileThemeSelector) { // Controllo che esista anche mobileThemeSelector
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileThemeSelector.classList.toggle('hidden'); // Mostra/nascondi anche il selettore temi
            const icon = mobileMenuButton.querySelector('svg path');
            if (mobileMenu.classList.contains('hidden')) {
                icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7'); 
            } else {
                icon.setAttribute('d', 'M6 18L18 6M6 6l12 12'); 
            }
        });
    }
    
    // Chiudi il menu mobile principale quando si clicca su un link di navigazione interno al menu
    if (mobileMenu) {
        const mobileNavLinks = mobileMenu.querySelectorAll('ul a[href^="#"]');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                if (mobileThemeSelector) mobileThemeSelector.classList.add('hidden'); // Nascondi anche il selettore temi
                if (mobileMenuButton) {
                    const icon = mobileMenuButton.querySelector('svg path');
                    icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7');
                }
            });
        });
    }

    // La logica per chiudere il menu quando si seleziona un tema da mobile è già gestita
    // nell'event listener di themeSelectButtons, che ora chiude #mobile-menu.
    // Dobbiamo solo assicurarci che #mobileThemeSelector venga nascosto anche lì.
    // Questa modifica è stata fatta nel precedente step dentro applyTheme, verificando event.currentTarget.closest('#mobile-menu')
    // e chiudendo mobileMenu. Ora, siccome mobileThemeSelector è visualizzato insieme a mobileMenu,
    // quando mobileMenu viene nascosto (da applyTheme o dal click su un nav link), anche mobileThemeSelector dovrebbe sparire
    // se la sua visibilità è legata a quella di mobileMenu tramite il toggle comune.

    // Assicuriamoci che il selettore temi mobile sia nascosto all'inizio
    if (mobileThemeSelector) {
        mobileThemeSelector.classList.add('hidden');
    }

    // --- Funzioni da richiamare dopo il caricamento del contenuto del tema ---
    let sections, allNavLinks, headerHeight, offset;
    // Array per tenere traccia degli observer attivi e disconnetterli se necessario
    let activeObservers = []; 

    function initializePageComponents() {
        // Disconnetti observer precedenti se esistono
        activeObservers.forEach(obs => obs && obs.disconnect());
        activeObservers = [];

        const navLinksDesktop = document.querySelectorAll('header nav ul.hidden.md\\:flex a[href^="#"]');
        const navLinksMobile = document.querySelectorAll('#mobile-menu ul a[href^="#"]');
        allNavLinks = [...navLinksDesktop, ...navLinksMobile];
        sections = document.querySelectorAll('main section[id]');
        const headerElement = document.querySelector('header');
        headerHeight = headerElement ? headerElement.offsetHeight : 0;
        offset = headerHeight + 20;

        updateActiveLink(); // Chiamata immediata per impostare lo stato iniziale

        // Setup Intersection Observers per le animazioni
        // Manteniamo fade-in-section per le sezioni principali che usano questa classe per un fade generico
        activeObservers.push(createIntersectionObserver('.fade-in-section', 0.1, "0px 0px -50px 0px", 'fade-in-visible'));
        
        // Per le card dei progetti
        activeObservers.push(createIntersectionObserver('.progetto-card', 0.1, "0px 0px -80px 0px", 'card-is-visible'));
        
        // Per le icone tech nella sezione competenze
        activeObservers.push(createIntersectionObserver('.tech-icon', 0.3, "0px 0px -50px 0px", 'icon-is-visible')); 
        
        // Per gli elementi della timeline nella sezione esperienza e formazione
        activeObservers.push(createIntersectionObserver('.timeline-hightech-entry', 0.15, "0px 0px -70px 0px", 'entry-is-visible'));
        
        // Per i titoli delle sezioni (se hanno la classe .section-title-anim)
        activeObservers.push(createIntersectionObserver('.section-title-anim', 0.2, "0px 0px -60px 0px", 'title-is-visible'));
        
        // Observer per attivare le icone nella Hero Section
        // Seleziona la hero section e aggiunge una classe quando è visibile
        const heroSectionElement = document.querySelector('.hero-section');
        if (heroSectionElement) {
            const heroObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('hero-icons-active');
                        // Potrebbe essere utile disconnettere l'observer se l'animazione deve avvenire solo una volta
                        // heroObserver.unobserve(entry.target);
                    } else {
                        // Opzionale: rimuovi la classe se vuoi che l'animazione si ripeta ogni volta
                        // entry.target.classList.remove('hero-icons-active'); 
                    }
                });
            }, { threshold: 0.5, rootMargin: "0px" }); // Attiva quando il 50% della hero è visibile
            heroObserver.observe(heroSectionElement);
            activeObservers.push(heroObserver); 
        }

        // Per le card competenze (se non usano già .fade-in-section e necessitano di animazione diversa)
        // Se le card competenze sono già dentro un .fade-in-section, potrebbero non aver bisogno di un observer dedicato
        // unless they have a more complex staggered animation.
        // Per ora, assumiamo che .cosa-faccio-section .p-6 (le card competenze originali) potrebbero animarsi.
        // Se hanno già .fade-in-section come genitore, questo potrebbe essere ridondante o per affinare.
        // activeObservers.push(createIntersectionObserver('.theme-high-tech .cosa-faccio-section .p-6', 0.1, "0px 0px -60px 0px", 'competenza-card-is-visible'));
    }

    function updateActiveLink() {
        if (!sections || sections.length === 0) return; // Nessuna sezione da controllare

        let currentSectionId = '';
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - offset;
            const sectionBottom = sectionTop + section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                currentSectionId = section.getAttribute('id');
            }
        });

        allNavLinks.forEach(link => {
            link.classList.remove('active-nav-link');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active-nav-link');
            }
        });

        const isActiveLinkPresent = allNavLinks.some(link => link.classList.contains('active-nav-link'));
        if (!isActiveLinkPresent && allNavLinks.length > 0 && sections.length > 0) {
            if (scrollPosition < sections[0].offsetTop - offset) {
                if (allNavLinks[0].getAttribute('href') === '#hero') {
                    allNavLinks[0].classList.add('active-nav-link');
                }
            } else if (scrollPosition + window.innerHeight >= document.body.offsetHeight - 20) { 
                const lastNavLink = allNavLinks.find(link => link.getAttribute('href') === `#${sections[sections.length - 1].id}`);
                if(lastNavLink) lastNavLink.classList.add('active-nav-link');
            }
        }
    }

    // Ascolta lo scroll per l'highlighting dei link
    window.addEventListener('scroll', updateActiveLink);
    
    // Caricamento iniziale del tema e dei componenti
    loadInitialTheme(); 

    window.addEventListener('resize', () => {
        const headerElement = document.querySelector('header'); // Recupera headerElement qui
        if (headerElement) headerHeight = headerElement.offsetHeight;
        offset = headerHeight + 20; // headerHeight sarà 0 se headerElement non è trovato, gestendo il caso
        updateActiveLink();
    });

    // --- Funzione per Digital Rain (Tema Matrix) ---
    let matrixRainInterval = null;
    function setupMatrixRain() {
        const canvas = document.getElementById('matrix-rain-hero');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight; // O l'altezza della hero section se preferisci

        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｦｲｸｺｿﾁﾄﾉﾌﾔﾖﾙﾚﾛﾝ';
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = Array(columns).fill(1);

        function drawMatrix() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'; // Sfondo leggermente trasparente per effetto scia
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00FF41'; // Colore caratteri Matrix
            ctx.font = `${fontSize}px Courier New`;

            for (let i = 0; i < drops.length; i++) {
                const text = letters[Math.floor(Math.random() * letters.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0; // Resetta la goccia casualmente per un effetto più vario
                }
                drops[i]++;
            }
        }

        if (matrixRainInterval) clearInterval(matrixRainInterval);
        matrixRainInterval = setInterval(drawMatrix, 40); // Aumentato intervallo per fluidità

        // Riadatta il canvas al resize della finestra
        window.addEventListener('resize', () => {
            if (document.body.classList.contains('theme-matrix')) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight; // O altezza hero section
                // Bisogna ricalcolare columns e resettare drops se si vuole che sia perfetto al resize
                // Per ora, semplice ridimensionamento.
            }
        });
    }

    function clearMatrixRain() {
        if (matrixRainInterval) {
            clearInterval(matrixRainInterval);
            matrixRainInterval = null;
        }
        const canvas = document.getElementById('matrix-rain-hero');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // --- Funzione per Riordinare Elementi Navbar ---
    function updateNavbarOrder(navUl, originalLinkItems, sectionOrder, specialLiElement = null) {
        if (!navUl) return;

        const itemsToShow = [];
        if (originalLinkItems && sectionOrder) {
            sectionOrder.forEach(sectionId => {
                const navItemLi = originalLinkItems.find(li => {
                    const link = li.querySelector('a');
                    return link && link.getAttribute('href') === `#${sectionId}`;
                });
                if (navItemLi) {
                    itemsToShow.push(navItemLi.cloneNode(true)); // Clona i link di navigazione
                }
            });
        }

        // Stacca lo specialLiElement (es. dropdown tema desktop) se è figlio di navUl
        let detachedSpecialLi = null;
        if (specialLiElement && specialLiElement.parentElement === navUl) {
            detachedSpecialLi = specialLiElement; // Non clonare, usa l'originale
            navUl.removeChild(specialLiElement);
        }

        // Svuota la navbar attuale dagli altri figli (vecchi link di navigazione)
        while (navUl.firstChild) {
            navUl.removeChild(navUl.firstChild);
        }

        // Aggiungi gli item link riordinati
        itemsToShow.forEach(item => {
            navUl.appendChild(item);
        });

        // Ri-aggiungi lo specialLiElement (originale, non clonato) se esisteva
        if (detachedSpecialLi) {
            navUl.appendChild(detachedSpecialLi);
        } else if (specialLiElement && !itemsToShow.some(i => i.isEqualNode(specialLiElement))) { 
            // Fallback se non era figlio ma deve essere aggiunto (e non è già tra gli itemsToShow)
            // Questo caso è meno probabile con la logica attuale di detachedSpecialLi
            navUl.appendChild(specialLiElement);
        }
    }
    // --- Fine Funzione Riordino Navbar ---
});
