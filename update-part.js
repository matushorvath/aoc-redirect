const aws = require('aws-sdk');

const db = new aws.DynamoDB({ apiVersion: '2012-08-10' });
const dbTable = 'aoc-redirect';

const updatePart = async () => {
    const scanParams = {
        FilterExpression: 'attribute_not_exists(part)',
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
            UpdateExpression: 'SET part = :part',
            ExpressionAttributeValues: {
                ":part": { N: '1' }
            },
            TableName: dbTable
        };

        console.log(JSON.stringify(updateParams));

        const out = await db.updateItem(updateParams).promise();
        console.log(out);
    }
};

updatePart().then(() => console.log('updated'));
