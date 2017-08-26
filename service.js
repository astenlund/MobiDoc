/* jshint esversion: 6 */

const path    = require('path');
const Service = require('node-windows').Service;

let svc = new Service({
    name: 'MobiDoc',
    description: 'Send web pages to Kindle with embedded Dotsies font.',
    script: path.join(__dirname, 'app.js')
});

svc.on('install', () => {
    svc.start();
});

let command = process.argv[2];

switch(command) {
    case 'install':
        svc.install();
        break;
    case 'start':
        svc.start();
        break;
    case 'stop':
        svc.stop();
        break;
    case 'uninstall':
        svc.uninstall();
        break;
    case undefined:
        console.error('No command given');
        break;
    default:
        console.error('Unrecognized command: ' + command);
}
