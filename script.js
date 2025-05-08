document.addEventListener("DOMContentLoaded", () => {
    // Qui possiamo aggiungere codice JavaScript in futuro
    console.log("Pagina di presentazione caricata e script.js eseguito.");

    // --- Gestione Menu Mobile ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            // Cambia l'icona del burger menu (opzionale)
            const icon = mobileMenuButton.querySelector('svg path');
            if (mobileMenu.classList.contains('hidden')) {
                icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7'); // Icona burger
            } else {
                icon.setAttribute('d', 'M6 18L18 6M6 6l12 12'); // Icona X (chiusura)
            }
        });
    }

    // --- Highlighting Link Navbar Attivo ---
    const navLinksDesktop = document.querySelectorAll('header nav ul.hidden.md\\:flex a[href^="#"]'); // Link Desktop
    const navLinksMobile = document.querySelectorAll('#mobile-menu ul a[href^="#"]'); // Link Mobile
    const allNavLinks = [...navLinksDesktop, ...navLinksMobile]; // Combina i link

    const sections = document.querySelectorAll('main section[id]');
    const headerElement = document.querySelector('header');
    const headerHeight = headerElement ? headerElement.offsetHeight : 0;
    const offset = headerHeight + 20; // 20px di offset aggiuntivo

    function updateActiveLink() {
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
            // Applica lo stile anche se il link nel menu mobile è visibile
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active-nav-link');
            }
        });

        // Gestione del caso in cui nessuna sezione è attiva (es. in cima o in fondo)
        const isActiveLinkPresent = allNavLinks.some(link => link.classList.contains('active-nav-link'));
        if (!isActiveLinkPresent && allNavLinks.length > 0) {
            if (scrollPosition < sections[0].offsetTop - offset) {
                // Se sopra la prima sezione, o il primo link è per #hero, attivalo
                 if (allNavLinks[0].getAttribute('href') === '#hero') {
                    allNavLinks[0].classList.add('active-nav-link');
                }
            } else if (scrollPosition + window.innerHeight >= document.body.offsetHeight - 20) { // Vicino al fondo della pagina
                // Attiva l'ultimo link se siamo in fondo
                 const lastNavLink = allNavLinks[allNavLinks.length -1];
                 if(lastNavLink) lastNavLink.classList.add('active-nav-link');
            }
        }
    }

    // --- Effetto Fade-in per le sezioni allo scroll ---
    const fadeInSections = document.querySelectorAll('.fade-in-section');

    if ('IntersectionObserver' in window) {
        const sectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-visible');
                    observer.unobserve(entry.target); // Non osservare più una volta animato
                }
            });
        }, { rootMargin: "0px 0px -50px 0px" }); // Attiva un po' prima che la sezione sia completamente visibile

        fadeInSections.forEach(section => {
            sectionObserver.observe(section);
        });
    } else {
        // Fallback per browser più vecchi (rende tutto visibile subito)
        fadeInSections.forEach(section => {
            section.classList.add('fade-in-visible');
        });
    }

    // Ascolta lo scroll e il caricamento per l'highlighting dei link
    window.addEventListener('scroll', updateActiveLink);
    window.addEventListener('load', () => {
        updateActiveLink();
        // Assicura che le sezioni visibili al caricamento siano già "fade-in"
        // Questo è particolarmente utile se si ricarica la pagina a metà scroll
        fadeInSections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom >=0 && !section.classList.contains('fade-in-visible')) {
                section.classList.add('fade-in-visible');
                // Idealmente, se IntersectionObserver è supportato, non dovremmo fare nulla qui
                // perché l'observer dovrebbe gestirlo. Ma per sicurezza:
                if ('IntersectionObserver' in window) {
                    const obs = new IntersectionObserver(e => { if(e[0].isIntersecting) e[0].target.classList.add('fade-in-visible'); obs.unobserve(e[0].target);}, { rootMargin: "0px 0px -50px 0px" });
                    obs.observe(section);
                }
            }
        });
    });

    // Chiudi il menu mobile quando si clicca su un link
    if (mobileMenu) {
        const mobileNavLinks = mobileMenu.querySelectorAll('a[href^="#"]');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                // Ripristina l'icona del burger
                 if (mobileMenuButton) {
                    const icon = mobileMenuButton.querySelector('svg path');
                    icon.setAttribute('d', 'M4 6h16M4 12h16m-7 6h7');
                }
            });
        });
    }
}); 