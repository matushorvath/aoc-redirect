'use strict';

const { handler } = require('../src/lambda');

const times = require('../src/times');
jest.mock('../src/times');

beforeEach(() => {
    times.loadTimes.mockReset();
    times.saveTime.mockReset();
});

describe('API Gateway handler', () => {
    test('returns correct headers with errors', async () => {
        const event = { resource: '/uNkNoWn', httpMethod: 'iNvAlId' };
        await expect(handler(event)).resolves.toMatchObject({
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                Expires: 0,
                Pragma: 'no-cache',
                'Surrogate-Control': 'no-store',
                'Content-Type': 'application/json'
            }
        });

        expect(times.loadTimes).not.toHaveBeenCalled();
        expect(times.saveTime).not.toHaveBeenCalled();
    });

    test('rejects unknown resource path', async () => {
        const event = { resource: '/uNkNoWn', httpMethod: 'GET' };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 403 });

        expect(times.loadTimes).not.toHaveBeenCalled();
        expect(times.saveTime).not.toHaveBeenCalled();
    });

    test.each(['/data', '/{year}/day/{day}'])('rejects unknown method for %s', async (resource) => {
        const event = { resource, httpMethod: 'POST' };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 405 });

        expect(times.loadTimes).not.toHaveBeenCalled();
        expect(times.saveTime).not.toHaveBeenCalled();
    });
});

describe('GET /{year}/day/{day}', () => {
    test.each([
        ['missing params', {}],
        ['empty params', { pathParameters: {} }],
        ['missing day', { pathParameters: { year: 1848 } }],
        ['missing year', { pathParameters: { day: 42 } }]
    ])('fails with %s', async (description, pathParametersPart) => {
        const event = {
            resource: '/{year}/day/{day}',
            httpMethod: 'GET',
            ...pathParametersPart,
            queryStringParameters: { name: 'dEdOjOzEf', part: 1 }
        };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 500 });

        expect(times.saveTime).not.toHaveBeenCalled();
    });

    test.each([
        ['missing query', {}],
        ['empty query', { queryStringParameters: {} }],
        ['missing name', { queryStringParameters: { part: '1' } }],
        ['missing part', { queryStringParameters: { name: 'dEdOjOzEf' } }],
        ['invalid part', { queryStringParameters: { name: 'dEdOjOzEf', part: '3' } }]
    ])('GET /{year}/day/{day} fails with %s', async (description, queryStringParametersPart) => {
        const event = {
            resource: '/{year}/day/{day}',
            httpMethod: 'GET',
            pathParameters: { day: 42, year: 1848 },
            ...queryStringParametersPart
        };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 400 });

        expect(times.saveTime).not.toHaveBeenCalled();
    });

    test.each(['1', '2'])('works with name and part %s', async (part) => {
        const event = {
            resource: '/{year}/day/{day}',
            httpMethod: 'GET',
            pathParameters: { day: '42', year: '1848' },
            queryStringParameters: { part, name: 'dEdOjOzEf' }
        };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 201 });

        expect(times.saveTime).toBeCalledWith('1848', '42', part, 'dEdOjOzEf', expect.any(Number));
    });
});

describe('GET /data', () => {
    test('returns a json', async () => {
        times.loadTimes.mockResolvedValueOnce({ sOmEdAtA: true });

        const event = { resource: '/data', httpMethod: 'GET' };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 200, body: '{"sOmEdAtA":true}' });

        expect(times.loadTimes).toBeCalledWith();
    });

    test('returns a json that will be shortened in log', async () => {
        const json = { sOmEdAtA: [...new Array(100)].map((_, i) => i) };
        times.loadTimes.mockResolvedValueOnce(json);

        const event = { resource: '/data', httpMethod: 'GET' };
        await expect(handler(event)).resolves.toMatchObject({ statusCode: 200, body: JSON.stringify(json) });

        expect(times.loadTimes).toBeCalledWith();
    });
});
