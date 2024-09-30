<script lang="ts">
  import axios from "axios";
  import { FHIR_BASE_URL } from "../config";
  import type { Bundle, BundleEntry, MedicationRequest, OperationOutcome } from "fhir/r4";

  export let accessToken: string;
  export let patientId: string;

  const getMedications = async () => {
    const medicationRequestResponse = await axios.get<Bundle<MedicationRequest | OperationOutcome>>(`${FHIR_BASE_URL}/MedicationRequest`, {
      params: {
        subject: patientId
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return medicationRequestResponse.data;
  };

  const getMedicationRequestEntries = (bundle: Bundle<MedicationRequest | OperationOutcome>): BundleEntry<MedicationRequest>[] => {
    if (!bundle?.entry) {
      return [];
    }
    return bundle.entry?.filter((entry) => entry.resource?.resourceType === 'MedicationRequest') as BundleEntry<MedicationRequest>[];
  };

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };
</script>

<style>
  .card {
    background-color: #f0f4f8;
    border-radius: 10px;
    border: 2px solid #1e3a8a;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
    padding: 20px;
    transition: transform 0.2s;
  }
  .card:hover {
    transform: scale(1.05);
  }
  .card h2 {
    margin-top: 0;
    font-size: 1.5rem;
    color: #333;
  }
  .card p {
    margin: 8px 0;
    color: #666;
  }
</style>

<div class="mt-10 max-w-md mx-auto">
  {#await getMedications()}
    <div class="text-center text-lg font-semibold">Loading...</div>
  {:then medicationList}
    <h1 class="text-2xl text-center mb-6">Medication List</h1>
    {#each getMedicationRequestEntries(medicationList) as medication, i}
      <div class="card">
        <h2>{i + 1}. {toTitleCase(medication.resource?.medicationReference?.display || '')}</h2>
        <div>
          {#if medication?.resource?.dosageInstruction?.[0]?.patientInstruction}
            <p>
              <strong>Dosage:</strong> {medication?.resource?.dosageInstruction?.[0]?.patientInstruction}
            </p>
          {/if}
          {#if medication?.resource?.reasonCode?.[0]?.text}
            <p>
              <strong>Reason:</strong> {medication?.resource?.reasonCode?.[0]?.text}
            </p>
          {/if}
        </div>
      </div>
    {/each}
  {/await}
</div>
