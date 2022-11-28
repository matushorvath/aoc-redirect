# How to rename a person

Rename form 'old-name' to 'new-name':

1. Get items from Dynamo:
```sh
$ aws dynamodb query --table-name aoc-redirect --key-condition-expression "#N = :n" --expression-attribute-names '{"#N":"name"}' --expression-attribute-values '{":n": {"S": "old-name"}}' > items-old.json
```

Check number of items:
```sh
$ <items-old.json | jq '.Items | length'
103
```

1. Perform the renaming in JSON:

```sh
$ <items-old.json jq -r '{ "aoc-redirect": [ .Items[] | { PutRequest: { Item: (. + { name: { S: "new-name" } } ) } } ] }' > items-new.json
```

Check number of items:
```sh
$ <items-new.json | jq '."aoc-redirect" | length'
103
```

1. Upload the items back to Dynamo:

```sh
$ aws dynamodb batch-write-item --request-items file://items-new.json
```

1. List items to be deleted:

```sh
$ <items-old.json jq -r '{ "aoc-redirect": [ .Items[] | { DeleteRequest: { Key: { name: { S: .name.S }, uuid: { S: .uuid.S } } } } ] }' > items-del.json
```

1. Delete old items (carefully):

```sh
aws dynamodb batch-write-item --request-items file://items-del.json
```
