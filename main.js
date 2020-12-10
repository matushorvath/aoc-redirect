const express = require('express');
const ase = require('aws-serverless-express');
const aws = require('aws-sdk');
const nocache = require('nocache');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(nocache());

const db = new aws.DynamoDB({ apiVersion: '2012-08-10' });
const dbTable = 'aoc-redirect';

app.get('/:year/day/:day', async (req, res) => {
    if (!req.query.name) {
        res.status(400);
        res.send(`usage: https://${req.hostname}/2020/day/8?name=dedojozef`);
        return;
    }

    const params = {
        Item: {
            "day": { N: req.params.day },
            "name": { S: req.query.name },
            "ts": { N: `${Math.floor(Date.now() / 1000)}` },
            "uuid": { S: uuidv4() },
            "year": { N: req.params.year }
        },
        TableName: dbTable
    };
    await db.putItem(params).promise();

    res.redirect(`https://adventofcode.com/${req.params.year}/day/${req.params.day}`);
});

app.get('/data', async (req, res) => {
    const params = {
        TableName: dbTable
    };
    const data = await db.scan(params).promise();
    if (data.LastEvaluatedKey && data.LastEvaluatedKey !== '') {
        res.status(500);
        res.send('too many records in db, someone will have to implement paging');
        return;
    }

    const json = {};

    for (const item of data.Items) {
        if (!json[item.year.N]) {
            json[item.year.N] = {};
        }
        if (!json[item.year.N][item.day.N]) {
            json[item.year.N][item.day.N] = {};
        }
        if (!json[item.year.N][item.day.N][item.name.S]) {
            json[item.year.N][item.day.N][item.name.S] = [];
        }

        // Support ISO format strings in DB
        let ts;
        if (item.time) {
            ts = Math.floor(new Date(item.time.S).valueOf() / 1000);
        } else {
            ts = parseInt(item.ts.N, 10);
        }

        json[item.year.N][item.day.N][item.name.S].push(ts);
    }

    for (const y of Object.keys(json)) {
        for (const d of Object.keys(json[y])) {
            for (const n of Object.keys(json[y][d])) {
                json[y][d][n].sort();
            }
        }
    }

    res.send(json);
});

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
