<script lang="ts">
  import axios from "axios";
  import { FHIR_BASE_URL } from "../config";
  import type { Patient } from "fhir/r4";
  import { Paper, Typography, Container, CircularProgress } from 'svelte-materialify';

  export let accessToken: string
  export let patientId: string

  const getPatientDetails = async () => {
    const patientResponse = await axios.get<Patient>(`${FHIR_BASE_URL}/Patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    return patientResponse.data

  import { CircleSpinner } from 'svelte-loading-spinners';  
  }
</script>
 <CircleSpinner size={50} color="#1e3a8a" />
<Container class="mt-10">
  {#await getPatientDetails()}
    <CircularProgress />
  {:then patient}
    <Paper elevation={3} class="p-5">
      <Typography variant="h4" gutterBottom>Hello {patient?.name?.[0]?.given?.[0]},</Typography>
      <Typography variant="body1">Welcome to your patient record!</Typography>
      <Typography variant="body2" class="mt-5"><strong>Full Name:</strong> {patient?.name?.[0]?.text}</Typography>
      <Typography variant="body2"><strong>Epic identifier:</strong> {patient?.identifier?.find(i => i.system === 'urn:oid:1.2.840.114350.1.13.0.1.7.5.737384.0')?.value}</Typography>
      <Typography variant="body2"><strong>Date of birth:</strong> {patient?.birthDate}</Typography>
      <Typography variant="body2"><strong>Gender:</strong> <span class="capitalize">{patient?.gender}</span></Typography>
    </Paper>
  {/await}
</Container>
