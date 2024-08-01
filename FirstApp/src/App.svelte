<script>
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import PatientList from './PatientList.svelte';
  import PatientForm from './PatientForm.svelte';
  import PatientDetails from './PatientDetails.svelte';

  const route = writable('/');
  const patientId = writable(null);

  function navigate(path, id = null) {
    route.set(path);
    patientId.set(id);
    window.history.pushState({}, '', path);
  }

  window.addEventListener('popstate', () => {
    const path = window.location.pathname;
    if (path.startsWith('/patient-form')) {
      const id = path.split('/').pop();
      navigate('/patient-form', id);
    } else if (path.startsWith('/patient-details')) {
      const id = path.split('/').pop();
      navigate('/patient-details', id);
    } else {
      navigate('/');
    }
  });

  onMount(() => {
    const path = window.location.pathname;
    if (path.startsWith('/patient-form')) {
      const id = path.split('/').pop();
      navigate('/patient-form', id);
    } else if (path.startsWith('/patient-details')) {
      const id = path.split('/').pop();
      navigate('/patient-details', id);
    } else {
      navigate('/');
    }
  });
</script>

<style>
  body {
    font-family: Arial, sans-serif;
    background: linear-gradient(to right, #ece9e6, #ffffff);
    margin: 0;
    padding: 0;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .banner {
    background-color: #1e3a8a; /* Dark blue background */
    color: white;
    text-align: center;
    padding: 1rem;
    font-size: 1.5rem;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .banner {
      font-size: 1.2rem;
    }
  }

  @media (max-width: 480px) {
    .banner {
      font-size: 1rem;
    }
  }
</style>

<div class="banner">iCare+</div>
<div class="container">
  {#if $route === '/'}
    <PatientList {navigate} />
  {:else if $route === '/patient-form'}
    <PatientForm {navigate} {patientId} />
  {:else if $route === '/patient-details'}
    <PatientDetails {navigate} {patientId} />
  {/if}
</div>
