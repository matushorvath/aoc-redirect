const express = require('express');
const ase = require('aws-serverless-express');
const aws = require('aws-sdk');
const nocache = require('nocache');
const { v4: uuidv4 } = require('uuid');

const dbTable = 'aoc-redirect';

const usage = (req) => {
    return `usage: https://${req.hostname}/2020/day/8?part=1&name=dedojozef`;
};

const getYearDay = async (db, req, res) => {
    if (!req.params || !req.params.day || !req.params.year) {
        throw new Error('invalid request params');
    }

    if (!req.query || !req.query.name) {
        res.status(400).send(usage(req));
        return;
    }

    if (req.query.part && req.query.part !== '1' && req.query.part !== '2') {
        res.status(400).send(usage(req));
        return;
    }
    const part = req.query.part || '1';

    const params = {
        Item: {
            "day": { N: req.params.day },
            "name": { S: req.query.name },
            "ts": { N: `${Math.floor(Date.now() / 1000)}` },
            "uuid": { S: uuidv4() },
            "year": { N: req.params.year },
            "part": { N: part }
        },
        TableName: dbTable
    };
    await db.putItem(params).promise();

    if (!req.query.part) {
        res.redirect(`https://adventofcode.com/${req.params.year}/day/${req.params.day}`);
    } else {
        res.send('OK');
    }
};

exports.getYearDay = getYearDay;

const getData = async (db, req, res) => {
    const params = {
        TableName: dbTable
    };
    const data = await db.scan(params).promise();
    if (data.LastEvaluatedKey && data.LastEvaluatedKey !== '') {
        throw new Error('too many records in db, someone will have to implement paging');
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
            json[item.year.N][item.day.N][item.name.S] = {};
        }
        if (!json[item.year.N][item.day.N][item.name.S][item.part.N]) {
            json[item.year.N][item.day.N][item.name.S][item.part.N] = [];
        }

        const ts = parseInt(item.ts.N, 10);
        json[item.year.N][item.day.N][item.name.S][item.part.N].push(ts);
    }

    res.send(json);
};

exports.getData = getData;

const init = () => {
    const app = express();
    const db = new aws.DynamoDB({ apiVersion: '2012-08-10' });

    app.use(nocache());

    app.get('/:year/day/:day', async (req, res) => getYearDay(db, req, res));
    app.get('/data', async (req, res) => getData(db, req, res));
    app.get('/ping', async (req, res) => { res.status(200).send('pong'); });

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
};

if (!process.env.JEST_WORKER_ID) {
    init();
}
