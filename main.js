/* global process */

const express = require('express');
const ase = require('aws-serverless-express');
const nocache = require('nocache');

const redirect = (req, res) => {
    res.redirect('https://www.google.com');
};

const app = express();

app.use(nocache());
app.get('/', redirect);
app.get('/abc', (req, res) => res.send("hello!"));

if (process.env.IN_LAMBDA === 'true') {
    const server = ase.createServer(app, () => console.log('Server is listening'));

    exports.handler = async (event, context) => {
        try {
            return ase.proxy(server, event, context, 'PROMISE').promise;
        } catch (error) {
            console.debug('Internal server error:', error);
            return {
                statusCode: 500,
                body: 'Internal server error'
            };
        }
    };
} else {
    app.listen(5000, () => console.log('Listening on http://localhost:5000/'));
}
