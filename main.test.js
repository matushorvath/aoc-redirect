const main = require('./main');

const aws = require('aws-sdk');
const dbPutItemMock = jest.mock(aws, 'DynamoDB.putItem');

describe('GET /:year/day/:day', () => {
    test('with no query', async () => {
        const req = {
            query: {}
        };
        const res = {
            status: jest.fn(),
            send: jest.fn()
        };

        await expect(main.getYearDay(req, res)).resolves.toBe(undefined);
        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith(expect.any(String));
        expect(dbPutItemMock).not.toBeCalled();
    });

    test('with missing name', async () => {
        const req = {
            query: {}
        };
        const res = {
            status: jest.fn(),
            send: jest.fn()
        };

        await expect(main.getYearDay(req, res)).resolves.toBe(undefined);
        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith(expect.any(String));
    });

    test('with missing part', async () => {
        const req = {
            query: {}
        };
        const res = {
            status: jest.fn(),
            send: jest.fn()
        };

        await expect(main.getYearDay(req, res)).resolves.toBe(undefined);
        expect(res.status).toBeCalledWith(400);
        expect(res.send).toBeCalledWith(expect.any(String));
    });
});
