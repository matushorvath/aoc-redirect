# How to rename a person

Rename form 'old-name' to 'new-name':

1. Get items from Dynamo:
```sh
aws dynamodb query --table-name aoc-redirect --key-condition-expression "#N = :n" --expression-attribute-names '{"#N":"name"}' --expression-attribute-values '{":n": {"S": "old-name"}}' > items-old.json
```

Check number of items:
```sh
<items-old.json | jq '.Items | length'
103
```

1. Split items to chunks of 25 items, change the name while doing it:

```sh
<items-old.json jq -r '[ _nwise(.Items; 25) | { "aoc-redirect": [ .[] | { PutRequest: { Item: (. + { name: { S: "new-name" } } ) } } ] } ]' > items-new.json
```

1. Upload the items back to Dynamo:
(batch-write-items needs 25 items or less per request)

```sh
for i in $(<items-new.json jq -r 'keys[]'); do
    fn=$(mktemp)
    <items-new.json jq -r ".[$i]" > "$fn"
    aws dynamodb batch-write-item --request-items "file://$fn"
    rm "$fn"
done
```

1. List items to be deleted:

```sh
<items-old.json jq -r '[ _nwise(.Items; 25) | { "aoc-redirect": [ .[] | { DeleteRequest: { Key: { name: { S: .name.S }, uuid: { S: .uuid.S } } } } ] } ]' > items-del.json
```

1. Delete old items (carefully):

```sh
for i in $(<items-del.json jq -r 'keys[]'); do
    fn=$(mktemp)
    <items-del.json jq -r ".[$i]" > "$fn"
    aws dynamodb batch-write-item --request-items "file://$fn"
    rm "$fn"
done
```
