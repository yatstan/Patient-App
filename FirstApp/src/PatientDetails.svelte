<script>
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';
  import Map from './Map.svelte';

  export let navigate;
  export let patientId;

  const patientDetails = writable({});
  const patientDiagnosis = writable([]);
  const patientObservations = writable([]);
  const patientAllergies = writable([]);
  const patientProcedures = writable([]);
  const patientMedications = writable([]);

  async function fetchPatientDetails(id) {
    try {
      const response = await fetch(`https://demo.kodjin.com/fhir/Patient/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching patient data: ${response.statusText}`);
      }
      const data = await response.json();
      patientDetails.set(data);
    } catch (error) {
      console.error('Error fetching patient:', error.message);
    }
  }

  async function fetchPatientRelatedData(id, resourceType, store) {
    try {
      const response = await fetch(`https://demo.kodjin.com/fhir/${resourceType}?patient=${id}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error fetching ${resourceType} data: ${response.status} - ${response.statusText}\n${errorText}`);
      }
      const data = await response.json();
      store.set(data.entry ? data.entry.map(entry => entry.resource) : []);
    } catch (error) {
      console.error(`Error fetching ${resourceType}:`, error.message);
    }
  }

  function goBack() {
    navigate('/');
  }

  function formatAddress(address) {
    const parts = [];
    if (address.line) parts.push(address.line.join(', '));
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  }

  onMount(() => {
    const id = get(patientId);
    if (id) {
      fetchPatientDetails(id);
      fetchPatientRelatedData(id, 'Condition', patientDiagnosis);
      fetchPatientRelatedData(id, 'Observation', patientObservations);
      fetchPatientRelatedData(id, 'AllergyIntolerance', patientAllergies);
      fetchPatientRelatedData(id, 'Procedure', patientProcedures);
      fetchPatientRelatedData(id, 'MedicationRequest', patientMedications);
    }
  });
</script>

<style>
  .details-container {
    margin-top: 2rem;
    background: #e0f7fa; /* Light blue background */
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .details-container h1 {
    text-align: center;
    margin-bottom: 1rem;
  }

  .details-container h2 {
    margin-top: 1rem;
    font-size: 1.25rem;
  }

  .details-container ul {
    list-style-type: none;
    padding: 0;
  }

  .details-container li {
    margin-bottom: 0.5rem;
  }

  .details-container button {
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
    font-size: 1rem;
    margin-top: 1rem;
  }

  .details-container button:hover {
    background-color: #0056b3;
  }
</style>

<div class="details-container">
  <h1 class="text-2xl font-bold mb-4">Patient Details</h1>

  {#if $patientDetails}
    <div>
      <h2>Demographics</h2>
      <ul>
        {#if $patientDetails.identifier?.[0]?.value}
          <li><strong>MRN:</strong> {$patientDetails.identifier[0].value}</li>
        {/if}
        {#if $patientDetails.name?.[0]?.text}
          <li><strong>Name:</strong> {$patientDetails.name[0].text}</li>
        {/if}
        {#if $patientDetails.gender}
          <li><strong>Gender:</strong> {$patientDetails.gender}</li>
        {/if}
        {#if $patientDetails.birthDate}
          <li><strong>Date of Birth:</strong> {$patientDetails.birthDate}</li>
        {/if}
        {#if $patientDetails.telecom?.[0]?.value}
          <li><strong>Phone Number:</strong> {$patientDetails.telecom[0].value}</li>
        {/if}
        {#if $patientDetails.address?.length > 0}
          {#each $patientDetails.address as address}
            {#if address.line?.length > 0 || address.city || address.state || address.postalCode || address.country}
              <li>
                <strong>Address:</strong>
                {#if address.line?.length > 0}{address.line.join(', ')}{/if}
                {#if address.city}{', '}{address.city}{/if}
                {#if address.state}{', '}{address.state}{/if}
                {#if address.postalCode}{', '}{address.postalCode}{/if}
                {#if address.country}{', '}{address.country}{/if}
              </li>
            {/if}
          {/each}
        {/if}
      </ul>
      {#if $patientDetails.address?.length > 0 && $patientDetails.address[0].line?.length > 0}
        <Map address={formatAddress($patientDetails.address[0])} />
      {/if}
    </div>

    <div>
      <h2>Diagnosis</h2>
      <ul>
        {#each $patientDiagnosis as diagnosis}
          {#if diagnosis.code?.text}
            <li>{diagnosis.code.text}</li>
          {/if}
        {/each}
      </ul>
    </div>

    <div>
      <h2>Observations</h2>
      <ul>
        {#each $patientObservations as observation}
          {#if observation.code?.text}
            <li>{observation.code.text}: {observation.valueQuantity?.value} {observation.valueQuantity?.unit}</li>
          {/if}
        {/each}
      </ul>
    </div>

    <div>
      <h2>Allergies</h2>
      <ul>
        {#each $patientAllergies as allergy}
          {#if allergy.code?.text}
            <li>{allergy.code.text}</li>
          {/if}
        {/each}
      </ul>
    </div>

    <div>
      <h2>Procedures</h2>
      <ul>
        {#each $patientProcedures as procedure}
          {#if procedure.code?.text}
            <li>{procedure.code.text}</li>
          {/if}
        {/each}
      </ul>
    </div>

    <div>
      <h2>Medications</h2>
      <ul>
        {#each $patientMedications as medication}
          {#if medication.medicationCodeableConcept?.text}
            <li>{medication.medicationCodeableConcept.text}</li>
          {/if}
        {/each}
      </ul>
    </div>

    <button on:click={goBack}>Back</button>
  {/if}
</div>
