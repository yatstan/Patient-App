<script lang="ts">
  import axios from "axios";
  import { FHIR_BASE_URL } from "../config";
  import { formatRelative } from 'date-fns';
  import type { Bundle, BundleEntry, Observation, OperationOutcome } from "fhir/r4";
  import { onMount, tick } from 'svelte';
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  export let accessToken: string;
  export let patientId: string;
  export let category: string = 'vital-signs';
  export let title: string = 'Vital Signs';

  let observations = [];
  let errorMessage = '';

  const getObservations = async () => {
    try {
      const response = await axios.get<Bundle<Observation | OperationOutcome>>(`${FHIR_BASE_URL}/Observation`, {
        params: {
          subject: patientId,
          category,
          sort: '-date'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching observations:', error);
      errorMessage = 'Error fetching observations: ' + error.message;
    }
  };

  const getObservationEntries = (bundle: Bundle<Observation | OperationOutcome>): BundleEntry<Observation>[] => {
    if (!bundle?.entry) {
      return [];
    }
    const results = bundle.entry?.filter((entry) => entry.resource?.resourceType === 'Observation') as BundleEntry<Observation>[];
    return results.sort((a, b) => {
      if (a?.resource?.effectiveDateTime && b?.resource?.effectiveDateTime) {
        return new Date(b?.resource?.effectiveDateTime).getTime() - new Date(a?.resource?.effectiveDateTime).getTime();
      }
      return 0;
    });
  };

  const groupObservationsByCode = (observations) => {
    const grouped = {};
    observations.forEach(observation => {
      const code = observation.resource?.code?.coding?.[0]?.code;
      if (code) {
        if (!grouped[code]) {
          grouped[code] = [];
        }
        grouped[code].push(observation);
      }
    });
    return grouped;
  };

  const createChart = (labels, datasets, chartId, chartTitle) => {
    const ctx = document.getElementById(chartId)?.getContext('2d');
    if (ctx) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: chartTitle
            }
          }
        }
      });
    } else {
      console.error('Context not found for chartId:', chartId);
    }
  };

  const processBloodPressure = (observations) => {
    const systolicData = [];
    const diastolicData = [];
    const labels = [];

    observations.forEach(observation => {
      const effectiveDateTime = observation.resource?.effectiveDateTime;
      const systolicComponent = observation.resource?.component?.find(a => a.code?.coding?.find(b => b.code === '8480-6'));
      const diastolicComponent = observation.resource?.component?.find(a => a.code?.coding?.find(b => b.code === '8462-4'));

      if (systolicComponent && diastolicComponent) {
        labels.push(new Date(effectiveDateTime).toLocaleDateString());
        systolicData.push(systolicComponent.valueQuantity?.value);
        diastolicData.push(diastolicComponent.valueQuantity?.value);
      }
    });

    console.log('Blood Pressure Data:', { systolicData, diastolicData, labels });

    return { systolicData, diastolicData, labels };
  };

  onMount(async () => {
    const results = await getObservations();
    if (results) {
      observations = getObservationEntries(results);
      const groupedObservations = groupObservationsByCode(observations);
      await tick(); // Wait for the DOM to update
      Object.keys(groupedObservations).forEach((code, index) => {
        const obs = groupedObservations[code];
        if (code === '55284-4') { // Blood Pressure Code
          const { systolicData, diastolicData, labels } = processBloodPressure(obs);
          console.log('Blood Pressure Chart Data:', { systolicData, diastolicData, labels });
          const datasets = [
            {
              label: 'Systolic Blood Pressure',
              data: systolicData,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: false
            },
            {
              label: 'Diastolic Blood Pressure',
              data: diastolicData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: false
            }
          ];
          createChart(labels, datasets, `chart-${code}`, 'Blood Pressure');
        } else {
          const labels = obs.map(observation => new Date(observation.resource?.effectiveDateTime).toLocaleDateString());
          const data = obs.map(observation => observation.resource?.valueQuantity?.value);
          const datasets = [{
            label: obs[0].resource?.code?.coding?.[0]?.display || code,
            data: data,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: false
          }];
          createChart(labels, datasets, `chart-${code}`, obs[0].resource?.code?.coding?.[0]?.display || code);
        }
      });
    }
  });

  const getObservationDisplay = (observation: Observation | undefined) => {
    if (!observation) {
      return ''
    }
    const isBp = observation.code?.coding?.find(a => a.code === '55284-4');
    if (isBp) {
      const systolicComponent = observation.component?.find(a => a.code?.coding?.find(b => b.code === '8480-6'));
      const systolic = systolicComponent?.valueQuantity?.value;
      const diastolicComponent = observation.component?.find(a => a.code?.coding?.find(b => b.code === '8462-4'));
      const diastolic = diastolicComponent?.valueQuantity?.value;
      return `Systolic: ${systolic} / Diastolic: ${diastolic}`;
    }
    if (!observation?.valueQuantity?.unit) {
      return observation?.valueQuantity?.value;
    }
    return `${observation?.valueQuantity?.value} ${observation?.valueQuantity?.unit}`;
  };

  const getObservationText = (observation: Observation | undefined) => {
    if (!observation) {
      return ''
    }
    const isBp = observation.code?.coding?.find(a => a.code === '55284-4');
    if (isBp) {
      return observation.code?.text || 'Blood Pressure';
    }
    return observation.code?.text || 'Observation';
  }
</script>

<style>
  .main {
    margin-top: 20px;
  }
  .chart-container {
    position: relative;
    height: 40vh;
    width: 80vw;
    margin: auto;
    margin-top: 20px;
  }
  .signin-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  .signin-button {
    background-color: #1e3a8a;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 18px;
  }
  .signin-button:hover {
    background-color: #162c6a;
  }
</style>

<div>
  <div class="mt-10 max-w-md mx-auto">
    <h1 class="text-2xl text-center">
      {title}
    </h1>
    {#if errorMessage}
      <div class="text-red-500 text-center mt-4">{errorMessage}</div>
    {/if}
    <div>
      {#each Object.keys(groupObservationsByCode(observations)) as code, index}
        <div class="chart-container">
          <canvas id={"chart-" + code}></canvas>
        </div>
        {#if code === '55284-4'}
          <div>
            {#each groupObservationsByCode(observations)[code] as observation}
              <p>
                <span class="font-medium">
                  {getObservationText(observation.resource)}
                  {#if observation.resource?.effectiveDateTime}
                    ({formatRelative(new Date(observation.resource.effectiveDateTime), new Date())})
                  {/if}
                  :
                </span>
                {getObservationDisplay(observation.resource)}
              </p>
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
