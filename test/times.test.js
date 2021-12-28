const main = require('./main');

describe('getYearDay', () => {
    const res = {
        redirect: jest.fn(),
        send: jest.fn(),
        status: jest.fn()
    };
    res.redirect.mockReturnValue(res);
    res.send.mockReturnValue(res);
    res.status.mockReturnValue(res);

    const db = {
        putItem: jest.fn()
    };

    beforeEach(() => {
        res.redirect.mockClear();
        res.send.mockClear();
        res.status.mockClear();
        db.putItem.mockReset();
    });

    test.each([
        ['missing params', {}],
        ['empty params', { params: {} }],
        ['missing day', { params: { year: 1848 } }],
        ['missing year', { params: { day: 42 } }]
    ])('fails with %s', async (description, paramsPart) => {
        const req = {
            ...paramsPart,
            query: { name: 'dEdOjOzEf' }
        };
        await expect(main.getYearDay(db, req, res)).rejects.toMatchObject({ message: 'invalid request params' });

        expect(res.send).not.toBeCalled();
        expect(db.putItem).not.toBeCalled();
    });

    test.each([
        ['missing query', {}],
        ['empty query', { query: {} }],
        ['missing name', { query: { part: '1' } }],
        ['invalid part', { query: { name: 'dEdOjOzEf', part: '3' } }]
    ])('fails with %s', async (description, queryPart) => {
        const req = {
            params: { day: 42, year: 1848 },
            ...queryPart
        };
        await expect(main.getYearDay(db, req, res)).resolves.toBe(undefined);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith(expect.stringMatching(/^usage:/));
        expect(db.putItem).not.toBeCalled();
    });

    test('works with name and default part', async () => {
        const req = {
            params: { day: 42, year: 1848 },
            query: { name: 'dEdOjOzEf' }
        };
        await expect(main.getYearDay(db, req, res)).resolves.toBe(undefined);

        expect(db.putItem).toBeCalledWith(expect.objectContaining({
            Item: {
                "day": { N: req.params.day },
                "name": { S: req.query.name },
                "ts": { N: expect.stringMatching(/^\d{10}$/) },
                "uuid": { S: expect.stringMatching(/^[0-9a-g-]{36}$/) },
                "year": { N: req.params.year },
                "part": { N: '1' }
            },
            TableName: 'aoc-redirect'
        }));

        expect(res.redirect).toBeCalledWith(expect.stringMatching(/https:\/\/adventofcode\.com/));
    });

    test.each(['1', '2'])('works with name and part %s', async (part) => {
        const req = {
            params: { day: 42, year: 1848 },
            query: { part, name: 'dEdOjOzEf' }
        };
        await expect(main.getYearDay(db, req, res)).resolves.toBe(undefined);

        expect(db.putItem).toBeCalledWith(expect.objectContaining({
            Item: {
                "day": { N: req.params.day },
                "name": { S: req.query.name },
                "ts": { N: expect.stringMatching(/^\d{10}$/) },
                "uuid": { S: expect.stringMatching(/^[0-9a-g-]{36}$/) },
                "year": { N: req.params.year },
                "part": { N: req.query.part }
            },
            TableName: 'aoc-redirect'
        }));
        expect(res.send).toBeCalledWith('OK');
    });
});

describe('getData', () => {
    const res = {
        send: jest.fn(),
        status: jest.fn()
    };
    res.send.mockReturnValue(res);
    res.status.mockReturnValue(res);

    const db = {
        scan: jest.fn()
    };

    beforeEach(() => {
        res.send.mockClear();
        res.status.mockClear();
        db.scan.mockReset();
    });

    test('works with no data', async () => {
        db.scan.mockReturnValueOnce({
            Items: []
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });
        expect(res.send).toBeCalledWith({});
    });

    test('fails with too much data', async () => {
        db.scan.mockReturnValueOnce({
            LastEvaluatedKey: 'key'
        });

        await expect(main.getData(db, undefined, res)).rejects.toMatchObject({
            message: expect.stringMatching(/^too many records/)
        });

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });
        expect(res.send).not.toBeCalled();
    });

    test('works with one data point', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                42: {
                    'dEdOjOzEf': {
                        2: [975318642]
                    }
                }
            }
        });
    });

    test('works with two years', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '45' },
                name: { S: 'fErOmRkViCkA' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '951840' },
                part: { N: '1' }
            }, {
                year: { N: '1843' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                45: {
                    'fErOmRkViCkA': {
                        1: [951840]
                    }
                }
            },
            1843: {
                42: {
                    'dEdOjOzEf': {
                        2: [975318642]
                    }
                }
            }
        });
    });

    test('works with two days in one year', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '45' },
                name: { S: 'fErOmRkViCkA' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '951840' },
                part: { N: '1' }
            }, {
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                45: {
                    'fErOmRkViCkA': {
                        1: [951840]
                    }
                },
                42: {
                    'dEdOjOzEf': {
                        2: [975318642]
                    }
                }
            }
        });
    });

    test('works with two people in one day', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'fErOmRkViCkA' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '951840' },
                part: { N: '1' }
            }, {
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                42: {
                    'fErOmRkViCkA': {
                        1: [951840]
                    },
                    'dEdOjOzEf': {
                        2: [975318642]
                    }
                }
            }
        });
    });

    test('works with two parts for one person', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '951840' },
                part: { N: '1' }
            }, {
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                42: {
                    'dEdOjOzEf': {
                        1: [951840],
                        2: [975318642]
                    }
                }
            }
        });
    });

    test('works with two times for one part', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '951840' },
                part: { N: '2' }
            }, {
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '2' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                42: {
                    'dEdOjOzEf': {
                        2: [951840, 975318642]
                    }
                }
            }
        });
    });

    test('correctly sorts timestamps', async () => {
        db.scan.mockReturnValueOnce({
            Items: [{
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'gFeD9876' },
                ts: { N: '981840' },
                part: { N: '1' }
            }, {
                year: { N: '1848' },
                day: { N: '42' },
                name: { S: 'dEdOjOzEf' },
                uuid: { S: 'aBcD1234' },
                ts: { N: '975318642' },
                part: { N: '1' }
            }]
        });

        await expect(main.getData(db, undefined, res)).resolves.toBe(undefined);

        expect(db.scan).toBeCalledWith({ TableName: 'aoc-redirect' });

        expect(res.send).toBeCalledWith({
            1848: {
                42: {
                    'dEdOjOzEf': {
                        1: [981840, 975318642]
                    }
                }
            }
        });
    });
});
