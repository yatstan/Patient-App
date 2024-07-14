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
    background-color: #e0f7fa; /* Light blue background */
    padding: 1rem;
    border-radius: 8px;
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

  tr:hover {
    background-color: #f5f5f5;
  }

  button:hover {
    background-color: #ddd;
    cursor: pointer;
  }

  .search-bar {
    display: flex;
    margin-bottom: 1rem;
  }

  .search-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .search-button, .create-button {
    padding: 0.5rem 1rem;
    margin-left: 0.5rem;
    border: none;
    border-radius: 4px;
    color: white;
  }

  .search-button {
    background-color: #007bff;
  }

  .create-button {
    background-color: #28a745;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
  }

  .pagination button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: white;
  }

  .pagination span {
    padding: 0.5rem 1rem;
  }
</style>

<h1 class="text-2xl font-bold mb-4">Patient Administration</h1>

<div class="search-bar">
  <input
    type="text"
    placeholder="Search by MRN, Name, Phone Number"
    class="search-input"
    bind:value={$searchInput}
    on:keydown={handleKeyDown}
  />
  <button
    class="search-button"
    on:click={handleSearch}
  >
    Search
  </button>
  <button on:click={() => navigate("/patient-form")} class="create-button">Create Patient</button>
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

<div class="pagination">
  <button
    on:click={previousPage}
    disabled={$currentPage === 1}
  >
    Previous
  </button>
  <span>Page {$currentPage} of {$totalPages}</span>
  <button
    on:click={nextPage}
    disabled={$currentPage === $totalPages}
  >
    Next
  </button>
</div>
