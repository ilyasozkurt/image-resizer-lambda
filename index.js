const aws = require("aws-sdk");
const sharp = require("sharp");
const s3 = new aws.S3();

const ROOT_PATH = "receipts/";
const THUMBNAILS_PATH = ROOT_PATH + "thumbnails/";
const THUMBNAIL_SIZES = [100, 200, 300, 400, 500, 600, 700, 800, 900];

exports.handler = async function (event, context) {
    try {
        // Check if it's SNS event and parse if necessary
        if (event.Records[0].EventSource === "aws:sns") {
            event = JSON.parse(event.Records[0].Sns.Message);
        }

        console.log('Received S3 event:', JSON.stringify(event, null, 2));

        const bucket = event.Records[0].s3.bucket.name;
        const key = event.Records[0].s3.object.key;
        const imageFileName = key.split('/').pop();

        console.log(`Bucket: ${bucket}`, `Key: ${key}`);

        // Get the image from S3
        const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
        const image = data.Body;

        // Resize and upload thumbnails concurrently
        const thumbnailPromises = THUMBNAIL_SIZES.map(async (size) => {
            const resizedImage = await sharp(image)
                .resize(size)
                .withMetadata()
                .toBuffer();

            await s3.putObject({
                Bucket: bucket,
                Key: `${THUMBNAILS_PATH}${size}/${imageFileName}`,
                Body: resizedImage,
                ContentType: "image/jpeg" // Specify the correct MIME type
            }).promise();

            console.log(`Successfully resized image to ${size}x${size}`);
        });

        await Promise.all(thumbnailPromises);

        console.log('All thumbnails generated and uploaded successfully');

        return {
            statusCode: 200,
            body: JSON.stringify('Image resized successfully'),
            imageFileName: imageFileName
        };
    } catch (err) {
        console.error('Error resizing image:', err);

        return {
            statusCode: 500,
            body: JSON.stringify('Error resizing image'),
        };
    }
};
