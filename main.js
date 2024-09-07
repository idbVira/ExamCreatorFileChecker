const unzipper = require('unzipper');
const fs = require('fs');
const docs = fs.readdirSync('words');

fs.readdirSync('pic').forEach(file => {
    fs.renameSync('pic/' + file, 'pic/' + file.replace(/-/g, '_'));
});

function danger(msg) {
    console.log(`\x1b[31m%s\x1b[0m`, msg);
}

function info(msg) {
    console.log('\x1b[36m%s\x1b[0m', msg);
}

function extractTextFromWordXml(content) {
    return content.replace(/<\/w:p>/g, '\n').replace(/<.*?>/g, '');
}

function checkFileExist(filePath) {
    return fs.existsSync(filePath.replace('upload', 'pic'));
}

function checkImages(images) {
    images.forEach(image => {
        image = image.replace('+', '').trim();

        if (image.includes('،')) {
            const row = image.split('،');

            row.forEach(item => {
                if (item.trim().startsWith('upload'))
                    if (!checkFileExist(item.trim()))
                        danger(`File Not Exists: ${item}`)
            });

            return;
        }

        if (!checkFileExist(image.trim()))
            danger(`File Not Exists: ${image}`)
    })
}

function checkSyntax(content) {
    const regex = /\*\*(?<type>.*?)\*\*(?<body>.*?)\n\*\*\/.*?\*\*/sg;

    const types = {
        'space': 'sort',
        'join': 'join',
        'sort': 'shuffle',
        'description': 'descriptive',
        'test': 'checkbox',
        'true': 'trueFalse',
        'multiple': 'checkboxMulti',
        'testsingle': 'checkboxImg'
    };

    for (const match of content.matchAll(regex)) {
        const type = match.groups.type.trim();

        if (!types[type])
            danger('Wrong type: \n' + type)
    }
}

function verifyFile(content) {
    const images = content.match(/upload\/(?<image>.*)/mg);

    if (images !== null) {
        images.forEach(item => {
            if (item.includes('-'))
                danger(`Wrong option: ${item}`)
        });
        checkImages(images.filter(i => !i.includes('-')));
    }

    checkSyntax(content);
}

async function readZipFile(doc) {
    return new Promise(resolve => {
        fs.createReadStream('./words/' + doc)
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const fileName = entry.path;

                if (fileName === 'word/document.xml') {
                    let chunks = [];

                    entry.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    entry.on('end', () => {
                        verifyFile(extractTextFromWordXml(Buffer.concat(chunks).toString('utf-8')));
                        resolve();
                    });

                } else {
                    entry.autodrain();
                }
            })
    });
}

(async function () {
    for (const doc of docs) {
        info('Read: ' + './words/' + doc);
        await readZipFile(doc)
    }

    info('\nPress enter to exit...');
    process.stdin.read();
})();
