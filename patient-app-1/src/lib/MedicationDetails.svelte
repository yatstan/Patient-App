<script lang="ts">
  import axios from "axios";
  import { FHIR_BASE_URL } from "../config";
  import type { Bundle, BundleEntry, MedicationRequest, OperationOutcome } from "fhir/r4";
  import { Paper, Typography, Container, CircularProgress } from 'svelte-materialify';

  export let accessToken: string
  export let patientId: string

  const getMedications = async () => {
    const medicationRequestResponse = await axios.get<Bundle<MedicationRequest | OperationOutcome>>(`${FHIR_BASE_URL}/MedicationRequest`, {
      params: {
        subject: patientId
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    return medicationRequestResponse.data
  }

  const getMedicationRequestEntries = (bundle: Bundle<MedicationRequest | OperationOutcome>): BundleEntry<MedicationRequest>[] => {
    if (!bundle?.entry) {
      return []
    }
    return bundle.entry?.filter((entry) => entry.resource?.resourceType === 'MedicationRequest') as BundleEntry<MedicationRequest>[]
  }
</script>
<Container class="mt-10">
  {#await getMedications()}
    <CircularProgress />
  {:then medicationList}
    <Typography variant="h4" gutterBottom>Medication List</Typography>
    <Paper elevation={3} class="p-5">
      {#each getMedicationRequestEntries(medicationList) as medication, i}
        <Typography variant="body1" class="font-medium">{i + 1}. {medication.resource?.medicationReference?.display}</Typography>
        <div class="ml-4">
          {#if medication?.resource?.dosageInstruction?.[0]?.patientInstruction}
            <Typography variant="body2">Dosage: {medication?.resource?.dosageInstruction?.[0]?.patientInstruction}</Typography>
          {/if}
          {#if medication?.resource?.reasonCode?.[0]?.text}
            <Typography variant="body2">Reason: {medication?.resource?.reasonCode?.[0]?.text}</Typography>
          {/if}
        </div>
      {/each}
    </Paper>
  {/await}
</Container>
