const AWS = require('aws-sdk')

// Use the scan method to get everything from the old table
const readAllDataFromTable = async ({ region, table }) => {
  AWS.config.update({ region })
  const db = new AWS.DynamoDB.DocumentClient()

  const data = await db.scan({ TableName: table }).promise();
  return data.Items;
}

// Write one row of data to the new table
const writeRowToTable = async (db, table, row) => {
  await db.put({ TableName: table, Item: row }).promise();
}

// Write all the data to the new table
const writeDataToTable = async ({ region, table, data }) => {
  AWS.config.update({ region })
  const db = new AWS.DynamoDB.DocumentClient()

  // Keep a count of the successful writes so we can know if
  // all the items were written successfully
  let successfulWrites = 0

  await Promise.all(
    data.map(async item => {
      await writeRowToTable(db, table, item)
      successfulWrites++
      console.log(`wrote one`);
    })
  );

  console.log(`wrote ${successfulWrites} of ${data.length} rows to database`)
}

// Run the script
const main = async () => {
  console.log(`running`);

  const data = await readAllDataFromTable({
    region: 'us-east-1',
    table: 'aoc-redirect'
  })

  console.log(`read all`);

  await writeDataToTable({
    region: 'eu-central-1',
    table: 'aoc-redirect',
    data
  })
};

main()
  .then(() => console.log('done'))
  .catch(error => console.log(error));
