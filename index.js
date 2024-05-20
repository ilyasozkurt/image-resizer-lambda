const aws = require("aws-sdk");
const sharp = require("sharp");
const s3 = new aws.S3();

const ROOT_PATH = "receipts/";
const THUMBNAILS_PATH = ROOT_PATH + "thumbnails/";
const THUMBNAIL_SIZES = [100, 200, 300, 400, 500, 600, 700, 800, 900];

exports.handler = async function (event, context) {

    console.log('Received S3 event:', JSON.stringify(event, null, 2));

    if (event.Records[0].eventName === "ObjectRemoved:Delete") {
        return;
    }

    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
    const imageFileName = key.split('/').pop();

    console.log(`Bucket: ${bucket}`, `Key: ${key}`);

    try {

        // get image from s3
        const data = await s3.getObject({Bucket: bucket, Key: key}).promise();
        let image = data.Body;

        // resize image
        for (const size of THUMBNAIL_SIZES) {

            const resizedImage = await sharp(image)
                .resize(size)
                .withMetadata()
                .toBuffer();

            await s3.putObject({
                Bucket: bucket,
                Key: THUMBNAILS_PATH + size + '/' + imageFileName,
                Body: resizedImage,
                ContentType: "image"
            }).promise();

            console.log(`Successfully resized image to ${size}x${size}`);

        }

        console.log('Successfully resized image');

        context.succeed(`Successfully resized image: ${key}`);

    } catch (err) {

        context.fail(`Error resizing image: ${err}`);

    }

};
