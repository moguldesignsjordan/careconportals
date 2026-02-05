import {onRequest} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";

// Define environment parameters
const squareAccessToken = defineString("SQUARE_ACCESS_TOKEN");
const squareLocationId = defineString("SQUARE_LOCATION_ID");
const squareEnvironment = defineString("SQUARE_ENVIRONMENT");

// Example function - replace with your actual Square API logic
export const processSquarePayment = onRequest((req, res) => {
  const token = squareAccessToken.value();
  const locationId = squareLocationId.value();
  const env = squareEnvironment.value();

  // Your Square API integration here
  // TODO: Use token to make actual Square API calls
  console.log("Square token available:", token ? "Yes" : "No");

  res.json({
    message: "Square API configured",
    environment: env,
    locationId: locationId,
  });
});
