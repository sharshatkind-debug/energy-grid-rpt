import cds from '@sap/cds';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cds.on('bootstrap', (app) => {
    // Serve the custom control center UI
    app.use('/control-center', express.static(path.join(__dirname, '../app')));

    // Redirect root to control center
    app.get('/', (req, res, next) => {
        if (req.headers.accept?.includes('text/html')) {
            res.redirect('/control-center/control-center.html');
        } else {
            next();
        }
    });
});

export default cds.server;
