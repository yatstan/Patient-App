<script>
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import PatientList from './PatientList.svelte';
  import PatientForm from './PatientForm.svelte';

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
    } else {
      navigate('/');
    }
  });

  onMount(() => {
    const path = window.location.pathname;
    if (path.startsWith('/patient-form')) {
      const id = path.split('/').pop();
      navigate('/patient-form', id);
    } else {
      navigate('/');
    }
  });
</script>

<style>
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
</style>

<div class="banner">iCare+</div>
<div class="container">
  {#if $route === '/'}
    <PatientList {navigate} />
  {:else if $route === '/patient-form'}
    <PatientForm {navigate} {patientId} />
  {/if}
</div>
