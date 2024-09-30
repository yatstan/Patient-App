<script lang="ts">
  import { onMount } from 'svelte';
  import { CLIENT_ID, CODE_VERIFIER_LOCAL_STORAGE_KEY, FHIR_BASE_URL, REDIRECT_URL as REDIRECT_URI, SMART_AUTH_URL, SMART_TOKEN_URL, TOKEN_RESPONSE_LOCAL_STORAGE_KEY, SMART_LOGOUT_URL } from './config';
  import axios from 'axios';
  import pkceChallenge from "pkce-challenge";
  import PatientDetails from './lib/PatientDetails.svelte';
  import MedicationDetails from './lib/MedicationDetails.svelte';
  import ObservationViewer from './lib/ObservationViewer.svelte';
  import { writable } from 'svelte/store';

  let tokenResponse = {
    access_token: '',
    id_token: '',
    patient: '',
    scope: '',
    expires_in: 3600,
    expires_at: 0
  };
  let loading = true;
  let errorMessage = '';
  let currentPage = writable('main');
  let redirecting = false;
  let isRecording = false;
  let transcription = '';

  // OAuth2 Authorization URL generation
  const generateRedirectUrl = async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();
    localStorage.setItem(CODE_VERIFIER_LOCAL_STORAGE_KEY, code_verifier);
    const authorizationUrl = new URL(SMART_AUTH_URL);
    authorizationUrl.searchParams.set('client_id', CLIENT_ID);
    authorizationUrl.searchParams.set('scope', 'openid fhirUser offline_access patient/*.read');
    authorizationUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('aud', FHIR_BASE_URL);
    authorizationUrl.searchParams.set('code_challenge', code_challenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    return authorizationUrl.href;
  };

  // Make token request after OAuth flow
  const makeTokenRequest = async (code: string, codeVerifier: string) => {
    const tokenRequestForm = new FormData();
    tokenRequestForm.set('grant_type', 'authorization_code');
    tokenRequestForm.set('code', code);
    tokenRequestForm.set('redirect_uri', REDIRECT_URI);
    tokenRequestForm.set('client_id', CLIENT_ID);
    tokenRequestForm.set('code_verifier', codeVerifier);

    try {
      const response = await axios.post(SMART_TOKEN_URL, tokenRequestForm);
      const data = response.data;
      data.expires_at = Date.now() + data.expires_in * 1000;
      localStorage.setItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      errorMessage = 'Error making token request: ' + error.message;
      return null;
    }
  };

  // OAuth2 logout
  const logout = async () => {
    localStorage.removeItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY);
    currentPage.set('signin');
    redirecting = true;
    window.location.href = `${SMART_LOGOUT_URL}?client_id=${CLIENT_ID}&logout_uri=${REDIRECT_URI}`;
    setTimeout(() => {
      redirecting = false;
      window.location.href = REDIRECT_URI;
    }, 2000);
  };

  // Ensure token is valid
  const ensureValidToken = async () => {
    const savedTokenResponse = localStorage.getItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY);
    if (savedTokenResponse) {
      tokenResponse = JSON.parse(savedTokenResponse);
      if (Date.now() > tokenResponse.expires_at - 5000) {
        logout();
        return false;
      } else {
        setTimeout(logout, tokenResponse.expires_at - Date.now() - 5000);
      }
      return true;
    }
    return false;
  };

  // OAuth2 Authentication Flow
  onMount(async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const codeVerifier = localStorage.getItem(CODE_VERIFIER_LOCAL_STORAGE_KEY);

      if (code && codeVerifier) {
        loading = true;
        tokenResponse = await makeTokenRequest(code, codeVerifier);
        if (tokenResponse) {
          localStorage.setItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY, JSON.stringify(tokenResponse));
          currentPage.set('main');
        } else {
          currentPage.set('signin');
        }
        loading = false;
      } else {
        if (!(await ensureValidToken())) {
          currentPage.set('signin');
        } else {
          currentPage.set('main');
        }
        loading = false;
      }
    } catch (error) {
      errorMessage = 'Error during onMount: ' + error.message;
      currentPage.set('signin');
    }
  });

  const initiateAuthorizationRequest = async () => {
    const redirectUrl = await generateRedirectUrl();
    window.location.href = redirectUrl;
  };

  // Start recording and send to STT backend
  let mediaRecorder;
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      isRecording = true;

      mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        isRecording = false;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const resampledBlob = await resampleAudioTo16kHz(audioBlob);
        sendToSTTBackend(resampledBlob);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (error) {
      console.error('Error accessing microphone:', error);
      errorMessage = 'Microphone access error: ' + error.message;
    }
  }

  // Resample audio from 48kHz to 16kHz
  async function resampleAudioTo16kHz(audioBlob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const offlineContext = new OfflineAudioContext(1, (audioBuffer.duration * 16000), 16000);
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = bufferToWaveBlob(renderedBuffer, 16000);
    return wavBlob;
  }

  // Convert AudioBuffer to WAV format blob
  function bufferToWaveBlob(buffer, sampleRate) {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const wavBuffer = new ArrayBuffer(length);
    const view = new DataView(wavBuffer);

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + buffer.length * 2, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, buffer.numberOfChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * 2, true); offset += 4;
    view.setUint16(offset, buffer.numberOfChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, buffer.length * 2, true); offset += 4;

    const channelData = buffer.getChannelData(0);
    let index = 44;
    for (let i = 0; i < channelData.length; i++) {
      const value = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(index, value < 0 ? value * 0x8000 : value * 0x7FFF, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  const sendToSTTBackend = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('accessToken', tokenResponse.access_token); // Pass the access token
    formData.append('patientId', tokenResponse.patient); // Pass the patient ID

    try {
      const response = await fetch('https://4c361764-ab27-482f-96c4-0ff7e1ab3301-00-3of0ba5dt9b8f.kirk.replit.dev:3000/stt', {
        method: 'POST',
        body: formData,
     
        });

            if (response.ok) {
              const result = await response.json();
              transcription = result.text;
              handleTTSResponse(result.llmResponse);
            } else {
              console.error('Error during STT request:', response.statusText);
            }
          } catch (error) {
            console.error('Error sending transcription to backend:', error);
          }
        };

        const handleTTSResponse = async (text) => {
          try {
            const response = await fetch('https://4c361764-ab27-482f-96c4-0ff7e1ab3301-00-3of0ba5dt9b8f.kirk.replit.dev:3000/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: `You said: ${text}` }),
            });

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
          } catch (error) {
            console.error('Error converting text to speech:', error);
          }
        };
        </script>

        <style>
          .main {
            margin-top: 20px;
          }
          .button-container {
            display: flex;
            flex-direction: column;
            justify-content: start;
            background-color: #1e3a8a;
            color: white;
            padding: 10px;
            height: 100vh;
            width: 200px;
            position: fixed;
            top: 0;
            z-index: 1000;
            padding-top: 80px;
          }
          .mic-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 80px;
            position: fixed;
            bottom: 20px;
            left: 50px;
          }
          .nav-button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
            text-align: left;
          }
          .banner {
            background-color: #1e3a8a;
            color: white;
            text-align: center;
            padding: 1rem;
            font-size: 1.5rem;
            font-weight: bold;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
          }
          .content {
            margin-left: 220px;
            padding: 20px;
            padding-top: 80px;
          }
        </style>

        <div>
          {#if loading || redirecting}
            <div class="signin-container">
              <p class="text-lg font-semibold">Loading...</p>
            </div>
          {:else if $currentPage === 'signin'}
            <div class="signin-container">
              <button on:click={initiateAuthorizationRequest} class="signin-button">Sign in with Epic</button>
            </div>
          {:else}
            <div>
              <div class="banner">iCare+</div>
              <div class="button-container">
                <button class="nav-button" on:click={() => currentPage.set('main')}>Home</button>
                <button class="nav-button" on:click={() => currentPage.set('medications')}>Medications</button>
                <button class="nav-button" on:click={() => currentPage.set('laboratory')}>Laboratory</button>
                <button class="nav-button" on:click={() => currentPage.set('vitals')}>Vitals</button>
                <button class="nav-button" on:click={logout}>Logout</button>
                <button class="mic-button" on:click={startRecording}>🎤</button>
              </div>
              <div class="content">
                {#if errorMessage}
                  <p class="text-red-500">{errorMessage}</p>
                {/if}
                {#if transcription}
                  <p>Transcription: {transcription}</p>
                {/if}
                {#if $currentPage === 'main'}
                  <PatientDetails accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
                {:else if $currentPage === 'medications'}
                  <MedicationDetails accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
                {:else if $currentPage === 'laboratory'}
                  <ObservationViewer title="Lab Results" category='laboratory' accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
                {:else if $currentPage === 'vitals'}
                  <ObservationViewer title="Vital Signs" category='vital-signs' accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
                {/if}
              </div>
            </div>
          {/if}
        </div>