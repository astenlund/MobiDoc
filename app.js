/* jshint esversion: 6 */

const express     = require('express');
const jsonParser  = require('body-parser').json();
const pkg         = require('./package');
const readability = require('node-readability');
const sprintf     = require('sprintf-js').sprintf;

const app = express();

app.post('/mobidoc/process', jsonParser, (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));

    let url = req.body.url;

    if (!url) {
        console.log('ERROR: Unable to parse URL');
        console.log(req.body);
        return res.sendStatus(400);
    }

    readability(url, (err, article, meta) => {
        console.log('title: ' + article.title);
        article.close();
    });

    res.send();
});

app.get('/mobidoc/version', (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    res.send(pkg.version);
});

app.listen(3000, () => {
    console.log('Listening on port 3000...');
});
