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
  let currentPage = writable('signin');
  let redirecting = false;
  let showClosePrompt = false;

  const getSecs = (date: Date) => {
    return Math.round((date.getTime()) / 1000);
  };

  const generateCodeChallenge = async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();
    localStorage.setItem(CODE_VERIFIER_LOCAL_STORAGE_KEY, code_verifier);
    return code_challenge;
  };

  const generateRedirectUrl = async () => {
    const codeChallenge = await generateCodeChallenge();
    const authorizationUrl = new URL(SMART_AUTH_URL);
    authorizationUrl.searchParams.set('client_id', CLIENT_ID);
    authorizationUrl.searchParams.set('scope', 'openid fhirUser offline_access patient/*.read');
    authorizationUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('aud', FHIR_BASE_URL);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    const url = authorizationUrl.href;
    console.log('Generated redirect URL:', url);
    return url;
  };

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
      console.log('Token obtained and stored:', data);
      return data;
    } catch (error) {
      console.error('Error making token request:', error);
      errorMessage = 'Error making token request: ' + error.message;
      return null;
    }
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY);
    redirecting = true;
    showClosePrompt = true;
    currentPage.set('signin');
    setTimeout(() => {
      window.location.href = `${SMART_LOGOUT_URL}?client_id=${CLIENT_ID}&logout_uri=${REDIRECT_URI}/logout`;
    }, 2000);
  };

  const ensureValidToken = async () => {
    const savedTokenResponse = localStorage.getItem(TOKEN_RESPONSE_LOCAL_STORAGE_KEY);
    if (savedTokenResponse) {
      tokenResponse = JSON.parse(savedTokenResponse);
      console.log('Loaded token from storage:', tokenResponse);
      if (Date.now() > tokenResponse.expires_at - 5000) {
        console.log('Token expired or near expiry. Logging out...');
        logout();
        return false;
      } else {
        setTimeout(() => {
          console.log('Auto logging out...');
          logout();
        }, tokenResponse.expires_at - Date.now() - 5000);
      }
      return true;
    }
    return false;
  };

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
          console.log('Token response received and stored:', tokenResponse);
          currentPage.set('main');
        } else {
          console.error('Failed to get token response.');
          errorMessage = 'Failed to get token response.';
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
      console.error('Error during onMount:', error);
      errorMessage = 'Error during onMount: ' + error.message;
      currentPage.set('signin');
    }
  });

  const initiateAuthorizationRequest = async () => {
    const redirectUrl = await generateRedirectUrl();
    window.location.href = redirectUrl;
  };

  let recognizing = false;
  let recognition;

  const startRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        recognizing = true;
        console.log('Speech recognition started');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          sendToChatGPT(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event);
        recognizing = false;
        recognition.stop();
      };

      recognition.onend = () => {
        recognizing = false;
        console.log('Speech recognition ended');
      };

      recognition.start();
    } else {
      alert('Speech recognition not supported in this browser. Please use Chrome.');
    }
  };

  const stopRecognition = () => {
    if (recognition && recognizing) {
      recognition.stop();
    }
  };

  const sendToChatGPT = async (text) => {
    try {
      const response = await axios.post('/path-to-your-chatgpt-api', { text });
      console.log('ChatGPT response:', response.data);
      // Handle ChatGPT response as needed
    } catch (error) {
      console.error('Error sending to ChatGPT:', error);
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
  .nav-button:hover {
    text-decoration: underline;
  }
  .banner {
    background-color: #1e3a8a;
    color: white;
    text-align: center;
    padding: 1rem;
    font-size: 1.5rem;
    font-weight: bold;
  }
  .content {
    margin-left: 220px;
    padding: 20px;
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
  .mic-button:hover {
    text-decoration: underline;
  }
  .signin-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  .signin-button {
    background-color: #1e3a8a;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 18px;
  }
  .signin-button:hover {
    background-color: #162c6a;
  }
  .close-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  .close-button {
    background-color: #1e3a8a;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 18px;
  }
  .close-button:hover {
    background-color: #162c6a;
  }
  .chart-container {
    position: relative;
    height: 40vh;
    width: 80vw;
    margin: auto;
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
        <button class="mic-button" on:click={startRecognition}>🎤</button>
      </div>
      <div class="content">
        {#if errorMessage}
          <div class="flex justify-center items-center h-screen">
            <p class="text-red-500">{errorMessage}</p>
          </div>
        {:else}
          {#if showClosePrompt}
            <div class="close-container">
              <button on:click={closeWindow} class="close-button">Close Window</button>
            </div>
          {:else}
            {#if $currentPage === 'main'}
              <div class="container mx-auto p-4">
                <PatientDetails accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
              </div>
            {:else if $currentPage === 'medications'}
              <div class="container mx-auto p-4">
                <MedicationDetails accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
              </div>
            {:else if $currentPage === 'laboratory'}
              <div class="container mx-auto p-4">
                <ObservationViewer title="Lab Results" category='laboratory' accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
              </div>
            {:else if $currentPage === 'vitals'}
              <div class="container mx-auto p-4">
                <ObservationViewer title="Vital Signs" category='vital-signs' accessToken={tokenResponse.access_token} patientId={tokenResponse.patient} />
              </div>
            {/if}
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
