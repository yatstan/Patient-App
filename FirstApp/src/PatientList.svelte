<script>
  import { onMount } from "svelte";
  import { writable, derived, get } from "svelte/store";

  export let navigate;

  const patients = writable([]);
  const searchQuery = writable("");
  const searchInput = writable("");
  const currentPage = writable(1);
  const pageSize = 25;

  async function fetchPatients(url = "https://demo.kodjin.com/fhir/Patient") {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.entry) {
        throw new Error("No patient data found");
      }

      patients.update(current => {
        const newPatients = data.entry
          .map((entry) => entry.resource)
          .filter(patient => patient.name && patient.name[0] && patient.name[0].text);
        const updatedPatients = [...current, ...newPatients];

        updatedPatients.sort((a, b) => new Date(b.meta.lastUpdated) - new Date(a.meta.lastUpdated));

        return updatedPatients;
      });

      const currentPatients = get(patients);
      if (data.link) {
        const nextLink = data.link.find(link => link.relation === 'next');
        if (nextLink) {
          fetchPatients(nextLink.url);
        }
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  }

  const filteredPatients = derived(
    [patients, searchQuery, currentPage],
    ([$patients, $searchQuery, $currentPage]) => {
      let filtered = $patients;
      if ($searchQuery) {
        const query = $searchQuery.toLowerCase();
        filtered = $patients.filter((patient) =>
          [patient.identifier?.[0]?.value, patient.name?.[0]?.text, patient.gender, patient.birthDate, patient.telecom?.[0]?.value]
            .some(field => field?.toLowerCase().includes(query))
        );
      }
      const start = ($currentPage - 1) * pageSize;
      const end = start + pageSize;
      return filtered.slice(start, end);
    }
  );

  const totalPages = derived(
    [patients],
    ([$patients]) => Math.ceil($patients.length / pageSize)
  );

  function handleSearch() {
    searchQuery.set($searchInput);
    currentPage.set(1);
  }

  function nextPage() {
    currentPage.update(n => Math.min(n + 1, get(totalPages)));
  }

  function previousPage() {
    currentPage.update(n => Math.max(n - 1, 1));
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }

  onMount(fetchPatients);
</script>

<style>
  .table-container {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #dddddd; /* Add border to the table */
  }
  th, td {
    border: 1px solid #dddddd;
    text-align: left;
    padding: 8px;
  }
  th {
    background-color: #f2f2f2;
  }
</style>

<h1 class="text-2xl font-bold mb-4">Patient Administration</h1>

<div class="flex mb-4">
  <input
    type="text"
    placeholder="Search by MRN, Name, Phone Number"
    class="p-2 border border-gray-300 rounded w-full"
    bind:value={$searchInput}
    on:keydown={handleKeyDown}
  />
  <button
    class="ml-2 p-2 bg-blue-500 text-white rounded"
    on:click={handleSearch}
  >
    Search
  </button>
  <button on:click={() => navigate("/patient-form")} class="ml-2 p-2 bg-green-500 text-white rounded">Create Patient</button>
</div>

<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>MRN</th>
        <th>Name</th>
        <th>Gender</th>
        <th>DOB</th>
        <th>Phone Number</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each $filteredPatients as patient (patient.id)}
        <tr>
          <td>{patient.identifier?.[0]?.value ?? 'Null'}</td>
          <td>{patient.name[0].text}</td>
          <td>{patient.gender ?? 'Null'}</td>
          <td>{patient.birthDate ?? 'Null'}</td>
          <td>{patient.telecom?.[0]?.value ?? 'Null'}</td>
          <td>
            <button on:click={() => navigate("/patient-form", patient.id)} class="p-1 bg-yellow-300 rounded">Edit</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="flex justify-between mt-4">
  <button
    class="p-2 bg-gray-300 rounded"
    on:click={previousPage}
    disabled={$currentPage === 1}
  >
    Previous
  </button>
  <span class="p-2">Page {$currentPage} of {$totalPages}</span>
  <button
    class="p-2 bg-gray-300 rounded"
    on:click={nextPage}
    disabled={$currentPage === $totalPages}
  >
    Next
  </button>
</div>
