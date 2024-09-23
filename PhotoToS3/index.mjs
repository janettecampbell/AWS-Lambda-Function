import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { S3 } from "@aws-sdk/client-s3";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDB({ region: "us-east-2" });
const ddbDocClient = DynamoDBDocument.from(ddbClient);
const s3Client = new S3({ region: "us-east-2" });

export const handler = async (event, context) => {
  try {
    console.log("Event", event)
    const {
      productID,
      itemID,
      styleID,
      description,
      imageName,
      imageFile,
      price,
    } = JSON.parse(event.body);

    console.log("productID", productID);
    console.log("itemID", itemID);
    console.log("styleID", styleID);
    console.log("description", description);
    console.log("imageName", imageName);
    console.log("imageFile", imageFile);
    console.log("price", price);

    if (
      !productID ||
      !itemID ||
      !styleID ||
      !description ||
      !imageFile ||
      !price
    ) {
      throw new Error("Missing required fields.");
    }

    // Upload image to S3
    const s3Params = {
      Bucket: "photo-to-s3-bucket",
      Key: `images/${imageName}`,
      Body: Buffer.from(imageFile, "base64"),
      ContentType: "image/jpeg",
    };

    console.log("s3Params", s3Params)

    const s3Result = await s3Client.putObject(s3Params);

    // Generate S3 URL
    const imageUrl = `https://${s3Params.Bucket}.s3.amazonaws.com/${s3Params.Key}`;

    // Update DynamoDB with S3 link
    const ddbParams = {
      TableName: "Products",
      Key: {
        PK: productID,
        SK: itemID
      },
      UpdateExpression: "set Image = :url, Description = :description, Price = :price, StyleID = :styleID, ProductID = :productID, ItemID = :itemID",
      ExpressionAttributeValues: {
        ":url": imageUrl,
        ":description": description,
        ":price": price,
        ":styleID": styleID,
        ":productID": productID,
        ":itemID": itemID,
      },
      ReturnValues: "UPDATED_NEW"
    };

    console.log("ddbParams", ddbParams)

    const ddbResult = await ddbDocClient.update(ddbParams);

    return {
      isBase64Encoded: false,
      statusCode: 200,
      statusDescription: "200 OK",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
      body: JSON.stringify({
        message: "Image uploaded and product updated successfully",
        imageUrl: imageUrl,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      isBase64Encoded: false,
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Error processing request",
        error: error.message,
      }),
    };
  }
};
