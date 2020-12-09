/* global process */

const express = require('express');
const ase = require('aws-serverless-express');
const aws = require('aws-sdk');
const nocache = require('nocache');
const { v4: uuidv4 } = require('uuid');

const db = new aws.DynamoDB({ apiVersion: '2012-08-10' });
const dbTable = 'aoc-redirect';

const redirect = async (req, res) => {
    if (!req.query.name) {
        res.status(400);
        res.send(`usage: https://${req.hostname}/2020/day/8?name=dedojozef`);
        return;
    }

    const params = {
        Item: {
            "day": { S: req.params.day },
            "name": { S: req.query.name },
            "time": { S: new Date().toISOString() },
            "uuid": { S: uuidv4() },
            "year": { N: req.params.year }
        },
        TableName: dbTable
    };
    await db.putItem(params).promise();

    res.redirect(`https://adventofcode.com/${req.params.year}/day/${req.params.day}`);
};

const app = express();

app.use(nocache());
app.get('/:year/day/:day', redirect);
app.get('/data', (req, res) => res.send("hello!"));

if (process.env.AWS_EXECUTION_ENV) {
    const server = ase.createServer(app, () => console.log('Server is listening'));

    exports.handler = async (event, context) => {
        try {
            return await ase.proxy(server, event, context, 'PROMISE').promise;
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
