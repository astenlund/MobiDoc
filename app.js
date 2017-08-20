/* jshint esversion: 6 */

const express = require('express');
const pkg     = require('./package');
const sprintf = require('sprintf-js').sprintf;

const app = express();

app.get('/mobidoc/version', (req, res) => {
    console.log(sprintf('\n%s -> %s', req.hostname, req.url));
    res.send(pkg.version);
});

app.listen(3000, () => {
    console.log('Listening on port 3000...');
});
