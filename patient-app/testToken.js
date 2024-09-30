import { GoogleAuth } from 'google-auth-library';

// Initialize GoogleAuth with the correct scope and keyFilename
const auth = new GoogleAuth({
  keyFilename: '/home/runner/Patient-App/patient-app/src/google_application_credentials/euphoric-world-422301-n2-133a6576d1e0.json', // Your service account key file path
  scopes: ['https://www.googleapis.com/auth/aiplatform'],  // The required scope for Vertex AI
});

async function getToken() {
  try {
    // Create the client
    const client = await auth.getClient();

    // Get the access token
    const token = await client.getAccessToken();

    // Log the generated token
    console.log('Generated GoogleAuth Token:', token);
  } catch (error) {
    // Log any error that occurs
    console.error('Error generating token:', error);
  }
}

// Call the function to generate and log the token
getToken();
