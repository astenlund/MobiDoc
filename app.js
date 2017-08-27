/* jshint esversion: 6 */

const bluebird    = require('bluebird');
const express     = require('express');
const jsonParser  = require('body-parser').json();
const nconf       = require('nconf');
const path        = require('path');
const pkg         = require('./package');
const promise     = require('promise');
const readability = require('node-readability');
const sprintf     = require('sprintf-js').sprintf;
const tmp         = require('tmp');
const wget        = require('wget-improved');
const { JSDOM }   = require('jsdom');

const exec = bluebird.promisify(require('child_process').exec);
const fs   = bluebird.promisifyAll(require('fs'));

const app = express();

nconf.argv().file('./config.json');
nconf.defaults({ port: 3000 });

let port = nconf.get('port');

app.post('/mobidoc/process', jsonParser, (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    let data = { url: req.body.url };
    parseUrl(data)
        .then(scrapeWebPage)
        .then(downloadImages)
        .then(writeHtmlToDisk)
        .then(convertToMobi)
        .then(sendToKindle)
        .then(cleanup)
        .then(data => { console.log('Done'); return data; })
        .then(data => { res.send('Article processed: ' + data.title); })
        .catch(err => { console.error(err); res.sendStatus(500); });
});

app.get('/mobidoc/version', (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    res.send(pkg.version);
});

app.listen(port, () => {
    console.log(sprintf('Listening on port %u...', port));
});

function parseUrl (data) {
    return new Promise((resolve, reject) => {
        if (data.url) {
            resolve(data);
        } else {
            reject('Request body does not contain a URL');
        }
    });
}

function scrapeWebPage (data) {
    console.log('Scraping content from ' + data.url);
    return new Promise((resolve, reject) => {
        readability(data.url, (err, article, meta) => {
            if (err) {
                reject(err);
            } else if (!article || !article.title || !article.content) {
                reject('Could not parse article');
            } else {
                console.log('Found article: ' + article.title);
                data.title = article.title;
                data.content = article.content;
                article.close();
                resolve(data);
            }
        });
    });
}

function downloadImages (data) {
    data.imgFiles = [];
    console.log("Downloading images");
    let downloads = [];
    let doc = new JSDOM(data.content).window.document;
    doc.querySelectorAll('img').forEach(imgLmnt => {
        let imgSrc = imgLmnt.getAttribute('src');
        let imgExt = path.extname(imgSrc);
        let imgName = tmpNameSync(imgExt);
        let imgFile = path.join(tmp.tmpdir, imgName);
        imgLmnt.setAttribute('src', imgName);
        downloads.push(new Promise((resolve, reject) => {
            let download = wget.download(imgSrc, imgFile);
            download.on('error', (err) => {
                reject(err);
            });
            download.on('end', (output) => {
                resolve(output);
            });
        }));
        data.imgFiles.push(imgFile);
    });
    data.content = doc.documentElement.outerHTML;
    return Promise.all(downloads)
        .then(() => { return data; });
}

function writeHtmlToDisk (data) {
    data.htmlFile = path.join(tmp.tmpdir, tmpNameSync('.html'));
    console.log('Writing HTML content to disk: ' + data.htmlFile);
    return fs.writeFileAsync(data.htmlFile, data.content)
        .then(() => { return data; });
}

function convertToMobi (data) {
    data.mobiFile = data.htmlFile.replace(/\.html$/, '.mobi');
    console.log('Converting HTML to MOBI: ' + data.mobiFile);
    let format = 'ebook-convert.exe %s %s --title "%s" --mobi-file-type both --output-profile kindle_voyage --embed-font-family Dotsies';
    let command = sprintf(format, data.htmlFile, data.mobiFile, data.title);
    return exec(command)
        .then(() => { return data; });
}

function sendToKindle (data) {
    console.log('Sending MOBI to Kindle');
    return data;
}

function cleanup (data) {
    let files = data.imgFiles.concat(data.htmlFile).concat(data.mobiFile);
    console.log('Cleaning up: ' + files.map(file => { return path.basename(file); }).join(', '));
    return Promise.all(files.map(file => {
        return fs.unlinkAsync(file);
    })).then(() => { return data; });
}

function tmpNameSync (ext) {
    return tmp.tmpNameSync({ template: 'XXXXXXXX' + ext });
}
