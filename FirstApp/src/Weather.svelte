<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { writable } from 'svelte/store';

  const weatherData = writable(null);
  const apiKey = 'YOUR_API_KEY_HERE';
  const city = 'London'; // You can change the city or make it dynamic

  onMount(async () => {
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
      weatherData.set(response.data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  });
</script>

<style>
  .weather {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
  }
</style>

<div class="weather">
  {#if $weatherData}
    <h2>Weather in {$weatherData.name}</h2>
    <p>Temperature: {$weatherData.main.temp} °C</p>
    <p>Weather: {$weatherData.weather[0].description}</p>
    <p>Humidity: {$weatherData.main.humidity} %</p>
  {:else}
    <p>Loading weather data...</p>
  {/if}
</div>

