<script lang="ts">
  import axios from "axios";
  import { FHIR_BASE_URL } from "../config";
  import { formatRelative } from 'date-fns';
  import type { Bundle, BundleEntry, Observation, OperationOutcome } from "fhir/r4";
  import { Paper, Typography, Container, CircularProgress } from 'svelte-materialify';

  export let accessToken: string
  export let patientId: string
  export let category: string = 'laboratory'
  export let title: string = 'Lab Results'

  const getLabResults = async () => {
    const labObservationResponse = await axios.get<Bundle<Observation | OperationOutcome>>(`${FHIR_BASE_URL}/Observation`, {
      params: {
        subject: patientId,
        category,
        sort: '-date'
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    return labObservationResponse.data
  }

  const getObservationDisplay = (observation: Observation | undefined) => {
    if (!observation) {
      return ''
    }
    const isBp = observation.code?.coding?.find(a => a.code === '55284-4')
    if (isBp) {
      const systolicComponent = observation.component?.find(a => a.code?.coding?.find(b => b.code === '8480-6'))
      const systolic = systolicComponent?.valueQuantity?.value
      const diastolicComponent = observation.component?.find(a => a.code?.coding?.find(b => b.code === '8462-4'))
      const diastolic = diastolicComponent?.valueQuantity?.value
      return `${systolic}/${diastolic}`
    }
    if (!observation?.valueQuantity?.unit) {
      return observation?.valueQuantity?.value
    }
    return `${observation?.valueQuantity?.value} ${observation?.valueQuantity?.unit}`
  }

  const getObservationEntries = (bundle: Bundle<Observation | OperationOutcome>): BundleEntry<Observation>[] => {
    if (!bundle?.entry) {
      return []
    }
    const results = bundle.entry?.filter((entry) => entry.resource?.resourceType === 'Observation') as BundleEntry<Observation>[];
    return results.sort((a, b) => {
      if (a?.resource?.effectiveDateTime && b?.resource?.effectiveDateTime) {
        return new Date(b?.resource?.effectiveDateTime).getTime() - new Date(a?.resource?.effectiveDateTime).getTime();
      }
      return 0
    })
  }
</script>
<Container class="mt-10">
  {#await getLabResults()}
    <CircularProgress />
  {:then labResults}
    <Typography variant="h4" gutterBottom>{title}</Typography>
    <Paper elevation={3} class="p-5">
      {#each getObservationEntries(labResults) as observation, i}
        <Typography variant="body1">
          <strong>{observation.resource?.code?.text}</strong>
          {#if observation?.resource?.effectiveDateTime}
            ({formatRelative(new Date(observation?.resource.effectiveDateTime), new Date())})
          {/if}
          :
          {getObservationDisplay(observation.resource)}
        </Typography>
        <div class="ml-4"></div>
      {/each}
    </Paper>
  {/await}
</Container>
