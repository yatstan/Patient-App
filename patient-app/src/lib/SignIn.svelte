<script>
  import { generateCodeChallenge, generateRedirectUrl } from './auth';

  const handleSignIn = async () => {
    const codeChallenge = await generateCodeChallenge();
    const redirectUrl = generateRedirectUrl(codeChallenge);
    window.location.href = redirectUrl;
  };
</script>

<style>
  .signin-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    flex-direction: column;
  }
  .signin-button {
    background-color: #1e3a8a;
    color: white;
    padding: 1rem 2rem;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    border-radius: 5px;
  }
</style>

<div class="signin-container">
  <h1>Welcome to iCare+</h1>
  <button class="signin-button" on:click={handleSignIn}>Sign In with EPIC FHIR</button>
</div>
