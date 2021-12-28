'use strict';

const { loadTimes, saveTime } = require('./times');

const explainError = (details) => {
    // TODO fill in the hostname
    return { details, usage: 'https://<hostname>/2020/day/8?part=1&name=dedojozef' };
};

class ResultError extends Error {
    constructor(status, message, data = {}) {
        super(message);
        this.status = status;
        this.message = message;
        this.body = { error: message, ...data };
    }
}

const getData = async () => {
    console.log('getData: start');

    const data = await loadTimes();

    console.log('getData: done');

    return { status: 200, body: data };
};

const getYearDay = async (event) => {
    console.log('getYearDay: start');

    const year = event.pathParameters?.year;
    const day = event.pathParameters?.day;
    const part = event.queryStringParameters?.part;
    const name = event.queryStringParameters?.name;

    if (!year || !day) {
        throw new Error('Invalid event parameters');
    }
    if (!name) {
        throw new ResultError(400, 'Bad Request', explainError(`Missing 'name' query parameter`));
    }
    if (part !== '1' && part !== '2') {
        throw new ResultError(400, 'Bad Request', explainError(`Missing or invalid 'part' query parameter`));
    }

    const ts = Math.floor(Date.now() / 1000);
    await saveTime(year, day, part, name, ts);

    console.log('getYearDay: done');

    return { status: 201 };
};

const makeResponse = (result) => {
    const contentTypeHeaders = result.body === undefined ? undefined : { 'Content-Type': 'application/json' };

    return {
        statusCode: result.status,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Expires: 0,
            Pragma: 'no-cache',
            'Surrogate-Control': 'no-store',
            ...contentTypeHeaders,
            ...result.headers
        },
        body: result.body === undefined ? undefined : JSON.stringify(result.body)
    };
};

const processEvent = async (event) => {
    if (event.resource === '/data') {
        if (event.httpMethod === 'GET') {
            return getData();
        }
        throw new ResultError(405, 'Method Not Allowed');
    }
    else if (event.resource === '/{year}/day/{day}') {
        if (event.httpMethod === 'GET') {
            return getYearDay(event);
        }
        throw new ResultError(405, 'Method Not Allowed');
    }
    throw new ResultError(403, 'Forbidden');
};

const handler = async (event) => {
    try {
        console.log('handler: start');
        const result = await processEvent(event);
        console.log('handler: data response');

        return makeResponse(result);
    } catch (error) {
        if (error instanceof ResultError) {
            console.log('handler: error response', error);
            return makeResponse(error);
        }

        console.log('handler: internal server error', error);
        return makeResponse(new ResultError(500, 'Internal Server Error'));
    }
};

exports.handler = handler;
