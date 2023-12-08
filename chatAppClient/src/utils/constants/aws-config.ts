import {AWS_SECRET_KEY, AWS_ACCESS_KEY, S3_BUCKET_NAME} from "@env";

export const s3_options = {
    keyPrefix: 'conversation/', // Ex. myuploads/
    bucket: S3_BUCKET_NAME, // Ex. aboutreact
    region: 'ap-south-1', // Ex. ap-south-1
    accessKey: AWS_ACCESS_KEY,
    secretKey: AWS_SECRET_KEY,
    successActionStatus: 201,
  }