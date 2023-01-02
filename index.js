require('dotenv').config();

// OFFLINE STUFF
const IS_OFFLINE = false;
const WORKS = require('./model/works');
const COMMON = require('./model/common');
const FOOTER = require('./model/footer');
const ABOUT = require('./model/about');

const express = require('express');
const { createClient } = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS, INLINES } = require('@contentful/rich-text-types');

const app = express();
const path = require('path');

const port = 8080;

const log = data => console.log(JSON.stringify(data, null, 2));

const initCMS = () => createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

const getCommon = async CMS => {
    const common = await CMS.getEntry('5cKjWZGhvzmSnnLK8Npv96');

    return {
        common: common.fields,
    };
};

const handleWysiwyg = data => {
    if (typeof data === 'string') return data;
    return documentToHtmlString(data, {
        renderNode: {
            [BLOCKS.PARAGRAPH]: (node, next) =>
                `${ next(node.content) }`,
            [INLINES.HYPERLINK]: (node, next) =>
                `<a href="${ node.data.uri }" target="_blank" rel="noopener noreferrer" class="ui-hyperlink">${ next(node.content) }</a>`,
        },
    });
};

const handleColorName = col => {
    const [color] = col;
    if (color === 'Beige') return 'beige';
    if (color === 'Bleu ciel') return 'lightblue';
    if (color === 'Bleu électrique') return 'blue';
    if (color === 'Vert') return 'green';
    if (color === 'Vert clair') return 'lightgreen';
    if (color === 'Rose pale') return 'rose';
    if (color === 'Orange') return 'orange';
    return 'beige';
};

const handleLinkResolver = content => {
    if (content.sys.contentType.sys.id === 'work') {
        return `/project/${ content.fields.slug }`;
    }

    if (content.sys.contentType.sys.id === 'contact') {
        return '/about';
    }

    if (content.sys.contentType.sys.id === 'home') {
        return '/';
    }

    return '/';
};

const handleMail = links => links.find(link => link.key === 'mail');

const handleFormat = format => {
    if (format === 'Carré') return 'square';
    if (format === 'Horizontal') return 'horizontal';
    if (format === 'Vertical') return 'vertical';
    return 'square';
};

const handleAlignment = alignment => {
    if (alignment === 'Gauche') return 'alignLeft';
    if (alignment === 'Centre') return 'alignCenter';
    return 'alignCenter';
};

const handleWorksRows = works => {
    return works.reduce((prev, curr, index) => (index % 2 === 0 ? prev.push([curr])
        : prev[prev.length - 1].push(curr)) && prev, []);
};

const handleYear = date => new Date(date).getFullYear();

const handleBubbleImages = bubbleImages => bubbleImages.map(image => image.fields.file.url);

const handleOffline = (path, res) => {
    if (path === '/') {
        res.render('pages/home', {
            common: COMMON,
            homePage: {
                baseline: 'interactive&<br>brand designer',
                bubbleImages: [
                    {
                        fields: {
                            file: {
                                url: 'images/bubble-01.png',
                            },
                        },
                    },
                    {
                        fields: {
                            file: {
                                url: 'images/bubble-02.png',
                            },
                        },
                    },
                    {
                        fields: {
                            file: {
                                url: 'images/bubble-03.png',
                            },
                        },
                    },
                ],
                works: WORKS,
            },
            footer: FOOTER,
        });
    }
    else if (path === '/about') {
        res.render('pages/about', {
            common: COMMON,
            about: ABOUT,
        })
    }
};

app.use((req, res, next) => {
    res.locals.getWysiwyg = handleWysiwyg;
    res.locals.getColorName = handleColorName;
    res.locals.getLinkUrl = handleLinkResolver;
    res.locals.getMail = handleMail;
    res.locals.getFormat = handleFormat;
    res.locals.getAlignment = handleAlignment;
    res.locals.getWorksRows = handleWorksRows;
    res.locals.getYear = handleYear;
    res.locals.getBubbleImages = handleBubbleImages;

    next();
});
app.use(express.static(path.join(__dirname, 'dist')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', async (req, res) => {
    if (IS_OFFLINE) handleOffline('/', res);

    const CMS = await initCMS();
    const common = await getCommon(CMS);
    const homePage = await CMS.getEntry('3MspXo6cNqu83f6mwIBXWD');
    const footer = await CMS.getEntry('2nsk60KEJQkGM7SFWFfpfQ');

    res.render('pages/home', {
        ...common,
        homePage: homePage.fields,
        footer: footer.fields,
    });
});

app.get('/ui', (req, res) => {
    res.render('pages/ui');
});

app.get('/projects', async (req, res) => {
    const CMS = await initCMS();
    const common = await getCommon(CMS);
    const projectsPage = await CMS.getEntry('19D81NneK510sD1PAjAVNS');
    const footer = await CMS.getEntry('2nsk60KEJQkGM7SFWFfpfQ');

    res.render('pages/projects', {
        ...common,
        projectsPage: projectsPage.fields,
        footer: footer.fields,
    });
});

app.get('/project/:uid', async (req, res) => {
    const CMS = await initCMS();
    const common = await getCommon(CMS);

    const { items: [work] } = await CMS.getEntries({
        content_type: 'work',
        'fields.slug': req.params.uid,
        limit: 1,
    });

    const currentWorkDate = work.fields.date;
    const currentWorkSlug = work.fields.slug;

    let nextWork = await CMS.getEntries({
        content_type: 'work',
        'fields.date[gte]': currentWorkDate,
        'fields.slug[nin]': currentWorkSlug,
        order: 'fields.date',
        limit: 1,
    })

    if (nextWork.total === 0) {
        nextWork = await CMS.getEntries({
            content_type: 'work',
            order: 'fields.date',
            limit: 1,
        });
    }
    [nextWork] = nextWork.items;

    res.render('pages/project', {
        ...common,
        ...work.fields,
        tags: work.metadata.tags,
        nextWork: nextWork,
    });
});

app.get('/about', async (req, res) => {
    if (IS_OFFLINE) handleOffline('/about', res);

    const CMS = await initCMS();
    const common = await getCommon(CMS);
    const aboutPage = await CMS.getEntry('22bMbG3m1LHKFEjZmUZjv1');

    res.render('pages/about', {
        ...common,
        aboutPage: aboutPage.fields,
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${ port }`);
});

module.exports = app;
