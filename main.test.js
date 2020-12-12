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

    const dbPutItemPromise = jest.fn();
    const db = {
        putItem: jest.fn().mockReturnValue({ promise: dbPutItemPromise })
    };

    beforeEach(() => {
        res.redirect.mockClear();
        res.send.mockClear();
        res.status.mockClear();
        db.putItem.mockClear();
        dbPutItemPromise.mockReset();
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
        await expect(main.getYearDay(db, req, res)).rejects.toMatchObject(expect.any(Error));

        expect(res.send).not.toBeCalled();
        expect(db.putItem).not.toBeCalled();
    });

    test.each([
        ['missing query', {}],
        ['empty query', { query: {} }],
        ['missing name', { query: { part: '1' } }],
    ])('fails with %s', async (description, queryPart) => {
        const req = {
            params: { day: 42, year: 1848 },
            ...queryPart
        };
        await expect(main.getYearDay(db, req, res)).resolves.toBe(undefined);

        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith(expect.any(String));
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
                "ts": { N: expect.any(String) },
                "uuid": { S: expect.any(String) },
                "year": { N: req.params.year },
                "part": { N: '1' }
            },
            TableName: 'aoc-redirect'
        }));
        expect(dbPutItemPromise).toBeCalled();

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
                "ts": { N: expect.any(String) },
                "uuid": { S: expect.any(String) },
                "year": { N: req.params.year },
                "part": { N: req.query.part }
            },
            TableName: 'aoc-redirect'
        }));
        expect(dbPutItemPromise).toBeCalled();

        expect(res.status).toBeCalledWith(200);
        expect(res.send).toBeCalledWith('OK');
    });
});
