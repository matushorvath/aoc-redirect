#!/bin/sh

set -e

version=$(<package.json jq -re .version)
uuid=$(uuidgen -r | tr -d -)
package=aoc-redirect-$version-$uuid.zip

region=eu-central-1
bucket=cf.009116496185.$region

# Upload and deploy the package
zip -rq $package $(<package.json jq -re .files[],.deployFiles[])

aws s3 cp \
    --region $region \
    $package s3://$bucket/$package

aws cloudformation deploy \
    --region $region \
    --capabilities CAPABILITY_IAM \
    --template template.yml --stack-name aoc-redir \
    --parameter-overrides \
        Bucket=$bucket \
        Package=$package \
        Version=$version

rm -f $package
