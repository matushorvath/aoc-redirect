const aws = require('aws-sdk');

const db = new aws.DynamoDB({ apiVersion: '2012-08-10' });
const dbTable = 'aoc-redirect';

const updateTime = async () => {
    const scanParams = {
        FilterExpression: 'attribute_not_exists(ts)',
        TableName: dbTable
    };
    const data = await db.scan(scanParams).promise();

    console.log(JSON.stringify(data));

    for (const item of data.Items) {
        const updateParams = {
            Key: {
                name: item.name,
                uuid: item.uuid
            },
            UpdateExpression: 'SET ts = :ts',
            ExpressionAttributeValues: {
                ":ts": { N: `${Math.floor(new Date(item.time.S).valueOf() / 1000)}` }
            },
            TableName: dbTable
        };

        console.log(JSON.stringify(updateParams));

        const out = await db.updateItem(updateParams).promise();
        console.log(out);
    }
};

updateTime().then(() => console.log('updated'));
