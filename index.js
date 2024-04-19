const aws = require("aws-sdk");
const sharp = require("sharp");
const s3 = new aws.S3();

const ROOT_PATH = "receipts/";
const THUMBNAILS_PATH = ROOT_PATH + "thumbnails/";

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
    const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    let image = data.Body;

    // resize image
    const metadata = await sharp(image).metadata();
    if (metadata.width > 900) {
      const resizedImageBuffer = await sharp(image)
          .resize({ width: 900 })
          .withMetadata()
          .toBuffer();
      // store image
      console.log("RESIZED IMAGE");
      const thumbnailKey = THUMBNAILS_PATH + imageFileName;
      await s3.putObject({ Bucket: bucket, Key: thumbnailKey, Body: resizedImageBuffer }).promise();
      console.log("RESIZED IMAGE to S3: ", thumbnailKey);
      return "RESIZED IMAGE";
    } else {
      console.log("NOT RESIZED IMAGE");
      return "NOT RESIZED IMAGE";
    }
  } catch (err) {
    context.fail(`Error resizing image: ${err}`);
  }
};
