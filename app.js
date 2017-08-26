/* jshint esversion: 6 */

const bluebird    = require('bluebird');
const express     = require('express');
const jsonParser  = require('body-parser').json();
const path        = require('path');
const pkg         = require('./package');
const promise     = require('promise');
const readability = require('node-readability');
const sprintf     = require('sprintf-js').sprintf;
const tmp         = require('tmp');

const exec = bluebird.promisify(require('child_process').exec);
const fs   = bluebird.promisifyAll(require('fs'));

const app = express();

app.post('/mobidoc/process', jsonParser, (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    let data = { url: req.body.url };
    parseUrl(data)
        .then(scrapeWebPage)
        .then(writeHtmlToDisk)
        .then(convertToMobi)
        .then(sendToKindle)
        .then(data => { console.log('Done'); return data; })
        .then(data => { res.send('Article processed: ' + data.title); })
        .catch(err => { console.error(err); res.sendStatus(500); });
});

app.get('/mobidoc/version', (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    res.send(pkg.version);
});

app.listen(3000, () => {
    console.log('Listening on port 3000...');
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

function tmpNameSync (ext) {
    return tmp.tmpNameSync({ template: 'XXXXXXXX' + ext });
}
