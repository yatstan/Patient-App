<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  export let address = '';

  let map;

  function getGeocode(address) {
    return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Geocoding request failed: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
          };
        } else {
          throw new Error('Address not found');
        }
      })
      .catch(error => {
        console.error('Error fetching geocode:', error);
        throw error;
      });
  }

  onMount(async () => {
    map = L.map('map').setView([0, 0], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    try {
      const { lat, lon } = await getGeocode(address);
      map.setView([lat, lon], 13);
      L.marker([lat, lon]).addTo(map)
        .bindPopup(address)
        .openPopup();
    } catch (error) {
      console.error('Error fetching geocode:', error.message);
      alert('Error fetching geocode. Please check the address.');
    }
  });
</script>

<style>
  #map {
    height: 300px;
    width: 100%;
  }
</style>

<div id="map"></div>
