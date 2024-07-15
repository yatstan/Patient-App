<script>
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';

  export let navigate;
  export let patientId;

  const formPatient = writable({ mrn: '', name: '', gender: '', birthDate: '', phoneNumber: '', id: '' });
  const formMode = writable('create');
  const nameError = writable('');
  const phoneError = writable('');

  // Updated regex patterns
  const nameRegex = /^[a-zA-Z\s]+$/;
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;

  async function fetchPatient(id) {
    try {
      const response = await fetch(`https://demo.kodjin.com/fhir/Patient/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching patient data: ${response.statusText}`);
      }
      const patient = await response.json();
      formPatient.set({
        mrn: patient.identifier?.[0]?.value || '',
        name: patient.name[0].text,
        gender: patient.gender,
        birthDate: patient.birthDate,
        phoneNumber: patient.telecom?.[0]?.value || '',
        id: patient.id
      });
      formMode.set('edit');
    } catch (error) {
      console.error('Error fetching patient:', error);
    }
  }

  function validateForm() {
    let isValid = true;
    nameError.set('');
    phoneError.set('');

    const patient = get(formPatient);

    if (!nameRegex.test(patient.name)) {
      nameError.set('Name can only contain letters and spaces.');
      isValid = false;
    }

    if (!phoneRegex.test(patient.phoneNumber)) {
      phoneError.set('Phone number must be a valid 10-digit number.');
      isValid = false;
    }

    return isValid;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    const patient = get(formPatient);

    const patientResource = {
      resourceType: 'Patient',
      identifier: [{ system: 'urn:ietf:rfc:3986', value: patient.mrn }],
      name: [{ text: patient.name }],
      gender: patient.gender,
      birthDate: patient.birthDate,
      telecom: [{ system: 'phone', value: patient.phoneNumber }],
    };

    try {
      let response;
      if (get(formMode) === 'create') {
        response = await fetch('https://demo.kodjin.com/fhir/Patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(patientResource),
        });
      } else {
        response = await fetch(`https://demo.kodjin.com/fhir/Patient/${patient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(patientResource),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${response.statusText}\n${errorText}`);
      }

      alert(`Patient ${get(formMode) === 'create' ? 'created' : 'updated'} successfully`);
      navigate('/');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting form: ${error.message}`);
    }
  }

  function goBack() {
    navigate('/');
  }

  onMount(() => {
    if (get(patientId)) {
      fetchPatient(get(patientId));
    } else {
      formMode.set('create');
      formPatient.set({ mrn: '', name: '', gender: '', birthDate: '', phoneNumber: '', id: '' });
    }
  });
</script>

<style>
  .form-container {
    margin-top: 2rem;
    background: #e0f7fa; /* Light blue background */
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .form-container h1 {
    text-align: center;
    margin-bottom: 1rem;
  }

  .form-container label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .form-container input, .form-container select {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .form-container .error {
    color: red;
    font-size: 0.875rem;
    margin-top: -0.875rem;
    margin-bottom: 1rem;
  }

  .form-container button {
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .form-container button:hover {
    background-color: #0056b3;
  }

  .back-button {
    background-color: #6c757d;
  }

  .back-button:hover {
    background-color: #5a6268;
  }
</style>

<div class="form-container">
  <h1 class="text-2xl font-bold mb-4">{#if $formMode === 'create'}Create Patient{/if}{#if $formMode === 'edit'}Edit Patient{/if}</h1>
  <form on:submit={handleSubmit}>
    <div class="mb-4">
      <label for="mrn" class="block mb-1">MRN</label>
      <input
        type="text"
        id="mrn"
        bind:value={$formPatient.mrn}
        required
      />
    </div>
    <div class="mb-4">
      <label for="name" class="block mb-1">Name</label>
      <input
        type="text"
        id="name"
        bind:value={$formPatient.name}
        required
      />
      {#if $nameError}
        <div class="error">{$nameError}</div>
      {/if}
    </div>
    <div class="mb-4">
      <label for="gender" class="block mb-1">Gender</label>
      <select
        id="gender"
        bind:value={$formPatient.gender}
        required
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="mb-4">
      <label for="birthDate" class="block mb-1">Date of Birth</label>
      <input
        type="date"
        id="birthDate"
        bind:value={$formPatient.birthDate}
        required
      />
    </div>
    <div class="mb-4">
      <label for="phoneNumber" class="block mb-1">Phone Number</label>
      <input
        type="tel"
        id="phoneNumber"
        bind:value={$formPatient.phoneNumber}
        required
      />
      {#if $phoneError}
        <div class="error">{$phoneError}</div>
      {/if}
    </div>
    <button type="submit">
      {#if $formMode === 'create'}Create Patient{/if}
      {#if $formMode === 'edit'}Update Patient{/if}
    </button>
    <button type="button" class="back-button" on:click={goBack}>Back</button>
  </form>
</div>
