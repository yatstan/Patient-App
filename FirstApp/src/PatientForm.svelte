<script>
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';

  export let navigate;
  export let patientId;

  const formPatient = writable({ name: '', gender: '', birthDate: '', phoneNumber: '', id: '' });
  const formMode = writable('create');

  async function fetchPatient(id) {
    try {
      const response = await fetch(`https://hapi.fhir.org/baseR4/Patient/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching patient data: ${response.statusText}`);
      }
      const patient = await response.json();
      formPatient.set({
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

  async function handleSubmit(event) {
    event.preventDefault();
    const patient = get(formPatient);

    if (!patient.name || !patient.gender || !patient.birthDate || !patient.phoneNumber) {
      alert('All fields are required');
      return;
    }

    const patientResource = {
      resourceType: 'Patient',
      name: [{ text: patient.name }],
      gender: patient.gender,
      birthDate: patient.birthDate,
      telecom: [{ system: 'phone', value: patient.phoneNumber }],
    };

    try {
      if (get(formMode) === 'create') {
        const response = await fetch('https://hapi.fhir.org/baseR4/Patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(patientResource),
        });
        if (response.ok) {
          alert('Patient created successfully');
          navigate('/');
        } else {
          throw new Error('Error creating patient');
        }
      } else {
        const response = await fetch(`https://hapi.fhir.org/baseR4/Patient/${patient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/fhir+json' },
          body: JSON.stringify(patientResource),
        });
        if (response.ok) {
          alert('Patient updated successfully');
          navigate('/');
        } else {
          throw new Error('Error updating patient');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }

  onMount(() => {
    if (get(patientId)) {
      fetchPatient(get(patientId));
    } else {
      formMode.set('create');
      formPatient.set({ name: '', gender: '', birthDate: '', phoneNumber: '', id: '' });
    }
  });
</script>

<style>
  .form-container {
    margin-top: 2rem;
  }
</style>

<div class="form-container">
  <h1 class="text-2xl font-bold mb-4">{#if $formMode === 'create'}Create Patient{/if}{#if $formMode === 'edit'}Edit Patient{/if}</h1>
  <form on:submit={handleSubmit}>
    <div class="mb-4">
      <label for="name" class="block mb-1">Name</label>
      <input
        type="text"
        id="name"
        bind:value={$formPatient.name}
        class="p-2 border border-gray-300 rounded w-full"
        required
      />
    </div>
    <div class="mb-4">
      <label for="gender" class="block mb-1">Gender</label>
      <select
        id="gender"
        bind:value={$formPatient.gender}
        class="p-2 border border-gray-300 rounded w-full"
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
        class="p-2 border border-gray-300 rounded w-full"
        required
      />
    </div>
    <div class="mb-4">
      <label for="phoneNumber" class="block mb-1">Phone Number</label>
      <input
        type="tel"
        id="phoneNumber"
        bind:value={$formPatient.phoneNumber}
        class="p-2 border border-gray-300 rounded w-full"
        required
      />
    </div>
    <button
      type="submit"
      class="p-2 bg-blue-500 text-white rounded"
    >
      {#if $formMode === 'create'}Create Patient{/if}
      {#if $formMode === 'edit'}Update Patient{/if}
    </button>
  </form>
</div>
