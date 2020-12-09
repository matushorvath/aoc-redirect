#!/bin/sh

set -e

version=$(<package.json jq -re .version)
package=aoc-redirect-$version.zip
bucket=cf.009116496185.us-east-1

zip $package *

aws s3 cp \
    --profile private --region us-east-1 \
    $package s3://$bucket/$package

aws cloudformation deploy \
    --profile private --region us-east-1 \
    --capabilities CAPABILITY_IAM \
    --template template.yml --stack-name aoc-redir \
    --parameter-overrides \
        Bucket=$bucket \
        Package=$package \
        Version=$version
