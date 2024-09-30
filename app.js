  import express from 'express';
  import bodyParser from 'body-parser';
  import multer from 'multer';
  import fs from 'fs';
  import path from 'path';
  import { SpeechClient } from '@google-cloud/speech';
  import { TextToSpeechClient } from '@google-cloud/text-to-speech';
  import cors from 'cors';
  import util from 'util';
  import axios from 'axios';
  import { fileURLToPath } from 'url';
  import { GoogleAuth } from 'google-auth-library';

  // Define __filename and __dirname for ES Modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Express setup
  const app = express();
  const port = 3000;

  // Enable CORS
  app.use(cors({
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  }));

  // Google Cloud Speech-to-Text and Text-to-Speech Clients
  const speechClient = new SpeechClient({
    keyFilename: '/home/runner/Patient-App/patient-app/src/google_application_credentials/euphoric-world-422301-n2-133a6576d1e0.json',
  });
  const ttsClient = new TextToSpeechClient({
    keyFilename: '/home/runner/Patient-App/patient-app/src/google_application_credentials/euphoric-world-422301-n2-133a6576d1e0.json',
  });

  // Updated GoogleAuth client for Vertex AI PaLM 2 Chat Bison with correct scope
  const auth = new GoogleAuth({
    keyFilename: '/home/runner/Patient-App/patient-app/src/google_application_credentials/euphoric-world-422301-n2-133a6576d1e0.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  // Body parser setup
  app.use(bodyParser.json());
  const upload = multer({ dest: 'uploads/' });

  /**
   * Speech-to-Text Route
   * Convert user's audio into text using Vertex AI STT.
   */
  app.post('/stt', upload.single('audio'), async (req, res) => {
    try {
      const audioBytes = fs.readFileSync(req.file.path).toString('base64');

      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      };

      const request = { audio: { content: audioBytes }, config };

      const [response] = await speechClient.recognize(request);
      const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
      console.log('Transcription:', transcription);

      // Fetch user's FHIR data and send it to Vertex AI PaLM 2 Chat Bison for processing
      const llmResponse = await processLLMWithVertexAI(transcription, req.body.accessToken, req.body.patientId);

      res.send({ text: transcription, llmResponse });
    } catch (error) {
      console.error('Error with STT:', error.message || error);
      res.status(500).send('Speech-to-text failed.');
    }
  });

  /**
   * Process LLM using Vertex AI's PaLM 2 Chat Bison via REST API.
   * Take transcription and FHIR data and run it through the LLM.
   */
  async function processLLMWithVertexAI(transcription, accessToken, patientId) {
    // Fetch FHIR data based on the user's access token and patient ID
    const fhirData = await fetchFhirData(patientId, accessToken);

    if (!fhirData) {
      return 'Could not fetch patient data.';
    }

    // Simplify the query for better interpretation by Vertex AI
    const userQuery = `The user asked: "${transcription}". The patient's name is "${fhirData.name[0].text}". Provide relevant insights.`;

    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/euphoric-world-422301-n2/locations/us-central1/publishers/google/models/chat-bison@001:predict`;

      // Get the token from the service account
      const client = await auth.getClient();
      const token = await client.getAccessToken();

      // Debugging: Log the token to ensure it is being generated
      console.log('GoogleAuth Token:', token);

      if (!token) {
        throw new Error("Failed to retrieve access token from GoogleAuth");
      }

      // Make the request to Vertex AI
      console.log("Sending request to Vertex AI with user query:", userQuery);  // Log the query being sent
      const response = await axios.post(url, {
        instances: [
          {
            messages: [
              { author: "user", content: userQuery }
            ]
          }
        ],
        parameters: { temperature: 0.7, maxOutputTokens: 1024 },
      }, {
        headers: {
          Authorization: `Bearer ${token.token}`, // Use the correct token structure
          'Content-Type': 'application/json',
        },
      });

      // Log the entire response from Vertex AI
      console.log("Vertex AI Response:", response.data);

      // Check if any predictions are available
      if (response.data.predictions) {
        const predictions = response.data.predictions[0];

        // Log predictions including groundingMetadata, safetyAttributes, and candidates for further debugging
        console.log("Grounding Metadata:", predictions.groundingMetadata);
        console.log("Safety Attributes:", predictions.safetyAttributes);
        console.log("Candidates:", predictions.candidates);

        // Check if any content is available in the predictions
        if (predictions.candidates && predictions.candidates[0] && predictions.candidates[0].content) {
          return predictions.candidates[0].content;
        } else {
          console.log("No content in response from Vertex AI.");
          return 'No response generated from LLM';
        }
      } else {
        console.log("No predictions in response from Vertex AI.");
        return 'No response generated from LLM';
      }
    } catch (error) {
      // Log the error response for more debugging info
      console.error('Error with Vertex AI LLM:', error.response ? error.response.data : error.message);
      return 'Error generating response from LLM.';
    }
  }

  /**
   * Fetch FHIR data for the user using Epic's FHIR API.
   */
  async function fetchFhirData(patientId, accessToken) {
    try {
      const response = await axios.get(`https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/${patientId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,  // Pass the access token for the FHIR API
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching FHIR data:", error);
      return null;
    }
  }

  /**
   * Text-to-Speech Route
   * Convert the response from LLM into speech using Vertex AI.
   */
  app.post('/tts', async (req, res) => {
    const text = req.body.text;

    const request = {
      input: { text: text },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    try {
      const [response] = await ttsClient.synthesizeSpeech(request);
      const outputPath = path.join(__dirname, 'output.mp3'); // Ensure __dirname is defined
      await util.promisify(fs.writeFile)(outputPath, response.audioContent, 'binary');
      console.log('TTS generated audio');
      res.sendFile(outputPath);
    } catch (error) {
      console.error('Error with TTS:', error.message || error);
      res.status(500).send('Text-to-speech failed.');
    }
  });

  // Root route to check server status
  app.get('/', (req, res) => {
    res.send('Backend is running!');
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
