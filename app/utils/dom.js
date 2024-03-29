export const getInternalLinks = () => {
    const linkElements = document.querySelectorAll('a');

    return [...linkElements].filter(linkElement => {
        const isLocal = linkElement.href.indexOf(window.location.origin) > -1;
        const isNotEmail = linkElement.href.indexOf('mailto') === -1;
        const isNotPhone = linkElement.href.indexOf('tel') === -1;
        const hRef = linkElement.getAttribute('href');
        const isAnchor = hRef ? hRef.startsWith('#') : false;
        return (isLocal && isNotPhone && isNotEmail && !isAnchor);
    });
};

export const imagesRendererObserver = (targetElement = document, selector = 'img') => {
    const images = [...targetElement.querySelectorAll(selector)].filter(image => image.getAttribute('loading') !== 'lazy');
    return Promise.all([...images].map(imageElement => (
        new Promise(resolve => {
            imageElement.onload = () => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        document.body.offsetWidth;
                        requestAnimationFrame(() => {
                            resolve();
                        })
                    })
                })
            }
            imageElement.onerror = () => resolve();
        })
    )));
};
