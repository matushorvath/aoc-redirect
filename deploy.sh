#!/bin/sh

set -e

version=$(<package.json jq -re .version)
uuid=$(uuidgen -r | tr -d -)
package=aoc-redirect-$version-$uuid.zip
bucket=cf.009116496185.us-east-1

# TODO npm i --prod

zip -rq $package $(<package.json jq -re .files[],.deployFiles[])

aws s3 cp \
    --region us-east-1 \
    $package s3://$bucket/$package

aws cloudformation deploy \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM \
    --template template.yml --stack-name aoc-redir \
    --parameter-overrides \
        Bucket=$bucket \
        Package=$package \
        Version=$version

rm -f $package
